export type DebounceTimeout = number | (() => number);

export const debounce = <Fn extends (...args: any) => any>(
	callback: Fn,
	timeout: DebounceTimeout
) => {
	let timer: NodeJS.Timeout;

	return (...args: Parameters<Fn>) => {
		clearTimeout(timer);
		timer = setTimeout(
			() => {
				callback.apply(null, args);
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
