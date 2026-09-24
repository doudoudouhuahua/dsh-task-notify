/**
 * dsh-task-notify host plugin.
 *
 * Listens for Agent/subagent/workflow completion, queues one small owned JSON
 * item per completion, pushes to PushPlus when enabled, and exposes the
 * `taskNotify` Typert Remote (settings read/write, queue poll, push test).
 * Settings ARE this entry's own Config: the volatile schema below is projected
 * by DSH's settings forms, the resolved values ride in `apply`'s `config`
 * argument, and a write goes back through `ctx.settings.update(ENTRY_ID, patch)`
 * into the profile patch layer — so the configuration survives process
 * restarts. DSH 0.1.7 removed the older `ctx.settings.register(ns, schema)`
 * namespace scope (and with it the durable `task-notify` section) in favour of
 * exactly this model. The client half ships in the same
 * package (`./client`); the web server serves it under
 * /plugins/dsh-task-notify/client.js.
 *
 * Two payloads are localized here, because the HOST is what renders them:
 * the Windows toast and the PushPlus body. The language is the DSH locale
 * preference (`ctx.get('locale')` — the client half of the locale plugin owns
 * that state), read per notification; Chinese is the fallback whenever the
 * service or its state is unavailable.
 *
 * The toast channel also installs its own dependency: when `pwsh` cannot
 * import BurntToast, the plugin installs the module (CurrentUser scope, no
 * admin) and retries that one notification.
 */
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import z from '@deepseek-ai/schemastery'
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readdirSync, readFileSync, realpathSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { INVOCATIONS, TYPERT_MANIFEST } from './contract.js'
import { DEFAULT_LANG, bodyLines, kindTitle, normalizeLang, statusLabel, t } from './i18n.js'

/** Cordis plugin name (the Loader entry and client bundle id). */
export const name = 'dsh-task-notify'

/** Services required before load: the Typert registry and the settings provider. */
export const inject = ['typert', 'settings']

/**
 * The Loader entry id this plugin's Config is addressed by — the id the
 * bundle's `cordis.patch.yml` inserts and the profile patch overrides. Under
 * DSH 0.1.7+ it is the settings key: `ctx.settings.describe()` reports one form
 * per entry id, and `ctx.settings.update(ENTRY_ID, patch)` merges into that
 * entry's user layer.
 *
 * The language preference deliberately does NOT live here: DSH's locale
 * service already owns one durable preference (`locale.preference`), and the
 * panel slider and 「设置 → 通用 → 语言」 are the same switch.
 */
const ENTRY_ID = 'dsh-task-notify'

/**
 * Absolute path of the DeepSeek app logo (deepseek.png at the package root),
 * resolved from this bundled module (…/lib/index.js → package root). The file
 * itself is re-read per toast (hot update): replacing it takes effect on the
 * NEXT notification, with no rebuild or plugin restart.
 */
const ICON_SOURCE = fileURLToPath(new URL('../deepseek.png', import.meta.url))

/**
 * Toast-icon hot-update cache. Windows toast images are cached by URI, so a
 * replaced deepseek.png at the same path would keep showing the OLD logo.
 * Every toast therefore fingerprints the source file and, when it changed,
 * copies it to a content-addressed temp file — a fresh URI per icon version
 * forces the OS to render the new image. Fallbacks: the last known temp copy
 * when the source is momentarily unreadable, no AppLogo at all when no copy
 * exists yet.
 *
 * The directory is the CANONICAL path, not `tmpdir()`'s raw value: a Windows
 * TEMP inherited as an 8.3 short name (`C:\Users\V5611~1.REA\...`) is what the
 * toast's `AppLogo` would otherwise carry, and the toast system answers an
 * image source it cannot resolve by silently falling back to the module's own
 * default picture (the BurntToast toast photo) instead of the app logo.
 */
const ICON_TMP_DIR = resolveCanonical(join(tmpdir(), 'dsh-task-notify-icons'))
let iconCache = { fingerprint: null, path: null }

/**
 * Expand 8.3 short names and relative segments into the one absolute form the
 * toast renderer resolves reliably. Best effort: a path that cannot be
 * canonicalized (not yet created, unusual filesystem) is used as-is.
 * @param path - candidate path, possibly carrying `~1` segments.
 * @returns the canonical absolute path when resolvable, else the input.
 */
function resolveCanonical(path) {
  try {
    return realpathSync.native(path)
  } catch {
    return path
  }
}

const iconFingerprint = () => {
  try {
    return createHash('sha1').update(readFileSync(ICON_SOURCE)).digest('hex')
  } catch {
    return null
  }
}

