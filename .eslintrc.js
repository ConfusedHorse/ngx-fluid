module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 13
  },
  ignorePatterns: ['/**/*.spec.ts', './artifacts/**/*', 'projects/**/*', '**/*.stories.ts', '**/version.ts', '**/jest.*.ts'],
  overrides: [{
    files: ['*.ts'],
    parserOptions: {
      project: ['tsconfig.json'],
      createDefaultProgram: true
    },
    extends: [
      'plugin:@angular-eslint/recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@angular-eslint/template/process-inline-templates'
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/naming-convention': ['error', {
        selector: 'default',
        format: ['camelCase'],
        filter: {
          regex: '^[_]*$',
          match: false
        }
      }, {
          selector: 'variable',
          modifiers: ['exported', 'const'],
          format: ['UPPER_CASE', 'PascalCase']
        }, {
          selector: 'classProperty',
          modifiers: ['static', 'readonly'],
          format: ['UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow'
        }, {
          selector: ['typeLike', 'enumMember'],
          format: ['PascalCase']
        }, {
          selector: 'memberLike',
          'modifiers': ['private'],
          'format': ['camelCase'],
          leadingUnderscore: 'require'
        }, {
          selector: 'memberLike',
          modifiers: ['protected'],
          format: ['camelCase'],
          leadingUnderscore: 'require'
        }, {
          selector: 'memberLike',
          modifiers: ['static'],
          format: ['PascalCase'],
          filter: {
            regex: '^forRoot$|^forChild$',
            match: false
          }
        }, {
          selector: 'variable',
          modifiers: ['destructured'],
          format: null
        }, {
          selector: 'objectLiteralProperty',
          'modifiers': ['requiresQuotes'],
          format: null
        }, {
          selector: 'function',
          format: ['camelCase'],
          leadingUnderscore: 'require'
        }, {
          selector: 'function',
          modifiers: ['exported'],
          format: ['camelCase'],
          leadingUnderscore: 'forbid'
        }],
      '@typescript-eslint/member-ordering': ['error', {
        default: {
          memberTypes: ['static-field', 'protected-abstract-field', 'public-abstract-field', 'private-instance-field', 'protected-instance-field', 'public-instance-field', 'constructor', 'public-method', 'protected-method', 'private-method']
        }
      }],
      '@angular-eslint/component-selector': ['error', {
        type: 'element',
        style: 'kebab-case'
      }],
      '@angular-eslint/directive-selector': ['error', {
        type: 'attribute',
        style: 'camelCase'
      }],
      '@angular-eslint/no-output-on-prefix': 'off',
      'prefer-arrow/prefer-arrow-functions': 'off',
      '@typescript-eslint/consistent-type-definitions': 'error',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/explicit-member-accessibility': ['off', {
        accessibility: 'explicit'
      }],
      'brace-style': ['error', '1tbs'],
      'id-blacklist': 'off',
      'id-match': 'off',
      'max-len': ['error', {
        ignorePattern: '^import',
        code: 180
      }],
      'no-duplicate-imports': 'error',
      'no-underscore-dangle': 'off',
      '@angular-eslint/no-host-metadata-property': 'off',
    }
  }, {
    files: ['*.html'],
    extends: ['plugin:@angular-eslint/template/recommended'],
    rules: {}
  }],
};
