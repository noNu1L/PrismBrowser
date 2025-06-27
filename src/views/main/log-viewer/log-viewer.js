/**
 * 日志查看器组件
 * 负责显示和管理Mihomo代理日志
 */

class LogViewerManager {
    constructor() {
        // DOM 元素引用
        this.logViewer = document.getElementById('log-viewer');
        this.logContent = document.getElementById('log-content');
        this.closeLogBtn = document.getElementById('close-log-btn');
        
        // 状态管理
        this.isVisible = false;
        this.maxLogEntries = 500; // 最大日志条数，防止内存溢出
        
        this.init();
    }

    init() {
        // 绑定事件监听器
        this.bindEvents();
        
        // 监听Mihomo日志
        this.setupLogListener();
    }

    bindEvents() {
        // 关闭按钮事件
        this.closeLogBtn.addEventListener('click', () => {
            this.hide();
        });

        // 键盘快捷键支持
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+L 切换日志面板显示
            if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    setupLogListener() {
        // 监听Mihomo日志消息
        window.api.onMihomoLog((log) => {
            this.addLogMessage(log);
        });
    }

    // --- 显示/隐藏日志面板 ---
    show() {
        this.logViewer.style.display = 'flex';
        this.isVisible = true;
    }

    hide() {
        this.logViewer.style.display = 'none';
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // --- 添加日志消息 ---
    addLogMessage(log) {
        const lines = log.trim().split(/\r?\n/);
        lines.forEach(line => {
            if (line.trim() === '') return;
            
            this.createLogEntry(line);
        });

        // 自动滚动到底部
        this.scrollToBottom();
        
        // 限制日志条数，避免内存溢出
        this.limitLogEntries();
    }

    createLogEntry(line) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = line;
        
        // 根据日志级别设置颜色
        if (line.includes('error') || line.includes('failed')) {
            logEntry.style.color = 'var(--log-error-text)';
        } else if (line.includes('warning') || line.includes('warn')) {
            logEntry.style.color = 'var(--log-warning-text, #ff9800)';
        } else if (line.includes('info')) {
            logEntry.style.color = 'var(--log-info-text, #2196f3)';
        }
        
        this.logContent.appendChild(logEntry);
    }

    scrollToBottom() {
        this.logContent.scrollTop = this.logContent.scrollHeight;
    }

    limitLogEntries() {
        const entries = this.logContent.children;
        if (entries.length > this.maxLogEntries) {
            // 移除最旧的日志条目
            const excessCount = entries.length - this.maxLogEntries;
            for (let i = 0; i < excessCount; i++) {
                this.logContent.removeChild(entries[0]);
            }
        }
    }

    // --- 清除所有日志 ---
    clearLogs() {
        this.logContent.innerHTML = '';
    }

    // --- 获取当前可见状态 ---
    isLogViewerVisible() {
        return this.isVisible;
    }

    // --- 设置最大日志条数 ---
    setMaxLogEntries(maxEntries) {
        this.maxLogEntries = maxEntries;
        this.limitLogEntries();
    }
}

// 导出 LogViewerManager 类供主应用使用
window.LogViewerManager = LogViewerManager;