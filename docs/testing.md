# 测试与验收

[← 返回 README](../README.md)

实测环境：Windows 11 + DSH Web，桌面 toast 通道（通知图标热更新一节另需一次「测试 Windows 通知」）。

## 验收表

| 通知 | 触发方式 | 预期内容 |
| --- | --- | --- |
| 任务完成 | agent 正常跑完一个回合（含子代理 / 工作流） | 会话名、时间、状态（完成 / 失败 / 中止…） |
| 需要审批 | 权限设为 read-only，agent 写文件被沙箱拒绝后申请提权（审批策略 `ask`） | 工具名、提权原因 |
| 询问用户 | agent 调用 `ask_user_question` 抛出问题后主动停下 | 问题文本 |
| 计划待确认 | `/plan` 进入计划模式，agent 调用 `exit_plan_mode` 提交带 `#` 标题的计划 | 计划标题与摘要（每条评审只提醒一次） |
| 目标受阻 | 创建注定无法完成的目标，跑满自动轮次上限或模型上报 blocked | 阻塞原因 |

## 实测记录

| 版本 | 结论 |
| --- | --- |
| v1.2.0 | **任务完成 / 需要审批 / 询问用户 / 目标受阻** 已实测通过 |
| v1.2.0 | **计划待确认** 需先在会话中进入计划模式（`/plan`）后由 agent 调用 `exit_plan_mode` 触发，按上表操作即可验收 |
| v1.6.1 | 已在宿主侧以「假 Cordis 上下文 + 假事件」回归验证上表全部触发条件与状态文案（见[版本历史](changelog.md)） |
| v1.7.0 | 该回归已固化为可执行脚本 `tools/verify-contract.mjs`（26 项检查全通过，见下节） |

## 契约校验（v1.7.0+）

平台契约变更（尤其是 Typert strict codec、Remote 描述符这类 wire 契约）不会以编译错误的形式暴露，
而是让插件在宿主侧**整行激活失败**：没有通知、没有铃铛、没有设置面板。因此每次**升级 DSH 之后**
以及每次**改动 `src/contract.js` 之后**，先跑一次：

```powershell
node tools/verify-contract.mjs      # 等价于 npm run verify
$env:DSH_HARNESS = 'D:\path\to\deepseek-harness'; node tools/verify-contract.mjs
```

脚本对**本机真实 DSH**依次检查：

1. **strict codec 契约**——5 个调用描述符的 6 个 codec 都带 `create()` 工厂，`create()` 返回同一
   缓存实例且暴露 `parse()`，并做正反解析（合法值通过、非法值拒绝）；
2. **宿主清单注册**——`ctx.typert.register(TYPERT_MANIFEST)` 在真实 `TypertRegistry` 上提交成功，
   5 个 `taskNotify/*` 端点可解析且仍保持 `create` 契约（**这一步就是故障现场的那一句**）；
3. **已安装构建**——默认加载 profile 内 `node_modules/dsh-task-notify/lib/index.js`（即运行中的 DSH
   真正加载的那份），在真实 Cordis 上下文里 `apply()` 并驱动 7 类合成事件，断言入队种类、状态文案、
   审批工具名/原因、计划标题与摘要、目标阻塞原因，以及总开关/分类开关的抑制行为；
4. **Windows toast 通道**——调用一次 `testNotify`，报告 `pwsh` + BurntToast 是否真的送达；
5. **负向对照**——把 codec 改回 `schema`-only 的形状必须仍被拒绝，保证脚本今后仍能识别同类漂移。

退出码 0 = 全部通过。默认校验「已安装副本」；要校验尚未同步的仓库产物，用
`DSH_TASK_NOTIFY_BUILD=<仓库>/lib/index.js` 指定，`DSH_TASK_NOTIFY_DEBUG=1` 打印每个候选路径与跳过原因。

## 验证通知图标热更新（v1.3.0+）

替换 `node_modules\dsh-task-notify\deepseek.png`（或仓库根目录的 `deepseek.png`，取决于 `file:` 依赖
是否软链）后，点「测试 Windows 通知」即可验证 toast 角标已换成新图标，无需重建插件或重启 DSH。

## 相关文档

- [通知类型与触发时机](notifications.md)
- [配置与使用](configuration.md)
- [DSH 升级后插件失效的排查手册](troubleshooting.md)
- [版本历史](changelog.md)
