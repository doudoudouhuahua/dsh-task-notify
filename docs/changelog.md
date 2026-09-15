# 版本历史

[← 返回 README](../README.md)

## 1.8.1 — 修复通知图标被静默换成 BurntToast 自带图片

**修复：圆形角标不是 DeepSeek 图标，而是 BurntToast 自带的「吐司照片」**

- 现象：通知能正常弹出，但圆形角标不是 DeepSeek 图标，而是 BurntToast 自带的「吐司照片」，
  且插件与面板都报告成功；
- 根因是 `TOAST_VARIANTS` 的**顺序**：`showWindowsToast` 以「首个 exit 0」为准返回，而排在首位的
  `plain` 变体不带 `-AppLogo`、没有任何可失败之处，于是它每次都成功，logo 永远不会被传下去。
  BurntToast 的 `New-BTImage` 声明了 `[string] $Source = $Script:DefaultImage`，
  `New-BurntToastNotification` 在 `-AppLogo` 为空时正是**不带 `-Source`** 调用它，模块自带图片
  因此被静默写进通知，而命令仍以 exit 0 结束；
- 修复：把带 `-AppLogo` 的变体排到最前（`icon` → `plain` → `icon-pinned` → `plain-pinned`）。
  `resolveToastIcon()` 返回 null 时本来就对所有变体禁用 `-AppLogo`，所以无图标变体仍保留为
  「模块不接受该参数」时的重试路径；
- **这类问题此前的 31 项契约检查全部通过**——它只断言 toast 送达（exit 0），而图标被替换时命令
  同样 exit 0。因此新增 `tools/check-toast-icon.mjs`（`npm run verify:icon`）：读 Windows 通知
  数据库，比对系统**实际记录的 `<image src>`**，并做了负向对照（把顺序改回 `plain` 优先即 FAIL）；
- 同时修好排查工具本身的一个盲点：通知库是 WAL 模式，最新通知先落在 `wpndatabase.db-wal`，
  只拷主库会读到过期历史（表现为刚发的通知查不到）。

**升级须知**：宿主半是被 ESM 在进程启动时导入的，同步 `lib/index.js` 后**需要重启一次 DSH** 才会生效。

## 1.8.0 — 英文适配（滑块切换）+ BurntToast 自动安装

**新增：中英双语，面板头部滑块热切换（默认中文）**

- 新增 `src/i18n.js`：宿主 / 客户端共享的双语词典与查表（`host.*` 通知文案、`ui.*` 面板文案），
  两份词典 key 集合一致、查表是总函数（未命中的键回显键名，永不为一条通知抛错）；
- **语言归属**：复用 **DSH 自己的语言偏好**（`locale` 设置命名空间的 `preference`），面板滑块调用的
  就是 `locale.setLocale(...)`——滑块与「设置 → 通用 → 语言」是同一个开关，偏好由 DSH 持久化，
  跨刷新 / 重启 / 浏览器共享；
- **默认中文**：从未选择过语言时取浏览器语言，中文浏览器落中文、其余落英文；两种语言之外的目录语言
  （将来新增的语言包）统一回退英文；
- **宿主侧**（toast 与 PushPlus 正文都由宿主渲染）：`ctx.get('locale')` 尽力读取当前语言，读不到即
  中文；状态文案先把 harness 枚举（`completed`/`error`/`cancelled`…）与关注类通道写入的历史中文标签
  （`需要审批`/`等待回答`…）折叠成同一个键，再按语言取词——**wire 上的 `status` 字符串与队列语义不变**；
- **客户端侧**：词典注册进共享 locale 服务（命名空间 `taskNotify`，重复注册按 re-entry 处理），
  面板文案走 `locale.bind(...)`（每次调用现查，切换后下一次渲染即新语言），并订阅
  `locale.subscribe` + `locale/change` 触发重渲染；
- **滑块**：面板头部「中文 / English」两态开关，`role="switch"` + `aria-checked`，键盘可用，
  位置即当前语言；**组合中没有 locale 插件时不渲染滑块**（不提供无法生效的假开关），文案固定中文；
