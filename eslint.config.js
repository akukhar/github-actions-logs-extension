const js = require('@eslint/js');
const globals = require('globals');
const noUnsanitized = require('eslint-plugin-no-unsanitized');

// Replaces the plugin's own allowlist, so ansiToHtml becomes the only call
// whose result may reach innerHTML.
const escaping = ['error', { escape: { methods: ['ansiToHtml'] } }];

module.exports = [
	{ ignores: ['dist/'] },
	js.configs.recommended,
	{
		files: ['src/**/*.js'],
		plugins: { 'no-unsanitized': noUnsanitized },
		languageOptions: {
			sourceType: 'commonjs',
			globals: globals.browser,
		},
		rules: {
			'no-unsanitized/method': escaping,
			'no-unsanitized/property': escaping,
			'no-eval': 'error',
			'no-implied-eval': 'error',
			'no-new-func': 'error',
			'no-script-url': 'error',
		},
	},
	{
		files: ['*.js', 'scripts/**/*.js', 'test/**/*.js'],
		languageOptions: {
			sourceType: 'commonjs',
			globals: globals.node,
		},
	},
];