const resolveToastIcon = () => {
  const fingerprint = iconFingerprint()
  if (fingerprint === null) return iconCache.path
  if (iconCache.fingerprint === fingerprint && iconCache.path !== null) return iconCache.path
  let path = null
  try {
    mkdirSync(ICON_TMP_DIR, { recursive: true })
    path = join(ICON_TMP_DIR, 'deepseek-' + fingerprint.slice(0, 12) + '.png')
    copyFileSync(ICON_SOURCE, path)
    // Re-resolve after the copy: the directory now certainly exists, so a
    // short-named TEMP still yields a long path for the toast to consume.
    path = resolveCanonical(path)
    // Drop temp copies of earlier icon versions.
    for (const entry of readdirSync(ICON_TMP_DIR)) {
      if (entry === basename(path)) continue
      if (!entry.startsWith('deepseek-') || !entry.endsWith('.png')) continue
      try { unlinkSync(join(ICON_TMP_DIR, entry)) } catch { /* 忽略 */ }
    }
  } catch (error) {
    console.error('[dsh-task-notify] icon copy failed:', error)
    return iconCache.path
  }
  iconCache = { fingerprint, path }
  return path
}

/**
 * The plugin's Cordis Config — the Loader reads this export, and DSH's settings
 * forms project it into 设置 → 插件 → dsh-task-notify. Every field is
 * `.volatile()`: an edit updates the live reference in place WITHOUT remounting
 * the plugin, which is what keeps the Remote registration, the pending queue,
 * and the language snapshot alive across a settings write. DSH requires a
 * volatile field to sit at a fixed object path with no volatile ancestor, so a
 * flat top-level object is the only shape that works.
 *
 * Defaults: push off, main-turn off, attention kinds on.
 */
export const Config = z.object({
  enabled: z.boolean().default(true).volatile(),
  push: z.boolean().default(false).volatile(),
  token: z.string().default('').volatile(),
  agent: z.boolean().default(false).volatile(),
  subagent: z.boolean().default(true).volatile(),
  workflow: z.boolean().default(true).volatile(),
  approval: z.boolean().default(true).volatile(),
  question: z.boolean().default(true).volatile(),
  plan: z.boolean().default(true).volatile(),
  goal: z.boolean().default(true).volatile(),
})

/**
 * Read one resolved Config field. `config` carries a live volatile reference
 * per field rather than a plain value, so a missing or foreign handle must
 * degrade to the schema default instead of throwing mid-notification — the
 * same fail-soft contract `syncLang` and `sessionLog` follow.
 * @param handle - the field's volatile reference, when the runtime supplied one.
 * @param fallback - that field's schema default.
 * @returns the current value, or the default when no live value is available.
 */
const readField = (handle, fallback) => {
  try {
    const value = handle?.get()
    return value === undefined || value === null ? fallback : value
  } catch {
    return fallback
  }
}

/**
 * Language the HOST is currently rendering in. Chinese until proven otherwise:
 * a headless composition has no locale service at all, and that must degrade
 * to the shipped default rather than to an empty label.
 */
let lang = DEFAULT_LANG

/**
 * Adopt the locale service's active language, if this composition has one.
 * `@deepseek-ai/dsh-client-locale` provides `locale` on the CLIENT face only,
 * so the host resolves it lazily and tolerates both an absent service and an
 * absent snapshot.
 * @param ctx - host cordis context.
 * @returns the language now in force.
 */
const syncLang = (ctx) => {
  try {
    const active = ctx.get('locale')?.getLocale?.()?.active
    lang = typeof active === 'string' && active !== '' ? normalizeLang(active) : DEFAULT_LANG
  } catch {
    // A foreign or partially mounted locale service must never mute the toast.
    lang = DEFAULT_LANG
  }
  return lang
}

/* ── the desktop channel: pwsh + BurntToast ─────────────────────────────────── */

/**
 * BurntToast dependency state, resolved at most once per process:
 * `ready` means `Import-Module BurntToast` + `New-BurntToastNotification`
 * resolved inside `pwsh`; `unavailable` carries the reason to report.
 */
const burntToast = { state: 'unknown', detail: '' }

/**
 * One `pwsh -Command` run with a hard timeout. `stdio: 'ignore'` keeps the
 * child from inheriting a console window, the stderr pipe is drained (and
 * capped) purely so a failure can be reported, and the timer bounds a child
 * that never exits (a hung gallery request). The plugin fires a handful of
 * toasts per turn, so the leaked timer of a genuinely hung child is not worth
 * a process-wide registry.
 * @param script - the command text to run.
 * @param timeoutMs - kill the child after this long.
 * @returns `{ code, stderr, timedOut }`; `code` is null when the child was
 *   killed or could not be spawned at all.
 */
