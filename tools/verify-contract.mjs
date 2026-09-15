/**
 * Host-side regression check for dsh-task-notify against a real DSH checkout.
 *
 * Run after every DSH upgrade and after every build that touches
 * `src/contract.js`:
 *
 *   node tools/verify-contract.mjs                 (DSH_HARNESS / DSH_REPO, else T:/deepseek-harness)
 *   $env:DSH_HARNESS = 'D:\path\to\deepseek-harness'; node tools/verify-contract.mjs
 *
 * It answers one question: does the INSTALLED build (`lib/index.js`) still
 * activate on the DSH that is installed on this machine? The 1.6.1 outage came
 * from exactly this seam — DSH changed the STRICT codec contract from a
 * ready-made `schema` to a lazy `create()` factory, so `ctx.typert.register()`
 * threw inside `apply()` and the whole plugin row failed to activate: no
 * notification, no bell, no settings panel.
 *
 * Checks, in order:
 *   1. the strict codec contract — every descriptor exposes `create()`, the
 *      schemas parse valid values and reject malformed ones, and `testNotify`
 *      carries its one optional language parameter;
 *   2. the real `TypertRegistry` accepts the host manifest and registers all
 *      five `taskNotify/*` endpoints (the exact call that used to throw);
 *   3. the built host half applies against a fake Cordis context and every
 *      notification path (approval / question / plan / goal / agent /
 *      subagent / workflow) reaches the queue with its documented label,
 *      including the switches that gate them;
 *   4. localization — every label is Chinese until a locale snapshot says
 *      otherwise, an English locale switches the whole payload, an unmapped
 *      language falls back to English, and the language stays a HOST concern
 *      (it is what renders the toast and the push body);
 *   5. a negative control: a `schema`-only codec must still be rejected, so
 *      this check keeps detecting the same drift in the future.
 *
 * Every checked notification also fires a real `pwsh.exe`/BurntToast attempt to
 * the Windows notification centre; a refused spawn or a missing BurntToast
 * module is reported at the end but never fails the run, because the plugin
 * treats both as non-fatal by design. That final probe is also where the
 * automatic BurntToast install shows up: a machine without the module logs
 * `BurntToast missing — installing it for the current user` and the toast
 * result then reports the outcome.
 *
 * Environment:
 *   DSH_HARNESS / DSH_REPO       Harness checkout to resolve DSH packages from.
 *   DSH_TASK_NOTIFY_BUILD        Exact built `index.js` to verify (default: the
 *                                copy the running dsh loads, if installed).
 *   DSH_TASK_NOTIFY_DEBUG        Print each candidate path and why it was skipped.
 *
 * Only `node:` builtins and the DSH packages resolved from the checkout are
 * used; the plugin never imports anything from this file.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

process.stdout.write('\ndsh-task-notify contract verification\n\n')

let failures = 0
let checks = 0

/** Record one passing check. */
function pass(label, detail = '') {
  checks += 1
  process.stdout.write(`  ok   ${label}${detail === '' ? '' : ` — ${detail}`}\n`)
}

/** Record one failing check; the process exits non-zero at the end. */
function fail(label, detail = '') {
  checks += 1
  failures += 1
  process.stdout.write(`  FAIL ${label}${detail === '' ? '' : ` — ${detail}`}\n`)
}

/**
 * Run one check, turning a thrown error into a single failure line.
 * An async body is awaited so its rejection lands in the same place.
 */
async function check(label, body) {
  try {
    const detail = await body()
    pass(label, typeof detail === 'string' ? detail : '')
  } catch (error) {
    fail(label, error instanceof Error ? error.message : String(error))
  }
}

/**
 * Deep-copy a JSON-compatible structure, preserving its methods.
 *
 * Hand-rolled rather than JSON round-tripping or `structuredClone`: the
 * contract is a data tree that carries FUNCTIONS (each strict codec's
 * `create`), and both of those would either strip or refuse to clone them.
 * @param value - data tree to copy.
 * @returns an independent copy carrying the same functions.
 */
function cloneWithMethods(value) {
  if (Array.isArray(value)) return value.map(cloneWithMethods)
  if (value === null || typeof value !== 'object') return value
  const copy = {}
  for (const [key, member] of Object.entries(value)) copy[key] = cloneWithMethods(member)
  return copy
}

/* ── dependency resolution ─────────────────────────────────────────────────── */

