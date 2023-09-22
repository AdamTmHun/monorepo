/**
 * ------------------------------------
 * The git proxy routes and authenticates requests
 * to git hosts like GitHub and GitLab.
 *
 * The proxy exists to avoid CORS issues and authenticate
 * requests.
 * ------------------------------------
 */

import type { NextFunction, Request, Response } from "express"
// @ts-ignore
import createMiddleware from "@isomorphic-git/cors-proxy/middleware.js"
import { decryptAccessToken } from "./auth/implementation.js"
import { privateEnv } from "@inlang/env-variables"

const middleware = createMiddleware({
	// This is the cors allowed origin:
	origin: privateEnv.PUBLIC_SERVER_BASE_URL,

	authorization: async (request: Request, _response: Response, next: NextFunction) => {
		try {
			const encryptedAccessToken = request.session?.encryptedAccessToken

			if (encryptedAccessToken) {
				const decryptedAccessToken = await decryptAccessToken({
					JWE_SECRET_KEY: privateEnv.JWE_SECRET,
					jwe: encryptedAccessToken,
				})

				request.headers["authorization"] = `Basic ${btoa(decryptedAccessToken)}`
			}

			return next()
		} catch (err) {
			next(err)
		}
	},
})

export async function proxy(request: Request, response: Response, next: NextFunction) {
	if (request.path.includes("github") === false) {
		response.status(500).send("Unsupported git hosting provider.")
	}
	try {
		// remove the proxy path from the url
		request.url = request.url.split(privateEnv.PUBLIC_GIT_PROXY_PATH)[1]!

		response.set("Access-Control-Allow-Credentials", "true")

		middleware(request, response, next)
	} catch (error) {
		next(error)
	}
}
