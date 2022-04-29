export type DebounceTimeout = number | (() => number);

export const debounce = (
	callback: (...args: any[]) => any,
	timeout: DebounceTimeout
) => {
	let timer;

	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(
			() => {
				callback(...args);
			},
			typeof timeout === 'function' ? timeout() : timeout
		);
	};
};

export const withElapsedTime = <T>(fn: (time: number) => T) => {
	let lastTime = Date.now();

	return () => {
		const currentTime = Date.now();
		const elapsedTime = currentTime - lastTime;
		lastTime = currentTime;
		return fn(elapsedTime);
	};
};
