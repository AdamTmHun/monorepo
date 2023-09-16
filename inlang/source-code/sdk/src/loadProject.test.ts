/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi } from "vitest"
import { loadProject } from "./loadProject.js"
import type { ProjectSettings, Plugin, MessageLintRule, Message } from "./versionedInterfaces.js"
import type { ImportFunction } from "./resolve-modules/index.js"
import type { InlangModule } from "@inlang/module"
import {
	ProjectSettingsFileJSONSyntaxError,
	ProjectSettingsFileNotFoundError,
	ProjectSettingsInvalidError,
} from "./errors.js"
import { createNodeishMemoryFs } from "@lix-js/fs"

// ------------------------------------------------------------------------------------------------

const getValue = <T>(subscribable: { subscribe: (subscriber: (value: T) => void) => void }): T => {
	let value: T
	subscribable.subscribe((v) => void (value = v))
	return value!
}

const settings: ProjectSettings = {
	sourceLanguageTag: "en",
	languageTags: ["en"],
	modules: ["plugin.js", "lintRule.js"],
	messageLintRuleLevels: {
		"messageLintRule.inlang.missingTranslation": "error",
	},
	"plugin.inlang.i18next": {
		pathPattern: "./examples/example01/{languageTag}.json",
		variableReferencePattern: ["{", "}"],
	},
}

const mockPlugin: Plugin = {
	meta: {
		id: "plugin.inlang.i18next",
		description: { en: "Mock plugin description" },
		displayName: { en: "Mock Plugin" },
	},
	loadMessages: () => exampleMessages,
	saveMessages: () => undefined as any,
	addCustomApi: () => ({
		"app.inlang.ideExtension": {
			messageReferenceMatcher: (text: string) => text as any,
		},
	}),
}

// TODO: use `createMessage` utility
const exampleMessages: Message[] = [
	{
		id: "a",
		selectors: [],
		variants: [
			{
				languageTag: "en",
				match: {},
				pattern: [
					{
						type: "Text",
						value: "test",
					},
				],
			},
		],
	},
	{
		id: "b",
		selectors: [],
		variants: [
			{
				languageTag: "en",
				match: {},
				pattern: [
					{
						type: "Text",
						value: "test",
					},
				],
			},
		],
	},
]

const mockMessageLintRule: MessageLintRule = {
	meta: {
		id: "messageLintRule.inlang.mock",
		description: { en: "Mock lint rule description" },
		displayName: { en: "Mock Lint Rule" },
	},
	message: () => undefined,
}

const _import: ImportFunction = async (name) =>
	({
		default: name === "plugin.js" ? mockPlugin : mockMessageLintRule,
	} satisfies InlangModule)

// ------------------------------------------------------------------------------------------------

