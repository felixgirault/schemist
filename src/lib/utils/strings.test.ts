import {expect, test} from 'vitest';
import {camelCase, dashCase, sentenceCase} from './strings';

test('sentenceCase', () => {
	expect(sentenceCase('Hello')).toBe('Hello');
	expect(sentenceCase('hElLo WoRlD')).toBe('Hello world');
});

test('dashCase', () => {
	expect(dashCase('HeLlO')).toBe('hello');
	expect(dashCase('HeLlO wOrLd')).toBe('hello-world');
	expect(dashCase('button/primary/bg-hover')).toBe(
		'button-primary-bg-hover'
	);
	expect(dashCase('Primary / hover')).toBe('primary-hover');
});

test('camelCase', () => {
	expect(camelCase('hElLo')).toBe('hello');
	expect(camelCase('HeLlO wOrLd')).toBe('helloWorld');
	expect(camelCase('status/error/subtle-bg')).toBe(
		'statusErrorSubtle-bg'
	);
});
