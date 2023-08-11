import { dedent } from "ts-dedent"
import { describe, it, test, expect, vi } from "vitest"
import { transformLayoutSvelte } from "./+layout.svelte.js"
import { initTransformConfig } from "./test.utils.js"

describe("transformLayoutSvelte", () => {
	describe("root=true", () => {
		test("should insert code to an empty file", () => {
			const code = ""
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toMatchInlineSnapshot(`
				"<script>
				import { browser } from '$app/environment';
				import { addRuntimeToContext, getRuntimeFromContext } from '@inlang/sdk-js/adapter-sveltekit/client/reactive-workaround';
				import { getRuntimeFromData } from '@inlang/sdk-js/adapter-sveltekit/shared';
				import { addRuntimeToGlobalThis } from '@inlang/sdk-js/adapter-sveltekit/client/shared';
				export let data;
				addRuntimeToGlobalThis(getRuntimeFromData(data));
				addRuntimeToContext(getRuntimeFromData(data));
				const { referenceLanguage } = getRuntimeFromContext();
				let { i, language } = getRuntimeFromContext();
				$: if (browser) {
				    addRuntimeToGlobalThis(getRuntimeFromData(data));
				    addRuntimeToContext(getRuntimeFromData(data));
				    ({ i, language } = getRuntimeFromContext());
				    document.body.parentElement?.setAttribute('lang', language);
				}
				</script>
				{#if language || !referenceLanguage}{#key language}<slot />{/key}{/if}"
			`)
		})

		test("should add code to existing code", () => {
			const code = dedent`
				<script>
					export let data;

					console.info(data)
				</script>

				<h1>this is a test</h1>

				<p>{JSON.stringify(data, null, 3)}</p>
			`
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toMatchInlineSnapshot(`
				"<script>
					import { browser } from '$app/environment';
				import { addRuntimeToContext, getRuntimeFromContext } from '@inlang/sdk-js/adapter-sveltekit/client/reactive-workaround';
				import { getRuntimeFromData } from '@inlang/sdk-js/adapter-sveltekit/shared';
				import { addRuntimeToGlobalThis } from '@inlang/sdk-js/adapter-sveltekit/client/shared';
				export let data;
				addRuntimeToGlobalThis(getRuntimeFromData(data));
				addRuntimeToContext(getRuntimeFromData(data));
				const { referenceLanguage } = getRuntimeFromContext();
				let { i, language } = getRuntimeFromContext();
				$: if (browser) {
				    addRuntimeToGlobalThis(getRuntimeFromData(data));
				    addRuntimeToContext(getRuntimeFromData(data));
				    ({ i, language } = getRuntimeFromContext());
				    document.body.parentElement?.setAttribute('lang', language);
				}
				console.info(data);
				</script>{#if language || !referenceLanguage}{#key language}

				<h1>this is a test</h1>

				<p>{JSON.stringify(data, null, 3)}</p>{/key}{/if}"
			`)
		})

		test("should not wrap special svelte elements", () => {
			const code = dedent`
				<svelte:window on:load={onLoad} />

				test

				<svelte:body on:click={onClick} />

				other test

				<svelte:head>
					<title>test</title>
				</svelte:head>

				<svelte:options tag="test" />

				random content
			`
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toMatchInlineSnapshot(`
				"<script>
				import { browser } from '$app/environment';
				import { addRuntimeToContext, getRuntimeFromContext } from '@inlang/sdk-js/adapter-sveltekit/client/reactive-workaround';
				import { getRuntimeFromData } from '@inlang/sdk-js/adapter-sveltekit/shared';
				import { addRuntimeToGlobalThis } from '@inlang/sdk-js/adapter-sveltekit/client/shared';
				export let data;
				addRuntimeToGlobalThis(getRuntimeFromData(data));
				addRuntimeToContext(getRuntimeFromData(data));
				const { referenceLanguage } = getRuntimeFromContext();
				let { i, language } = getRuntimeFromContext();
				$: if (browser) {
				    addRuntimeToGlobalThis(getRuntimeFromData(data));
				    addRuntimeToContext(getRuntimeFromData(data));
				    ({ i, language } = getRuntimeFromContext());
				    document.body.parentElement?.setAttribute('lang', language);
				}
				</script>
				<svelte:window on:load={onLoad} />{#if language || !referenceLanguage}{#key language}

				test

				{/key}{/if}<svelte:body on:click={onClick} />{#if language || !referenceLanguage}{#key language}

				other test

				{/key}{/if}<svelte:head>
					<title>test</title>
				</svelte:head>{#if language || !referenceLanguage}{#key language}

				{/key}{/if}<svelte:options tag=\\"test\\" />{#if language || !referenceLanguage}{#key language}

				random content{/key}{/if}"
			`)
		})

		test.todo("should wrap code inside special svelte elements", () => {
			const code = dedent`
				<script>
					import { i } from '@inlang/sdk-js'
				</script>

				<svelte:head>
					<title>{i('title')}</title>
				</svelte:head>
			`
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toMatchInlineSnapshot(`
				"<script>
					import { browser } from '$app/environment';
				import { addRuntimeToContext, getRuntimeFromContext } from '@inlang/sdk-js/adapter-sveltekit/client/not-reactive';
				import { getRuntimeFromData } from '@inlang/sdk-js/adapter-sveltekit/shared';
				export let data;
				addRuntimeToContext(getRuntimeFromData(data));
				let { i, language } = getRuntimeFromContext();
				$: if (browser) {
				    addRuntimeToContext(getRuntimeFromData(data));
				    ({ i, language } = getRuntimeFromContext());
				}
				</script>{#if language}{#key language}

				{/key}{/if}<svelte:head>{#key language}
					<title>{i('title')}</title>
				{/key}{/if}<</svelte:head>"
			`)
		})

		test("should remove @inlang/sdk-js imports that are used reactively", () => {
			const code = dedent`
				<script>
					import { language } from '@inlang/sdk-js'
				</script>

				{language}
			`
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toMatchInlineSnapshot(`
				"<script>
					import { browser } from '$app/environment';
				import { addRuntimeToContext, getRuntimeFromContext } from '@inlang/sdk-js/adapter-sveltekit/client/reactive-workaround';
				import { getRuntimeFromData } from '@inlang/sdk-js/adapter-sveltekit/shared';
				import { addRuntimeToGlobalThis } from '@inlang/sdk-js/adapter-sveltekit/client/shared';
				export let data;
				addRuntimeToGlobalThis(getRuntimeFromData(data));
				addRuntimeToContext(getRuntimeFromData(data));
				const { referenceLanguage } = getRuntimeFromContext();
				let { i, language } = getRuntimeFromContext();
				$: if (browser) {
				    addRuntimeToGlobalThis(getRuntimeFromData(data));
				    addRuntimeToContext(getRuntimeFromData(data));
				    ({ i, language } = getRuntimeFromContext());
				    document.body.parentElement?.setAttribute('lang', language);
				}
				</script>{#if language || !referenceLanguage}{#key language}

				{language}{/key}{/if}"
			`)
		})

		test("should insert data export right after first import statements", () => {
			const code = dedent`
				<script>
					import { i } from "@inlang/sdk-js"
					console.info(i("welcome"))
				</script>

				<slot />
			`
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toMatchInlineSnapshot(`
				"<script>
					import { browser } from '$app/environment';
				import { addRuntimeToContext, getRuntimeFromContext } from '@inlang/sdk-js/adapter-sveltekit/client/reactive-workaround';
				import { getRuntimeFromData } from '@inlang/sdk-js/adapter-sveltekit/shared';
				import { addRuntimeToGlobalThis } from '@inlang/sdk-js/adapter-sveltekit/client/shared';
				export let data;
				addRuntimeToGlobalThis(getRuntimeFromData(data));
				addRuntimeToContext(getRuntimeFromData(data));
				const { referenceLanguage } = getRuntimeFromContext();
				let { i, language } = getRuntimeFromContext();
				$: if (browser) {
				    addRuntimeToGlobalThis(getRuntimeFromData(data));
				    addRuntimeToContext(getRuntimeFromData(data));
				    ({ i, language } = getRuntimeFromContext());
				    document.body.parentElement?.setAttribute('lang', language);
				}
				console.info(i(\\"welcome\\"));
				</script>{#if language || !referenceLanguage}{#key language}

				<slot />{/key}{/if}"
			`)
		})

		test("should insert code snippets right after data export", () => {
			const code = dedent`
				<script>
					import { i } from "@inlang/sdk-js"
					console.info(123)

					export let data

					console.info(i("welcome"))
				</script>

				<slot />
			`
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toMatchInlineSnapshot(`
				"<script>
					import { browser } from '$app/environment';
				import { addRuntimeToContext, getRuntimeFromContext } from '@inlang/sdk-js/adapter-sveltekit/client/reactive-workaround';
				import { getRuntimeFromData } from '@inlang/sdk-js/adapter-sveltekit/shared';
				import { addRuntimeToGlobalThis } from '@inlang/sdk-js/adapter-sveltekit/client/shared';
				export let data;
				addRuntimeToGlobalThis(getRuntimeFromData(data));
				addRuntimeToContext(getRuntimeFromData(data));
				const { referenceLanguage } = getRuntimeFromContext();
				let { i, language } = getRuntimeFromContext();
				$: if (browser) {
				    addRuntimeToGlobalThis(getRuntimeFromData(data));
				    addRuntimeToContext(getRuntimeFromData(data));
				    ({ i, language } = getRuntimeFromContext());
				    document.body.parentElement?.setAttribute('lang', language);
				}
				console.info(123);
				console.info(i(\\"welcome\\"));
				</script>{#if language || !referenceLanguage}{#key language}

				<slot />{/key}{/if}"
			`)
		})

		test("languageInUrl", () => {
			const code = ""
			const config = initTransformConfig({ languageInUrl: true })
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toMatchInlineSnapshot(`
				"<script>
				import { browser } from '$app/environment';
				import { addRuntimeToContext, getRuntimeFromContext } from '@inlang/sdk-js/adapter-sveltekit/client/not-reactive';
				import { getRuntimeFromData } from '@inlang/sdk-js/adapter-sveltekit/shared';
				import { addRuntimeToGlobalThis } from '@inlang/sdk-js/adapter-sveltekit/client/shared';
				export let data;
				addRuntimeToGlobalThis(getRuntimeFromData(data));
				addRuntimeToContext(getRuntimeFromData(data));
				const { referenceLanguage } = getRuntimeFromContext();
				let { i, language } = getRuntimeFromContext();
				$: if (browser) {
				    addRuntimeToGlobalThis(getRuntimeFromData(data));
				    addRuntimeToContext(getRuntimeFromData(data));
				    ({ i, language } = getRuntimeFromContext());
				    document.body.parentElement?.setAttribute('lang', language);
				}
				</script>
				{#key language}<slot />{/key}"
			`)
		})
	})

	describe("non-root", () => {
		test("should not do anything", () => {
			const code = ""
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, false)
			expect(transformed).toEqual(code)
		})
	})

	describe("should not do anything if '@inlang/sdk-js/no-transforms' import is detected", () => {
		test("in context script tag", () => {
			const code = dedent`
				<script context>
					import '@inlang/sdk-js/no-transforms';
				</script>`
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toEqual(code)
		})

		test("in script tag", () => {
			const code = dedent`
				<script>
					import '@inlang/sdk-js/no-transforms';
				</script>`
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toEqual(code)
		})
	})

	describe("ensure getRuntimeFromContext is called the first time after the data export", () => {
		test("single import", () => {
			const code = dedent`
				<script lang="ts">
					import { browser } from '$app/environment'
					import { languages } from '@inlang/sdk-js'

					console.log(languages)
				</script>
			`
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toMatchInlineSnapshot(`
				"<script lang=\\"ts\\">
					import { addRuntimeToContext, getRuntimeFromContext } from '@inlang/sdk-js/adapter-sveltekit/client/reactive-workaround';
				import { getRuntimeFromData } from '@inlang/sdk-js/adapter-sveltekit/shared';
				import { addRuntimeToGlobalThis } from '@inlang/sdk-js/adapter-sveltekit/client/shared';
				import { browser } from '$app/environment';
				export let data;
				addRuntimeToGlobalThis(getRuntimeFromData(data));
				addRuntimeToContext(getRuntimeFromData(data));
				const { referenceLanguage } = getRuntimeFromContext();
				let { i, language } = getRuntimeFromContext();
				$: if (browser) {
				    addRuntimeToGlobalThis(getRuntimeFromData(data));
				    addRuntimeToContext(getRuntimeFromData(data));
				    ({ i, language } = getRuntimeFromContext());
				    document.body.parentElement?.setAttribute('lang', language);
				}
				const { languages } = getRuntimeFromContext();
				console.log(languages);
				</script>"
			`)
		})

		test("multiple imports", () => {
			const code = dedent`
				<script lang="ts">
					import { languages } from '@inlang/sdk-js'
					import { switchLanguage } from '@inlang/sdk-js'
					import { browser } from '$app/environment'

					const doSomething = () => console.log(languages)

					if (browser) doSomething()
				</script>

				<button on:click={() => switchLanguage('en')}>Switch Language</button>
			`
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toMatchInlineSnapshot(`
				"<script lang=\\"ts\\">
					import { addRuntimeToContext, getRuntimeFromContext } from '@inlang/sdk-js/adapter-sveltekit/client/reactive-workaround';
				import { getRuntimeFromData } from '@inlang/sdk-js/adapter-sveltekit/shared';
				import { addRuntimeToGlobalThis } from '@inlang/sdk-js/adapter-sveltekit/client/shared';
				import { browser } from '$app/environment';
				export let data;
				addRuntimeToGlobalThis(getRuntimeFromData(data));
				addRuntimeToContext(getRuntimeFromData(data));
				const { referenceLanguage } = getRuntimeFromContext();
				let { i, language } = getRuntimeFromContext();
				$: if (browser) {
				    addRuntimeToGlobalThis(getRuntimeFromData(data));
				    addRuntimeToContext(getRuntimeFromData(data));
				    ({ i, language } = getRuntimeFromContext());
				    document.body.parentElement?.setAttribute('lang', language);
				}
				const { switchLanguage, languages } = getRuntimeFromContext();
				const doSomething = () => console.log(languages);
				if (browser)
				    doSomething();
				</script>{#if language || !referenceLanguage}{#key language}

				<button on:click={() => switchLanguage('en')}>Switch Language</button>{/key}{/if}"
			`)
		})

		test("data export already defined", () => {
			const code = dedent`
				<script lang="ts">
					import { languages } from '@inlang/sdk-js'

					console.log(languages)

					export let data
				</script>
			`
			const config = initTransformConfig()
			const transformed = transformLayoutSvelte("", config, code, true)
			expect(transformed).toMatchInlineSnapshot(`
				"<script lang=\\"ts\\">
					import { browser } from '$app/environment';
				import { addRuntimeToContext, getRuntimeFromContext } from '@inlang/sdk-js/adapter-sveltekit/client/reactive-workaround';
				import { getRuntimeFromData } from '@inlang/sdk-js/adapter-sveltekit/shared';
				import { addRuntimeToGlobalThis } from '@inlang/sdk-js/adapter-sveltekit/client/shared';
				export let data;
				addRuntimeToGlobalThis(getRuntimeFromData(data));
				addRuntimeToContext(getRuntimeFromData(data));
				const { referenceLanguage } = getRuntimeFromContext();
				let { i, language } = getRuntimeFromContext();
				$: if (browser) {
				    addRuntimeToGlobalThis(getRuntimeFromData(data));
				    addRuntimeToContext(getRuntimeFromData(data));
				    ({ i, language } = getRuntimeFromContext());
				    document.body.parentElement?.setAttribute('lang', language);
				}
				const { languages } = getRuntimeFromContext();
				console.log(languages);
				</script>"
			`)
		})
	})
})

