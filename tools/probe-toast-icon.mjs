/**
 * Send one toast through the plugin's EXACT command assembly and then read back
 * what Windows stored, which is the ground truth for the icon argument.
 *
 * The icon has exactly one silent failure mode. BurntToast's `New-BTImage`
 * declares `[string] $Source = $Script:DefaultImage`, and
 * `New-BurntToastNotification` calls it WITHOUT `-Source` whenever its own
 * `-AppLogo` argument is empty. The module's own picture is then baked into the
 * toast while `New-BurntToastNotification` still exits 0.
 *
 * So the recorded `<image src>` settles it: the plugin's own path means the
 * argument arrived, `...\BurntToast\1.1.0\Images\BurntToast.png` means it did not.
 *
 * Usage:
 *   node tools/probe-toast-icon.mjs      # send one toast
 *   python tools/dump-toast-db.py 6      # report recent toasts
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const pluginDir = join(process.env.USERPROFILE ?? '', '.dsh/profiles/web/node_modules/dsh-task-notify')
const source = join(pluginDir, 'deepseek.png')
if (!existsSync(source)) throw new Error('plugin asset missing: ' + source)

// Reproduce src/index.js resolveToastIcon() exactly.
const fingerprint = createHash('sha1').update(readFileSync(source)).digest('hex')
let dir = join(tmpdir(), 'dsh-task-notify-icons')
try { mkdirSync(dir, { recursive: true }) } catch { /* ignore */ }
try { dir = realpathSync.native(dir) } catch { /* keep the tmpdir form */ }
const icon = join(dir, 'deepseek-' + fingerprint.slice(0, 12) + '.png')
copyFileSync(source, icon)
const canonical = (() => { try { return realpathSync.native(icon) } catch { return icon } })()

console.log('icon source :', source)
console.log('fingerprint :', fingerprint.slice(0, 12))
console.log('icon path   :', canonical)
console.log('8.3 short   :', /~[0-9]/.test(canonical), '   query string:', canonical.includes('?'))
console.log('exists      :', existsSync(canonical), '  bytes:', statSync(canonical).size)

// The plugin's verbatim assembly (see toastScript() in src/index.js).
const texts = ['ICON PROBE 图标探针', '会话：图标诊断', '描述：确认 Windows 记录的图片路径']
const payload = Buffer.from(JSON.stringify(texts), 'utf8').toString('base64')
const script = [
  '$ErrorActionPreference = "Stop"',
  'try { Import-Module BurntToast -ErrorAction Stop } catch { exit 3 }',
  'try { Get-Command New-BurntToastNotification -ErrorAction Stop | Out-Null } catch { exit 3 }',
  `$t=[System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json`,
  `try { New-BurntToastNotification -Text $t -AppLogo '${canonical}' } catch { Write-Error $_; exit 4 }`,
  'exit 0',
].join('; ')

const r = spawnSync('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8' })
console.log('\ntoast exit  :', r.status)
if ((r.stdout ?? '').trim()) console.log('stdout      :', r.stdout.trim())
if ((r.stderr ?? '').trim()) console.log('stderr      :', r.stderr.trim())
console.log('\nRead back what Windows stored:  python tools/dump-toast-db.py 6')
