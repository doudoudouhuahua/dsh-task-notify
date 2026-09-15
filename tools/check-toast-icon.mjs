/**
 * Verify that the icon the plugin INTENDS to show is the icon Windows RECORDS.
 *
 * This closes the one hole `verify-contract.mjs` cannot see. BurntToast's
 * `New-BTImage` declares `[string] $Source = $Script:DefaultImage`, and
 * `New-BurntToastNotification` calls it WITHOUT `-Source` whenever its own
 * `-AppLogo` argument is empty. The module's own picture is then baked into the
 * toast while the command still exits 0 — so the plugin, its logs, and the panel
 * all report success while the logo is silently replaced.
 *
 * That happens for two reasons, and both are covered here:
 *   1. the icon path is unusable (8.3 short name, `?query`, missing file); or
 *   2. the icon variant never ran, because a logo-less variant was tried first
 *      and succeeded (that regression shipped once: `plain` led `TOAST_VARIANTS`).
 *
 * The recorded `<image src>` is the only trustworthy evidence. This check reads
 * it back from the Windows notification database, so it validates the real
 * end-to-end path instead of assuming the argument arrived.
 *
 * Usage:
 *   node tools/check-toast-icon.mjs
 *
 * Exit code 0 means the newest toast carried the plugin's own icon.
 */
import { DatabaseSync } from 'node:sqlite'
import { copyFileSync, existsSync, mkdtempSync, rmSync, readFileSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const FALLBACK_MARKER = 'BurntToast\\1.1.0\\Images\\BurntToast.png'
const PLUGIN_DIR = join(process.env.USERPROFILE ?? '', '.dsh/profiles/web/node_modules/dsh-task-notify')

/**
 * A malformed icon renders as a blank logo just as silently as a rejected path,
 * so the source file's own shape is checked too: a PNG header plus the IHDR
 * fields Windows needs. Palette images (colour type 3) with tRNS are valid and
 * are what `deepseek.png` is.
 */
function inspectPng(path) {
  const buf = readFileSync(path)
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const problems = []
  if (buf.length < 8 || !buf.subarray(0, 8).equals(signature)) {
    return { problems: ['not a PNG (bad signature)'], width: null, height: null, colorType: null }
  }
  let offset = 8
  let width = null
  let height = null
  let colorType = null
  let bitDepth = null
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    const data = buf.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    }
    if (type === 'IEND') break
    offset += 12 + length
  }
  if (width === null) problems.push('no IHDR chunk')
  else {
    if (width < 48 || height < 48) problems.push(`too small for a toast logo (${width}x${height})`)
    if (bitDepth !== 8) problems.push(`unexpected bit depth ${bitDepth}`)
    if (![2, 3, 4, 6].includes(colorType)) problems.push(`unsupported colour type ${colorType}`)
  }
  return { problems, width, height, colorType, bitDepth, bytes: buf.length }
}

/** The path `src/index.js` resolveToastIcon() hands to `-AppLogo`. */
function expectedIconPath() {
  const source = join(PLUGIN_DIR, 'deepseek.png')
  if (!existsSync(source)) return { source, path: null, reason: 'deepseek.png not found' }
  const fingerprint = createHash('sha1').update(readFileSync(source)).digest('hex')
  const dir = join(tmpdir(), 'dsh-task-notify-icons')
  const candidate = join(dir, 'deepseek-' + fingerprint.slice(0, 12) + '.png')
  const path = (() => { try { return realpathSync.native(candidate) } catch { return candidate } })()
  return { source, path, fingerprint: fingerprint.slice(0, 12) }
}

/**
 * Read the notification database, including the `-wal` sidecar: recent
 * notifications live there until a checkpoint folds them into the main file, so
 * copying only `wpndatabase.db` reports a stale history.
 */
