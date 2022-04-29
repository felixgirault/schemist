import {camelCase, dashCase, sentenceCase} from './strings';

test('sentenceCase', () => {
	expect(sentenceCase('Hello')).toBe('Hello');
	expect(sentenceCase('hElLo WoRlD')).toBe('Hello world');
});

test('dashCase', () => {
	expect(dashCase('HeLlO')).toBe('hello');
	expect(dashCase('HeLlO wOrLd')).toBe('hello-world');
});

test('camelCase', () => {
	expect(camelCase('hElLo')).toBe('hello');
	expect(camelCase('HeLlO wOrLd')).toBe('helloWorld');
});
