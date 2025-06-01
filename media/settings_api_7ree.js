(function() {
    // 私有变量
    let vscode = undefined;
    let editor_7ree = undefined; 
    let settingsDialog_7ree = null;
    
    // 确保全局设置对象存在
    if (typeof window.currentSettings_7ree === 'undefined') {
        window.currentSettings_7ree = {
            // 界面设置（项目级别）
            fontFamily: '',
            fontSize: '',
            color: '',
            backgroundColor: '',
            selectionBackground: '',
            autoSaveInterval: 30,
            // 全局设置（系统级别）
            joplinServerUrl_7ree: '',
            joplinToken_7ree: '',
            joplinNoteId_7ree: '',
            enableJoplin_7ree: 'false'   // ← 新增：默认不开启 Joplin
        };
        // console.log('settings_api_7ree: 已初始化全局window.currentSettings_7ree对象');
    }
    
    // 本地设置缓存
    let currentSettings_7ree = { ...window.currentSettings_7ree };

    // 设置API对象
    const settingsApi_7ree = {
        // 初始化函数
        init: function(editorInstance, vscodeInstance) {
            editor_7ree = editorInstance;
            vscode = vscodeInstance;
            // console.log('设置API已初始化');
            
            // 在初始化后立即应用缓存的设置，避免闪烁
            if (currentSettings_7ree) {
                // 先创建或更新样式元素，防止背景色闪烁
                this._updateEditorCustomCSS(currentSettings_7ree);
                
                // 请求最新设置（异步）
                if (vscode) {
                    try {
                        // 请求项目级UI设置
                        vscode.postMessage({
                            command: 'getUISettings_7ree',
                            forceRefresh: true
                        });
                        
                        // 请求全局设置
                        vscode.postMessage({
                            command: 'getGlobalSettings_7ree',
                            forceRefresh: true
                        });
                        
                        // console.log('初始化时请求了最新设置');
                    } catch (err) {
                        // console.warn('初始化请求设置时出错:', err);
                    }
                }
            }
            
            return this;
        },

        // 打开设置对话框
        openSettings: function(initialSettings = null) {
            // console.log('openSettings被调用，提供的初始设置:', initialSettings ? JSON.stringify(initialSettings) : 'null');
            
            // 合并初始设置（如果有的话）
            if (initialSettings) {
                currentSettings_7ree = { ...currentSettings_7ree, ...initialSettings };
                // console.log('使用提供的初始设置更新当前设置:', JSON.stringify(currentSettings_7ree));
            }
            
            // 首先请求最新设置
            if (vscode) {
                try {
                    // console.log('向VSCode扩展发送getUISettings_7ree和getSystemSettings_7ree请求');
                    
                    // 请求项目级设置
                    vscode.postMessage({
                        command: 'getUISettings_7ree',
                        forceRefresh: true  // 强制从文件重新读取
                    });
                    
                    // 请求系统级设置
                    vscode.postMessage({
                        command: 'getSystemSettings_7ree',
                        forceRefresh: true  // 强制从文件重新读取
                    });
                    
                    // 请求全局设置
                    vscode.postMessage({
                        command: 'getGlobalSettings_7ree',
                        forceRefresh: true
                    });
                    
                    // 记录设置请求时间
                    window._settingsRequestTime_7ree = Date.now();
                    
                    // 延迟显示对话框，给扩展足够时间响应
                    setTimeout(() => {
                        // 显示对话框
                        this._showSettingsDialog();
                        
                        // 检查是否收到了响应
                        if (window._settingsRequestTime_7ree && Date.now() - window._settingsRequestTime_7ree > 1000) {
                            // console.warn('未及时收到VSCode扩展响应，使用当前内存中的设置');
                            window._settingsRequestTime_7ree = 0; // 重置请求时间
                            // 再次尝试填充表单，以确保使用最新值
                            this._populateSettingsForm();
                        }
                    }, 500); // 增加延迟时间，给VSCode更多响应时间
                    
                    return this;
                } catch (err) {
                    // console.error('请求最新设置时出错:', err);
                    // 发生错误时，继续使用当前设置
                }
            }
            
            // 如果无法请求新设置，则直接显示对话框
            this._showSettingsDialog();
            return this;
        },
        
        // 关闭设置对话框
        closeSettings: function() {
            if (settingsDialog_7ree) {
                settingsDialog_7ree.style.display = 'none';
            }
            return this;
        },
        
        // 应用设置到编辑器
        applySettings: function(settings = null) {
            const settingsToApply = settings || currentSettings_7ree;
            
            if (!editor_7ree) {
                // console.error('无法应用设置：编辑器未初始化（将在编辑器初始化后重试）');
                // 存储设置，以便编辑器初始化后再应用
                this.updateSettings(settingsToApply);
                return this;
            }
            
            try {
                // 应用编辑器样式
                this._applyEditorCustomStyles(settingsToApply);
                
                // 设置自动保存间隔
                if (settingsToApply.autoSaveInterval) {
                    this._setupAutoSave(settingsToApply.autoSaveInterval);
                }
                
                // console.log('设置已应用到编辑器');
            } catch (err) {
                // console.error('应用设置时出错:', err);
            }
            
            return this;
        },
        
        // 保存设置到VSCode扩展
        saveSettings: function(settings = null) {
            const settingsToSave = settings || currentSettings_7ree;
            
            if (!vscode) {
                // console.error('无法保存设置：VSCode API未初始化');
                return this;
            }
            
            try {
                // 项目级设置（与编辑器相关）
                const projectSettings = {
                    fontFamily: settingsToSave.fontFamily,
                    fontSize: settingsToSave.fontSize,
                    color: settingsToSave.color,
                    backgroundColor: settingsToSave.backgroundColor,
                    selectionBackground: settingsToSave.selectionBackground,
                    autoSaveInterval: settingsToSave.autoSaveInterval
                };
                
                // 全局设置（所有项目共享）
                const globalSettings = {
                    // 界面设置
                    fontFamily: settingsToSave.fontFamily,
                    fontSize: settingsToSave.fontSize,
                    color: settingsToSave.color,
                    backgroundColor: settingsToSave.backgroundColor,
                    selectionBackground: settingsToSave.selectionBackground,
                    autoSaveInterval: settingsToSave.autoSaveInterval,
                    // Joplin相关设置
                    enableJoplin_7ree: settingsToSave.enableJoplin_7ree,
                    joplinServerUrl_7ree: settingsToSave.joplinServerUrl_7ree,
                    joplinToken_7ree: settingsToSave.joplinToken_7ree,
                    joplinNoteId_7ree: settingsToSave.joplinNoteId_7ree
                };
                
                // 发送保存项目设置命令到扩展
                vscode.postMessage({
                    command: 'saveUISettings_7ree',
                    settings: projectSettings
                });
                
                // 发送保存全局设置命令到扩展
                vscode.postMessage({
                    command: 'saveGlobalSettings_7ree',
                    settings: globalSettings,
                    filename: 'mynotes-vars-7ree.json'  // 指定全局配置文件名
                });
                
                // console.log('设置已保存到扩展 - 项目设置:', JSON.stringify(projectSettings), '全局设置:', JSON.stringify(globalSettings));
            } catch (err) {
                // console.error('保存设置时出错:', err);
            }
            
            return this;
        },
        
        // 更新当前设置值
        updateSettings: function(newSettings) {
            currentSettings_7ree = { ...currentSettings_7ree, ...newSettings };
            return this;
        },
        
        // 获取当前设置值
        getSettings: function() {
            return { ...currentSettings_7ree };
        },
        
        // 私有方法：创建设置对话框DOM
        _createSettingsDialog: function() {
            // 创建对话框元素
            settingsDialog_7ree = document.createElement('div');
            settingsDialog_7ree.className = 'settings-dialog_7ree';
            settingsDialog_7ree.style.display = 'none';
            
            // 获取当前主题
            const isDarkTheme = document.body.classList.contains('vscode-dark') || 
                               !document.body.classList.contains('vscode-light');
            const themeFolder_7ree = isDarkTheme ? 'dark' : 'light';
            
            // 加载外部CSS文件
            this._loadSettingsCSS();
            
            // 预设的自动保存间隔选项
            const saveIntervalOptions = [
                { value: '15', text: '15秒' },
                { value: '30', text: '30秒' },
                { value: '45', text: '45秒' },
                { value: '60', text: '1分钟' },
                { value: '90', text: '1.5分钟' },
                { value: '120', text: '2分钟' }
            ];
            
            // 生成选项HTML
            const optionsHtml = saveIntervalOptions.map(option => 
                `<option value="${option.value}">${option.text}</option>`
            ).join('');
            
            // 设置对话框HTML内容
            settingsDialog_7ree.innerHTML = `
                <div class="settings-content_7ree">
                    <h2>参数设置</h2>

                    <div class="settings-tabs_7ree">
                        <button class="settings-tab-btn_7ree active_7ree" data-tab="interface_settings_7ree">界面</button>
                        <button class="settings-tab-btn_7ree" data-tab="advanced_settings_7ree">高级</button>
                    </div>

                    <div id="interface_settings_7ree" class="settings-tab-content_7ree active_7ree">
                        <div class="settings-form_7ree">
                            <div class="settings-field_7ree">
                                <label for="fontFamily_7ree">字体</label>
                                <input type="text" id="fontFamily_7ree" placeholder="例如: 'Consolas', 'Courier New', monospace">
                            </div>
                            <div class="settings-field_7ree">
                                <label for="fontSize_7ree">字体大小</label>
                                <input type="text" id="fontSize_7ree" placeholder="例如: 14px">
                            </div>
                            <div class="settings-field_7ree color-field_7ree">
                                <label>文本颜色</label>
                                <div class="color-picker-container_7ree">
                                    <div class="color-preview_7ree" id="textColor_preview_7ree"></div>
                                    <input type="color" id="textColor_7ree" class="hidden-color-input_7ree">
                                    <button type="button" class="color-clear-btn_7ree" id="textColor_clear_7ree" title="清空颜色">
                                        <img src="${this._getIconPath(`${themeFolder_7ree}/color-clear_7ree.svg`)}" alt="清空" class="clear-icon_7ree">
                                    </button>
                                </div>
                            </div>
                            <div class="settings-field_7ree color-field_7ree">
                                <label>背景颜色</label>
                                <div class="color-picker-container_7ree">
                                    <div class="color-preview_7ree" id="bgColor_preview_7ree"></div>
                                    <input type="color" id="bgColor_7ree" class="hidden-color-input_7ree">
                                    <button type="button" class="color-clear-btn_7ree" id="bgColor_clear_7ree" title="清空颜色">
                                        <img src="${this._getIconPath(`${themeFolder_7ree}/color-clear_7ree.svg`)}" alt="清空" class="clear-icon_7ree">
                                    </button>
                                </div>
                            </div>
                            <div class="settings-field_7ree color-field_7ree">
                                <label>选择背景</label>
                                <div class="color-picker-container_7ree">
                                    <div class="color-preview_7ree" id="selectionBg_preview_7ree"></div>
                                    <input type="color" id="selectionBg_7ree" class="hidden-color-input_7ree">
                                    <button type="button" class="color-clear-btn_7ree" id="selectionBg_clear_7ree" title="清空颜色">
                                        <img src="${this._getIconPath(`${themeFolder_7ree}/color-clear_7ree.svg`)}" alt="清空" class="clear-icon_7ree">
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="advanced_settings_7ree" class="settings-tab-content_7ree">
                        <div class="settings-form_7ree">
                            <div class="settings-field_7ree">
                                <label for="autoSaveInterval_7ree">自动保存间隔(秒)</label>
                                <select id="autoSaveInterval_7ree" class="settings-select_7ree">
                                    ${optionsHtml}
                                </select>
                            </div>
                            <div class="settings-form_7ree">
                                <label class="switch-label_7ree" for="enableJoplin_7ree">
                                    是否启用Joplin云笔记
                                </label>
                                <label class="switch_7ree">
                                    <input type="checkbox" id="enableJoplin_7ree" class="settings-toggle_7ree">
                                    <span class="slider_7ree"></span>
                                </label>
                            </div>
                            <div class="settings-field_7ree">
                                <label for="joplinServerUrl_7ree">Joplin服务器URL
                                    <span class="help-icon_7ree" data-tooltip="请保证本机joplin已启动：工具菜单>选项>网页剪藏器>启用网页剪藏器">
                                        <img src="${this._getIconPath(`${themeFolder_7ree}/question-circle_7ree.svg`)}" alt="帮助" class="question-icon_7ree">
                                    </span>
                                </label>
                                <input type="text" id="joplinServerUrl_7ree" placeholder="例如: http://localhost:41184">
                            </div>
                            <div class="settings-field_7ree">
                                <label for="joplinToken_7ree">Joplin令牌
                                    <span class="help-icon_7ree" data-tooltip="令牌获取办法：工具菜单>选项>网页剪藏器>复制令牌">
                                        <img src="${this._getIconPath(`${themeFolder_7ree}/question-circle_7ree.svg`)}" alt="帮助" class="question-icon_7ree">
                                    </span>
                                </label>
                                <input type="text" id="joplinToken_7ree" placeholder="输入您的Joplin API令牌">
                            </div>
                            <div class="settings-field_7ree">
                                <label for="joplinNoteId_7ree">Joplin笔记ID
                                    <span class="help-icon_7ree" data-tooltip="笔记ID获取办法：打开需绑定的笔记 >右上角叹号图标 >复制ID">
                                        <img src="${this._getIconPath(`${themeFolder_7ree}/question-circle_7ree.svg`)}" alt="帮助" class="question-icon_7ree">
                                    </span>
                                </label>
                                <input type="text" id="joplinNoteId_7ree" placeholder="输入要同步的Joplin笔记ID">
                            </div>
                            <div class="settings-field_7ree joplin-settings_7ree">
                                <div class="joplin-test-container_7ree">
                                    <button id="test_joplin_connection_7ree" class="joplin-test-btn_7ree">测试连接</button>
                                    <div id="joplin_test_result_7ree" class="joplin-test-result_7ree">修改配置后，请先保存再测试。</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="settings-buttons_7ree">
                        <button id="cancel_settings_btn_7ree" class="settings-cancel-btn_7ree">关闭</button>
                        <button id="save_settings_btn_7ree" class="settings-save-btn_7ree">保存</button>
                    </div>
                    <div class="settings-shortcuts_7ree">
                        <span class="key-text_7ree">
                            <img src="${this._getIconPath(`${themeFolder_7ree}/esc-key.svg`)}" class="key-icon_7ree" alt="ESC"> 关闭 &nbsp;&nbsp;&nbsp;&nbsp; 
                            <img src="${this._getIconPath(`${themeFolder_7ree}/enter-key.svg`)}" class="key-icon_7ree" alt="回车"> 保存
                        </span>
                    </div>
                </div>
            `;
            
            // 添加到文档
            document.body.appendChild(settingsDialog_7ree);

            // Tab切换逻辑
            const tabButtons_7ree = settingsDialog_7ree.querySelectorAll('.settings-tab-btn_7ree');
            const tabContents_7ree = settingsDialog_7ree.querySelectorAll('.settings-tab-content_7ree');

            tabButtons_7ree.forEach(button => {
                button.addEventListener('click', () => {
                    // 移除所有按钮的 active_7ree 类
                    tabButtons_7ree.forEach(btn => btn.classList.remove('active_7ree'));
                    // 为当前点击的按钮添加 active_7ree 类
                    button.classList.add('active_7ree');

                    // 隐藏所有内容区域
                    tabContents_7ree.forEach(content => content.classList.remove('active_7ree'));
                    // 显示与当前按钮关联的内容区域
                    const tabId = button.getAttribute('data-tab');
                    const activeContent = settingsDialog_7ree.querySelector(`#${tabId}`);
                    if (activeContent) {
                        activeContent.classList.add('active_7ree');
                    }
                });
            });
            
            // 关联颜色预览与颜色输入框
            this._setupColorPickers();
            
            // 事件处理器
            const saveBtn = settingsDialog_7ree.querySelector('#save_settings_btn_7ree');
            const cancelBtn = settingsDialog_7ree.querySelector('#cancel_settings_btn_7ree');
            
            // 保存按钮事件
            saveBtn.addEventListener('click', this._handleSaveSettings.bind(this));
            
            // 取消按钮事件
            cancelBtn.addEventListener('click', this.closeSettings.bind(this));
            
            // 在对话框内处理按键事件 - 使用捕获阶段
            const handleKeyDown = (e) => {
                // console.log('对话框键盘事件:', e.key, e.target.tagName);
                
                if (e.key === 'Escape') {
                    // console.log('按下ESC键，关闭对话框');
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeSettings();
                } else if (e.key === 'Enter') {
                    // console.log('按下ENTER键，保存设置');
                    e.preventDefault();
                    e.stopPropagation();
                    this._handleSaveSettings();
                }
            };
            
            // 添加键盘事件处理 - 使用捕获阶段 (true)，确保在事件冒泡前处理
            settingsDialog_7ree.addEventListener('keydown', handleKeyDown, true);
            
            // 新增: 绑定开关事件，实现点击切换时显示或隐藏 Joplin 参数字段
            const enableInput = settingsDialog_7ree.querySelector('#enableJoplin_7ree');
            if (enableInput) {
                const self = this;
                enableInput.addEventListener('change', () => {
                    self._toggleJoplinFields_7ree(enableInput.checked);
                });
                self._toggleJoplinFields_7ree(enableInput.checked); // 新增：初始化时根据当前状态切换显隐
            }

            return settingsDialog_7ree;
        },
        
        // 新增: 加载设置CSS文件
        _loadSettingsCSS: function() {
            // 检查是否已加载
            if (document.getElementById('settings-styles-7ree')) {
                return;
            }
            
            try {
                // 创建link元素
                const link = document.createElement('link');
                
                // Joplin测试连接的样式已移动到style_settings_7ree.css文件中
                link.id = 'settings-styles-7ree';
                link.rel = 'stylesheet';
                link.type = 'text/css';
                
                // 正确构建媒体资源路径
                // 由于RESOURCES_BASE_URI_7ree指向resources目录，而CSS在media目录
                // 需要从resources回退到根目录，再进入media目录
                const cssPath = this._getMediaPath('style_settings_7ree.css');
                link.href = cssPath;
                
                // 处理加载错误
                link.onerror = () => {
                    // console.warn('样式表加载失败，请检查路径:', cssPath);
                };
                
                // 添加到head
                document.head.appendChild(link);
                
                // console.log('正在加载设置CSS文件:', link.href);
            } catch (error) {
                // console.error('加载设置CSS文件时出错:', error);
            }
        },
        
        // 辅助方法：获取media目录下资源的正确路径
        _getMediaPath: function(fileName) {
            // 获取当前文档的基础URI
            let baseUri = '';
            
            // 在VS Code Web视图中检查document.baseURI
            if (document.baseURI && document.baseURI.startsWith('vscode-webview:')) {
                // console.log('检测到VS Code WebView环境，正在构建资源路径');
                
                // 尝试从document.baseURI或其他机制获取路径
                try {
                    // 尝试获取vscode实例以获取正确的资源路径
                    const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
                    if (vscode && vscode.getState) {
                        baseUri = vscode.getState()?.resourceBaseUri || '';
                    }
                } catch (e) {
                    // console.log('获取VSCode API失败:', e);
                }
            }
            
            // 尝试使用资源基础URI（由扩展注入）
            if (!baseUri && window.RESOURCES_BASE_URI_7ree) {
                // 由于RESOURCES_BASE_URI_7ree指向resources目录
                // 需要提取出扩展根目录
                let resourcesUri = window.RESOURCES_BASE_URI_7ree;
                
                // 尝试回退到扩展根目录
                if (resourcesUri.endsWith('/resources')) {
                    baseUri = resourcesUri.substring(0, resourcesUri.length - 10); // 移除'/resources'
                } else if (resourcesUri.endsWith('/resources/')) {
                    baseUri = resourcesUri.substring(0, resourcesUri.length - 11); // 移除'/resources/'
                } else {
                    // 无法确定确切路径，使用回退策略
                    baseUri = resourcesUri;
                }
                
                // console.log('从RESOURCES_BASE_URI_7ree构建媒体路径，基础URI:', baseUri);
            }
            
            // 构建最终路径
            let mediaPath = '';
            if (baseUri) {
                // 确保路径以斜杠结尾
                if (!baseUri.endsWith('/')) {
                    baseUri += '/';
                }
                mediaPath = `${baseUri}media/${fileName}`;
            } else {
                // 回退到相对路径
                mediaPath = `./style_settings_7ree.css`;
            }
            
            // console.log('构建的媒体资源路径:', mediaPath);
            return mediaPath;
        },
        
        // 辅助方法：获取图标资源的正确路径
        _getIconPath: function(iconName) {
            // 获取当前文档的基础URI
            let baseUri = '';
            
            // 在VS Code Web视图中检查document.baseURI
            if (document.baseURI && document.baseURI.startsWith('vscode-webview:')) {
                try {
                    // 尝试获取vscode实例以获取正确的资源路径
                    const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
                    if (vscode && vscode.getState) {
                        baseUri = vscode.getState()?.resourceBaseUri || '';
                    }
                } catch (e) { /* 忽略错误 */ }
            }
            
            // 使用资源基础URI（由扩展注入）- 这个是指向resources目录的
            if (!baseUri && window.RESOURCES_BASE_URI_7ree) {
                // RESOURCES_BASE_URI_7ree已经指向了正确的resources目录，不需要修改
                baseUri = window.RESOURCES_BASE_URI_7ree;
            }
            
            // 构建最终路径
            let iconPath = '';
            if (baseUri) {
                // 确保路径以斜杠结尾
                if (!baseUri.endsWith('/')) {
                    baseUri += '/';
                }
                iconPath = `${baseUri}icons/${iconName}`;
            } else {
                // 回退到相对路径
                iconPath = `./icons/${iconName}`;
            }
            
            return iconPath;
        },
        
        // 新增: 设置颜色选择器与预览色块的关联
        _setupColorPickers: function() {
            if (!settingsDialog_7ree) return;
            
            // 文本颜色
            const textColorInput = settingsDialog_7ree.querySelector('#textColor_7ree');
            const textColorPreview = settingsDialog_7ree.querySelector('#textColor_preview_7ree');
            const textColorClear = settingsDialog_7ree.querySelector('#textColor_clear_7ree');
            
            if (textColorInput && textColorPreview) {
                // 更新预览色块
                const updateTextColorPreview = () => {
                    const isCleared = textColorInput.dataset.cleared === 'true';
                    if (isCleared || !textColorInput.value || textColorInput.value === '#000000') {
                        // 显示默认状态
                        textColorPreview.style.backgroundColor = 'transparent';
                        textColorPreview.style.border = '1px dashed #ccc';
                        textColorPreview.title = '使用VSCode默认文本颜色';
                    } else {
                        textColorPreview.style.backgroundColor = textColorInput.value;
                        textColorPreview.style.border = '1px solid #ccc';
                        textColorPreview.title = textColorInput.value;
                    }
                };
                
                // 点击预览色块时打开颜色选择器
                textColorPreview.addEventListener('click', () => {
                    textColorInput.dataset.cleared = 'false'; // 清除清空标志
                    textColorInput.click();
                });
                
                // 颜色变化时更新预览
                textColorInput.addEventListener('input', () => {
                    textColorInput.dataset.cleared = 'false'; // 清除清空标志
                    updateTextColorPreview();
                });
                textColorInput.addEventListener('change', () => {
                    textColorInput.dataset.cleared = 'false'; // 清除清空标志
                    updateTextColorPreview();
                });
                
                // 清空按钮事件
                if (textColorClear) {
                    textColorClear.addEventListener('click', () => {
                        textColorInput.dataset.cleared = 'true'; // 设置清空标志
                        updateTextColorPreview();
                    });
                }
            }
            
            // 背景颜色
            const bgColorInput = settingsDialog_7ree.querySelector('#bgColor_7ree');
            const bgColorPreview = settingsDialog_7ree.querySelector('#bgColor_preview_7ree');
            const bgColorClear = settingsDialog_7ree.querySelector('#bgColor_clear_7ree');
            
            if (bgColorInput && bgColorPreview) {
                // 更新预览色块
                const updateBgColorPreview = () => {
                    const isCleared = bgColorInput.dataset.cleared === 'true';
                    if (isCleared || !bgColorInput.value || bgColorInput.value === '#000000') {
                        // 显示默认状态
                        bgColorPreview.style.backgroundColor = 'transparent';
                        bgColorPreview.style.border = '1px dashed #ccc';
                        bgColorPreview.title = '使用VSCode默认背景颜色';
                    } else {
                        bgColorPreview.style.backgroundColor = bgColorInput.value;
                        bgColorPreview.style.border = '1px solid #ccc';
                        bgColorPreview.title = bgColorInput.value;
                    }
                };
                
                // 点击预览色块时打开颜色选择器
                bgColorPreview.addEventListener('click', () => {
                    bgColorInput.dataset.cleared = 'false'; // 清除清空标志
                    bgColorInput.click();
                });
                
                // 颜色变化时更新预览
                bgColorInput.addEventListener('input', () => {
                    bgColorInput.dataset.cleared = 'false'; // 清除清空标志
                    updateBgColorPreview();
                });
                bgColorInput.addEventListener('change', () => {
                    bgColorInput.dataset.cleared = 'false'; // 清除清空标志
                    updateBgColorPreview();
                });
                
                // 清空按钮事件
                if (bgColorClear) {
                    bgColorClear.addEventListener('click', () => {
                        bgColorInput.dataset.cleared = 'true'; // 设置清空标志
                        updateBgColorPreview();
                    });
                }
            }
            
            // 选择背景颜色
            const selectionBgInput = settingsDialog_7ree.querySelector('#selectionBg_7ree');
            const selectionBgPreview = settingsDialog_7ree.querySelector('#selectionBg_preview_7ree');
            const selectionBgClear = settingsDialog_7ree.querySelector('#selectionBg_clear_7ree');
            
            if (selectionBgInput && selectionBgPreview) {
                // 更新预览色块
                const updateSelectionBgPreview = () => {
                    const isCleared = selectionBgInput.dataset.cleared === 'true';
                    if (isCleared || !selectionBgInput.value || selectionBgInput.value === '#000000') {
                        // 显示默认状态
                        selectionBgPreview.style.backgroundColor = 'transparent';
                        selectionBgPreview.style.border = '1px dashed #ccc';
                        selectionBgPreview.title = '使用VSCode默认选择背景色';
                    } else {
                        selectionBgPreview.style.backgroundColor = selectionBgInput.value;
                        selectionBgPreview.style.border = '1px solid #ccc';
                        selectionBgPreview.title = selectionBgInput.value;
                    }
                };
                
                // 点击预览色块时打开颜色选择器
                selectionBgPreview.addEventListener('click', () => {
                    selectionBgInput.dataset.cleared = 'false'; // 清除清空标志
                    selectionBgInput.click();
                });
                
                // 颜色变化时更新预览
                selectionBgInput.addEventListener('input', () => {
                    selectionBgInput.dataset.cleared = 'false'; // 清除清空标志
                    updateSelectionBgPreview();
                });
                selectionBgInput.addEventListener('change', () => {
                    selectionBgInput.dataset.cleared = 'false'; // 清除清空标志
                    updateSelectionBgPreview();
                });
                
                // 清空按钮事件
                if (selectionBgClear) {
                    selectionBgClear.addEventListener('click', () => {
                        selectionBgInput.dataset.cleared = 'true'; // 设置清空标志
                        updateSelectionBgPreview();
                    });
                }
            }
        },

        // 私有方法：初始化 tooltip 行为
        _initTooltips: function() {
            if (!settingsDialog_7ree) return;

            // 获取所有带有 data-tooltip 属性的元素
            const tooltipElements = settingsDialog_7ree.querySelectorAll('[data-tooltip]');
            
            tooltipElements.forEach(el => {
                let tooltip = null;

                el.addEventListener('mouseenter', () => {
                    // 创建 tooltip 元素
                    tooltip = document.createElement('div');
                    tooltip.className = 'custom-tooltip-temp';
                    tooltip.innerText = el.getAttribute('data-tooltip');

                    // 设置样式
                    tooltip.style.cssText = `
                        position: fixed;
                        visibility: hidden;
                        max-width: 250px;
                        background: var(--vscode-editorHoverWidget-background);
                        color: var(--vscode-editorHoverWidget-foreground);
                        padding: 8px 12px;
                        border: 1px solid var(--vscode-editorHoverWidget-border);
                        border-radius: 4px;
                        font-size: 12px;
                        line-height: 1.4;
                        z-index: 99999;
                        pointer-events: none;
                    `;

                    document.body.appendChild(tooltip);

                    // 计算位置
                    requestAnimationFrame(() => {
                        const rect = el.getBoundingClientRect();
                        const tipRect = tooltip.getBoundingClientRect();

                        let left = rect.left + (rect.width / 2) - (tipRect.width / 2);
                        left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8)); // 边界限制

                        tooltip.style.left = `${left}px`;
                        tooltip.style.top = `${rect.top - tipRect.height - 8}px`;
                        tooltip.style.visibility = 'visible';
                    });
                });

                el.addEventListener('mouseleave', () => {
                    if (tooltip) {
                        tooltip.remove();
                        tooltip = null;
                    }
                });
            });
        },
        
        // 新增: 私有方法：根据 enableJoplin 开关切换 Joplin 参数字段显隐
        _toggleJoplinFields_7ree: function(checked) {
            if (!settingsDialog_7ree) return;
            // 增加测试连接按钮的字段选择器
            ['joplinServerUrl_7ree', 'joplinToken_7ree', 'joplinNoteId_7ree'].forEach(id => {
                const input = settingsDialog_7ree.querySelector(`#${id}`);
                if (input) {
                    const field = input.closest('.settings-field_7ree');
                    if (field) field.style.display = checked ? '' : 'none';
                }
            });
            
            // 切换测试连接按钮的显隐
            const testContainer = settingsDialog_7ree.querySelector('.joplin-settings_7ree');
            if (testContainer) {
                testContainer.style.display = checked ? '' : 'none';
            }
        },
        
        // 私有方法：填充设置表单
        _populateSettingsForm: function() {
            if (!settingsDialog_7ree) return;
            
            // console.log('填充设置表单，当前设置:', JSON.stringify(currentSettings_7ree));
            
            // 界面设置
            const fontFamilyInput = settingsDialog_7ree.querySelector('#fontFamily_7ree');
            const fontSizeInput = settingsDialog_7ree.querySelector('#fontSize_7ree');
            const textColorInput = settingsDialog_7ree.querySelector('#textColor_7ree');
            const bgColorInput = settingsDialog_7ree.querySelector('#bgColor_7ree');
            const selectionBgInput = settingsDialog_7ree.querySelector('#selectionBg_7ree');
            const textColorPreview = settingsDialog_7ree.querySelector('#textColor_preview_7ree');
            const bgColorPreview = settingsDialog_7ree.querySelector('#bgColor_preview_7ree');
            const selectionBgPreview = settingsDialog_7ree.querySelector('#selectionBg_preview_7ree');

            if (fontFamilyInput) fontFamilyInput.value = currentSettings_7ree.fontFamily || '';
            if (fontSizeInput) fontSizeInput.value = currentSettings_7ree.fontSize || '';
            if (textColorInput) {
                const hasTextColor = currentSettings_7ree.color && currentSettings_7ree.color.trim();
                if (hasTextColor) {
                    textColorInput.value = currentSettings_7ree.color;
                    textColorInput.dataset.cleared = 'false';
                } else {
                    textColorInput.value = '#000000'; // 设置默认值避免浏览器警告
                    textColorInput.dataset.cleared = 'true';
                }
                if (textColorPreview) {
                    if (hasTextColor) {
                        textColorPreview.style.backgroundColor = currentSettings_7ree.color;
                        textColorPreview.style.border = '1px solid #ccc';
                        textColorPreview.title = currentSettings_7ree.color;
                    } else {
                        textColorPreview.style.backgroundColor = 'transparent';
                        textColorPreview.style.border = '1px dashed #ccc';
                        textColorPreview.title = '使用VSCode默认文本颜色';
                    }
                }
            }
            if (bgColorInput) {
                const hasBgColor = currentSettings_7ree.backgroundColor && currentSettings_7ree.backgroundColor.trim();
                if (hasBgColor) {
                    bgColorInput.value = currentSettings_7ree.backgroundColor;
                    bgColorInput.dataset.cleared = 'false';
                } else {
                    bgColorInput.value = '#ffffff'; // 设置默认值避免浏览器警告
                    bgColorInput.dataset.cleared = 'true';
                }
                if (bgColorPreview) {
                    if (hasBgColor) {
                        bgColorPreview.style.backgroundColor = currentSettings_7ree.backgroundColor;
                        bgColorPreview.style.border = '1px solid #ccc';
                        bgColorPreview.title = currentSettings_7ree.backgroundColor;
                    } else {
                        bgColorPreview.style.backgroundColor = 'transparent';
                        bgColorPreview.style.border = '1px dashed #ccc';
                        bgColorPreview.title = '使用VSCode默认背景颜色';
                    }
                }
            }
            if (selectionBgInput) {
                const hasSelectionBg = currentSettings_7ree.selectionBackground && currentSettings_7ree.selectionBackground.trim();
                if (hasSelectionBg) {
                    selectionBgInput.value = currentSettings_7ree.selectionBackground;
                    selectionBgInput.dataset.cleared = 'false';
                } else {
                    selectionBgInput.value = '#add6ff'; // 设置默认值避免浏览器警告
                    selectionBgInput.dataset.cleared = 'true';
                }
                if (selectionBgPreview) {
                    if (hasSelectionBg) {
                        selectionBgPreview.style.backgroundColor = currentSettings_7ree.selectionBackground;
                        selectionBgPreview.style.border = '1px solid #ccc';
                        selectionBgPreview.title = currentSettings_7ree.selectionBackground;
                    } else {
                        selectionBgPreview.style.backgroundColor = 'transparent';
                        selectionBgPreview.style.border = '1px dashed #ccc';
                        selectionBgPreview.title = '使用VSCode默认选择背景色';
                    }
                }
            }

            // 高级设置
            const autoSaveIntervalInput = settingsDialog_7ree.querySelector('#autoSaveInterval_7ree');

            const enableJoplinInput_7ree = settingsDialog_7ree.querySelector('#enableJoplin_7ree'); 

            const joplinServerUrlInput_7ree = settingsDialog_7ree.querySelector('#joplinServerUrl_7ree');
            const joplinTokenInput_7ree = settingsDialog_7ree.querySelector('#joplinToken_7ree');
            const joplinNoteIdInput_7ree = settingsDialog_7ree.querySelector('#joplinNoteId_7ree');
            
            if (autoSaveIntervalInput) {
                try {
                    const intervalValue = currentSettings_7ree.autoSaveInterval || 30;
                    const validValues = ['15', '30', '45', '60', '90', '120'];
                    if (!validValues.includes(String(intervalValue)) && intervalValue > 0) {
                        let hasOption = Array.from(autoSaveIntervalInput.options).some(opt => opt.value === String(intervalValue));
                        if (!hasOption) {
                            const newOption = document.createElement('option');
                            newOption.value = String(intervalValue);
                            newOption.text = `${intervalValue}秒`;
                            let inserted = false;
                            for (let i = 0; i < autoSaveIntervalInput.options.length; i++) {
                                if (intervalValue < parseInt(autoSaveIntervalInput.options[i].value)) {
                                    autoSaveIntervalInput.insertBefore(newOption, autoSaveIntervalInput.options[i]);
                                    inserted = true;
                                    break;
                                }
                            }
                            if (!inserted) autoSaveIntervalInput.appendChild(newOption);
                        }
                    }
                    autoSaveIntervalInput.value = String(intervalValue);
                } catch (error) {
                    // console.error('设置自动保存间隔选择框值出错:', error);
                    if (autoSaveIntervalInput) autoSaveIntervalInput.value = '30';
                }
            }

            if (enableJoplinInput_7ree) {
                const val = currentSettings_7ree.enableJoplin_7ree;
                enableJoplinInput_7ree.checked = (val === true || val === 'true');
                this._toggleJoplinFields_7ree(enableJoplinInput_7ree.checked); // 新增：根据状态切换显隐
            }

            if (joplinServerUrlInput_7ree) joplinServerUrlInput_7ree.value = currentSettings_7ree.joplinServerUrl_7ree || '';
            if (joplinTokenInput_7ree) joplinTokenInput_7ree.value = currentSettings_7ree.joplinToken_7ree || '';
            if (joplinNoteIdInput_7ree) joplinNoteIdInput_7ree.value = currentSettings_7ree.joplinNoteId_7ree || '';
            
            // 验证表单是否已经正确填充
            // setTimeout(() => {
                // if (textColorInput) console.log('验证文字颜色输入框值:', textColorInput.value);
                // if (bgColorInput) console.log('验证背景颜色输入框值:', bgColorInput.value);
                // if (selectionBgInput) console.log('验证选择背景输入框值:', selectionBgInput.value);
                // if (autoSaveIntervalInput) console.log('验证自动保存间隔选择框值:', autoSaveIntervalInput.value);
                // if (joplinServerUrlInput_7ree) console.log('验证Joplin URL:', joplinServerUrlInput_7ree.value);
                // if (joplinTokenInput_7ree) console.log('验证Joplin Token:', joplinTokenInput_7ree.value);
                // if (joplinNoteIdInput_7ree) console.log('验证Joplin Note ID:', joplinNoteIdInput_7ree.value);
           //  }, 100);
        },
        
        // 私有方法：处理保存设置
        _handleSaveSettings: function() {
            if (!settingsDialog_7ree) return;
            
            // 获取表单中的设置值
            const fontFamilyInput = settingsDialog_7ree.querySelector('#fontFamily_7ree');
            const fontSizeInput = settingsDialog_7ree.querySelector('#fontSize_7ree');
            const textColorInput = settingsDialog_7ree.querySelector('#textColor_7ree');
            const bgColorInput = settingsDialog_7ree.querySelector('#bgColor_7ree');
            const selectionBgInput = settingsDialog_7ree.querySelector('#selectionBg_7ree');
            const autoSaveIntervalInput = settingsDialog_7ree.querySelector('#autoSaveInterval_7ree');

            const joplinServerUrlInput_7ree = settingsDialog_7ree.querySelector('#joplinServerUrl_7ree');
            const joplinTokenInput_7ree = settingsDialog_7ree.querySelector('#joplinToken_7ree');
            const joplinNoteIdInput_7ree = settingsDialog_7ree.querySelector('#joplinNoteId_7ree');

            const enableJoplinInput_7ree = settingsDialog_7ree.querySelector('#enableJoplin_7ree');

            
            // 更新设置值
            const newSettings = { ...currentSettings_7ree };
            
            if (fontFamilyInput) newSettings.fontFamily = fontFamilyInput.value.trim();
            if (fontSizeInput) newSettings.fontSize = fontSizeInput.value.trim();
            if (textColorInput) {
                // 检查是否被标记为清空
                if (textColorInput.dataset.cleared === 'true') {
                    newSettings.color = '';
                } else {
                    newSettings.color = textColorInput.value.trim();
                }
            }
            if (bgColorInput) {
                // 检查是否被标记为清空
                if (bgColorInput.dataset.cleared === 'true') {
                    newSettings.backgroundColor = '';
                } else {
                    newSettings.backgroundColor = bgColorInput.value.trim();
                }
            }
            if (selectionBgInput) {
                // 检查是否被标记为清空
                if (selectionBgInput.dataset.cleared === 'true') {
                    newSettings.selectionBackground = '';
                } else {
                    newSettings.selectionBackground = selectionBgInput.value.trim();
                }
            }
            if (autoSaveIntervalInput) {
                const intervalValue = parseInt(autoSaveIntervalInput.value);
                newSettings.autoSaveInterval = !isNaN(intervalValue) ? intervalValue : 30;
            }

            if (enableJoplinInput_7ree) {
                newSettings.enableJoplin_7ree = enableJoplinInput_7ree.checked ? 'true' : 'false'; // ← 修正：根据控件状态保存字符串
            }

            if (joplinServerUrlInput_7ree) newSettings.joplinServerUrl_7ree = joplinServerUrlInput_7ree.value.trim();
            if (joplinTokenInput_7ree) newSettings.joplinToken_7ree = joplinTokenInput_7ree.value.trim();
            if (joplinNoteIdInput_7ree) newSettings.joplinNoteId_7ree = joplinNoteIdInput_7ree.value.trim();
            
            // console.log('保存新设置:', JSON.stringify(newSettings));
            
            this.updateSettings(newSettings);
            
            // console.log('正在应用设置到编辑器...');
            try {
                this._applyEditorCustomStyles(newSettings);
                this.saveSettings(); // 保存到VSCode扩展
                
                setTimeout(() => {
                    const styleElement = document.getElementById('monaco-custom-styles_7ree');
                    if (styleElement) {
                        // console.log('验证: 样式元素存在且内容长度为', styleElement.textContent.length);
                    } else {
                        // console.error('验证失败: 找不到样式元素');
                    }
                    
                    const editorContainer = document.getElementById('editor-container');
                    if (editorContainer) {
                        const computedStyle = window.getComputedStyle(editorContainer);
                        // console.log('编辑器容器计算样式 - 背景色:', computedStyle.backgroundColor);
                    }
                    
                    try {
                        if (vscode) {
                            vscode.postMessage({ command: 'getUISettings_7ree' });
                            // console.log('已请求最新UI设置');
                        }
                    } catch (err) {
                        // console.error('请求更新设置失败:', err);
                    }
                }, 200);
                
                // 显示保存成功提示
                this._showSettingsSavedMessage();
            } catch (err) {
                // console.error('应用或保存设置时出错:', err);
                
                // 显示保存失败提示
                if (settingsDialog_7ree) {
                    const messageContainer = this._createMessageContainer(settingsDialog_7ree);
                    messageContainer.textContent = '保存设置失败：' + (err.message || '未知错误');
                    messageContainer.className = 'settings-message_7ree settings-message-error_7ree';
                    setTimeout(() => {
                        if (messageContainer && messageContainer.parentNode) {
                            messageContainer.parentNode.removeChild(messageContainer);
                        }
                    }, 3000);
                }
            }
            
            // 不再关闭设置对话框
            // this.closeSettings();
            
            if (window.showStatusMessage) {
                window.showStatusMessage('设置已保存并应用');
            }
        },
        
        // 私有方法：应用编辑器自定义样式
        _applyEditorCustomStyles: function(options) {
            if (!editor_7ree || !editor_7ree.updateOptions) {
                // console.error('无法应用样式：编辑器未初始化或不支持updateOptions');
                return;
            }
            
            // 更新Monaco编辑器选项
            const editorOptions = {};
            
            if (options.fontFamily) {
                editorOptions.fontFamily = options.fontFamily;
            }
            
            if (options.fontSize) {
                // 处理带px的情况
                let fontSize = options.fontSize;
                if (typeof fontSize === 'string' && fontSize.endsWith('px')) {
                    fontSize = parseInt(fontSize);
                }
                editorOptions.fontSize = fontSize;
            }
            
            if (options.enableJoplin_7ree) {
                editorOptions.enableJoplin_7ree = options.enableJoplin_7ree;
            }
            
            // 更新编辑器选项
            editor_7ree.updateOptions(editorOptions);
            // console.log('已更新编辑器选项:', JSON.stringify(editorOptions));
            
            // 调试DOM结构
            this._debugEditorDom();
            
            // 更新自定义CSS
            this._updateEditorCustomCSS(options);
        },
        
        // 新增：创建消息容器
        _createMessageContainer: function(parentElement) {
            // 先移除现有的消息容器（如果有）
            const existingMessage = parentElement.querySelector('.settings-message_7ree');
            if (existingMessage && existingMessage.parentNode) {
                existingMessage.parentNode.removeChild(existingMessage);
            }
            
            // 创建新的消息容器
            const messageContainer = document.createElement('div');
            messageContainer.className = 'settings-message_7ree';
            
            // 定位在对话框中间
            parentElement.appendChild(messageContainer);
            
            return messageContainer;
        },
        
        // 新增：显示设置保存成功消息
        _showSettingsSavedMessage: function() {
            if (!settingsDialog_7ree) return;
            
            const messageContainer = this._createMessageContainer(settingsDialog_7ree);
            messageContainer.textContent = '设置已保存';
            messageContainer.className = 'settings-message_7ree settings-message-success_7ree';
            
            // 3秒后自动消失
            setTimeout(() => {
                if (messageContainer && messageContainer.parentNode) {
                    messageContainer.parentNode.removeChild(messageContainer);
                }
            }, 3000);
        },
        
        // 新增：调试编辑器DOM结构函数
        _debugEditorDom: function() {
            // console.log('开始检查Monaco编辑器DOM结构...');
            
            // 检查编辑器容器
            const editorContainer = document.querySelector('.monaco-editor');
            if (!editorContainer) {
                console.error('找不到.monaco-editor元素');
                return;
            }
            // console.log('找到.monaco-editor元素:', editorContainer);
            
            // 检查编辑器背景
            const editorBackground = document.querySelector('.monaco-editor-background');
            if (!editorBackground) {
                // console.warn('找不到.monaco-editor-background元素');
            } else {
                // console.log('找到.monaco-editor-background元素');
            }
            
            // 检查视图行
            const viewLines = document.querySelectorAll('.monaco-editor .view-line');
            // console.log(`找到${viewLines.length}个.view-line元素`);
            
            // 检查选中文本样式
            const selectedText = document.querySelectorAll('.monaco-editor .selected-text');
            // console.log(`找到${selectedText.length}个.selected-text元素`);
            
            // 检查编辑器CSS变量
            const editorStyles = window.getComputedStyle(editorContainer);
            // console.log('编辑器计算样式 - 背景色:', editorStyles.backgroundColor);
            
            // 检查使用querySelector能否直接获取我们想要样式的元素
            const styleSelectors = [
                '.monaco-editor .view-line',
                '.monaco-editor',
                '.monaco-editor .margin',
                '.monaco-editor .selected-text'
            ];
            
            styleSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                // console.log(`选择器 "${selector}" 匹配了 ${elements.length} 个元素`);
            });
        },
        
        // 私有方法：更新编辑器自定义CSS
        _updateEditorCustomCSS: function(options) {
            // console.log('settings_api中的_updateEditorCustomCSS被调用，选项:', JSON.stringify(options));
            
            // 获取颜色 - 只有非空值才应用
            const bgColor = options.backgroundColor && options.backgroundColor.trim() ? options.backgroundColor.trim() : '';
            const textColor = options.color && options.color.trim() ? options.color.trim() : '';
            const selectionBgColor = options.selectionBackground && options.selectionBackground.trim() ? options.selectionBackground.trim() : '';
            
            // console.log('应用颜色 - 背景色:', bgColor, '文字颜色:', textColor, '选中背景:', selectionBgColor);
            
            // 如果所有颜色都为空，移除自定义样式，让VSCode使用默认主题
            if (!bgColor && !textColor && !selectionBgColor) {
                // console.log('所有颜色都为空，移除自定义样式，使用VSCode默认主题');
                
                // 移除所有自定义样式元素
                const styleElements = [
                    'monaco-custom-styles_7ree', 
                    'editor-custom-styles_7ree'
                ];
                
                styleElements.forEach(styleId => {
                    const styleElement = document.getElementById(styleId);
                    if (styleElement) {
                        styleElement.remove();
                        // console.log(`已移除样式元素: ${styleId}`);
                    }
                });
                
                // 清除容器的内联样式
                const containers = [
                    document.getElementById('editor-container'),
                    document.getElementById('notes-container'),
                    document.querySelector('.monaco-editor-container_7ree')
                ];
                
                containers.forEach(container => {
                    if (container) {
                        container.style.backgroundColor = '';
                        container.style.color = '';
                    }
                });
                
                // 触发编辑器重新布局，确保使用默认样式
                if (editor_7ree && editor_7ree.layout) {
                    setTimeout(() => {
                        try {
                            editor_7ree.layout();
                            // console.log('触发了编辑器重新布局以恢复默认样式');
                        } catch (e) {
                            // console.error('触发编辑器重新布局时出错:', e);
                        }
                    }, 100);
                }
                
                return;
            }
            
            // 优先设置背景色，即使编辑器尚未创建，也确保HTML元素有正确的背景色
            if (bgColor) {
                // 直接设置容器背景色，防止闪烁
                const editorContainer = document.getElementById('editor-container');
                if (editorContainer) {
                    editorContainer.style.backgroundColor = bgColor;
                    // console.log('直接设置了editor-container的背景色:', bgColor);
                }
                
                // 设置其他相关容器的背景色
                const notesContainer = document.getElementById('notes-container');
                if (notesContainer) {
                    notesContainer.style.backgroundColor = bgColor;
                }
                
                const monacoEditorContainer = document.querySelector('.monaco-editor-container_7ree');
                if (monacoEditorContainer) {
                    monacoEditorContainer.style.backgroundColor = bgColor;
                }
            } else {
                // 当背景色为空时，移除自定义背景色，让VSCode使用默认主题色
                const containers = [
                    document.getElementById('editor-container'),
                    document.getElementById('notes-container'),
                    document.querySelector('.monaco-editor-container_7ree')
                ];
                
                containers.forEach(container => {
                    if (container) {
                        container.style.backgroundColor = '';
                    }
                });
            }
            
            // 检查webview.js创建的样式元素
            const webviewStyleElement = document.getElementById('monaco-custom-styles_7ree');
            if (webviewStyleElement) {
                // console.log('发现webview.js创建的样式元素，避免重复应用样式');
                
                // 更新webview.js创建的样式元素，而不是创建新的
                if (bgColor || textColor || selectionBgColor) {
                    // 获取当前主题信息
                    const isDarkTheme = document.body.classList.contains('vscode-dark');
                    
                    // 如果有任何样式参数，更新已有的样式元素
                    const cssRules = [];
                    
                    if (bgColor) {
                        cssRules.push(`
                            /* 预先设置背景色，防止闪烁 */
                            body, html, #editor-container, .editor-wrapper, .monaco-editor-container_7ree, .notes-container_7ree {
                                background-color: ${bgColor} !important;
                            }
                            
                            /* 增强编辑器背景色 */
                            body .monaco-editor, 
                            body .monaco-editor .monaco-editor-background, 
                            body .monaco-editor-background,
                            body .monaco-editor .margin,
                            body .monaco-editor .margin-view-overlays,
                            #editor-container .monaco-editor,
                            #editor-container .monaco-editor-background,
                            .monaco-editor .monaco-editor-background,
                            .monaco-editor .margin-view-overlays,
                            .monaco-editor-background {
                                background-color: ${bgColor} !important;
                            }
                            
                            /* 确保行号边栏背景色 */
                            body .monaco-editor .margin-view-overlays .line-numbers,
                            #editor-container .monaco-editor .margin-view-overlays .line-numbers,
                            .monaco-editor .margin-view-overlays .line-numbers {
                                background-color: ${bgColor} !important;
                            }
                        `);
                    }
                    
                    if (textColor) {
                        cssRules.push(`
                            /* 文字颜色 */
                            body .monaco-editor .lines-content,
                            body .monaco-editor .view-line span,
                            body .monaco-editor .view-lines,
                            #editor-container .monaco-editor .view-line span {
                                color: ${textColor} !important;
                            }
                        `);
                    }
                    
                    if (selectionBgColor) {
                        cssRules.push(`
                            /* 选中文本背景色 */
                            body .monaco-editor .selected-text,
                            #editor-container .monaco-editor .selected-text {
                                background-color: ${selectionBgColor} !important;
                            }
                        `);
                    }
                    
                    // 更新样式元素的内容
                    webviewStyleElement.textContent = cssRules.join('\n');
                    // console.log('已更新webview.js创建的样式元素内容');
                } else {
                    // 如果没有任何自定义颜色，移除样式元素
                    webviewStyleElement.remove();
                    // console.log('已移除webview.js创建的样式元素');
                }
                
                // 触发编辑器重新布局以确保更改生效
                setTimeout(() => {
                    if (editor_7ree && editor_7ree.layout) {
                        try {
                            editor_7ree.layout();
                            // console.log('触发了编辑器重新布局以应用样式变化');
                        } catch (e) {
                            // console.error('触发编辑器重新布局时出错:', e);
                        }
                    }
                }, 100);
                
                return;
            }
            
            // 移除现有的自定义样式
            const existingStyle = document.getElementById('editor-custom-styles_7ree');
            if (existingStyle) {
                existingStyle.remove();
                // console.log('移除了现有的编辑器自定义样式');
            }
            
            // 使用统一的样式元素ID
            this._updateMonacoCustomStyles(options, 'monaco-custom-styles_7ree');
        },
        
        // 新增：更新Monaco编辑器样式的辅助函数
        _updateMonacoCustomStyles: function(options, styleId) {
            // 获取颜色 - 只有非空值才应用
            const bgColor = options.backgroundColor && options.backgroundColor.trim() ? options.backgroundColor.trim() : '';
            const textColor = options.color && options.color.trim() ? options.color.trim() : '';
            const selectionBgColor = options.selectionBackground && options.selectionBackground.trim() ? options.selectionBackground.trim() : '';
            
            // 如果所有颜色都为空，移除样式元素
            if (!bgColor && !textColor && !selectionBgColor) {
                const styleElement = document.getElementById(styleId);
                if (styleElement) {
                    styleElement.remove();
                    // console.log(`已移除样式元素: ${styleId}，因为所有颜色都为空`);
                }
                return;
            }
            
            // 创建或获取样式元素
            let styleElement = document.getElementById(styleId);
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = styleId;
                // 将样式元素添加到head的最前面，确保最高优先级
                if (document.head.firstChild) {
                    document.head.insertBefore(styleElement, document.head.firstChild);
                } else {
                    document.head.appendChild(styleElement);
                }
                // console.log(`创建了新的样式元素: ${styleId}`);
            } else {
                // console.log(`使用现有样式元素: ${styleId}`);
            }
            
            // 构建CSS规则
            const cssRules = [];
            
            if (bgColor) {
                cssRules.push(`
                    /* 预先设置背景色，防止闪烁 */
                    body, html, #editor-container, .editor-wrapper, .monaco-editor-container_7ree, .notes-container_7ree {
                        background-color: ${bgColor} !important;
                    }
                    
                    /* 增强编辑器背景色 */
                    body .monaco-editor, 
                    body .monaco-editor .monaco-editor-background, 
                    body .monaco-editor-background,
                    body .monaco-editor .margin,
                    body .monaco-editor .margin-view-overlays,
                    #editor-container .monaco-editor,
                    #editor-container .monaco-editor-background,
                    .monaco-editor .monaco-editor-background,
                    .monaco-editor .margin-view-overlays,
                    .monaco-editor-background {
                        background-color: ${bgColor} !important;
                    }
                    
                    /* 确保行号边栏背景色 */
                    body .monaco-editor .margin-view-overlays .line-numbers,
                    #editor-container .monaco-editor .margin-view-overlays .line-numbers,
                    .monaco-editor .margin-view-overlays .line-numbers {
                        background-color: ${bgColor} !important;
                    }
                `);
                
                // 直接设置编辑器容器的背景色
                const editorContainer = document.getElementById('editor-container');
                if (editorContainer) {
                    editorContainer.style.backgroundColor = bgColor;
                    // console.log('直接设置了editor-container的背景色:', bgColor);
                }
            }
            
            if (textColor) {
                cssRules.push(`
                    /* 文字颜色 */
                    body .monaco-editor .lines-content,
                    body .monaco-editor .view-line span,
                    body .monaco-editor .view-lines,
                    #editor-container .monaco-editor .view-line span {
                        color: ${textColor} !important;
                    }
                `);
            }
            
            if (selectionBgColor) {
                cssRules.push(`
                    /* 选中文本背景色 */
                    body .monaco-editor .selected-text,
                    #editor-container .monaco-editor .selected-text {
                        background-color: ${selectionBgColor} !important;
                    }
                `);
            }
            
            // 设置样式内容
            styleElement.textContent = cssRules.join('\n');
            // console.log('创建的CSS规则长度:', styleElement.textContent.length);
            
            // 强制DOM重绘
            setTimeout(() => {
                if (editor_7ree && editor_7ree.layout) {
                    try {
                        editor_7ree.layout();
                        // console.log('触发了编辑器重新布局以应用样式变化');
                    } catch (e) {
                        // console.error('触发编辑器重新布局时出错:', e);
                    }
                }
            }, 100);
        },
        
        // 私有方法：设置自动保存
        _setupAutoSave: function(intervalSeconds) {
            // 清除现有的自动保存定时器
            if (window.autoSaveInterval_7ree) {
                clearInterval(window.autoSaveInterval_7ree);
            }
            
            // 设置新的自动保存定时器
            const intervalMs = intervalSeconds * 1000;
            
            if (intervalMs > 0 && window.saveCurrentContent) {
                window.autoSaveInterval_7ree = setInterval(() => {
                    if (window.saveCurrentContent) {
                        window.saveCurrentContent();
                    }
                }, intervalMs);
                
                // console.log(`已设置自动保存间隔为 ${intervalSeconds} 秒`);
            }
        },
        
        // 私有方法：显示设置对话框（将显示逻辑从openSettings分离出来）
        _showSettingsDialog: function() {
            if (!settingsDialog_7ree) {
                this._createSettingsDialog();
            }
            
            // 填充当前设置值
            this._populateSettingsForm();
            
            // 显示对话框
            settingsDialog_7ree.style.display = 'block';
            
            // 设置对话框的tabIndex以使其可聚焦
            settingsDialog_7ree.setAttribute('tabindex', '-1');
            
            // 先聚焦对话框本身以确保键盘事件能被捕获
            settingsDialog_7ree.focus();
            
            // 聚焦第一个输入框
            setTimeout(() => {
                const firstInput = settingsDialog_7ree.querySelector('input');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);

            // 初始化 tooltip 支持
            this._initTooltips(); // 新增调用
            
            // 添加测试Joplin连接按钮的事件处理
            const testJoplinBtn = settingsDialog_7ree.querySelector('#test_joplin_connection_7ree');
            const joplinTestResult = settingsDialog_7ree.querySelector('#joplin_test_result_7ree');
            
            if (testJoplinBtn && joplinTestResult) {
                testJoplinBtn.onclick = () => {
                    // console.log('🔴🔴 (测试连接按钮) 按钮被点击！');
                    
                    // 获取输入的Joplin连接信息
                    const serverUrl = settingsDialog_7ree.querySelector('#joplinServerUrl_7ree').value.trim();
                    const token = settingsDialog_7ree.querySelector('#joplinToken_7ree').value.trim();
                    const noteId = settingsDialog_7ree.querySelector('#joplinNoteId_7ree').value.trim();
                    
                    /*
                    console.log('🔴🔴 输入数据：', {
                        serverUrl,
                        token: token ? '已输入token' : '未输入',
                        noteId
                    });
                    */
                   
                    // 验证输入
                    if (!serverUrl || !token || !noteId) {
                        // console.log('🔴🔴 输入验证失败');
                        joplinTestResult.textContent = '错误：请填写所有Joplin连接信息';
                        joplinTestResult.className = 'joplin-test-result_7ree joplin-test-error_7ree';
                        return;
                    }
                    
                    // 显示正在测试的提示
                    joplinTestResult.textContent = '正在测试Joplin连接...';
                    joplinTestResult.className = 'joplin-test-result_7ree joplin-test-loading_7ree';
                    
                    // console.log('🔴🔴 将发送测试连接请求到VSCode扩展');
                    
                    // 确保Joplin测试消息监听器已初始化
                    if (typeof window.initJoplinTestListeners_7ree === 'function') {
                        // console.log('🔴🔴 确保Joplin测试消息监听器已初始化');
                        // 重置初始化标志，确保每次都能正确初始化
                        window.joplinTestListenersInitialized_7ree = false;
                        window.initJoplinTestListeners_7ree();
                    } else {
                        // console.log('🔴🔴 警告：找不到initJoplinTestListeners_7ree函数');
                        // 如果找不到初始化函数，则手动实现一个简化版本
                        window.initJoplinTestListeners_7ree = function() {
                            // console.log('🔴🔴 使用内联定义的Joplin测试监听器');
                            
                            // 监听来自VSCode的joplinTestResponse消息
                            window.addEventListener('message', function(evt) {
                                if (evt.data && evt.data.command === 'joplinTestResponse') {
                                    // console.log('🔴🔴 内联监听器捕获到joplinTestResponse:', evt.data);
                                    
                                    // 创建并分发一个自定义事件
                                    const resultEvent = new CustomEvent('joplinTestResult', {
                                        detail: {
                                            success: evt.data.success,
                                            error: evt.data.error || '',
                                            data: evt.data.data
                                        },
                                        bubbles: true,
                                        cancelable: true
                                    });
                                    window.dispatchEvent(resultEvent);
                                }
                            });
                        };
                        
                        // 立即调用新创建的函数
                        window.initJoplinTestListeners_7ree();
                    }
                    
                    // 直接发送测试请求到VSCode扩展
                    vscode.postMessage({
                        command: 'testJoplinConnection',
                        serverUrl: serverUrl,
                        token: token,
                        noteId: noteId
                    });
                    
                    // 注册测试结果事件响应处理程序
                    window.addEventListener('joplinTestResponse', function handleTestResponse(event) {
                        // console.log('🔴🔴 收到Joplin测试响应:', event.detail);
                        
                        // 处理完成后移除事件监听器，避免重复处理
                        window.removeEventListener('joplinTestResponse', handleTestResponse);
                    });
                    
                    // console.log('🔴🔴 测试连接请求已发送');
                };
            }
            
            // 监听测试结果响应，使用自定义事件
            const joplinTestResultHandler = function(event) {
                const data = event.detail;
                // console.log('设置对话框收到Joplin测试结果:', data);
                
                const joplinTestResult = settingsDialog_7ree?.querySelector('#joplin_test_result_7ree');
                if (joplinTestResult) {
                    if (data.success) {
                        // 测试成功，更新UI和自动保存设置
                        joplinTestResult.textContent = '连接成功！Joplin配置有效。';
                        joplinTestResult.className = 'joplin-test-result_7ree joplin-test-success_7ree';
                        
                        // 获取当前测试的Joplin参数
                        const serverUrl = settingsDialog_7ree.querySelector('#joplinServerUrl_7ree').value.trim();
                        const token = settingsDialog_7ree.querySelector('#joplinToken_7ree').value.trim();
                        const noteId = settingsDialog_7ree.querySelector('#joplinNoteId_7ree').value.trim();
                        
                        // 自动保存测试成功的参数
                        if (serverUrl && token && noteId) {
                            // 保存到设置对象
                            currentSettings_7ree.joplinServerUrl_7ree = serverUrl;
                            currentSettings_7ree.joplinToken_7ree = token;
                            currentSettings_7ree.joplinNoteId_7ree = noteId;
                            
                            // 自动启用Joplin集成
                            const enableJoplinCheckbox = settingsDialog_7ree.querySelector('#enableJoplin_7ree');
                            if (enableJoplinCheckbox && !enableJoplinCheckbox.checked) {
                                enableJoplinCheckbox.checked = true;
                                currentSettings_7ree.enableJoplin_7ree = 'true'; // 使用字符串而非布尔值
                            }
                            
                            // 将设置保存到VSCode
                            vscode.postMessage({
                                command: 'saveSettings',
                                settings: currentSettings_7ree
                            });
                            
                            // console.log('测试成功后自动保存了Joplin参数');
                        }
                    } else {
                        // 测试失败，只更新UI
                        joplinTestResult.textContent = `连接失败: ${data.error || '未知错误'}`;
                        joplinTestResult.className = 'joplin-test-result_7ree joplin-test-error_7ree';
                    }
                }
            };
            
            // 移除旧的事件监听器（如果存在）
            window.removeEventListener('joplinTestResult', joplinTestResultHandler);
            // 添加新的事件监听器
            window.addEventListener('joplinTestResult', joplinTestResultHandler);
        }
    };

    // 监听来自VSCode的消息
    window.addEventListener('message', function(event) {
        const message = event.data;
        
        // 处理loadUISettings_7ree消息 - 从VSCode收到的项目级设置
        if (message && message.command === 'loadUISettings_7ree' && message.settings) {
            // console.log('settings_api收到loadUISettings_7ree消息:', JSON.stringify(message.settings));
            
            // 重置设置请求时间，表示已收到响应
            if (window._settingsRequestTime_7ree) {
                window._settingsRequestTime_7ree = 0;
            }
            
            // 更新当前设置
            currentSettings_7ree = { ...currentSettings_7ree, ...message.settings };
            
            // 立即应用样式，防止背景色闪烁
            if (editor_7ree && settingsApi_7ree) {
                settingsApi_7ree._updateEditorCustomCSS(currentSettings_7ree);
            }
            
            // 如果设置对话框已打开，则更新表单
            if (settingsDialog_7ree && settingsDialog_7ree.style.display === 'block') {
                // console.log('设置对话框已打开，更新表单');
                settingsApi_7ree._populateSettingsForm();
            }
        }
        
        // 处理loadGlobalSettings_7ree消息 - 从VSCode收到的全局设置
        if (message && message.command === 'loadGlobalSettings_7ree' && message.settings) {
            const globalSettings = message.settings;
            // 优先使用全局UI设置
            if (globalSettings.fontFamily !== undefined) currentSettings_7ree.fontFamily = globalSettings.fontFamily;
            if (globalSettings.fontSize !== undefined) currentSettings_7ree.fontSize = globalSettings.fontSize;
            if (globalSettings.color !== undefined) currentSettings_7ree.color = globalSettings.color;
            if (globalSettings.backgroundColor !== undefined) currentSettings_7ree.backgroundColor = globalSettings.backgroundColor;
            if (globalSettings.selectionBackground !== undefined) currentSettings_7ree.selectionBackground = globalSettings.selectionBackground;
            if (globalSettings.autoSaveInterval !== undefined) currentSettings_7ree.autoSaveInterval = globalSettings.autoSaveInterval;
            
            // 更新Joplin相关设置
            if (globalSettings.joplinServerUrl_7ree !== undefined) currentSettings_7ree.joplinServerUrl_7ree = globalSettings.joplinServerUrl_7ree;
            if (globalSettings.joplinToken_7ree    !== undefined) currentSettings_7ree.joplinToken_7ree    = globalSettings.joplinToken_7ree;
            if (globalSettings.joplinNoteId_7ree   !== undefined) currentSettings_7ree.joplinNoteId_7ree   = globalSettings.joplinNoteId_7ree;
            if (globalSettings.enableJoplin_7ree   !== undefined) currentSettings_7ree.enableJoplin_7ree   = globalSettings.enableJoplin_7ree; // ← 新增：同步启用开关
            
            // 立即应用样式，防止背景色闪烁
            if (editor_7ree && settingsApi_7ree) {
                settingsApi_7ree._updateEditorCustomCSS(currentSettings_7ree);
            }
            
            // 如果设置对话框已打开，则更新表单
            if (settingsDialog_7ree && settingsDialog_7ree.style.display === 'block') {
                // console.log('设置对话框已打开，更新全局设置表单');
                settingsApi_7ree._populateSettingsForm();
            }
        }
        
        // 处理loadSystemSettings_7ree消息（向下兼容旧版本）
        if (message && message.command === 'loadSystemSettings_7ree' && message.settings) {
            // console.log('settings_api收到loadSystemSettings_7ree消息(旧格式):', JSON.stringify(message.settings));
            
            // 更新当前设置中的系统级设置
            currentSettings_7ree.joplinServerUrl_7ree = message.settings.joplinServerUrl_7ree || '';
            currentSettings_7ree.joplinToken_7ree = message.settings.joplinToken_7ree || '';
            currentSettings_7ree.joplinNoteId_7ree = message.settings.joplinNoteId_7ree || '';
            
            // console.log('从旧格式更新了系统设置');
            
            // 如果设置对话框已打开，则更新表单
            if (settingsDialog_7ree && settingsDialog_7ree.style.display === 'block') {
                // console.log('设置对话框已打开，更新系统设置表单');
                
                // 直接更新系统设置输入框的值
                const joplinServerUrlInput_7ree = settingsDialog_7ree.querySelector('#joplinServerUrl_7ree');
                const joplinTokenInput_7ree = settingsDialog_7ree.querySelector('#joplinToken_7ree');
                const joplinNoteIdInput_7ree = settingsDialog_7ree.querySelector('#joplinNoteId_7ree');
                const enableJoplinInput_7ree = settingsDialog_7ree.querySelector('#enableJoplin_7ree');
                if (joplinServerUrlInput_7ree) joplinServerUrlInput_7ree.value = currentSettings_7ree.joplinServerUrl_7ree;
                if (joplinTokenInput_7ree) joplinTokenInput_7ree.value = currentSettings_7ree.joplinToken_7ree;
                if (joplinNoteIdInput_7ree) joplinNoteIdInput_7ree.value = currentSettings_7ree.joplinNoteId_7ree;
                
                // console.log('已直接更新Joplin输入框值');
            }
        }
    });

    // 导出到全局作用域
    window.settingsApi_7ree = settingsApi_7ree;
})();