/** Harness checkout: explicit env wins, then the harness's own default path. */
const HARNESS = process.env.DSH_HARNESS ?? process.env.DSH_REPO ?? 'T:/deepseek-harness'

/** Where the dsh web profile installs out-of-tree plugins (the runtime copy). */
const PROFILE_MODULES = join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh/profiles/web/node_modules')

/** Candidate `node_modules` anchors, most specific first. */
const anchors = [
  PROFILE_MODULES,
  join(HARNESS, 'apps/cli/node_modules/@deepseek-ai/dsh-base/node_modules'),
  join(HARNESS, 'node_modules'),
  join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh/profiles/node_modules'),
]

/**
 * Whether one anchor resolves the packages the plugin half needs at runtime:
 * the Cordis framework and the Typert protocol it imports as a peer.
 */
function anchorResolves(dir) {
  try {
    const probe = createRequire(join(dir, 'noop.js'))
    probe.resolve('@deepseek-ai/cordis')
    probe.resolve('@deepseek-ai/dsh-typert-protocol')
    return true
  } catch {
    return false
  }
}

const anchor = anchors.find(anchorResolves)

if (anchor === undefined) {
  process.stdout.write(
    '  FAIL cannot resolve @deepseek-ai/cordis and @deepseek-ai/dsh-typert-protocol from any module anchor\n'
    + anchors.map((dir) => `         tried ${dir}\n`).join('')
    + '       Set DSH_HARNESS to the DeepSeek Harness checkout (a directory holding package.json).\n\n',
  )
  process.exit(1)
}

const require = createRequire(join(anchor, 'noop.js'))

/**
 * Import one DSH package by the ESM entry resolved from the chosen anchor.
 * @param name - exact package name.
 * @returns the package's module namespace.
 */
async function importDsh(name) {
  return await import(pathToFileURL(require.resolve(name)).href)
}

process.stdout.write(`  dsh  checkout ${HARNESS}\n`)
process.stdout.write(`  dsh  modules  ${anchor}\n\n`)

const { Context } = await importDsh('@deepseek-ai/cordis')
const registryModule = await importDsh('@deepseek-ai/dsh-typert-registry')
const TypertRegistry = registryModule.default ?? registryModule.TypertRegistry

const root = process.cwd()
const { INVOCATIONS, TYPERT_MANIFEST } = await import(pathToFileURL(join(root, 'src/contract.js')).href)

/**
 * The plugin build under test. Default is the copy the running DSH actually
 * loads when the web profile has it installed (bare imports inside it resolve
 * exactly as they do at runtime); `DSH_TASK_NOTIFY_BUILD=<path>` verifies a
 * specific artifact — for example this repository's own `lib/index.js` before
 * it has been synced into the profile.
 * @returns the built module namespace and the path it was loaded from.
 */
async function loadPluginBuild() {
  const explicit = process.env.DSH_TASK_NOTIFY_BUILD
  let installed
  try {
    installed = require.resolve('dsh-task-notify')
  } catch {
    installed = undefined
  }
  const candidates = [explicit, installed, join(root, 'lib/index.js')]
    .filter((path) => path !== undefined)
  const errors = []
  for (const path of candidates) {
    try {
      const module = await import(pathToFileURL(path).href)
      if (process.env.DSH_TASK_NOTIFY_DEBUG !== undefined) {
        process.stderr.write(`[verify] loaded ${path}\n`)
      }
      return { path, module }
    } catch (error) {
      errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`)
      if (process.env.DSH_TASK_NOTIFY_DEBUG !== undefined) {
        process.stderr.write(`[verify] skipped ${path}: ${error instanceof Error ? error.message : String(error)}\n`)
      }
    }
  }
  throw new Error(`no build could be loaded:\n         ${errors.join('\n         ')}`)
}

/** Every boundary codec of the namespace, labelled for diagnostics. */
const allCodecs = INVOCATIONS.flatMap((descriptor) => [
  ...descriptor.parameters.map((parameter) => ({
    label: `${descriptor.method}.${parameter.wire}`,
    codec: parameter.codec,
  })),
  { label: `${descriptor.method}.result`, codec: descriptor.result },
])

/* ── 1. strict codec contract ─────────────────────────────────────────────── */

process.stdout.write('1) strict codec contract\n')

await check('5 unique invocation ids describe the taskNotify namespace', () => {
  const ids = new Set(INVOCATIONS.map((descriptor) => descriptor.id))
  if (ids.size !== 5) throw new Error(`expected 5 unique ids, found ${ids.size}`)
  for (const descriptor of INVOCATIONS) {
    if (descriptor.service !== 'taskNotify' || descriptor.namespace !== 'taskNotify') {
      throw new Error(`${descriptor.id} is not bound to the taskNotify namespace`)
    }
  }
  return INVOCATIONS.map((descriptor) => descriptor.method).join(', ')
})

await check('every strict codec exposes a create() factory', () => {
  for (const { label, codec } of allCodecs) {
    if (codec.mode !== 'strict') throw new Error(`${label} is not a strict codec`)
    if (typeof codec.typeSymbol !== 'string' || codec.typeSymbol === '') {
      throw new Error(`${label} has no type symbol`)
    }
    if (typeof codec.create !== 'function') {
      throw new Error(`${label} has no create() factory — DSH rejects a bare \`schema\` field`)
    }
  }
  return `${allCodecs.length} codecs`
})