describe("initialization", () => {
	describe("settings", () => {
		it("should return an error if settings file is not found", async () => {
			const fs = createNodeishMemoryFs()

			const inlang = await loadProject({
				settingsFilePath: "./test.json",
				nodeishFs: fs,
				_import,
			})

			expect(inlang.errors()![0]).toBeInstanceOf(ProjectSettingsFileNotFoundError)
		})

		it("should return an error if settings file is not a valid JSON", async () => {
			const fs = await createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", "invalid json")

			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			expect(inlang.errors()![0]).toBeInstanceOf(ProjectSettingsFileJSONSyntaxError)
		})

		it("should return an error if settings file is does not match schema", async () => {
			const fs = await createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify({}))

			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			expect(inlang.errors()![0]).toBeInstanceOf(ProjectSettingsInvalidError)
		})

		it("should return the parsed settings", async () => {
			const fs = await createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			expect(inlang.settings()).toStrictEqual(settings)
		})

		it("should not re-write the settings to disk when initializing", async () => {
			const fs = await createNodeishMemoryFs()
			const settingsWithDeifferentFormatting = JSON.stringify(settings, undefined, 4)
			await fs.writeFile("./project.inlang.json", settingsWithDeifferentFormatting)

			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			const settingsOnDisk = await fs.readFile("./project.inlang.json", { encoding: "utf-8" })
			expect(settingsOnDisk).toBe(settingsWithDeifferentFormatting)

			inlang.setSettings(inlang.settings()!)
			// TODO: how can we await `setsettings` correctly
			await new Promise((resolve) => setTimeout(resolve, 0))

			const newsettingsOnDisk = await fs.readFile("./project.inlang.json", { encoding: "utf-8" })
			expect(newsettingsOnDisk).not.toBe(settingsWithDeifferentFormatting)
		})
	})

	describe("modules", () => {
		it("should return an error if an error occurs while resolving a plugin", async () => {
			const $badImport: ImportFunction = async () =>
				({
					default: {} as Plugin,
				} satisfies InlangModule)

			const fs = createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))

			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import: $badImport,
			})

			expect(inlang.errors()).not.toHaveLength(0)
		})
		// 	it.todo("should throw if lintRules contain errors ???")
		// 	it.todo("should return meta data")
		// 	it.todo("should return plugins")
		// 	it.todo("should return lint rules")
	})

	describe("flow", () => {
		it.todo("should not call functions multiple times")
		it.todo("should load modules after settings")
		it.todo("should not load messages")
		it.todo("should not call lint")
	})

	describe("instance object", () => {
		it.todo("should contain all fields")
	})
})