const runPwsh = (script, timeoutMs) => new Promise((resolve) => {
  let child
  try {
    child = spawn('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
  } catch (error) {
    resolve({ code: null, stderr: String(error?.message ?? error), timedOut: false })
    return
  }
  let stderr = ''
  let settled = false
  const finish = (result) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    resolve(result)
  }
  const timer = setTimeout(() => {
    // Best effort: a killed child settles through the exit handler, but the
    // caller must not wait on that.
    try { child.kill() } catch { /* 忽略 */ }
    finish({ code: null, stderr: stderr.trim(), timedOut: true })
  }, timeoutMs)
  child.stderr?.on('data', (chunk) => {
    if (stderr.length < 4000) stderr += String(chunk)
  })
  child.on('error', (error) => {
    finish({ code: null, stderr: String(error?.message ?? error), timedOut: false })
  })
  child.on('exit', (code) => {
    finish({ code, stderr: stderr.trim(), timedOut: false })
  })
})

/** Exit-code protocol: `exit 3` means "BurntToast could not be imported". */
const EXIT_NO_MODULE = 3

/**
 * Modifier combinations the toast script is emitted under, in attempt order.
 *
 * The logo-carrying variants come FIRST, and that ordering is load-bearing:
 * `showWindowsToast` returns on the first exit code 0, so whichever variant
 * leads wins every toast. A leading `plain` variant has nothing to fail on, so
 * it would succeed unconditionally and the logo would never be passed — every
 * toast would then silently carry BurntToast's own default picture, because its
 * `New-BTImage` falls back to `$Script:DefaultImage` when `-AppLogo` is absent.
 *
 * `resolveToastIcon()` returning null (no icon source, no cached copy) already
 * disables `-AppLogo` for every variant, so the logo-less variants stay purely
 * as a retry path for a module that rejects the argument.
 */
const TOAST_VARIANTS = [
  { name: 'icon', alog: true, pin: false },
  { name: 'plain', alog: false, pin: false },
  { name: 'icon-pinned', alog: true, pin: true },
  { name: 'plain-pinned', alog: false, pin: true },
]

/**
 * The toast script: import BurntToast or report it missing (exit 3), build the
 * toast or (exit 4) report that, and retry the pinned 1.1.0 signature when the
 * local install does not carry the expected parameters.
 * @param textsB64 - base64(UTF-8 JSON) of the `-Text` array, so no toast
 *   content is ever interpolated into the command text.
 * @param icon - absolute AppLogo path, or null to omit the logo.
 * @param alog - whether this variant passes `-AppLogo`.
 * @param pin - whether this variant pins the BurntToast version.
 * @returns the `-Command` text.
 */
const toastScript = (textsB64, icon, alog, pin) => {
  // `-AppLogo` takes a path BurntToast VALIDATES with Test-Path before it
  // builds the toast, and a path it cannot resolve makes it fall back to its
  // own default picture (the BurntToast toast photo) with only a warning.
  // So the value must stay a plain, canonical path: no query string and no
  // 8.3 short names. Versioning rides the content-addressed FILENAME instead.
  const args = 'New-BurntToastNotification -Text $t' + (alog && icon !== null ? ` -AppLogo '${icon}'` : '')
  const open = pin ? "Import-Module BurntToast -RequiredVersion 1.1.0 -ErrorAction Stop" : 'Import-Module BurntToast -ErrorAction Stop'
  return [
    '$ErrorActionPreference = "Stop"',
    `try { ${open} } catch { exit ${EXIT_NO_MODULE} }`,
    'try { Get-Command New-BurntToastNotification -ErrorAction Stop | Out-Null }'
      + ` catch { exit ${EXIT_NO_MODULE} }`,
    `$t=[System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${textsB64}')) | ConvertFrom-Json`,
    `try { ${args} } catch { Write-Error $_; exit 4 }`,
    'exit 0',
  ].join('; ')
}

/**
 * Install the BurntToast module into the CURRENT USER module path and verify
 * it is importable in the same box. `$ErrorActionPreference='Stop'` plus
 * `-Force` keep PowerShell Gallery's "untrusted repository / are you sure"
 * prompts from blocking a windowless host forever. The pinned 1.1.0 fallback
 * covers a gallery state where the latest release is absent or unusable.
 * @returns the install script text.
 */
const installScript = () => [
  '$ErrorActionPreference = "Stop"',
  '$ProgressPreference = "SilentlyContinue"',
  'try { Import-Module BurntToast -ErrorAction Stop; exit 0 } catch { }',
  'try { Install-Module BurntToast -Scope CurrentUser -Force -AllowClobber -ErrorAction Stop }',
  ' catch {',
  '  try { Install-Module BurntToast -Scope CurrentUser -Force -AllowClobber -RequiredVersion 1.1.0 -ErrorAction Stop }',
  "  catch { Write-Error ('install failed: ' + $_.Exception.Message); exit 2 }",
  ' }',
  'try { Import-Module BurntToast -ErrorAction Stop; Get-Command New-BurntToastNotification -ErrorAction Stop | Out-Null; exit 0 }',
  " catch { Write-Error ('installed but unusable: ' + $_.Exception.Message); exit 4 }",
].join('; ')

