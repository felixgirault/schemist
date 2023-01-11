export interface RgbColor {
	r: number; // 0-255
	g: number; // 0-255
	b: number; // 0-255
	a?: number; // 0-1
}

export interface HslColor {
	h: number; // 0-360
	s: number; // 0-100
	l: number; // 0-100
	a?: number; // 0-1
}

export interface LchColor {
	l: number; // 0-100
	c: number; // 0-100
	h: number; // 0-360
	a?: number; // 0-1
}

export interface SchemistColor {
	h: number; // 0-100
	s: number; // 0-100
	l: number; // 0-360
	a?: number; // 0-1
}
