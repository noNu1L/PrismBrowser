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
        this.bindEvent('reinitialize-app', async () => {
            if (confirm('确定要清除所有数据并重新初始化吗？')) {
                try {
                    if (window.opener && window.opener.initService) {
                        await window.opener.initService.reinitialize()
                        this.log('应用已重置并重新初始化')
                        this.log('Electron Store 和 Pinia Store 都已重置为默认值')
                        alert('应用已重置，请刷新主窗口查看效果')
                    } else {
                        this.log('无法访问初始化服务', 'error')
                    }
                } catch (e) {
                    this.log(`重置失败: ${e.message}`, 'error')
                }
            }
        });
        
        // 拖拽测试按钮
        this.bindEvent('test-drag-performance', () => this.testDragPerformance());
        this.bindEvent('show-drag-info', () => this.showDragInfo());

        // 其他模块按钮
        this.bindEvent('test-url-validation', () => this.log('功能未实现'));
        this.bindEvent('test-search-suggest', () => this.log('功能未实现'));
        this.bindEvent('clear-history', () => this.log('功能未实现'));
        
        // 地址栏按钮配置测试
        this.bindEvent('load-button-config', () => this.loadButtonConfig());
        this.bindEvent('test-all-buttons-show', () => this.showAllButtons());
        this.bindEvent('test-all-buttons-hide', () => this.hideAllButtons());
        this.bindEvent('test-random-config', () => this.randomButtonConfig());

        // 绑定复选框事件
        this.bindButtonToggleEvents();
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

                // 获取拖拽状态
                if (tabsBar.isDragging && tabsBar.draggedTabId) {
                    const isDragging = tabsBar.isDragging.value;
                    const draggedId = tabsBar.draggedTabId.value;
                    if (isDragging && draggedId) {
                        this.updateStatusValue('dragging-status', `拖拽中: ${draggedId.substring(0, 8)}`);
                    } else {
                        this.updateStatusValue('dragging-status', '未拖拽');
                    }
                } else {
                    this.updateStatusValue('dragging-status', '无法获取');
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
                
                // 检查动画和拖拽状态
                const isClosing = tabsBar.closingTabs && tabsBar.closingTabs.value && tabsBar.closingTabs.value.has(tab.id);
                const isEntering = tabsBar.enteringTabs && tabsBar.enteringTabs.value && tabsBar.enteringTabs.value.has(tab.id);
                const isDragging = tabsBar.isDragging && tabsBar.isDragging.value && tabsBar.draggedTabId && tabsBar.draggedTabId.value === tab.id;
                
                let animationIcon = '';
                let bgColor = '';
                if (isDragging) {
                    animationIcon = '🔄'; // 表示正在拖拽
                    bgColor = '#fff3cd';
                } else if (isClosing) {
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

    // 测试拖拽性能
    testDragPerformance() {
        const tabsBar = this.getTabsBarComponent();
        if (!tabsBar) {
            this.log('无法访问标签栏组件', 'error');
            return;
        }

        this.log('=== 拖拽功能性能测试 ===');
        this.log(`SortableJS实例状态: ${tabsBar.sortableInstance ? '已初始化' : '未初始化'}`);
        this.log(`当前标签数量: ${tabsBar.localTabs ? tabsBar.localTabs.value.length : '未知'}`);
        this.log(`拖拽状态: ${tabsBar.isDragging ? (tabsBar.isDragging.value ? '拖拽中' : '未拖拽') : '未知'}`);
        
        if (tabsBar.localTabs && tabsBar.localTabs.value.length > 1) {
            this.log('💡 现在可以尝试拖拽标签来测试功能');
            this.log('📝 拖拽操作会在控制台输出详细日志');
        } else {
            this.log('⚠️ 需要至少2个标签才能测试拖拽功能');
            this.log('建议先添加几个标签再测试拖拽');
        }
    }

    // 显示拖拽信息
    showDragInfo() {
        const tabsBar = this.getTabsBarComponent();
        if (!tabsBar) {
            this.log('无法访问标签栏组件', 'error');
            return;
        }

        this.log('=== 拖拽功能详细信息 ===');
        
        // SortableJS配置信息
        this.log('SortableJS配置:');
        this.log('- 动画时长: 200ms');
        this.log('- 缓动函数: cubic-bezier(0.25, 0.46, 0.45, 0.94)');
        this.log('- 拖拽句柄: .tab-content');
        this.log('- 过滤器: .tab-close-btn (关闭按钮不可拖拽)');
        this.log('- 延迟启动: 100ms');
        
        // 当前状态
        if (tabsBar.isDragging && tabsBar.draggedTabId) {
            const isDragging = tabsBar.isDragging.value;
            const draggedId = tabsBar.draggedTabId.value;
            this.log(`当前拖拽状态: ${isDragging ? '拖拽中' : '未拖拽'}`);
            if (draggedId) {
                this.log(`被拖拽的标签ID: ${draggedId}`);
            }
        }
        
        // 标签顺序
        if (tabsBar.localTabs && tabsBar.localTabs.value) {
            const tabOrder = tabsBar.localTabs.value.map((tab, index) => `${index + 1}. ${tab.title} (${tab.id.substring(0, 8)})`);
            this.log('当前标签顺序:');
            tabOrder.forEach(info => this.log(`  ${info}`));
        }
        
        this.log('🎯 Edge风格拖拽特性:');
        this.log('- 轻微阴影提升效果');
        this.log('- 无旋转或过度视觉效果');
        this.log('- 平滑的标签交换动画');
        this.log('- 基于中心点的交换逻辑');
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

    // 地址栏按钮配置测试功能
    getAddressBarStore() {
        // 尝试从主窗口获取 Pinia store
        if (window.opener && window.opener.addressBarStore) {
            return window.opener.addressBarStore;
        }
        if (window.addressBarStore) {
            return window.addressBarStore;
        }
        return null;
    }

    async loadButtonConfig() {
        try {
            const store = this.getAddressBarStore();
            if (!store) {
                this.log('无法访问 addressBarStore', 'error');
                return;
            }

            // 🎯 检查配置是否已初始化
            if (!store.config) {
                this.log('配置尚未初始化，尝试从 Electron Store 加载...', 'info');
                await store.loadFromElectronStore();
            }

            const config = store.config;
            if (!config) {
                this.log('配置仍然为空，可能是首次启动', 'warn');
                return;
            }

            this.log('当前地址栏按钮配置:', 'info');
            this.log(JSON.stringify(config, null, 2));

            // 更新复选框状态
            this.updateCheckboxes(config);
            
            // 更新配置状态显示
            this.updateConfigStatus(config);
            
        } catch (error) {
            this.log(`加载按钮配置失败: ${error.message}`, 'error');
        }
    }

    updateCheckboxes(config) {
        const checkboxes = {
            'toggle-home': config.showHome,
            'toggle-favorites': config.showFavorites,
            'toggle-bookmarks': config.showBookmarks,
            'toggle-history': config.showHistory,
            'toggle-downloads': config.showDownloads,
            'toggle-proxy': config.showProxy
        };

        Object.entries(checkboxes).forEach(([id, checked]) => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = !!checked;
            }
        });
    }

    updateConfigStatus(config) {
        const statusDiv = document.getElementById('button-config-status');
        if (!statusDiv) return;

        const buttons = [
            { key: 'showHome', name: '主页按钮', forced: false },
            { key: 'showFavorites', name: '收藏按钮', forced: false },
            { key: 'showBookmarks', name: '收藏夹按钮', forced: false },
            { key: 'showHistory', name: '历史记录按钮', forced: false },
            { key: 'showDownloads', name: '下载按钮', forced: false },
            { key: 'showProxy', name: '代理按钮', forced: false }
        ];

        let html = '<div><strong>当前配置状态:</strong></div>';
        html += '<div><span style="color: #666;">✓ = 显示, ✗ = 隐藏, 🔒 = 强制显示</span></div><br>';
        
        // 强制显示的按钮
        html += '<div><strong>强制显示按钮:</strong></div>';
        html += '<div>🔒 后退按钮 (不可隐藏)</div>';
        html += '<div>🔒 前进按钮 (不可隐藏)</div>';
        html += '<div>🔒 刷新按钮 (不可隐藏)</div>';
        html += '<div>🔒 更多菜单按钮 (不可隐藏)</div>';
        html += '<br>';
        
        // 可配置的按钮
        html += '<div><strong>可配置按钮:</strong></div>';
        buttons.forEach(button => {
            const status = config[button.key] ? '✓' : '✗';
            const color = config[button.key] ? '#28a745' : '#dc3545';
            html += `<div style="color: ${color};">${status} ${button.name}</div>`;
        });

        statusDiv.innerHTML = html;
    }

    bindButtonToggleEvents() {
        const toggles = [
            'toggle-home',
            'toggle-favorites', 
            'toggle-bookmarks',
            'toggle-history',
            'toggle-downloads',
            'toggle-proxy'
        ];

        toggles.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.toggleButton(id, e.target.checked);
                });
            }
        });
    }

    async toggleButton(toggleId, checked) {
        const store = this.getAddressBarStore();
        if (!store) {
            this.log('无法访问 addressBarStore', 'error');
            return;
        }

        // 🎯 简化：直接的配置键映射
        const configMap = {
            'toggle-home': 'showHome',
            'toggle-favorites': 'showFavorites',
            'toggle-bookmarks': 'showBookmarks', 
            'toggle-history': 'showHistory',
            'toggle-downloads': 'showDownloads',
            'toggle-proxy': 'showProxy'
        };

        const configKey = configMap[toggleId];
        if (!configKey) {
            this.log(`未知的按钮配置: ${toggleId}`, 'error');
            return;
        }

        try {
            // 🔔 简化：直接使用配置键名
            // 这个调用会：
            // 1. 更新 store.config[configKey] 的值
            // 2. 自动保存配置到 electron-store
            // 3. Vue 响应式系统检测到状态变化
            // 4. AddressBar.vue 自动重新渲染，显示/隐藏相应按钮
            await store.setButtonVisible(configKey, checked);
            this.log(`${checked ? '显示' : '隐藏'} ${configKey}: ${checked}`);
            this.log('地址栏应该会自动更新按钮显示状态 🔄');
            
            // 延迟更新状态显示（这里是为了更新调试面板的显示）
            setTimeout(() => this.loadButtonConfig(), 100);
        } catch (error) {
            this.log(`更新按钮配置失败: ${error.message}`, 'error');
        }
    }

    async showAllButtons() {
        const store = this.getAddressBarStore();
        if (!store) {
            this.log('无法访问 addressBarStore', 'error');
            return;
        }

        try {
            // 🎯 简化：直接使用配置键名
            await store.setBatchVisible({
                showHome: true,
                showFavorites: true,
                showBookmarks: true,
                showHistory: true,
                showDownloads: true,
                showProxy: true
            });
            
            this.log('已显示所有可配置按钮 ✨');
            this.log('地址栏应该会自动更新按钮显示状态 🔄');
            
            // 延迟更新状态显示
            setTimeout(() => this.loadButtonConfig(), 100);
        } catch (error) {
            this.log(`显示所有按钮失败: ${error.message}`, 'error');
        }
    }

    async hideAllButtons() {
        const store = this.getAddressBarStore();
        if (!store) {
            this.log('无法访问 addressBarStore', 'error');
            return;
        }

        try {
            // 🎯 简化：直接使用配置键名
            await store.setBatchVisible({
                showHome: false,
                showFavorites: false,
                showBookmarks: false,
                showHistory: false,
                showDownloads: false,
                showProxy: false
            });
            
            this.log('已隐藏所有可配置按钮 🙈');
            this.log('地址栏应该会自动更新按钮显示状态 🔄');
            this.log('注意: 后退、前进、刷新、更多菜单按钮仍然显示（强制显示）');
            
            // 延迟更新状态显示
            setTimeout(() => this.loadButtonConfig(), 100);
        } catch (error) {
            this.log(`隐藏所有按钮失败: ${error.message}`, 'error');
        }
    }

    async randomButtonConfig() {
        const store = this.getAddressBarStore();
        if (!store) {
            this.log('无法访问 addressBarStore', 'error');
            return;
        }

        try {
            this.log('正在生成随机按钮配置... 🎲');
            
            // 🎯 简化：直接使用配置键名生成随机配置
            const randomConfig = {
                showHome: Math.random() > 0.5,
                showFavorites: Math.random() > 0.5,
                showBookmarks: Math.random() > 0.5,
                showHistory: Math.random() > 0.5,
                showDownloads: Math.random() > 0.5,
                showProxy: Math.random() > 0.5
            };
            
            // 记录每个按钮的配置
            Object.entries(randomConfig).forEach(([button, show]) => {
                this.log(`${button}: ${show ? '显示' : '隐藏'}`);
            });
            
            // 批量应用配置
            await store.setBatchVisible(randomConfig);
            
            this.log('随机配置已应用! 🎉');
            this.log('地址栏应该会自动更新按钮显示状态 🔄');
            
            // 延迟更新状态显示
            setTimeout(() => this.loadButtonConfig(), 100);
        } catch (error) {
            this.log(`应用随机配置失败: ${error.message}`, 'error');
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