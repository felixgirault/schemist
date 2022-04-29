export const omit = (
	object: Record<string, any>,
	key: string
) => {
	const {[key]: _, ...rest} = object;
	return rest;
};
