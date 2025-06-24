/**
 * 地址栏组件
 * 负责导航按钮、地址输入、收藏等功能
 */

class AddressBarManager {
    constructor() {
        // DOM 元素引用
        this.urlInput = document.getElementById('url-input');
        this.backButton = document.getElementById('back');
        this.forwardButton = document.getElementById('forward');
        this.reloadButton = document.getElementById('reload');
        this.homeButton = document.getElementById('home');
        this.addBookmarkButton = document.getElementById('add-bookmark');
        
        // 操作按钮
        this.historyBtn = document.getElementById('history-btn');
        this.favoritesBtn = document.getElementById('favorites-btn');
        this.settingsBtn = document.getElementById('settings-btn');
        this.clashDashboardBtn = document.getElementById('clash-dashboard-btn');
        this.toggleLogsBtn = document.getElementById('toggle-logs-btn');
        
        // 状态
        this.bookmarkTreeCache = [];
        this.homeURL = 'https://www.google.com';
        
        this.init();
    }

    async init() {
        // 初始化设置
        this.homeURL = await window.api.getSetting('settings.homepageCustomUrl') || 'https://www.google.com';
        
        // 绑定事件监听器
        this.bindEvents();
        
        // 初始化收藏夹
        await this.refreshBookmarks();
        
        // 监听收藏夹更新
        window.api.onBookmarkUpdated(() => {
            this.refreshBookmarks();
        });
        
        // 监听设置更新
        window.api.onSettingUpdated(({ key, value }) => {
            if (key === 'settings.homepageCustomUrl') {
                this.homeURL = value;
            }
        });
    }