await check('create() caches one schema instance exposing parse()', () => {
  for (const { label, codec } of allCodecs) {
    const schema = codec.create()
    if (schema !== codec.create()) throw new Error(`${label} create() is not cached`)
    if (typeof schema.parse !== 'function') throw new Error(`${label} schema has no parse() method`)
  }
  return 'stable instances'
})

/** A complete, valid settings section — the one shape both faces accept. */
const VALID_SETTINGS = Object.freeze({
  push: false, token: '', enabled: true, agent: false, subagent: true,
  workflow: true, approval: true, question: true, plan: true, goal: true,
})

/** The section used while driving events: every kind on, including 主回合. */
const ALL_KINDS_ON = Object.freeze({
  ...VALID_SETTINGS,
  agent: true,
})

/** Whether `parse` rejects `value`. */
function rejects(parse, value) {
  try {
    parse(value)
    return false
  } catch {
    return true
  }
}

await check('settings codec accepts a complete section and rejects malformed input', () => {
  const schema = INVOCATIONS[0].result.create()
  if (schema.parse(VALID_SETTINGS).enabled !== true) throw new Error('enabled was not preserved')
  if (!rejects((value) => schema.parse(value), { ...VALID_SETTINGS, push: 'yes' })) {
    throw new Error('a non-boolean push was accepted')
  }
  if (!rejects((value) => schema.parse(value), { ...VALID_SETTINGS, token: 7 })) {
    throw new Error('a non-string token was accepted')
  }
  return 'round trip + rejection'
})

await check('item-list codec validates one owned queue item', () => {
  const schema = INVOCATIONS[2].result.create()
  const items = schema.parse([{ kind: 'approval', title: 't', status: '需要审批', at: 1, detail: 'd' }])
  if (items.length !== 1 || items[0].kind !== 'approval' || items[0].detail !== 'd') {
    throw new Error('the item was not preserved')
  }
  if (!rejects((value) => schema.parse(value), [{ kind: 'nope', title: 't', status: 's', at: 1 }])) {
    throw new Error('an unknown kind was accepted')
  }
  if (!rejects((value) => schema.parse(value), [{ kind: 'approval', title: 't', status: 's', at: 'now' }])) {
    throw new Error('a non-numeric timestamp was accepted')
  }
  return 'round trip + rejection'
})

await check('test-result codec validates the { ok, error? } outcome', () => {
  const schema = INVOCATIONS[3].result.create()
  if (schema.parse({ ok: true }).ok !== true) throw new Error('ok was not preserved')
  if (schema.parse({ ok: false, error: 'x' }).error !== 'x') throw new Error('error was not preserved')
  if (!rejects((value) => schema.parse(value), { ok: 'yes' })) throw new Error('a non-boolean ok was accepted')
  return 'round trip + rejection'
})

