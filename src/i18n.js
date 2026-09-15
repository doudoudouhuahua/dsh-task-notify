/**
 * The dsh-task-notify message table, shared verbatim by the host build and the
 * client bundle (like `contract.js`, this module is imported by both halves).
 *
 * Two namespaces, one flat key space each:
 *  - `host.*` — Windows toast titles, body lines, PushPlus content, error text.
 *    The HOST renders all of these, so it resolves them from the locale
 *    service when that service exists in the composition and otherwise falls
 *    back to Chinese (`DEFAULT_LANG`); the plugin ships Chinese by default.
 *  - `ui.*`   — the browser panel: titles, row labels, button captions, notes.
 *
 * Both dictionaries carry the SAME key set, and {@link t} is a total function:
 * an unknown key returns the key itself instead of throwing, so a missing
 * translation can never break a notification.
 */

/**
 * Languages the plugin carries copy for. Both ids are built-in DSH locales
 * (`@deepseek-ai/dsh-client-locale` registers exactly `zh` and `en`), so a
 * slider can only ever select one of these two.
 */
export const LANGS = ['zh', 'en']

/** Chinese is the default: absent or unreadable locale state resolves here. */
export const DEFAULT_LANG = 'zh'

/**
 * Does the window carry a language the user cannot read? Chinese only for
 * `zh` (any region tag folded to its primary subtag); EVERYTHING else falls to
 * English — the shared fallback of the DSH locale catalog, which also makes a
 * future third language degrade to English rather than to Chinese.
 * @param value - a locale id (`zh`, `en`, `ja`, …) or anything else.
 * @returns `'en'` unless the value names Chinese.
 */
export const normalizeLang = (value) => (typeof value === 'string'
  && value.trim().toLowerCase().startsWith('zh') ? 'zh' : 'en')

/**
 * Harness start/stop vocabulary, folded to the canonical keys the message
 * table is written against. `SubagentStopReason`, `workflow/end`'s
 * `stopReason`, and `turn/end`'s `reason.kind` all draw from this one set, so
 * one table serves every notification path.
 */
export const STATUS_KEYS = {
  completed: 'completed',
  aborted: 'aborted',
  error: 'error',
  'max-tokens': 'max-tokens',
  refusal: 'refusal',
  cancelled: 'cancelled',
  blocked: 'blocked',
  interrupted: 'interrupted',
}

/**
 * Canonical status key per message key. The attention channels seed
 * `item.status` with a label rather than a harness enum, and those seeds are
 * the CHINESE labels, so the reverse mapping is part of the published shape
 * (see `docs/notifications.md`).
 */
const STATUS_KEY_BY_MESSAGE = {
  completed: 'completed',
  aborted: 'aborted',
  error: 'error',
  'max-tokens': 'max-tokens',
  refusal: 'refusal',
  cancelled: 'cancelled',
  blocked: 'blocked',
  interrupted: 'interrupted',
  ended: 'ended',
  'needs-approval': 'needsApproval',
  'awaiting-answer': 'awaitingAnswer',
  'awaiting-confirm': 'awaitingConfirm',
  'needs-action': 'needsAction',
}

/** Chinese label → canonical key, so `statusLabel()` accepts either spelling. */
const STATUS_KEY_BY_LABEL = {
  完成: 'completed',
  中止: 'aborted',
  失败: 'error',
  超出上限: 'max-tokens',
  拒绝: 'refusal',
  取消: 'cancelled',
  阻塞: 'blocked',
  中断: 'interrupted',
  结束: 'ended',
  需要审批: 'needsApproval',
  等待回答: 'awaitingAnswer',
  等待确认: 'awaitingConfirm',
  需要处理: 'needsAction',
}

/**
 * Canonical key → message key. Both dictionaries carry every entry.
 */
const STATUS_MESSAGE_KEY = {
  completed: 'host.status.completed',
  aborted: 'host.status.aborted',
  error: 'host.status.error',
  'max-tokens': 'host.status.maxTokens',
  refusal: 'host.status.refusal',
  cancelled: 'host.status.cancelled',
  blocked: 'host.status.blocked',
  interrupted: 'host.status.interrupted',
  ended: 'host.status.ended',
  needsApproval: 'host.status.needsApproval',
  awaitingAnswer: 'host.status.awaitingAnswer',
  awaitingConfirm: 'host.status.awaitingConfirm',
  needsAction: 'host.status.needsAction',
}

