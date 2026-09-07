/**
 * dsh-task-notify client plugin: the browser half.
 *
 * - a ghost bell button in the session header action row (hollow when push is
 *   off, solid with a small smartphone silhouette when push is on) opening a
 *   minimal glass configuration panel,
 * - the panel lives in `shell.overlay`,
 * - the HOST fires every Windows toast / PushPlus push itself (the client
 *   only polls settings every 10s to keep the bell and panel in sync),
 * - the panel keeps clear of the dsh-better-sidebar right/bottom panels by
 *   measuring their live DOM every animation frame (60fps drag following).
 *
 * The Host owns every durable fact; this half only renders what the Remote
 * returns and forwards user edits back through it.
 */
import React from 'react'
import { INVOCATIONS } from '../contract.js'

export const name = 'dsh-task-notify'
export const inject = ['remote', 'slots']

const STYLE_ID = 'dsh-task-notify-style'

const cssText = `
.dtn_bell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.dtn_bell:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dtn_bell[data-on='true'] { color: var(--dsw-alias-brand-primary); }
.dtn_bell[data-open='true'] { background: var(--dsw-alias-interactive-bg-hover); }
.dtn_badge {
  position: absolute;
  top: -3px;
  right: -3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.5));
  pointer-events: none;
}

.dtn_panel {
  position: fixed;
  top: 58px;
  width: 296px;
  max-height: calc(100vh - 76px);
  padding: 6px 0;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-2);
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
  overflow-x: hidden;
  overflow-y: auto;
}
.dtn_panelHead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 14px;
}
.dtn_panelTitle {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 600;
}
.dtn_close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}
.dtn_close:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dtn_section { padding: 8px 14px; }
.dtn_section + .dtn_section { border-top: 1px solid var(--dsw-alias-border-l1); }
.dtn_section[data-disabled='true'] {
  opacity: 0.45;
  pointer-events: none;
}
.dtn_sectionLabel {
  display: block;
  margin: 0 0 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.dtn_group[data-disabled='true'] {
  opacity: 0.45;
  pointer-events: none;
}
.dtn_groupHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 14px;
  border: 0;
  background: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: left;
  cursor: pointer;
}
.dtn_groupHead:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dtn_groupChevron {
  flex: none;
  display: inline-flex;
  transition: transform 0.15s ease;
}
.dtn_group[data-open='true'] .dtn_groupChevron { transform: rotate(180deg); }
.dtn_groupBody {
  padding: 2px 14px 10px;
}
.dtn_testBtn {
  width: 100%;
  margin-top: 10px;
}
.dtn_row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
}
.dtn_rowLabel { color: var(--dsw-alias-label-primary); font-size: 13px; }

.dtn_switch {
  position: relative;
  display: inline-block;
  flex: none;
  width: 32px;
  height: 18px;
}
.dtn_switch input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.dtn_track {
  position: absolute;
  inset: 0;
  border-radius: 9px;
  background: var(--dsw-alias-interactive-bg-hover);
  transition: background 0.15s ease;
  pointer-events: none;
}
.dtn_switch input:checked + .dtn_track { background: var(--dsw-alias-brand-primary); }
.dtn_thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--dsw-alias-label-primary-inverted);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease;
  pointer-events: none;
}
.dtn_switch input:checked + .dtn_track .dtn_thumb { transform: translateX(14px); }

.dtn_input {
  box-sizing: border-box;
  width: 100%;
  height: 32px;
  margin-top: 8px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  outline: none;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: 12.5px;
  line-height: 30px;
}
.dtn_input:focus { border-color: var(--dsw-alias-brand-primary); }
.dtn_input::placeholder { color: var(--dsw-alias-label-tertiary); }

.dtn_primary {
  flex: 1;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-inverted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.dtn_primary:hover { filter: brightness(1.08); }
.dtn_ghost {
  flex: 1;
  height: 30px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: none;
  color: var(--dsw-alias-label-secondary);
  font-size: 12.5px;
  cursor: pointer;
}
.dtn_ghost:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dtn_note {
  margin: 8px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.dtn_note[data-ok='true'] { color: var(--dsw-alias-state-success-primary, #4caf7d); }
.dtn_note[data-ok='false'] { color: var(--dsw-alias-state-error-primary); }
`

