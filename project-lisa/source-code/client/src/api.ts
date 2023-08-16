import { Octokit } from "octokit"
import raw from "isomorphic-git"
import http from "isomorphic-git/http/web/index.js"
import type { NodeishFilesystem } from "@inlang-git/fs"
import { withLazyFetching, transformRemote } from "./helpers.js"
import type { Endpoints } from "@octokit/types";

type Author = {
	name?: string
	email?: string
	timestamp?: number
	timezoneOffset?: number
}

export type Repository = {
	nodeishFs: NodeishFilesystem
	commit: (args: { author: Author, message: string}) => Promise<Awaited<ReturnType<typeof raw.commit>> | undefined>
	push: () => Promise<Awaited<ReturnType<typeof raw.push>> | undefined>
	pull: (args: { author: Author, fastForward: boolean, singleBranch: true }) => any
	add: (args: { filepath: string }) =>  Promise<Awaited<ReturnType<typeof raw.add>>>
	listRemotes: () => Promise<Awaited<ReturnType<typeof raw.listRemotes>> | undefined>
	log: (args: { since: any}) =>  Promise<Awaited<ReturnType<typeof raw.log>>>
	statusMatrix: (args: { filter: any }) => Promise<Awaited<ReturnType<typeof raw.statusMatrix>>>
	status: (args: { filepath: string }) => Promise<Awaited<ReturnType<typeof raw.status>>>
	mergeUpstream: (args: { branch: string }) => ReturnType<typeof github.request<"POST /repos/{owner}/{repo}/merge-upstream">>
	isCollaborator: (args: { username: string }) => Promise<boolean>
	getOrigin: () => Promise<string>
	getCurrentBranch: () => Promise<string | undefined>
	getMeta: () => Promise<{
		name: string,
		isPrivate: boolean,
		isFork: boolean,
		owner: { name?: string, email?: string },
		parent:  {
			url: string,
			fullName: string
		} | undefined
	}>

	// TODO: implement these before publishing api, but not used in badge or editor
	// currentBranch: () => unknown
	// changeBranch: () => unknown
}

