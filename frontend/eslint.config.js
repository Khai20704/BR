import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import hooks from 'eslint-plugin-react-hooks'
import refresh from 'eslint-plugin-react-refresh'
import importX from 'eslint-plugin-import-x'
import prettier from 'eslint-config-prettier'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { resolve, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = fileURLToPath(new URL('./src', import.meta.url))
const boundaries = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      invalid: 'Import violates the documented architecture boundary.',
    },
  },
  create(context) {
    const from = relative(src, context.filename).replaceAll('\\', '/')
    return {
      'ImportDeclaration, ExportNamedDeclaration, ExportAllDeclaration'(node) {
        if (!node.source || typeof node.source.value !== 'string') return
        // Type-only DTO dependencies do not couple runtime layers.
        if (node.importKind === 'type' || node.exportKind === 'type') return
        const spec = node.source.value
        const internal = spec.startsWith('@/') || spec.startsWith('.')
        const target = internal
          ? relative(
              src,
              spec.startsWith('@/')
                ? resolve(src, spec.slice(2))
                : resolve(dirname(context.filename), spec),
            ).replaceAll('\\', '/')
          : spec
        const feature = from.match(/^features\/([^/]+)\//)?.[1]
        const otherFeature = target.match(/^features\/([^/]+)(?:\/|$)/)?.[1]
        const layer = from.match(/^features\/[^/]+\/([^/]+)\//)?.[1]
        let invalid = false
        if (/^(shared|core)\//.test(from) && /^(features|app)\//.test(target))
          invalid = true
        if (
          feature &&
          (target.startsWith('app/') ||
            (otherFeature && otherFeature !== feature))
        )
          invalid = true
        if (layer === 'domain')
          invalid ||= internal
            ? !target.startsWith('features/' + feature + '/domain/')
            : spec !== 'vitest'
        if (layer === 'application')
          invalid ||= internal
            ? !['domain', 'application'].some((l) =>
                target.startsWith('features/' + feature + '/' + l + '/'),
              )
            : spec !== 'vitest'
        if (layer === 'infrastructure')
          invalid ||=
            target.includes('/presentation/') ||
            target.includes('/application/')
        if (layer === 'presentation')
          invalid ||=
            /axios|gemini|firebase|@google\//.test(spec) ||
            target.startsWith('core/api/') ||
            target.includes('/infrastructure/') ||
            target === 'features/' + feature
        if (invalid) context.report({ node, messageId: 'invalid' })
      },
    }
  },
}

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: {
      'react-hooks': hooks,
      'react-refresh': refresh,
      'import-x': importX,
      architecture: { rules: { boundaries } },
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ project: './tsconfig.app.json' }),
      ],
    },
    rules: {
      ...hooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'import-x/no-cycle': 'error',
      'architecture/boundaries': 'error',
    },
  },
  { files: ['**/*.js', '**/*.mjs'], languageOptions: { globals: globals.node } },
  prettier,
)
