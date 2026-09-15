# 构建与开发

[← 返回 README](../README.md)

## 目录结构

| 路径 | 作用 |
| --- | --- |
| `src/index.js` | 宿主侧插件：事件订阅、通知队列、Windows toast 与 PushPlus 推送、持久设置、BurntToast 自动安装 |
| `src/i18n.js` | 宿主 / 客户端共享的双语词典与查表（`host.*` 通知文案、`ui.*` 面板文案） |
| `src/contract.js` | host / client 共享的 wire 契约（严格 codec 与 typert manifest） |
| `src/client/index.js` | 客户端：铃铛按钮、毛玻璃配置面板、语言滑块、面板让位计算 |
| `src/client/locales.js` | 面板文案注册到共享 locale 服务的命名空间与词典 |
| `lib/` | 构建产物（`index.js`、`client.js`），随仓库提交以支持 git 源直装 |
| `build.mjs` | 构建脚本 |
| `tools/verify-contract.mjs` | 契约回归校验：对真实 DSH 验证已安装构建仍可激活（见[测试与验收](testing.md)） |
| `tools/check-toast-icon.mjs` | 图标回归校验：读 Windows 通知数据库，比对**实际记录的 `<image src>`**（toast 能弹出 ≠ 图标正确） |
| `tools/probe-toast-icon.mjs` | 按插件同样方式解析图标路径并发送一条探针通知，供上面两项检查使用 |
| `tools/dump-toast-db.py` | 直接列出最近若干条通知及其图片路径（Python 版，便于人工翻看） |
| `tools/check-client-bundle.mjs` | 构建产物自查：确认 `lib/client.js` 里双语词条确实被打了进去（未被 minify 丢掉或转义成查找不到的形态） |
| `tools/check-toast-command.mjs` | 构建产物自查：打印宿主半实际解析出的图标路径、是否含 8.3 短名 / 查询串，并用 `Test-Path` 复核 |
| `cordis.patch.yml` | 包内 bundle 补丁，用于注入宿主行 |
| `dsh.plugin.json` | 插件清单 |
| `deepseek.png` | 通知图标（可热替换） |
| `notify-demonstrate.png` | README 演示图（真实系统通知截图） |

## 构建

```powershell
node build.mjs
```

- 使用 DeepSeek Harness 自带的 esbuild 与 vendored schemastery / cosmokit（`@deepseek-ai/dsh-*`
  保持外部引用）；
- esbuild 路径不硬编码：脚本扫描 `node_modules/.pnpm/esbuild@*` 并按版本降序取用；
- harness 不在默认路径时用环境变量指定：

  ```powershell
  $env:DSH_HARNESS = 'D:\path\to\deepseek-harness'
  ```

- wire 编解码为手写严格 schema，无额外运行时依赖。

构建后**先跑契约校验**，再同步到 profile：

```powershell
node tools/verify-contract.mjs
```

## 同步到 profile

pnpm 对 `file:` 依赖按内容拷贝，改完后同步到 profile 再刷新页面 / 重启：

```powershell
Copy-Item lib\*.js <profile>\node_modules\dsh-task-notify\lib\ -Force
Copy-Item deepseek.png <profile>\node_modules\dsh-task-notify\ -Force
```

> 只换图标时无需重建：把新的 `deepseek.png` 覆盖到
> `<profile>\node_modules\dsh-task-notify\deepseek.png` 即可，下一条通知自动生效。

## 实现要点

