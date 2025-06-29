/**
 * PrismBrowser 开发调试面板
 */

class DebugPanel {
    constructor() {
        this.init();
    }

    init() {
        this.logs = []; // 初始化日志数组
        this.bindButtonEvents();
        this.refreshStatus();
        
        // 定时刷新状态
        this.statusInterval = setInterval(() => this.refreshStatus(), 1000);
        
        // 检查连接状态
        this.checkConnection();
        
        this.log('调试面板已初始化');
    }

    checkConnection() {
        const tabsBar = this.getTabsBarComponent();
        if (tabsBar) {
            this.log('成功连接到标签栏组件');
            this.log(`标签栏组件可用方法: ${Object.keys(tabsBar).join(', ')}`);
        } else {
            this.log('无法连接到标签栏组件', 'error');
            this.log('请确保调试面板是从主窗口打开的，或者在同一页面中', 'error');
        }
    }

    destroy() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
        this.log('调试面板已销毁');
    }

    bindButtonEvents() {
        // 标签栏调试按钮
        this.bindEvent('add-1-tab', () => this.addTabs(1));
        this.bindEvent('add-5-tabs', () => this.addTabs(5));
        this.bindEvent('add-10-tabs', () => this.addTabs(10));
        // 指定位置插入标签按钮
        this.bindEvent('insert-tab-second', () => this.insertTabAtSecond());
        this.bindEvent('insert-tab-fifth', () => this.insertTabAtFifth());
        this.bindEvent('insert-tab-custom', () => this.insertTabAtCustomPosition());
        this.bindEvent('insert-at-position', () => this.insertTabAtInputPosition());
        // 关闭标签按钮
        this.bindEvent('close-all-tabs', () => this.closeAllTabs());
        this.bindEvent('close-half-tabs', () => this.closeHalfTabs());
        this.bindEvent('close-last-tab', () => this.closeLastTab());
        // 状态监控按钮
        this.bindEvent('refresh-status', () => this.refreshStatus());
        this.bindEvent('export-logs', () => this.exportLogs());
        this.bindEvent('clear-logs', () => this.clearLogs());

        // 其他模块按钮
        this.bindEvent('test-url-validation', () => this.log('功能未实现'));
        this.bindEvent('test-search-suggest', () => this.log('功能未实现'));
        this.bindEvent('clear-history', () => this.log('功能未实现'));
        this.bindEvent('add-test-bookmarks', () => this.log('功能未实现'));
        this.bindEvent('clear-bookmarks', () => this.log('功能未实现'));
        this.bindEvent('export-bookmarks', () => this.log('功能未实现'));
        this.bindEvent('simulate-download', () => this.log('功能未实现'));
        this.bindEvent('clear-downloads', () => this.log('功能未实现'));
        this.bindEvent('show-devtools', () => this.log('功能未实现'));
        this.bindEvent('reload-app', () => this.log('功能未实现'));
        this.bindEvent('clear-cache', () => this.log('功能未实现'));
        this.bindEvent('open-renderer-devtools', () => this.openRendererDevTools());
        this.bindEvent('open-main-devtools', () => this.openMainDevTools());
    }

    bindEvent(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        }
    }

    // 获取主窗口的标签栏组件
    getTabsBarComponent() {
        // 优先尝试从opener获取（独立调试窗口）
        if (window.opener && window.opener.tabsBarInstance) {
            return window.opener.tabsBarInstance;
        }
        // 如果没有opener，尝试从当前窗口获取（同一页面内的调试面板）
        if (window.tabsBarInstance) {
            return window.tabsBarInstance;
        }
        // 最后尝试从父窗口获取
        if (window.parent && window.parent.tabsBarInstance) {
            return window.parent.tabsBarInstance;
        }
        return null;
    }

    // 标签栏调试功能
    addTabs(count) {
        const tabsBar = this.getTabsBarComponent();
        if (tabsBar && tabsBar.addMultipleTabs) {
            tabsBar.addMultipleTabs(count);
            this.log(`已添加 ${count} 个标签`);
        } else if (tabsBar && tabsBar.addTab) {
            // 回退方案：逐个调用addTab
            for (let i = 0; i < count; i++) {
                setTimeout(() => tabsBar.addTab(), i * 50); // 稍微延迟避免冲突
            }
            this.log(`已添加 ${count} 个标签`);
        } else {
            this.log('无法访问标签栏组件或addTab方法', 'error');
        }
    }

    closeAllTabs() {
        const tabsBar = this.getTabsBarComponent();
        if (tabsBar && tabsBar.closeAllTabs) {
            tabsBar.closeAllTabs();
            this.log('已关闭所有标签');
            this.log('批量关闭：标签依次从右收缩 🎬');
        } else if (tabsBar && tabsBar.localTabs && tabsBar.closeTab) {
            // 回退方案：逐个关闭标签
            const tabIds = [...tabsBar.localTabs.value.map(tab => tab.id)];
            tabIds.forEach((id, index) => {
                setTimeout(() => tabsBar.closeTab(id), index * 100); // 延迟关闭避冲突
            });
            this.log(`已关闭 ${tabIds.length} 个标签`);
            this.log('批量关闭：标签依次从右收缩 🎬');
        } else {
            this.log('无法访问标签栏组件或相关方法', 'error');
        }
    }

    closeHalfTabs() {
        const tabsBar = this.getTabsBarComponent();
        if (tabsBar && tabsBar.closeHalfTabs) {
            tabsBar.closeHalfTabs();
            this.log('已关闭一半标签');
            this.log('批量关闭：标签依次从右收缩 🎬');
        } else {
            this.log('无法访问标签栏组件或closeHalfTabs方法', 'error');
        }
    }

    closeLastTab() {
        const tabsBar = this.getTabsBarComponent();
        if (tabsBar && tabsBar.tabsStore && tabsBar.tabsStore.tabs) {
            const tabs = tabsBar.tabsStore.tabs;
            if (tabs.length > 0) {
                const lastTab = tabs[tabs.length - 1];
                if (tabsBar.closeTab) {
                    tabsBar.closeTab(lastTab.id);
                    this.log(`已关闭最后一个标签: ${lastTab.title}`);
                    this.log(`标签从右收缩，其他标签同步左移 🎬`);
                } else {
                    this.log('无法访问closeTab方法', 'error');
                }
            } else {
                this.log('没有标签可关闭');
            }
        } else {
            this.log('无法访问标签栏组件或标签数据', 'error');
        }
    }

    // 在第2个位置插入标签
    insertTabAtSecond() {
        const tabsBar = this.getTabsBarComponent();
        if (tabsBar && tabsBar.insertTabAtSecond) {
            const newTab = tabsBar.insertTabAtSecond();
            this.log(`已在第2个位置插入新标签: ${newTab.title} (ID: ${newTab.id.substring(0, 8)}) ✨`);
            this.log(`Edge风格的从左到右展开动画已开始 🎬`);
        } else if (tabsBar && tabsBar.insertTabAt) {
            // 回退方案
            const newTab = tabsBar.insertTabAt(1, { active: true, loading: true, title: '新标签(位置2)' });
            this.log(`已在第2个位置插入新标签: ${newTab.title} (ID: ${newTab.id.substring(0, 8)}) ✨`);
            this.log(`Edge风格的从左到右展开动画已开始 🎬`);
        } else {
            this.log('无法访问标签栏组件或insertTabAt方法', 'error');
        }
    }

    // 在第5个位置插入标签
    insertTabAtFifth() {
        const tabsBar = this.getTabsBarComponent();
        if (tabsBar && tabsBar.insertTabAtFifth) {
            const newTab = tabsBar.insertTabAtFifth();
            this.log(`已在第5个位置插入新标签: ${newTab.title} (ID: ${newTab.id.substring(0, 8)}) ✨`);
            this.log(`Edge风格的从左到右展开动画已开始 🎬`);
        } else if (tabsBar && tabsBar.insertTabAt) {
            // 回退方案
            const newTab = tabsBar.insertTabAt(4, { active: true, loading: true, title: '新标签(位置5)' });
            this.log(`已在第5个位置插入新标签: ${newTab.title} (ID: ${newTab.id.substring(0, 8)}) ✨`);
            this.log(`Edge风格的从左到右展开动画已开始 🎬`);
        } else {
            this.log('无法访问标签栏组件或insertTabAt方法', 'error');
        }
    }

    // 在自定义位置插入标签
    insertTabAtCustomPosition() {
        const tabsBar = this.getTabsBarComponent();
        if (!tabsBar) {
            this.log('无法访问标签栏组件', 'error');
            return;
        }

        const position = prompt('请输入要插入的位置 (从1开始):', '3');
        if (position === null) {
            this.log('用户取消了操作');
            return;
        }

        const pos = parseInt(position);
        if (isNaN(pos) || pos < 1) {
            this.log('无效的位置，请输入大于0的数字', 'error');
            return;
        }

        if (tabsBar.insertTabAt) {
            try {
                const newTab = tabsBar.insertTabAt(pos - 1, { 
                    active: true, 
                    loading: true, 
                    title: `新标签(位置${pos})` 
                });
                this.log(`已在第${pos}个位置插入新标签: ${newTab.title}`);
            } catch (error) {
                this.log(`插入标签时出错: ${error.message}`, 'error');
            }
        } else {
            this.log('无法访问insertTabAt方法', 'error');
        }
    }

    // 从输入框获取位置并插入标签
    insertTabAtInputPosition() {
        const tabsBar = this.getTabsBarComponent();
        if (!tabsBar) {
            this.log('无法访问标签栏组件', 'error');
            return;
        }

        const positionInput = document.getElementById('insert-position');
        if (!positionInput) {
            this.log('无法找到位置输入框', 'error');
            return;
        }

        const pos = parseInt(positionInput.value);
        if (isNaN(pos) || pos < 1) {
            this.log('无效的位置，请输入大于0的数字', 'error');
            return;
        }

        if (tabsBar.insertTabAt) {
            try {
                const newTab = tabsBar.insertTabAt(pos - 1, { 
                    active: true, 
                    loading: true, 
                    title: `新标签(位置${pos})` 
                });
                this.log(`已在第${pos}个位置插入新标签: ${newTab.title} (ID: ${newTab.id.substring(0, 8)})`);
                this.log(`Edge风格的从左到右展开动画已开始，预计250ms后完成 🎬`);
                // 插入后，位置输入框值+1，方便连续测试
                positionInput.value = pos + 1;
            } catch (error) {
                this.log(`插入标签时出错: ${error.message}`, 'error');
            }
        } else {
            this.log('无法访问insertTabAt方法', 'error');
        }
    }

    // 状态监控
    refreshStatus() {
        const tabsBar = this.getTabsBarComponent();
        
        if (!tabsBar) {
            this.updateStatusValue('tab-count', '未连接');
            this.updateStatusValue('total-width', '未连接');
            this.updateStatusValue('hovering-status', '未连接');
        } else {
            try {
                // 获取标签数量
                if (tabsBar.tabsStore && tabsBar.tabsStore.tabs) {
                    this.updateStatusValue('tab-count', tabsBar.tabsStore.tabs.length);
                } else if (tabsBar.localTabs && tabsBar.localTabs.value) {
                    this.updateStatusValue('tab-count', tabsBar.localTabs.value.length);
                } else {
                    this.updateStatusValue('tab-count', '无法获取');
                }

                // 计算总宽度
                if (tabsBar.tabWidths && tabsBar.tabWidths.value) {
                    const totalWidth = Object.values(tabsBar.tabWidths.value).reduce((sum, width) => sum + width, 0);
                    this.updateStatusValue('total-width', `${Math.round(totalWidth)}px`);
                } else {
                    this.updateStatusValue('total-width', '无法获取');
                }

                // 获取悬停状态
                if (tabsBar.isHoveringTabArea && tabsBar.isHoveringTabArea.value !== undefined) {
                    this.updateStatusValue('hovering-status', tabsBar.isHoveringTabArea.value ? '是' : '否');
                } else {
                    this.updateStatusValue('hovering-status', '无法获取');
                }

                // 获取动画状态
                if (tabsBar.closingTabs && tabsBar.closingTabs.value) {
                    this.updateStatusValue('closing-tabs', tabsBar.closingTabs.value.size);
                } else {
                    this.updateStatusValue('closing-tabs', '无法获取');
                }

                if (tabsBar.enteringTabs && tabsBar.enteringTabs.value) {
                    this.updateStatusValue('entering-tabs', tabsBar.enteringTabs.value.size);
                } else {
                    this.updateStatusValue('entering-tabs', '无法获取');
                }
            } catch (error) {
                console.error('[DebugPanel] 获取状态时出错:', error);
                this.updateStatusValue('tab-count', '错误');
                this.updateStatusValue('total-width', '错误');
                this.updateStatusValue('hovering-status', '错误');
            }
        }
        
        // 获取窗口宽度
        let windowWidth = window.innerWidth;
        if (window.opener) {
            windowWidth = window.opener.innerWidth;
        } else if (window.parent && window.parent !== window) {
            windowWidth = window.parent.innerWidth;
        }
        this.updateStatusValue('window-width', `${windowWidth}px`);
        
        // 更新位置提示
        this.updatePositionHint(tabsBar);
        
        // 更新标签列表显示
        this.updateTabsList(tabsBar);
    }

    updateStatusValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updatePositionHint(tabsBar) {
        const hintElement = document.getElementById('position-hint');
        if (!hintElement) return;

        if (!tabsBar) {
            hintElement.textContent = '(未连接到标签栏)';
            hintElement.style.color = '#f00';
            return;
        }

        try {
            let tabCount = 0;
            if (tabsBar.tabsStore && tabsBar.tabsStore.tabs) {
                tabCount = tabsBar.tabsStore.tabs.length;
            } else if (tabsBar.localTabs && tabsBar.localTabs.value) {
                tabCount = tabsBar.localTabs.value.length;
            }

            if (tabCount > 0) {
                hintElement.textContent = `(当前标签数: ${tabCount}, 可插入位置: 1-${tabCount + 1})`;
                hintElement.style.color = '#666';
            } else {
                hintElement.textContent = '(无标签)';
                hintElement.style.color = '#999';
            }
        } catch (error) {
            hintElement.textContent = '(获取标签数量出错)';
            hintElement.style.color = '#f00';
                }
    }

    updateTabsList(tabsBar) {
        const listElement = document.getElementById('tabs-list');
        if (!listElement) return;

        if (!tabsBar) {
            listElement.innerHTML = '<div style="color: #f00;">未连接到标签栏组件</div>';
            return;
        }

        try {
            let tabs = [];
            if (tabsBar.tabsStore && tabsBar.tabsStore.tabs) {
                tabs = tabsBar.tabsStore.tabs;
            } else if (tabsBar.localTabs && tabsBar.localTabs.value) {
                tabs = tabsBar.localTabs.value;
            }

            if (tabs.length === 0) {
                listElement.innerHTML = '<div style="color: #999;">暂无标签</div>';
                return;
            }

            let html = '';
            tabs.forEach((tab, index) => {
                const isActive = tab.active || (tabsBar.tabsStore && tab.id === tabsBar.tabsStore.activeTabId);
                const statusIcon = isActive ? '🟢' : '⚪';
                const loadingIcon = tab.loading ? '⏳' : '';
                
                // 检查动画状态
                const isClosing = tabsBar.closingTabs && tabsBar.closingTabs.value && tabsBar.closingTabs.value.has(tab.id);
                const isEntering = tabsBar.enteringTabs && tabsBar.enteringTabs.value && tabsBar.enteringTabs.value.has(tab.id);
                
                let animationIcon = '';
                let bgColor = '';
                if (isClosing) {
                    animationIcon = '◀️'; // 表示从右到左收缩
                    bgColor = '#ffe6e6';
                } else if (isEntering) {
                    animationIcon = '▶️'; // 表示从左到右展开
                    bgColor = '#e6ffe6';
                } else if (isActive) {
                    bgColor = '#e6f3ff';
                }
                
                html += `<div style="margin-bottom: 3px; padding: 2px; ${bgColor ? `background: ${bgColor};` : ''} ${isActive ? 'font-weight: bold;' : ''}">
                    ${statusIcon} ${index + 1}. ${tab.title || '未命名'} ${loadingIcon} ${animationIcon}
                    <span style="color: #888; font-size: 10px;">[ID: ${tab.id.substring(0, 8)}...]</span>
                </div>`;
            });

            listElement.innerHTML = html;
        } catch (error) {
            listElement.innerHTML = `<div style="color: #f00;">获取标签列表出错: ${error.message}</div>`;
        }
    }
     
    // 日志功能
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleString('zh-CN');
        const logEntry = `[${timestamp}] [DebugPanel] ${message}`;
        
        if (type === 'error') {
            console.error(logEntry);
        } else {
            console.log(logEntry);
        }
        
        // 将日志保存到内存中供导出使用
        if (!this.logs) {
            this.logs = [];
        }
        this.logs.push({ timestamp, message, type });
        
        // 保持最多1000条日志
        if (this.logs.length > 1000) {
            this.logs.shift();
        }
        
        // 在页面上显示日志
        this.displayLogOnPage(timestamp, message, type);
    }

    displayLogOnPage(timestamp, message, type) {
        const logDisplay = document.getElementById('log-display');
        if (logDisplay) {
            // 如果是第一条日志，清空默认文本
            if (logDisplay.children.length === 1 && logDisplay.children[0].textContent === '等待日志...') {
                logDisplay.innerHTML = '';
            }
            
            const logDiv = document.createElement('div');
            logDiv.style.marginBottom = '2px';
            logDiv.style.color = type === 'error' ? 'red' : 'black';
            logDiv.textContent = `[${timestamp}] ${message}`;
            
            logDisplay.appendChild(logDiv);
            
            // 自动滚动到底部
            logDisplay.scrollTop = logDisplay.scrollHeight;
            
            // 保持最多100条显示的日志
            while (logDisplay.children.length > 100) {
                logDisplay.removeChild(logDisplay.firstChild);
            }
        }
    }

    clearLogs() {
        this.logs = [];
        const logDisplay = document.getElementById('log-display');
        if (logDisplay) {
            logDisplay.innerHTML = '<div>日志已清空</div>';
        }
        console.clear();
        this.log('日志已清空');
    }

    exportLogs() {
        const tabsBar = this.getTabsBarComponent();
        const statusInfo = {
            timestamp: new Date().toLocaleString('zh-CN'),
            tabsBarConnected: !!tabsBar,
            tabCount: tabsBar ? (tabsBar.tabsStore ? tabsBar.tabsStore.tabs.length : '未知') : '未连接',
            activeTabId: tabsBar ? (tabsBar.tabsStore ? tabsBar.tabsStore.activeTabId : '未知') : '未连接',
            windowWidth: window.opener ? window.opener.innerWidth : window.innerWidth
        };

        const exportData = {
            exportTime: new Date().toISOString(),
            statusInfo,
            logs: this.logs || [],
            tabsInfo: tabsBar && tabsBar.tabsStore ? {
                tabs: tabsBar.tabsStore.tabs.map(tab => ({
                    id: tab.id,
                    title: tab.title,
                    url: tab.url,
                    active: tab.active,
                    loading: tab.loading
                })),
                activeTabId: tabsBar.tabsStore.activeTabId
            } : '无法获取标签信息'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prism-browser-debug-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.log('已导出调试日志');
    }

    // [GPT-4, 2024-06-28 19:30:00 Asia/Hong_Kong] 打开前端开发者工具
    openRendererDevTools() {
        if (window.opener && window.opener.api && window.opener.api.toggleRendererDevTools) {
            window.opener.api.toggleRendererDevTools();
            this.log('已请求前端开发者工具');
        } else {
            this.log('主窗口未暴露api.toggleRendererDevTools', 'error');
        }
    }

    // [GPT-4, 2024-06-28 19:10:00 Asia/Hong_Kong] 打开主程序开发者工具
    openMainDevTools() {
        if (window.opener && window.opener.api && window.opener.api.toggleMainDevTools) {
            window.opener.api.toggleMainDevTools();
            this.log('已请求主程序开发者工具');
        } else {
            this.log('主窗口未暴露api.toggleMainDevTools，无法打开主程序开发者工具', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const debugPanel = new DebugPanel();
    
    // 页面关闭时清理资源
    window.addEventListener('beforeunload', () => {
        if (debugPanel && debugPanel.destroy) {
            debugPanel.destroy();
        }
    });
    
    // 暴露到全局供调试使用
    window.debugPanel = debugPanel;
}); 