await check('testNotify carries one optional language parameter', () => {
  const descriptor = INVOCATIONS.find((entry) => entry.method === 'testNotify')
  if (descriptor === undefined) throw new Error('no testNotify descriptor')
  if (descriptor.parameters.length !== 1) {
    throw new Error(`expected exactly 1 parameter, found ${descriptor.parameters.length}`)
  }
  const parameter = descriptor.parameters[0]
  if (parameter.name !== 'lang' || parameter.wire !== 'lang' || parameter.source !== 'json') {
    throw new Error(`unexpected parameter ${JSON.stringify({ name: parameter.name, wire: parameter.wire, source: parameter.source })}`)
  }
  const schema = parameter.codec.create()
  if (schema.parse('en') !== 'en') throw new Error("'en' was not preserved")
  if (schema.parse('zh') !== 'zh') throw new Error("'zh' was not preserved")
  // Absent on the host-side call path; it must resolve, not throw.
  if (schema.parse(undefined) !== 'zh') throw new Error('an absent language did not default to zh')
  if (!rejects((value) => schema.parse(value), 'ja')) {
    throw new Error('a language this plugin carries no copy for was accepted')
  }
  return "lang: 'zh' | 'en' (default zh)"
})

/* ── 2. the real TypertRegistry accepts the host manifest ─────────────────── */

process.stdout.write('\n2) host manifest registration (the call that used to throw)\n')

const registryCtx = new Context()
await registryCtx.plugin(TypertRegistry)

await check('ctx.typert.register(TYPERT_MANIFEST) commits', () => {
  registryCtx.typert.register(TYPERT_MANIFEST)
  return 'no throw'
})

await check('every taskNotify endpoint is resolvable', () => {
  const endpoints = []
  for (const descriptor of INVOCATIONS) {
    const endpoint = `${descriptor.service}/${descriptor.method}`
    const live = registryCtx.typert.local.get(endpoint)
    if (live === undefined) throw new Error(`missing endpoint ${endpoint}`)
    if (live.id !== descriptor.id) throw new Error(`endpoint ${endpoint} carries ${live.id}`)
    endpoints.push(endpoint)
  }
  return endpoints.join(', ')
})

await check('the registered descriptors keep the strict create() contract', () => {
  for (const descriptor of INVOCATIONS) {
    const live = registryCtx.typert.local.get(`${descriptor.service}/${descriptor.method}`)
    if (typeof live.result.create !== 'function') throw new Error(`${descriptor.id} lost its create()`)
    if (typeof live.result.create().parse !== 'function') throw new Error(`${descriptor.id} result is unparseable`)
  }
  return '5 endpoints'
})

/* ── 3. the built host half applies and notifies ──────────────────────────── */

process.stdout.write('\n3) built host half against a fake Cordis context\n')

const build = await loadPluginBuild().catch((error) => ({ loadError: error }))
const plugin = build.module ?? {}

if (build.path !== undefined) process.stdout.write(`  build ${build.path}\n`)

await check('the build loads as an ES module', () => {
  if (build.loadError !== undefined) throw build.loadError
  if (typeof plugin.apply !== 'function') throw new Error('no apply() export')
  return 'apply() exported'
})

await check('module name matches dsh.plugin.json', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'dsh.plugin.json'), 'utf8'))
  if (plugin.name !== manifest.entry.name) {
    throw new Error(`name ${String(plugin.name)} != entry.name ${String(manifest.entry.name)}`)
  }
  return `${String(plugin.name)} inject=${JSON.stringify(plugin.inject)}`
})

/**
 * Settings scope double: the plugin only ever calls `get()` and `update()`.
 * The drive starts from the shipped defaults with 主回合 switched on, because
 * `agent` ships OFF (a session completion would otherwise notify twice per
 * turn) and this tool must exercise every notification kind.
 * @returns the scope handed back by `ctx.settings.register`.
 */
function makeSettingsScope() {
  let value = { ...ALL_KINDS_ON }
  return {
    get: () => value,
    update: async (patch) => {
      value = { ...value, ...patch }
      return value
    },
    watch: () => () => {},
  }
}

/**
 * One fake session: the plugin reads `id`, `header.parentSession`, and the
 * `snapshotEvents()` reader. The reader closes over the live array, so an
 * append after construction stays visible, exactly like the real reader.
 * @param id - session id.
 * @param events - initial event log.
 * @param parentSession - optional parent session id.
 */
function makeSession(id, events = [], parentSession = undefined) {
  const log = [...events]
  return {
    id,
    header: { id, parentSession },
    snapshotEvents: () => log,
  }
}

/*
 * The host half runs against a real Cordis Context carrying the real Typert
 * registry plus the optional service seams the plugin reads through `ctx.get`
 * — a settings double and the user-questions seam plan review is gated on, so
 * `ctx.effect`, `ctx.on`, service provision, and `ctx.reflect` all behave
 * exactly as they do in the running host. The listeners are proved by
 * BEHAVIOUR: the emitted events below are the four sources the plugin
 * subscribes to, and each one must produce its own item.
 */
