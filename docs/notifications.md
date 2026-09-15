# 通知类型与触发时机

[← 返回 README](../README.md)

## 一览

| 通知标题 | 触发时机 | 详情行 | 开关 |
| --- | --- | --- | --- |
| **Agent任务完成** | 主回合（用户驱动的根会话）空闲 | —— | `agent` |
| **Agent任务完成** | 子代理结束（`subagent/end`） | —— | `subagent` |
| **Agent任务完成** | 工作流结束（`workflow/end`） | —— | `workflow` |
| **需要你的审批** | agent 权限不足发起提权 / 越权执行审批（审批策略 `ask`） | 工具名、提权原因 | `approval` |
| **Agent 正在问你** | agent 调用 `ask_user_question` 主动停下咨询 | 问题文本 | `question` |
| **计划待你确认** | `/plan` 完成后 agent 调用 `exit_plan_mode` 提交计划、等待确认 | 计划标题与摘要（每条评审只提醒一次） | `plan` |
| **目标受阻** | goal 自动回合因持续阻塞而停止（模型上报或到达轮次上限） | 阻塞原因 | `goal` |

## 内容构成

每条通知携带 **会话名 + 时间 + 状态**：

- **会话名**：沿父链回溯到**根会话**取标题；无标题时回退到子代理 provider 或「工作流」等通用名；
- **状态**：主回合取该会话最后一个 `turn/end` 的结束原因；子代理 / 工作流分别取
  `subagent/end` 与 `workflow/end` 的 `stopReason`——三者共用同一张文案表（下表）。

| 原始枚举 | 文案 | 原始枚举 | 文案 |
| --- | --- | --- | --- |
| `completed` | 完成 | `blocked` | 阻塞 |
| `aborted` | 中止 | `interrupted` | 中断 |
| `error` | 失败 | `refusal` | 拒绝 |
| `max-tokens` | 超出上限 | `cancelled` | 取消 |
| 其他 / 未知 | 结束 | | |

## 通知通道

| 通道 | 实现 | 特点 |
| --- | --- | --- |
| Windows 系统通知 | BurntToast（`New-BurntToastNotification`，由 `pwsh.exe` 调用） | 系统提示音 + DeepSeek 图标，无需网页授权，浏览器关闭也能收到 |
| 手机推送 | PushPlus `send` 接口 | 电脑不在身边也能收到 |

BurntToast 的 `-Text` 最多接受 3 条（粗体标题 + 2 行正文），更多正文行会折进最后一条；
toast 弹出失败时不会抛出，只在宿主日志记录错误。

### 图标热更新

通知图标直接读取包内 `deepseek.png`：每次弹 toast 前按内容指纹（SHA-1）判断是否变化，变化后复制为
临时目录下的**内容寻址文件**，用新的图标 URI 强制系统重新渲染（Windows 按 URI 缓存 toast 图片）。

因此替换 `deepseek.png` 后**下一条通知立即使用新图标**，无需重建或重启插件。

## 去重与队列

- **3 秒去重窗口**：同键事件在 3 秒内只提醒一次，用于抑制「子代理结束 + 其自身 agent idle」这类成对事件；
- **主回合只认根会话**：`agent/status` 的 `idle` 对每个 agent 都会发出，非根 agent 直接跳过，子代理完成
  一律由 `subagent/end` 负责，避免与「子代理」开关职责重叠；
- 宿主保留最近 20 条通知的内存队列与 `next()` 读取接口。

## 相关文档

- [配置与使用](configuration.md)
- [测试与验收](testing.md)
- [构建与开发](development.md)