/**
 * Whether `pwsh` can import BurntToast and resolve its cmdlet. Probed once per
 * process, on the first toast and in the background right after `apply()`.
 * @returns true when the module is usable.
 */
const probeBurntToast = async () => {
  if (burntToast.state === 'ready') return true
  const probe = await runPwsh(
    `$ErrorActionPreference = "Stop"; `
    + `try { Import-Module BurntToast -ErrorAction Stop } catch { exit ${EXIT_NO_MODULE} }; `
    + `try { Get-Command New-BurntToastNotification -ErrorAction Stop | Out-Null } catch { exit ${EXIT_NO_MODULE} }; `
    + 'exit 0',
    30000,
  )
  if (probe.code === EXIT_NO_MODULE) {
    burntToast.state = 'unavailable'
    burntToast.detail = probe.stderr
    return false
  }
  // Any other exit means "not importable" too (EACCES, a broken profile, a
  // killed process); the reason is kept for the error text.
  burntToast.state = probe.code === 0 ? 'ready' : 'unavailable'
  burntToast.detail = probe.stderr
  return burntToast.state === 'ready'
}

/** Pending background probe, so the first toast can wait instead of failing. */
let burntToastProbe = null

/**
 * Make BurntToast usable, installing it when `pwsh` reports it missing. Runs
 * at most ONE install per process: a failed install is cached, so a broken
 * machine does not re-run a network install on every notification.
 * @returns `{ ok, reason }` — `reason` is the detail to report on failure.
 */
const ensureBurntToast = async () => {
  if (await probeBurntToast()) {
    return { ok: true, reason: '' }
  }
  // A repeated call while the first install attempt is still running joins it.
  if (burntToast.installing === undefined) {
    burntToast.installing = (async () => {
      console.error('[dsh-task-notify] BurntToast missing — installing it for the current user')
      const probe = await runPwsh(installScript(), 240000)
      if (probe.timedOut) {
        console.error('[dsh-task-notify] BurntToast install timed out')
        return false
      }
      const ok = probe.code === 0 && await probeBurntToast()
      console.error(ok
        ? '[dsh-task-notify] BurntToast installed'
        : `[dsh-task-notify] BurntToast install failed (exit ${String(probe.code)}): ${probe.stderr}`)
      return ok
    })()
  }
  const ok = await burntToast.installing
  if (ok) return { ok: true, reason: '' }
  return {
    ok: false,
    // The probe detail is the real pwsh message; without one (a timeout, or a
    // probe that never ran) the generic text is still actionable.
    reason: burntToast.detail !== ''
      ? burntToast.detail
      : t(lang, 'host.toast.installTimeout'),
  }
}

/** Kick the dependency check off without blocking plugin activation. */
const warmBurntToast = () => {
  if (burntToastProbe !== null || burntToast.state !== 'unknown') return
  burntToastProbe = ensureBurntToast().catch(() => ({ ok: false, reason: '' }))
}

/**
 * Show a REAL Windows toast notification through the BurntToast PowerShell
 * module (New-BurntToastNotification), run by pwsh (PowerShell 7 — the
 * BurntToast module lives in the pwsh module path, Windows PowerShell 5.1
 * does not see it). The toast carries the DeepSeek app logo (deepseek.png,
 * re-resolved per toast so replaced icons apply immediately) and the OS plays
 * its default notification sound. A missing BurntToast module is installed on
 * the spot and the toast is retried once. Never throws.
 * @param title - localized bold title line.
 * @param lines - localized body lines (folded to BurntToast's 3-entry limit).
 * @returns `{ ok, error? }`.
 */
