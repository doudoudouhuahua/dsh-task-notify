/**
 * Single-file client + ESM host build for dsh-task-notify (offline build).
 *
 * esbuild and the vendored schemastery/cosmokit copies are resolved from a
 * DeepSeek Harness checkout — by default the local one, overridable with the
 * DSH_HARNESS environment variable. @deepseek-ai/dsh-* stay external (the
 * app's module system provides them at runtime). Wire codecs are hand-rolled
 * strict schemas, so no other dependency enters either bundle.
 * Run:  node build.mjs
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const HARNESS = process.env.DSH_HARNESS ?? 'T:/deepseek-harness'

/**
 * pnpm keeps one directory per esbuild version; the harness bumps it freely,
 * so a hardcoded version would break this build. Enumerate them newest-first.
 */
function pnpmEsbuildEntries() {
  const store = `${HARNESS}/node_modules/.pnpm`
  if (!existsSync(store)) return []
  const versionOf = (entry) => entry.slice('esbuild@'.length).split('_')[0].split('.').map(Number)
  return readdirSync(store)
    .filter((entry) => entry.startsWith('esbuild@'))
    .sort((a, b) => {
      const left = versionOf(a)
      const right = versionOf(b)
      for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
        const diff = (right[index] ?? 0) - (left[index] ?? 0)
        if (diff !== 0) return diff
      }
      return 0
    })
    .map((entry) => `${store}/${entry}/node_modules/esbuild/lib/main.js`)
}

const esbuildCandidates = [
  `${HARNESS}/node_modules/esbuild/lib/main.js`,
  ...pnpmEsbuildEntries(),
]
const esbuildEntry = esbuildCandidates.find((p) => existsSync(p))
if (!esbuildEntry) {
  throw new Error(`esbuild not found under ${HARNESS}; point DSH_HARNESS at your DeepSeek Harness checkout`)
}
const { build } = await import(pathToFileURL(esbuildEntry).href)

const schemastery = `${HARNESS}/vendor/schemastery/lib/index.mjs`
const cosmokit = `${HARNESS}/vendor/cosmokit/lib/index.js`
if (!existsSync(schemastery) || !existsSync(cosmokit)) {
  throw new Error(`vendored schemastery/cosmokit not found under ${HARNESS}; point DSH_HARNESS at your DeepSeek Harness checkout`)
}

mkdirSync('lib', { recursive: true })

const dshExternal = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-*']

await build({
  entryPoints: ['src/index.js'],
  outfile: 'lib/index.js',
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: false,
  external: dshExternal,
  alias: {
    '@deepseek-ai/schemastery': schemastery,
    '@deepseek-ai/cosmokit': cosmokit,
  },
  logLevel: 'info',
})

await build({
  entryPoints: ['src/client/index.js'],
  outfile: 'lib/client.js',
  bundle: true,
  minify: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: false,
  external: [...dshExternal, 'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'scheduler'],
  banner: {
    js: "window.__ModuleLoader__.load({ id: 'dsh-task-notify', factory: (require) => { var module = { exports: {} }; var exports = module.exports;",
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})
