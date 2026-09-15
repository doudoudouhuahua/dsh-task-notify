/** Verify the built client bundle carries the bilingual message table. */
import { readFileSync } from 'node:fs'

const raw = readFileSync('lib/client.js', 'utf8')
const lower = raw.toLowerCase()
const esc = (s) => [...s]
  .map((c) => (c.charCodeAt(0) > 127 ? '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0') : c))
  .join('')
  .toLowerCase()

const probes = ['总开关', '任务完成提醒', '语言', '主回合', '保存 Token', 'Master switch', 'Language']
for (const probe of probes) {
  const hit = raw.includes(probe) ? 'literal' : lower.includes(esc(probe)) ? 'escaped' : 'MISSING'
  console.log('  ' + probe.padEnd(14), hit)
}
console.log('  ui.master key   :', raw.includes('ui.master') ? 'present' : 'MISSING')
console.log('  ui.language key :', raw.includes('ui.language') ? 'present' : 'MISSING')
console.log('  bundle bytes    :', raw.length)