export function open (url: string, args: { nodeishFs: NodeishFilesystem, workingDirectory?: string, corsProxy?: string, auth?: unknown }): Repository {
	const rawFs = args.nodeishFs

	// parse url in the format of github.com/inlang/example and split it to host, owner and repo
	const [host, owner, repoName] = [...url.split("/")]

	// check if all 3 parts are present, if not, return an error
	if (!host || !owner || !repoName) {
		throw new Error(
			`Invalid url format for '${url}' for cloning repository, please use the format of github.com/inlang/example.`,
		)
	}

	const github = new Octokit({
		request: {
			fetch: (...args: any) => {
				// modify the path to be proxied by the server
				if (args.corsProxy) {
					args[0] = args.corsProxy + args[0]
				}
				// @ts-ignore
				return fetch(...args)
			},
		},
	})

	const normalizedUrl = `https://${host}/${owner}/${repoName}`

	// the directory we use for all git operations
	const dir = "/"

	let pending: Promise<void> | undefined = raw.clone({
		fs: withLazyFetching(rawFs, 'clone'),
		http,
		dir,
		corsProxy: args?.corsProxy,
		url: normalizedUrl,
		singleBranch: true,
		depth: 1,
		noTags: true,
	}).finally(() => {
		pending = undefined
	}).catch((err: any) => {
		console.error('error cloning the repository', err)
	})

	// delay all fs and repo operations until the repo clone and checkout have finished, this is preparation for the lazy feature
	function delayedAction ({ execute }: { execute: () => any }) {
		if (pending) {
			return pending.then(execute)
		}

		return execute()
	}

	return {
		nodeishFs: withLazyFetching(rawFs, 'app', delayedAction),

		/**
		 * Gets the git origin url of the current repository.
		 *
		 * @returns The git origin url or undefined if it could not be found.
		 */
		async listRemotes () {
			try {
				const withLazyFetchingpedFS = withLazyFetching(rawFs, 'listRemotes', delayedAction)

				const remotes = await raw.listRemotes({
					fs: withLazyFetchingpedFS,
					dir
				})

				return remotes
			} catch (_err) {
				return undefined
			}
		},

		status (cmdArgs) {
			return raw.status({
				fs: withLazyFetching(rawFs, 'statusMatrix', delayedAction),
				dir,
				filepath: cmdArgs.filepath
			})
		},

		statusMatrix (cmdArgs) {
			return raw.statusMatrix({
				fs: withLazyFetching(rawFs, 'statusMatrix', delayedAction),
				dir,
				filter: cmdArgs.filter
			})
		},

		add (cmdArgs) {
			return raw.add({
				fs: withLazyFetching(rawFs, 'add', delayedAction),
				dir,
				filepath: cmdArgs.filepath
			})
		},

		commit (cmdArgs) {
			return raw.commit({
				fs: withLazyFetching(rawFs, 'commit', delayedAction),
				dir,
				author: cmdArgs.author,
				message: cmdArgs.message
			})
		},

		push () {
			return raw.push({
				fs: withLazyFetching(rawFs, 'push', delayedAction),
				url: normalizedUrl,
				corsProxy: args?.corsProxy,
				http,
				dir
			})
		},

		pull (cmdArgs) {
			return raw.pull({
				fs: withLazyFetching(rawFs, 'pull', delayedAction),
				url: normalizedUrl,
				corsProxy: args?.corsProxy,
				http,
				dir,
				fastForward: cmdArgs.fastForward,
				singleBranch: cmdArgs.singleBranch,
				author: cmdArgs.author
			})
		},

		log (cmdArgs) {
			return raw.log({
				fs: withLazyFetching(rawFs, 'log', delayedAction),
				dir,
				since: cmdArgs.since
			})
		},

		mergeUpstream (cmdArgs) {
			return github.request("POST /repos/{owner}/{repo}/merge-upstream", {
				branch: cmdArgs.branch,
				owner,
				repo: repoName,
			})
		},

		async isCollaborator (cmdArgs) {
			let response: Awaited<ReturnType<typeof github.request<"GET /repos/{owner}/{repo}/collaborators/{username}">>> | undefined
			try {
				response = await github.request(
					"GET /repos/{owner}/{repo}/collaborators/{username}",
					{
						owner,
						repo: repoName,
						username: cmdArgs.username,
					},
				)
			} catch (_err) { /* throws on non collaborator access */ }

			return response?.status === 204 ? true : false
		},

		/**
		 * Parses the origin from remotes.
		 *
		 * The function ensures that the same orgin is always returned for the same repository.
		 */
		async getOrigin (): Promise<string> {
			const remotes: Array<{ remote: string; url: string }> | undefined = await this.listRemotes()

			const origin = remotes?.find((elements) => elements.remote === "origin")
			if (origin === undefined) {
				return "unknown"
			}
			// polyfill for some editor related origin issues
			let result = origin.url
			if (result.endsWith(".git") === false) {
				result += ".git"
			}

			return transformRemote(result)
		},

		async getCurrentBranch () {
			// TODO: make stateless
			return await raw.currentBranch({
				fs: withLazyFetching(rawFs, 'getCurrentBranch', delayedAction),
				dir,
			}) || undefined
		},

		 /**
		 * Additional information about a repository provided by GitHub.
		 */
		 async getMeta () {
			const { data: { name, private: isPrivate, fork: isFork, parent, owner: ownerMetaData }}: Awaited<ReturnType<typeof github.request<"GET /repos/{owner}/{repo}">>> = await github
				.request("GET /repos/{owner}/{repo}", {
					owner,
					repo: repoName,
				})

				return {
					name,
					isPrivate,
					isFork,
					owner: { name: ownerMetaData.name || undefined, email: ownerMetaData.email || undefined},
					parent: parent ? {
						url: transformRemote(parent.git_url),
						fullName: parent.full_name
					} : undefined
				}
		},
	}
}
