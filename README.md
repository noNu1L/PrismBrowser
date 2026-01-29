# PrismBrowser 

[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Electron](https://img.shields.io/badge/Electron-29.1.5-47848F?style=flat-square&logo=electron)](https://www.electronjs.org/)
[![Clash.Meta](https://img.shields.io/badge/Clash.Meta-v1.19.10-1ddde0?style=flat-square)](https://github.com/MetaCubeX/mihomo)
[![Yacd-meta](https://img.shields.io/badge/Dashboard-Yacd--meta-blueviolet?style=flat-square)](https://github.com/MetaCubeX/Yacd-meta)
[![License](https://img.shields.io/github/license/mashape/apistatus.svg?style=flat-square)](LICENSE)

**PrismBrowser 是一款基于 Electron 构建的、内置 Clash.Meta 核心的轻量级浏览器，旨在提供一个开箱即用、集成了强大网络代理功能的浏览环境。**

![img.png](https://github.com/noNu1L/PrismBrowser/blob/master/document/img.png?raw=true)

构建难度太高，不再继续开发，归档处理

---

## ✨ 主要功能

- **基础浏览体验**:
  - 支持多标签页浏览。
  - 包含前进、后退、刷新、主页等标准导航功能。
  - 可视化的书签栏，方便快速访问常用网站。
  - 完整的历史记录页面。

- **深度集成 Clash.Meta**:
  - **内置核心**: 无需额外安装或配置，应用启动时自动运行 Clash.Meta (Mihomo) 核心。
  - **集成控制面板**: 内置最新版的 [Yacd-meta](https://github.com/MetaCubeX/Yacd-meta) 控制面板，通过图形化界面轻松管理代理策略、节点和规则。
  - **实时日志**: 内置日志查看器，方便监控 Clash 核心的运行状态和网络请求。

- **跨平台**:
  - 基于 Electron，理论上可以打包成 Windows, macOS 和 Linux 应用。

## 🛠️ 技术栈

- **核心框架**: [Electron](https://www.electronjs.org/) (`^29.1.5`)
- **代理核心**: [Clash.Meta (Mihomo)](https://github.com/MetaCubeX/mihomo) (`v1.19.10`)
- **代理面板**: [Yacd-meta](https://github.com/MetaCubeX/Yacd-meta) (`v0.3.7`)
- **前端技术**:
  - Vanilla JavaScript (ES6+)
  - HTML5 / CSS3
- **打包工具**: [electron-builder](https://www.electron.build/) (`^24.13.3`)
- **数据持久化**: [electron-store](https://github.com/sindresorhus/electron-store)

## 🚀 快速开始

在开始之前，请确保你的开发环境中已安装 [Node.js](https://nodejs.org/) (v16+), `git` 和 `pnpm`。

```bash
# 如果尚未安装 pnpm，请先全局安装
npm install -g pnpm
```

现在，按照以下步骤操作：

```bash
# 1. 克隆此仓库到本地
git clone https://github.com/your-username/PrismBrowser.git
cd PrismBrowser

# 2. 安装项目依赖
npm install

# 3. 更新并编译最新的控制面板 (首次运行或需要更新时执行)
npm run update-dashboard

# 4. 启动应用进行开发
npm start
```

## 📜 可用脚本

在 `package.json` 中定义了几个有用的脚本：

- `npm start`
  - 在开发模式下启动 Electron 应用。

- `npm run build`
  - 使用 `electron-builder` 将应用打包成可分发的安装程序 (例如 `.exe` 安装包)。

- `npm run update-dashboard`
  - 自动从 GitHub 拉取最新的 `Yacd-meta` 源码，进行编译，并替换到项目中。

## 📄 许可证

本项目基于 [MIT](LICENSE) 许可证开源。 