describe.skip("transformLayoutSvelte", () => {
	describe("basics", () => {
		describe("root=true", () => {
			describe("transform @inlang/sdk-js", () => {
				it("resolves imports correctly", async () => {
					const transformed = transformLayoutSvelte(
						"",
						initTransformConfig(),
						dedent`
							<script>
								import { languages, i } from "@inlang/sdk-js"

								console.info(languages)
							</script>

							{i('hello')}
						`,
						true,
					)
					expect(transformed).toMatchInlineSnapshot(`
						"<script>import { browser } from \\"$app/environment\\";
						import { getRuntimeFromContext, addRuntimeToContext } from \\"@inlang/sdk-js/adapter-sveltekit/client/reactive\\";
						import { getRuntimeFromData } from \\"@inlang/sdk-js/adapter-sveltekit/shared\\";
						export let data;
						let language, i, languages;
						addRuntimeToContext(getRuntimeFromData(data));

						({
						    language: language,
						    i: i,
						    languages: languages
						} = getRuntimeFromContext());

						$:
						if (browser && $language) {
						    document.body.parentElement?.setAttribute(\\"lang\\", $language);
						    localStorage.setItem(\\"language\\", $language);
						}

						console.info(languages)</script>

						{#if $language}{$i('hello')}{/if}"
					`)
				})

				it("resolves imports correctly (not-reactive)", async () => {
					const transformed = transformLayoutSvelte(
						"",
						initTransformConfig({
							languageInUrl: true,
						}),
						dedent`
							<script>
								import { languages, i } from "@inlang/sdk-js"

								console.info(languages)
							</script>

							{i('hello')}
						`,
						true,
					)
					expect(transformed).toMatchInlineSnapshot(`
						"<script>import { browser } from \\"$app/environment\\";
						import { getRuntimeFromContext, addRuntimeToContext } from \\"@inlang/sdk-js/adapter-sveltekit/client/not-reactive\\";
						import { getRuntimeFromData } from \\"@inlang/sdk-js/adapter-sveltekit/shared\\";
						export let data;
						let language, i, languages;
						addRuntimeToContext(getRuntimeFromData(data));

						({
						    language: language,
						    i: i,
						    languages: languages
						} = getRuntimeFromContext());

						$:
						if (browser) {
						    addRuntimeToContext(getRuntimeFromData(data));

						    ({
						        language: language,
						        i: i
						    } = getRuntimeFromContext());
						}

						console.info(languages)</script>

						{#key language}{i('hello')}{/key}"
					`)
				})
			})
		})

		// ------------------------------------------------------------------------------------------

		describe("root=false", () => {
			it("is a proxy for transformSvelte", async () => {
				// const config = initTransformConfig()
				// const input = dedent`
				// 	<script>
				// 		import { language } from '@inlang/sdk-js'
				// 		export let data
				// 	</script>
				// 	<h1>Hello {data.name}!</h1>
				// 	{language.toUpperCase()}
				// `
				// const transformed = transformLayoutSvelte("", config, input, false)
				// expect(transformed).toMatch(transformSvelte(config, input))
			})
		})
	})
})
