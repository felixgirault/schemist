import defs from '#lib/definitions/index.js';
import {expect, test} from 'vitest';
import {remapArgs} from './definitions';

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