const showWindowsToast = async (title, lines) => {
  // BurntToast's -Text accepts at most 3 entries: bold title + 2 body lines;
  // fold any extra body lines into the last entry, separated by a newline.
  const texts = [title, ...lines]
  while (texts.length > 3) {
    const last = texts.pop()
    texts[texts.length - 1] += '\n' + last
  }
  const payload = Buffer.from(JSON.stringify(texts), 'utf8').toString('base64')
  // Fresh icon URI per content version (see resolveToastIcon), so a replaced
  // deepseek.png shows up on the next toast instead of a cached old image.
  const icon = resolveToastIcon()
  // Join the startup probe instead of racing it: on a machine where the
  // module is being installed right now, waiting beats dropping the toast.
  if (burntToastProbe !== null) await burntToastProbe

  let last = { ok: true }
  for (const variant of TOAST_VARIANTS) {
    const script = toastScript(payload, icon, variant.alog, variant.pin)
    const probe = await runPwsh(script, 30000)
    if (probe.code === 0) return { ok: true }
    last = probe.code === null
      ? {
        ok: false,
        error: probe.timedOut
          ? t(lang, 'host.toast.timeout')
          : t(lang, 'host.toast.pwshMissing'),
      }
      : {
        ok: false,
        error: probe.stderr !== ''
          ? probe.stderr
          : t(lang, 'host.toast.exitCode', { code: String(probe.code) }),
      }
    if (probe.code !== EXIT_NO_MODULE) return last
    // Missing module: install once, then fall through to the pinned variants.
    const installed = await ensureBurntToast()
    if (!installed.ok) {
      return {
        ok: false,
        error: t(lang, 'host.toast.moduleMissing', { reason: installed.reason }),
      }
    }
  }
  return last
}

/** Fire one PushPlus POST; resolves the API outcome, never throws. */
async function pushToPushPlus(token, title, content, language) {
  let response
  try {
    response = await fetch('https://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({ token, title, content, template: 'txt' }).toString(),
      signal: AbortSignal.timeout(15000),
    })
  } catch (error) {
    console.error('[dsh-task-notify] pushplus request failed:', error)
    return { ok: false, error: t(language, 'host.push.networkFailed') }
  }
  const text = await response.text()
  if (text.includes('code":200') || text.includes('code": 200')) return { ok: true }
  console.error('[dsh-task-notify] pushplus rejected:', text.slice(0, 200))
  return { ok: false, error: t(language, 'host.push.rejected') }
}

/**
 * The `taskNotify` Remote service: settings access, the pending queue, and
 * the PushPlus test button. Registered under the `taskNotify` service key.
 */
class TaskNotifyRuntime extends TypertRemoteService {
  /**
   * @param ctx - host cordis context.
   * @param read - reads this entry's currently resolved Config.
   * @param write - merges a patch into this entry's user layer.
   */
  constructor(ctx, read, write) {
    super(ctx, 'taskNotify')
    this.read = read
    this.write = write
    this.queue = []
  }

  getSettings() {
    return this.read()
  }

  async updateSettings(update) {
    await this.write(update ?? {})
    return this.read()
  }

  next() {
    if (this.queue.length === 0) return []
    // Drain only what is returned; a deeper backlog stays queued instead of
    // being discarded (the queue is capped at 20 on the producer side).
    const items = this.queue.slice(0, 10)
    this.queue = this.queue.slice(items.length)
    return items
  }

  async testPush() {
    const s = this.read()
    if (!s.push || s.token === '') return { ok: false, error: t(lang, 'host.test.pushDisabled') }
    return await pushToPushPlus(s.token, kindTitle('done', lang), bodyLines({
      title: t(lang, 'host.test.session'),
      status: t(lang, 'host.test.message'),
      at: Date.now(),
    }, lang).join('\n'), lang)
  }

  /**
   * One real toast. The panel passes its CURRENT language so the test reflects
   * the slider immediately instead of waiting for the next settings sync; a
   * call without it falls back to the host's own resolution.
   * @param language - optional `'zh'` | `'en'`.
   */
  async testNotify(language) {
    const use = language === undefined || language === null ? lang : normalizeLang(language)
    return await showWindowsToast(kindTitle('done', use), bodyLines({
      title: t(use, 'host.test.session'),
      status: t(use, 'host.test.notifyOk'),
      at: Date.now(),
    }, use))
  }
}

/**
 * Mount the completion listeners and the Remote service.
 * @param ctx - host cordis context.
 * @param config - this entry's resolved Config, one volatile reference per field.
 */
