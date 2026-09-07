# dsh-task-notify

DSH（DeepSeek Harness）Web 插件：Agent / 子代理 / 工作流任务完成时，以及 **agent 停下来等你操作时**（需要审批、向你提问、计划待确认、目标受阻），弹出真正的 **Windows 系统通知**（带提示音与 DeepSeek 图标），可选 PushPlus 微信推送。浏览器关闭也能收到。

## 特性

- **系统级通知**：经 BurntToast（PowerShell 模块）调用 Windows 通知中心，播放系统提示音，无需网页授权；
- **图标热更新**：通知图标直接读取包内 `deepseek.png`（按内容指纹缓存到临时目录），替换该文件后**下一条通知立即使用新图标**，无需重建或重启；
- **手机推送**：通过 PushPlus 同步推送到微信，电脑不在身边也能收到；
- **通知内容**：会话名（沿父链回溯到根会话）、时间、状态（完成 / 失败 / 中止…）；
- **需要审批**：agent 权限不足发起提权 / 越权执行审批时，通知「需要你的审批」（含工具名与原因）——审批策略为 `ask` 时提醒你去批准；
- **询问用户**：agent 调用 `ask_user_question` 主动停下咨询时，通知「Agent 正在问你」（含问题文本）；
- **计划待确认**：`/plan` 完成后 agent 调用 `exit_plan_mode` 提交计划、等待你确认执行时，通知「计划待你确认」（含计划标题与摘要，每条评审只提醒一次）；
- **目标受阻**：goal 自动回合因持续阻塞而停止（模型上报或到达轮次上限）时，通知「目标受阻」（含阻塞原因），提醒你处理或清除；
- **分类开关**：主回合 / 子代理 / 工作流 / 需要审批 / 询问用户 / 计划确认 / 目标受阻 独立开关，另有总开关一键关闭全部通知；
- **持久配置**：配置存于 DSH settings（`task-notify` 命名空间），重启不丢；
- **布局自适应**：配置面板逐帧（rAF）跟随 dsh-better-sidebar 面板让位，不遮挡。

## 界面

- 会话标题栏右侧铃铛按钮：同步中（设置尚未加载，避免误报状态）→ 空心；总开关开 → 实心；总开关开且推送开 → 右上角白色手机剪影；
- 毛玻璃配置面板（分层折叠）：总开关常驻；「通知类型」层（含 7 个分类开关与「测试 Windows 通知」）；「手机推送」层（含开关、Token、保存 Token、测试手机推送）；面板底部为结果/错误提示。**开关即改即存**（无需手动保存），仅 Token 文本输入需点击「保存 Token」（或按回车）；分组默认收起，展开/收起状态会记忆（localStorage），下次打开保持上次布局；
- 面板打开后，鼠标左键点击面板外任意位置即关闭（面板内点击与右上角 × 不受影响；点击铃铛保持开/关切换）。

## 环境要求

- DSH Web（profile 插件机制），Windows 10/11；
- PowerShell 7（pwsh）与 BurntToast 模块：

  ```powershell
  Install-Module BurntToast -Scope CurrentUser
  ```

## 安装

方式 A（推荐，DSH ≥ 0.1.3-alpha.1 的 git 源直装，自动 reconcile `dsh.profile.bundles`）：

```powershell
dsh plugin --profile web add git+https://github.com/V-Reason/dsh-task-notify.git
# 更新时：dsh plugin --profile web update dsh-task-notify
```

方式 B（本地 `file:` 依赖，手改 profile）：

1. 在 profile 的 `package.json` 中 `dependencies` 增加：

   ```json
   "dsh-task-notify": "file:<本仓库路径>"
   ```

2. 在 `dsh.profile.bundles` 数组末尾追加 `"dsh-task-notify"`；
3. 在 profile 目录执行 `pnpm install`，重启 DSH。

> 宿主行由本包自带的 bundle 补丁（`cordis.patch.yml`）注入，**不要**再写入 profile 的
> `cordis.patch.yml`，否则启动报 `duplicate loader entry id: dsh-task-notify`。
> profile 的 `pnpm-workspace.yaml` 中 `allowBuilds: node-pty: true` 必须为真，否则安装会以
> `ERR_PNPM_IGNORED_BUILDS` 失败（CLI 判定失败且不 reconcile bundles）。

## 使用

1. 在 https://www.pushplus.plus 扫码登录，复制「一对一推送」token；
2. 点击标题栏铃铛 → 展开「手机推送」层，打开「PushPlus 推送」开关，粘贴 token → 点「保存 Token」（或按回车）；
3. 用「通知类型」层的「测试 Windows 通知」与「手机推送」层的「测试手机推送」验证两条通道；
4. 「通知类型」中按需开关：**需要审批**（agent 提权/越权审批，仅审批策略 `ask` 时提醒）、**询问用户**（agent 提问）、**计划确认**（`/plan` 完成后 agent 提交计划等你确认）、**目标受阻**（goal 因持续阻塞停止）。

> 提示：除 Token 外所有开关均为即改即存，无需「保存」按钮；测试手机推送前若刚粘贴过 Token 未点击保存，会先自动落盘再发送。

> 注意：审批策略为 `never`（如 `danger-full-access` 权限预设）时审批会被自动拒绝、无需人工操作，因此不会发送审批提醒。

