import type { InlangConfig } from "@inlang/config"
import type { InlangEnvironment } from "@inlang/environment"
import type { LintException, LintReport, LintRule } from "@inlang/lint"
import type { MessageQueryApi } from "@inlang/messages"
import type { Result } from "@inlang/result"
import type { InvalidConfigError } from "./errors.js"
import type { ResolvedPlugins } from "@inlang/plugin"

export type InlangInstance = {
	config: {
		get: () => InlangConfig
		/**
		 * Set the config for the instance.
		 */
		set: (config: InlangConfig) => Result<void, InvalidConfigError>
	}
	env: InlangEnvironment
	lint: {
		rules: Reactive<"onlyGetter", Array<Pick<LintRule, "meta"> & { module: string }>>
		// for now, only simply array that can be improved in the future
		// see https://github.com/inlang/inlang/issues/1098
		reports: ReactiveAsync<"onlyGetter", LintReport[]>
		exceptions: ReactiveAsync<"onlyGetter", LintException[]>
	}
	messages: {
		query: MessageQueryApi
	}
	plugins: ResolvedPlugins
}

type Reactive<WithSetter extends "onlyGetter" | "withSetter", T> = {
	get: () => T
} & (WithSetter extends "withSetter"
	? {
			set: (value: T) => void
	  }
	: {})

/**
 * A reactive async value.
 *
 * @throws If the value is not yet initialized.
 */
type ReactiveAsync<WithSetter extends "onlyGetter" | "withSetter", T> = {
	/**
	 * Initialize the getter.
	 */
	init: () => Promise<void>
	/**
	 * @throws If the value is not yet initialized.
	 */
	get: () => T
} & (WithSetter extends "withSetter"
	? {
			set: (value: T) => Promise<void>
	  }
	: {})