export function apply(ctx, config) {
  /**
   * The entry's live Config, rebuilt per read: a volatile write lands in the
   * reference `config` holds, so a cached copy would go stale immediately.
   */
  const readSettings = () => ({
    enabled: readField(config?.enabled, true),
    push: readField(config?.push, false),
    token: readField(config?.token, ''),
    agent: readField(config?.agent, false),
    subagent: readField(config?.subagent, true),
    workflow: readField(config?.workflow, true),
    approval: readField(config?.approval, true),
    question: readField(config?.question, true),
    plan: readField(config?.plan, true),
    goal: readField(config?.goal, true),
  })
  // The profile patch owns this entry's user layer. Because every Config field
  // is volatile, DSH applies the merge in place: the Remote stays registered and
  // the queue survives the write.
  const writeSettings = (patch) => ctx.settings.update(ENTRY_ID, patch ?? {})
  const runtime = new TaskNotifyRuntime(ctx, readSettings, writeSettings)
  syncLang(ctx)
  // Keep the module-level language current for the callers that fire OUTSIDE
  // an event handler (the two test channels): those must reflect a switch made
  // while the plugin sat idle. The per-event paths read it themselves anyway.
  ctx.on('locale/change', () => { syncLang(ctx) })
  // Dependency warm-up: the module check (and, when missing, the install)
  // runs in the background so the first real notification is not the first
  // time the channel is exercised. Never blocks activation, never throws.
  warmBurntToast()

  // Resolved lazily: a service that is not yet provided at apply time must not
  // be frozen into `undefined` for the whole process lifetime.
  const sessions = () => ctx.get('sessions')

  /**
   * Immutable snapshot of one session's event log. DSH 0.1.3-alpha.1
   * (2026-08-30 refactor) removed `session.events` in favour of the public
   * `session.snapshotEvents()` reader, so reading the old property yielded
   * `undefined` and every fold below silently degraded. Total by design: an
   * absent or foreign session object reads as an empty log.
   */
  const sessionLog = (session) => {
    if (session === undefined || session === null) return []
    try {
      const events = session.snapshotEvents()
      return Array.isArray(events) ? events : []
    } catch {
      return []
    }
  }

  const titleOf = (session) => {
    if (session === undefined || session === null) return undefined
    try {
      const snap = ctx.get('sessionTitle')?.get(session)
      return typeof snap?.title === 'string' && snap.title !== '' ? snap.title : undefined
    } catch {
      return undefined
    }
  }

  // Walk a session lineage up to the root conversation (parentSession chain),
  // so 会话 always names the CURRENT conversation, not the child task's own.
  const rootOf = (session) => {
    if (session === undefined || session === null) return undefined
    let current = session
    const seenIds = new Set()
    while (current !== undefined && current !== null) {
      const id = String(current.id)
      if (seenIds.has(id)) break
      seenIds.add(id)
      const parentId = current.header === null || current.header === undefined
        ? undefined
        : current.header.parentSession
      if (parentId === undefined || parentId === null || parentId === '') break
      const parent = sessions()?.get(parentId)
      if (parent === undefined || parent === null) break
      current = parent
    }
    return current
  }
  // The most recently observed root session — the workflow fallback when the
  // event carries no session lineage (workflow/end has none).
  let currentRoot = undefined

  /**
   * The session's effective approval policy: its own `approval/policy` fold
   * (per-session override, e.g. a permission-preset switch), else the
   * deployment default from the ApprovalService config. The seam is optional
   * (`ctx.get('approval')`); without it no ask can ever be raised, so the
   * fallback value only decides whether a hypothetical ask would notify.
   */
  const effectiveApprovalPolicy = (session) => {
    try {
      const approval = ctx.get('approval')
      if (approval === undefined) return 'ask'
      const override = approval.overrideOf(session)
      if (override !== undefined) return override
      const policy = approval.config?.policy
      if (policy !== undefined) return policy
      return 'ask'
    } catch {
      return 'ask'
    }
  }

  /**
   * Whether plan mode is in force for a session: the last logged `plan/mode`
   * wins, a log with none folds to inactive. Same fold as the harness's
   * `planProjectionDefinition.apply`, re-implemented here to avoid a new peer
   * dependency.
   */
  const planModeActive = (session) => {
    let active = false
    for (const event of sessionLog(session)) {
      if (event.type === 'plan/mode') active = event.data.active === true
    }
    return active
  }

  /** The plan's first markdown heading (any level), or undefined when it has none. */
  const planHeading = (plan) => {
    for (const line of String(plan).split('\n')) {
      const match = /^#{1,6}\s+(.+?)\s*$/.exec(line)
      if (match !== null) return match[1]
    }
    return undefined
  }

  /**
   * Whether the event's session is a LIVE ROOT agent. Interactive asks
   * (`ask_user_question`, `exit_plan_mode`) throw DELEGATED_CALLER for
   * agents owned by another live agent — the question never reaches the
   * user, so a `tool/call` there must not notify. Without the agents
   * registry (headless compositions) nothing is suppressed.
   */
  const isLiveRootSession = (session) => {
    if (session === undefined || session === null) return true
    const agents = ctx.get('agents')
    if (agents === undefined) return true
    try {
      const agent = agents.get(session.id)
      if (agent === undefined || agent.session !== session) return true
      return agents.roots().includes(agent)
    } catch {
      return true
    }
  }

  /** Label of the last `turn/end` reason for the session (fallback 结束). */
  const turnEndLabel = (session) => {
    const events = sessionLog(session)
    const fallback = t(lang, 'host.status.ended')
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index]
      if (event.type !== 'turn/end') continue
      const reason = event.data?.reason?.kind
      return reason === undefined || reason === null ? fallback : statusLabel(reason, lang)
    }
    return fallback
  }

  /**
   * Attention notifications: the agent stopped and the USER must act.
   *  - approval/asked: an approval question reached the answerer chain
   *    (escalation / privileged execution). Notify only under policy `ask`
   *    — under `never` the ask is auto-rejected and no manual elevation is
   *    possible.
   *  - tool/call ask_user_question: the agent actively paused to consult the
   *    user (plain questions and plan-review intents alike).
   * session/event is a live, post-commit append feed (no startup replay), so
   * every event here is a fresh ask; dedup keys are the durable ids.
   */
  ctx.on('session/event', (session, event) => {
    // Read the language once per event: every field built below belongs to
    // this one notification, and a switch mid-render must not split it.
    const language = syncLang(ctx)
    if (event.type === 'approval/asked') {
      if (!readSettings().approval) return
      if (effectiveApprovalPolicy(session) !== 'ask') return
      const root = rootOf(session) ?? currentRoot
      if (root !== undefined) currentRoot = root
      const toolName = String(event.data.toolName ?? '')
      const reason = event.data.reason
      notify('ap:' + String(event.data.id), {
        kind: 'approval',
        title: titleOf(root) ?? titleOf(session) ?? t(language, 'host.sessionFallback'),
        status: t(language, 'host.status.needsApproval'),
        detail: typeof reason === 'string' && reason !== ''
          ? t(language, 'host.detail.toolReason', { tool: toolName, reason })
          : t(language, 'host.detail.tool', { tool: toolName }),
      }, language)
      return
    }
    if (event.type === 'tool/call' && event.data.name === 'ask_user_question') {
      if (!readSettings().question) return
      // A delegated child's ask fails with DELEGATED_CALLER before any UI
      // shows it — only live root agents can pause for a human answer.
      if (!isLiveRootSession(session)) return
      const root = rootOf(session) ?? currentRoot
      if (root !== undefined) currentRoot = root
      // arguments is a JSON string; the first question text becomes the
      // notification's detail line. Fail soft on any malformed payload.
      let text = ''
      try {
        const args = JSON.parse(String(event.data.arguments ?? '{}'))
        const first = Array.isArray(args?.questions) ? args.questions[0] : undefined
        if (first !== null && first !== undefined && typeof first.question === 'string') {
          text = first.question
        }
      } catch { /* 忽略格式问题 */ }
      if (text.length > 100) text = text.slice(0, 100) + '…'
      notify('qu:' + String(event.data.callId), {
        kind: 'question',
        title: titleOf(root) ?? titleOf(session) ?? t(language, 'host.sessionFallback'),
        status: t(language, 'host.status.awaitingAnswer'),
        detail: text === '' ? t(language, 'host.detail.seeUi') : text,
      }, language)
      return
    }
    // Plan review: the agent called exit_plan_mode and is blocked on the
    // user's approve / keep-planning decision (the plan-review intent of the
    // user-questions channel). tool/call fires at dispatch, exactly when the
    // plan is presented. Every guard mirrors a path where the tool fails
    // BEFORE the review can appear — no guard, no toast.
    if (event.type === 'tool/call' && event.data.name === 'exit_plan_mode') {
      if (!readSettings().plan) return
      if (!isLiveRootSession(session)) return
      if (ctx.get('userQuestions') === undefined) return
      if (!planModeActive(session)) return
      let plan = ''
      try {
        const args = JSON.parse(String(event.data.arguments ?? '{}'))
        if (typeof args?.plan === 'string') plan = args.plan
      } catch { /* 忽略格式问题 */ }
      if (!/^#\s+\S/.test(plan.trim())) return
      const heading = planHeading(plan)
      const excerpt = plan
        .replace(/^#{1,6}\s+.*$/m, '') // 去掉标题行
        .trim().replace(/\s+/g, ' ') // 压平换行
      const excerptText = excerpt.length > 60 ? excerpt.slice(0, 60) + '…' : excerpt
      const root = rootOf(session) ?? currentRoot
      if (root !== undefined) currentRoot = root
      notify('pr:' + String(event.data.callId), {
        kind: 'plan',
        title: titleOf(root) ?? titleOf(session) ?? t(language, 'host.sessionFallback'),
        status: t(language, 'host.status.awaitingConfirm'),
        detail: t(language, 'host.detail.planTitle', {
          heading: heading ?? t(language, 'host.detail.planUntitled'),
        }) + (excerptText === '' ? '' : '\n' + t(language, 'host.detail.planExcerpt', { excerpt: excerptText })),
      }, language)
      return
    }
    // Goal blocked: the autonomous goal run ended on a persistent blocker
    // (model-reported or round-limit) — the user must resolve it or clear
    // the goal. Durable `goal/change` operation 'block' carries the full
    // snapshot; the fold invariant guarantees phase 'blocked' with a reason.
    if (event.type === 'goal/change' && event.data?.operation === 'block') {
      if (!readSettings().goal) return
      const goal = event.data.goal
      const message = goal?.blockedReason?.message
      const reason = typeof message === 'string' && message !== ''
        ? (message.length > 120 ? message.slice(0, 120) + '…' : message)
        : t(language, 'host.detail.reasonUnknown')
      const root = rootOf(session) ?? currentRoot
      if (root !== undefined) currentRoot = root
      notify('goal:' + String(goal?.id ?? '') + ':' + String(goal?.revision ?? ''), {
        kind: 'goal',
        title: titleOf(root) ?? titleOf(session) ?? t(language, 'host.sessionFallback'),
        status: t(language, 'host.status.needsAction'),
        detail: t(language, 'host.detail.reason', { reason }),
      }, language)
    }
  })

  // 3-second dedup window: a subagent's own `agent/status` idle lands right
  // after its `subagent/end`; only the first of the pair becomes a toast.
  const seen = new Map()
  const notify = (key, msg, language) => {
    const s = readSettings()
    if (s.enabled !== true) return
    const now = Date.now()
    const last = seen.get(key)
    if (last !== undefined && now - last < 3000) return
    seen.set(key, now)
    if (seen.size > 200) {
      for (const [k, t] of seen) if (now - t >= 3000) seen.delete(k)
    }
    const use = language ?? lang
    const item = Object.assign({ at: now }, msg)
    runtime.queue.push(item)
    if (runtime.queue.length > 20) runtime.queue.shift()
    const title = kindTitle(item.kind, use)
    // Desktop channel: a real Windows toast with the system notification sound.
    showWindowsToast(title, bodyLines(item, use)).then((outcome) => {
      if (outcome.ok !== true) console.error('[dsh-task-notify] windows toast failed:', outcome.error)
    }, () => {})
    if (s.push && s.token !== '') {
      pushToPushPlus(s.token, title, bodyLines(item, use).join('\n'), use).catch((error) => {
        console.error('[dsh-task-notify] push failed:', error)
      })
    }
  }

  ctx.on('subagent/end', (info) => {
    if (!readSettings().subagent) return
    const language = syncLang(ctx)
    const id = info === null || info === undefined ? undefined : info.id
    const child = id === undefined ? undefined : sessions()?.get(id)
    const root = rootOf(child) ?? currentRoot
    if (root !== undefined) currentRoot = root
    notify(String(id ?? info?.runId ?? 'subagent'), {
      kind: 'subagent',
      title: titleOf(root) ?? titleOf(child) ?? String(info?.provider ?? t(language, 'host.subagentFallback')),
      // `SubagentStopReason` reuses the harness turn-end vocabulary, so it folds
      // through the same label table instead of leaking `error`/`aborted` into
      // the toast body.
      status: statusLabel(info?.stopReason ?? 'ended', language),
    }, language)
  })

  ctx.on('workflow/end', (info, result) => {
    if (!readSettings().workflow) return
    const language = syncLang(ctx)
    notify('wf:' + String(info?.id ?? ''), {
      kind: 'workflow',
      title: titleOf(currentRoot)
        ?? (typeof info?.meta?.name === 'string' ? info.meta.name : t(language, 'host.workflowFallback')),
      status: statusLabel(result?.stopReason ?? 'ended', language),
    }, language)
  })

  ctx.on('agent/status', (payload) => {
    if (!readSettings().agent) return
    if (payload?.status !== 'idle') return
    const agent = payload === null || payload === undefined ? undefined : payload.agent
    if (agent === undefined || agent === null) return
    // 主回合 means the conversation the user is driving. A delegated child's
    // idle lands right after its own `subagent/end` (which owns that toast),
    // so a non-root agent must not raise a second, mislabelled one — without
    // this guard the 主回合 switch alone would notify for every subagent.
    if (!isLiveRootSession(agent.session)) return
    const language = syncLang(ctx)
    const root = rootOf(agent.session)
    if (root !== undefined) currentRoot = root
    notify(String(agent.id), {
      kind: 'agent',
      title: titleOf(root) ?? titleOf(agent.session) ?? t(language, 'host.sessionFallback'),
      // Enrich the generic 结束 with the last turn/end reason (完成/中止/
      // 失败/超出上限/中断/阻塞), so abnormal stops stand out.
      status: turnEndLabel(agent.session),
    }, language)
  })

  // Strict endpoint registration: the gateway resolves taskNotify/* from
  // this manifest, independent of decorator marker state.
  ctx.effect(() => {
    const dispose = ctx.typert.register(TYPERT_MANIFEST)
    return () => { void dispose() }
  }, 'dsh-task-notify: typert manifest')
}