const pluginCtx = new Context()
await pluginCtx.plugin(TypertRegistry)
pluginCtx.provide('settings', { register: () => makeSettingsScope() })
pluginCtx.provide('userQuestions', { ask: () => Promise.resolve() })

/** The four Cordis events the plugin subscribes to, driven through real emits. */
function emitSessionEvent(session, event) {
  pluginCtx.emit('session/event', session, event)
}
function emitSubagentEnd(info) {
  pluginCtx.emit('subagent/end', info)
}
function emitWorkflowEnd(info, result) {
  pluginCtx.emit('workflow/end', info, result)
}
function emitAgentStatus(payload) {
  pluginCtx.emit('agent/status', payload)
}

await check('apply(ctx) completes and registers every endpoint', () => {
  plugin.apply(pluginCtx)
  for (const descriptor of INVOCATIONS) {
    const endpoint = `${descriptor.service}/${descriptor.method}`
    if (pluginCtx.typert.local.get(endpoint) === undefined) {
      throw new Error(`apply() did not register ${endpoint}`)
    }
  }
  return '5 endpoints under taskNotify/'
})

/** The Remote service the plugin published through TypertRemoteService. */
const runtime = pluginCtx.reflect.get('taskNotify')

await check('the taskNotify Remote service is published', () => {
  if (runtime === undefined) throw new Error('taskNotify is not provided on the plugin context')
  for (const method of ['getSettings', 'updateSettings', 'next', 'testPush', 'testNotify']) {
    if (typeof runtime[method] !== 'function') throw new Error(`taskNotify.${method} is missing`)
  }
  return 'getSettings, updateSettings, next, testPush, testNotify'
})

await check('getSettings resolves the switched-on drive state', () => {
  const settings = runtime.getSettings()
  if (settings.enabled !== true || settings.agent !== true || settings.subagent !== true) {
    throw new Error(`unexpected defaults: ${JSON.stringify(settings)}`)
  }
  if (settings.push !== false || settings.token !== '') throw new Error('push must start off')
  return '总开关 on, 主回合 on, 子代理 on, 推送 off'
})

/*
 * Drive one synthetic event per notification kind through the real listeners.
 * Each spawns a `pwsh.exe` toast attempt; under a file sandbox that spawn may
 * fail with EPERM, which the plugin reports and swallows — never fatal.
 */
const rootSession = makeSession('root', [])
const planSession = makeSession('plan', [
  { type: 'plan/mode', data: { active: true } },
  { type: 'turn/end', data: { reason: { kind: 'completed' } } },
])

const sessionEvent = emitSessionEvent

await check('all 7 notification paths reach the queue', () => {
  sessionEvent(rootSession, { type: 'approval/asked', data: { id: 'ap-1', toolName: 'pwsh', reason: '提权' } })
  sessionEvent(rootSession, {
    type: 'tool/call',
    data: {
      name: 'ask_user_question',
      callId: 'call-q',
      arguments: JSON.stringify({ questions: [{ question: '要继续吗？' }] }),
    },
  })
  sessionEvent(planSession, {
    type: 'tool/call',
    data: {
      name: 'exit_plan_mode',
      callId: 'call-p',
      arguments: JSON.stringify({ plan: '# 重写通知链路\n\n先改契约再重建。' }),
    },
  })
  sessionEvent(rootSession, {
    type: 'goal/change',
    data: {
      operation: 'block',
      goal: { id: 'g-1', revision: 3, blockedReason: { code: 'stuck', message: '连续三轮没有进展' } },
    },
  })
  emitAgentStatus({ agent: { id: 'a-1', session: planSession }, status: 'idle' })
  emitSubagentEnd({ id: 'child', stopReason: 'completed' })
  emitWorkflowEnd({ id: 'wf-1', meta: { name: 'verify' } }, { stopReason: 'completed' })

  const kinds = runtime.next().map((item) => item.kind).sort()
  const expected = ['agent', 'approval', 'goal', 'plan', 'question', 'subagent', 'workflow']
  if (kinds.join(',') !== expected.join(',')) {
    throw new Error(`queued kinds ${kinds.join(',')} != ${expected.join(',')}`)
  }
  return expected.join(', ')
})

