import { raw } from "@inlang-git/client/raw"
import fs from "node:fs"

/**
 * Gets the git origin url of the current repository.
 *
 * @returns The git origin url or undefined if it could not be found.
 */
export async function getGitOrigin() {
	try {
		const remotes = await raw.listRemotes({
			fs,
			dir: await raw.findRoot({ fs, filepath: process.cwd() }),
		})
		return remotes.find((remote) => remote.remote === "origin")?.url
	} catch (e) {
		return undefined
	}
}