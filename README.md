# dsh-task-notify

**Agent 停下来的那一刻，让 Windows 通知你。**

DSH（DeepSeek Harness）Web 插件：主回合 / 子代理 / 工作流任务完成时，以及 **agent 停下来等你操作时**
（需要审批、向你提问、计划待确认、目标受阻），弹出真正的 **Windows 系统通知**（带系统提示音与
DeepSeek 图标），可选 PushPlus 微信推送——浏览器关闭也能收到。

![version](https://img.shields.io/badge/version-1.7.0-2f81f7?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-3fb950?style=flat-square)
![platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078d4?style=flat-square)
![DSH](https://img.shields.io/badge/DSH%20Web-%E2%89%A5%200.1.6--alpha.1-8957e5?style=flat-square)

## 特性

| 能力 | 说明 |
| --- | --- |
| 🔔 **系统级通知** | 经 BurntToast（PowerShell 模块）调用 Windows 通知中心，播放系统提示音，无需网页授权 |
| 🖼️ **图标热更新** | 图标取自包内 `deepseek.png`（按内容指纹缓存），替换后**下一条通知立即换新**，无需重建或重启 |
| 📱 **手机推送** | 可选 PushPlus 推送，电脑不在身边也能收到 |
| ⏸️ **等你操作就提醒** | 审批请求、agent 提问、计划待确认、目标受阻——agent 停下的每一类场景都有独立通知 |
| 🎛️ **即改即存** | 总开关 + 7 个分类开关，改动立即落盘到 DSH settings，重启不丢 |
| 📐 **布局自适应** | 配置面板逐帧跟随 dsh-better-sidebar 的右侧 / 底部面板让位，不遮挡 |

## 通知一览

| 通知 | 触发时机 |
| --- | --- |
| **Agent任务完成** | 主回合 / 子代理 / 工作流结束 |
| **需要你的审批** | agent 权限不足发起提权、越权执行审批（审批策略 `ask`） |
| **Agent 正在问你** | agent 调用 `ask_user_question` 主动停下咨询 |
| **计划待你确认** | `/plan` 后 agent 调用 `exit_plan_mode` 提交计划、等待确认 |
| **目标受阻** | goal 自动回合因持续阻塞而停止 |

每条通知携带会话名（沿父链回溯到根会话）、时间与状态（完成 / 失败 / 中止 / 阻塞…）。
完整的触发条件、内容格式与状态文案见 [通知类型与触发时机](docs/notifications.md)。

## 快速开始

1. **装依赖**——Windows 10 / 11，通知由 BurntToast 经 PowerShell 7 发出：

   ```powershell
   Install-Module BurntToast -Scope CurrentUser
   ```

2. **装插件**——DSH ≥ 0.1.6-alpha.1，安装后自动 reconcile `dsh.profile.bundles`：

   ```powershell
   dsh plugin --profile web add git+https://github.com/V-Reason/dsh-task-notify.git
   ```

3. **验证**——重启 DSH，点击会话标题栏铃铛 →「通知类型」层 →「测试 Windows 通知」，
   应听到系统提示音并弹出带 DeepSeek 图标的 toast。

手机推送（可选）：在 https://www.pushplus.plus 扫码取「一对一推送」token → 展开「手机推送」层粘贴并
保存 → 点「测试手机推送」。

> 本地 `file:` 安装、升级方式与故障排查见 [安装与升级](docs/installation.md)；
> 面板交互与全部设置项见 [配置与使用](docs/configuration.md)。
> 升级 DSH 后插件失效时，先跑一次 `npm run verify` 定位平台契约变更；
> 排查方法与通用套路见 [DSH 升级后插件失效的排查手册](docs/troubleshooting.md)。

## 文档

| 文档 | 内容 |
| --- | --- |
| [安装与升级](docs/installation.md) | 环境要求、git 源 / 本地 `file:` 安装、重复注入与构建脚本故障排查 |
| [配置与使用](docs/configuration.md) | 铃铛与面板交互、设置项总表（含默认值）、PushPlus 接入 |
| [通知类型与触发时机](docs/notifications.md) | 7 类通知触发条件、内容构成、状态文案、通知通道与图标热更新 |
| [测试与验收](docs/testing.md) | 逐条验收表、契约校验脚本与实测记录 |
| [DSH 升级后插件失效的排查手册](docs/troubleshooting.md) | 失效形态判定、证据来源、案例复盘、高频破坏点与排查清单 |
| [构建与开发](docs/development.md) | 目录结构、构建与同步流程、实现要点与已知限制 |
| [版本历史](docs/changelog.md) | 1.1.0 → 1.7.0 全部变更 |

## 许可

以 [MIT](LICENSE) 许可发布。通知图标 `deepseek.png` 由 DeepSeek 品牌标识（`deepseek.svg`）转出，
仅用作应用图标。
