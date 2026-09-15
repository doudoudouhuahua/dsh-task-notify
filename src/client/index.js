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
 *   measuring their live DOM every animation frame (60fps drag following),
 * - copy follows the shared DSH locale preference, and the panel header
 *   carries a two-position switch that writes it (`locale.setLocale`), so the
 *   slider and 「设置 → 通用 → 语言」 are the same setting.
 *
 * The Host owns every durable fact; this half only renders what the Remote
 * returns and forwards user edits back through it.
 */
import React from 'react'
import { INVOCATIONS } from '../contract.js'
import { DEFAULT_LANG, MESSAGES, normalizeLang, t as translate } from '../i18n.js'
import { DICTS, NS } from './locales.js'

export const name = 'dsh-task-notify'
export const inject = ['remote', 'slots']

/**
 * Every message key this bundle knows. A translate result that is a member of
 * this set is the locale service echoing an unregistered key (or a missing
 * dictionary entry) rather than copy, which {@link t} then replaces with the
 * bundle's own table.
 */
const MESSAGE_KEYS = new Set(Object.keys(MESSAGES.zh))

/**
 * Build identity of this browser bundle. A stale bundle looks EXACTLY like a
 * working one until a feature is missing, so the running copy is made
 * self-describing: `window.__DSH_TASK_NOTIFY__` answers "which build is this
 * page actually executing?" without a source map. Bump it with the package
 * version so a support question has a one-word answer.
 */
const BUILD = '1.8.0'

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
  gap: 8px;
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

/* Two-position language slider: a compact switch that reads 中文 off and
   English on, so the active language is legible from the control itself
   rather than from a separate value label. */
