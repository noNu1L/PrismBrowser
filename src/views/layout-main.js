// 等待Vue和Element Plus加载完成
window.addEventListener('DOMContentLoaded', () => {
    const { createApp } = Vue
    
    // 直接定义组件，避免import问题
    const LayoutApp = {
        template: `
            <el-container style="height: 100vh;">
                <el-header height="auto" style="padding: 0;">
                    <tabs-bar />
                </el-header>
                <el-header height="auto" style="padding: 0;">
                    <address-bar />
                </el-header>
                <el-main style="padding: 24px;">
                    <el-empty description="主界面布局（仅展示）" />
                </el-main>
            </el-container>
        `,
        components: {
            'tabs-bar': {
                template: `
                    <div class="drag-region" style="display: flex; align-items: center; padding: 4px 8px; background-color: #f5f5f5;">
                        <el-tabs class="no-drag" v-model="activeTab" type="card" closable>
                            <el-tab-pane label="新标签页" name="tab1" />
                            <el-tab-pane label="标签页 2" name="tab2" />
                        </el-tabs>
                        <el-button class="no-drag" size="small" style="margin-left: 8px;">+</el-button>
                    </div>
                `,
                data() {
                    return { activeTab: 'tab1' }
                }
            },
            'address-bar': {
                template: `
                    <div class="drag-region" style="display: flex; align-items: center; padding: 8px; background-color: #fafafa; border-bottom: 1px solid #e0e0e0;">
                        <el-button-group class="no-drag">
                            <el-button size="small" disabled>←</el-button>
                            <el-button size="small" disabled>→</el-button>
                            <el-button size="small">⟲</el-button>
                        </el-button-group>
                        <el-input class="no-drag" v-model="url" placeholder="搜索或输入网址" style="margin: 0 8px; flex: 1;" size="small" />
                        <el-button class="no-drag" size="small">★</el-button>
                        <el-button class="no-drag" size="small">☰</el-button>
                    </div>
                `,
                data() {
                    return { url: '' }
                }
            }
        },
        mounted() {
            console.log('主界面布局已加载')
        }
    }
    
    // 创建Vue应用
    const app = createApp(LayoutApp)
    
    // 使用Element Plus
    if (window.ElementPlus) {
        app.use(ElementPlus)
    }
    
    // 挂载应用
    app.mount('#app')
    
    console.log('主界面布局应用已启动')
}) 