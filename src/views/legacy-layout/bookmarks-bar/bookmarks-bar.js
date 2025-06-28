/**
 * 收藏夹栏组件
 * 负责收藏夹的显示、管理和交互
 * 支持多层目录和图标显示
 */

class BookmarksBarManager {
    constructor() {
        // DOM 元素引用
        this.bookmarksBar = document.getElementById('bookmarks-bar');
        
        // 状态管理
        this.currentBookmarks = [];
        this.activeDropdown = null;
        
        this.init();
    }

    async init() {
        // 初始化收藏夹
        await this.refreshBookmarks();
        
        // 监听收藏夹更新事件
        window.api.onBookmarkUpdated(() => {
            this.refreshBookmarks();
        });

        // 点击外部区域关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.bookmark-dropdown') && !e.target.closest('.bookmark-folder')) {
                this.closeAllDropdowns();
            }
        });
    }

    // --- 渲染收藏夹项目 ---
    renderBookmarks(bookmarks) {
        this.currentBookmarks = bookmarks;
        this.bookmarksBar.innerHTML = '';
        
        console.log('[收藏夹栏] 开始渲染收藏夹:', bookmarks);
        console.log('[收藏夹栏] 收藏夹数量:', bookmarks.length);
        
        bookmarks.forEach((bookmark, index) => {
            console.log(`[收藏夹栏] 渲染项目 ${index + 1}:`, {
                type: bookmark.type,
                title: bookmark.title,
                url: bookmark.url,
                favicon: bookmark.favicon,
                hasFavicon: !!bookmark.favicon
            });
            
            if (bookmark.type === 'bookmark') {
                this.createBookmarkItem(bookmark);
            } else if (bookmark.type === 'folder') {
                this.createFolderItem(bookmark);
            }
        });
    }

    // --- 创建书签项目 ---
    createBookmarkItem(bookmark) {
        console.log('[收藏夹栏] 创建书签项目:', {
            title: bookmark.title,
            url: bookmark.url,
            favicon: bookmark.favicon,
            faviconType: typeof bookmark.favicon
        });
        
        const item = document.createElement('a');
        item.className = 'bookmark-item';
        item.href = bookmark.url;
        item.title = `${bookmark.title}\\n${bookmark.url}`;
        
        // 网站图标
        const favicon = document.createElement('div');
        favicon.className = 'bookmark-favicon-wrapper';
        
        if (bookmark.favicon) {
            console.log('[收藏夹栏] 使用书签favicon:', bookmark.favicon);
            const img = document.createElement('img');
            img.className = 'bookmark-favicon';
            img.src = bookmark.favicon;
            img.onerror = () => {
                console.log('[收藏夹栏] Favicon加载失败，使用默认图标:', bookmark.favicon);
                img.style.display = 'none';
                favicon.innerHTML = this.getDefaultGlobeIcon();
            };
            img.onload = () => {
                console.log('[收藏夹栏] Favicon加载成功:', bookmark.favicon);
            };
            favicon.appendChild(img);
        } else {
            console.log('[收藏夹栏] 没有favicon，使用默认图标');
            favicon.innerHTML = this.getDefaultGlobeIcon();
        }
        item.appendChild(favicon);

        // 标题
        const titleSpan = document.createElement('span');
        titleSpan.className = 'bookmark-title';
        titleSpan.textContent = bookmark.title;
        item.appendChild(titleSpan);

        // 删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'bookmark-delete';
        deleteBtn.innerHTML = '&#x2715;';
        deleteBtn.title = '删除收藏';
        deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            await window.api.deleteBookmarks([bookmark.id]);
            this.refreshBookmarks();
        });
        item.appendChild(deleteBtn);
        
        item.addEventListener('click', (e) => { 
            e.preventDefault(); 
            if (window.tabsManager) {
                window.tabsManager.createNewTab(item.href); 
            }
        });
        
        this.bookmarksBar.appendChild(item);
    }

    // --- 创建文件夹项目 ---
    createFolderItem(folder) {
        const item = document.createElement('div');
        item.className = 'bookmark-folder';
        item.title = folder.title;
        
        // 文件夹图标
        const icon = document.createElement('span');
        icon.className = 'folder-icon';
        icon.innerHTML = '📁';
        item.appendChild(icon);

        // 文件夹名称
        const title = document.createElement('span');
        title.className = 'folder-title';
        title.textContent = folder.title;
        item.appendChild(title);

        // 下拉箭头
        const arrow = document.createElement('span');
        arrow.className = 'folder-arrow';
        arrow.innerHTML = '▼';
        item.appendChild(arrow);

        // 点击事件
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFolderDropdown(item, folder);
        });

        this.bookmarksBar.appendChild(item);
    }

    // --- 切换文件夹下拉菜单 ---
    toggleFolderDropdown(folderElement, folder) {
        // 关闭其他下拉菜单
        this.closeAllDropdowns();

        // 如果当前文件夹已经打开，则关闭
        if (this.activeDropdown === folderElement) {
            this.activeDropdown = null;
            return;
        }

        // 创建下拉菜单
        const dropdown = this.createDropdownMenu(folder.children || []);
        document.body.appendChild(dropdown);

        // 定位下拉菜单
        const rect = folderElement.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = (rect.bottom + 2) + 'px';
        dropdown.style.zIndex = '10000';

        this.activeDropdown = folderElement;
        folderElement.classList.add('active');
    }

    // --- 创建下拉菜单 ---
    createDropdownMenu(items) {
        const dropdown = document.createElement('div');
        dropdown.className = 'bookmark-dropdown';

        if (items.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-empty">文件夹为空</div>';
            return dropdown;
        }

        items.forEach(item => {
            if (item.type === 'bookmark') {
                const menuItem = this.createDropdownBookmarkItem(item);
                dropdown.appendChild(menuItem);
            } else if (item.type === 'folder') {
                const menuItem = this.createDropdownFolderItem(item);
                dropdown.appendChild(menuItem);
            }
        });

        return dropdown;
    }

    // --- 创建下拉菜单中的书签项目 ---
    createDropdownBookmarkItem(bookmark) {
        console.log('[收藏夹栏下拉] 创建下拉书签项目:', {
            title: bookmark.title,
            url: bookmark.url,
            favicon: bookmark.favicon,
            faviconType: typeof bookmark.favicon
        });
        
        const item = document.createElement('a');
        item.className = 'dropdown-item dropdown-bookmark';
        item.href = bookmark.url;
        item.title = bookmark.url;

        // 网站图标
        const favicon = document.createElement('div');
        favicon.className = 'dropdown-favicon';
        
        if (bookmark.favicon) {
            console.log('[收藏夹栏下拉] 使用书签favicon:', bookmark.favicon);
            const img = document.createElement('img');
            img.src = bookmark.favicon;
            img.onerror = () => {
                console.log('[收藏夹栏下拉] Favicon加载失败，使用默认图标:', bookmark.favicon);
                img.style.display = 'none';
                favicon.innerHTML = this.getDefaultGlobeIconSmall();
            };
            img.onload = () => {
                console.log('[收藏夹栏下拉] Favicon加载成功:', bookmark.favicon);
            };
            favicon.appendChild(img);
        } else {
            console.log('[收藏夹栏下拉] 没有favicon，使用默认图标');
            favicon.innerHTML = this.getDefaultGlobeIconSmall();
        }
        item.appendChild(favicon);

        // 标题
        const title = document.createElement('span');
        title.className = 'dropdown-title';
        title.textContent = bookmark.title;
        item.appendChild(title);

        item.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeAllDropdowns();
            if (window.tabsManager) {
                window.tabsManager.createNewTab(bookmark.url);
            }
        });

        return item;
    }

    // --- 创建下拉菜单中的文件夹项目 ---
    createDropdownFolderItem(folder) {
        const item = document.createElement('div');
        item.className = 'dropdown-item dropdown-folder';
        item.title = folder.title;

        // 文件夹图标
        const icon = document.createElement('span');
        icon.className = 'dropdown-folder-icon';
        icon.innerHTML = '📁';
        item.appendChild(icon);

        // 标题
        const title = document.createElement('span');
        title.className = 'dropdown-title';
        title.textContent = folder.title;
        item.appendChild(title);

        // 箭头
        const arrow = document.createElement('span');
        arrow.className = 'dropdown-arrow';
        arrow.innerHTML = '▶';
        item.appendChild(arrow);

        // 子菜单容器
        const submenu = document.createElement('div');
        submenu.className = 'dropdown-submenu';
        submenu.style.display = 'none';

        // 添加子项目
        if (folder.children && folder.children.length > 0) {
            folder.children.forEach(child => {
                if (child.type === 'bookmark') {
                    submenu.appendChild(this.createDropdownBookmarkItem(child));
                } else if (child.type === 'folder') {
                    submenu.appendChild(this.createDropdownFolderItem(child));
                }
            });
        } else {
            submenu.innerHTML = '<div class="dropdown-empty">文件夹为空</div>';
        }

        // 鼠标悬停显示子菜单
        item.addEventListener('mouseenter', () => {
            submenu.style.display = 'block';
            submenu.style.position = 'absolute';
            submenu.style.left = '100%';
            submenu.style.top = '0';
        });

        item.addEventListener('mouseleave', () => {
            submenu.style.display = 'none';
        });

        item.appendChild(submenu);
        return item;
    }

    // --- 关闭所有下拉菜单 ---
    closeAllDropdowns() {
        // 移除所有下拉菜单
        document.querySelectorAll('.bookmark-dropdown').forEach(dropdown => {
            dropdown.remove();
        });

        // 移除激活状态
        document.querySelectorAll('.bookmark-folder.active').forEach(folder => {
            folder.classList.remove('active');
        });

        this.activeDropdown = null;
    }

    // --- 刷新收藏夹数据 ---
    async refreshBookmarks() {
        try {
            const bookmarkTree = await window.api.getBookmarksTree();
            const toolbarFolder = bookmarkTree.find(node => node.id === 'toolbar');
            const toolbarBookmarks = toolbarFolder ? toolbarFolder.children : [];
            this.renderBookmarks(toolbarBookmarks);
        } catch (error) {
            console.error('刷新收藏夹失败:', error);
        }
    }

    // --- 获取当前收藏夹列表 ---
    getCurrentBookmarks() {
        return this.currentBookmarks;
    }

    // --- 获取默认地球图标（书签栏尺寸：16x16） ---
    getDefaultGlobeIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; color: #909399;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
    }

    // --- 获取默认地球图标（下拉菜单尺寸：16x16） ---
    getDefaultGlobeIconSmall() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; color: #909399;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
    }
}

// 导出 BookmarksBarManager 类供主应用使用
window.BookmarksBarManager = BookmarksBarManager; 