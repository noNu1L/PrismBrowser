/**
 * PrismBrowser 开发调试面板
 */

class DebugPanel {
    constructor() {
        this.init();
    }

    init() {
        this.bindButtonEvents();
        this.refreshStatus();
        
        // 定时刷新状态
        setInterval(() => this.refreshStatus(), 1000);
    }

    bindButtonEvents() {
        // 标签栏调试按钮
        this.bindEvent('add-1-tab', () => this.addTabs(1));
        this.bindEvent('add-5-tabs', () => this.addTabs(5));
        // this.bindEvent('add-10-tabs', () => this.addTabs(10));
        this.bindEvent('close-all-tabs', () => this.closeAllTabs());
        // this.bindEvent('close-half-tabs', () => this.closeHalfTabs());
        this.bindEvent('close-last-tab', () => this.closeLastTab());
        // 状态监控按钮
        this.bindEvent('refresh-status', () => this.refreshStatus());
        this.bindEvent('export-logs', () => this.exportLogs());

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
    }

    bindEvent(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        }
    }

    // 获取主窗口的标签栏组件
    getTabsBarComponent() {
        if (window.opener && window.opener.tabsBarInstance) {
            return window.opener.tabsBarInstance;
        }
        return null;
    }

    // 标签栏调试功能
    addTabs(count) {
        const tabsBar = this.getTabsBarComponent();
        if (tabsBar) {
            for (let i = 0; i < count; i++) {
                tabsBar.addTab();
            }
        }
    }

    closeAllTabs() {
        const tabsBar = this.getTabsBarComponent();
        if (tabsBar) {
            const tabIds = [...tabsBar.tabs.value.map(tab => tab.id)];
            tabIds.forEach(id => tabsBar.closeTab(id));
        }
    }


    closeLastTab() {
        const tabsBar = this.getTabsBarComponent();
        if (tabsBar) {
            const tabs = tabsBar.tabs.value;
            if (tabs.length > 0) {
                tabsBar.closeTab(tabs[tabs.length - 1].id);
            }
        }
    }

    // 状态监控
    refreshStatus() {
        const tabsBar = this.getTabsBarComponent();
        
        if (!tabsBar) {
            this.updateStatusValue('tab-count', '未连接');
            this.updateStatusValue('total-width', '未连接');
            this.updateStatusValue('closing-tabs', '未连接');
            this.updateStatusValue('hovering-status', '未连接');
        } else {
            this.updateStatusValue('tab-count', tabsBar.tabs.value.length);
            const totalWidth = tabsBar.tabs.value.reduce((sum, tab) => sum + tab.width, 0);
            this.updateStatusValue('total-width', `${Math.round(totalWidth)}px`);
            this.updateStatusValue('hovering-status', tabsBar.isHoveringTabArea.value ? '是' : '否');
        }
        
        this.updateStatusValue('window-width', `${window.opener ? window.opener.innerWidth : window.innerWidth}px`);
    }

    updateStatusValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    // 日志功能
    log(message) {
        console.log(`[DebugPanel] ${message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DebugPanel();
}); 