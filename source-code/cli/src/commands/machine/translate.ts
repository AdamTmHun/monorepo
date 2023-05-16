import { query } from "@inlang/core/query"
import { setupConfig } from "@inlang/core/config"
import { initialize$import, InlangEnvironment } from "@inlang/core/environment"
import fs from "node:fs"
import { Command } from "commander"
import { countMessagesPerLanguage, getFlag, log } from "../../utilities.js"
import type { Message } from "@inlang/core/ast"
import { rpc } from "@inlang/rpc"

export const translate = new Command()
	.command("translate")
	.description("Machine translate all resources.")
	.action(translateCommandAction)

async function translateCommandAction() {
	// Set up the environment functions
	const env: InlangEnvironment = {
		$import: initialize$import({
			// @ts-ignore TODO: use @inlang-git/fs
			fs: fs.promises,
			fetch,
		}),
		// @ts-ignore TODO: use @inlang-git/fs
		$fs: fs.promises,
	}

	const filePath = process.cwd() + "/inlang.config.js"

	if (!fs.existsSync(filePath)) {
		log.error("No inlang.config.js file found in the repository.")
		return
	} else {
		log.info("✅ Using inlang config file at `" + filePath + "`")
	}

	// Get the content of the inlang.config.js file
	const file = fs.readFileSync(filePath, "utf-8")

	const config = await setupConfig({
		module: await import("data:application/javascript;base64," + btoa(file.toString())),
		env,
	})

	// Get all resources
	const resources = await config.readResources({ config })

	// Get reference language from config
	const referenceLanguage = config.referenceLanguage

	// Get reference language resource
	const referenceLanguageResource = resources.find(
		(resource) => resource.languageTag.name === referenceLanguage,
	)!

	// Count messages per language
	const messageCounts = countMessagesPerLanguage(resources)
	log.info(
		"🌏 Found " +
			Object.keys(messageCounts).length +
			" languages with a total of " +
			Object.values(messageCounts).reduce((a, b) => a + b, 0) +
			" messages.",
	)

	// Get languages to translate to with the reference language removed
	const languagesToTranslateTo = resources.filter(
		(resource) => resource.languageTag.name !== referenceLanguage,
	)
	log.info(
		"📝 Translating to " +
			languagesToTranslateTo.length +
			" languages. [" +
			[...new Set(languagesToTranslateTo)]
				.splice(0, 3)
				.map((language) => language.languageTag.name)
				.join(", ") +
			"]",
	)

	// Translate all messages
	for (const message of referenceLanguageResource.body) {
		for (const language of languagesToTranslateTo) {
			// skip if message already exists in language
			if (language.body.some((langMessage) => langMessage.id.name === message.id.name)) {
				continue
			}

			// 🌏 Translation
			const [translation, exception] = await rpc.machineTranslate({
				telemetryId: "CLI",
				referenceLanguage: referenceLanguage,
				targetLanguage: language.languageTag.name,
				text: message.pattern.elements[0]!.value as string,
			})
			if (exception) {
				log.error("Couldn't translate message " + message.id.name + ". ", exception.message)
				continue
			}

			const bold = (text: string) => `\x1b[1m${text}\x1b[0m`
			const italic = (text: string) => `\x1b[3m${text}\x1b[0m`
			log.info(
				getFlag(language.languageTag.name) +
					" Translated message " +
					bold(message.id.name) +
					" to " +
					italic(translation),
			)

			const newMessage: Message = {
				type: "Message",
				id: { type: "Identifier", name: message.id.name },
				pattern: {
					type: "Pattern",
					elements: [{ type: "Text", value: translation }],
				},
			}

			// get latest resources because of for loop
			const latestResource = await config.readResources({ config })

			// find language resource to add the new message to
			const languageResource = latestResource.find(
				(resource) => resource.languageTag.name === language.languageTag.name,
			)
			if (languageResource) {
				const [newResource, exception] = query(languageResource).upsert({
					message: newMessage,
				})

				if (exception) {
					log.error("Couldn't upsert new message. ", exception.message)
				}

				// merge the new resource with the existing resources
				const newResources = resources.map((resource) => {
					if (resource.languageTag.name === language.languageTag.name && newResource) {
						return newResource
					}
					return resource
				})

				// write the new resource to the file system
				await config.writeResources({
					config,
					resources: newResources,
				})
			}
		}
	}

	// Log the message counts
	log.info("✅ Translated all messages.")
}