| 主题 | 实现 |
| --- | --- |
| 通道 | 宿主侧直接弹窗（`pwsh.exe` + BurntToast）并推送 PushPlus，不依赖页面是否打开 |
| 依赖 | BurntToast 缺失时自动安装（先最新、再钉 1.1.0），每进程最多探测 / 安装一次，失败只记录不再重试 |
| 触发源 | `session/event`（计划模式与 `turn/end` 原因）、`subagent/end`、`workflow/end`、`agent/status`（仅根会话 `idle`） |
| 去重 | 3 秒去重窗口抑制成对事件；非根 agent 的 `idle` 直接跳过 |
| 队列 | 宿主保留最近 20 条通知的内存队列与 `next()` 读取接口 |
| 设置 | `ctx.settings.register('task-notify', …)` 持久化；客户端挂载后拉取并每 10 秒轮询同步 |
| 语言 | toast 与面板文案都取自共享 locale 偏好：宿主 `ctx.get('locale')`（读不到即中文），客户端 `locale.bind` + `locale.setLocale`；`src/i18n.js` 是唯一文案真相，`state` 折叠成键后再取词 |
| 客户端服务取用 | 客户端服务一律**按需解析**（每次现取再判断），不在 `apply()` 时读一次就缓存：客户端包可能在 locale 服务注册之前 apply，缓存下来的 `undefined` 会让滑块永久消失（1.8.0 首发即此问题）；也不用 `inject`，否则缺 locale 的组合会整行等待、连铃铛一起消失 |
| 运行版本自述 | 客户端在 `window.__DSH_TASK_NOTIFY__` 暴露 `{ build, hasLanguageSlider }`，用于一眼判定页面正在执行哪个构建 |
| 面板布局 | 优先按 DOM 的 `[data-dsh-panel]` 标记测量真实面板，回退到 `betterSidebar.subscribeState` 快照，rAF 逐帧计算右侧 / 底部让位 |
| 图标 | 按 SHA-1 指纹做内容寻址缓存，新 URI 强制系统重新渲染 |
| 图标变体顺序 | `TOAST_VARIANTS` 必须**把带 `-AppLogo` 的变体排在前面**：`showWindowsToast` 以「首个 exit 0」为准返回，而 `plain` 变体没有任何可失败之处，一旦排在首位就必然成功，logo 永远不会被传下去。BurntToast 的 `New-BTImage` 声明了 `[string] $Source = $Script:DefaultImage`，`New-BurntToastNotification` 在 `-AppLogo` 为空时正是**不带 `-Source`** 调用它，于是模块自带的吐司照片被静默写进通知，而命令仍以 exit 0 结束——插件、日志、面板全都显示成功 |

### wire 契约（易随平台漂移）

`TYPERT_MANIFEST` 与 5 个 `INVOCATIONS` 描述符同时供宿主（`ctx.typert.register`）与客户端
（`ctx.remote.$mount`）使用，必须与当前 DSH 的 `TypertCodec` 完全一致：

- strict codec 一律写 **`create: () => schema`**，**不要**写 `schema` 字段——DSH 改为惰性物化后，
  注册表与两端 Gateway 都会以 `typeof codec.create !== 'function'` 直接拒绝，宿主报
  `strict codec has no create() factory`，插件整行不激活；
- wire 类型符号（`dsh-task-notify#…`）与设置命名空间 `task-notify` 属于契约的一部分，改名即等于数据迁移；
- 改动契约后必须重建并跑 `node tools/verify-contract.mjs`，它能区分「插件坏了」与「平台契约变了」；
  这类问题的通用定位套路（失效形态判定、证据来源、高频破坏点、排查清单）见[排查手册](troubleshooting.md)。

## 已知限制

- 窄屏全宽抽屉展开时会遮挡配置面板（抽屉不参与让位计算）；
- Windows 通知依赖 `pwsh.exe`：PowerShell 7 无法由插件代装，缺失时只报错不安装；
- BurntToast 自动安装需要可达 PowerShell Gallery（首次安装要联网）；离线环境请按
  [安装与升级](installation.md) 手工预装，插件随后探测到模块即不再尝试安装；
- 语言只有中英两份文案，其它语言统一回退英文。

## 相关文档

- [安装与升级](installation.md)
- [通知类型与触发时机](notifications.md)
- [DSH 升级后插件失效的排查手册](troubleshooting.md)
- [版本历史](changelog.md)