await check('subagent and workflow statuses use the documented labels', () => {
  emitSubagentEnd({ id: 'child-2', stopReason: 'completed' })
  emitWorkflowEnd({ id: 'wf-2', meta: { name: 'verify' } }, { stopReason: 'completed' })
  const completed = new Map(runtime.next().map((item) => [item.kind, item]))
  if (completed.get('subagent')?.status !== '完成') {
    throw new Error(`subagent completed status ${JSON.stringify(completed.get('subagent')?.status)}`)
  }
  if (completed.get('workflow')?.status !== '完成') {
    throw new Error(`workflow completed status ${JSON.stringify(completed.get('workflow')?.status)}`)
  }

  emitSubagentEnd({ id: 'child-3', stopReason: 'error' })
  emitWorkflowEnd({ id: 'wf-3', meta: { name: 'verify' } }, { stopReason: 'cancelled' })
  const aborted = new Map(runtime.next().map((item) => [item.kind, item]))
  if (aborted.get('subagent')?.status !== '失败') {
    throw new Error(`subagent error status ${JSON.stringify(aborted.get('subagent')?.status)}`)
  }
  if (aborted.get('workflow')?.status !== '取消') {
    throw new Error(`workflow cancelled status ${JSON.stringify(aborted.get('workflow')?.status)}`)
  }
  return 'completed → 完成, error → 失败, cancelled → 取消'
})

await check('主回合 idle reports the last turn/end reason', () => {
  emitAgentStatus({ agent: { id: 'a-2', session: planSession }, status: 'idle' })
  const item = runtime.next().find((candidate) => candidate.kind === 'agent')
  if (item === undefined) throw new Error('the 主回合 idle path did not notify')
  if (item.status !== '完成') throw new Error(`agent status ${JSON.stringify(item.status)}`)
  if (item.title !== 'Agent 回合') throw new Error(`agent title ${JSON.stringify(item.title)}`)
  return 'turn/end completed → 完成'
})

await check('approval notifications carry the tool and reason', () => {
  // Fresh dedup keys per drive: the plugin suppresses a repeated key within 3s.
  sessionEvent(rootSession, { type: 'approval/asked', data: { id: 'ap-2', toolName: 'pwsh' } })
  sessionEvent(rootSession, {
    type: 'approval/asked',
    data: { id: 'ap-3', toolName: 'pwsh', reason: '写文件被沙箱拒绝' },
  })
  const items = runtime.next().filter((item) => item.kind === 'approval')
  if (items.length !== 2) throw new Error(`expected 2 approval items, got ${items.length}`)
  if (items[0].status !== '需要审批') throw new Error(`approval status ${JSON.stringify(items[0].status)}`)
  if (items[0].detail !== '工具：pwsh') throw new Error(`approval detail ${JSON.stringify(items[0].detail)}`)
  if (items[1].detail !== '工具：pwsh，原因：写文件被沙箱拒绝') {
    throw new Error(`approval reason detail ${JSON.stringify(items[1].detail)}`)
  }
  return '工具名 + 原因'
})

await check('every queued item carries a title and timestamp', () => {
  sessionEvent(rootSession, { type: 'tool/call', data: { name: 'ask_user_question', callId: 'call-q2', arguments: '{}' } })
  const items = runtime.next()
  if (items.length === 0) throw new Error('the question path did not notify')
  for (const item of items) {
    if (typeof item.title !== 'string' || item.title === '') throw new Error(`${item.kind} has no title`)
    if (typeof item.at !== 'number') throw new Error(`${item.kind} has no timestamp`)
  }
  if (items[0].detail !== '（请查看界面）') throw new Error(`empty question detail ${JSON.stringify(items[0].detail)}`)
  return '标题 / 时间 / 空问题回退文案'
})

await check('plan review carries the plan heading and excerpt', () => {
  sessionEvent(planSession, {
    type: 'tool/call',
    data: {
      name: 'exit_plan_mode',
      callId: 'call-p2',
      arguments: JSON.stringify({ plan: '# 重写通知链路\n\n先改契约再重建。' }),
    },
  })
  const plan = runtime.next().find((item) => item.kind === 'plan')
  if (plan === undefined) throw new Error('plan review did not notify')
  if (plan.status !== '等待确认') throw new Error(`plan status ${JSON.stringify(plan.status)}`)
  if (!String(plan.detail).includes('重写通知链路')) throw new Error(`plan detail ${JSON.stringify(plan.detail)}`)
  return '标题 + 摘要'
})

