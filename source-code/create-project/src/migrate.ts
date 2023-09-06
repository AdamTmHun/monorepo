import type { NodeishFilesystem } from "@lix-js/fs"
import { ProjectConfig } from "@inlang/project-config"
import { pluginUrls, standardLintRules, type PluginId } from "./tryAutoGenModuleConfig.js"
// @ts-ignore
import { minify } from "terser"

const okEval = eval

function parseDirtyValue(jsString: string) {
	let normalized = jsString.trim()
	if (normalized.endsWith(",")) {
		normalized = normalized.slice(0, -1)
	}

	return JSON.parse(normalized)
}

function getCurrentPluginUrls(pluginName: string) {
	return pluginUrls[pluginName]
}

function detectPlugins(url: string) {
	const moduleDetections: Set<string> = new Set()
	const lintRuleDetections: Set<string> = new Set()
	const matches = url.matchAll(
		/(plugin-json)|(i18next)|(typesafe-i18n)|(sdk-js)|(standard-lint-rules)/g,
	)

	for (const [matched] of matches) {
		if (matched === "plugin-json") {
			moduleDetections.add("json")
		} else if (matched === "i18next") {
			moduleDetections.add("i18next")
		} else if (matched === "typesafe-i18n") {
			moduleDetections.add("typesafeI18n")
		} else if (matched === "sdk-js") {
			moduleDetections.add("sdkJs") // TODO: support paraglideJs
		} else if (matched === "standard-lint-rules") {
			lintRuleDetections.add("standardLintRules")
		}
	}

	return { moduleDetections, lintRuleDetections }
}

/**
 * Migrates an old inlang.config.js config file to the new project.inlang.json format.
 *
 * @params args.nodeishFs a nodeishFs implementation, in node this is fs:promieses
 * @params args.pathJoin implementation for joing paths, in node this should be {join} from 'path'
 * @params args.filePath optional location of your inlang config file, should be used only for testing as we hard code filepaths at lots of places
 * @returns The warnings and if successfully generated the config object, the file is also saved to the filesystem in the current path
 */
export async function migrateProjectConfig(args: {
	nodeishFs: NodeishFilesystem
	pathJoin: (...args: string[]) => string
	filePath?: string
}): Promise<{ warnings: string[]; config?: ProjectConfig }> {
	let warnings: string[] = []

	const fileString = await args.nodeishFs
		.readFile("./inlang.config.js", { encoding: "utf-8" })
		.catch(() => "")

	// Normalize the js file for simple parsing
	const minifyOutput = await minify(fileString, {
		compress: false,
		mangle: false,
		format: {
			comments: false,
			semicolons: false,
			quote_style: 2,
			indent_level: 2,
			beautify: true,
		},
	})
	const legacyConfig = minifyOutput.code

	if (!legacyConfig) {
		warnings.push("Could not read valid legacy configuration file ./inlang.config.js.")
		return { warnings }
	}

	let legacyConfigFun
	if (typeof process !== "undefined") {
		legacyConfigFun = (
			await import(args.pathJoin(process.cwd(), "./inlang.config.js")).catch((err) => {
				return { defineConfig: null }
			})
		).defineConfig
	}
	if (!legacyConfigFun) {
		// fallback to eval if we cannot use the current directory dynamic import in node (eg. if we use this in the editor)
		legacyConfigFun = okEval(legacyConfig!.replace("export ", "(") + ")")
	}

	const pluginSettings: Record<string, any> = {}
	let legacyConfigBuild
	try {
		legacyConfigBuild = await legacyConfigFun({
			$fs: args.nodeishFs,
			$import: async function (url: string) {
				const { moduleDetections, lintRuleDetections } = detectPlugins(url)

				const pluginName =
					moduleDetections.values().next().value || lintRuleDetections.values().next().value
				const pluginId: PluginId = ("inlang.plugin." +
					(pluginName || `<please add your plugin id for ${url} here>`)) as PluginId

				return {
					default: (pluginArg: any) => {
						pluginSettings[pluginId] = pluginArg
						return pluginName === "standardLintRules"
							? standardLintRules
							: getCurrentPluginUrls(pluginName) || url
					},
				}
			},
		})
	} catch {
		// ignore the error
	}

	let config: ProjectConfig = {
		sourceLanguageTag: legacyConfigBuild?.referenceLanguage || "",
		languageTags: legacyConfigBuild?.languages || [],
		modules: legacyConfigBuild?.plugins?.flatMap((entry: any) => entry) || [],
		settings: pluginSettings,
	}

	if (!legacyConfigBuild) {
		// fallback to line based string parsing if we fail to execute the legacy inlang config function
		const { extractedConfig, parseErrors } = lineParsing(legacyConfig, config)
		const lineParsingWarning =
			"Could not execute the inlang configuration and falling back to line based parsing, which can be unreliable for more complex setups."
		warnings = [...warnings, lineParsingWarning, ...parseErrors]
		config = extractedConfig
	}

	const configString = JSON.stringify(config, undefined, 4)
	await args.nodeishFs.writeFile(args.filePath || "./project.inlang.json", configString + "\n")
	return { warnings, config }
}

function lineParsing(
	legacyConfig: string,
	config: ProjectConfig,
): { extractedConfig: ProjectConfig; parseErrors: string[] } {
	const searchMapping: Record<string, string> = {
		languages: "languageTags",
		variableReferencePattern: "variableReferencePattern",
		pathPattern: "pathPattern",
		referenceResourcePath: "referenceResourcePath",
		referenceLanguage: "sourceLanguageTag",
	}

	const parseErrors: string[] = []
	const extractions: Record<string, any> = {}

	for (const [index, curLine] of legacyConfig.split("\n").entries()) {
		const line: string = curLine || ""
		for (const searchKey of Object.keys(searchMapping)) {
			const [maybeKey, ...rest] = line.split(":")

			if (maybeKey?.includes(searchKey)) {
				try {
					const dirtyValue = rest.join(":")
					if (dirtyValue) {
						const extracted = parseDirtyValue(dirtyValue)
						const newKey = searchMapping[searchKey]
						extractions[newKey!] = extracted
					} else {
						parseErrors.push(`Could not auto migrate line ${index}: "${line}"`)
					}
				} catch (error) {
					parseErrors.push(`Could not auto migrate line ${index}: "${line}"`)
				}
			}
		}
	}

	const { moduleDetections, lintRuleDetections } = detectPlugins(legacyConfig)

	if (!moduleDetections.size) {
		parseErrors.push("Could not find supported plugin, please add your plugin manually.")
		moduleDetections.add("<replace with your plugin id>")
	}

	const pluginName: string = moduleDetections.values().next().value as string
	const pluginId: PluginId = ("inlang.plugin." + pluginName) as PluginId

	config.modules = [
		pluginUrls[pluginName] || `<please add your missing plugin url here>`,
		...(lintRuleDetections.size ? standardLintRules : []),
	]

	config.sourceLanguageTag = extractions.sourceLanguageTag || ""
	config.languageTags = extractions.languageTags || []

	config.settings = {
		[pluginId!]: {
			pathPattern: extractions.pathPattern || "",
			variableReferencePattern: extractions.variableReferencePattern || undefined,
			referenceResourcePath: extractions.referenceResourcePath || undefined,
		},
		...config.settings,
	} as ProjectConfig["settings"]

	return { extractedConfig: config, parseErrors }
}
