import { Meta, Title } from "@solidjs/meta"
import Hero from "./custom_section/Hero.jsx"
import MarketplaceLayout from "#src/interface/marketplace/MarketplaceLayout.jsx"
import { Show } from "solid-js"
import Lix from "./custom_section/Lix.jsx"
import Stack from "./custom_section/Stack.jsx"
import Gridview from "#src/interface/marketplace/Gridview.jsx"
import { currentPageContext } from "#src/renderer/state.js"

export function Page() {
	const search = currentPageContext.urlParsed.search["search"]

	return (
		<>
			<Title>inlang Marketplace - The ecosystem to go global</Title>
			<Meta
				name="description"
				content="Quickly find the best solution to globalize (i18n) your app. inlang helps you to expand to new markets and acquire new customers."
			/>
			<Meta name="og:image" content="/images/inlang-social-image.jpg" />
			<MarketplaceLayout>
				<Show
					when={search}
					fallback={
						<>
							<Hero />
							<Stack />
							<Lix />
						</>
					}
				>
					<div class="pt-10">
						<Gridview />
					</div>
				</Show>
			</MarketplaceLayout>
		</>
	)
}