## 测试与验收

五类通知的触发方式与预期内容（实测环境：Windows 11 + DSH Web，桌面 toast 通道）：

| 通知 | 触发方式 | 预期内容 |
|---|---|---|
| 任务完成 | agent 正常跑完一个回合（含子代理 / 工作流） | 会话名、时间、状态（完成 / 失败 / 中止…） |
| 需要审批 | 权限设为 read-only，agent 写文件被沙箱拒绝后申请提权（审批策略 `ask`） | 工具名、提权原因 |
| 询问用户 | agent 调用 `ask_user_question` 抛出问题后主动停下 | 问题文本 |
| 计划待确认 | `/plan` 进入计划模式，agent 调用 `exit_plan_mode` 提交带 `#` 标题的计划 | 计划标题与摘要（每条评审只提醒一次） |
| 目标受阻 | 创建注定无法完成的目标，跑满自动轮次上限或模型上报 blocked | 阻塞原因 |

v1.2.0 已实测通过：**任务完成 / 需要审批 / 询问用户 / 目标受阻**。
**计划待确认**需先在会话中进入计划模式（`/plan`）后由 agent 调用 `exit_plan_mode` 触发，按上表操作即可验收。

v1.3.0 新增：**通知图标热更新**——替换 `node_modules\dsh-task-notify\deepseek.png`（或仓库根目录的
`deepseek.png`，取决于 `file:` 依赖是否软链）后，点「测试通知」即可验证 toast 角标已换成新图标，
无需重建插件或重启 DSH。

v1.4.0 修复/优化（仅客户端）：
- 铃铛不再在设置同步前显示默认实心图标——Remote 就绪后立即拉取设置，未就绪前保持空心（"同步中"），
  只反映宿主确认过的真实启用状态；
- 设置面板分层折叠（总开关 / 通知类型 / 手机推送），分组默认收起，展开/收起状态记忆到
  localStorage，下次打开恢复上次布局；
- 开关全部**即改即存**（串行化写入，快速连按互不覆盖），取消手动「保存」按钮；仅 Token 文本输入
  保留「保存 Token」（回车等效），测试手机推送前会自动落盘未保存的 Token；
- 鼠标左键点击面板外任意位置关闭面板（面板内与右上角 × 不受影响，点击铃铛仍是开/关切换）。

v1.5.0（适配 DSH 0.1.3-alpha.1 —— 2026-08-30 平台重构）：
- 移除对 `@deepseek-ai/dsh-settings` 的 `settingsNamespace(...)` 静态导入（该导出已被平台删除，
  旧版在 DSH 0.1.3-alpha.1 下启动即报
  `does not provide an export named 'settingsNamespace'`）；命名空间改为字面量
  `'task-notify'`，`ctx.settings.register` 签名不变，**设置数据（settings.yaml）无需迁移**；
- 宿主侧外部平台导入仅保留 `@deepseek-ai/dsh-typert-protocol`（schemastery/cosmokit 继续 vendor）。

v1.6.0（修复设置面板出现在左侧 —— 适配 dsh-better-sidebar 0.18 的 `data-dsh-panel-host` 布局）：
- 原因：better-sidebar 0.17 起真实面板被包进全视口的 `[data-dsh-panel-host]` 固定层，而旧逻辑测量
  `[data-dsh-better-sidebar]` 的**直接子元素**——现在只剩这一个全视口包装层，其矩形恰好满足
  "右对齐 / 底对齐"两条启发式，使 `sidebarRight` 被算成 `视口宽 − 200`，设置面板被推到
  **屏幕左侧**（约 112px 被裁出视口）；
- 修复：改为按 `[data-dsh-panel]` 标记测量**真实面板**（右侧面板与底部面板各命中一次），并新增
  `rect.width < 视口宽` / `rect.height < 视口高` 守卫排除 100vw 全宽抽屉等全视口元素；
- 行为恢复：右侧面板收起时设置面板贴右上（距右缘 16px），右侧面板展开时位于其左侧且不重叠，
  拖拽调整宽度时仍逐帧实时跟随；窄屏全宽抽屉不再误推位置（抽屉遮挡属于既有已知限制）。

## 构建

```powershell
node build.mjs
# pnpm 对 file: 依赖按内容拷贝，改完后同步到 profile 再刷新页面 / 重启：
Copy-Item lib\*.js <profile>\node_modules\dsh-task-notify\lib\ -Force
Copy-Item deepseek.png <profile>\node_modules\dsh-task-notify\ -Force
```

> 只换图标时无需重建：把新的 `deepseek.png` 覆盖到
> `<profile>\node_modules\dsh-task-notify\deepseek.png` 即可，下一条通知自动生效。

说明：构建使用 DeepSeek Harness 自带的 esbuild 与 vendored schemastery/cosmokit（`@deepseek-ai/dsh-*` 保持外部引用）；harness 不在默认路径时用环境变量指定：

```powershell
$env:DSH_HARNESS = 'D:\path\to\deepseek-harness'
```

wire 编解码为手写严格 schema，无额外运行时依赖。

## 许可

MIT

图标 `deepseek.png` 由 DeepSeek 品牌标识（`deepseek.svg`）转出，仅用作应用图标。
