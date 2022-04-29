export const round = (number: number, precision: number) =>
	number ? parseFloat(number.toFixed(precision)) : number;

export const clamp = (value: number, max = 100, min = 0) =>
	value > max ? max : value < min ? min : value;

export const circular = (value: number, max = 360) =>
	value > max ? value - max : value < 0 ? value + max : value;

export const interval = (
	min: number,
	max: number,
	ratio: number
) => min + (max - min) * ratio;

export const circularInterval = (
	min: number,
	max: number,
	ratio: number
) => {
	const circularClockwise = circular(max - min);
	const circularCounter = circular(min - max);
	const shortest =
		circularClockwise < circularCounter
			? circularClockwise
			: -circularCounter;

	return circular(min + shortest * ratio);
};

export const closestAngle = (
	angle: number,
	target: number,
	step: number
) => {
	const offsetHue = circular(angle - target);
	const upper = offsetHue % step;
	const lower = Math.abs(step - upper);
	const distance = upper < lower ? upper : -lower;
	return circular(target + distance);
};
