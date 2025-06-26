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
        this.downloadsBtn = document.getElementById('downloads-btn');
        this.settingsBtn = document.getElementById('settings-btn');
        this.toggleLogsBtn = document.getElementById('toggle-logs-btn');
        this.mainMenuBtn = document.getElementById('main-menu-btn');
        
        // 状态
        this.bookmarkTreeCache = [];
        this.homeURL = '';
        
        this.init();
    }

    async init() {
        // 初始化设置
        this.homeURL = await window.api.getSetting('settings.homepageCustomUrl') || 'https://www.bing.com';
        
        // 绑定事件监听器
        this.bindEvents();
        
        // 初始化收藏夹
        await this.refreshBookmarks();
        
        // 初始化工具栏按钮可见性
        await this.updateToolbarVisibility();
        
        // 监听收藏夹更新
        window.api.onBookmarkUpdated(() => {
            this.refreshBookmarks();
        });
        
        // 监听设置更新
        window.api.onSettingUpdated(({ key, value }) => {
            if (key === 'settings.homepageCustomUrl') {
                this.homeURL = value;
            } else if (key.startsWith('settings.toolbar.')) {
                this.updateToolbarVisibility();
            }
        });
        
        // 监听窗口失去焦点事件来关闭弹窗
        window.api.onWindowBlurred(() => {
            this.hideMainMenu();
            this.hideDownloadsPopup();
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
                
                if (homepageOption === 'blank') {
                    url = 'about:blank';
                } else {
                    url = await window.api.getSetting('settings.homepageCustomUrl') || 'https://www.bing.com';
                }
                
                // 清除内部URL标记，因为现在要导航到普通网页
                tab.internalUrl = null;
                
                // 立即更新地址栏显示
                this.urlInput.value = url;
                
                // 加载新的URL
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
            
            // 请求主进程获取窗口位置，然后打开弹窗
            const windowBounds = await window.api.getWindowBounds();
            
            // 弹窗尺寸（与CSS中设置的尺寸保持一致）
            const popupWidth = 320;
            const popupHeight = 200; // 估算高度
            
            // 计算弹窗位置
            let popupX = windowBounds.x + buttonRect.left;
            let popupY = windowBounds.y + buttonRect.bottom + 8;
            
            // 获取屏幕尺寸
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            
            // 检查右边界，如果弹窗会超出屏幕右边界，则向左调整
            if (popupX + popupWidth > screenWidth - 20) { // 留20px边距
                popupX = screenWidth - popupWidth - 20;
            }
            
            // 检查左边界，确保不会超出屏幕左边
            if (popupX < 20) {
                popupX = 20;
            }
            
            // 检查下边界，如果弹窗会超出屏幕下边界，则显示在按钮上方
            if (popupY + popupHeight > screenHeight - 50) {
                popupY = windowBounds.y + buttonRect.top - popupHeight - 8;
            }
            
            // 检查上边界
            if (popupY < 50) {
                popupY = 50;
            }
            
            const buttonPosition = {
                x: popupX,
                y: popupY
            };
            
            window.api.openAddBookmarkPopup({
                url,
                title,
                bookmark: existingBookmark, // 如果未收藏则为 null
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

        this.downloadsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDownloadsPopup();
        });

        this.settingsBtn.addEventListener('click', () => {
            window.tabsManager.createNewTab('prism://settings');
        });

        this.toggleLogsBtn.addEventListener('click', () => {
            // 调用日志查看器组件的切换方法
            if (window.logViewerManager) {
                window.logViewerManager.toggle();
            } else {
                console.warn('日志查看器管理器尚未初始化');
            }
        });

        this.mainMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMainMenu();
        });
    }

    // --- 主菜单管理 ---
    toggleMainMenu() {
        const menu = document.getElementById('main-menu-popup');
        if (!menu || menu.style.display !== 'none') {
            this.hideMainMenu();
        } else {
            this.showMainMenu();
        }
    }

    showMainMenu() {
        const menu = document.getElementById('main-menu-popup');
        if (!menu) return;

        // 创建菜单项
        menu.innerHTML = this.createMenuItems();

        // 定位菜单
        const buttonRect = this.mainMenuBtn.getBoundingClientRect();
        menu.style.display = 'block';
        menu.style.top = `${buttonRect.bottom + 5}px`;
        menu.style.right = `${window.innerWidth - buttonRect.right}px`;

        // 添加菜单项的事件监听
        this.addMenuItemListeners(menu);

        // 创建并显示一个透明的遮罩层，用于捕获外部点击
        this.createClickEater(this.hideMainMenu.bind(this));
    }

    createClickEater(onClick) {
        // 移除已存在的遮罩层
        this.removeClickEater();

        const clickEater = document.createElement('div');
        clickEater.id = 'click-eater';
        clickEater.style.position = 'fixed';
        clickEater.style.top = '0';
        clickEater.style.left = '0';
        clickEater.style.width = '100vw';
        clickEater.style.height = '100vh';
        clickEater.style.zIndex = '9998'; // 确保在弹窗之下，但在页面大部分内容之上
        clickEater.style.background = 'transparent'; // 完全透明
        clickEater.style.webkitAppRegion = 'no-drag'; // 关键：让遮罩层自身成为可交互区，捕获所有点击

        clickEater.addEventListener('click', () => {
            onClick();
        }, { once: true }); // 点击一次后自动移除监听器

        document.body.appendChild(clickEater);
    }
    
    removeClickEater() {
        const clickEater = document.getElementById('click-eater');
        if (clickEater) {
            clickEater.remove();
        }
    }

    setupOutsideClickHandler() {
        // 此方法不再需要，由 createClickEater 替代
    }

    hideMainMenu() {
        const menu = document.getElementById('main-menu-popup');
        if (menu) {
            menu.style.display = 'none';
        }

        // 移除遮罩层
        this.removeClickEater();
    }

    createMenuItems() {
        const menuItems = [
            { id: 'menu-toggle-logs', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>', text: '切换日志', action: 'toggle-logs' },
            { id: 'menu-favorites', icon: window.SYSTEM_ICONS.bookmarks, text: '收藏夹', action: 'prism://bookmarks' },
            { id: 'menu-history', icon: window.SYSTEM_ICONS.history, text: '历史记录', action: 'prism://history' },
            { id: 'menu-downloads', icon: window.SYSTEM_ICONS.downloads, text: '下载管理', action: 'prism://downloads' },
            { id: 'menu-settings', icon: window.SYSTEM_ICONS.settings, text: '设置', action: 'prism://settings' },
            { separator: true },
            { id: 'menu-dashboard', icon: window.SYSTEM_ICONS.dashboard, text: '代理面板', action: 'prism://dashboard' },
            { separator: true },
            { id: 'menu-reset-data', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>', text: '数据初始化', action: 'reset-data' },
            { separator: true },
            { id: 'menu-page-devtools', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>', text: '切换页面开发者工具', action: 'page-devtools' },
            { id: 'menu-main-devtools', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>', text: '切换主窗口开发者工具', action: 'main-devtools' }
        ];

        return menuItems.map(item => {
            if (item.separator) {
                return `<div class="popup-menu-separator"></div>`;
            }
            return `
                <div class="popup-menu-item" id="${item.id}" data-action="${item.action}">
                    ${item.icon}
                    <span>${item.text}</span>
                </div>
            `;
        }).join('');
    }

    addMenuItemListeners(menu) {
        menu.querySelectorAll('.popup-menu-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                const action = e.currentTarget.dataset.action;
                if (action) {
                    if (action === 'page-devtools') {
                        const activeTab = window.tabsManager.getActiveTab();
                        if (activeTab && activeTab.webview) {
                            activeTab.webview.openDevTools();
                        }
                    } else if (action === 'main-devtools') {
                        window.api.toggleMainDevTools();
                    } else if (action === 'toggle-logs') {
                        // 调用日志查看器组件的切换方法
                        if (window.logViewerManager) {
                            window.logViewerManager.toggle();
                        } else {
                            console.warn('日志查看器管理器尚未初始化');
                        }
                    } else if (action === 'reset-data') {
                        // 数据初始化确认对话框
                        await this.handleDataReset();
                    } else {
                        window.tabsManager.createNewTab(action);
                    }
                }
                this.hideMainMenu();
            });
        });
    }

    // --- 数据初始化处理 ---
    async handleDataReset() {
        try {
            // 显示确认对话框
            const confirmed = await window.api.showConfirmDialog({
                type: 'warning',
                title: '数据初始化确认',
                message: '此操作将清空所有数据，包括：\n\n• 浏览历史记录\n• 收藏夹和书签\n• 下载记录\n• 所有设置和偏好\n• 缓存和Cookie\n\n此操作不可撤销，确定要继续吗？',
                buttons: ['取消', '确定初始化'],
                defaultId: 0,
                cancelId: 0
            });

            if (confirmed.response === 1) { // 用户点击了"确定初始化"
                // 显示第二次确认
                const doubleConfirmed = await window.api.showConfirmDialog({
                    type: 'error',
                    title: '最终确认',
                    message: '请再次确认：您真的要删除所有数据并恢复到初始状态吗？\n\n这将关闭浏览器并清空所有用户数据。',
                    buttons: ['取消', '是的，清空所有数据'],
                    defaultId: 0,
                    cancelId: 0
                });

                if (doubleConfirmed.response === 1) {
                    // 执行数据初始化
                    await window.api.resetAllData();
                }
            }
        } catch (error) {
            console.error('数据初始化失败:', error);
            // 可以考虑显示错误提示
        }
    }

    // --- 从标签页更新地址栏 ---
    updateFromTab(tab) {
        if (!tab) return;
        
        try {
            // 显示内部协议URL或实际URL
            let displayUrl = tab.internalUrl || '';
            
            // 只有当webview准备好时才尝试获取URL
            if (tab.webview && typeof tab.webview.getURL === 'function') {
                try {
                    const webviewUrl = tab.webview.getURL();
                    if (webviewUrl && !tab.internalUrl) {
                        displayUrl = webviewUrl;
                    }
                } catch (e) {
                    // webview还没准备好，使用src或默认值
                    displayUrl = tab.webview.src || displayUrl || 'Loading...';
                }
            }
            
            this.urlInput.value = displayUrl;
            
            // 更新导航按钮状态
            this.updateNavButtonsState(tab);
            
            // 更新收藏星标
            try {
                if (tab.webview && typeof tab.webview.getURL === 'function') {
                    const bookmarkUrl = tab.webview.getURL();
                    if (bookmarkUrl) {
                        this.updateBookmarkStar(bookmarkUrl);
                    } else {
                        this.updateBookmarkStar('');
                    }
                } else {
                    this.updateBookmarkStar('');
                }
            } catch (e) {
                this.updateBookmarkStar('');
            }
        } catch (error) {
            console.error('Error updating address bar from tab:', error);
            this.urlInput.value = 'Loading...';
            this.updateBookmarkStar('');
        }
    }

    updateNavButtonsState(tab) {
        if (!tab) {
            tab = window.tabsManager.getActiveTab();
        }
        if (!tab) return;
        
        try {
            // 只有当webview准备好时才尝试检查导航状态
            if (tab.webview && typeof tab.webview.canGoBack === 'function' && typeof tab.webview.canGoForward === 'function') {
                this.backButton.disabled = !tab.webview.canGoBack();
                this.forwardButton.disabled = !tab.webview.canGoForward();
            } else {
                // webview还没准备好，禁用导航按钮
                this.backButton.disabled = true;
                this.forwardButton.disabled = true;
            }
        } catch (error) {
            console.error('Error updating navigation buttons state:', error);
            this.backButton.disabled = true;
            this.forwardButton.disabled = true;
        }
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
        
        // 搜索整个树以查看 URL 是否在任何地方被收藏
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
            try {
                if (activeTab.webview && typeof activeTab.webview.getURL === 'function') {
                    const url = activeTab.webview.getURL();
                    this.updateBookmarkStar(url || '');
                } else {
                    this.updateBookmarkStar('');
                }
            } catch (error) {
                console.error('Error getting URL for bookmark star update:', error);
                this.updateBookmarkStar('');
            }
        }
    }

    // --- 工具栏可见性管理 ---
    async updateToolbarVisibility() {
        try {
            // 获取工具栏设置
            const showToggleLogs = await window.api.getSetting('settings.toolbar.showToggleLogs') ?? true;
            const showFavorites = await window.api.getSetting('settings.toolbar.showFavorites') ?? true;
            const showHistory = await window.api.getSetting('settings.toolbar.showHistory') ?? true;
            const showDownloads = await window.api.getSetting('settings.toolbar.showDownloads') ?? true;
            const showSettings = await window.api.getSetting('settings.toolbar.showSettings') ?? true;
            const showHome = await window.api.getSetting('settings.toolbar.showHome') ?? true;

            // 更新按钮可见性
            if (this.toggleLogsBtn) {
                this.toggleLogsBtn.style.display = showToggleLogs ? 'block' : 'none';
            }
            if (this.favoritesBtn) {
                this.favoritesBtn.style.display = showFavorites ? 'block' : 'none';
            }
            if (this.historyBtn) {
                this.historyBtn.style.display = showHistory ? 'block' : 'none';
            }
            if (this.downloadsBtn) {
                this.downloadsBtn.style.display = showDownloads ? 'block' : 'none';
            }
            if (this.settingsBtn) {
                this.settingsBtn.style.display = showSettings ? 'block' : 'none';
            }
            if (this.homeButton) {
                this.homeButton.style.display = showHome ? 'block' : 'none';
            }
        } catch (error) {
            console.error('更新工具栏可见性失败:', error);
        }
    }

    // --- 下载弹窗管理 ---
    toggleDownloadsPopup() {
        const popup = document.getElementById('downloads-popup');
        if (!popup || popup.style.display !== 'block') {
            this.showDownloadsPopup();
        } else {
            this.hideDownloadsPopup();
        }
    }

    async showDownloadsPopup() {
        const popup = document.getElementById('downloads-popup');
        if (!popup) return;

        // 创建弹窗内容
        popup.innerHTML = await this.createDownloadsPopupContent();

        // 定位弹窗
        const buttonRect = this.downloadsBtn.getBoundingClientRect();
        popup.style.display = 'block';
        popup.style.top = `${buttonRect.bottom + 5}px`;
        popup.style.right = `${window.innerWidth - buttonRect.right}px`;

        // 添加事件监听
        this.addDownloadsPopupListeners(popup);

        // 创建并显示一个透明的遮罩层，用于捕获外部点击
        this.createClickEater(this.hideDownloadsPopup.bind(this));
    }

    setupDownloadsOutsideClickHandler() {
       // 此方法不再需要，由 createClickEater 替代
    }

    hideDownloadsPopup() {
        const popup = document.getElementById('downloads-popup');
        if (popup) {
            popup.style.display = 'none';
        }

        // 移除遮罩层
        this.removeClickEater();
    }

    async createDownloadsPopupContent() {
        const downloads = await window.api.getDownloads() || [];
        const downloadingItems = downloads.filter(item => item.status === 'downloading' || item.status === 'paused');
        const recentItems = downloads.slice(0, 5); // 显示最近5个下载

        const formatFileSize = (bytes) => {
            if (!bytes) return '0 B';
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        };

        const getHostname = (url) => {
            try { return new URL(url).hostname; } catch (e) { return url; }
        };

        const getFileIcon = (filename) => {
            const ext = filename.split('.').pop().toLowerCase();
            switch (ext) {
                case 'pdf':
                    return `<div class="file-icon pdf">📄</div>`;
                case 'doc':
                case 'docx':
                    return `<div class="file-icon doc">📝</div>`;
                case 'xls':
                case 'xlsx':
                    return `<div class="file-icon xls">📊</div>`;
                case 'zip':
                case 'rar':
                case '7z':
                    return `<div class="file-icon zip">🗜️</div>`;
                case 'exe':
                    return `<div class="file-icon exe">⚙️</div>`;
                default:
                    return `<div class="file-icon default">📁</div>`;
            }
        };

        let content = `
            <div class="downloads-popup-header">
                <h3>下载</h3>
                <div class="downloads-popup-actions">
                    <button class="downloads-popup-btn" id="downloads-manage-btn">
                        下载管理
                    </button>
                </div>
            </div>
        `;

        if (downloadingItems.length > 0) {
            content += '<div class="downloads-section"><h4>正在下载</h4>';
            downloadingItems.forEach(item => {
                const progress = item.totalBytes > 0 ? (item.receivedBytes / item.totalBytes * 100) : 0;
                content += `
                    <div class="download-popup-item downloading">
                        ${getFileIcon(item.filename)}
                        <div class="download-popup-info">
                            <div class="download-popup-filename">${item.filename}</div>
                            <div class="download-popup-source">${getHostname(item.url)}</div>
                            <div class="download-popup-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progress}%"></div>
                                </div>
                                <span class="progress-text">${Math.round(progress)}%</span>
                            </div>
                        </div>
                        <div class="download-popup-actions">
                            ${item.status === 'downloading' ? 
                              `<button class="download-action-btn pause-btn" data-id="${item.id}" title="暂停">⏸</button>` :
                              `<button class="download-action-btn resume-btn" data-id="${item.id}" title="继续">▶</button>`
                            }
                        </div>
                    </div>
                `;
            });
            content += '</div>';
        }

        if (recentItems.length > 0) {
            content += '<div class="downloads-section"><h4>最近下载</h4>';
            recentItems.forEach(item => {
                if (item.status === 'downloading' || item.status === 'paused') return; // 跳过正在下载的
                
                const statusText = item.status === 'completed' ? '已完成' :
                                 item.status === 'error' ? '下载失败' :
                                 item.status === 'cancelled' ? '已取消' : '未知';
                
                content += `
                    <div class="download-popup-item ${item.status}">
                        ${getFileIcon(item.filename)}
                        <div class="download-popup-info">
                            <div class="download-popup-filename">${item.filename}</div>
                            <div class="download-popup-source">${getHostname(item.url)}</div>
                            <div class="download-popup-status">${statusText}${item.status === 'completed' ? ` • ${formatFileSize(item.totalBytes)}` : ''}</div>
                        </div>
                        <div class="download-popup-actions">
                            ${item.status === 'completed' ? 
                              `<button class="download-action-btn open-btn" data-id="${item.id}" title="打开">📁</button>` :
                              `<button class="download-action-btn delete-btn" data-id="${item.id}" title="删除">🗑</button>`
                            }
                        </div>
                    </div>
                `;
            });
            content += '</div>';
        }

        if (downloads.length === 0) {
            content += `
                <div class="downloads-empty">
                    <div class="downloads-empty-icon">📥</div>
                    <p>暂无下载</p>
                </div>
            `;
        }

        return content;
    }

    addDownloadsPopupListeners(popup) {
        // 下载管理按钮
        const manageBtn = popup.querySelector('#downloads-manage-btn');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => {
                window.tabsManager.createNewTab('prism://downloads');
                this.hideDownloadsPopup();
            });
        }

        // 暂停/继续按钮
        popup.querySelectorAll('.pause-btn, .resume-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const downloadId = btn.dataset.id;
                if (btn.classList.contains('pause-btn')) {
                    await window.api.pauseDownload(downloadId);
                } else {
                    await window.api.resumeDownload(downloadId);
                }
                // 刷新弹窗内容
                setTimeout(() => this.showDownloadsPopup(), 100);
            });
        });

        // 打开文件按钮
        popup.querySelectorAll('.open-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const downloadId = btn.dataset.id;
                await window.api.openDownloadFile(downloadId);
            });
        });

        // 删除按钮
        popup.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const downloadId = btn.dataset.id;
                await window.api.deleteDownload(downloadId);
                // 刷新弹窗内容
                setTimeout(() => this.showDownloadsPopup(), 100);
            });
        });
    }
}

// 导出 AddressBarManager 类供主应用使用
window.AddressBarManager = AddressBarManager; 