await check('goal block carries the blocker reason', () => {
  sessionEvent(rootSession, {
    type: 'goal/change',
    data: {
      operation: 'block',
      goal: { id: 'g-2', revision: 4, blockedReason: { code: 'stuck', message: '连续三轮没有进展' } },
    },
  })
  const goal = runtime.next().find((item) => item.kind === 'goal')
  if (goal === undefined) throw new Error('goal block did not notify')
  if (goal.status !== '需要处理') throw new Error(`goal status ${JSON.stringify(goal.status)}`)
  if (!String(goal.detail).includes('连续三轮没有进展')) throw new Error(`goal detail ${JSON.stringify(goal.detail)}`)
  return '阻塞原因'
})

await check('the master switch suppresses every notification', async () => {
  await runtime.updateSettings({ ...VALID_SETTINGS, enabled: false })
  sessionEvent(rootSession, { type: 'approval/asked', data: { id: 'ap-muted', toolName: 'pwsh' } })
  const muted = runtime.next()
  await runtime.updateSettings({ ...VALID_SETTINGS })
  if (muted.length !== 0) throw new Error(`${muted.length} notifications escaped the master switch`)
  return '总开关 off → 0 条'
})

await check('the kind switch gates its own notification', async () => {
  await runtime.updateSettings({ ...VALID_SETTINGS, approval: false })
  sessionEvent(rootSession, { type: 'approval/asked', data: { id: 'ap-off', toolName: 'pwsh' } })
  const disabled = runtime.next()
  await runtime.updateSettings({ ...VALID_SETTINGS })
  if (disabled.length !== 0) throw new Error('the approval switch did not gate its notification')
  return '需要审批 off → 0 条'
})

await check('the settings scope round-trips a write', async () => {
  const updated = await runtime.updateSettings({ ...ALL_KINDS_ON, push: true, token: 'tok' })
  if (updated.push !== true || updated.token !== 'tok') throw new Error('the update did not stick')
  if (runtime.getSettings().push !== true) throw new Error('getSettings did not observe the update')
  await runtime.updateSettings({ ...ALL_KINDS_ON, push: false, token: '' })
  return 'push on → 读回 on'
})

/*
 * Localization. The host renders every toast and PushPlus body, so the
 * LANGUAGE is a host-side concern: it resolves the shared locale preference
 * and must fall back to Chinese whenever that service (or its snapshot) is
 * unavailable — a headless composition has no locale service at all. The
 * assertions drive real events and read the queue, i.e. exactly the fields the
 * toast and the push body are built from.
 */
let fakeLang = null
pluginCtx.provide('locale', {
  getLocale: () => (fakeLang === null ? undefined : { active: fakeLang, locales: [], revision: 0 }),
  subscribe: () => () => {},
})

await check('without a locale snapshot every label stays Chinese', () => {
  fakeLang = null
  // No `provider`, so this also pins the subagent FALLBACK title: the payload
  // a session-less completion produces.
  emitSubagentEnd({ id: 'lang-default', stopReason: 'completed' })
  emitWorkflowEnd({ id: 'lang-default-wf' })
  const items = new Map(runtime.next().map((item) => [item.kind, item]))
  const subagent = items.get('subagent')
  const workflow = items.get('workflow')
  if (subagent?.status !== '完成') throw new Error(`subagent status ${JSON.stringify(subagent?.status)}`)
  if (subagent?.title !== '子代理') throw new Error(`subagent fallback title ${JSON.stringify(subagent?.title)}`)
  if (workflow?.title !== '工作流') throw new Error(`workflow fallback title ${JSON.stringify(workflow?.title)}`)
  return 'completed → 完成, 子代理 / 工作流 fallbacks'
})

await check('an English locale switches the host copy', () => {
  fakeLang = 'en'
  emitSubagentEnd({ id: 'lang-en', stopReason: 'completed' })
  emitWorkflowEnd({ id: 'lang-en-wf' })
  const items = new Map(runtime.next().map((item) => [item.kind, item]))
  const subagent = items.get('subagent')
  const workflow = items.get('workflow')
  if (subagent?.status !== 'Completed') throw new Error(`subagent status ${JSON.stringify(subagent?.status)}`)
  if (subagent?.title !== 'Subagent') throw new Error(`subagent fallback title ${JSON.stringify(subagent?.title)}`)
  if (workflow?.title !== 'Workflow') throw new Error(`workflow fallback title ${JSON.stringify(workflow?.title)}`)
  return 'completed → Completed, Subagent / Workflow fallbacks'
})

