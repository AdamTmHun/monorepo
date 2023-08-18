import {
	createMemo,
	createResource,
	createSignal,
	For,
	Match,
	Switch,
	Show,
	onMount,
} from "solid-js"
import { Message } from "./Message.jsx"
import { Layout as EditorLayout } from "./Layout.jsx"
import MaterialSymbolsUnknownDocumentOutlineRounded from "~icons/material-symbols/unknown-document-outline-rounded"
import MaterialSymbolsArrowOutwardRounded from "~icons/material-symbols/arrow-outward-rounded"
import { Meta, Title } from "@solidjs/meta"
import { EditorStateProvider, useEditorState } from "./State.jsx"
import NoMatchPlaceholder from "./components/NoMatchPlaceholder.jsx"
// import { rpc } from "@inlang/rpc"
import { ListHeader, messageCount } from "./components/Listheader.jsx"
import { TourHintWrapper } from "./components/Notification/TourHintWrapper.jsx"
import { useLocalStorage } from "#src/services/local-storage/index.js"
import type { RecentProjectType } from "#src/services/local-storage/src/schema.js"
import type { ModuleError, ModuleImportError } from "@inlang/module"

export function Page() {
	return (
		<EditorStateProvider>
			<EditorLayout>
				<TheActualPage />
			</EditorLayout>
		</EditorStateProvider>
	)
}

/**
 * The actual page that contains markup.
 *
 * This is separated from the Page component because the EditorStateProvider
 * is required to use the useEditorState hook.
 */
function TheActualPage() {
	const {
		inlang,
		routeParams,
		repositoryIsCloned,
		doesInlangConfigExist,
		tourStep,
	} = useEditorState()
	const [, setLocalStorage] = useLocalStorage()

	onMount(() => {
		setLocalStorage("recentProjects", (prev) => {
			let recentProjects = prev[0] !== undefined ? prev : []

			recentProjects = recentProjects.filter(
				(project) =>
					!(
						project.owner === routeParams().owner && project.repository === routeParams().repository
					),
			)

			const newProject: RecentProjectType = {
				owner: routeParams().owner,
				repository: routeParams().repository,
				description: "",
				lastOpened: new Date().getTime(),
			}
			recentProjects.push(newProject)

			return recentProjects.sort((a, b) => b.lastOpened - a.lastOpened).slice(0, 7)
		})
	})

	return (
		<>
			<Title>
				{routeParams().owner}/{routeParams().repository}
			</Title>
			<Meta
				name="description"
				content={`Contribute translations to ${routeParams().repository} via inlangs editor.`}
			/>
			<Switch
				fallback={
					<p class="text-danger">
						Switch fallback. This is likely an error. Please report it with code e329jafs.
					</p>
				}
			>
				<Match when={repositoryIsCloned.error?.message.includes("404")}>
					<RepositoryDoesNotExistOrNotAuthorizedCard />
				</Match>
				<Match when={repositoryIsCloned.error?.message.includes("401")}>
					<p class="text-lg font-medium text-center flex justify-center items-center h-full grow">
						You want to access a private repository, please sign-in at the bottom.
					</p>
				</Match>
				<Match when={repositoryIsCloned.error}>
					<p class="text-danger">{repositoryIsCloned.error.message}</p>
				</Match>
				<Match when={inlang()?.errors().length !== 0 && inlang()}>
					<p class="text-danger pb-2">
						An error occurred while initializing the config:
					</p>
					<ul class="text-danger">
						{inlang()?.errors().length !== 0 &&
							<For each={inlang()?.errors()}>
								{(error) => {
									return (<li class="pt-2">
										<span class="font-semibold">{error.name}: </span>
										<br />
										error.message <br />
										error.cause? && <p>{error.cause as string}</p>
										error.stack && <p>{error.stack}</p>
									</li>)
								}}
							</For>
						}
					</ul>
				</Match>
				<Match when={repositoryIsCloned.loading || inlang() === undefined}>
					<div class="flex flex-col grow justify-center items-center min-w-full gap-2">
						{/* sl-spinner need a own div otherwise the spinner has a bug. The wheel is rendered on the outer div  */}
						<div>
							{/* use font-size to change the spinner size    */}
							<sl-spinner class="text-4xl" />
						</div>

						<p class="text-lg font-medium">Cloning large repositories can take a few minutes...</p>
						<br />
						<p class="max-w-lg">
							TL;DR you are currently cloning a real git repo, in the browser, on top of a virtual
							file system, which might lead to a new generation of software (see{" "}
							<a
								class="link link-primary"
								href="https://www.youtube.com/watch?v=vJ3jGgCrz2I"
								target="_blank"
							>
								next git
							</a>
							).
							<br />
							<br />
							We are working on increasing the performance. Progress can be tracked in{" "}
							<a
								href="https://github.com/orgs/inlang/projects/9"
								target="_blank"
								class="link link-primary"
							>
								project #9
							</a>
							.
						</p>
					</div>
				</Match>
				<Match when={!doesInlangConfigExist()}>
					<NoInlangConfigFoundCard />
				</Match>
				<Match when={doesInlangConfigExist() && inlang()?.query.messages.getAll() !== undefined}>
					<div>
						<ListHeader messages={inlang()?.query.messages.getAll() || []} />
						<TourHintWrapper
							currentId="textfield"
							position="bottom-left"
							offset={{ x: 110, y: 144 }}
							isVisible={tourStep() === "textfield"}
						>
							<For each={inlang()?.query.messages.getAll()}>
								{(message) => {
									return <Message message={message} />
								}}
							</For>
						</TourHintWrapper>
						<div
							class="flex flex-col h-[calc(100vh_-_288px)] grow justify-center items-center min-w-full gap-2"
							classList={{
								["hidden"]: messageCount(inlang()?.query.messages.getAll() || []) !== 0,
							}}
						>
							<NoMatchPlaceholder />
							<p class="text-base font-medium text-left text-on-background">
								No results matched your search.
							</p>
							<p class="text-[13px] text-center text-on-surface-variant">
								Please remove some filters to get more matches.
							</p>
						</div>
					</div>
				</Match>
			</Switch>
		</>
	)
}

