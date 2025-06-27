# PrismBrowser 前端分层架构设计

本项目参考 Java 后端常见的分层思想，结合 Vue + Element Plus 技术栈，采用前端分层架构，提升代码解耦性、可维护性和扩展性。

---

## 1. 分层结构概览

```
src/
  views/         # 视图层，页面和UI组件
  components/    # 通用UI组件
  services/      # 业务逻辑层
  store/         # 状态管理
  api/           # 数据访问层（本地存储、IPC、网络请求等）
  listeners/     # 监听器层（全局事件、主进程、快捷键、WebSocket等）
  utils/         # 工具函数目录（通用方法、辅助函数等）
  constants/     # 常量目录（全局常量、枚举、配置等）
  styles/        # 样式
  router/        # 路由配置
  main.js        # 入口文件
```

---

## 2. 各层职责说明

### 2.1 视图层（View/UI Layer）
- 负责所有页面和组件的UI展示与交互。
- 包含：页面组件（如首页、设置页、历史页）、通用组件（如按钮、弹窗、表格等）、样式文件（如theme.css）。

### 2.2 业务逻辑层（Service/Controller Layer）
- 负责处理业务逻辑、数据流转、状态管理。
- 包含：Vuex（或Pinia）状态管理、各类业务Service（如书签管理、历史管理、下载管理等）、弹窗控制、路由跳转等。

### 2.3 数据访问层（Model/DAO Layer）
- 负责与本地存储、后端接口、Electron主进程等的数据交互。
- 包含：本地数据库操作（如IndexedDB、localStorage）、与Electron主进程的IPC通信、网络请求等。

---

## 3. 典型调用流程

以"添加书签"为例：
1. 视图层：用户在UI上点击"添加书签"按钮，弹出表单。
2. 业务逻辑层：表单提交后，调用`bookmarkService.addBookmark(data)`。
3. 数据访问层：`bookmarkService`内部调用`api/bookmark.js`，将数据存储到本地或通过IPC发给主进程。
4. 状态管理：成功后，更新全局书签状态，视图层自动刷新。

---

## 4. 目录结构建议

- `views/`：页面级组件（如首页、设置页、历史页等）
- `components/`：通用UI组件（如按钮、弹窗、表格等）
- `services/`：业务逻辑处理（如书签、历史、下载等Service）
- `store/`：全局状态管理（如Vuex/Pinia）
- `api/`：数据访问接口（本地存储、IPC、网络请求等）
- `listeners/`：事件监听与分发（全局事件、主进程、快捷键、WebSocket等）
- `utils/`：工具函数（如格式化、校验、通用算法等）
- `constants/`：全局常量、枚举、配置等
- `styles/`：全局和主题样式
- `router/`：路由配置

---

## 5. 备注

- 所有代码注释使用中文，日志输出使用英文。
- 目录结构可根据实际项目规模适当调整。

---

## 6. 监听器层（Listeners/Event Layer）

### 6.1 职责说明
- 负责全局事件、主进程消息、快捷键、WebSocket等监听与分发。
- 统一注册/注销全局事件，解耦业务逻辑与事件源。
- 便于集中管理和扩展各类监听器，提升项目可维护性。

### 6.2 适用场景
- 项目中存在较多全局事件、主进程通信、快捷键、消息推送等监听需求。
- 需要统一管理和分发事件，避免分散在各业务模块中导致混乱。

### 6.3 目录结构建议

```
src/
  listeners/           # 事件监听与分发相关代码
    globalEvents.js    # 浏览器全局事件监听
    ipcListeners.js    # Electron主进程通信监听
    shortcutListeners.js # 快捷键监听
    wsListeners.js     # WebSocket消息监听
```

---

## 7. 工具函数层（Utils Layer）
- 存放项目中通用的工具函数、辅助方法、格式化处理、校验等。
- 便于代码复用，避免重复造轮子。

## 8. 常量层（Constants Layer）
- 存放全局常量、枚举、配置信息等。
- 便于统一管理和维护项目中的静态数据。

--- 