window.__ModuleLoader__.load({ id: 'dsh-task-notify', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var le=Object.create;var N=Object.defineProperty;var de=Object.getOwnPropertyDescriptor;var ce=Object.getOwnPropertyNames;var ue=Object.getPrototypeOf,pe=Object.prototype.hasOwnProperty;var fe=(e,r)=>{for(var d in r)N(e,d,{get:r[d],enumerable:!0})},U=(e,r,d,g)=>{if(r&&typeof r=="object"||typeof r=="function")for(let f of ce(r))!pe.call(e,f)&&f!==d&&N(e,f,{get:()=>r[f],enumerable:!(g=de(r,f))||g.enumerable});return e};var he=(e,r,d)=>(d=e!=null?le(ue(e)):{},U(r||!e||!e.__esModule?N(d,"default",{value:e,enumerable:!0}):d,e)),me=e=>U(N({},"__esModule",{value:!0}),e);var Oe={};fe(Oe,{apply:()=>Pe,inject:()=>ve,name:()=>we});module.exports=me(Oe);var n=he(require("react"),1);var p=(e,r)=>{throw new Error(`dsh-task-notify: invalid ${e} (expected ${r})`)},q=e=>typeof e=="boolean",w=e=>typeof e=="string",ge=e=>typeof e=="number"&&Number.isFinite(e),A=e=>e!==null&&typeof e=="object"&&!Array.isArray(e),R={parse(e){A(e)||p("settings","object");for(let r of["push","agent","subagent","workflow","approval","question","plan","goal"])q(e[r])||p("settings."+r,"boolean");return e.enabled!==void 0&&!q(e.enabled)&&p("settings.enabled","boolean"),w(e.token)||p("settings.token","string"),{push:e.push,token:e.token,enabled:e.enabled===void 0?!0:e.enabled,agent:e.agent,subagent:e.subagent,workflow:e.workflow,approval:e.approval,question:e.question,plan:e.plan,goal:e.goal}}},be=["subagent","workflow","agent","test","approval","question","plan","goal"],ke={parse(e){A(e)||p("item","object"),be.includes(e.kind)||p("item.kind","subagent|workflow|agent|test|approval|question|plan|goal"),w(e.title)||p("item.title","string"),w(e.status)||p("item.status","string"),ge(e.at)||p("item.at","number");let r={kind:e.kind,title:e.title,status:e.status,at:e.at};return e.detail!==void 0&&(w(e.detail)||p("item.detail","string"),r.detail=e.detail),r}},ye={parse(e){return Array.isArray(e)||p("items","array"),e.map(r=>ke.parse(r))}},Y={parse(e){A(e)||p("testResult","object"),q(e.ok)||p("testResult.ok","boolean");let r={ok:e.ok};return e.error!==void 0&&(w(e.error)||p("testResult.error","string"),r.error=e.error),r}},$=[{id:"dsh-task-notify#taskNotify/getSettings",service:"taskNotify",namespace:"taskNotify",method:"getSettings",invocation:{kind:"direct"},parameters:[],result:{mode:"strict",typeSymbol:"dsh-task-notify#TaskNotifySettings",schema:R}},{id:"dsh-task-notify#taskNotify/updateSettings",service:"taskNotify",namespace:"taskNotify",method:"updateSettings",invocation:{kind:"direct"},parameters:[{name:"update",wire:"update",source:"json",codec:{mode:"strict",typeSymbol:"dsh-task-notify#TaskNotifySettings",schema:R}}],result:{mode:"strict",typeSymbol:"dsh-task-notify#TaskNotifySettings",schema:R}},{id:"dsh-task-notify#taskNotify/next",service:"taskNotify",namespace:"taskNotify",method:"next",invocation:{kind:"direct"},parameters:[],result:{mode:"strict",typeSymbol:"dsh-task-notify#TaskNotifyItem[]",schema:ye}},{id:"dsh-task-notify#taskNotify/testPush",service:"taskNotify",namespace:"taskNotify",method:"testPush",invocation:{kind:"direct"},parameters:[],result:{mode:"strict",typeSymbol:"dsh-task-notify#TaskNotifyTestResult",schema:Y}},{id:"dsh-task-notify#taskNotify/testNotify",service:"taskNotify",namespace:"taskNotify",method:"testNotify",invocation:{kind:"direct"},parameters:[],result:{mode:"strict",typeSymbol:"dsh-task-notify#TaskNotifyTestResult",schema:Y}}];var we="dsh-task-notify",ve=["remote","slots"],J="dsh-task-notify-style",xe=`
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
`;function _e(){if(document.getElementById(J)!==null)return;let e=document.createElement("style");e.id=J,e.textContent=xe,document.head.appendChild(e)}var X="dsh-task-notify.groups",Ne={kinds:!1,push:!1},Se=()=>{try{let e=window.localStorage.getItem(X);if(e===null)return null;let r=JSON.parse(e);if(r!==null&&typeof r=="object"&&typeof r.kinds=="boolean"&&typeof r.push=="boolean")return{kinds:r.kinds,push:r.push}}catch{}return null},Ee=e=>{try{window.localStorage.setItem(X,JSON.stringify(e))}catch{}};function Te(e){let{solid:r,...d}=e;return r===!0?n.default.createElement("svg",Object.assign({width:15,height:15,viewBox:"0 0 24 24",fill:"currentColor"},d),n.default.createElement("path",{d:"M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"})):n.default.createElement("svg",Object.assign({width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round"},d),n.default.createElement("path",{d:"M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"}),n.default.createElement("path",{d:"M13.73 21a2 2 0 0 1-3.46 0"}))}function Ce(){return n.default.createElement("svg",{width:11,height:11,viewBox:"0 0 24 24",fill:"currentColor"},n.default.createElement("path",{d:"M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"}))}function je(){return n.default.createElement("svg",{className:"dtn_groupChevron",width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},n.default.createElement("path",{d:"M6 9l6 6 6-6"}))}function Pe(e){_e();let r;e.effect(async()=>{let t=await e.remote.$mount({package:"dsh-task-notify",descriptors:$}),s=e.reflect;if(r=s===void 0?void 0:s.get("remote.taskNotify"),r===void 0)throw new Error("dsh-task-notify: the taskNotify Remote namespace did not mount");return x(),()=>{r=void 0,t()}},"dsh-task-notify: remote");let d=!1,g=null,f=!1,S=0,H=0,E=new Set,T=()=>{for(let t of E)t()},C=t=>{d=t,T()},D=t=>{g=t,f=!0,T()},G=()=>{let[t,s]=n.default.useState(0);return n.default.useEffect(()=>{let a=()=>s(l=>l+1);return E.add(a),()=>{E.delete(a)}},[]),t},k=null,F=0,Q=()=>{if(k!==null&&k.isConnected)return k;let t=performance.now();return k===null&&t-F<1e3?null:(F=t,k=document.querySelector("[data-dsh-better-sidebar]"),k)},v=()=>{let t=0,s=0,a=Q();if(a!=null){let h=window.innerWidth,u=window.innerHeight;for(let m of a.querySelectorAll("[data-dsh-panel]"))try{let i=m.getBoundingClientRect();i.width>0&&i.width<h&&i.height>80&&i.top>=-8&&i.top<u&&i.left>=0&&i.left<h&&i.right>=h-2&&(t=Math.max(t,Math.min(Math.round(h-i.left),h-200))),i.width>160&&i.height>0&&i.height<u&&i.left>=-8&&i.left<h&&i.top>=0&&i.top<u&&i.bottom>=u-2&&(s=Math.max(s,Math.min(Math.round(u-i.top),u-160)))}catch{}}let l=e.get("betterSidebar");if(l!=null)try{let h=l.getSnapshot(),u=h?.state;u!=null&&(u.panelOpen===!0&&(t=Math.max(t,Math.min(Number(u.width)||0,window.innerWidth))),u.bottomOpen===!0&&(s=Math.max(s,Math.min(Number(u.bottomHeight)||0,window.innerHeight))))}catch{}(S!==t||H!==s)&&(S=t,H=s,T())},j=!1;e.effect(()=>{let t=0,s=()=>{let l=e.get("betterSidebar");if(!j&&l!==null&&l!==void 0&&typeof l.subscribeState=="function"){j=!0;try{l.subscribeState(v)}catch{j=!1}}v(),t=requestAnimationFrame(s)};t=requestAnimationFrame(s),v();let a=()=>v();return window.addEventListener("resize",a),()=>{cancelAnimationFrame(t),window.removeEventListener("resize",a)}},"dsh-task-notify: layout insets");let P=t=>t!=null&&t.ok===!0?t.value:void 0;async function x(){if(r!==void 0)try{let t=P(await r.getSettings());t!==void 0&&D(t)}catch(t){console.error("[dsh-task-notify] settings read failed:",t)}}let O=async t=>{if(r===void 0)return{ok:!1,error:"\u670D\u52A1\u672A\u5C31\u7EEA"};try{let s=await r.updateSettings(t);if(s!=null&&s.ok===!0)return D(s.value),{ok:!0,value:s.value};let a=s?.error,l=typeof a?.message=="string"?a.message:typeof a?.code=="string"?a.code:"\u672A\u77E5\u9519\u8BEF";return console.error("[dsh-task-notify] settings update failed:",a),{ok:!1,error:String(l)}}catch(s){return console.error("[dsh-task-notify] settings update failed:",s),{ok:!1,error:String(s?.message??s??"")}}},I=Promise.resolve(),Z=(t,s)=>{let a=async()=>{let l=f?g:null;return l==null?{ok:!1,error:"\u8BBE\u7F6E\u5C1A\u672A\u52A0\u8F7D"}:await O(Object.assign({},l,{[t]:s}))};return I=I.then(a,a),I},ee=async()=>{if(r===void 0)return{ok:!1,error:"\u670D\u52A1\u672A\u5C31\u7EEA"};try{return P(await r.testPush())??{ok:!1,error:"\u670D\u52A1\u672A\u5C31\u7EEA"}}catch(t){return console.error("[dsh-task-notify] test push failed:",t),{ok:!1,error:String(t??"")}}};e.effect(()=>{let t=setInterval(()=>{x()},1e4);return x(),()=>clearInterval(t)},"dsh-task-notify: settings refresh"),e.effect(()=>{let t=s=>{if(!d||s.button!==0)return;let a=s.target;a instanceof Element&&a.closest(".dtn_panel")===null&&a.closest(".dtn_bell")===null&&C(!1)};return document.addEventListener("pointerdown",t),()=>{document.removeEventListener("pointerdown",t)}},"dsh-task-notify: outside-pointer close");function te(){G();let t=g,s=f&&t?.enabled!==!1,a=f&&s&&t?.push===!0;return n.default.createElement("button",{className:"dtn_bell",title:f?"\u4EFB\u52A1\u5B8C\u6210\u63D0\u9192":"\u4EFB\u52A1\u5B8C\u6210\u63D0\u9192\uFF08\u540C\u6B65\u4E2D\uFF09","data-on":s?"true":"false","data-ready":f?"true":"false","data-open":d?"true":"false",onClick:()=>C(!d)},n.default.createElement(Te,{solid:s}),a?n.default.createElement("span",{className:"dtn_badge"},n.default.createElement(Ce)):null)}function M({checked:t,onChange:s}){return n.default.createElement("label",{className:"dtn_switch"},n.default.createElement("input",{type:"checkbox",checked:t===!0,onChange:s}),n.default.createElement("span",{className:"dtn_track"},n.default.createElement("span",{className:"dtn_thumb"})))}function ne(){G();let[t,s]=n.default.useState(null),[a,l]=n.default.useState(null),[h,u]=n.default.useState(null);if(n.default.useEffect(()=>{d&&(s(null),l(null),u(null),x())},[d]),!d)return null;let m=g??{push:!1,token:"",enabled:!0,agent:!1,subagent:!0,workflow:!0,approval:!0,question:!0,plan:!0,goal:!0},i=m.enabled!==!1,V=a??m.token??"",z=h??Se()??Ne,se=o=>{let c=Object.assign({},z,{[o]:!z[o]});u(c),Ee(c)},B=o=>c=>{let y=c.target.checked===!0;Z(o,y).then(_=>{_.ok!==!0&&s({ok:!1,text:"\u4FDD\u5B58\u5931\u8D25\uFF1A"+String(_.error??"")})})},re=o=>l(o.target.value),b=(o,c)=>n.default.createElement("div",{className:"dtn_row",key:o},n.default.createElement("span",{className:"dtn_rowLabel"},c),n.default.createElement(M,{checked:m[o]===!0,onChange:B(o)})),oe=(o,c,y)=>n.default.createElement("div",{className:"dtn_section",key:o,"data-disabled":c&&!i?"true":"false"},...y),W=(o,c,y,_)=>{let L=z[o]===!0;return n.default.createElement("div",{className:"dtn_group",key:o,"data-open":L?"true":"false","data-disabled":c&&!i?"true":"false"},n.default.createElement("button",{className:"dtn_groupHead",type:"button","aria-expanded":L?"true":"false",onClick:()=>se(o)},n.default.createElement("span",null,y),n.default.createElement(je)),L?n.default.createElement("div",{className:"dtn_groupBody"},..._):null)},K=async()=>{let o=await O(Object.assign({},m,{token:V}));s({ok:o.ok===!0,text:o.ok===!0?"Token \u5DF2\u4FDD\u5B58":"\u4FDD\u5B58\u5931\u8D25\uFF1A"+String(o.error??"")}),o.ok===!0&&l(null)},ae=async()=>{if(a!==null){let c=await O(Object.assign({},m,{token:a}));if(c.ok!==!0){s({ok:!1,text:"Token \u4FDD\u5B58\u5931\u8D25\uFF1A"+String(c.error??"")});return}l(null)}let o=await ee();s({ok:o.ok===!0,text:o.ok===!0?"\u6D4B\u8BD5\u6D88\u606F\u5DF2\u53D1\u9001\uFF0C\u8BF7\u67E5\u6536":"\u5931\u8D25\uFF1A"+String(o.error??"")})},ie=async()=>{if(r===void 0){s({ok:!1,text:"\u670D\u52A1\u672A\u5C31\u7EEA"});return}try{let c=P(await r.testNotify())??{ok:!1,error:"\u670D\u52A1\u672A\u5C31\u7EEA"};s({ok:c.ok===!0,text:c.ok===!0?"\u5DF2\u5F39\u51FA Windows \u7CFB\u7EDF\u901A\u77E5\uFF08\u542B\u63D0\u793A\u97F3\uFF09":"\u5931\u8D25\uFF1A"+String(c.error??"")})}catch(o){console.error("[dsh-task-notify] test notify failed:",o),s({ok:!1,text:"\u5931\u8D25\uFF1A"+String(o?.message??o??"")})}};return n.default.createElement("div",{className:"dtn_panel",style:{right:16+S}},n.default.createElement("div",{className:"dtn_panelHead"},n.default.createElement("h4",{className:"dtn_panelTitle"},"\u4EFB\u52A1\u5B8C\u6210\u63D0\u9192"),n.default.createElement("button",{className:"dtn_close",title:"\u5173\u95ED",onClick:()=>C(!1)},"\xD7")),oe("master",!1,[n.default.createElement("div",{className:"dtn_row"},n.default.createElement("span",{className:"dtn_rowLabel"},"\u603B\u5F00\u5173"),n.default.createElement(M,{checked:i,onChange:B("enabled")}))]),W("kinds",!0,"\u901A\u77E5\u7C7B\u578B",[b("agent","\u4E3B\u56DE\u5408"),b("subagent","\u5B50\u4EE3\u7406"),b("workflow","\u5DE5\u4F5C\u6D41"),b("approval","\u9700\u8981\u5BA1\u6279"),b("question","\u8BE2\u95EE\u7528\u6237"),b("plan","\u8BA1\u5212\u786E\u8BA4"),b("goal","\u76EE\u6807\u53D7\u963B"),n.default.createElement("button",{className:"dtn_ghost dtn_testBtn",onClick:ie},"\u6D4B\u8BD5 Windows \u901A\u77E5")]),W("push",!0,"\u624B\u673A\u63A8\u9001",[n.default.createElement("div",{className:"dtn_row"},n.default.createElement("span",{className:"dtn_rowLabel"},"PushPlus \u63A8\u9001"),n.default.createElement(M,{checked:m.push===!0,onChange:B("push")})),n.default.createElement("input",{className:"dtn_input",type:"password",placeholder:"PushPlus Token",value:V,onChange:re,onKeyDown:o=>{o.key==="Enter"&&(o.preventDefault(),K())}}),n.default.createElement("button",{className:"dtn_primary dtn_testBtn",onClick:()=>{K()}},"\u4FDD\u5B58 Token"),n.default.createElement("button",{className:"dtn_ghost dtn_testBtn",onClick:()=>{ae()}},"\u6D4B\u8BD5\u624B\u673A\u63A8\u9001")]),n.default.createElement("div",{className:"dtn_section"},t===null?null:n.default.createElement("p",{className:"dtn_note","data-ok":t.ok?"true":"false"},t.text)))}e.slots.inject("conversation.session.header.actions",()=>e.slots.register({name:"conversation.session.header.actions",id:"task-notify",order:30,label:"\u4EFB\u52A1\u63D0\u9192"},te)),e.slots.inject("shell.overlay",()=>e.slots.register({name:"shell.overlay",id:"task-notify-panel",order:20},ne))}
return module.exports; } });
