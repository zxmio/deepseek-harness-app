# DSH Desktop

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）的 macOS 桌面壳。双击打开 App，自动在后台拉起 `dsh web` 服务并在窗口中加载界面，不需要装 Node、不需要敲命令行。

A macOS desktop wrapper for DeepSeek Harness: launches the bundled `dsh web` server and loads its UI in a native window. No Node.js or terminal required.

## 工作原理

- App 内置了固定版本的 `@deepseek-ai/dsh`（当前 `0.1.0-rc.6`）
- 启动时用 Electron 自带的 Node 运行时（`ELECTRON_RUN_AS_NODE`）在随机空闲端口上运行 `dsh web`
- 服务就绪后在窗口内加载界面；关闭窗口服务保持后台运行，Cmd+Q 退出时一并结束服务
- dsh 的配置沿用其默认位置（`$DSH_HOME`），与命令行版 dsh 通用
- 运行日志写在 `~/Library/Application Support/DSH Desktop/dsh.log`

## 开发运行

```bash
git clone https://github.com/zxmio/dsh-desktop.git
cd dsh-desktop
npm install
npm start
```

## 打包 dmg

```bash
npm run dist
```

产物在 `dist/` 目录。未签名的包首次打开需要右键 → 打开，或在「系统设置 → 隐私与安全性」中放行。

## 已知限制

- 暂无自定义图标（用的 Electron 默认图标）
- 未做 Apple 签名与公证，分发包会触发 Gatekeeper 提示
- dsh 处于 developer preview 阶段，本项目锁定其具体版本，升级随本项目发版

## License

MIT。DeepSeek Harness 本身同为 MIT 协议，版权归 DeepSeek AI。
