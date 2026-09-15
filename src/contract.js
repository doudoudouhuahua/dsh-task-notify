/**
 * The taskNotify wire contract, shared verbatim by the host manifest
 * (`ctx.typert.register` in src/index.js) and the client contribution
 * (`ctx.remote.$mount` in src/client/index.js). Every boundary carries a
 * STRICT codec: the client-side gateway refuses src-json descriptors
 * (`requireStrictDescriptor`), so loose codecs break the client mount.
 *
 * Codec schemas are hand-rolled `TypertSchema` objects (a `parse` method is
 * the whole runtime contract) — no zod dependency, so both bundles stay tiny.
 *
 * A strict codec hands the schema over through a `create()` factory, never as
 * a ready-made `schema` value: DSH materializes boundary schemas lazily
 * (`perf(typert): materialize generated schemas on first use`) and both the
 * Typert registry and the Gateway on either face reject a strict codec whose
 * `create` is not a function — a bare `schema` field fails the host manifest
 * registration with `strict codec has no create() factory`.
 */

const fail = (path, expected) => {
  throw new Error(`dsh-task-notify: invalid ${path} (expected ${expected})`)
}
const isBool = (value) => typeof value === 'boolean'
const isStr = (value) => typeof value === 'string'
const isNum = (value) => typeof value === 'number' && Number.isFinite(value)
const isObj = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Durable settings section shape (host and client share it). */
const settingsSchema = {
  parse(value) {
    if (!isObj(value)) fail('settings', 'object')
    for (const key of ['push', 'agent', 'subagent', 'workflow', 'approval', 'question', 'plan', 'goal']) {
      if (!isBool(value[key])) fail('settings.' + key, 'boolean')
    }
    if (value.enabled !== undefined && !isBool(value.enabled)) fail('settings.enabled', 'boolean')
    if (!isStr(value.token)) fail('settings.token', 'string')
    return {
      push: value.push,
      token: value.token,
      // Absent `enabled` (pre-restart host, which lacks the field) means on.
      enabled: value.enabled === undefined ? true : value.enabled,
      agent: value.agent,
      subagent: value.subagent,
      workflow: value.workflow,
      approval: value.approval,
      question: value.question,
      plan: value.plan,
      goal: value.goal,
    }
  },
}

const ITEM_KINDS = ['subagent', 'workflow', 'agent', 'test', 'approval', 'question', 'plan', 'goal']

/** One notification item, owned JSON produced by the Host. */
const itemSchema = {
  parse(value) {
    if (!isObj(value)) fail('item', 'object')
    if (!ITEM_KINDS.includes(value.kind)) fail('item.kind', 'subagent|workflow|agent|test|approval|question|plan|goal')
    if (!isStr(value.title)) fail('item.title', 'string')
    if (!isStr(value.status)) fail('item.status', 'string')
    if (!isNum(value.at)) fail('item.at', 'number')
    const item = { kind: value.kind, title: value.title, status: value.status, at: value.at }
    // Optional detail line (tool name / question text / escalation reason).
    if (value.detail !== undefined) {
      if (!isStr(value.detail)) fail('item.detail', 'string')
      item.detail = value.detail
    }
    return item
  },
}

/** The pending-queue result of `next()`. */
const itemListSchema = {
  parse(value) {
    if (!Array.isArray(value)) fail('items', 'array')
    return value.map((item) => itemSchema.parse(item))
  },
}

/** testPush outcome. */
const testResultSchema = {
  parse(value) {
    if (!isObj(value)) fail('testResult', 'object')
    if (!isBool(value.ok)) fail('testResult.ok', 'boolean')
    const result = { ok: value.ok }
    if (value.error !== undefined) {
      if (!isStr(value.error)) fail('testResult.error', 'string')
      result.error = value.error
    }
    return result
  },
}

/**
 * One STRICT codec descriptor for a hand-rolled schema.
 *
 * DSH materializes boundary schemas on first use, so a strict codec carries a
 * `create()` factory returning the schema rather than the schema itself. The
 * factory caches its one schema: the registry and both Gateway faces may call
 * `create()` per boundary crossing, and the schema is stateless, so every
 * caller can share the same instance.
 * @param typeSymbol - canonical Host/wire type symbol for this boundary.
 * @param schema - the hand-rolled `TypertSchema` (a `parse` method).
 * @returns the strict codec descriptor consumed by the host and client manifests.
 */
const strictCodec = (typeSymbol, schema) => {
  let cached
  return {
    mode: 'strict',
    typeSymbol,
    create: () => (cached === undefined ? (cached = schema) : cached),
  }
}

/** The taskNotify Remote namespace's strict invocation descriptors. */
export const INVOCATIONS = [
  {
    id: 'dsh-task-notify#taskNotify/getSettings',
    service: 'taskNotify',
    namespace: 'taskNotify',
    method: 'getSettings',
    invocation: { kind: 'direct' },
    parameters: [],
    result: strictCodec('dsh-task-notify#TaskNotifySettings', settingsSchema),
  },
  {
    id: 'dsh-task-notify#taskNotify/updateSettings',
    service: 'taskNotify',
    namespace: 'taskNotify',
    method: 'updateSettings',
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'update',
        wire: 'update',
        source: 'json',
        codec: strictCodec('dsh-task-notify#TaskNotifySettings', settingsSchema),
      },
    ],
    result: strictCodec('dsh-task-notify#TaskNotifySettings', settingsSchema),
  },
  {
    id: 'dsh-task-notify#taskNotify/next',
    service: 'taskNotify',
    namespace: 'taskNotify',
    method: 'next',
    invocation: { kind: 'direct' },
    parameters: [],
    result: strictCodec('dsh-task-notify#TaskNotifyItem[]', itemListSchema),
  },
  {
    id: 'dsh-task-notify#taskNotify/testPush',
    service: 'taskNotify',
    namespace: 'taskNotify',
    method: 'testPush',
    invocation: { kind: 'direct' },
    parameters: [],
    result: strictCodec('dsh-task-notify#TaskNotifyTestResult', testResultSchema),
  },
  {
    id: 'dsh-task-notify#taskNotify/testNotify',
    service: 'taskNotify',
    namespace: 'taskNotify',
    method: 'testNotify',
    invocation: { kind: 'direct' },
    parameters: [],
    result: strictCodec('dsh-task-notify#TaskNotifyTestResult', testResultSchema),
  },
]

/** The taskNotify namespace's strict host manifest (shared with the client). */
export const TYPERT_MANIFEST = {
  package: 'dsh-task-notify',
  face: 'host',
  schemas: [],
  model: {
    services: [
      {
        key: 'taskNotify',
        exportName: 'TaskNotifyRuntime',
        description: 'Agent/subagent/workflow completion, approval-required, user-question, plan-review, and goal-blocked notification queue, PushPlus push, and durable settings.',
        tags: [],
        members: [
          { kind: 'method', name: 'getSettings', signature: 'getSettings(): TaskNotifySettings' },
          { kind: 'method', name: 'updateSettings', signature: 'updateSettings(update: object): Promise<TaskNotifySettings>' },
          { kind: 'method', name: 'next', signature: 'next(): TaskNotifyItem[]' },
          { kind: 'method', name: 'testPush', signature: 'testPush(): Promise<{ ok: boolean; error?: string }>' },
          { kind: 'method', name: 'testNotify', signature: 'testNotify(): Promise<{ ok: boolean; error?: string }>' },
        ],
        types: [],
      },
    ],
    events: [],
    objects: [],
  },
  invocations: INVOCATIONS,
}
