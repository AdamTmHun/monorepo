import { type Component, createEffect, ErrorBoundary } from "solid-js"
import { Dynamic, isServer } from "solid-js/web"
import { LocalStorageProvider } from "#src/services/local-storage/index.js"
import {
	availableLanguageTags,
	onSetLanguageTag,
	setLanguageTag,
	sourceLanguageTag,
} from "@inlang/paraglide-js"
import { currentPageContext } from "./state.js"
import type { JSXElement } from "solid-js"

/**
 * The Page that is being rendered.
 *
 * This is the entry point for all pages and acts as a wrapper
 * to provide the page with the required context and provide
 * error boundaries.
 */
export function Root(props: { page: Component; pageProps?: Record<string, unknown> }) {
	return (
		<ErrorBoundary fallback={(error) => <ErrorMessage error={error} />}>
			<ParaglideJsProvider>
				<LocalStorageProvider>
					<Dynamic component={props.page} {...(props.pageProps ?? {})} />
				</LocalStorageProvider>
			</ParaglideJsProvider>
		</ErrorBoundary>
	)
}

function ParaglideJsProvider(props: { children: JSXElement }) {
	setLanguageTag(() => {
		return currentPageContext.languageTag as (typeof availableLanguageTags)[number]
	})

	if (isServer === false) {
		// The url contains a language tag for non source language tag routes
		const maybeLanguageTag = window.location.pathname.split("/")[1] as
			| (typeof availableLanguageTags)[number]
			| undefined

		const pathIncludesLanguageTag = maybeLanguageTag
			? availableLanguageTags.includes(maybeLanguageTag)
			: false
		onSetLanguageTag((newLanguageTag) => {
			if (pathIncludesLanguageTag) {
				const pathWithoutLanguageTag = window.location.pathname.slice(maybeLanguageTag!.length + 1)
				// from non source language tag to source language tag
				if (newLanguageTag === sourceLanguageTag) {
					window.location.pathname = "/" + pathWithoutLanguageTag
				}
				// from non source language tag to non source language tag
				else {
					window.location.pathname = "/" + newLanguageTag + pathWithoutLanguageTag
				}
			}
			// from source language tag to non source language tag
			else {
				window.location.pathname = window.location.pathname + newLanguageTag
			}
		})
	}

	return <>{props.children}</>
}

function ErrorMessage(props: { error: Error }) {
	createEffect(() => {
		console.error("ERROR in renderer", props.error)
	})
	return (
		<>
			<p class="text-danger text-lg font-medium">ERROR DURING RENDERING</p>
			<p class="text-danger">
				Check the console for more information and please{" "}
				<a
					class="link text-primary"
					target="_blank"
					href="https://github.com/inlang/monorepo/issues/new/choose"
				>
					report the bug.
				</a>
			</p>
			<p class="bg-danger-container text-on-danger-container rounded p-2 mt-4">
				{props.error?.toString()}
			</p>
		</>
	)
}
