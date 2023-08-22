import { describe, expect, test } from "vitest"
import { dedent } from "ts-dedent"
import { initTestApp } from "./test.utils.js"
import { transformPageJs } from "./+page.js.js"

// TODO: create test matrix for all possible combinations

describe("transformPageJs", () => {
	describe("root", () => {
		describe("empty file", () => {
			describe("lang-in-slug", () => {
				test("non-static", () => {
					const code = ""
					const config = initTestApp({ options: { languageInUrl: true } })
					const transformed = transformPageJs("", config, code, true)

					expect(transformed).toMatchInlineSnapshot(`
						"import { initRootPageLoadWrapper } from '@inlang/sdk-js/adapter-sveltekit/shared';
						import { browser } from '$app/environment';
						export const load = initRootPageLoadWrapper({
						    browser
						}).use(() => { });"
					`)
				})

				test("static", () => {
					const code = ""
					const config = initTestApp({
						options: {
							languageInUrl: true,
							isStatic: true,
						},
					})
					const transformed = transformPageJs("", config, code, true)

					expect(transformed).toMatchInlineSnapshot(`
						"import { redirect } from '@sveltejs/kit';
						import { initLocalStorageDetector, navigatorDetector } from '@inlang/sdk-js/detectors/client';
						import { initRootPageLoadWrapper, replaceLanguageInUrl } from '@inlang/sdk-js/adapter-sveltekit/shared';
						import { browser } from '$app/environment';
						export const load = initRootPageLoadWrapper({
						    browser,
						    initDetectors: () => [navigatorDetector],
						    redirect: {
						        throwable: redirect,
						        getPath: ({ url }, languageTag) => replaceLanguageInUrl(new URL(url), languageTag),
						    },
						}).use(() => { });"
					`)
				})
			})
		})

		test("basic load function", () => {
			const code = dedent`
				export const load = async () => { };
			`
			const config = initTestApp({ options: { languageInUrl: true } })
			const transformed = transformPageJs("", config, code, true)

			expect(transformed).toMatchInlineSnapshot(`
				"import { initRootPageLoadWrapper } from '@inlang/sdk-js/adapter-sveltekit/shared';
				import { browser } from '$app/environment';
				export const load = initRootPageLoadWrapper({
				    browser
				}).use(async () => { });"
			`)
		})
	})

	describe("non-root", () => {
		test("should not do anything", () => {
			const code = ""
			const config = initTestApp()
			const transformed = transformPageJs("", config, code, false)
			expect(transformed).toEqual(code)
		})
	})

	test("should not do anything if '@inlang/sdk-js/no-transforms' import is detected", () => {
		const code = "import '@inlang/sdk-js/no-transforms'"
		const config = initTestApp()
		const transformed = transformPageJs("", config, code, true)
		expect(transformed).toEqual(code)
	})

	test("should transform '@inlang/sdk-js' imports correctly", () => {
		const transformed = transformPageJs(
			"",
			initTestApp(),
			dedent`
				import { languages } from '@inlang/sdk-js'

				export const load = async (() => {
					return { languages }
				})
			`,
			true,
		)

		expect(transformed).toMatchInlineSnapshot(`
			"import { initRootPageLoadWrapper } from '@inlang/sdk-js/adapter-sveltekit/shared';
			import { browser } from '$app/environment';
			export const load = initRootPageLoadWrapper({
			    browser
			}).use(async((_, { languages }) => {
			    return { languages };
			}));"
		`)
	})
})
