const DarkSchemeFeature = 'darkSchemeFeature';

const prefersDarkScheme = () =>
	window.matchMedia &&
	window.matchMedia('(prefers-color-scheme: dark)').matches;

export const isDarkSchemeEnabled = () => {
	if (typeof localStorage === 'undefined') {
		return;
	}

	const stored = localStorage.getItem(DarkSchemeFeature);
	return stored === null
		? prefersDarkScheme()
		: !!parseInt(stored);
};

export const toggleDarkScheme = (enabled: boolean) => {
	if (typeof localStorage === 'undefined') {
		return;
	}

	localStorage.setItem(DarkSchemeFeature, enabled ? '1' : '0');
};
