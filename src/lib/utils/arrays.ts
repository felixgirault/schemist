export const withoutIndex = <T>(array: T[], index: number) => {
	const clone = [...array];
	clone.splice(index, 1);
	return clone;
};

export const unique = <T>(array: T[]) => [...new Set(array)];