describe("functionality", () => {
	describe("settings", () => {
		it("should return the settings", async () => {
			const fs = await createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			expect(getValue(inlang.settings)).toStrictEqual(settings)
		})

		it("should set a new settings", async () => {
			const fs = await createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			expect(inlang.settings()).toStrictEqual(settings)

			inlang.setSettings({ ...settings, languageTags: ["en", "de"] })
			expect(getValue(inlang.settings)).toStrictEqual({ ...settings, languageTags: ["en", "de"] })
			expect(inlang.settings()!.languageTags).toStrictEqual(["en", "de"])

			inlang.setSettings({ ...settings, languageTags: ["en", "de", "fr"] })
			expect(getValue(inlang.settings)).toStrictEqual({
				...settings,
				languageTags: ["en", "de", "fr"],
			})
			expect(inlang.settings()!.languageTags).toStrictEqual(["en", "de", "fr"])
		})
	})

	describe("setSettings", () => {
		it("should fail if settings is not valid", async () => {
			const fs = await createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			const result = inlang.setSettings({} as ProjectSettings)
			expect(result.data).toBeUndefined()
			expect(result.error).toBeInstanceOf(ProjectSettingsInvalidError)
		})

		it("should write settings to disk", async () => {
			const fs = await createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			const before = await fs.readFile("./project.inlang.json", { encoding: "utf-8" })
			expect(before).toBeDefined()

			const result = inlang.setSettings({ ...settings, languageTags: [] })
			expect(result.data).toBeUndefined()
			expect(result.error).toBeUndefined()

			// TODO: how to wait for fs.writeFile to finish?
			await new Promise((resolve) => setTimeout(resolve, 0))

			const after = await fs.readFile("./project.inlang.json", { encoding: "utf-8" })
			expect(after).toBeDefined()
			expect(after).not.toBe(before)
		})
	})

	describe("installed", () => {
		it("should return the installed items", async () => {
			const fs = createNodeishMemoryFs()
			const settings: ProjectSettings = {
				sourceLanguageTag: "en",
				languageTags: ["en"],
				modules: ["plugin.js", "lintRule.js"],
			}
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			expect(inlang.installed.plugins()[0]).toStrictEqual({
				meta: mockPlugin.meta,
				module: settings.modules[0],
			})

			expect(inlang.installed.messageLintRules()[0]).toEqual({
				meta: mockMessageLintRule.meta,
				module: settings.modules[1],
				lintLevel: "warning",
			})
		})

		it("should apply 'warning' as default lint level to lint rules that have no lint level defined in the settings", async () => {
			const fs = createNodeishMemoryFs()

			const settings: ProjectSettings = {
				sourceLanguageTag: "en",
				languageTags: ["en"],
				modules: ["plugin.js", "lintRule.js"],
			}

			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))

			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			expect(inlang.installed.messageLintRules()[0]?.lintLevel).toBe("warning")
		})

		// yep, this is a typical "hm, we have a bug here, let's write a test for it" test
		it("should return lint reports if disabled is not set", async () => {
			const _mockLintRule: MessageLintRule = {
				meta: {
					id: "messageLintRule.namespace.mock",
					description: { en: "Mock lint rule description" },
					displayName: { en: "Mock Lint Rule" },
				},
				message: ({ report }) => {
					report({
						messageId: "some-message-1",
						languageTag: "en",
						body: { en: "lintrule1" },
					})
				},
			}
			const _mockPlugin: Plugin = {
				meta: {
					id: "plugin.inlang.i18next",
					description: { en: "Mock plugin description" },
					displayName: { en: "Mock Plugin" },
				},
				loadMessages: () => [{ id: "some-message", selectors: [], variants: [] }],
				saveMessages: () => undefined,
			}
			const fs = await createNodeishMemoryFs()
			await fs.writeFile(
				"./project.inlang.json",
				JSON.stringify({
					sourceLanguageTag: "en",
					languageTags: ["en"],
					modules: ["plugin.js", "lintRule.js"],
				} satisfies ProjectSettings),
			)

			const _import: ImportFunction = async (name) => {
				return {
					default: name === "plugin.js" ? _mockPlugin : _mockLintRule,
				} satisfies InlangModule
			}
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			await new Promise((resolve) => setTimeout(resolve, 510))

			expect(inlang.query.messageLintReports.getAll()).toHaveLength(1)
			expect(inlang.query.messageLintReports.getAll()?.[0]?.ruleId).toBe(_mockLintRule.meta.id)
			expect(inlang.installed.messageLintRules()).toHaveLength(1)
		})

		it("should return lint reports for a single message", async () => {
			const _mockLintRule: MessageLintRule = {
				meta: {
					id: "messageLintRule.namepsace.mock",
					description: { en: "Mock lint rule description" },
					displayName: { en: "Mock Lint Rule" },
				},
				message: ({ report }) => {
					report({
						messageId: "some-message",
						languageTag: "en",
						body: { en: "lintrule1" },
					})
				},
			}
			const _mockPlugin: Plugin = {
				meta: {
					id: "plugin.inlang.i18next",
					description: { en: "Mock plugin description" },
					displayName: { en: "Mock Plugin" },
				},
				loadMessages: () => [{ id: "some-message", selectors: [], variants: [] }],
				saveMessages: () => undefined,
			}
			const fs = await createNodeishMemoryFs()
			await fs.writeFile(
				"./inlang.settings.json",
				JSON.stringify({
					sourceLanguageTag: "en",
					languageTags: ["en"],
					modules: ["plugin.js", "lintRule.js"],
				} satisfies ProjectSettings),
			)
			const _import: ImportFunction = async (name) => {
				return {
					default: name === "plugin.js" ? _mockPlugin : _mockLintRule,
				} satisfies InlangModule
			}

			const inlang = await loadProject({
				settingsFilePath: "./inlang.settings.json",
				nodeishFs: fs,
				_import,
			})

			await new Promise((resolve) => setTimeout(resolve, 510))

			expect(
				inlang.query.messageLintReports.get({ where: { messageId: "some-message" } }),
			).toHaveLength(1)
		})
	})

	describe("errors", () => {
		it("should return the errors", async () => {
			const fs = await createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})
			inlang.errors.subscribe((errors) => {
				expect(errors).toStrictEqual([])
			})
		})
	})

	describe("customApi", () => {
		it("should return the app specific api", async () => {
			const fs = await createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			inlang.customApi.subscribe((api) => {
				expect(api["app.inlang.ideExtension"]).toBeDefined()
			})
		})
	})

	describe("messages", () => {
		it("should return the messages", async () => {
			const fs = await createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			expect(Object.values(inlang.query.messages.getAll())).toEqual(exampleMessages)
		})
	})

	describe("query", () => {
		it("should call saveMessages() on updates", async () => {
			const fs = createNodeishMemoryFs()

			await fs.writeFile(
				"./project.inlang.json",
				JSON.stringify({
					sourceLanguageTag: "en",
					languageTags: ["en", "de"],
					modules: ["plugin.js"],
					"plugin.inlang.json": {
						pathPattern: "./resources/{languageTag}.json",
					},
				}),
			)

			await fs.mkdir("./resources")

			const mockSaveFn = vi.fn()

			const _mockPlugin: Plugin = {
				meta: {
					id: "plugin.inlang.json",
					description: { en: "Mock plugin description" },
					displayName: { en: "Mock Plugin" },
				},
				loadMessages: () => exampleMessages,
				saveMessages: mockSaveFn,
			}

			const _import = async () => {
				return {
					default: _mockPlugin,
				} satisfies InlangModule
			}

			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})

			await inlang.query.messages.upsert({
				where: { id: "a" },
				data: {
					id: "a",
					selectors: [],
					variants: [
						{
							languageTag: "en",
							match: {},
							pattern: [
								{
									type: "Text",
									value: "a en",
								},
							],
						},
						{
							languageTag: "de",
							match: {},
							pattern: [
								{
									type: "Text",
									value: "a de",
								},
							],
						},
					],
				},
			})

			await inlang.query.messages.upsert({
				where: { id: "b" },
				data: {
					id: "b",
					selectors: [],
					variants: [
						{
							languageTag: "en",
							match: {},
							pattern: [
								{
									type: "Text",
									value: "b en",
								},
							],
						},

						{
							languageTag: "de",
							match: {},
							pattern: [
								{
									type: "Text",
									value: "b de",
								},
							],
						},
					],
				},
			})

			await new Promise((resolve) => setTimeout(resolve, 510))

			expect(mockSaveFn.mock.calls.length).toBe(1)

			expect(mockSaveFn.mock.calls[0][0].settings).toStrictEqual({
				pathPattern: "./resources/{languageTag}.json",
			})

			expect(Object.values(mockSaveFn.mock.calls[0][0].messages)).toStrictEqual([
				{
					id: "a",
					selectors: [],
					variants: [
						{
							languageTag: "en",
							match: {},
							pattern: [
								{
									type: "Text",
									value: "a en",
								},
							],
						},
						{
							languageTag: "de",
							match: {},
							pattern: [
								{
									type: "Text",
									value: "a de",
								},
							],
						},
					],
				},
				{
					id: "b",
					selectors: [],
					variants: [
						{
							languageTag: "en",
							match: {},
							pattern: [
								{
									type: "Text",
									value: "b en",
								},
							],
						},
						{
							languageTag: "de",
							match: {},
							pattern: [
								{
									type: "Text",
									value: "b de",
								},
							],
						},
					],
				},
			])
		})
	})

	describe("lint", () => {
		it.todo("should throw if lint reports are not initialized yet", async () => {
			const fs = await createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import,
			})
			// TODO: test with real lint rules
			try {
				inlang.query.messageLintReports.getAll.subscribe((r) => expect(r).toEqual(undefined))
				throw new Error("Should not reach this")
			} catch (e) {
				expect((e as Error).message).toBe("lint not initialized yet")
			}
		})
		it("should return the message lint reports", async () => {
			const settings: ProjectSettings = {
				sourceLanguageTag: "en",
				languageTags: ["en"],
				modules: ["lintRule.js"],
			}
			const fs = createNodeishMemoryFs()
			await fs.writeFile("./project.inlang.json", JSON.stringify(settings))
			const inlang = await loadProject({
				settingsFilePath: "./project.inlang.json",
				nodeishFs: fs,
				_import: async () => ({
					default: mockMessageLintRule,
				}),
			})
			// TODO: test with real lint rules
			inlang.query.messageLintReports.getAll.subscribe((r) => expect(r).toEqual([]))
		})
	})
})
