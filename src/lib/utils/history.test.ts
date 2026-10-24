import {expect, test, vi} from 'vitest';
import {History} from './history.svelte';

const setup = () => {
	const state = {value: 0};
	const onChange = vi.fn();
	const history = new History({
		read: () => ({...state}),
		restore: (snapshot) => Object.assign(state, snapshot),
		onChange
	});

	history.reset();
	return {state, history, onChange};
};

test('commits only changed states', () => {
	const {state, history} = setup();

	history.commit();
	expect(history.past).toEqual([]);
	state.value = 1;
	history.commit();
	history.commit();
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

test('limits the undo stack to 100 states', () => {
	const {state, history} = setup();

	for (let value = 1; value <= 101; value++) {
		state.value = value;
		history.commit();
	}

	expect(history.past).toHaveLength(100);
	expect(history.past[0]).toEqual({value: 1});
});

test('notifies every new state, but not the initial one', () => {
	const {state, history, onChange} = setup();

	expect(onChange).not.toHaveBeenCalled();
	state.value = 1;
	history.commit();
	history.undo();
	expect(onChange.mock.calls.map(([s]) => s.value)).toEqual([
		1, 0
	]);
});