- **测试通道不滞后**：`testNotify` 新增可选语言入参（面板点击时带上当前语言），刚切完语言点测试就是
  新语言的 toast。

**新增：自动安装 BurntToast 依赖**

- 插件激活后台探测一次 `pwsh` 能否导入 BurntToast，缺失时**自动安装**（`-Scope CurrentUser`，
  免管理员）：先装最新版，失败再钉 `-RequiredVersion 1.1.0`；装完在同一次 pwsh 调用内重新导入校验；
- **每进程最多探测 / 安装一次**：失败被记住，不会每条通知都联网重试；已有模块的机器上零输出、零延迟；
- toast 脚本改为退出码协议：模块导入失败 `exit 3`、创建 toast 失败 `exit 4`。收到 `exit 3` 时安装并
  **重试一次**，收到 `exit 4` 直接返回（模块已在，重试没有意义）；
- `pwsh.exe` 不在 PATH 时不尝试安装，直接报「未找到 PowerShell 7」；所有失败按当前语言写入宿主日志
  与「测试 Windows 通知」的提示。

**顺带**

- README 顶部加入真实系统通知截图 `notify-demonstrate.png`（并纳入 `files` 白名单），新增英文入口
  `README.en.md`，README 顶部提供中英互链；
- `tools/verify-contract.mjs`：26 → 31 项检查，新增语言五项与 `testNotify` 参数契约
  （默认中文 / 英文切换 / 关注类文案 / 未知语言回退 / 语言入参），负向对照数量不变。

**升级须知**：`lib/` 是随仓库提交的构建产物，升级后同步方式不变（见[构建与开发](development.md)）。

## 1.7.0 — 修复 DSH 0.1.6-alpha.1 下整插件失效

**根因**：DSH 于 2026-09-15 合入上游提交 `perf(typert): materialize generated schemas on first use`
（在 `dsh-v0.1.6-alpha.1` 标签之后进入 `master`，随该版本更新重建后生效），把 **strict codec 的契约**
从「直接给出 schema」改成「给出惰性 `create()` 工厂」：

| 位置 | 变更 |
| --- | --- |
| `TypertCodec`（strict 分支） | `schema: TypertSchema` → `create: () => TypertSchema` |
| `TypertContribution.schemas[]` | `schema` → `create` 工厂 |
| `TypertRegistry.validateCodec` | 非 `src-json` 的 codec 若 `typeof codec.create !== 'function'` 直接抛 `strict codec has no create() factory` |
| `dsh-api-gateway`（host 收 / client 发） | 都改为 `codec.create().parse(value)` |

插件仍以 `schema:` 声明 5 个 strict codec，于是 `ctx.typert.register(TYPERT_MANIFEST)`
（`src/index.js` 的 `apply()` 首句）同步抛错 → **整行插件激活失败**：事件订阅、远端命名空间、
Windows toast、PushPlus 全部不生效；客户端 `ctx.remote.$mount` 拿不到 `remote.taskNotify` 而抛错，
标题栏铃铛与设置面板一起消失（现象即「插件像没装」）。

**修复**

- `src/contract.js` 新增唯一的 `strictCodec(typeSymbol, schema)` 工厂，5 处 codec 全部改用它；
  `create()` 返回同一个缓存实例（schema 无状态，注册表与两端 Gateway 可反复调用）；
- 手写 schema 对象（仅 `parse`）继续符合 `TypertSchema`，wire 行为、设置命名空间 `task-notify`、
  wire 类型符号与已存设置数据全部不变，无需迁移。

**顺带修复**

- **子代理 / 工作流状态文案**：`subagent/end` 与 `workflow/end` 原先直接落原始 `stopReason`，
  通知正文出现 `error` / `cancelled` 等英文枚举，与[通知类型](notifications.md)承诺的中文文案不符；
  现在两处都经 `statusLabel()` 折叠（`completed` → 完成、`error` → 失败、`cancelled` → 取消…），
  与 `turn/end` 走同一张表。

