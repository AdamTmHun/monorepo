import {
	type Accessor,
	type Component,
	createEffect,
	ErrorBoundary,
	Show,
	type JSXElement,
} from "solid-js"
import type { PageContextRenderer } from "./types.js"
import { Dynamic, isServer } from "solid-js/web"
import { LocalStorageProvider } from "#src/services/local-storage/index.js"
import { onSetLanguageTag, setLanguageTag, languageTag } from "@inlang/paraglide-js"

import { Meta } from "@solidjs/meta"
import { currentPageContext } from "./state.js"

export type RootProps = Accessor<{
	pageContext: PageContextRenderer
}>

/**
 * The Page that is being rendered.
 *
 * This is the entry point for all pages and acts as a wrapper
 * to provide the page with the required context and provide
 * error boundaries.
 */
export function Root(props: { page: Component; pageProps: Record<string, unknown> }) {
	return (
		<ErrorBoundary fallback={(error) => <ErrorMessage error={error} />}>
			<LocalStorageProvider>
				<Show
					when={languageTag()}
					fallback={
						<>
							<Meta name="og:image" content="/images/inlang-social-image.jpg" />
						</>
					}
				>
					<Dynamic component={props.page} {...props.pageProps} />
				</Show>
			</LocalStorageProvider>
		</ErrorBoundary>
	)
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

export const ParaglideSolidAdpater = (props: { children: JSXElement }) => {
	if (!isServer) {
		setLanguageTag("en")
		onSetLanguageTag((tag: string) => {
			console.log("onSetLanguageTag", tag)

			//window.location.href = `/${tag}`
		})
	}

	setLanguageTag(() => currentPageContext.languageTag)

	return <>{props.children}</>
}

