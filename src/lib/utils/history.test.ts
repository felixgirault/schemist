import {expect, test, vi} from 'vitest';
import {History} from './history.svelte';

const setup = (limit?: number) => {
	const state = {value: 0};
	const onChange = vi.fn();
	const history = new History({
		read: () => ({...state}),
		restore: (snapshot) => Object.assign(state, snapshot),
		onChange,
		limit
	});

	history.reset();
	return {state, history, onChange};
};

test('commits only changed states', () => {
	const {state, history} = setup();

	expect(history.commit()).toBe(false);
	state.value = 1;
	expect(history.commit()).toBe(true);
	expect(history.commit()).toBe(false);
	expect(history.past).toEqual([{value: 0}]);
});

test('undoes and redoes', () => {
	const {state, history} = setup();

	state.value = 1;
	history.commit();
	state.value = 2;
	history.commit();

	history.undo();
	expect(state.value).toBe(1);
	history.undo();
	expect(state.value).toBe(0);
	history.undo();
	expect(state.value).toBe(0);

	history.redo();
	history.redo();
	expect(state.value).toBe(2);
	expect(history.future).toEqual([]);
});

test('commits pending changes before undoing', () => {
	const {state, history} = setup();

	state.value = 1;
	history.undo();
	expect(state.value).toBe(0);
	history.redo();
	expect(state.value).toBe(1);
});

test('new commits clear the redo stack', () => {
	const {state, history} = setup();

	state.value = 1;
	history.commit();
	history.undo();
	state.value = 2;
	history.commit();
	expect(history.future).toEqual([]);
	history.redo();
	expect(state.value).toBe(2);
});

test('limits the undo stack', () => {
	const {state, history} = setup(2);

	for (const value of [1, 2, 3, 4]) {
		state.value = value;
		history.commit();
	}

	expect(history.past).toEqual([{value: 2}, {value: 3}]);
});

test('notifies every new state', () => {
	const {state, history, onChange} = setup();

	state.value = 1;
	history.commit();
	history.undo();
	expect(onChange.mock.calls.map(([s]) => s.value)).toEqual([
		0, 1, 0
	]);
});