function adoptStyles() {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = cssText
  document.head.appendChild(style)
}

// Collapsible-group open/closed state, persisted per browser so reopening the
// panel restores the user's LAST arrangement. First ever use: all collapsed.
const GROUPS_KEY = 'dsh-task-notify.groups'
const GROUP_DEFAULTS = { kinds: false, push: false }
const readGroups = () => {
  try {
    const raw = window.localStorage.getItem(GROUPS_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object'
      && typeof parsed.kinds === 'boolean' && typeof parsed.push === 'boolean') {
      return { kinds: parsed.kinds, push: parsed.push }
    }
  } catch { /* 读取失败按默认处理 */ }
  return null
}
const writeGroups = (state) => {
  try {
    window.localStorage.setItem(GROUPS_KEY, JSON.stringify(state))
  } catch { /* 存储不可用时静默（无记忆性，其余功能不受影响） */ }
}

/** Hollow line bell (Feather-style) for push-off, solid bell for push-on. */
function BellIcon(props) {
  const { solid, ...rest } = props
  if (solid === true) {
    return React.createElement('svg', Object.assign({
      width: 15, height: 15, viewBox: '0 0 24 24', fill: 'currentColor',
    }, rest),
    React.createElement('path', {
      d: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
    }))
  }
  return React.createElement('svg', Object.assign({
    width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
  }, rest),
  React.createElement('path', { d: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9' }),
  React.createElement('path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' }))
}

/** 11px smartphone silhouette for the push-enabled corner badge (no circle). */
function PhoneBadge() {
  return React.createElement('svg', { width: 11, height: 11, viewBox: '0 0 24 24', fill: 'currentColor' },
    React.createElement('path', {
      d: 'M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z',
    }))
}

/** Small chevron for the collapsible group headers (points down when open). */
function GroupChevron() {
  return React.createElement('svg', {
    className: 'dtn_groupChevron', width: 12, height: 12, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  },
  React.createElement('path', { d: 'M6 9l6 6 6-6' }))
}

export function apply(ctx) {
  adoptStyles()

  let taskNotify
  ctx.effect(async () => {
    const dispose = await ctx.remote.$mount({ package: 'dsh-task-notify', descriptors: INVOCATIONS })
    const reflect = ctx.reflect
    taskNotify = reflect === undefined ? undefined : reflect.get('remote.taskNotify')
    if (taskNotify === undefined) throw new Error('dsh-task-notify: the taskNotify Remote namespace did not mount')
    // First check: fetch settings as soon as the Remote is live, so the bell
    // shows the REAL state instead of the pre-load default (the 10s poll is
    // only a cross-tab / restart backstop).
    void loadSettings()
    return () => {
      taskNotify = undefined
      void dispose()
    }
  }, 'dsh-task-notify: remote')

  // Shared stores: panel open state, last settings, and the layout insets
  // needed to keep clear of dsh-better-sidebar's panels.
  let panelOpen = false
  let lastSettings = null
  // True only after at least one successful settings read/write; until then
  // the bell must NOT paint the default (solid) icon.
  let settingsReady = false
  let sidebarRight = 0
  let sidebarBottom = 0
  const listeners = new Set()
  const emit = () => { for (const l of listeners) l() }
  const setPanelOpen = (next) => { panelOpen = next; emit() }
  const setSettings = (next) => { lastSettings = next; settingsReady = true; emit() }
  const useSnapshot = () => {
    const [v, setV] = React.useState(0)
    React.useEffect(() => {
      const l = () => setV((n) => n + 1)
      listeners.add(l)
      return () => { listeners.delete(l) }
    }, [])
    return v
  }

  // Best-effort layout adaptation: measure the better-sidebar panels' live
  // DOM every animation frame, so the config panel follows even mid-drag
  // (the store only commits on pointer-up). Only vertically on-screen,
  // right-aligned elements count as the right panel; only horizontally
  // on-screen, bottom-aligned ones as the bottom panel — translated-away
  // hidden panels never contribute an inset.
  //
  // Since better-sidebar 0.17 the real panels live inside a full-viewport
  // `[data-dsh-panel-host]` wrapper (fixed; inset:0) that is the host's ONLY
  // direct child. Measuring host.children would see that wrapper, which
  // satisfies BOTH heuristics and yields `right ≈ innerWidth - 200` — the
  // settings panel is then pushed to the LEFT edge of the window. Measure
  // the actual panels by their `[data-dsh-panel]` markers instead, and
  // never count a full-viewport element as a panel (a 100vw drawer would
  // otherwise contribute the same bogus inset).
  let sidebarHost = null
  let hostCheckAt = 0
  const getSidebarHost = () => {
    if (sidebarHost !== null && sidebarHost.isConnected) return sidebarHost
    const now = performance.now()
    if (sidebarHost === null && now - hostCheckAt < 1000) return null
    hostCheckAt = now
    sidebarHost = document.querySelector('[data-dsh-better-sidebar]')
    return sidebarHost
  }
  const refreshInsets = () => {
    let right = 0
    let bottom = 0
    const host = getSidebarHost()
    if (host !== null && host !== undefined) {
      const width = window.innerWidth
      const height = window.innerHeight
      for (const child of host.querySelectorAll('[data-dsh-panel]')) {
        try {
          const rect = child.getBoundingClientRect()
          if (rect.width > 0 && rect.width < width && rect.height > 80
            && rect.top >= -8 && rect.top < height
            && rect.left >= 0 && rect.left < width
            && rect.right >= width - 2) {
            right = Math.max(right, Math.min(Math.round(width - rect.left), width - 200))
          }
          if (rect.width > 160 && rect.height > 0 && rect.height < height
            && rect.left >= -8 && rect.left < width
            && rect.top >= 0 && rect.top < height
            && rect.bottom >= height - 2) {
            bottom = Math.max(bottom, Math.min(Math.round(height - rect.top), height - 160))
          }
        } catch { /* 忽略 */ }
      }
    }
    const better = ctx.get('betterSidebar')
    if (better !== null && better !== undefined) {
      try {
        const snap = better.getSnapshot()
        const state = snap === null || snap === undefined ? undefined : snap.state
        if (state !== null && state !== undefined) {
          if (state.panelOpen === true) right = Math.max(right, Math.min(Number(state.width) || 0, window.innerWidth))
          if (state.bottomOpen === true) bottom = Math.max(bottom, Math.min(Number(state.bottomHeight) || 0, window.innerHeight))
        }
      } catch { /* 忽略 */ }
    }
    if (sidebarRight !== right || sidebarBottom !== bottom) {
      sidebarRight = right
      sidebarBottom = bottom
      emit()
    }
  }
  // 60fps requestAnimationFrame loop; cheap when nothing changes.
  let insetSubscribed = false
  ctx.effect(() => {
    let rafId = 0
    const loop = () => {
      const better = ctx.get('betterSidebar')
      if (!insetSubscribed && better !== null && better !== undefined && typeof better.subscribeState === 'function') {
        insetSubscribed = true
        try {
          better.subscribeState(refreshInsets)
        } catch {
          insetSubscribed = false
        }
      }
      refreshInsets()
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    refreshInsets()
    const onResize = () => refreshInsets()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, 'dsh-task-notify: layout insets')

  const unwrap = (result) => (result !== null && result !== undefined && result.ok === true) ? result.value : undefined

  async function loadSettings() {
    if (taskNotify === undefined) return
    try {
      const value = unwrap(await taskNotify.getSettings())
      if (value !== undefined) setSettings(value)
    } catch (error) {
      console.error('[dsh-task-notify] settings read failed:', error)
    }
  }

  const saveSettings = async (update) => {
    if (taskNotify === undefined) return { ok: false, error: '服务未就绪' }
    try {
      const result = await taskNotify.updateSettings(update)
      if (result !== null && result !== undefined && result.ok === true) {
        setSettings(result.value)
        return { ok: true, value: result.value }
      }
      const err = result === null || result === undefined ? undefined : result.error
      const message = typeof err?.message === 'string' ? err.message : typeof err?.code === 'string' ? err.code : '未知错误'
      console.error('[dsh-task-notify] settings update failed:', err)
      return { ok: false, error: String(message) }
    } catch (error) {
      console.error('[dsh-task-notify] settings update failed:', error)
      return { ok: false, error: String(error?.message ?? error ?? '') }
    }
  }

  // Instant-save queue: one toggle → one write, no manual save. The strict
  // wire codec needs a COMPLETE settings object, so each queued save rebuilds
  // the snapshot at execution time (after the previous write landed and
  // refreshed lastSettings) — rapid toggles never overwrite each other with
  // a stale snapshot.
  let saveChain = Promise.resolve()
  const instantSave = (key, next) => {
    const run = async () => {
      const current = settingsReady ? lastSettings : null
      if (current === null || current === undefined) return { ok: false, error: '设置尚未加载' }
      return await saveSettings(Object.assign({}, current, { [key]: next }))
    }
    saveChain = saveChain.then(run, run)
    return saveChain
  }

  const testPush = async () => {
    if (taskNotify === undefined) return { ok: false, error: '服务未就绪' }
    try {
      const value = unwrap(await taskNotify.testPush())
      return value ?? { ok: false, error: '服务未就绪' }
    } catch (error) {
      console.error('[dsh-task-notify] test push failed:', error)
      return { ok: false, error: String(error ?? '') }
    }
  }

  // Poll the host queue every 2.5s and raise one Windows notification per item.
  // Periodic settings refresh: the Host owns all state (Windows toast and
  // PushPlus fire there), so this only keeps the bell and panel in sync
  // across tabs and after host restarts.
  ctx.effect(() => {
    const timer = setInterval(() => { void loadSettings() }, 10000)
    void loadSettings()
    return () => clearInterval(timer)
  }, 'dsh-task-notify: settings refresh')

  // Outside-left-click dismissal: while the panel is open, a left pointerdown
  // outside BOTH the panel and every bell closes it. The bell row is excluded
  // so its own onClick keeps the open/close toggle; everything inside the
  // panel (×, switches, inputs) keeps working untouched. Same semantics as
  // the harness's useDismissOnOutsidePointer (pointerdown — immediate),
  // adapted for trigger and surface living in different DOM roots.
  ctx.effect(() => {
    const onPointerDown = (event) => {
      if (!panelOpen) return
      if (event.button !== 0) return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.dtn_panel') !== null) return
      if (target.closest('.dtn_bell') !== null) return
      setPanelOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown) }
  }, 'dsh-task-notify: outside-pointer close')

  function HeaderButton() {
    useSnapshot()
    const settings = lastSettings
    // Until the first successful settings read the bell must stay neutral
    // (hollow, no badge) — the pre-load default must never claim a state the
    // host has not confirmed yet.
    const enabled = settingsReady && settings?.enabled !== false
    const pushOn = settingsReady && enabled && settings?.push === true
    return React.createElement('button', {
      className: 'dtn_bell',
      title: settingsReady ? '任务完成提醒' : '任务完成提醒（同步中）',
      'data-on': enabled ? 'true' : 'false',
      'data-ready': settingsReady ? 'true' : 'false',
      'data-open': panelOpen ? 'true' : 'false',
      onClick: () => setPanelOpen(!panelOpen),
    },
    React.createElement(BellIcon, { solid: enabled }),
    pushOn
      ? React.createElement('span', { className: 'dtn_badge' }, React.createElement(PhoneBadge))
      : null)
  }

  function Switch({ checked, onChange }) {
    return React.createElement('label', { className: 'dtn_switch' },
      React.createElement('input', { type: 'checkbox', checked: checked === true, onChange }),
      React.createElement('span', { className: 'dtn_track' },
        React.createElement('span', { className: 'dtn_thumb' })))
  }

  function Panel() {
    useSnapshot()
    const [note, setNote] = React.useState(null)
    // Token draft: typed text is held locally until 「保存 Token」 — text needs
    // an explicit save; every switch instead persists on the spot (no manual
    // save button for them).
    const [tokenDraft, setTokenDraft] = React.useState(null)
    // null = derive defaults from the current settings on every render; the
    // first user toggle freezes an explicit open/closed choice.
    const [groups, setGroups] = React.useState(null)
    React.useEffect(() => {
      if (panelOpen) {
        setNote(null)
        setTokenDraft(null)
        // Forget the in-memory choice so this open re-reads the persisted one
        // (also picks up changes made in other tabs since the last open).
        setGroups(null)
        void loadSettings()
      }
    }, [panelOpen])
    if (!panelOpen) return null
    const settings = lastSettings ?? {
      push: false, token: '', enabled: true, agent: false, subagent: true, workflow: true,
      approval: true, question: true, plan: true, goal: true,
    }
    const masterOn = settings.enabled !== false
    const tokenText = tokenDraft ?? settings.token ?? ''
    // Open/closed per the persisted arrangement; first ever use is all
    // collapsed (GROUP_DEFAULTS). While `groups` is null the read happens on
    // render, so the remembered state paints on the very first frame.
    const groupState = groups ?? readGroups() ?? GROUP_DEFAULTS
    const toggleGroup = (key) => {
      const next = Object.assign({}, groupState, { [key]: !groupState[key] })
      setGroups(next)
      writeGroups(next)
    }
    // Switch → immediate write through the serialized save queue. No draft,
    // no save click; the controlled switch only flips once the host confirms,
    // and a failed write shows a note instead (state stays on the host value).
    const toggle = (key) => (event) => {
      const next = event.target.checked === true
      void instantSave(key, next).then((outcome) => {
        if (outcome.ok !== true) {
          setNote({ ok: false, text: '保存失败：' + String(outcome.error ?? '') })
        }
      })
    }
    const setToken = (event) => setTokenDraft(event.target.value)
    const row = (key, labelText) => React.createElement('div', { className: 'dtn_row', key },
      React.createElement('span', { className: 'dtn_rowLabel' }, labelText),
      React.createElement(Switch, { checked: settings[key] === true, onChange: toggle(key) }))
    const section = (key, dim, children) => React.createElement('div', {
      className: 'dtn_section',
      key,
      'data-disabled': dim && !masterOn ? 'true' : 'false',
    }, ...children)
    const group = (key, dim, labelText, children) => {
      const open = groupState[key] === true
      return React.createElement('div', {
        className: 'dtn_group',
        key,
        'data-open': open ? 'true' : 'false',
        'data-disabled': dim && !masterOn ? 'true' : 'false',
      },
      React.createElement('button', {
        className: 'dtn_groupHead', type: 'button',
        'aria-expanded': open ? 'true' : 'false',
        onClick: () => toggleGroup(key),
      },
      React.createElement('span', null, labelText),
      React.createElement(GroupChevron)),
      open
        ? React.createElement('div', { className: 'dtn_groupBody' }, ...children)
        : null)
    }
    const saveToken = async () => {
      const outcome = await saveSettings(Object.assign({}, settings, { token: tokenText }))
      setNote({
        ok: outcome.ok === true,
        text: outcome.ok === true ? 'Token 已保存' : '保存失败：' + String(outcome.error ?? ''),
      })
      if (outcome.ok === true) setTokenDraft(null)
    }
    const test = async () => {
      // An unsaved token draft is persisted first, so testing the channel
      // right after pasting a token works without an extra save click.
      if (tokenDraft !== null) {
        const outcome = await saveSettings(Object.assign({}, settings, { token: tokenDraft }))
        if (outcome.ok !== true) {
          setNote({ ok: false, text: 'Token 保存失败：' + String(outcome.error ?? '') })
          return
        }
        setTokenDraft(null)
      }
      const result = await testPush()
      setNote({ ok: result.ok === true, text: result.ok === true ? '测试消息已发送，请查收' : '失败：' + String(result.error ?? '') })
    }
    const testNotify = async () => {
      if (taskNotify === undefined) {
        setNote({ ok: false, text: '服务未就绪' })
        return
      }
      try {
        const value = unwrap(await taskNotify.testNotify())
        const result = value ?? { ok: false, error: '服务未就绪' }
        setNote({
          ok: result.ok === true,
          text: result.ok === true ? '已弹出 Windows 系统通知（含提示音）' : '失败：' + String(result.error ?? ''),
        })
      } catch (error) {
        console.error('[dsh-task-notify] test notify failed:', error)
        setNote({ ok: false, text: '失败：' + String(error?.message ?? error ?? '') })
      }
    }
    return React.createElement('div', {
      className: 'dtn_panel',
      style: { right: 16 + sidebarRight },
    },
    React.createElement('div', { className: 'dtn_panelHead' },
      React.createElement('h4', { className: 'dtn_panelTitle' }, '任务完成提醒'),
      React.createElement('button', { className: 'dtn_close', title: '关闭', onClick: () => setPanelOpen(false) }, '×')),
    section('master', false, [
      React.createElement('div', { className: 'dtn_row' },
        React.createElement('span', { className: 'dtn_rowLabel' }, '总开关'),
        React.createElement(Switch, { checked: masterOn, onChange: toggle('enabled') })),
    ]),
    group('kinds', true, '通知类型', [
      row('agent', '主回合'),
      row('subagent', '子代理'),
      row('workflow', '工作流'),
      row('approval', '需要审批'),
      row('question', '询问用户'),
      row('plan', '计划确认'),
      row('goal', '目标受阻'),
      React.createElement('button', { className: 'dtn_ghost dtn_testBtn', onClick: testNotify }, '测试 Windows 通知'),
    ]),
    group('push', true, '手机推送', [
      React.createElement('div', { className: 'dtn_row' },
        React.createElement('span', { className: 'dtn_rowLabel' }, 'PushPlus 推送'),
        React.createElement(Switch, { checked: settings.push === true, onChange: toggle('push') })),
      React.createElement('input', {
        className: 'dtn_input', type: 'password', placeholder: 'PushPlus Token',
        value: tokenText, onChange: setToken,
        onKeyDown: (event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void saveToken()
          }
        },
      }),
      React.createElement('button', { className: 'dtn_primary dtn_testBtn', onClick: () => { void saveToken() } }, '保存 Token'),
      React.createElement('button', { className: 'dtn_ghost dtn_testBtn', onClick: () => { void test() } }, '测试手机推送'),
    ]),
    // Results and errors (switch saves, token save, test outcomes) land here,
    // never dimmed, empty when nothing happened.
    React.createElement('div', { className: 'dtn_section' },
      note === null ? null : React.createElement('p', { className: 'dtn_note', 'data-ok': note.ok ? 'true' : 'false' }, note.text)))
  }

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'task-notify',
    order: 30,
    label: '任务提醒',
  }, HeaderButton))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'task-notify-panel',
    order: 20,
  }, Panel))
}
