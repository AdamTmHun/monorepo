/* eslint-disable no-undef */
/* eslint-disable no-console */
import * as m from "@inlang/paraglide-js/example-typescript/messages"
import { languageTag, setLanguageTag } from "@inlang/paraglide-js/example-typescript"

setLanguageTag("en")

console.log(m.currentLanguageTag({ languageTag: languageTag() }))
console.log(m.greeting({ name: "Samuel", count: 5 }))

setLanguageTag("de")

console.log(m.currentLanguageTag({ languageTag: languageTag() }))
console.log(m.greeting({ name: "Samuel", count: 5 }))
