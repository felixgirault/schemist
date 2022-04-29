export const sentenceCase = (sentence: string) =>
	sentence.charAt(0).toUpperCase() +
	sentence.slice(1).toLowerCase();

export const dashCase = (sentence: string) =>
	sentence
		.split(' ')
		.map((word) => word.toLowerCase())
		.join('-');

export const camelCase = (sentence: string) =>
	sentence
		.split(' ')
		.map((word, index) =>
			index === 0 ? word.toLowerCase() : sentenceCase(word)
		)
		.join('');