/**
 * Fold any status spelling into a canonical key. Accepts a harness enum
 * (`completed`) and a historical Chinese label (`取消`), which is what the
 * attention channels store, so a Chinese toast is unchanged by this layer.
 * @param status - raw status value from an event payload or an item.
 * @returns a canonical status key, or null when nothing matches.
 */
const statusKey = (status) => {
  const raw = String(status)
  if (Object.prototype.hasOwnProperty.call(STATUS_KEYS, raw)) return STATUS_KEYS[raw]
  if (Object.prototype.hasOwnProperty.call(STATUS_KEY_BY_MESSAGE, raw)) return STATUS_KEY_BY_MESSAGE[raw]
  if (Object.prototype.hasOwnProperty.call(STATUS_KEY_BY_LABEL, raw)) return STATUS_KEY_BY_LABEL[raw]
  return null
}

/** `{name}` interpolation over an owned template string. */
const format = (template, params) => {
  if (params === undefined || params === null) return template
  return template.replace(/\{(\w+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
  ))
}

const zh = {
  // ── host: toast titles per notification kind ────────────────────────────────
  'host.title.done': 'Agent任务完成',
  'host.title.approval': '需要你的审批',
  'host.title.question': 'Agent 正在问你',
  'host.title.plan': '计划待你确认',
  'host.title.goal': '目标受阻',

  // ── host: status vocabulary ────────────────────────────────────────────────
  'host.status.completed': '完成',
  'host.status.aborted': '中止',
  'host.status.error': '失败',
  'host.status.maxTokens': '超出上限',
  'host.status.refusal': '拒绝',
  'host.status.cancelled': '取消',
  'host.status.blocked': '阻塞',
  'host.status.interrupted': '中断',
  'host.status.ended': '结束',
  'host.status.needsApproval': '需要审批',
  'host.status.awaitingAnswer': '等待回答',
  'host.status.awaitingConfirm': '等待确认',
  'host.status.needsAction': '需要处理',

  // ── host: body field labels and fallback names ─────────────────────────────
  'host.field.session': '会话：',
  'host.field.time': '时间：',
  'host.field.status': '描述：',
  'host.sessionFallback': 'Agent 回合',
  'host.subagentFallback': '子代理',
  'host.workflowFallback': '工作流',

  // ── host: detail lines ─────────────────────────────────────────────────────
  'host.detail.tool': '工具：{tool}',
  'host.detail.toolReason': '工具：{tool}，原因：{reason}',
  'host.detail.seeUi': '（请查看界面）',
  'host.detail.planTitle': '标题：{heading}',
  'host.detail.planUntitled': '（无标题）',
  'host.detail.planExcerpt': '摘要：{excerpt}',
  'host.detail.reason': '原因：{reason}',
  'host.detail.reasonUnknown': '（未提供原因）',

  // ── host: PushPlus channel outcomes ────────────────────────────────────────
  'host.push.networkFailed': '网络请求失败',
  'host.push.rejected': '推送被拒绝（检查 Token）',

  // ── host: the two test buttons ─────────────────────────────────────────────
  'host.test.pushDisabled': '请先开启推送并填写 Token',
  'host.test.session': '测试会话',
  'host.test.message': '测试消息',
  'host.test.notifyOk': 'Windows 通知正常',

  // ── host: toast transport failures ─────────────────────────────────────────
  'host.toast.exitCode': 'powershell 退出码 {code}',
  'host.toast.moduleMissing': 'BurntToast 未安装且自动安装失败：{reason}',
  'host.toast.pwshMissing': '未找到 PowerShell 7（pwsh.exe），无法显示系统通知',
  'host.toast.installTimeout': '安装 BurntToast 超时',
  'host.toast.timeout': 'Windows 通知显示超时',

  // ── ui: bell, panel chrome ─────────────────────────────────────────────────
  'ui.bell.title': '任务完成提醒',
  'ui.bell.pending': '任务完成提醒（同步中）',
  'ui.panel.title': '任务完成提醒',
  'ui.close': '关闭',
  'ui.language': '语言',

  // ── ui: rows ───────────────────────────────────────────────────────────────
  'ui.master': '总开关',
  'ui.group.kinds': '通知类型',
  'ui.group.push': '手机推送',
  'ui.kind.agent': '主回合',
  'ui.kind.subagent': '子代理',
  'ui.kind.workflow': '工作流',
  'ui.kind.approval': '需要审批',
  'ui.kind.question': '询问用户',
  'ui.kind.plan': '计划确认',
  'ui.kind.goal': '目标受阻',
  'ui.push.enable': 'PushPlus 推送',
  'ui.push.token': 'PushPlus Token',
  'ui.push.save': '保存 Token',
  'ui.test.notify': '测试 Windows 通知',
  'ui.test.push': '测试手机推送',

  // ── ui: notes ──────────────────────────────────────────────────────────────
  'ui.note.serviceNotReady': '服务未就绪',
  'ui.note.settingsNotLoaded': '设置尚未加载',
  'ui.note.unknownError': '未知错误',
  'ui.note.saveFailed': '保存失败：{error}',
  'ui.note.tokenSaved': 'Token 已保存',
  'ui.note.tokenSaveFailed': 'Token 保存失败：{error}',
  'ui.note.pushSent': '测试消息已发送，请查收',
  'ui.note.testFailed': '失败：{error}',
  'ui.note.toastShown': '已弹出 Windows 系统通知（含提示音）',
}

const en = {
  'host.title.done': 'Agent task finished',
  'host.title.approval': 'Approval needed',
  'host.title.question': 'Agent is asking you',
  'host.title.plan': 'Plan waiting for review',
  'host.title.goal': 'Goal blocked',

  'host.status.completed': 'Completed',
  'host.status.aborted': 'Aborted',
  'host.status.error': 'Failed',
  'host.status.maxTokens': 'Token limit',
  'host.status.refusal': 'Refused',
  'host.status.cancelled': 'Cancelled',
  'host.status.blocked': 'Blocked',
  'host.status.interrupted': 'Interrupted',
  'host.status.ended': 'Ended',
  'host.status.needsApproval': 'Approval required',
  'host.status.awaitingAnswer': 'Waiting for your answer',
  'host.status.awaitingConfirm': 'Waiting for confirmation',
  'host.status.needsAction': 'Action required',

  'host.field.session': 'Session: ',
  'host.field.time': 'Time: ',
  'host.field.status': 'Status: ',
  'host.sessionFallback': 'Agent session',
  'host.subagentFallback': 'Subagent',
  'host.workflowFallback': 'Workflow',

  'host.detail.tool': 'Tool: {tool}',
  'host.detail.toolReason': 'Tool: {tool}, reason: {reason}',
  'host.detail.seeUi': '(open the app to view)',
  'host.detail.planTitle': 'Title: {heading}',
  'host.detail.planUntitled': '(untitled)',
  'host.detail.planExcerpt': 'Summary: {excerpt}',
  'host.detail.reason': 'Reason: {reason}',
  'host.detail.reasonUnknown': '(no reason given)',

  'host.push.networkFailed': 'Network request failed',
  'host.push.rejected': 'Push rejected (check the token)',

  'host.test.pushDisabled': 'Enable push and enter a token first',
  'host.test.session': 'Test session',
  'host.test.message': 'Test message',
  'host.test.notifyOk': 'Windows notifications are working',

  'host.toast.exitCode': 'powershell exit code {code}',
  'host.toast.moduleMissing': 'BurntToast is not installed and auto-install failed: {reason}',
  'host.toast.pwshMissing': 'PowerShell 7 (pwsh.exe) was not found, so system notifications cannot be shown',
  'host.toast.installTimeout': 'Installing BurntToast timed out',
  'host.toast.timeout': 'Showing the Windows notification timed out',

  'ui.bell.title': 'Task completion reminders',
  'ui.bell.pending': 'Task completion reminders (syncing)',
  'ui.panel.title': 'Task completion reminders',
  'ui.close': 'Close',
  'ui.language': 'Language',

  'ui.master': 'Master switch',
  'ui.group.kinds': 'Notification types',
  'ui.group.push': 'Phone push',
  'ui.kind.agent': 'Main turn',
  'ui.kind.subagent': 'Subagent',
  'ui.kind.workflow': 'Workflow',
  'ui.kind.approval': 'Approval needed',
  'ui.kind.question': 'User question',
  'ui.kind.plan': 'Plan review',
  'ui.kind.goal': 'Goal blocked',
  'ui.push.enable': 'PushPlus push',
  'ui.push.token': 'PushPlus token',
  'ui.push.save': 'Save token',
  'ui.test.notify': 'Test Windows notification',
  'ui.test.push': 'Test phone push',

  'ui.note.serviceNotReady': 'Service not ready',
  'ui.note.settingsNotLoaded': 'Settings are not loaded yet',
  'ui.note.unknownError': 'Unknown error',
  'ui.note.saveFailed': 'Save failed: {error}',
  'ui.note.tokenSaved': 'Token saved',
  'ui.note.tokenSaveFailed': 'Saving the token failed: {error}',
  'ui.note.pushSent': 'Test message sent, please check',
  'ui.note.testFailed': 'Failed: {error}',
  'ui.note.toastShown': 'A Windows system notification was shown (with sound)',
}

/** Both dictionaries. Key sets are identical; `en` is the safety net. */
export const MESSAGES = { zh, en }

/**
 * Resolve one message for one language.
 * @param lang - any locale id; anything that is not Chinese resolves to English.
 * @param key - flat message key (`host.status.completed`, `ui.master`, …).
 * @param params - optional `{name}` placeholder values.
 * @returns the rendered text, or the key itself when the key is unknown.
 */
export const t = (lang, key, params) => {
  const table = normalizeLang(lang) === 'zh' ? zh : en
  const template = table[key]
  if (typeof template !== 'string') return String(key)
  return format(template, params)
}

/**
 * Localized label for a raw status value, folding harness enums and
 * historical Chinese labels into one key first. An unrecognized value passes
 * through verbatim (the pre-i18n fallback), so an unknown harness enum still
 * shows up in the toast instead of being silently relabelled.
 * @param status - raw status value.
 * @param lang - target language.
 * @returns the localized label, or the raw value when nothing matches.
 */
export const statusLabel = (status, lang) => {
  const key = statusKey(status)
  return key === null ? String(status) : t(lang, STATUS_MESSAGE_KEY[key])
}

/**
 * Localized title for one notification kind.
 * @param kind - `approval` | `question` | `plan` | `goal` | anything else (done).
 * @param lang - target language.
 * @returns the localized toast / push title.
 */
export const kindTitle = (kind, lang) => t(lang, kind === 'approval' ? 'host.title.approval'
  : kind === 'question' ? 'host.title.question'
    : kind === 'plan' ? 'host.title.plan'
      : kind === 'goal' ? 'host.title.goal'
        : 'host.title.done')

/**
 * The PushPlus / toast body lines: 会话 / 时间 / 描述 (+ optional detail).
 * @param item - owned queue item (`title`, `at`, `status`, optional `detail`).
 * @param lang - target language.
 * @returns the localized body lines, labels included.
 */
export const bodyLines = (item, lang) => {
  const lines = [
    t(lang, 'host.field.session') + item.title,
    t(lang, 'host.field.time') + fmtDate(item.at),
    t(lang, 'host.field.status') + statusLabel(item.status, lang),
  ]
  if (typeof item.detail === 'string' && item.detail !== '') lines.push(item.detail)
  return lines
}

/**
 * `2026/8/17 13:37:53` — a numeric, locale-neutral stamp. Deliberately not
 * `toLocaleString`: the toast body then reads identically on every machine,
 * matching the format documented in `docs/notifications.md`.
 * @param at - epoch milliseconds.
 * @returns the formatted timestamp.
 */
export const fmtDate = (at) => {
  const d = new Date(at)
  const p = (n) => (n < 10 ? '0' + n : String(n))
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate()
    + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}
