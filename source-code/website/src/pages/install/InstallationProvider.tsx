import { type JSXElement, createEffect } from "solid-js"
import { openRepository, createNodeishMemoryFs } from "@lix-js/client"
import { publicEnv } from "@inlang/env-variables"
import {
	LocalStorageProvider,
	getLocalStorage,
	useLocalStorage,
} from "#src/services/local-storage/index.js"
import { InlangConfig, tryCatch } from "@inlang/app"
import type { Step } from "./index.page.jsx"
import { marketplaceItems } from "@inlang/marketplace"
import type { RecentProjectType } from "#src/services/local-storage/src/schema.js"

export function InstallationProvider(props: {
	repo: string
	modules: string[]
	step: () => Step
	setStep: (step: Step) => void
	optIn: Record<string, any>
	children: JSXElement
}) {
	const [localStorage, setLocalStorage] = useLocalStorage() ?? []
	const user = localStorage?.user

	createEffect(() => {
		validateRepo(user, setRecentProject, props)
	})

	/* Set recent project into local storage */
	function setRecentProject() {
		// eslint-disable-next-line solid/reactivity
		setLocalStorage("recentProjects", (prev) => {
			let recentProjects = prev[0] !== undefined ? prev : []

			const newProject: RecentProjectType = {
				owner: props.repo.slice(
					props.repo.indexOf("/") + 1,
					props.repo.indexOf("/", props.repo.indexOf("/") + 1),
				),
				repository: props.repo.slice(
					props.repo.indexOf("/", props.repo.indexOf("/") + 1) + 1,
					props.repo.length,
				),
				description: "",
				lastOpened: new Date().getTime(),
			}

			recentProjects = recentProjects.filter(
				(project) =>
					!(project.owner === newProject.owner && project.repository === newProject.repository),
			)

			recentProjects.push(newProject)

			return recentProjects.sort((a, b) => b.lastOpened - a.lastOpened).slice(0, 7)
		})
	}

	return <LocalStorageProvider>{props.children}</LocalStorageProvider>
}

/**
 * This function checks for common errors before repo initialization (to be more performant) and sets the step accordingly.
 */
function validateRepo(
	user: { username: string; email: string } | undefined,
	setRecentProject: () => void,
	props: {
		repo: string
		modules: string[]
		step: () => Step
		setStep: (step: Step) => void
		optIn: Record<string, any>
	},
) {
	if (!user && getLocalStorage()) {
		props.setStep({
			type: "github-login",
			error: false,
		})
	} else if (!props.repo) {
		props.setStep({
			type: "no-repo",
			message: "No repository URL provided.",
			error: true,
		})
	} else if (!props.modules || props.modules.length === 0 || props.modules[0] === "") {
		props.setStep({
			type: "no-modules",
			message: "No modules provided. You can find modules in the marketplace.",
			error: true,
		})
	} else if (!validateModules(props.modules)) {
		props.setStep({
			type: "invalid-modules",
			message: "Invalid modules provided.",
			error: true,
		})
	} else if (!props.optIn.optIn()) {
		props.setStep({
			type: "opt-in",
			message: "We need your consent to install the modules.",
		})
	} else {
		props.setStep({
			type: "installing",
			message: "Starting installation...",
			error: false,
		})

		setRecentProject()
		initializeRepo(props.repo, props.modules, user!, props.step, props.setStep)
	}
}

/**
 * This function initializes the repository by adding the modules to the project.inlang.json file and pushing the changes to the repository.
 * If there are any errors, the error will be displayed in the UI.
 */
async function initializeRepo(
	repoURL: string,
	modulesURL: string[],
	user: { username: string; email: string },
	step: () => Step,
	setStep: (step: Step) => void,
) {
	modulesURL = modulesURL.filter((module, index) => modulesURL.indexOf(module) === index)

	/* Opens the repository with lix */
	const repo = openRepository(repoURL, {
		nodeishFs: createNodeishMemoryFs(),
		corsProxy: publicEnv.PUBLIC_GIT_PROXY_PATH,
	})

	const isCollaborator = await repo.isCollaborator({
		username: user.username,
	})

	if (!isCollaborator) {
		setStep({
			type: "error",
			message: "You are not a collaborator of this repository.",
			error: true,
		})

		return
	}

	setStep({
		type: "installing",
		message: "Cloning Repository...",
	})

	const projectResult = await tryCatch(async () => {
		const inlangProjectString = (await repo.nodeishFs.readFile("./project.inlang.json", {
			encoding: "utf-8",
		})) as string

		return inlangProjectString
	})

	if (projectResult.error) {
		setStep({
			type: "no-inlang-project",
			message: "No project.inlang.json file found in the repository.",
			error: true,
		})

		return
	}

	const inlangProjectString = projectResult.data

	const parseProjectResult = tryCatch(() => {
		return JSON.parse(inlangProjectString)
	})

	if (parseProjectResult.error) {
		setStep({
			type: "error",
			message: "Error parsing project.inlang.json: " + parseProjectResult.error,
			error: true,
		})

		return
	}

	const inlangProject = parseProjectResult.data as InlangConfig

	/* Look if the modules were already installed */
	for (const module of inlangProject.modules) {
		const installedModules = modulesURL.every((moduleURL) => module.includes(moduleURL))
		if (installedModules) {
			setStep({
				type: "already-installed",
				message: "The modules are already installed in your repository.",
				error: true,
			})
		}
	}

	/* If no modules where found in the project, create an empty array */
	if (!inlangProject.modules) inlangProject.modules = []

	const modulesToInstall = modulesURL.filter((moduleURL) => {
		if (inlangProject.modules.length === 0) return true

		const installedModules = inlangProject.modules.every((module) => module.includes(moduleURL))
		return !installedModules
	})
	inlangProject.modules.push(...modulesToInstall)

	const generatedInlangProject = JSON.stringify(inlangProject, undefined, 2)

	await repo.nodeishFs.writeFile("./project.inlang.json", generatedInlangProject)

	/* If any error has gone through, stop the installation here */
	if (step().error) return

	/* Otherwise, change the repo and finishd the process */
	setStep({
		type: "installing",
		message: "Comitting changes...",
	})

	await repo.add({
		filepath: "project.inlang.json",
	})

	await repo.commit({
		message: "inlang: install module",
		author: {
			name: user.username,
			email: user.email,
		},
	})

	setStep({
		type: "installing",
		message: "Almost done...",
	})

	await repo.push()

	setStep({
		type: "success",
		message:
			"Successfully installed the modules: " +
			modulesURL.join(", ") +
			" in your repository: " +
			repoURL +
			".",
		error: false,
	})
}

/**
 * This function checks if the modules provided in the URL are in the marketplace registry.
 */
function validateModules(modules: string[]) {
	let check = true
	for (const module of modules) {
		if (
			!marketplaceItems.some(
				(marketplaceItem) =>
					marketplaceItem.type !== "app" && marketplaceItem.module.includes(module),
			)
		) {
			check = false
		} else {
			check = true
		}
	}
	return check
}