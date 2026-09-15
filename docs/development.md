# 构建与开发

[← 返回 README](../README.md)

## 目录结构

| 路径 | 作用 |
| --- | --- |
| `src/index.js` | 宿主侧插件：事件订阅、通知队列、Windows toast 与 PushPlus 推送、持久设置 |
| `src/contract.js` | host / client 共享的 wire 契约（严格 codec 与 typert manifest） |
| `src/client/index.js` | 客户端：铃铛按钮、毛玻璃配置面板、面板让位计算 |
| `lib/` | 构建产物（`index.js`、`client.js`），随仓库提交以支持 git 源直装 |
| `build.mjs` | 构建脚本 |
| `tools/verify-contract.mjs` | 契约回归校验：对真实 DSH 验证已安装构建仍可激活（见[测试与验收](testing.md)） |
| `cordis.patch.yml` | 包内 bundle 补丁，用于注入宿主行 |
| `dsh.plugin.json` | 插件清单 |
| `deepseek.png` | 通知图标（可热替换） |

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
| 触发源 | `session/event`（计划模式与 `turn/end` 原因）、`subagent/end`、`workflow/end`、`agent/status`（仅根会话 `idle`） |
| 去重 | 3 秒去重窗口抑制成对事件；非根 agent 的 `idle` 直接跳过 |
| 队列 | 宿主保留最近 20 条通知的内存队列与 `next()` 读取接口 |
| 设置 | `ctx.settings.register('task-notify', …)` 持久化；客户端挂载后拉取并每 10 秒轮询同步 |
| 面板布局 | 优先按 DOM 的 `[data-dsh-panel]` 标记测量真实面板，回退到 `betterSidebar.subscribeState` 快照，rAF 逐帧计算右侧 / 底部让位 |
| 图标 | 按 SHA-1 指纹做内容寻址缓存，新 URI 强制系统重新渲染 |

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
- Windows 通知依赖 BurntToast 已安装在 PowerShell 7 的模块路径下；缺失时 toast 静默失败并在宿主日志
  记录错误。

## 相关文档

- [安装与升级](installation.md)
- [通知类型与触发时机](notifications.md)
- [DSH 升级后插件失效的排查手册](troubleshooting.md)
- [版本历史](changelog.md)
