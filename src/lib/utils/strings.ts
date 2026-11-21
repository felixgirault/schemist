// Sass is more liberal than CSS in what chars are legal in
// a variable name, but we're taking the stricter approach.
const stripForbiddenChars = (text: string) =>
	text.replaceAll(/[^a-zA-Z0-9_-]/g, '');

// Slashes and dots separate words too, as in design token names
// (`button/primary/bg`, `button.primary.bg`).
const words = (sentence: string) =>
	sentence
		.split(/[ /.]+/)
		.filter(Boolean)
		.map(stripForbiddenChars);

export const sentenceCase = (sentence: string) =>
	sentence.charAt(0).toUpperCase() +
	sentence.slice(1).toLowerCase();

export const dashCase = (sentence: string) =>
	words(sentence)
		.map((word) => word.toLowerCase())
		.join('-');

export const camelCase = (sentence: string) =>
	words(sentence)
		.map((word, index) =>
			index === 0 ? word.toLowerCase() : sentenceCase(word)
		)
		.join('');