.dtn_lang {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  width: 96px;
  height: 22px;
  margin: 0;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 11px;
  background: none;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.dtn_lang:hover { border-color: var(--dsw-alias-label-tertiary); }
.dtn_lang:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dtn_langTrack {
  position: absolute;
  inset: 2px;
  display: flex;
  align-items: center;
  border-radius: 9px;
  background: var(--dsw-alias-interactive-bg-hover);
  pointer-events: none;
}
.dtn_langLabel {
  flex: 1;
  z-index: 1;
  text-align: center;
  transition: color 0.15s ease;
}
.dtn_lang[data-lang='zh'] .dtn_langLabel[data-code='zh'],
.dtn_lang[data-lang='en'] .dtn_langLabel[data-code='en'] {
  color: var(--dsw-alias-label-primary-inverted);
}
.dtn_langThumb {
  position: absolute;
  top: 1px;
  left: 1px;
  width: calc(50% - 1px);
  height: calc(100% - 2px);
  border-radius: 8px;
  background: var(--dsw-alias-brand-primary);
  transition: transform 0.15s ease;
}
.dtn_lang[data-lang='en'] .dtn_langThumb { transform: translateX(100%); }

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

/**
 * Inject the panel stylesheet once, returning the disposer that removes it
 * again (the element is plugin-owned, so plugin unload must not leave it
 * behind). Re-entry after an HMR reload reuses the existing element.
 */
function adoptStyles() {
  if (document.getElementById(STYLE_ID) !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = cssText
  document.head.appendChild(style)
  return () => { style.remove() }
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
  ctx.effect(() => adoptStyles(), 'dsh-task-notify: styles')
  // Publish the running build for support and self-checking; removed on unload.
  try {
    window.__DSH_TASK_NOTIFY__ = { build: BUILD, hasLanguageSlider: true }
    ctx.effect(() => () => { try { delete window.__DSH_TASK_NOTIFY__ } catch { /* 忽略 */ } },
      'dsh-task-notify: build marker')
  } catch { /* 非浏览器环境忽略 */ }

  /**
   * The shared locale service, resolved ON DEMAND.
   *
   * Deliberately not `const locale = ctx.get('locale')`: a client plugin's
   * `apply()` runs as soon as its bundle is applied, and the locale plugin's
   * service may be provided only afterwards. Reading once at apply time
   * therefore froze `undefined` into this closure for the whole page lifetime
   * and silently disabled every locale feature (the shipped symptom was the
   * missing language slider). `inject: ['locale']` is NOT the fix either: that
   * would make a composition without the locale plugin leave this row WAITING,
   * taking the bell and the panel down with it. Resolving per use degrades
   * instead: the panel keeps working in Chinese and the slider appears as soon
   * as the service exists.
   * @returns the locale service, or undefined when this composition has none.
   */
  const localeService = () => {
    try {
      return ctx.get('locale')
    } catch {
      // A context that refuses the lookup behaves like an absent service.
      return undefined
    }
  }

  /**
   * Panel copy in the active language. `locale.bind(ns)` resolves through the
   * service on EVERY call (fallback chain included), so a language switch
   * reaches already-rendered text as soon as the next render happens.
   *
   * The result is checked before it is trusted: the service answers an unknown
   * key with the key itself, which is exactly what a namespace that has not
   * been registered yet does. Shipping raw keys into the panel (observed once
   * on the first open after a reload) is worse than shipping the wrong
   * language, so a result that still looks like a key falls back to this
   * bundle's own Chinese table. Every key is namespaced (`ui.*` / `host.*`),
   * so real copy can never be mistaken for one.
   * @param key - message key from the shared table.
   * @param params - optional `{name}` placeholder values.
   * @returns the localized text.
   */
  const t = (key, params) => {
    try {
      const locale = localeService()
      if (locale !== undefined && locale !== null) {
        const text = locale.bind(NS)(key, params)
        if (typeof text === 'string' && text !== '' && !MESSAGE_KEYS.has(text)) return text
      }
    } catch (error) {
      // A foreign or half-mounted service must not blank the whole panel.
      console.error('[dsh-task-notify] locale lookup failed:', error)
    }
    return translate(DEFAULT_LANG, key, params)
  }

  /**
   * The service instance while it is mounted, captured by {@link language} so
   * that a component rendered before the service existed still repaints with
   * it once it arrives.
   */
  let localeRef = null

  /** The active language, or the plugin default when the service is absent. */
  const activeLang = () => {
    try {
      const locale = localeService()
      if (locale === undefined || locale === null || typeof locale.getLocale !== 'function') {
        return DEFAULT_LANG
      }
      localeRef = locale
      const snapshot = locale.getLocale()
      const active = snapshot === null || snapshot === undefined ? undefined : snapshot.active
      return typeof active === 'string' && active !== '' ? normalizeLang(active) : DEFAULT_LANG
    } catch {
      return DEFAULT_LANG
    }
  }

  /** Point the shared preference at one of the two languages this plugin carries. */
  const setLang = (next) => {
    const locale = localeService() ?? localeRef
    if (locale === undefined || locale === null) return
    try {
      locale.setLocale(next)
    } catch (error) {
      // Both ids are built-in, so this only trips on an unmounted service.
      console.error('[dsh-task-notify] locale switch failed:', error)
    }
  }

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

  // Panel copy joins the shared language catalog. The service rejects a
  // REPEAT registration for the same language ("already has locale"), so the
  // re-entry path is handled explicitly instead of assumed: a reload that
  // loses a dictionary must never take the bell and panel down with it.
  // Registered once the service is reachable — `apply()` may well run first.
  let dictsRegistered = false
  const registerDicts = () => {
    if (dictsRegistered) return
    const locale = localeService()
    if (locale === undefined || locale === null) return
    try {
      locale.register(NS, DICTS)
      dictsRegistered = true
    } catch (error) {
      // Another instance already owns these dictionaries; keep the panel.
      console.error('[dsh-task-notify] dictionary registration skipped:', error)
      dictsRegistered = true
    }
  }
  registerDicts()
  ctx.effect(() => {
    registerDicts()
    return () => {}
  }, 'dsh-task-notify: dictionaries')
  // The switch repaints the panel, the bell tooltip and its slider thumb.
  ctx.effect(() => {
    const on = () => {
      registerDicts()
      emit()
    }
    const locale = localeService()
    const off = locale !== undefined && locale !== null && typeof locale.subscribe === 'function'
      ? locale.subscribe(on)
      : null
    ctx.on('locale/change', on)
    return () => {
      if (off !== null && off !== undefined) {
        try { off() } catch { /* 忽略 */ }
      }
      ctx.off('locale/change', on)
    }
  }, 'dsh-task-notify: locale refresh')

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
          // Same guards as the DOM branch above: a panel that is effectively
          // viewport-wide (narrow merged drawer) or taller than the viewport
          // must not become an inset, or the settings panel is pushed off
          // screen instead of merely overlapping the drawer.
          const panelWidth = Number(state.width) || 0
          if (state.panelOpen === true && panelWidth > 0 && panelWidth < window.innerWidth - 200) {
            right = Math.max(right, panelWidth)
          }
          const bottomHeight = Number(state.bottomHeight) || 0
          if (state.bottomOpen === true && bottomHeight > 0 && bottomHeight < window.innerHeight - 160) {
            bottom = Math.max(bottom, bottomHeight)
          }
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
  let unsubscribeInsets = null
  ctx.effect(() => {
    let rafId = 0
    const loop = () => {
      const better = ctx.get('betterSidebar')
      if (!insetSubscribed && better !== null && better !== undefined && typeof better.subscribeState === 'function') {
        insetSubscribed = true
        try {
          // Kept so the plugin owns the subscription: a discarded disposer
          // keeps this closure alive across unload / HMR reload.
          unsubscribeInsets = better.subscribeState(refreshInsets)
        } catch {
          insetSubscribed = false
          unsubscribeInsets = null
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
      const off = unsubscribeInsets
      unsubscribeInsets = null
      insetSubscribed = false
      if (off !== null && off !== undefined) {
        try { off() } catch { /* 忽略 */ }
      }
    }
  }, 'dsh-task-notify: layout insets')

  const unwrap = (result) => (result !== null && result !== undefined && result.ok === true) ? result.value : undefined

  /** Human text of a failed RemoteResult (its RemoteError carries message + code). */
  const remoteError = (result) => {
    const err = result === null || result === undefined ? undefined : result.error
    if (typeof err?.message === 'string' && err.message !== '') return err.message
    if (typeof err?.code === 'string' && err.code !== '') return err.code
    return t('ui.note.unknownError')
  }

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
    if (taskNotify === undefined) return { ok: false, error: t('ui.note.serviceNotReady') }
    try {
      const result = await taskNotify.updateSettings(update)
      if (result !== null && result !== undefined && result.ok === true) {
        setSettings(result.value)
        return { ok: true, value: result.value }
      }
      const err = result === null || result === undefined ? undefined : result.error
      const message = typeof err?.message === 'string' ? err.message
        : typeof err?.code === 'string' ? err.code : t('ui.note.unknownError')
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
      if (current === null || current === undefined) {
        return { ok: false, error: t('ui.note.settingsNotLoaded') }
      }
      return await saveSettings(Object.assign({}, current, { [key]: next }))
    }
    saveChain = saveChain.then(run, run)
    return saveChain
  }

  const testPush = async () => {
    if (taskNotify === undefined) return { ok: false, error: t('ui.note.serviceNotReady') }
    try {
      const result = await taskNotify.testPush()
      if (result !== null && result !== undefined && result.ok === true) {
        return unwrap(result) ?? { ok: true }
      }
      return { ok: false, error: remoteError(result) }
    } catch (error) {
      console.error('[dsh-task-notify] test push failed:', error)
      return { ok: false, error: String(error?.message ?? error ?? '') }
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
      title: settingsReady ? t('ui.bell.title') : t('ui.bell.pending'),
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

  /**
   * The language slider: a two-position switch whose own labels name the
   * languages, so the active one is readable from the control itself (the
   * thumb sits on 中文 or English). It writes the SHARED preference, which is
   * why flipping it also switches the DSH UI — the panel slider and
   * 「设置 → 通用 → 语言」 are one setting.
   *
   * Renders nothing when no locale service is mounted: a switch that cannot
   * change anything is worse than no switch.
   */
  function LangSwitch() {
    useSnapshot()
    // Resolved per render, never captured: the locale service may appear after
    // this plugin applied, and the slider must show up the moment it does.
    if (localeService() === undefined && localeRef === null) return null
    const lang = activeLang()
    const next = lang === 'zh' ? 'en' : 'zh'
    const label = (code, text) => React.createElement('span', {
      className: 'dtn_langLabel',
      key: code,
      'data-code': code,
    }, text)
    return React.createElement('button', {
      className: 'dtn_lang',
      type: 'button',
      role: 'switch',
      'data-lang': lang,
      'aria-checked': lang === 'en' ? 'true' : 'false',
      'aria-label': t('ui.language'),
      title: t('ui.language'),
      onClick: () => setLang(next),
    },
    React.createElement('span', { className: 'dtn_langTrack' },
      React.createElement('span', { className: 'dtn_langThumb' }),
      label('zh', '中文'),
      label('en', 'English')))
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
          setNote({ ok: false, text: t('ui.note.saveFailed', { error: String(outcome.error ?? '') }) })
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
        text: outcome.ok === true
          ? t('ui.note.tokenSaved')
          : t('ui.note.saveFailed', { error: String(outcome.error ?? '') }),
      })
      if (outcome.ok === true) setTokenDraft(null)
    }
    const test = async () => {
      // An unsaved token draft is persisted first, so testing the channel
      // right after pasting a token works without an extra save click.
      if (tokenDraft !== null) {
        const outcome = await saveSettings(Object.assign({}, settings, { token: tokenDraft }))
        if (outcome.ok !== true) {
          setNote({ ok: false, text: t('ui.note.tokenSaveFailed', { error: String(outcome.error ?? '') }) })
          return
        }
        setTokenDraft(null)
      }
      const result = await testPush()
      setNote({
        ok: result.ok === true,
        text: result.ok === true
          ? t('ui.note.pushSent')
          : t('ui.note.testFailed', { error: String(result.error ?? '') }),
      })
    }
    const testNotify = async () => {
      if (taskNotify === undefined) {
        setNote({ ok: false, text: t('ui.note.serviceNotReady') })
        return
      }
      try {
        // The panel's CURRENT language rides along, so the test toast matches
        // the slider immediately instead of the host's last synced value.
        const result = await taskNotify.testNotify(activeLang())
        if (result !== null && result !== undefined && result.ok === true) {
          const value = unwrap(result) ?? { ok: true }
          setNote({
            ok: value.ok === true,
            text: value.ok === true
              ? t('ui.note.toastShown')
              : t('ui.note.testFailed', { error: String(value.error ?? '') }),
          })
          return
        }
        setNote({ ok: false, text: t('ui.note.testFailed', { error: remoteError(result) }) })
      } catch (error) {
        console.error('[dsh-task-notify] test notify failed:', error)
        setNote({ ok: false, text: t('ui.note.testFailed', { error: String(error?.message ?? error ?? '') }) })
      }
    }
    return React.createElement('div', {
      className: 'dtn_panel',
      // `right` clears the better-sidebar right panel; the height cap clears
      // its bottom panel, which spans the centre column under this panel.
      style: {
        right: 16 + sidebarRight,
        maxHeight: 'calc(100vh - ' + (76 + sidebarBottom) + 'px)',
      },
    },
    React.createElement('div', { className: 'dtn_panelHead' },
      React.createElement('h4', { className: 'dtn_panelTitle' }, t('ui.panel.title')),
      React.createElement(LangSwitch),
      React.createElement('button', { className: 'dtn_close', title: t('ui.close'), onClick: () => setPanelOpen(false) }, '×')),
    section('master', false, [
      React.createElement('div', { className: 'dtn_row' },
        React.createElement('span', { className: 'dtn_rowLabel' }, t('ui.master')),
        React.createElement(Switch, { checked: masterOn, onChange: toggle('enabled') })),
    ]),
    group('kinds', true, t('ui.group.kinds'), [
      row('agent', t('ui.kind.agent')),
      row('subagent', t('ui.kind.subagent')),
      row('workflow', t('ui.kind.workflow')),
      row('approval', t('ui.kind.approval')),
      row('question', t('ui.kind.question')),
      row('plan', t('ui.kind.plan')),
      row('goal', t('ui.kind.goal')),
      React.createElement('button', { className: 'dtn_ghost dtn_testBtn', onClick: testNotify }, t('ui.test.notify')),
    ]),
    group('push', true, t('ui.group.push'), [
      React.createElement('div', { className: 'dtn_row' },
        React.createElement('span', { className: 'dtn_rowLabel' }, t('ui.push.enable')),
        React.createElement(Switch, { checked: settings.push === true, onChange: toggle('push') })),
      React.createElement('input', {
        className: 'dtn_input', type: 'password', placeholder: t('ui.push.token'),
        value: tokenText, onChange: setToken,
        onKeyDown: (event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void saveToken()
          }
        },
      }),
      React.createElement('button', { className: 'dtn_primary dtn_testBtn', onClick: () => { void saveToken() } }, t('ui.push.save')),
      React.createElement('button', { className: 'dtn_ghost dtn_testBtn', onClick: () => { void test() } }, t('ui.test.push')),
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
    label: t('ui.bell.title'),
  }, HeaderButton))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'task-notify-panel',
    order: 20,
  }, Panel))
}
