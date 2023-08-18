import { Value } from "@sinclair/typebox/value"
import { LintRule } from "./api.js"
import { InvalidLintRuleError } from "./errors.js"

export const resolveLintRules = (args: { lintRules: Array<LintRule> }) => {
	const result = {
		data: [] as Array<LintRule>,
		errors: [] as InvalidLintRuleError[],
	}
	for (const rule of args.lintRules) {
		if (Value.Check(LintRule, rule) === false) {
			result.errors.push(
				new InvalidLintRuleError(`Couldn't parse lint rule "${rule.meta.id}"`, {
					module: "not implemented",
				}),
			)
			continue
		} else {
			result.data.push(rule)
		}
	}

	return result
}