**新增：契约回归校验 `tools/verify-contract.mjs`**

```powershell
node tools/verify-contract.mjs      # 或 npm run verify
```

对**本机真实 DSH**做 26 项检查：strict codec 契约与正反解析、真实 `TypertRegistry` 接受宿主清单并
注册 5 个端点、以真实 Cordis 上下文加载**已安装的 `lib/index.js`** 跑通 7 类通知与各开关、真实
BurntToast 通道连通性，以及一条负向对照（`schema`-only codec 必须仍被拒绝，保证该脚本今后仍能识别
同类漂移）。DSH 工作树用 `DSH_HARNESS` 指定，默认 `T:/deepseek-harness`。

> 本次故障即由该脚本在修复前复现：加载 profile 内旧副本时精确报出
> `typert: dsh-task-notify#taskNotify/getSettings result strict codec has no create() factory`。

**升级须知**：`lib/` 是随仓库提交的构建产物，升级插件后若宿主报该行未激活，先确认 profile 内副本已更新：

```powershell
node build.mjs
Copy-Item lib\*.js "$env:USERPROFILE\.dsh\profiles\web\node_modules\dsh-task-notify\lib\" -Force
node tools/verify-contract.mjs
```

本次故障的完整排查过程已整理为通用手册，供其它 DSH 插件参考：
[DSH 升级后插件失效的排查手册](troubleshooting.md)。

## 1.6.1 — 修复 DSH 0.1.3-alpha.1 下的失效通知与面板遮挡

**根因**：DSH 于 2026-08-28 的重构（`perf(session): separate indexed and snapshot log reads`，随
0.1.3-alpha.1 发布）删除了 `Session.events`，改为公开方法 `session.snapshotEvents()`。插件仍读旧属性，
取到 `undefined` 后被 `try/catch` 吞掉，导致两条链路静默失效：

- **计划待确认**：`planModeActive()` 恒为 `false`，`exit_plan_mode` 分支提前 return，通知从不发出；
- **状态文案**：`turnEndLabel()` 恒返回「结束」，主回合 / 子代理通知的「描述」再也显示不出
  完成 / 失败 / 中止 / 超出上限 / 阻塞 / 中断。

修复：两处折叠改读 `session.snapshotEvents()`（折叠语义与 harness 的 `plan` 投影一致）。

其余修复：

- **主回合只认根会话**：`agent/status` 对每个 agent（含子代理 / 工作流子代理）都会发 `idle`，旧逻辑靠
  3 秒去重窗口掩盖重复通知；关闭「子代理」开关后子代理完成仍会冒出「Agent任务完成」。现在非根 agent
  直接跳过，子代理完成一律由 `subagent/end` 负责（与 `userQuestions.ask` 的 `roots()` 边界同源）。
- **底部面板让位**：`sidebarBottom` 原先只算不用，底部面板展开时配置面板被压在其下。现在面板
  `max-height` 扣除底部面板高度；同时给 better-sidebar 快照分支补上与 DOM 分支同源的守卫
  （全视口宽的窄屏抽屉、超过视口高的底部面板不再被当成内缩值，避免面板被推出视口）。
- **生命周期收敛**：`betterSidebar.subscribeState` 的 disposer 与注入的 `<style>` 现在都挂在 effect 上，
  插件卸载 / HMR 重载后不再残留监听与样式节点；`sessions` 改为惰性解析，服务晚就绪也不会被永久缓存成
  `undefined`。
- **错误可见**：两个测试按钮不再把 RPC 失败一律报成「服务未就绪」，而是显示宿主返回的真实错误
  （`RemoteError.message` / `code`）。
- **`next()` 不再丢条目**：一次只出队返回的 10 条，剩余留在队列；删除未使用的 `kindLabel`。
- **构建健壮性**：`build.mjs` 不再硬编码 `esbuild@0.25.12` 路径，改为扫描 `node_modules/.pnpm/esbuild@*`
  并按版本降序取用，harness 升级 esbuild 后仍可构建。

