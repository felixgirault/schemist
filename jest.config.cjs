/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
	preset: 'ts-jest/presets/js-with-ts-esm',
	testEnvironment: 'node',
	moduleNameMapper: {
		'^\\$lib/(.*)$': '<rootDir>/src/lib/$1',
		'culori/fn':
			'<rootDir>/node_modules/culori/src/index-fn.js'
	},
	transformIgnorePatterns: ['node_modules/(?!(culori))'],
	globals: {
		'ts-jest': {
			diagnostics: false,
			isolatedModules: true
		}
	}
};
