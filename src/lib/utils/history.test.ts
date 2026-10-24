import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {History} from './history.svelte';

type State = {name: string; value: number};

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

const setup = () => {
	const state: State = {name: 'a', value: 0};
	const onChange = vi.fn();
	const history = new History<State>({
		restore: (snapshot) => Object.assign(state, snapshot),
		onChange,
		// Changes of the value merge, changes of the name don't.
		group: (previous, next) =>
			previous.name === next.name ? next.name : undefined
	});

	const change = (changes: Partial<State>) => {
		Object.assign(state, changes);
		history.record({...state});
	};

	history.reset({...state});
	return {state, history, onChange, change};
};

test('records only changed states', () => {
	const {state, history} = setup();

	history.record({...state});
	expect(history.past).toEqual([]);
});

test('undoes and redoes', () => {
	const {state, history, change} = setup();

	change({name: 'b'});
	change({name: 'c'});

	history.undo();
	expect(state.name).toBe('b');
	history.undo();
	expect(state.name).toBe('a');
	history.undo();
	expect(state.name).toBe('a');

	history.redo();
	history.redo();
	expect(state.name).toBe('c');
	expect(history.future).toEqual([]);
});

test('merges quick changes of the same group', () => {
	const {state, history, change} = setup();

	change({value: 1});
	vi.advanceTimersByTime(500);
	change({value: 2});
	vi.advanceTimersByTime(500);
	change({value: 3});
	expect(history.past).toEqual([{name: 'a', value: 0}]);

	history.undo();
	expect(state.value).toBe(0);
});

test('splits changes of the same group after a pause', () => {
	const {history, change} = setup();

	change({value: 1});
	vi.advanceTimersByTime(1000);
	change({value: 2});
	expect(history.past).toHaveLength(2);
});

test('splits changes of different groups', () => {
	const {history, change} = setup();

	change({value: 1});
	change({name: 'b'});
	change({value: 2});
	expect(history.past).toHaveLength(3);
});

test('drops steps that end where they started', () => {
	const {history, change} = setup();

	change({name: 'b'});
	change({value: 1});
	change({value: 0});
	expect(history.past).toEqual([{name: 'a', value: 0}]);

	change({value: 2});
	expect(history.past).toEqual([
		{name: 'a', value: 0},
		{name: 'b', value: 0}
	]);
});

test('does not merge changes into restored states', () => {
	const {state, history, change} = setup();

	change({value: 1});
	history.undo();
	history.redo();
	change({value: 2});

	history.undo();
	expect(state.value).toBe(1);
});

test('new changes clear the redo stack', () => {
	const {state, history, change} = setup();

	change({name: 'b'});
	history.undo();
	change({name: 'c'});
	expect(history.future).toEqual([]);
	history.redo();
	expect(state.name).toBe('c');
});

test('limits the undo stack to 100 states', () => {
	const {history, change} = setup();

	for (let value = 1; value <= 101; value++) {
		change({name: `${value}`});
	}

	expect(history.past).toHaveLength(100);
	expect(history.past[0]).toEqual({name: '1', value: 0});
});

test('notifies every new state, but not the initial one', () => {
	const {history, onChange, change} = setup();

	expect(onChange).not.toHaveBeenCalled();
	change({value: 1});
	change({value: 2});
	history.undo();
	expect(onChange.mock.calls.map(([s]) => s.value)).toEqual([
		1, 2, 0
	]);
});