function recentToasts(limit) {
  const base = join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'Windows', 'Notifications', 'wpndatabase.db')
  if (!existsSync(base)) return { toasts: [], error: 'notification database not found' }
  const tmp = mkdtempSync(join(tmpdir(), 'dtn-toastdb-'))
  const db = join(tmp, 'wpndatabase.db')
  for (const suffix of ['', '-wal', '-shm']) {
    try { copyFileSync(base + suffix, db + suffix) } catch { /* sidecar may not exist */ }
  }
  let con
  try {
    con = new DatabaseSync(db, { readOnly: true })
    // ArrivalTime is a Windows FILETIME (100 ns ticks); it exceeds the safe
    // integer range, so node:sqlite must hand it over as text.
    const rows = con.prepare(`
      SELECT CAST(n.ArrivalTime AS TEXT) AS at, n.Payload AS payload
      FROM Notification n
      WHERE n.Payload IS NOT NULL
      ORDER BY n.ArrivalTime DESC
      LIMIT ?
    `).all(limit)
    return {
      toasts: rows.map((row) => {
        // node:sqlite hands a BLOB back as a Uint8Array, not a Buffer.
        const payload = row.payload instanceof Uint8Array
          ? Buffer.from(row.payload).toString('utf8')
          : String(row.payload ?? '')
        const texts = [...payload.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].trim())
        const images = [...payload.matchAll(/<image[^>]*src="([^"]*)"/g)].map((m) => m[1])
        return { at: String(row.at), texts, images }
      }),
    }
  } finally {
    try { con?.close() } catch { /* already closed */ }
    // Best effort: SQLite may still hold a handle briefly, and a leftover temp
    // directory must never fail the check.
    try { rmSync(tmp, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

/** Windows FILETIME (UTC, 100 ns ticks) to a local timestamp. */
function localTime(filetime) {
  const ms = Number(BigInt(filetime) / 10_000n) - 11_644_473_600_000
  return new Date(ms).toLocaleString('sv-SE').replace('T', ' ')
}

const expected = expectedIconPath()
console.log('plugin icon source :', expected.source)
console.log('expected -AppLogo  :', expected.path ?? `(unavailable: ${expected.reason})`)

const problems = []
if (expected.path !== null) {
  if (/~[0-9]/.test(expected.path)) problems.push('icon path carries an 8.3 short name (Windows rejects it)')
  if (expected.path.includes('?')) problems.push('icon path carries a query string (Windows rejects it)')
  if (!existsSync(expected.path)) problems.push(`icon path does not exist: ${expected.path}`)
} else if (expected.reason) {
  problems.push(`icon source unusable: ${expected.reason}`)
}

if (existsSync(expected.source)) {
  const png = inspectPng(expected.source)
  console.log(
    'icon file          :',
    png.width === null
      ? '(unreadable)'
      : `${png.width}x${png.height} colourType=${png.colorType} bitDepth=${png.bitDepth} ${png.bytes} bytes`,
  )
  problems.push(...png.problems)
}

const { toasts, error } = recentToasts(15)
if (error) {
  console.log(`\n${error}`)
  process.exit(1)
}

const pluginToasts = toasts.filter((t) => t.images.length > 0 || t.texts.length > 0)
if (pluginToasts.length === 0) {
  console.log('\nno toast records found — send one first: node tools/probe-toast-icon.mjs')
  process.exit(1)
}

console.log('\nnewest recorded toasts:')
for (const t of pluginToasts.slice(0, 5)) {
  const image = t.images[0] ?? '(none)'
  const fellBack = t.images.some((i) => i.includes(FALLBACK_MARKER))
  console.log(`  ${localTime(t.at)}  ${fellBack ? 'FALLBACK' : 'ok      '}  ${image || '(empty src)'}`)
  console.log(`      ${t.texts[0] ?? ''}`)
}

const newest = pluginToasts[0]
const newestFellBack = newest.images.some((i) => i.includes(FALLBACK_MARKER))
const newestHasOwnIcon = expected.path !== null && newest.images.includes(expected.path)
if (newestFellBack) {
  problems.push('the NEWEST toast carries BurntToast\'s own picture, not the plugin icon')
} else if (!newestHasOwnIcon) {
  problems.push(`the NEWEST toast carries an unexpected image: ${newest.images[0] ?? '(none)'}`)
}

const fallbackCount = pluginToasts.filter((t) => t.images.some((i) => i.includes(FALLBACK_MARKER))).length
console.log(`\n${fallbackCount} of ${pluginToasts.length} recorded toasts fell back to BurntToast's own picture.`)

if (problems.length > 0) {
  console.log('\nFAIL')
  for (const p of problems) console.log('  - ' + p)
  console.log(`
Likely causes, in order:
  1. a logo-less variant is tried before the icon variant in TOAST_VARIANTS
     (showWindowsToast returns on the FIRST exit 0, so the leading variant wins);
  2. the plugin install is stale — re-copy lib\\index.js into the profile;
  3. the icon copy never happened (resolveToastIcon() returned null).`)
  process.exit(1)
}

console.log('\nPASS  the newest toast carries the plugin\'s own icon')
