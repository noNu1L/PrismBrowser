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
                urlToLoad = await window.api.getSetting('settings.newtabCustomUrl') || 'https://www.google.com';
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

        const tabId = `tab-${Date.now()}`;
        
        const tabEl = document.createElement('div');
        tabEl.className = 'tab-item';
        tabEl.dataset.tabId = tabId;
        
        // 根据是否是系统页面设置不同的初始图标和标题
        const initialIcon = systemPageInfo ? window.SYSTEM_ICONS[systemPageInfo.icon] : window.defaultGlobeIcon;
        const initialTitle = systemPageInfo ? systemPageInfo.title : '新标签页';
        
        tabEl.innerHTML = `
            <div class="tab-icon-container">
                ${initialIcon}
                <div class="loading-spinner"></div>
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

        tabEl.addEventListener('click', () => this.switchToTab(tabId));
        tabEl.querySelector('.close-tab').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tabId);
        });
        
        if (!isHidden) {
            this.switchToTab(tabId);
        }
        // 如果已设置 src，无需再次调用 loadURL
    }

    switchToTab(tabId) {
        const tabToActivate = this.tabs.find(t => t.id === tabId);
        if (!tabToActivate) return;

        this.activeTabId = tabId;

        this.tabs.forEach(tab => {
            tab.el.classList.toggle('active', tab.id === tabId);
            tab.webview.classList.toggle('active', tab.id === tabId);
        });
        
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

        // Add to recently closed list if it's a valid web page
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
                this.createNewTab(); // 始终保持至少一个标签页
            }
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

    showLoadingIndicator(tabEl, show) {
        const iconContainer = tabEl.querySelector('.tab-icon-container');
        const spinner = iconContainer.querySelector('.loading-spinner');
        const icon = iconContainer.querySelector('.tab-icon');

        if (show) {
            if (icon) icon.style.display = 'none';
            if (spinner) spinner.style.display = 'block';
        } else {
            if (spinner) spinner.style.display = 'none';
            if (icon) icon.style.display = 'block';
        }
    }
}

// 导出 TabsManager 类供主应用使用
window.TabsManager = TabsManager; 