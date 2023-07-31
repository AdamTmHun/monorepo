import { expect, test } from "vitest"
import { getLintReports, lint } from "@inlang/core/lint"
import type { InlangConfig } from "@inlang/config"

const config: Pick<InlangConfig, "sourceLanguageTag" | "languageTags" | 'modules'> = {
	sourceLanguageTag: "en",
	languageTags: ["en", "de", "fr"],
	modules: ["./index.js"],
}

const [lintedResources, errors] = await lint({
	config,
	resources: [
		createResource("en", createMessage("test", "1")),
		createResource("de", createMessage("test", "1")),
		createResource("fr", createMessage("test", "1"), createMessage("test2", "2")),
	],
})

test("should report if key is missing", async () => {
	const reports = lintedResources.flatMap((resource) => getLintReports(resource))
	expect(reports).toHaveLength(1)
	expect(reports[0]?.message).toBe(
		"Message with id 'test2' is specified, but missing in the reference.",
	)
})

test("it should not throw errors", () => {
	expect(errors).toBeUndefined()
})

test("should not process nodes of the reference language", async () => {
	const referenceResource = lintedResources.find(
		(resource) => resource.languageTag.name === config.sourceLanguageTag,
	)!

	expect(referenceResource.lint).toBeUndefined()
})
