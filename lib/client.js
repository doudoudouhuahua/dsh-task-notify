window.__ModuleLoader__.load({ id: 'dsh-task-notify', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var Te=Object.create;var j=Object.defineProperty;var Ae=Object.getOwnPropertyDescriptor;var Le=Object.getOwnPropertyNames;var Ce=Object.getPrototypeOf,ze=Object.prototype.hasOwnProperty;var Pe=(e,a)=>{for(var o in a)j(e,o,{get:a[o],enumerable:!0})},re=(e,a,o,k)=>{if(a&&typeof a=="object"||typeof a=="function")for(let g of Le(a))!ze.call(e,g)&&g!==o&&j(e,g,{get:()=>a[g],enumerable:!(k=Ae(a,g))||k.enumerable});return e};var je=(e,a,o)=>(o=e!=null?Te(Ce(e)):{},re(a||!e||!e.__esModule?j(o,"default",{value:e,enumerable:!0}):o,e)),Fe=e=>re(j({},"__esModule",{value:!0}),e);var ot={};Pe(ot,{apply:()=>nt,inject:()=>He,name:()=>We});module.exports=Fe(ot);var s=je(require("react"),1);var p=(e,a)=>{throw new Error(`dsh-task-notify: invalid ${e} (expected ${a})`)},J=e=>typeof e=="boolean",_=e=>typeof e=="string",Oe=e=>typeof e=="number"&&Number.isFinite(e),X=e=>e!==null&&typeof e=="object"&&!Array.isArray(e),$={parse(e){X(e)||p("settings","object");for(let a of["push","agent","subagent","workflow","approval","question","plan","goal"])J(e[a])||p("settings."+a,"boolean");return e.enabled!==void 0&&!J(e.enabled)&&p("settings.enabled","boolean"),_(e.token)||p("settings.token","string"),{push:e.push,token:e.token,enabled:e.enabled===void 0?!0:e.enabled,agent:e.agent,subagent:e.subagent,workflow:e.workflow,approval:e.approval,question:e.question,plan:e.plan,goal:e.goal}}},Me=["subagent","workflow","agent","test","approval","question","plan","goal"],Re={parse(e){X(e)||p("item","object"),Me.includes(e.kind)||p("item.kind","subagent|workflow|agent|test|approval|question|plan|goal"),_(e.title)||p("item.title","string"),_(e.status)||p("item.status","string"),Oe(e.at)||p("item.at","number");let a={kind:e.kind,title:e.title,status:e.status,at:e.at};return e.detail!==void 0&&(_(e.detail)||p("item.detail","string"),a.detail=e.detail),a}},Be={parse(e){return Array.isArray(e)||p("items","array"),e.map(a=>Re.parse(a))}},ie={parse(e){X(e)||p("testResult","object"),J(e.ok)||p("testResult.ok","boolean");let a={ok:e.ok};return e.error!==void 0&&(_(e.error)||p("testResult.error","string"),a.error=e.error),a}},Ie="zh",qe={parse(e){if(e==null)return Ie;if(e==="zh"||e==="en")return e;p("lang","'zh' | 'en'")}},y=(e,a)=>{let o;return{mode:"strict",typeSymbol:e,create:()=>o===void 0?o=a:o}},le=[{id:"dsh-task-notify#taskNotify/getSettings",service:"taskNotify",namespace:"taskNotify",method:"getSettings",invocation:{kind:"direct"},parameters:[],result:y("dsh-task-notify#TaskNotifySettings",$)},{id:"dsh-task-notify#taskNotify/updateSettings",service:"taskNotify",namespace:"taskNotify",method:"updateSettings",invocation:{kind:"direct"},parameters:[{name:"update",wire:"update",source:"json",codec:y("dsh-task-notify#TaskNotifySettings",$)}],result:y("dsh-task-notify#TaskNotifySettings",$)},{id:"dsh-task-notify#taskNotify/next",service:"taskNotify",namespace:"taskNotify",method:"next",invocation:{kind:"direct"},parameters:[],result:y("dsh-task-notify#TaskNotifyItem[]",Be)},{id:"dsh-task-notify#taskNotify/testPush",service:"taskNotify",namespace:"taskNotify",method:"testPush",invocation:{kind:"direct"},parameters:[],result:y("dsh-task-notify#TaskNotifyTestResult",ie)},{id:"dsh-task-notify#taskNotify/testNotify",service:"taskNotify",namespace:"taskNotify",method:"testNotify",invocation:{kind:"direct"},parameters:[{name:"lang",wire:"lang",source:"json",codec:y("dsh-task-notify#TaskNotifyLanguage",qe)}],result:y("dsh-task-notify#TaskNotifyTestResult",ie)}];var Q=e=>typeof e=="string"&&e.trim().toLowerCase().startsWith("zh")?"zh":"en";var De=(e,a)=>a==null?e:e.replace(/\{(\w+)\}/g,(o,k)=>Object.prototype.hasOwnProperty.call(a,k)?String(a[k]):o),de={"host.title.done":"Agent\u4EFB\u52A1\u5B8C\u6210","host.title.approval":"\u9700\u8981\u4F60\u7684\u5BA1\u6279","host.title.question":"Agent \u6B63\u5728\u95EE\u4F60","host.title.plan":"\u8BA1\u5212\u5F85\u4F60\u786E\u8BA4","host.title.goal":"\u76EE\u6807\u53D7\u963B","host.status.completed":"\u5B8C\u6210","host.status.aborted":"\u4E2D\u6B62","host.status.error":"\u5931\u8D25","host.status.maxTokens":"\u8D85\u51FA\u4E0A\u9650","host.status.refusal":"\u62D2\u7EDD","host.status.cancelled":"\u53D6\u6D88","host.status.blocked":"\u963B\u585E","host.status.interrupted":"\u4E2D\u65AD","host.status.ended":"\u7ED3\u675F","host.status.needsApproval":"\u9700\u8981\u5BA1\u6279","host.status.awaitingAnswer":"\u7B49\u5F85\u56DE\u7B54","host.status.awaitingConfirm":"\u7B49\u5F85\u786E\u8BA4","host.status.needsAction":"\u9700\u8981\u5904\u7406","host.field.session":"\u4F1A\u8BDD\uFF1A","host.field.time":"\u65F6\u95F4\uFF1A","host.field.status":"\u63CF\u8FF0\uFF1A","host.sessionFallback":"Agent \u56DE\u5408","host.subagentFallback":"\u5B50\u4EE3\u7406","host.workflowFallback":"\u5DE5\u4F5C\u6D41","host.detail.tool":"\u5DE5\u5177\uFF1A{tool}","host.detail.toolReason":"\u5DE5\u5177\uFF1A{tool}\uFF0C\u539F\u56E0\uFF1A{reason}","host.detail.seeUi":"\uFF08\u8BF7\u67E5\u770B\u754C\u9762\uFF09","host.detail.planTitle":"\u6807\u9898\uFF1A{heading}","host.detail.planUntitled":"\uFF08\u65E0\u6807\u9898\uFF09","host.detail.planExcerpt":"\u6458\u8981\uFF1A{excerpt}","host.detail.reason":"\u539F\u56E0\uFF1A{reason}","host.detail.reasonUnknown":"\uFF08\u672A\u63D0\u4F9B\u539F\u56E0\uFF09","host.push.networkFailed":"\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25","host.push.rejected":"\u63A8\u9001\u88AB\u62D2\u7EDD\uFF08\u68C0\u67E5 Token\uFF09","host.test.pushDisabled":"\u8BF7\u5148\u5F00\u542F\u63A8\u9001\u5E76\u586B\u5199 Token","host.test.session":"\u6D4B\u8BD5\u4F1A\u8BDD","host.test.message":"\u6D4B\u8BD5\u6D88\u606F","host.test.notifyOk":"Windows \u901A\u77E5\u6B63\u5E38","host.toast.exitCode":"powershell \u9000\u51FA\u7801 {code}","host.toast.moduleMissing":"BurntToast \u672A\u5B89\u88C5\u4E14\u81EA\u52A8\u5B89\u88C5\u5931\u8D25\uFF1A{reason}","host.toast.pwshMissing":"\u672A\u627E\u5230 PowerShell 7\uFF08pwsh.exe\uFF09\uFF0C\u65E0\u6CD5\u663E\u793A\u7CFB\u7EDF\u901A\u77E5","host.toast.installTimeout":"\u5B89\u88C5 BurntToast \u8D85\u65F6","host.toast.timeout":"Windows \u901A\u77E5\u663E\u793A\u8D85\u65F6","ui.bell.title":"\u4EFB\u52A1\u5B8C\u6210\u63D0\u9192","ui.bell.pending":"\u4EFB\u52A1\u5B8C\u6210\u63D0\u9192\uFF08\u540C\u6B65\u4E2D\uFF09","ui.panel.title":"\u4EFB\u52A1\u5B8C\u6210\u63D0\u9192","ui.close":"\u5173\u95ED","ui.language":"\u8BED\u8A00","ui.master":"\u603B\u5F00\u5173","ui.group.kinds":"\u901A\u77E5\u7C7B\u578B","ui.group.push":"\u624B\u673A\u63A8\u9001","ui.kind.agent":"\u4E3B\u56DE\u5408","ui.kind.subagent":"\u5B50\u4EE3\u7406","ui.kind.workflow":"\u5DE5\u4F5C\u6D41","ui.kind.approval":"\u9700\u8981\u5BA1\u6279","ui.kind.question":"\u8BE2\u95EE\u7528\u6237","ui.kind.plan":"\u8BA1\u5212\u786E\u8BA4","ui.kind.goal":"\u76EE\u6807\u53D7\u963B","ui.push.enable":"PushPlus \u63A8\u9001","ui.push.token":"PushPlus Token","ui.push.save":"\u4FDD\u5B58 Token","ui.test.notify":"\u6D4B\u8BD5 Windows \u901A\u77E5","ui.test.push":"\u6D4B\u8BD5\u624B\u673A\u63A8\u9001","ui.note.serviceNotReady":"\u670D\u52A1\u672A\u5C31\u7EEA","ui.note.settingsNotLoaded":"\u8BBE\u7F6E\u5C1A\u672A\u52A0\u8F7D","ui.note.unknownError":"\u672A\u77E5\u9519\u8BEF","ui.note.saveFailed":"\u4FDD\u5B58\u5931\u8D25\uFF1A{error}","ui.note.tokenSaved":"Token \u5DF2\u4FDD\u5B58","ui.note.tokenSaveFailed":"Token \u4FDD\u5B58\u5931\u8D25\uFF1A{error}","ui.note.pushSent":"\u6D4B\u8BD5\u6D88\u606F\u5DF2\u53D1\u9001\uFF0C\u8BF7\u67E5\u6536","ui.note.testFailed":"\u5931\u8D25\uFF1A{error}","ui.note.toastShown":"\u5DF2\u5F39\u51FA Windows \u7CFB\u7EDF\u901A\u77E5\uFF08\u542B\u63D0\u793A\u97F3\uFF09"},ue={"host.title.done":"Agent task finished","host.title.approval":"Approval needed","host.title.question":"Agent is asking you","host.title.plan":"Plan waiting for review","host.title.goal":"Goal blocked","host.status.completed":"Completed","host.status.aborted":"Aborted","host.status.error":"Failed","host.status.maxTokens":"Token limit","host.status.refusal":"Refused","host.status.cancelled":"Cancelled","host.status.blocked":"Blocked","host.status.interrupted":"Interrupted","host.status.ended":"Ended","host.status.needsApproval":"Approval required","host.status.awaitingAnswer":"Waiting for your answer","host.status.awaitingConfirm":"Waiting for confirmation","host.status.needsAction":"Action required","host.field.session":"Session: ","host.field.time":"Time: ","host.field.status":"Status: ","host.sessionFallback":"Agent session","host.subagentFallback":"Subagent","host.workflowFallback":"Workflow","host.detail.tool":"Tool: {tool}","host.detail.toolReason":"Tool: {tool}, reason: {reason}","host.detail.seeUi":"(open the app to view)","host.detail.planTitle":"Title: {heading}","host.detail.planUntitled":"(untitled)","host.detail.planExcerpt":"Summary: {excerpt}","host.detail.reason":"Reason: {reason}","host.detail.reasonUnknown":"(no reason given)","host.push.networkFailed":"Network request failed","host.push.rejected":"Push rejected (check the token)","host.test.pushDisabled":"Enable push and enter a token first","host.test.session":"Test session","host.test.message":"Test message","host.test.notifyOk":"Windows notifications are working","host.toast.exitCode":"powershell exit code {code}","host.toast.moduleMissing":"BurntToast is not installed and auto-install failed: {reason}","host.toast.pwshMissing":"PowerShell 7 (pwsh.exe) was not found, so system notifications cannot be shown","host.toast.installTimeout":"Installing BurntToast timed out","host.toast.timeout":"Showing the Windows notification timed out","ui.bell.title":"Task completion reminders","ui.bell.pending":"Task completion reminders (syncing)","ui.panel.title":"Task completion reminders","ui.close":"Close","ui.language":"Language","ui.master":"Master switch","ui.group.kinds":"Notification types","ui.group.push":"Phone push","ui.kind.agent":"Main turn","ui.kind.subagent":"Subagent","ui.kind.workflow":"Workflow","ui.kind.approval":"Approval needed","ui.kind.question":"User question","ui.kind.plan":"Plan review","ui.kind.goal":"Goal blocked","ui.push.enable":"PushPlus push","ui.push.token":"PushPlus token","ui.push.save":"Save token","ui.test.notify":"Test Windows notification","ui.test.push":"Test phone push","ui.note.serviceNotReady":"Service not ready","ui.note.settingsNotLoaded":"Settings are not loaded yet","ui.note.unknownError":"Unknown error","ui.note.saveFailed":"Save failed: {error}","ui.note.tokenSaved":"Token saved","ui.note.tokenSaveFailed":"Saving the token failed: {error}","ui.note.pushSent":"Test message sent, please check","ui.note.testFailed":"Failed: {error}","ui.note.toastShown":"A Windows system notification was shown (with sound)"},N={zh:de,en:ue},ce=(e,a,o)=>{let g=(Q(e)==="zh"?de:ue)[a];return typeof g!="string"?String(a):De(g,o)};var Z="taskNotify",Ge=N.zh,Ue=N.en,pe={zh:Ge,en:Ue};var We="dsh-task-notify",He=["remote","slots"],Ye=new Set(Object.keys(N.zh)),Ke="1.8.0",he="dsh-task-notify-style",Ve=`
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

/* Two-position language slider: a compact switch that reads \u4E2D\u6587 off and
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
`;function $e(){if(document.getElementById(he)!==null)return()=>{};let e=document.createElement("style");return e.id=he,e.textContent=Ve,document.head.appendChild(e),()=>{e.remove()}}var fe="dsh-task-notify.groups",Je={kinds:!1,push:!1},Xe=()=>{try{let e=window.localStorage.getItem(fe);if(e===null)return null;let a=JSON.parse(e);if(a!==null&&typeof a=="object"&&typeof a.kinds=="boolean"&&typeof a.push=="boolean")return{kinds:a.kinds,push:a.push}}catch{}return null},Qe=e=>{try{window.localStorage.setItem(fe,JSON.stringify(e))}catch{}};function Ze(e){let{solid:a,...o}=e;return a===!0?s.default.createElement("svg",Object.assign({width:15,height:15,viewBox:"0 0 24 24",fill:"currentColor"},o),s.default.createElement("path",{d:"M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"})):s.default.createElement("svg",Object.assign({width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round"},o),s.default.createElement("path",{d:"M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"}),s.default.createElement("path",{d:"M13.73 21a2 2 0 0 1-3.46 0"}))}function et(){return s.default.createElement("svg",{width:11,height:11,viewBox:"0 0 24 24",fill:"currentColor"},s.default.createElement("path",{d:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"}))}function tt(){return s.default.createElement("svg",{className:"dtn_groupChevron",width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},s.default.createElement("path",{d:"M6 9l6 6 6-6"}))}function nt(e){e.effect(()=>$e(),"dsh-task-notify: styles");try{window.__DSH_TASK_NOTIFY__={build:Ke,hasLanguageSlider:!0},e.effect(()=>()=>{try{delete window.__DSH_TASK_NOTIFY__}catch{}},"dsh-task-notify: build marker")}catch{}let a=()=>{try{return e.get("locale")}catch{return}},o=(t,n)=>{try{let r=a();if(r!=null){let l=r.bind(Z)(t,n);if(typeof l=="string"&&l!==""&&!Ye.has(l))return l}}catch(r){console.error("[dsh-task-notify] locale lookup failed:",r)}return ce("zh",t,n)},k=null,g=()=>{try{let t=a();if(t==null||typeof t.getLocale!="function")return"zh";k=t;let n=t.getLocale(),r=n?.active;return typeof r=="string"&&r!==""?Q(r):"zh"}catch{return"zh"}},ge=t=>{let n=a()??k;if(n!=null)try{n.setLocale(t)}catch(r){console.error("[dsh-task-notify] locale switch failed:",r)}},m;e.effect(async()=>{let t=await e.remote.$mount({package:"dsh-task-notify",descriptors:le}),n=e.reflect;if(m=n===void 0?void 0:n.get("remote.taskNotify"),m===void 0)throw new Error("dsh-task-notify: the taskNotify Remote namespace did not mount");return z(),()=>{m=void 0,t()}},"dsh-task-notify: remote");let b=!1,E=null,v=!1,O=0,M=0,R=new Set,T=()=>{for(let t of R)t()},B=t=>{b=t,T()},ee=t=>{E=t,v=!0,T()},I=()=>{let[t,n]=s.default.useState(0);return s.default.useEffect(()=>{let r=()=>n(l=>l+1);return R.add(r),()=>{R.delete(r)}},[]),t},q=!1,D=()=>{if(q)return;let t=a();if(t!=null)try{t.register(Z,pe),q=!0}catch(n){console.error("[dsh-task-notify] dictionary registration skipped:",n),q=!0}};D(),e.effect(()=>(D(),()=>{}),"dsh-task-notify: dictionaries"),e.effect(()=>{let t=()=>{D(),T()},n=a(),r=n!=null&&typeof n.subscribe=="function"?n.subscribe(t):null;return e.on("locale/change",t),()=>{if(r!=null)try{r()}catch{}e.off("locale/change",t)}},"dsh-task-notify: locale refresh");let x=null,te=0,me=()=>{if(x!==null&&x.isConnected)return x;let t=performance.now();return x===null&&t-te<1e3?null:(te=t,x=document.querySelector("[data-dsh-better-sidebar]"),x)},A=()=>{let t=0,n=0,r=me();if(r!=null){let h=window.innerWidth,c=window.innerHeight;for(let f of r.querySelectorAll("[data-dsh-panel]"))try{let d=f.getBoundingClientRect();d.width>0&&d.width<h&&d.height>80&&d.top>=-8&&d.top<c&&d.left>=0&&d.left<h&&d.right>=h-2&&(t=Math.max(t,Math.min(Math.round(h-d.left),h-200))),d.width>160&&d.height>0&&d.height<c&&d.left>=-8&&d.left<h&&d.top>=0&&d.top<c&&d.bottom>=c-2&&(n=Math.max(n,Math.min(Math.round(c-d.top),c-160)))}catch{}}let l=e.get("betterSidebar");if(l!=null)try{let h=l.getSnapshot(),c=h?.state;if(c!=null){let f=Number(c.width)||0;c.panelOpen===!0&&f>0&&f<window.innerWidth-200&&(t=Math.max(t,f));let d=Number(c.bottomHeight)||0;c.bottomOpen===!0&&d>0&&d<window.innerHeight-160&&(n=Math.max(n,d))}}catch{}(O!==t||M!==n)&&(O=t,M=n,T())},L=!1,C=null;e.effect(()=>{let t=0,n=()=>{let l=e.get("betterSidebar");if(!L&&l!==null&&l!==void 0&&typeof l.subscribeState=="function"){L=!0;try{C=l.subscribeState(A)}catch{L=!1,C=null}}A(),t=requestAnimationFrame(n)};t=requestAnimationFrame(n),A();let r=()=>A();return window.addEventListener("resize",r),()=>{cancelAnimationFrame(t),window.removeEventListener("resize",r);let l=C;if(C=null,L=!1,l!=null)try{l()}catch{}}},"dsh-task-notify: layout insets");let G=t=>t!=null&&t.ok===!0?t.value:void 0,ne=t=>{let n=t?.error;return typeof n?.message=="string"&&n.message!==""?n.message:typeof n?.code=="string"&&n.code!==""?n.code:o("ui.note.unknownError")};async function z(){if(m!==void 0)try{let t=G(await m.getSettings());t!==void 0&&ee(t)}catch(t){console.error("[dsh-task-notify] settings read failed:",t)}}let U=async t=>{if(m===void 0)return{ok:!1,error:o("ui.note.serviceNotReady")};try{let n=await m.updateSettings(t);if(n!=null&&n.ok===!0)return ee(n.value),{ok:!0,value:n.value};let r=n?.error,l=typeof r?.message=="string"?r.message:typeof r?.code=="string"?r.code:o("ui.note.unknownError");return console.error("[dsh-task-notify] settings update failed:",r),{ok:!1,error:String(l)}}catch(n){return console.error("[dsh-task-notify] settings update failed:",n),{ok:!1,error:String(n?.message??n??"")}}},W=Promise.resolve(),ke=(t,n)=>{let r=async()=>{let l=v?E:null;return l==null?{ok:!1,error:o("ui.note.settingsNotLoaded")}:await U(Object.assign({},l,{[t]:n}))};return W=W.then(r,r),W},be=async()=>{if(m===void 0)return{ok:!1,error:o("ui.note.serviceNotReady")};try{let t=await m.testPush();return t!=null&&t.ok===!0?G(t)??{ok:!0}:{ok:!1,error:ne(t)}}catch(t){return console.error("[dsh-task-notify] test push failed:",t),{ok:!1,error:String(t?.message??t??"")}}};e.effect(()=>{let t=setInterval(()=>{z()},1e4);return z(),()=>clearInterval(t)},"dsh-task-notify: settings refresh"),e.effect(()=>{let t=n=>{if(!b||n.button!==0)return;let r=n.target;r instanceof Element&&r.closest(".dtn_panel")===null&&r.closest(".dtn_bell")===null&&B(!1)};return document.addEventListener("pointerdown",t),()=>{document.removeEventListener("pointerdown",t)}},"dsh-task-notify: outside-pointer close");function we(){I();let t=E,n=v&&t?.enabled!==!1,r=v&&n&&t?.push===!0;return s.default.createElement("button",{className:"dtn_bell",title:o(v?"ui.bell.title":"ui.bell.pending"),"data-on":n?"true":"false","data-ready":v?"true":"false","data-open":b?"true":"false",onClick:()=>B(!b)},s.default.createElement(Ze,{solid:n}),r?s.default.createElement("span",{className:"dtn_badge"},s.default.createElement(et)):null)}function H({checked:t,onChange:n}){return s.default.createElement("label",{className:"dtn_switch"},s.default.createElement("input",{type:"checkbox",checked:t===!0,onChange:n}),s.default.createElement("span",{className:"dtn_track"},s.default.createElement("span",{className:"dtn_thumb"})))}function ye(){if(I(),a()===void 0&&k===null)return null;let t=g(),n=t==="zh"?"en":"zh",r=(l,h)=>s.default.createElement("span",{className:"dtn_langLabel",key:l,"data-code":l},h);return s.default.createElement("button",{className:"dtn_lang",type:"button",role:"switch","data-lang":t,"aria-checked":t==="en"?"true":"false","aria-label":o("ui.language"),title:o("ui.language"),onClick:()=>ge(n)},s.default.createElement("span",{className:"dtn_langTrack"},s.default.createElement("span",{className:"dtn_langThumb"}),r("zh","\u4E2D\u6587"),r("en","English")))}function ve(){I();let[t,n]=s.default.useState(null),[r,l]=s.default.useState(null),[h,c]=s.default.useState(null);if(s.default.useEffect(()=>{b&&(n(null),l(null),c(null),z())},[b]),!b)return null;let f=E??{push:!1,token:"",enabled:!0,agent:!1,subagent:!0,workflow:!0,approval:!0,question:!0,plan:!0,goal:!0},d=f.enabled!==!1,oe=r??f.token??"",Y=h??Xe()??Je,xe=i=>{let u=Object.assign({},Y,{[i]:!Y[i]});c(u),Qe(u)},K=i=>u=>{let S=u.target.checked===!0;ke(i,S).then(P=>{P.ok!==!0&&n({ok:!1,text:o("ui.note.saveFailed",{error:String(P.error??"")})})})},Se=i=>l(i.target.value),w=(i,u)=>s.default.createElement("div",{className:"dtn_row",key:i},s.default.createElement("span",{className:"dtn_rowLabel"},u),s.default.createElement(H,{checked:f[i]===!0,onChange:K(i)})),_e=(i,u,S)=>s.default.createElement("div",{className:"dtn_section",key:i,"data-disabled":u&&!d?"true":"false"},...S),se=(i,u,S,P)=>{let V=Y[i]===!0;return s.default.createElement("div",{className:"dtn_group",key:i,"data-open":V?"true":"false","data-disabled":u&&!d?"true":"false"},s.default.createElement("button",{className:"dtn_groupHead",type:"button","aria-expanded":V?"true":"false",onClick:()=>xe(i)},s.default.createElement("span",null,S),s.default.createElement(tt)),V?s.default.createElement("div",{className:"dtn_groupBody"},...P):null)},ae=async()=>{let i=await U(Object.assign({},f,{token:oe}));n({ok:i.ok===!0,text:i.ok===!0?o("ui.note.tokenSaved"):o("ui.note.saveFailed",{error:String(i.error??"")})}),i.ok===!0&&l(null)},Ne=async()=>{if(r!==null){let u=await U(Object.assign({},f,{token:r}));if(u.ok!==!0){n({ok:!1,text:o("ui.note.tokenSaveFailed",{error:String(u.error??"")})});return}l(null)}let i=await be();n({ok:i.ok===!0,text:i.ok===!0?o("ui.note.pushSent"):o("ui.note.testFailed",{error:String(i.error??"")})})},Ee=async()=>{if(m===void 0){n({ok:!1,text:o("ui.note.serviceNotReady")});return}try{let i=await m.testNotify(g());if(i!=null&&i.ok===!0){let u=G(i)??{ok:!0};n({ok:u.ok===!0,text:u.ok===!0?o("ui.note.toastShown"):o("ui.note.testFailed",{error:String(u.error??"")})});return}n({ok:!1,text:o("ui.note.testFailed",{error:ne(i)})})}catch(i){console.error("[dsh-task-notify] test notify failed:",i),n({ok:!1,text:o("ui.note.testFailed",{error:String(i?.message??i??"")})})}};return s.default.createElement("div",{className:"dtn_panel",style:{right:16+O,maxHeight:"calc(100vh - "+(76+M)+"px)"}},s.default.createElement("div",{className:"dtn_panelHead"},s.default.createElement("h4",{className:"dtn_panelTitle"},o("ui.panel.title")),s.default.createElement(ye),s.default.createElement("button",{className:"dtn_close",title:o("ui.close"),onClick:()=>B(!1)},"\xD7")),_e("master",!1,[s.default.createElement("div",{className:"dtn_row"},s.default.createElement("span",{className:"dtn_rowLabel"},o("ui.master")),s.default.createElement(H,{checked:d,onChange:K("enabled")}))]),se("kinds",!0,o("ui.group.kinds"),[w("agent",o("ui.kind.agent")),w("subagent",o("ui.kind.subagent")),w("workflow",o("ui.kind.workflow")),w("approval",o("ui.kind.approval")),w("question",o("ui.kind.question")),w("plan",o("ui.kind.plan")),w("goal",o("ui.kind.goal")),s.default.createElement("button",{className:"dtn_ghost dtn_testBtn",onClick:Ee},o("ui.test.notify"))]),se("push",!0,o("ui.group.push"),[s.default.createElement("div",{className:"dtn_row"},s.default.createElement("span",{className:"dtn_rowLabel"},o("ui.push.enable")),s.default.createElement(H,{checked:f.push===!0,onChange:K("push")})),s.default.createElement("input",{className:"dtn_input",type:"password",placeholder:o("ui.push.token"),value:oe,onChange:Se,onKeyDown:i=>{i.key==="Enter"&&(i.preventDefault(),ae())}}),s.default.createElement("button",{className:"dtn_primary dtn_testBtn",onClick:()=>{ae()}},o("ui.push.save")),s.default.createElement("button",{className:"dtn_ghost dtn_testBtn",onClick:()=>{Ne()}},o("ui.test.push"))]),s.default.createElement("div",{className:"dtn_section"},t===null?null:s.default.createElement("p",{className:"dtn_note","data-ok":t.ok?"true":"false"},t.text)))}e.slots.inject("conversation.session.header.actions",()=>e.slots.register({name:"conversation.session.header.actions",id:"task-notify",order:30,label:o("ui.bell.title")},we)),e.slots.inject("shell.overlay",()=>e.slots.register({name:"shell.overlay",id:"task-notify-panel",order:20},ve))}
return module.exports; } });
