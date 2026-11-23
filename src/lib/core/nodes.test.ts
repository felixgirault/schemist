import defs from '#lib/definitions/index.js';
import {expect, test} from 'vitest';
import {remapArgs, remapOverrides} from './nodes';

test('keeps args of identical params', () => {
	expect(
		remapArgs(defs.hlt, defs.sdw, {
			amount: 30,
			shift: 5,
			temp: 600
		})
	).toEqual({amount: 30, shift: 5, temp: 600});

	expect(remapArgs(defs.l, defs.s, {amount: 20})).toEqual({
		amount: 20
	});
});

test('resets args of params with another range or kind', () => {
	// Same name, but 0-100 instead of 0-50.
	expect(remapArgs(defs.l, defs.hlt, {amount: 80})).toEqual({
		amount: 10,
		shift: 15,
		temp: 650
	});

	expect(remapArgs(defs.h, defs.anl, {degrees: 90})).toEqual({
		steps: 1
	});

	expect(remapArgs(defs.l, defs.cmp, {amount: 80})).toEqual({});
});

test('keeps overrides of identical, non structural params', () => {
	expect(
		remapOverrides(defs.hlt, defs.sdw, {
			Dark: {amount: 30, shift: 5},
			Contrast: {amount: 10}
		})
	).toEqual({
		Dark: {amount: 30, shift: 5},
		Contrast: {amount: 10}
	});

	// a variant left with no override is dropped
	expect(
		remapOverrides(defs.l, defs.hlt, {Dark: {amount: 80}})
	).toEqual({});
	expect(
		remapOverrides(defs.lsc, defs.stt, {Dark: {steps: 3}})
	).toEqual({});
});

test('never keeps an override of a structural param', () => {
	expect(
		remapOverrides(defs.lsc, defs.lsc, {Dark: {steps: 3}})
	).toEqual({});
});
