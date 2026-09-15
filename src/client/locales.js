/**
 * The panel's locale contribution: registered with the shared DSH locale
 * service (`@deepseek-ai/dsh-client-locale`) under the `taskNotify` namespace,
 * so `ctx.locale.bind(NS)('ui.master')` resolves panel copy in whatever
 * language the user picked — the same preference the bell panel's slider
 * writes, and the same one 「设置 → 通用 → 语言」 shows.
 *
 * Only `ui.*` keys live in the panel surface; the dictionary is projected out
 * of the shared message table in `../i18n.js` so the host's toast copy and the
 * panel's labels can never drift apart.
 */
import { MESSAGES } from '../i18n.js'

/** Namespace owning this plugin's browser copy. */
export const NS = 'taskNotify'

/** Panel copy per language, keyed exactly like the shared table. */
export const zh = MESSAGES.zh
export const en = MESSAGES.en

/**
 * Both dictionaries, in the shape `ctx.locale.register(ns, dicts)` accepts.
 * Registering both ids at once is idempotent per language: the service rejects
 * a repeat registration for the SAME language, which is why the client half
 * guards against re-entry instead of catching the error.
 */
export const DICTS = { zh, en }