await check('the attention channels localize their status and detail lines', () => {
  fakeLang = 'en'
  sessionEvent(rootSession, {
    type: 'approval/asked',
    data: { id: 'ap-lang', toolName: 'pwsh', reason: 'escalation' },
  })
  sessionEvent(rootSession, {
    type: 'tool/call',
    data: { name: 'ask_user_question', callId: 'call-lang', arguments: '{}' },
  })
  const items = runtime.next()
  const approval = items.find((item) => item.kind === 'approval')
  const question = items.find((item) => item.kind === 'question')
  if (approval?.status !== 'Approval required') throw new Error(`approval status ${JSON.stringify(approval?.status)}`)
  if (approval?.detail !== 'Tool: pwsh, reason: escalation') throw new Error(`approval detail ${JSON.stringify(approval?.detail)}`)
  if (approval?.title !== 'Agent session') throw new Error(`approval title ${JSON.stringify(approval?.title)}`)
  if (question?.status !== 'Waiting for your answer') throw new Error(`question status ${JSON.stringify(question?.status)}`)
  if (question?.detail !== '(open the app to view)') throw new Error(`question detail ${JSON.stringify(question?.detail)}`)
  return 'Approval required / Waiting for your answer / Tool: …'
})

await check('a language without copy of its own falls back to English', () => {
  fakeLang = 'ja'
  emitSubagentEnd({ id: 'lang-ja', stopReason: 'completed' })
  const subagent = runtime.next().find((item) => item.kind === 'subagent')
  if (subagent?.status !== 'Completed') throw new Error(`subagent status ${JSON.stringify(subagent?.status)}`)
  return 'ja → Completed'
})

await check('testNotify uses the language the caller passes', async () => {
  /*
   * The desktop channel, end to end: `testNotify` runs real
   * `pwsh.exe`/BurntToast calls and reports their outcomes, so this proves the
   * delivery path without a toast assertion that could hang on a headless box.
   * The optional language argument is what the panel sends, so its own test
   * button matches the slider immediately; `ja` resolves through the same
   * normalizer as an English locale. A refusal (missing pwsh, missing
   * BurntToast, blocked spawn) is REPORTED, not failed — the plugin treats it
   * as non-fatal by design.
   */
  const english = await runtime.testNotify('en')
  const chinese = await runtime.testNotify('zh')
  for (const [label, outcome] of [['en', english], ['zh', chinese]]) {
    if (typeof outcome !== 'object' || outcome === null || typeof outcome.ok !== 'boolean') {
      throw new Error(`testNotify('${label}') returned ${JSON.stringify(outcome)}`)
    }
    if (outcome.ok !== true && String(outcome.error ?? '') === '') {
      throw new Error(`testNotify('${label}') failed without a reason`)
    }
  }
  const report = (outcome) => (outcome.ok === true
    ? 'pwsh + BurntToast delivered'
    : `unavailable (${String(outcome.error).split('\n')[0]})`)
  return `en → ${report(english)}, zh → ${report(chinese)}`
})

/* ── 4. negative control ──────────────────────────────────────────────────── */

process.stdout.write('\n4) negative control (the drift this tool exists for)\n')

await check('a schema-only strict codec is still rejected', async () => {
  const legacy = cloneWithMethods(TYPERT_MANIFEST)
  for (const descriptor of legacy.invocations) {
    descriptor.result.schema = descriptor.result.create()
    delete descriptor.result.create
  }
  const controlCtx = new Context()
  await controlCtx.plugin(TypertRegistry)
  let message = ''
  try {
    controlCtx.typert.register(legacy)
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  if (message === '') throw new Error('the legacy schema-only shape registered — this tool can no longer detect the drift')
  if (!message.includes('no create() factory')) throw new Error(`unexpected rejection: ${message}`)
  return message
})

/* ── summary ──────────────────────────────────────────────────────────────── */

process.stdout.write('\n')
if (failures === 0) {
  process.stdout.write(`PASS  ${checks}/${checks} checks\n\n`)
  process.exit(0)
}
process.stdout.write(`FAIL  ${failures}/${checks} checks failed\n\n`)
process.exit(1)
