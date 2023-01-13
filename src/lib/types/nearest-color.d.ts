declare module 'nearest-color' {
	type Color = {
		name: string;
	};

	export function from(
		colors: Record<string, string>
	): (hex: string) => Color;
}