## 1.6.0 — 修复设置面板出现在左侧

适配 dsh-better-sidebar 0.18 的 `data-dsh-panel-host` 布局：

- **原因**：better-sidebar 0.17 起真实面板被包进全视口的 `[data-dsh-panel-host]` 固定层，而旧逻辑测量
  `[data-dsh-better-sidebar]` 的**直接子元素**——现在只剩这一个全视口包装层，其矩形恰好满足
  「右对齐 / 底对齐」两条启发式，使 `sidebarRight` 被算成 `视口宽 − 200`，设置面板被推到**屏幕左侧**
  （约 112px 被裁出视口）；
- **修复**：改为按 `[data-dsh-panel]` 标记测量**真实面板**（右侧面板与底部面板各命中一次），并新增
  `rect.width < 视口宽` / `rect.height < 视口高` 守卫排除 100vw 全宽抽屉等全视口元素；
- **行为恢复**：右侧面板收起时设置面板贴右上（距右缘 16px），右侧面板展开时位于其左侧且不重叠，
  拖拽调整宽度时仍逐帧实时跟随；窄屏全宽抽屉不再误推位置（抽屉遮挡属于既有已知限制）。

## 1.5.0 — 适配 DSH 0.1.3-alpha.1

（2026-08-30 平台重构）

- 移除对 `@deepseek-ai/dsh-settings` 的 `settingsNamespace(...)` 静态导入（该导出已被平台删除，
  旧版在 DSH 0.1.3-alpha.1 下启动即报 `does not provide an export named 'settingsNamespace'`）；
  命名空间改为字面量 `'task-notify'`，`ctx.settings.register` 签名不变，**设置数据（settings.yaml）
  无需迁移**；
- 宿主侧外部平台导入仅保留 `@deepseek-ai/dsh-typert-protocol`（schemastery / cosmokit 继续 vendor）。

## 1.4.0 — 交互与面板优化（仅客户端）

- 铃铛不再在设置同步前显示默认实心图标——Remote 就绪后立即拉取设置，未就绪前保持空心（「同步中」），
  只反映宿主确认过的真实启用状态；
- 设置面板分层折叠（总开关 / 通知类型 / 手机推送），分组默认收起，展开 / 收起状态记忆到
  localStorage，下次打开恢复上次布局；
- 开关全部**即改即存**（串行化写入，快速连按互不覆盖），取消手动「保存」按钮；仅 Token 文本输入
  保留「保存 Token」（回车等效），测试手机推送前会自动落盘未保存的 Token；
- 鼠标左键点击面板外任意位置关闭面板（面板内与右上角 × 不受影响，点击铃铛仍是面板开 / 关切换）。

## 1.3.0 — 通知图标热更新

替换 `node_modules\dsh-task-notify\deepseek.png`（或仓库根目录的 `deepseek.png`，取决于 `file:`
依赖是否软链）后，点「测试 Windows 通知」即可验证 toast 角标已换成新图标，无需重建插件或重启 DSH。

## 1.2.0 — 计划确认与目标受阻通知

- 新增**计划待你确认**：`/plan` 完成后 agent 调用 `exit_plan_mode` 提交计划、等待确认执行时提醒
  （含计划标题与摘要，每条评审只提醒一次）；
- 新增**目标受阻**：goal 自动回合因持续阻塞而停止（模型上报或到达轮次上限）时提醒（含阻塞原因）；
- 补充验收文档，见[测试与验收](testing.md)。

## 1.1.0 — 审批与提问通知

- 新增**需要你的审批**：agent 权限不足发起提权 / 越权执行审批时提醒（含工具名与原因，审批策略
  `ask` 时提醒你去批准）；
- 新增**Agent 正在问你**：agent 调用 `ask_user_question` 主动停下咨询时提醒（含问题文本）。

## 1.0.0 — 首个版本

DSH Web 插件：agent 回合 / 子代理 / 工作流任务完成时弹出 Windows 系统通知，并支持 PushPlus 手机推送。
