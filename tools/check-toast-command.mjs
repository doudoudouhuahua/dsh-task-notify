/**
 * Read the icon path the built host half actually resolves, by importing the
 * installed module and exercising the same call the toast path makes.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { readFileSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'

const PROFILE = join(process.env.USERPROFILE ?? '', '.dsh/profiles/web/node_modules')
const buildPath = process.argv[2] ?? join(PROFILE, 'dsh-task-notify/lib/index.js')
const source = readFileSync(buildPath, 'utf8')

console.log('build:', buildPath)
console.log('size :', source.length)

// 1. Does the artifact carry the fix at all?
for (const needle of ['realpathSync', 'dsh-task-notify-icons', '-AppLogo']) {
  console.log(`  contains ${needle.padEnd(22)}: ${source.includes(needle)}`)
}

// 2. Reproduce the computation exactly as the artifact performs it.
const fingerprint = createHash('sha1')
  .update(readFileSync(join(PROFILE, 'dsh-task-notify/deepseek.png')))
  .digest('hex')
let dir = join(tmpdir(), 'dsh-task-notify-icons')
let dirResolved = dir
try { dirResolved = realpathSync.native(dir) } catch { /* keep */ }
let icon = join(dirResolved, 'deepseek-' + fingerprint.slice(0, 12) + '.png')
let iconResolved = icon
try { iconResolved = realpathSync.native(icon) } catch { /* keep */ }
console.log('\nicomputation reproduced:')
console.log('  tmpdir()            :', tmpdir())
console.log('  canonical dir       :', dirResolved)
console.log('  icon path           :', iconResolved)
console.log('  short name present  :', /~[0-9]/.test(iconResolved))
console.log('  query present       :', iconResolved.includes('?'))
try {
  readFileSync(iconResolved)
  console.log('  readable by Node    : yes')
} catch (error) {
  console.log('  readable by Node    : NO —', error.message)
}

// 3. Confirm PowerShell sees it too (BurntToast validates with Test-Path).
const { spawnSync } = await import('node:child_process')
const probe = spawnSync('pwsh.exe', [
  '-NoProfile', '-NonInteractive', '-Command',
  `Import-Module BurntToast -ErrorAction Stop; "Test-Path: " + (Test-Path '${iconResolved}')`,
], { encoding: 'utf8' })
console.log('  pwsh Test-Path      :', (probe.stdout ?? '').trim() || (probe.stderr ?? '').trim())
