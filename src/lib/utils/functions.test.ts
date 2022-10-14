import {debounce} from './functions';

const delay = (duration) =>
	new Promise((resolve) => {
		setTimeout(resolve, duration);
	});

test('debounce', async () => {
	const fn = vi.fn();
	const debounced = debounce(fn, 2);

	debounced();

	await delay(3);

	debounced();
	debounced();

	await delay(3);

	expect(fn.mock.calls.length).toBe(2);
});
