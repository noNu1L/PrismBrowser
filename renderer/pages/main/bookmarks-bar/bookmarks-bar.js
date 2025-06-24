/**
 * 收藏夹栏组件
 * 负责收藏夹的显示、管理和交互
 */

class BookmarksBarManager {
    constructor() {
        // DOM 元素引用
        this.bookmarksBar = document.getElementById('bookmarks-bar');
        
        // 状态管理
        this.currentBookmarks = [];
        
        this.init();
    }

    async init() {
        // 初始化收藏夹
        await this.refreshBookmarks();
        
        // 监听收藏夹更新事件
        window.api.onBookmarkUpdated(() => {
            this.refreshBookmarks();
        });
    }

    // --- 渲染收藏夹项目 ---
    renderBookmarks(bookmarks) {
        this.currentBookmarks = bookmarks;
        this.bookmarksBar.innerHTML = '';
        
        bookmarks.forEach(bookmark => {
            if (bookmark.type !== 'bookmark') return;

            const item = document.createElement('a');
            item.className = 'bookmark-item';
            item.href = bookmark.url;
            item.title = `${bookmark.title}\\n${bookmark.url}`;
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'bookmark-title';
            titleSpan.textContent = bookmark.title;
            item.appendChild(titleSpan);

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
        });
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
}

// 导出 BookmarksBarManager 类供主应用使用
window.BookmarksBarManager = BookmarksBarManager; 