    bindEvents() {
        // 导航按钮事件
        this.backButton.addEventListener('click', () => {
            const tab = window.tabsManager.getActiveTab();
            if (tab) tab.webview.goBack();
        });

        this.forwardButton.addEventListener('click', () => {
            const tab = window.tabsManager.getActiveTab();
            if (tab) tab.webview.goForward();
        });

        this.reloadButton.addEventListener('click', () => {
            const tab = window.tabsManager.getActiveTab();
            if (!tab) return;
            tab.webview.reload();
        });

        this.homeButton.addEventListener('click', async () => {
            const tab = window.tabsManager.getActiveTab();
            if (tab) {
                const homepageOption = await window.api.getSetting('settings.homepageOption') || 'custom';
                let url;
                
                if (homepageOption === 'newtab') {
                    const newtabOption = await window.api.getSetting('settings.newtabOption') || 'blank';
                    url = newtabOption === 'blank' ? 'about:blank' : 
                          (await window.api.getSetting('settings.newtabCustomUrl') || 'https://www.google.com');
                } else {
                    url = await window.api.getSetting('settings.homepageCustomUrl') || 'https://www.google.com';
                }
                
                tab.webview.loadURL(window.normalizeUrl(url));
            }
        });

        // 地址栏输入事件
        this.urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const tab = window.tabsManager.getActiveTab();
                if (!tab) return;
                
                const inputUrl = this.urlInput.value.trim();
                
                // 检查是否是内部协议URL
                if (window.INTERNAL_PROTOCOLS[inputUrl]) {
                    // 如果是内部协议，关闭当前标签页并打开新的系统页面
                    const currentTabId = tab.id;
                    window.tabsManager.createNewTab(inputUrl);
                    // 如果不是最后一个标签页，关闭当前标签页
                    if (window.tabsManager.tabs.length > 1) {
                        window.tabsManager.closeTab(currentTabId);
                    }
                } else {
                    // 普通URL导航
                    const url = window.normalizeUrl(inputUrl);
                    tab.webview.loadURL(url);
                    // 清除内部URL标记（因为现在加载的是外部网页）
                    tab.internalUrl = null;
                }
            }
        });

        // 收藏按钮事件
        this.addBookmarkButton.addEventListener('click', async () => {
            const activeTab = window.tabsManager.getActiveTab();
            if (!activeTab) return;
            const url = activeTab.webview.getURL();
            const title = activeTab.webview.getTitle();
            if (!url || !title) return;

            const existingBookmark = this.findBookmarkByUrl(this.bookmarkTreeCache, url);
            
            // 获取收藏按钮的位置信息
            const buttonRect = this.addBookmarkButton.getBoundingClientRect();
            console.log('Button rect:', buttonRect);
            
            // 请求主进程获取窗口位置，然后打开弹窗
            const windowBounds = await window.api.getWindowBounds();
            console.log('Window bounds:', windowBounds);
            
            const buttonPosition = {
                x: windowBounds.x + buttonRect.left,
                y: windowBounds.y + buttonRect.bottom + 8 // 在按钮下方8px处显示（考虑边框等）
            };
            console.log('Final button position:', buttonPosition);
            
            window.api.openAddBookmarkPopup({
                url,
                title,
                bookmark: existingBookmark, // Will be null if not bookmarked
                bookmarksTree: this.bookmarkTreeCache,
                buttonPosition: buttonPosition
            });
        });

        // 操作按钮事件
        this.historyBtn.addEventListener('click', () => {
            window.tabsManager.createNewTab('prism://history');
        });

        this.favoritesBtn.addEventListener('click', () => {
            window.tabsManager.createNewTab('prism://bookmarks');
        });

        this.settingsBtn.addEventListener('click', () => {
            window.tabsManager.createNewTab('prism://settings');
        });

        this.clashDashboardBtn.addEventListener('click', () => {
            window.tabsManager.createNewTab('prism://dashboard');
        });

        this.toggleLogsBtn.addEventListener('click', () => {
            const logViewer = document.getElementById('log-viewer');
            if (logViewer) {
                const isCurrentlyHidden = logViewer.style.display !== 'flex';
                logViewer.style.display = isCurrentlyHidden ? 'flex' : 'none';
            }
        });
    }

    // --- 从标签页更新地址栏 ---
    updateFromTab(tab) {
        if (!tab) return;
        
        // 显示内部协议URL或实际URL
        const displayUrl = tab.internalUrl || tab.webview.getURL() || tab.webview.src;
        this.urlInput.value = displayUrl;
        
        // 更新导航按钮状态
        this.updateNavButtonsState(tab);
        
        // 更新收藏星标
        this.updateBookmarkStar(tab.webview.getURL());
    }

    updateNavButtonsState(tab) {
        if (!tab) {
            tab = window.tabsManager.getActiveTab();
        }
        if (!tab) return;
        
        this.backButton.disabled = !tab.webview.canGoBack();
        this.forwardButton.disabled = !tab.webview.canGoForward();
    }

    // --- 收藏夹相关 ---
    findBookmarkByUrl(nodes, url) {
        for (const node of nodes) {
            if (node.type === 'bookmark' && node.url === url) {
                return node;
            }
            if (node.type === 'folder' && node.children) {
                const found = this.findBookmarkByUrl(node.children, url);
                if (found) return found;
            }
        }
        return null;
    }

    updateBookmarkStar(url) {
        if (!url) {
            this.addBookmarkButton.innerHTML = ''; 
            return;
        }
        
        // Search the entire tree to see if the URL is bookmarked anywhere
        const isBookmarked = this.findBookmarkByUrl(this.bookmarkTreeCache, url) !== null;
        this.addBookmarkButton.innerHTML = isBookmarked
            ? `<svg class="star-fill" viewBox="0 0 24 24" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
            : `<svg class="star-outline" viewBox="0 0 24 24" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    }

    async refreshBookmarks() {
        this.bookmarkTreeCache = await window.api.getBookmarksTree();
        
        // 更新当前标签页的收藏星标
        const activeTab = window.tabsManager.getActiveTab();
        if (activeTab) {
            this.updateBookmarkStar(activeTab.webview.getURL());
        }
    }
}

// 导出 AddressBarManager 类供主应用使用
window.AddressBarManager = AddressBarManager; 