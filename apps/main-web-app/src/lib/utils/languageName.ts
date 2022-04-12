import type { LanguageCode } from '@inlang/utils';
import ISO6391 from 'iso-639-1';
import { countryCodeEmoji } from 'country-code-emoji';

/**
 * Renders the name of a language plug the country flag.
 *
 * @example
 *      languageName('en') // => 🇬🇧 English
 */
export function languageName(languageCode: LanguageCode | string): string {
	const _languageCode = languageCode.toLowerCase();
	return `${countryCodeEmoji(_languageCode === 'en' ? 'gb' : _languageCode)} ${ISO6391.getName(
		_languageCode
	)}`;
}
