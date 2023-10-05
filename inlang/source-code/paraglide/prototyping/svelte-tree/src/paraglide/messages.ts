import { languageTag } from "./runtime"
import * as de from "./resources/de"
import * as en from "./resources/en"

export const onlyText: any = () => {
	switch (languageTag) {
		case "en":
			return en.onlyText()
		case "de":
			return de.onlyText()
		default:
			throw new Error(`Unknown language tag: ${languageTag}`)
	}
}

export const multipleParams: any = (params: any) => {
	switch (languageTag) {
		case "en":
			return en.multipleParams(params)
		case "de":
			return de.multipleParams(params)
		default:
			throw new Error(`Unknown language tag: ${languageTag}`)
	}
}