function NoInlangConfigFoundCard() {
	return (
		<div class="flex grow items-center justify-center">
			<div class="border border-outline p-8 rounded flex flex-col max-w-lg">
				<MaterialSymbolsUnknownDocumentOutlineRounded class="w-10 h-10 self-center" />
				<h1 class="font-semibold pt-5">Inlang has not been set up for this repository yet.</h1>
				<p class="pt-1.5 pb-8">
					Please refer to the documentation and write the config file manually.
				</p>
				<a class="self-center" href="/documentation" target="_blank">
					<sl-button prop:variant="text">
						Take me to the documentation
						{/* @ts-ignore */}
						<MaterialSymbolsArrowOutwardRounded slot="suffix" />
					</sl-button>
				</a>
			</div>
		</div>
	)
}

function RepositoryDoesNotExistOrNotAuthorizedCard() {
	const { routeParams } = useEditorState()

	return (
		<div class="flex grow items-center justify-center">
			<div class="border border-outline p-8 rounded flex flex-col max-w-lg">
				<h1 class="self-center text-5xl font-light">404</h1>
				<h2 class="font-semibold pt-5">The repository has not been found.</h2>
				<p class="pt-1.5">
					Make sure that you the repository owner{" "}
					<code class="bg-secondary-container py-1 px-1.5 rounded text-on-secondary-container">
						{routeParams().owner}
					</code>{" "}
					and the repository name{" "}
					<code class="bg-secondary-container py-1 px-1.5 rounded text-on-secondary-container">
						{routeParams().repository}
					</code>{" "}
					contain no mistake.
					<span class="pt-2 block">
						Alternatively, you might not have access to the repository.
					</span>
				</p>
				<a
					class="self-end pt-5"
					href="https://github.com/inlang/inlang/discussions/categories/help-questions-answers"
					target="_blank"
				>
					<sl-button prop:variant="text">
						I need help
						{/* @ts-ignore */}
						<MaterialSymbolsArrowOutwardRounded slot="suffix" />
					</sl-button>
				</a>
			</div>
		</div>
	)
}
