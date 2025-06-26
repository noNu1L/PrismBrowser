/**
 * 标签栏组件
 * 负责标签页的创建、切换、关闭等操作
 */

class TabsManager {
    constructor() {
        // DOM 元素引用
        this.tabsContainer = document.getElementById('tabs-container');
        this.newTabBtn = document.getElementById('new-tab-btn');
        
        // 状态管理
        this.tabs = [];
        this.activeTabId = null;
        
        // 绑定方法的 this 上下文
        this.createNewTab = this.createNewTab.bind(this);
        this.switchToTab = this.switchToTab.bind(this);
        this.closeTab = this.closeTab.bind(this);
        this.getActiveTab = this.getActiveTab.bind(this);
        
        this.init();
    }

    init() {
        // 标签容器滚轮事件
        this.tabsContainer.addEventListener('wheel', (e) => {
            // e.deltaY 是垂直滚动量
            // 我们阻止默认的垂直滚动并将其应用于水平滚动
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                this.tabsContainer.scrollLeft += e.deltaY;
            }
        });

        // 新建标签页按钮
        this.newTabBtn.addEventListener('click', () => this.createNewTab());
    }

    // --- 系统页面管理 ---
    findExistingSystemTab(internalUrl) {
        return this.tabs.find(tab => {
            const tabUrl = tab.internalUrl || tab.webview.getURL();
            return tabUrl === internalUrl;
        });
    }

    openOrSwitchToSystemPage(internalUrl) {
        const existingTab = this.findExistingSystemTab(internalUrl);
        if (existingTab) {
            // 切换到已存在的标签页
            this.switchToTab(existingTab.id);
            return true;
        }
        return false;
    }

    // --- 标签页管理 ---
    async createNewTab(urlToLoad, isHidden = false) {
        // 如果没有提供 URL，表示这是一个"新标签页"操作
        // 我们需要根据新标签页设置来确定显示什么
        if (urlToLoad === null || typeof urlToLoad === 'undefined') {
            const newtabOption = await window.api.getSetting('settings.newtabOption') || 'blank';
            if (newtabOption === 'blank') {
                urlToLoad = 'about:blank';
            } else {
                urlToLoad = await window.api.getSetting('settings.newtabCustomUrl') || 'https://www.bing.com';
            }
        }

        // 检查是否是内部协议URL
        let internalUrl = null;
        let systemPageInfo = null;
        
        if (window.INTERNAL_PROTOCOLS[urlToLoad]) {
            internalUrl = urlToLoad;
            systemPageInfo = window.INTERNAL_PROTOCOLS[urlToLoad];
            
            // 检查是否已经存在相同的系统页面
            if (this.openOrSwitchToSystemPage(internalUrl)) {
                return; // 已存在，直接切换，不创建新标签页
            }
        }
        // 兼容旧式调用（直接传入文件名）
        else if (['history.html', 'bookmarks.html', 'settings.html'].includes(urlToLoad)) {
            const protocolMap = {
                'settings.html': 'prism://settings',
                'history.html': 'prism://history', 
                'bookmarks.html': 'prism://bookmarks'
            };
            internalUrl = protocolMap[urlToLoad];
            if (internalUrl && this.openOrSwitchToSystemPage(internalUrl)) {
                return; // 已存在，直接切换，不创建新标签页
            }
            systemPageInfo = window.INTERNAL_PROTOCOLS[internalUrl];
        }
        else if (urlToLoad.includes('dashboard')) {
            internalUrl = 'prism://dashboard';
            if (this.openOrSwitchToSystemPage(internalUrl)) {
                return; // 已存在，直接切换，不创建新标签页
            }
            systemPageInfo = window.INTERNAL_PROTOCOLS[internalUrl];
        }

        // 使用更唯一的ID生成方法，包括随机数避免冲突
        const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const tabEl = document.createElement('div');
        tabEl.className = 'tab-item';
        tabEl.dataset.tabId = tabId;
        
        // 根据是否是系统页面设置不同的初始图标和标题
        const initialIcon = systemPageInfo ? window.SYSTEM_ICONS[systemPageInfo.icon] : window.defaultGlobeIcon;
        const initialTitle = systemPageInfo ? systemPageInfo.title : '新标签页';
        
        tabEl.innerHTML = `
            <div class="tab-icon-container">
                ${initialIcon}
            </div>
            <span class="tab-title">${initialTitle}</span>
            <button class="close-tab" title="关闭标签页">&times;</button>
        `;
        this.tabsContainer.appendChild(tabEl);

        const webviewEl = document.createElement('webview');
        webviewEl.dataset.tabId = tabId;
        // 对于历史记录等本地页面，我们需要注入预加载脚本
        // 以便它可以访问 `window.api` 函数
        const preloadPath = await window.api.getPreloadPath();
        webviewEl.setAttribute('preload', preloadPath);
        // 设置partition让webview使用主窗口的session，这样下载事件可以被正确监听
        webviewEl.setAttribute('partition', 'persist:main');
        // 启用新窗口打开功能
        webviewEl.setAttribute('allowpopups', 'true');
        // 启用新窗口事件
        webviewEl.setAttribute('webpreferences', 'nativeWindowOpen=no');
        
        // 确定最终要加载的URL
        let finalUrl;
        if (systemPageInfo) {
            finalUrl = systemPageInfo.file;
        } else if (['history.html', 'bookmarks.html', 'settings.html'].includes(urlToLoad)) {
            finalUrl = '../' + urlToLoad;
        } else if (urlToLoad.includes('dashboard')) {
            finalUrl = '../dashboard/index.html';
        } else {
            finalUrl = window.normalizeUrl(urlToLoad);
        }
        webviewEl.src = finalUrl;
        
        // 在某些情况下，在添加监听器之前先添加到 DOM 是很重要的
        document.getElementById('webview-container').appendChild(webviewEl);
        
        const newTab = { 
            id: tabId, 
            el: tabEl, 
            webview: webviewEl, 
            favicon: null,
            internalUrl: internalUrl // 存储内部URL用于去重检查
        };
        this.tabs.push(newTab);

        // 在用户输入可能导致的任何导航之前附加监听器
        window.addWebviewListeners(newTab);

        // 使用立即执行函数确保每个标签页都有独立的闭包
        ((currentTabId) => {
            tabEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 检查是否点击了关闭按钮
                if (e.target.classList.contains('close-tab') || e.target.closest('.close-tab')) {
                    return;
                }
                
                this.switchToTab(currentTabId);
            });
        })(tabId);
        // 同样为关闭按钮使用独立闭包
        ((currentTabId) => {
            tabEl.querySelector('.close-tab').addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(currentTabId);
            });
        })(tabId);
        
        if (!isHidden) {
            this.switchToTab(tabId);
        }
        // 如果已设置 src，无需再次调用 loadURL
    }

    switchToTab(tabId) {
        const tabToActivate = this.tabs.find(t => t.id === tabId);
        if (!tabToActivate) {
            console.warn('尝试激活不存在的标签页:', tabId);
            return;
        }

        this.activeTabId = tabId;

        // 首先移除所有标签页的激活状态
        this.tabs.forEach(tab => {
            tab.el.classList.remove('active');
            tab.webview.classList.remove('active');
        });
        
        // 然后只为目标标签页添加激活状态
        tabToActivate.el.classList.add('active');
        tabToActivate.webview.classList.add('active');
        
        // 如果活动标签页不完全可见，则将其滚动到视野中
        const tabEl = tabToActivate.el;
        const container = this.tabsContainer;
        const tabRect = tabEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (tabRect.left < containerRect.left) {
            container.scrollLeft -= containerRect.left - tabRect.left;
        } else if (tabRect.right > containerRect.right) {
            container.scrollLeft += tabRect.right - containerRect.right;
        }

        // 通知地址栏更新
        if (window.addressBarManager) {
            window.addressBarManager.updateFromTab(tabToActivate);
        }

        // 隐藏错误页面
        const errorPage = document.getElementById('error-page');
        if (errorPage) {
            errorPage.style.display = 'none';
        }
    }

    closeTab(tabId) {
        const tabIndex = this.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;

        const tabToClose = this.tabs[tabIndex];
        
        // 如果是有效的网页，则添加到最近关闭列表中
        const url = tabToClose.webview.getURL();
        const title = tabToClose.webview.getTitle();
        if (url && title && !url.startsWith('file://') && url !== 'about:blank') {
            window.api.addRecentlyClosed({
                url,
                title,
                favicon: tabToClose.favicon,
                timestamp: new Date().toISOString()
            });
        }

        // 当 webview DOM 元素被移除时，大部分事件监听器会自动清理
        // 主进程已经设置了足够高的最大监听器数量来避免警告

        tabToClose.el.remove();
        const webviewContainer = document.getElementById('webview-container');
        if (webviewContainer && tabToClose.webview.parentNode) {
            webviewContainer.removeChild(tabToClose.webview); // 正确移除
        }
        this.tabs.splice(tabIndex, 1);
        
        if (this.activeTabId === tabId) {
            if (this.tabs.length > 0) {
                const newActiveIndex = Math.max(0, tabIndex - 1);
                this.switchToTab(this.tabs[newActiveIndex].id);
            } else {
                // 当关闭最后一个标签页时，先清除会话状态，然后关闭应用
                this.handleLastTabClosed();
            }
        }
    }

    // 处理最后一个标签页关闭
    async handleLastTabClosed() {
        try {
            // 立即清除会话状态，避免恢复空的浏览器
            await window.api.clearSessionState();
            // 然后通知主进程关闭应用
            window.api.lastTabClosed();
        } catch (error) {
            console.error('处理最后标签页关闭失败:', error);
            // 即使出错也要关闭应用
            window.api.lastTabClosed();
        }
    }

    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId);
    }

    // --- 辅助函数 ---
    setTabIcon(tabEl, iconHTML) {
        const iconContainer = tabEl.querySelector('.tab-icon-container');
        const newIcon = new DOMParser().parseFromString(iconHTML, "text/html").body.firstChild;
        
        // 清除当前内容（移除旧图标或加载动画）
        iconContainer.innerHTML = ''; 
        
        // 添加新图标
        iconContainer.appendChild(newIcon);

        // 如果新图标是 img 元素，存储其 src
        if (newIcon.tagName === 'IMG') {
            const activeTab = this.getActiveTab();
            if(activeTab) activeTab.favicon = newIcon.src;
        }
    }

    // 显示加载动画
    showLoading(tabEl) {
        const iconContainer = tabEl.querySelector('.tab-icon-container');
        iconContainer.innerHTML = '<div class="tab-loading-spinner"></div>';
    }

    // 隐藏加载动画，恢复图标
    hideLoading(tabEl) {
        const tabData = this.tabs.find(tab => tab.el === tabEl);
        if (tabData) {
            // 如果有favicon则显示favicon，否则显示默认图标
            if (tabData.favicon) {
                this.setTabIcon(tabEl, `<img class="tab-icon" src="${tabData.favicon}">`);
            } else {
                // 检查是否是系统页面
                const systemPageInfo = tabData.internalUrl ? window.INTERNAL_PROTOCOLS[tabData.internalUrl] : null;
                const defaultIcon = systemPageInfo ? window.SYSTEM_ICONS[systemPageInfo.icon] : window.defaultGlobeIcon;
                this.setTabIcon(tabEl, defaultIcon);
            }
        }
    }


}

// 导出 TabsManager 类供主应用使用
window.TabsManager = TabsManager; 