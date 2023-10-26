import { languageTag, sourceLanguageTag } from "@inlang/paraglide-js/inlang-marketplace"

const Link = (props: { href?: string; [key: string]: any }) => {
	let modifiedHref =
		languageTag() === sourceLanguageTag ? props.href : "/" + languageTag() + props.href

	if (modifiedHref?.endsWith("/")) {
		modifiedHref = modifiedHref.slice(0, -1)
	}
	if (modifiedHref?.length === 0) {
		modifiedHref = "/"
	}
	return <a {...props} href={modifiedHref} />
}

export default Link
