# 安装与升级

[← 返回 README](../README.md)

## 环境要求

| 项目 | 要求 |
| --- | --- |
| 操作系统 | Windows 10 / 11 |
| 宿主 | DSH Web（profile 插件机制），**≥ 0.1.7-rc.1**（1.8.2 起；0.1.7 删除了旧的 `settings.register`，更早版本请用 1.8.1） |
| 运行依赖 | PowerShell 7（`pwsh`）；BurntToast 模块由插件自动安装 |

通知由 BurntToast 的 `New-BurntToastNotification` 经 `pwsh.exe` 发出，模块必须装在 **PowerShell 7
的模块路径**下（Windows PowerShell 5.1 看不到它）。插件会自己保证这一点：

- 插件激活后**后台探测**一次；`pwsh` 能导入 BurntToast 时不做任何事（已装机器上零打扰）；
- 导入失败时**自动安装**（当前用户范围、免管理员）：

  ```powershell
  Install-Module BurntToast -Scope CurrentUser -Force -AllowClobber
  ```

  先装最新版，失败再钉 `-RequiredVersion 1.1.0`；装完在同一次调用里重新导入校验；
- 安装**每个进程最多一次**：失败会被记住，不会每条通知都去联网重试；失败原因按语言写进宿主日志
  （`[dsh-task-notify] BurntToast install failed …`）并出现在「测试 Windows 通知」的失败提示里；
- `pwsh.exe` 不在 PATH 时不会尝试安装，而是直接报「未找到 PowerShell 7」——PowerShell 本身无法由
  插件代装；
- 想手工预装（例如无外网、需要离线分发）：

  ```powershell
  Install-Module BurntToast -Scope CurrentUser
  ```

## 方式 A：git 源直装（推荐）

适用于 DSH ≥ 0.1.7-rc.1，安装后自动 reconcile `dsh.profile.bundles`：

```powershell
dsh plugin --profile web add git+https://github.com/V-Reason/dsh-task-notify.git
```

升级与移除：

```powershell
dsh plugin --profile web update dsh-task-notify
dsh plugin --profile web remove dsh-task-notify
```

## 方式 B：本地 `file:` 依赖（手改 profile）

1. 在 profile 的 `package.json` 中 `dependencies` 增加：

   ```json
   "dsh-task-notify": "file:<本仓库路径>"
   ```

2. 在 `dsh.profile.bundles` 数组末尾追加 `"dsh-task-notify"`；
3. 在 profile 目录执行 `pnpm install`，重启 DSH。

## 注意事项

> 宿主行由本包自带的 bundle 补丁（`cordis.patch.yml`）注入，**不要**再写入 profile 的
> `cordis.patch.yml`，否则启动报 `duplicate loader entry id: dsh-task-notify`。

> profile 的 `pnpm-workspace.yaml` 中 `allowBuilds: node-pty: true` 必须为真，否则安装会以
> `ERR_PNPM_IGNORED_BUILDS` 失败（CLI 判定失败且不 reconcile bundles）。

## 故障排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| **升级 DSH 后插件整体失效**（无通知、铃铛与设置面板消失） | 平台 wire 契约变更，宿主 `apply()` 首句注册失败 → 整行未激活 | 先跑 `node tools/verify-contract.mjs` 定位；输出含 `strict codec has no create() factory` 即 1.6.1 → 1.7.0 那类漂移（见[版本历史](changelog.md)），升级到 ≥ 1.7.0 并重建同步；完整排查方法见[排查手册](troubleshooting.md) |
| 启动报 `duplicate loader entry id: dsh-task-notify` | profile 的 `cordis.patch.yml` 重复注入了宿主行 | 删除 profile 中的该条目，只保留包内 bundle 补丁 |
| 安装以 `ERR_PNPM_IGNORED_BUILDS` 失败 | pnpm 拦截了依赖的构建脚本 | 按 pnpm 提示把对应键加入 profile 的 `allowBuilds`，再重跑安装 |
| 更新源码后行为不变 | pnpm 对 `file:` 依赖按内容拷贝 | 重新 `pnpm install`，或手动同步 `lib/*.js`（见[构建与开发](development.md)） |
| 点「测试 Windows 通知」失败或没有任何弹窗 | BurntToast 未装在 pwsh 模块路径且自动安装失败，或 `pwsh.exe` 不在 PATH | 先看宿主日志：`BurntToast missing — installing it for the current user` 表示正在自动安装，紧随其后的 `install failed …` 带真实原因（无外网、PSGallery 不可达、模块被策略拦截等），此时按上面的命令手工安装即可；`未找到 PowerShell 7（pwsh.exe）` 则是 `pwsh -v` 不可用，需要先装 PowerShell 7。`verify-contract.mjs` 的「testNotify」一项也会报出真实原因 |

## 相关文档

- [配置与使用](configuration.md)
- [通知类型与触发时机](notifications.md)
- [DSH 升级后插件失效的排查手册](troubleshooting.md)
- [构建与开发](development.md)
