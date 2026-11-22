export type Scalar = string | number | boolean;

export type Parsed = {
	data: Record<string, Scalar>;
	body: string;
};

const scalar = (raw: string, line: string): Scalar => {
	if (raw === 'true' || raw === 'false') return raw === 'true';
	if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);

	if (raw.startsWith('"')) {
		try {
			const value = JSON.parse(raw);
			if (typeof value === 'string') return value;
		} catch {}
		throw new Error(`Invalid quoted string: ${line}`);
	}

	if (raw.startsWith("'")) {
		if (raw.length > 1 && raw.endsWith("'"))
			return raw.slice(1, -1);
		throw new Error(`Invalid quoted string: ${line}`);
	}

	return raw;
};

// Flat `key: value` lines between two `---` lines; no front matter
// gives empty data. Values are strings (bare or quoted), numbers or
// booleans; anything else is rejected.
export const parseFrontMatter = (text: string): Parsed => {
	const lines = text.split('\n');

	if (lines[0].trim() !== '---') return {data: {}, body: text};

	const end = lines.findIndex(
		(line, i) => i > 0 && line.trim() === '---'
	);

	if (end < 0) throw new Error('Front matter is not closed');

	const data: Record<string, Scalar> = {};

	for (const line of lines.slice(1, end)) {
		if (!line.trim()) continue;

		const match = line.match(
			/^([A-Za-z_][\w-]*):\s+(\S.*?)\s*$/
		);

		if (!match)
			throw new Error(`Invalid front matter line: ${line}`);

		const [, key, raw] = match;

		if (key in data) throw new Error(`Duplicate key: ${key}`);

		data[key] = scalar(raw, line);
	}

	return {
		data,
		body: lines
			.slice(end + 1)
			.join('\n')
			.trim()
	};
};
