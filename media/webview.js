/* global document, window, monaco, require, RESOURCES_BASE_URI_7ree */
// @ts-ignore
// 获取 vscode API
const vscode = acquireVsCodeApi();

// 保持上次保存的状态
let lastSavedContent = '';
let saveTimeout = null; // 用于文本输入后的自动保存
let scrollSaveTimeout_7ree = null; // 用于滚动停止后的自动保存滚动位置
let currentOpenFileId_7ree = 'default_notes_7ree'; // 用于跟踪当前活动文件
let textareaResizeObserver_7ree = null; // 监控textarea宽度变化
let lastTextareaWidth_7ree = 0; // 记录上次textarea宽度
let importButtonInTabs_7ree = null; // 将按钮保存在全局，方便重用
let openFileButtonInTabs_7ree = null; // 新增：打开文件按钮
let fileCheckInterval_7ree = null; // 新增：用于定期检查文件变化的定时器
let lastEditTime_7ree = 0; // 新增：记录上次编辑时间
let renamingTabId_7ree = null; // 新增：当前正在重命名的标签ID
let draggedTab_7ree = null; // 新增：当前正在拖动的标签
let dragTargetTab_7ree = null; // 新增：当前拖动目标的标签
let moreActionsButton_7ree = null; // 新增：更多操作按钮
/** @type {HTMLElement | null} */
let actionsDropdown_7ree = null; // 新增：操作下拉菜单
let settingsDialog_7ree = null; // 新增：设置对话框
// 新增：用于通过文本锚点恢复位置
let anchorTextByFileId_7ree = {};
let currentUiSettings_7ree = { // 新增：存储当前UI设置
    fontFamily: '',
    fontSize: '',
    color: '',
    backgroundColor: '',
    autoSaveInterval: 10
};

// 搜索相关变量
let searchBar_7ree = null; // 搜索条元素
let searchInput_7ree = null; // 搜索输入框
let searchMatches_7ree = null; // 匹配结果显示元素
let currentSearchMatch_7ree = 0; // 当前匹配位置
let totalSearchMatches_7ree = 0; // 总匹配数
let searchDecorations_7ree = []; // 搜索高亮装饰器
let searchMatchesList_7ree = []; // 存储所有匹配项

// Monaco 编辑器相关变量
let editor_7ree = null;  // Monaco 编辑器实例
let isInitialized_7ree = false; // 标记编辑器是否已初始化
let isSettingContent_7ree = false; // 标记是否正在设置内容（避免触发change事件）

// 为了与VSCode扩展通信，将toggleSearchBar_7ree设为全局函数
window.toggleSearchBar_7ree = function() {
    console.log('全局toggleSearchBar_7ree被调用');
    toggleSearchBar_7ree();
};

// 新增：开始拖动标签的处理
document.addEventListener('dragstart', (e) => {
    // 阻止搜索条的拖动
    if (e.target.closest('#search_bar_7ree')) {
        e.preventDefault();
        return false;
    }
});

// 当DOM内容加载完成时初始化
// @ts-ignore
document.addEventListener('DOMContentLoaded', () => {
    // 初始化 Monaco 编辑器
    initMonacoEditor_7ree();
    
    // @ts-ignore
    const statusTextElement = document.getElementById('notes_status_7ree');
    // @ts-ignore
    const manualSaveButton = document.getElementById('manual_save_button_7ree');
    // @ts-ignore
    const fileTabsContainer = document.getElementById('file_tabs_container_7ree');
    
    // 初始化搜索条
    initSearchBar_7ree();
    
    // 不再需要测试按钮
    // createTestButton_7ree();
    // createNotificationTestButton_7ree();
    
    // 不再需要搜索按钮的点击事件处理（标题栏搜索按钮通过扩展命令处理）
    
    // 修改：手动保存按钮点击事件，调用 saveCurrentContent
    if (manualSaveButton) {
        manualSaveButton.addEventListener('click', () => {
            console.log('手动保存按钮点击');
            saveCurrentContent(false); // false表示不是因为切换标签触发的
            
            // 手动保存成功提示
            showStatusMessage('文件手动保存成功');
            
            // 添加保存成功视觉反馈
            manualSaveButton.classList.add('save-success_7ree');
            setTimeout(() => {
                manualSaveButton.classList.remove('save-success_7ree');
            }, 1000); // 1秒后移除样式
        });
    }
    
    // 添加全局键盘事件，监听Ctrl+S快捷键
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault(); // 阻止默认的浏览器保存行为
            console.log('检测到Ctrl+S快捷键');
            saveCurrentContent(false);
            
            // 手动保存成功提示
            showStatusMessage('文件手动保存成功');
            
            // 添加保存成功视觉反馈
            const manualSaveButton = document.getElementById('manual_save_button_7ree');
            if (manualSaveButton) {
                manualSaveButton.classList.add('save-success_7ree');
                setTimeout(() => {
                    manualSaveButton.classList.remove('save-success_7ree');
                }, 1000); // 1秒后移除样式
            }
        }
    });
    
    // 新增：全局点击事件处理 - 点击下拉菜单外部时关闭菜单
    document.addEventListener('click', (event) => {
        // @ts-ignore
        if (actionsDropdown_7ree && typeof actionsDropdown_7ree === 'object' && actionsDropdown_7ree.style && actionsDropdown_7ree.style.display === 'block') {
            const target = event.target;
            if (target instanceof Element) {
                if (!(target.closest('#actions_dropdown_7ree') || target.closest('#more_actions_button_7ree'))) {
                    // @ts-ignore
                    actionsDropdown_7ree.style.display = 'none';
                    console.log('点击外部区域，关闭下拉菜单');
                }
            }
        }
    });
    
    function postMessageToExtension(command, data = {}) {
        vscode.postMessage({ command, ...data });
    }
    
    // 新增：监听visibilitychange事件，在webview不可见时保存滚动位置
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            console.log('Webview即将不可见，立即保存滚动位置');
            saveScrollPosition();
        }
    });
    
    // 新增： 初始化 Monaco 编辑器
    function initMonacoEditor_7ree() {
        // @ts-ignore 因为 require.config 是 AMD API，在标准 TS lib 中可能未定义
        if (typeof require !== 'undefined' && typeof require.config === 'function') {
             // @ts-ignore
            require.config({ paths: { 'vs': window.RESOURCES_BASE_URI_7ree.replace('resources', 'node_modules/monaco-editor/min/vs') } });
        } else {
            console.error("RequireJS or similar loader not found or not configured.");
            return;
        }
        
        // @ts-ignore
        require(['vs/editor/editor.main'], function(monacoInstance) { // 显式接收 monacoInstance
            // @ts-ignore
            const actualMonaco = monacoInstance || monaco; // 优先使用回调的，否则用全局的（如果已存在）
            if (!actualMonaco) {
                console.error("Monaco Editor main module did not load correctly.");
                return;
            }

            // 获取VSCode默认值与自定义值
            const isDarkTheme = document.body.classList.contains('vscode-dark');
            
            // 从VSCode CSS变量中获取字体和颜色
            const vscodeFontFamily = getComputedStyle(document.body).getPropertyValue('--vscode-editor-font-family').trim();
            const vscodeFontSize = getComputedStyle(document.body).getPropertyValue('--vscode-editor-font-size').trim();
            const vscodeTextColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-foreground').trim();
            const vscodeBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();
            const vscodeSelectionBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-selectionBackground').trim();
            
            // 使用UI设置或VSCode默认值
            const fontFamily = currentUiSettings_7ree.fontFamily || vscodeFontFamily || 'var(--vscode-editor-font-family)';
            const fontSize = currentUiSettings_7ree.fontSize ? 
                parseInt(currentUiSettings_7ree.fontSize.replace('px', ''), 10) : 
                (vscodeFontSize ? parseInt(vscodeFontSize.replace('px', ''), 10) : 14);
            const bgColor = currentUiSettings_7ree.backgroundColor || vscodeBgColor || (isDarkTheme ? '#1e1e1e' : '#ffffff');
            const textColor = currentUiSettings_7ree.color || vscodeTextColor || (isDarkTheme ? '#d4d4d4' : '#000000');
            const selectionBgColor = currentUiSettings_7ree.selectionBackground || vscodeSelectionBgColor || (isDarkTheme ? '#264f78' : '#add6ff');
            
            console.log(`使用的编辑器设置: 字体="${fontFamily}", 字号=${fontSize}, 文本颜色=${textColor}, 背景色=${bgColor}, 选中背景色=${selectionBgColor}`);
            
            const editorContainer = document.getElementById('monaco_editor_container_7ree');
            if (!editorContainer) {
                console.error("Monaco editor container not found!");
                return;
            }

            editor_7ree = actualMonaco.editor.create(editorContainer, {
                value: '',
                language: 'plaintext',
                lineNumbers: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                theme: isDarkTheme ? 'vs-dark' : 'vs',
                fontSize: fontSize,
                fontFamily: fontFamily,
                automaticLayout: true, // 自动布局适应容器大小变化
                // 禁用模糊Unicode字符的警告提示
                unicodeHighlight: {
                    ambiguousCharacters: false,
                    invisibleCharacters: false,
                    nonBasicASCII: false
                }
            });
            
            // 设置自定义样式
            applyEditorCustomStyles({
                backgroundColor: bgColor,
                color: textColor,
                selectionBackground: selectionBgColor
            });
            
            // 监听编辑器内容变化
            editor_7ree.onDidChangeModelContent(() => {
                if (isSettingContent_7ree) return;
                lastEditTime_7ree = Date.now();
                if (saveTimeout) clearTimeout(saveTimeout);
                const autoSaveInterval = (currentUiSettings_7ree.autoSaveInterval || 10) * 1000;
                saveTimeout = setTimeout(() => {
                    console.log('文本输入超时，自动保存内容和滚动位置');
                    saveCurrentContent(false);
                }, autoSaveInterval);
            });
            
            // 监听编辑器滚动事件
            editor_7ree.onDidScrollChange(() => {
                // 滚动时保存位置
                if (scrollSaveTimeout_7ree) {
                    clearTimeout(scrollSaveTimeout_7ree);
                }
                
                scrollSaveTimeout_7ree = setTimeout(() => {
                    saveScrollPosition();
                }, 1000); // 滚动停止1秒后保存位置
            });
            
            // 监听编辑器失去焦点事件，自动保存内容
            editor_7ree.onDidBlurEditorWidget(() => {
                console.log('编辑器失去焦点，自动保存内容');
                saveCurrentContent(false);
            });
            
            // 监听编辑器主题变化
            window.addEventListener('message', function(event) {
                const message = event.data;
                if (message && message.type === 'vscode-theme-changed') {
                    // 更新编辑器主题
                    const isDark = document.body.classList.contains('vscode-dark');
                    actualMonaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
                    
                    // 同时更新编辑器的颜色和背景色
                    const newVscodeBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();
                    const newVscodeTextColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-foreground').trim();
                    const newSelectionBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-selectionBackground').trim();
                    
                    // 只有在用户设置为空时，才使用VSCode的值
                    if (!currentUiSettings_7ree.backgroundColor) {
                        applyEditorCustomStyles({
                            backgroundColor: newVscodeBgColor || (isDark ? '#1e1e1e' : '#ffffff'),
                            color: !currentUiSettings_7ree.color ? (newVscodeTextColor || (isDark ? '#d4d4d4' : '#000000')) : undefined,
                            selectionBackground: !currentUiSettings_7ree.selectionBackground ? (newSelectionBgColor || (isDark ? '#264f78' : '#add6ff')) : undefined
                        });
                    }
                }
            });
            
            // 标记编辑器已初始化
            isInitialized_7ree = true;
            
            // 编辑器准备就绪，发送消息到扩展
            console.log('Monaco编辑器初始化完成');
    postMessageToExtension('webviewReady');
        });
    }
    
    // 修改：应用编辑器自定义样式（背景色和文字颜色）
    function applyEditorCustomStyles(options) {
        if (!editor_7ree) return;
        
        const isDarkTheme = document.body.classList.contains('vscode-dark');
        
        // 如果选项为空，尝试从VSCode CSS变量获取
        const vscodeBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();
        const vscodeTextColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-foreground').trim();
        const vscodeSelectionBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-selectionBackground').trim();
        
        // 应用优先级：传入的选项 > 当前UI设置 > VSCode变量 > 默认硬编码值
        const bgColor = options.backgroundColor || currentUiSettings_7ree.backgroundColor || vscodeBgColor || (isDarkTheme ? '#1e1e1e' : '#ffffff');
        const textColor = options.color || currentUiSettings_7ree.color || vscodeTextColor || (isDarkTheme ? '#d4d4d4' : '#000000');
        const selectionBgColor = options.selectionBackground || currentUiSettings_7ree.selectionBackground || vscodeSelectionBgColor || (isDarkTheme ? '#264f78' : '#add6ff');
        
        // 创建或获取自定义样式元素
        let styleElement = document.getElementById('monaco-custom-styles_7ree');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'monaco-custom-styles_7ree';
            document.head.appendChild(styleElement);
        }
        
        // 设置自定义样式覆盖Monaco编辑器的背景色和文字颜色
        styleElement.textContent = `
            /* 编辑器背景色 */
            .monaco-editor, 
            .monaco-editor .monaco-editor-background, 
            .monaco-editor-background,
            .monaco-editor .margin,
            .monaco-editor .margin-view-overlays {
                background-color: ${bgColor} !important;
            }
            .monaco-editor-container_7ree {
                background-color: ${bgColor} !important;
            }
            
            /* 文字颜色 */
            .monaco-editor .lines-content,
            .monaco-editor .view-line span,
            .monaco-editor .view-lines {
                color: ${textColor} !important;
            }
            
            /* 选中文本背景色 */
            .monaco-editor .selected-text {
                background-color: ${selectionBgColor} !important;
            }
            
            /* 确保行号边栏背景色 */
            .monaco-editor .margin-view-overlays .line-numbers {
                background-color: ${bgColor} !important;
            }
        `;
        
        console.log(`应用编辑器自定义样式: 背景色=${bgColor}, 文字颜色=${textColor}, 选中背景色=${selectionBgColor}`);
    }
    
    // 修改：保存当前内容
    function saveCurrentContent(switchingTabs = false) {
        if (!editor_7ree || !isInitialized_7ree) {
            console.warn('保存内容: 编辑器未初始化或实例不存在');
            return;
        }
        
        const content = editor_7ree.getValue();
        
        // 如果内容没有变化且不是切换标签，则不需要保存
        if (content === lastSavedContent && !switchingTabs) {
            console.log('内容未变更，跳过保存');
            return;
        }
        
        lastSavedContent = content; // 更新上次保存内容，防止重复触发
        
        if (saveTimeout) { // 如果有因文本输入设置的延迟保存，则清除，因为现在要立即保存
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }
        
        // 如果是切换标签，先保存当前的视图状态
        if (switchingTabs) {
            console.log('切换标签前保存当前视图状态');
            const state = saveScrollPosition();
            if (state) {
                const firstLine = state.viewState.firstPosition?.lineNumber || 1;
                console.log(`已保存视图状态，首行: ${firstLine}`);
            }
        }
        
        console.log(`saveCurrentContent: FileID: ${currentOpenFileId_7ree}, switchingTabs: ${switchingTabs}`);
        
        postMessageToExtension('saveNotes', { 
            fileId: currentOpenFileId_7ree, 
            text: content,
            switchingTabs: switchingTabs
        });
    }

    // 同步滚动位置
    function syncScroll() {
        if (!editor_7ree) return;
        
        // 获取编辑器当前可见范围
        const visibleRanges = editor_7ree.getVisibleRanges();
        if (visibleRanges.length > 0) {
            const topVisibleLine = visibleRanges[0].startLineNumber;
            // 使用编辑器的reveal方法重新定位到当前行
            editor_7ree.revealLine(topVisibleLine);
        }
    }

    // 注册vscode消息处理程序
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.command) {
            case 'loadNotes':
                // 接收并显示笔记内容
                if (editor_7ree) {
                    const text = message.text || '';
                    isSettingContent_7ree = true; // 标记开始设置内容
                    editor_7ree.setValue(text);
                    isSettingContent_7ree = false; // 标记结束设置内容
                    lastSavedContent = text;
                    
                    if (message.viewState) {
                        console.log(`loadNotes: 使用保存的视图状态恢复编辑器位置`);
                        restoreEditorPosition(message); // 使用恢复逻辑
                    } else {
                         // 如果没有视图状态，则尝试恢复上次的位置或滚动到顶部
                        restoreEditorPosition(message); 
                    }
                    setupFileChangeDetection(); // 设置文件变更检测
                }
                
                // 显示文件名和状态
                if (statusTextElement) {
                    statusTextElement.textContent = `加载成功: ${new Date().toLocaleTimeString()}`;
                }
                
                // 处理文件列表和活动文件ID
                currentOpenFileId_7ree = message.fileId || 'default_notes_7ree';
                console.log(`接收loadNotes命令，当前文件ID: ${currentOpenFileId_7ree}`);
                
                // 应用UI设置，如果有的话
                if (message.settings) {
                    console.log('接收UI设置:', message.settings);
                    // 只更新有效值，保留空值表示继承VSCode设置
                    if (message.settings.fontFamily !== undefined) currentUiSettings_7ree.fontFamily = message.settings.fontFamily;
                    if (message.settings.fontSize !== undefined) currentUiSettings_7ree.fontSize = message.settings.fontSize;
                    if (message.settings.color !== undefined) currentUiSettings_7ree.color = message.settings.color;
                    if (message.settings.backgroundColor !== undefined) currentUiSettings_7ree.backgroundColor = message.settings.backgroundColor;
                    if (message.settings.selectionBackground !== undefined) currentUiSettings_7ree.selectionBackground = message.settings.selectionBackground;
                    if (message.settings.autoSaveInterval !== undefined) currentUiSettings_7ree.autoSaveInterval = message.settings.autoSaveInterval;
                    
                    // 应用样式
                    if (editor_7ree) {
                        // 从VSCode CSS变量获取默认值
                        const vscodeFontFamily = getComputedStyle(document.body).getPropertyValue('--vscode-editor-font-family').trim();
                        const vscodeFontSize = getComputedStyle(document.body).getPropertyValue('--vscode-editor-font-size').trim();
                        
                        // 应用字体和字号
                        const fontFamily = currentUiSettings_7ree.fontFamily || vscodeFontFamily || 'var(--vscode-editor-font-family)';
                        const fontSize = currentUiSettings_7ree.fontSize ? 
                            parseInt(currentUiSettings_7ree.fontSize.replace('px', ''), 10) : 
                            (vscodeFontSize ? parseInt(vscodeFontSize.replace('px', ''), 10) : 14);
                        
                        editor_7ree.updateOptions({ 
                            fontFamily: fontFamily,
                            fontSize: fontSize
                        });
                        
                        // 应用背景色和文字颜色
                        applyEditorCustomStyles({
                            backgroundColor: currentUiSettings_7ree.backgroundColor,
                            color: currentUiSettings_7ree.color,
                            selectionBackground: currentUiSettings_7ree.selectionBackground
                        });
                    }
                }
                
                // 渲染标签页
                if (message.files && message.files.length > 0) {
                    renderTabs(message.files, currentOpenFileId_7ree);
                }
                break;
                
            case 'updateStatus':
                // 更新状态信息
                if (statusTextElement && message.status) {
            statusTextElement.textContent = message.status;
                }
                break;
                
            case 'fileCheckResult':
                // 处理文件检查结果
                if (message.fileId === currentOpenFileId_7ree) {
                    if (message.changed) {
                        handleExternalFileUpdate(message.fileId, message.newContent);
                    } else if (message.error) {
                        console.warn(`文件检查错误: ${message.error}`);
                    }
                }
                break;
                
            case 'openFileResult':
                // 处理打开文件结果
                if (!message.success && message.error) {
                    showErrorMessage_7ree(message.error, "打开文件失败");
                }
                break;
            
            case 'loadUISettings_7ree':
                // 接收UI设置
                if (message.settings) {
                    console.log('接收UI设置:', message.settings);
                    currentUiSettings_7ree = { ...message.settings };
                    if (editor_7ree) {
                        // 应用字体和字号
                        if (currentUiSettings_7ree.fontFamily) editor_7ree.updateOptions({ fontFamily: currentUiSettings_7ree.fontFamily });
                        if (currentUiSettings_7ree.fontSize) editor_7ree.updateOptions({ fontSize: currentUiSettings_7ree.fontSize });
                        
                        // 应用背景色和文字颜色
                        applyEditorCustomStyles({
                            backgroundColor: currentUiSettings_7ree.backgroundColor,
                            color: currentUiSettings_7ree.color
                        });
                    }
                }
                break;
                
            case 'showError':
                // 新增：处理显示错误消息
                showErrorMessage_7ree(message.message, message.title || "提示", message.buttonText || "确定");
                break;
                
            case 'showErrorWithAction':
                // 新增：处理显示带操作的错误消息
                showErrorMessageWithAction_7ree(message.message, message.title || "提示", message.actionId);
                break;

            case 'openSettings':
                // 收到打开设置对话框的消息
                console.log('收到打开设置对话框的消息');
                openSettingsDialog_7ree();
                break;
            
            case 'openSearch':
                // 收到打开搜索对话框的消息
                console.log('收到打开搜索条的消息');
                openSearchBar_7ree();
                break;
        }
    });

    // 新增：创建标签关闭确认对话框
    function createCloseConfirmDialog_7ree() {
        // 如果已存在对话框，则先移除
        let existingDialog = document.getElementById('close_confirm_dialog_7ree');
        if (existingDialog) {
            document.body.removeChild(existingDialog);
        }
        
        // 创建对话框容器
        const dialogContainer = document.createElement('div');
        dialogContainer.id = 'close_confirm_dialog_7ree';
        dialogContainer.className = 'settings-dialog_7ree'; // 使用settings-dialog样式
        
        // 获取当前主题
        const isDarkTheme = document.body.classList.contains('vscode-dark') || 
                           !document.body.classList.contains('vscode-light');
        const themeFolder_7ree = isDarkTheme ? 'dark' : 'light';
        const SvgResourcesBaseUri_7ree = window.RESOURCES_BASE_URI_7ree || '';
        
        // 创建对话框内容，与settings-dialog保持一致的结构
        dialogContainer.innerHTML = `
            <div class="settings-dialog-content_7ree">
                <h3>关闭确认</h3>
                <p id="close_confirm_message_7ree">确定要关闭此标签吗？</p>
                <div class="settings-dialog-buttons_7ree">
                    <button id="close_cancel_btn_7ree">取消</button>
                    <button id="close_confirm_btn_7ree" class="primary-button_7ree">确定</button>
                </div>
                <div class="rename-dialog-shortcuts_7ree">
                    <span class="key-text_7ree">
                        <img src="${SvgResourcesBaseUri_7ree}/icons/${themeFolder_7ree}/esc-key.svg" class="key-icon_7ree" alt="ESC"> 取消 &nbsp;&nbsp;&nbsp;&nbsp; 
                        <img src="${SvgResourcesBaseUri_7ree}/icons/${themeFolder_7ree}/enter-key.svg" class="key-icon_7ree" alt="回车"> 确认
                    </span>
                </div>
            </div>
        `;
        
        // 添加到body
        document.body.appendChild(dialogContainer);
        
        // 获取按钮元素
        const confirmBtn = document.getElementById('close_confirm_btn_7ree');
        const cancelBtn = document.getElementById('close_cancel_btn_7ree');
        
        // 确认关闭
        const confirmClose = () => {
            console.log(`确认关闭标签: ${currentOpenFileId_7ree}`);
            postMessageToExtension('closeTab', { fileId: currentOpenFileId_7ree });
            closeCloseConfirmDialog_7ree();
        };
        
        // 添加确认按钮事件
        if (confirmBtn) {
            confirmBtn.onclick = confirmClose;
        }
        
        // 添加取消按钮事件
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                closeCloseConfirmDialog_7ree();
            };
        }
        
        // 添加键盘事件处理，使用捕获阶段保证无论焦点在哪里都能响应
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmClose();
                return false;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeCloseConfirmDialog_7ree();
                return false;
            }
        };
        
        // 为文档添加键盘事件监听，使用捕获模式
        document.addEventListener('keydown', keyHandler, true);
        
        // @ts-ignore
        dialogContainer._keyHandler = keyHandler;
        
        // 显示对话框
        dialogContainer.style.display = 'flex'; // 使用与settings-dialog相同的显示方式
        
        return dialogContainer;
    }

    // 新增：打开关闭标签确认对话框
    function openCloseConfirmDialog_7ree(fileId, fileName) {
        let fileToClose_7ree = fileId; // 存储要关闭的文件ID
        
        // 创建对话框
        const dialog = createCloseConfirmDialog_7ree();
        
        // 设置消息
        const messageElement = document.getElementById('close_confirm_message_7ree');
        if (messageElement) {
            messageElement.textContent = `确定要关闭 "${fileName}" 标签吗？`;
        }
        
        // 获取按钮元素
        const confirmBtn = document.getElementById('close_confirm_btn_7ree');
        const cancelBtn = document.getElementById('close_cancel_btn_7ree');
        
        // 确认关闭
        const confirmClose = () => {
            console.log(`确认关闭标签: ${fileToClose_7ree}`);
            postMessageToExtension('closeTab', { fileId: fileToClose_7ree });
            closeCloseConfirmDialog_7ree();
        };
        
        // 添加确认按钮事件
        if (confirmBtn) {
            confirmBtn.onclick = confirmClose;
        }
        
        // 添加取消按钮事件
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                closeCloseConfirmDialog_7ree();
            };
        }
        
        // 添加键盘事件处理，使用捕获阶段保证无论焦点在哪里都能响应
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmClose();
                return false;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeCloseConfirmDialog_7ree();
                return false;
            }
        };
        
        // 为文档添加键盘事件监听，使用捕获模式
        document.addEventListener('keydown', keyHandler, true);
        
        // @ts-ignore
        dialog._keyHandler = keyHandler;
        
        // 显示对话框
        dialog.style.display = 'flex'; // 使用与settings-dialog相同的显示方式
    }

    // 新增：关闭确认对话框
    function closeCloseConfirmDialog_7ree() {
        const dialog = document.getElementById('close_confirm_dialog_7ree');
        if (dialog) {
            // @ts-ignore
            if (dialog._keyHandler) {
                // @ts-ignore
                document.removeEventListener('keydown', dialog._keyHandler, true);
                // @ts-ignore
                dialog._keyHandler = null;
            }
            
            dialog.style.display = 'none'; // 使用与settings-dialog相同的隐藏方式
            
            // 可选：延迟后移除DOM元素，确保动画完成
            setTimeout(() => {
                if (dialog.parentNode) {
                    dialog.parentNode.removeChild(dialog);
                }
            }, 300);
        }
    }

    // 渲染文件标签
    function renderTabs(files, activeFileId) {
        const fileTabsContainer = document.getElementById('file_tabs_container_7ree');
        if (!fileTabsContainer) return;

        fileTabsContainer.innerHTML = ''; 
        currentOpenFileId_7ree = activeFileId;

        files.forEach(file => {
            const tab = document.createElement('div');
            tab.className = 'file-tab_7ree';
            if (file.id === activeFileId) {
                tab.classList.add('active_7ree');
            }
            tab.dataset.fileId = file.id;
            
            if (file.id !== 'default_notes_7ree') {
                tab.draggable = true;
                tab.classList.add('draggable_7ree');
            }
            
            tab.onclick = function(e) {
                if (e.target instanceof Element && !e.target.classList.contains('tab-close_7ree')) {
                    if (file.id === currentOpenFileId_7ree) return;
                    
                    // 如果搜索框正在显示，则关闭它
                    if (searchBar_7ree && searchBar_7ree.style.display === 'block') {
                        hideSearchBar_7ree();
                        console.log('切换标签时关闭搜索框');
                    }
                    
                    // 首先确保保存当前的视图状态
                    saveCurrentScrollPositionAndAnchor_7ree();
                    
                    // 然后保存内容
                    saveCurrentContent(true); 
                    
                    // 最后通知扩展切换文件
                    console.log(`点击标签，切换到文件: ${file.id}，已保存当前视图状态`);
                    vscode.postMessage({ command: 'switchFile', fileId: file.id });
                }
            };

            tab.ondblclick = function(e) {
                if (e.target instanceof Element && !e.target.classList.contains('tab-close_7ree')) {
                    e.stopPropagation(); 
                    const displayName = file.id === 'default_notes_7ree' 
                        ? file.name 
                        : file.name.replace(/\.[^/.]+$/, '');
                    openRenameDialog_7ree(file.id, displayName);
                }
            };
            
            if (file.id !== 'default_notes_7ree') {
                tab.addEventListener('dragstart', (e) => {
                    draggedTab_7ree = file.id;
                    setTimeout(() => { tab.classList.add('dragging_7ree'); }, 0);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', file.id);
                });
                
                tab.addEventListener('dragend', () => {
                    tab.classList.remove('dragging_7ree');
                    draggedTab_7ree = null;
                    document.querySelectorAll('.file-tab_7ree').forEach(t => {
                        t.classList.remove('drag-over_7ree', 'drag-over-left_7ree', 'drag-over-right_7ree');
                    });
                });
            }
            
            tab.addEventListener('dragover', (e) => {
                e.preventDefault(); 
                if (draggedTab_7ree === null || draggedTab_7ree === file.id || file.id === 'default_notes_7ree') return;
                const rect = tab.getBoundingClientRect();
                const mouseX = e.clientX;
                const tabMiddleX = rect.left + rect.width / 2;
                if (mouseX < tabMiddleX) {
                    tab.classList.add('drag-over-left_7ree');
                    tab.classList.remove('drag-over-right_7ree');
                } else {
                    tab.classList.add('drag-over-right_7ree');
                    tab.classList.remove('drag-over-left_7ree');
                }
                dragTargetTab_7ree = file.id;
            });
            
            tab.addEventListener('dragenter', (e) => {
                e.preventDefault();
                if (draggedTab_7ree === null || draggedTab_7ree === file.id || file.id === 'default_notes_7ree') return;
                tab.classList.add('drag-over_7ree');
            });
            
            tab.addEventListener('dragleave', () => {
                tab.classList.remove('drag-over_7ree', 'drag-over-left_7ree', 'drag-over-right_7ree');
                if (dragTargetTab_7ree === file.id) dragTargetTab_7ree = null;
            });
            
            tab.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedTab_7ree === null || draggedTab_7ree === file.id || file.id === 'default_notes_7ree') {
                    tab.classList.remove('drag-over_7ree', 'drag-over-left_7ree', 'drag-over-right_7ree');
                    return;
                }
                const rect = tab.getBoundingClientRect();
                const mouseX = e.clientX;
                const tabMiddleX = rect.left + rect.width / 2;
                const position = mouseX < tabMiddleX ? 'before' : 'after';
                vscode.postMessage({
                    command: 'reorderTabs',
                    draggedId: draggedTab_7ree,
                    targetId: file.id,
                    position: position
                });
                tab.classList.remove('drag-over_7ree', 'drag-over-left_7ree', 'drag-over-right_7ree');
            });

            const nameSpan = document.createElement('span');
            const displayName = file.id === 'default_notes_7ree' 
                ? file.name 
                : file.name.replace(/\.[^/.]+$/, '');
            nameSpan.textContent = displayName;
            nameSpan.className = 'tab-name_7ree';
            tab.appendChild(nameSpan);

            if (file.id !== 'default_notes_7ree') {
                const closeBtn = document.createElement('span');
                closeBtn.className = 'tab-close_7ree';
                closeBtn.innerHTML = '×';
                closeBtn.title = '关闭';
                closeBtn.onclick = function(e) {
                    e.stopPropagation();
                    openCloseConfirmDialog_7ree(file.id, displayName);
                    return false;
                };
                tab.appendChild(closeBtn);
            }
            fileTabsContainer.appendChild(tab);
        });
        
        if (fileTabsContainer && moreActionsButton_7ree && moreActionsButton_7ree.parentElement === fileTabsContainer) {
             fileTabsContainer.removeChild(moreActionsButton_7ree);
        }
        if (fileTabsContainer && moreActionsButton_7ree) {
            fileTabsContainer.appendChild(moreActionsButton_7ree);
        } else if (fileTabsContainer && !moreActionsButton_7ree) {
            createMoreActionsButton_7ree();
        }

        const activeTabElement = fileTabsContainer.querySelector(`.file-tab_7ree[data-file-id="${activeFileId}"]`);
        if (activeTabElement) {
            activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }

    // 新增：创建错误提示对话框
    function createErrorDialog_7ree(errorMessage, title = "提示", buttonText = "确定") {
        // 如果已存在对话框，则先移除
        let existingDialog = document.getElementById('error_dialog_7ree');
        if (existingDialog) {
            document.body.removeChild(existingDialog);
        }
        
        // 创建对话框容器
        const dialogContainer = document.createElement('div');
        dialogContainer.id = 'error_dialog_7ree';
        dialogContainer.className = 'settings-dialog_7ree'; // 使用与设置对话框相同的样式
        
        // 获取当前主题
        const isDarkTheme = document.body.classList.contains('vscode-dark') || 
                           !document.body.classList.contains('vscode-light');
        const themeFolder_7ree = isDarkTheme ? 'dark' : 'light';
        const SvgResourcesBaseUri_7ree = window.RESOURCES_BASE_URI_7ree || '';
        
        // 创建对话框内容
        dialogContainer.innerHTML = `
            <div class="settings-dialog-content_7ree">
                <h3>${title}</h3>
                <p id="error_message_7ree">${errorMessage}</p>
                <div class="settings-dialog-buttons_7ree">
                    <button id="error_confirm_btn_7ree" class="primary-button_7ree">${buttonText}</button>
                </div>
                <div class="rename-dialog-shortcuts_7ree">
                    <span class="key-text_7ree">
                        <img src="${SvgResourcesBaseUri_7ree}/icons/${themeFolder_7ree}/esc-key.svg" class="key-icon_7ree" alt="ESC"> 关闭
                    </span>
                </div>
            </div>
        `;
        
        // 添加到body
        document.body.appendChild(dialogContainer);
        
        // 获取按钮元素
        const confirmBtn = document.getElementById('error_confirm_btn_7ree');
        
        // 关闭对话框的函数
        const closeDialog = () => {
            closeErrorDialog_7ree();
        };
        
        // 添加确认按钮事件
        if (confirmBtn) {
            confirmBtn.onclick = closeDialog;
        }
        
        // 添加键盘事件处理，使用捕获阶段保证无论焦点在哪里都能响应
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeDialog();
                return false;
            }
        };
        
        // 为文档添加键盘事件监听，使用捕获模式
        document.addEventListener('keydown', keyHandler, true);
        
        // @ts-ignore
        dialogContainer._keyHandler = keyHandler;
        
        // 显示对话框
        dialogContainer.style.display = 'flex';
        
        return dialogContainer;
    }

    // 新增：创建带操作的错误提示对话框
    function createErrorDialogWithAction_7ree(errorMessage, title = "提示", actionId = null) {
        // 如果已存在对话框，则先移除
        let existingDialog = document.getElementById('error_dialog_7ree');
        if (existingDialog) {
            document.body.removeChild(existingDialog);
        }
        
        // 创建对话框容器
        const dialogContainer = document.createElement('div');
        dialogContainer.id = 'error_dialog_7ree';
        dialogContainer.className = 'settings-dialog_7ree'; // 使用与设置对话框相同的样式
        
        // 获取当前主题
        const isDarkTheme = document.body.classList.contains('vscode-dark') || 
                           !document.body.classList.contains('vscode-light');
        const themeFolder_7ree = isDarkTheme ? 'dark' : 'light';
        const SvgResourcesBaseUri_7ree = window.RESOURCES_BASE_URI_7ree || '';
        
        // 创建对话框内容
        dialogContainer.innerHTML = `
            <div class="settings-dialog-content_7ree">
                <h3>${title}</h3>
                <p id="error_message_7ree">${errorMessage}</p>
                <div class="settings-dialog-buttons_7ree">
                    <button id="error_confirm_btn_7ree" class="primary-button_7ree">打开文件</button>
                </div>
                <div class="rename-dialog-shortcuts_7ree">
                    <span class="key-text_7ree">
                        <img src="${SvgResourcesBaseUri_7ree}/icons/${themeFolder_7ree}/esc-key.svg" class="key-icon_7ree" alt="ESC"> 关闭
                    </span>
                </div>
            </div>
        `;
        
        // 添加到body
        document.body.appendChild(dialogContainer);
        
        // 获取按钮元素
        const confirmBtn = document.getElementById('error_confirm_btn_7ree');
        
        // 关闭对话框并触发回调
        const closeDialog = (triggerAction = false) => {
            if (triggerAction && actionId) {
                console.log(`触发操作: ${actionId}`);
                vscode.postMessage({ 
                    command: 'errorDialogAction',
                    actionId: actionId
                });
            }
            closeErrorDialog_7ree();
        };
        
        // 添加确认按钮事件
        if (confirmBtn) {
            confirmBtn.onclick = () => closeDialog(true);
        }
        
        // 添加键盘事件处理，使用捕获阶段保证无论焦点在哪里都能响应
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeDialog(false);
                return false;
            } else if (e.key === 'Enter') {
                e.preventDefault();
                closeDialog(true);
                return false;
            }
        };
        
        // 为文档添加键盘事件监听，使用捕获模式
        document.addEventListener('keydown', keyHandler, true);
        
        // @ts-ignore
        dialogContainer._keyHandler = keyHandler;
        
        // 显示对话框
        dialogContainer.style.display = 'flex';
        
        return dialogContainer;
    }

    // 新增：关闭错误提示对话框
    function closeErrorDialog_7ree() {
        const dialog = document.getElementById('error_dialog_7ree');
        if (dialog) {
            // @ts-ignore
            if (dialog._keyHandler) {
                // @ts-ignore
                document.removeEventListener('keydown', dialog._keyHandler, true);
                // @ts-ignore
                dialog._keyHandler = null;
            }
            
            dialog.style.display = 'none';
            
            // 延迟后移除DOM元素
            setTimeout(() => {
                if (dialog.parentNode) {
                    dialog.parentNode.removeChild(dialog);
                }
            }, 300);
        }
    }

    // 新增：显示错误提示
    function showErrorMessage_7ree(message, title = "操作失败", buttonText = "确定") {
        return createErrorDialog_7ree(message, title, buttonText);
    }

    // 新增：显示带操作的错误提示
    function showErrorMessageWithAction_7ree(message, title = "操作失败", actionId = null) {
        return createErrorDialogWithAction_7ree(message, title, actionId);
    }

    // 新增：创建"更多操作"按钮和下拉菜单
    function createMoreActionsButton_7ree() {
        // 这个函数将不再创建三点菜单
        // 但为了防止其他地方调用出错，保留为空函数
        return;
    }

    // 新增：打开重命名对话框
    function openRenameDialog_7ree(fileId, currentName) {
        renamingTabId_7ree = fileId;
        
        // 创建对话框
        const dialog = createRenameDialog_7ree();
        
        // 设置当前名称
        /** @type {HTMLInputElement | null} */
        const renameInput = document.getElementById('rename_input_7ree');
        if (renameInput) {
            renameInput.value = currentName;
            // 全选文本以便用户直接输入
            renameInput.select();
        }
        
        // 添加键盘事件处理，使用捕获阶段保证无论焦点在哪里都能响应
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmRename_7ree();
                return false;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeRenameDialog_7ree();
                return false;
            }
        };
        
        // 为文档添加键盘事件监听，使用捕获模式
        document.addEventListener('keydown', keyHandler, true);
        
        // @ts-ignore
        dialog._keyHandler = keyHandler;
        
        // 显示对话框
        dialog.classList.add('visible_7ree');
    }
    
    // 新增：关闭重命名对话框
    function closeRenameDialog_7ree() {
        try {
            console.log('开始关闭重命名对话框');
        const dialog = document.getElementById('rename_dialog_7ree');
            if (!dialog) {
                console.log('对话框元素不存在，无需关闭');
                return;
            }
            
            // 先移除键盘事件监听器（如果存在）
            if (dialog._keyHandler) {
                try {
                document.removeEventListener('keydown', dialog._keyHandler, true);
                dialog._keyHandler = null;
                    console.log('键盘事件监听器已移除');
                } catch (err) {
                    console.error('移除键盘监听器失败:', err);
                }
            }
            
            // 移除可见性样式类
            try {
            dialog.classList.remove('visible_7ree');
                console.log('对话框可见性已关闭');
            } catch (err) {
                console.error('移除可见性样式类失败:', err);
            }
            
            // 延迟从DOM中移除元素
            setTimeout(() => {
                try {
                    if (dialog && dialog.parentNode) {
                    dialog.parentNode.removeChild(dialog);
                        console.log('对话框从DOM中移除完成');
                    }
                } catch (removeErr) {
                    console.error('从DOM移除对话框失败:', removeErr);
                    
                    // 如果移除失败，尝试隐藏它
                    try {
                        dialog.style.display = 'none';
                        console.log('无法移除对话框，已设为不可见');
                    } catch (hideErr) {
                        console.error('隐藏对话框也失败了:', hideErr);
                    }
                }
            }, 300); // 等待动画结束
            
            // 重置当前重命名的ID
            renamingTabId_7ree = null; 
            console.log('重命名标签ID已重置');
        } catch (err) {
            console.error('关闭对话框过程中发生未捕获的错误:', err);
            
            // 最后的挽救措施 - 直接尝试关闭所有可能的重命名对话框
            try {
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    dialog.style.display = 'none';
                    console.log('通过紧急措施隐藏了对话框');
                }
                renamingTabId_7ree = null;
            } catch (finalErr) {
                console.error('最终紧急措施也失败了:', finalErr);
            }
        }
    }
    
    // 新增：确认重命名的函数
    function confirmRename_7ree() {
        /** @type {HTMLInputElement | null} */
        const renameInput = document.getElementById('rename_input_7ree');
        if (renameInput && renamingTabId_7ree) {
            const newName = renameInput.value.trim();
            if (newName) {
                console.log(`重命名标签 ${renamingTabId_7ree} 为 ${newName}`);
                vscode.postMessage({ 
                    command: 'renameTab', 
                    fileId: renamingTabId_7ree, 
                    newName: newName 
                });
            }
        }
        closeRenameDialog_7ree();
    }

    // 新增：打开设置对话框
    function openSettingsDialog_7ree() {
        if (settingsDialog_7ree && settingsDialog_7ree.parentElement) {
            settingsDialog_7ree.parentElement.removeChild(settingsDialog_7ree); // 移除旧的，如果存在
        }

        settingsDialog_7ree = document.createElement('div');
        settingsDialog_7ree.id = 'settings_dialog_7ree';
        settingsDialog_7ree.className = 'settings-dialog_7ree'; // 用于CSS

        // 获取当前自动保存间隔或使用默认值10
        const autoSaveInterval = currentUiSettings_7ree.autoSaveInterval || 10;
        
        // 获取当前主题
        const isDarkTheme = document.body.classList.contains('vscode-dark') || 
                           !document.body.classList.contains('vscode-light');
        const themeFolder_7ree = isDarkTheme ? 'dark' : 'light';
        const SvgResourcesBaseUri_7ree = window.RESOURCES_BASE_URI_7ree || '';

        settingsDialog_7ree.innerHTML = `
            <div class="settings-dialog-content_7ree">
                <h3>参数设置</h3>
                <div>
                    <label for="font_family_input_7ree">字体:</label>
                    <input type="text" id="font_family_input_7ree" value="${currentUiSettings_7ree.fontFamily || ''}" placeholder="例如: 'Courier New', monospace">
                </div>
                <div>
                    <label for="font_size_input_7ree">字号:</label>
                    <input type="text" id="font_size_input_7ree" value="${currentUiSettings_7ree.fontSize || ''}" placeholder="例如: 14px, 1em">
                </div>
                <div>
                    <label for="text_color_input_7ree">颜色:</label>
                    <input type="text" id="text_color_input_7ree" value="${currentUiSettings_7ree.color || ''}" placeholder="例如: #RRGGBB, black">
                </div>
                <div>
                    <label for="background_color_input_7ree">背景色:</label>
                    <input type="text" id="background_color_input_7ree" value="${currentUiSettings_7ree.backgroundColor || ''}" placeholder="例如: #RRGGBB, white">
                </div>
                <div>
                    <label for="selection_background_input_7ree">选中背景色:</label>
                    <input type="text" id="selection_background_input_7ree" value="${currentUiSettings_7ree.selectionBackground || ''}" placeholder="例如: #RRGGBB, lightblue">
                </div>
                <div>
                    <label for="auto_save_interval_7ree">自动保存间隔:</label>
                    <select id="auto_save_interval_7ree">
                        <option value="3" ${autoSaveInterval == 3 ? 'selected' : ''}>3秒</option>
                        <option value="5" ${autoSaveInterval == 5 ? 'selected' : ''}>5秒</option>
                        <option value="8" ${autoSaveInterval == 8 ? 'selected' : ''}>8秒</option>
                        <option value="10" ${autoSaveInterval == 10 ? 'selected' : ''}>10秒</option>
                        <option value="15" ${autoSaveInterval == 15 ? 'selected' : ''}>15秒</option>
                        <option value="20" ${autoSaveInterval == 20 ? 'selected' : ''}>20秒</option>
                        <option value="30" ${autoSaveInterval == 30 ? 'selected' : ''}>30秒</option>
                        <option value="60" ${autoSaveInterval == 60 ? 'selected' : ''}>60秒</option>
                    </select>
                </div>
                <div class="settings-dialog-buttons_7ree">
                    <button id="settings_cancel_btn_7ree">取消</button>
                    <button id="settings_save_btn_7ree" class="primary-button_7ree">确定</button>
                </div>
                <div class="rename-dialog-shortcuts_7ree">
                    <span class="key-text_7ree">
                        <img src="${SvgResourcesBaseUri_7ree}/icons/${themeFolder_7ree}/esc-key.svg" class="key-icon_7ree" alt="ESC"> 取消 &nbsp;&nbsp;&nbsp;&nbsp; 
                        <img src="${SvgResourcesBaseUri_7ree}/icons/${themeFolder_7ree}/enter-key.svg" class="key-icon_7ree" alt="回车"> 确定
                    </span>
                </div>
            </div>
        `;
        document.body.appendChild(settingsDialog_7ree);

        // 保存设置功能
        const saveSettings = () => {
            const newSettings = {
                fontFamily: /** @type {HTMLInputElement} */ (document.getElementById('font_family_input_7ree')).value,
                fontSize: /** @type {HTMLInputElement} */ (document.getElementById('font_size_input_7ree')).value,
                color: /** @type {HTMLInputElement} */ (document.getElementById('text_color_input_7ree')).value,
                backgroundColor: /** @type {HTMLInputElement} */ (document.getElementById('background_color_input_7ree')).value,
                selectionBackground: /** @type {HTMLInputElement} */ (document.getElementById('selection_background_input_7ree')).value,
                autoSaveInterval: parseInt(/** @type {HTMLSelectElement} */ (document.getElementById('auto_save_interval_7ree')).value, 10)
            };
            applyAndSaveUISettings_7ree(newSettings);
            closeSettingsDialog_7ree();
        };

        // 绑定按钮点击事件
        document.getElementById('settings_save_btn_7ree').onclick = saveSettings;
        document.getElementById('settings_cancel_btn_7ree').onclick = closeSettingsDialog_7ree;
        
        // 添加键盘事件处理，使用捕获阶段保证无论焦点在哪里都能响应
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveSettings();
                return false;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeSettingsDialog_7ree();
                return false;
            }
        };
        
        // 为文档添加键盘事件监听，使用捕获模式
        document.addEventListener('keydown', keyHandler, true);
        
        // @ts-ignore
        if (settingsDialog_7ree) settingsDialog_7ree._keyHandler = keyHandler;
        
        // 设置第一个输入框获取焦点
        setTimeout(() => {
            document.getElementById('font_family_input_7ree').focus();
        }, 50);
        
        settingsDialog_7ree.style.display = 'flex'; // 显示弹窗
    }

    function closeSettingsDialog_7ree() {
        if (settingsDialog_7ree) {
            // @ts-ignore
            if (settingsDialog_7ree._keyHandler) {
                // @ts-ignore
                document.removeEventListener('keydown', settingsDialog_7ree._keyHandler, true);
                // @ts-ignore
                settingsDialog_7ree._keyHandler = null;
            }
            
            settingsDialog_7ree.style.display = 'none';
            // document.body.removeChild(settingsDialog_7ree); // 也可以选择移除DOM
            // settingsDialog_7ree = null;
        }
    }
    
    // 新增：应用并保存UI设置
    function applyAndSaveUISettings_7ree(settings) {
        currentUiSettings_7ree = { ...settings }; // 更新 WebView 内部状态

        if (editor_7ree) {
            // 应用字体和字号到编辑器
            if (settings.fontFamily) editor_7ree.updateOptions({ fontFamily: settings.fontFamily });
            if (settings.fontSize) editor_7ree.updateOptions({ fontSize: settings.fontSize });
            
            // 应用背景色、文字颜色和选中文本背景色
            applyEditorCustomStyles({
                backgroundColor: settings.backgroundColor,
                color: settings.color,
                selectionBackground: settings.selectionBackground
            });
            
            // 同时更新行号容器样式，保持一致
            const lineNumbersElement = document.getElementById('line_numbers_7ree');
            if (lineNumbersElement) {
                if (settings.fontFamily) lineNumbersElement.style.fontFamily = settings.fontFamily;
                if (settings.fontSize) lineNumbersElement.style.fontSize = settings.fontSize;
                // 不更改行号颜色，保持原色
                
                // 更新行号后需要同步滚动位置
                syncScroll();
            }
        }
        
        // 如果自动保存间隔发生变化，重新设置文件检查定时器
        if (settings.autoSaveInterval && fileCheckInterval_7ree) {
            clearInterval(fileCheckInterval_7ree);
            setupFileChangeDetection(settings.autoSaveInterval);
        }
        
        console.log('UI设置已应用:', settings);
        postMessageToExtension('saveUISettings_7ree', { settings });
    }

    // 新增：检查外部文件是否有变动
    function checkFileChanged() {
        if (!currentOpenFileId_7ree) {
            console.log('没有打开的文件，跳过检查');
            return;
        }

        // 获取当前编辑区内容
        const currentContent = editor_7ree ? editor_7ree.getValue() : '';
        
        console.log(`检查外部文件变动: ${currentOpenFileId_7ree}`);
        
        // 调用VSCode扩展检查文件是否有变动
        postMessageToExtension('checkFileChanged', {
            fileId: currentOpenFileId_7ree,
            currentContent: currentContent
        });
    }
    
    // 新增：设置定时检查文件变化
    // 允许自定义检查间隔
    function setupFileChangeDetection(intervalSeconds) {
        console.log('设置文件变化检测定时器');
        
        // 获取间隔时间（秒），默认10秒
        const interval = intervalSeconds || (currentUiSettings_7ree.autoSaveInterval || 10);
        const intervalMs = interval * 1000;
        
        console.log(`使用自动保存间隔: ${interval}秒`);
        
        // 清除可能存在的前一个定时器
        if (fileCheckInterval_7ree) {
            clearInterval(fileCheckInterval_7ree);
        }
        
        // 设置新的定时器，按照指定间隔检查
        fileCheckInterval_7ree = setInterval(() => {
            console.log(`定时器触发文件检查 (间隔: ${interval}秒)`);
            
            // 如果当前文本域内容与上次保存的内容相同，则检查文件是否有外部变动
            if (!editor_7ree || !currentOpenFileId_7ree) {
                return;
            }
            
            // 更新计时器
            const now = Date.now();
            if (lastEditTime_7ree > 0 && (now - lastEditTime_7ree < intervalMs)) {
                console.log(`上次编辑时间距今 ${now - lastEditTime_7ree}ms，小于${interval}秒，跳过检查`);
                return;
            }
            
            // 如果最近指定间隔内没有编辑操作，检查外部文件是否变动
            checkFileChanged();
            
        }, intervalMs);
    }
    
    // 新增：处理外部文件更新
    function handleExternalFileUpdate(fileId, newContent) {
        console.log(`处理外部文件更新: ${fileId}`);
        
        if (!editor_7ree) return;
        
        // 保存当前滚动位置和锚点文本
        saveCurrentScrollPositionAndAnchor_7ree();
        
        // 更新文本内容前先获取旧内容的大小
        const oldContent = editor_7ree.getValue();
        const oldSize = new TextEncoder().encode(oldContent).length;
        const newSize = new TextEncoder().encode(newContent).length;
        const sizeDiff = newSize - oldSize;
        
        // 更新文本内容
        editor_7ree.setValue(newContent);
        lastSavedContent = newContent; // 更新保存的内容，防止再次触发保存
        
        // 尝试恢复滚动位置
        if (anchorTextByFileId_7ree[fileId]) {
            restoreScrollPositionByAnchorText_7ree(fileId, anchorTextByFileId_7ree[fileId]);
        }
        
        // 更新状态显示
        if (statusTextElement) {
            const fileName = document.querySelector(`.file-tab_7ree[data-file-id="${fileId}"] .tab-name_7ree`)?.textContent || fileId;
            const formattedSizeDiff = formatSize(Math.abs(sizeDiff));
            statusTextElement.textContent = `已从外部更新: ${fileName}, 大小变化: ${sizeDiff > 0 ? '+' : '-'}${formattedSizeDiff}`;
            statusTextElement.classList.add('status-highlight_7ree');
            
            // 5秒后恢复状态栏
            setTimeout(() => {
                statusTextElement.classList.remove('status-highlight_7ree');
                statusTextElement.textContent = `已从外部加载更新后的内容`;
            }, 5000);
        }
        
        console.log(`文件内容已从外部更新: ${fileId}`);
    }
    
    // 辅助函数：格式化文件大小
    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
    }
    
    // 开始文件检查定时器
    // setupFileChangeDetection(); // 将在loadNotes时调用

    // 新增：保存当前滚动位置和锚点文本
    function saveCurrentScrollPositionAndAnchor_7ree() {
        if (!editor_7ree || !currentOpenFileId_7ree) {
            console.warn('无法保存锚点: 编辑器或文件ID不可用');
            return;
        }
        
        const positionInfo = getEditorPositionInfo();
        if (positionInfo.anchorText) {
            anchorTextByFileId_7ree[currentOpenFileId_7ree] = positionInfo.anchorText;
            console.log(`已保存文件 ${currentOpenFileId_7ree} 的锚点文本，长度: ${positionInfo.anchorText.length}`);
        }
        
        // 同时保存视图状态
        saveScrollPosition();
    }
    
    // 新增：通过锚点文本恢复滚动位置
    function restoreScrollPositionByAnchorText_7ree(fileId, anchorText) {
        if (!editor_7ree || !anchorText) return;
        
        try {
            const model = editor_7ree.getModel();
            if (!model) return;
            
            const text = model.getValue();
            const index = text.indexOf(anchorText);
            
            if (index !== -1) {
                // 找到锚点文本的位置
                const position = model.getPositionAt(index);
                console.log(`找到锚点文本位置: ${position.lineNumber}`);
                
                // 滚动到该位置
                editor_7ree.revealLineInCenter(position.lineNumber);
                return true;
            } else {
                console.warn('锚点文本未找到，无法恢复位置');
                return false;
            }
        } catch (e) {
            console.error('通过锚点恢复位置失败:', e);
            return false;
        }
    }

    // 修改：初始化搜索条
    function initSearchBar_7ree() {
        console.log('初始化搜索条...');
        searchBar_7ree = document.getElementById('search_bar_7ree');
        searchInput_7ree = document.getElementById('search_input_7ree');
        const searchPrev = document.getElementById('search_prev_7ree');
        const searchNext = document.getElementById('search_next_7ree');
        const searchClose = document.getElementById('search_close_7ree');
        searchMatches_7ree = document.getElementById('search_matches_7ree');
        
        if (!searchBar_7ree || !searchInput_7ree || !searchMatches_7ree) {
            console.error('搜索条元素未找到', {
                bar: !!searchBar_7ree,
                input: !!searchInput_7ree,
                matches: !!searchMatches_7ree
            });
            return;
        }
        
        // 确保搜索条默认隐藏
        searchBar_7ree.style.display = 'none';
        
        // 绑定搜索按钮事件
        if (searchNext) searchNext.addEventListener('click', nextMatch);
        if (searchPrev) searchPrev.addEventListener('click', prevMatch);
        if (searchClose) searchClose.addEventListener('click', hideSearchBar_7ree);
        
        // 绑定搜索输入框事件
        if (searchInput_7ree) {
            searchInput_7ree.addEventListener('input', performSearch);
            searchInput_7ree.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    if (e.shiftKey) {
                        // Shift+Enter: 上一个匹配
                        e.preventDefault();
                        prevMatch();
                    } else {
                        // Enter: 下一个匹配
                        e.preventDefault();
                        nextMatch();
                    }
                } else if (e.key === 'Escape') {
                    // Escape: 关闭搜索条
                    e.preventDefault();
                    hideSearchBar_7ree();
                }
            });
        }
        
        console.log('搜索条初始化完成');
    }

    // 修复：打开搜索条函数
    function openSearchBar_7ree() {
        console.log('尝试打开搜索条');
        if (!searchBar_7ree) {
            searchBar_7ree = document.getElementById('search_bar_7ree');
            if (!searchBar_7ree) {
                console.error('搜索条元素不存在');
                return;
            }
        }
        
        if (!searchInput_7ree) {
            searchInput_7ree = document.getElementById('search_input_7ree');
        }
        
        // 显示搜索条
        searchBar_7ree.style.display = 'block';
        console.log('搜索条已显示');
        
        // 检查编辑器中是否有选中的文本
        if (editor_7ree) {
            const selection = editor_7ree.getSelection();
            if (selection && !selection.isEmpty()) {
                const selectedText = editor_7ree.getModel().getValueInRange(selection);
                if (selectedText && selectedText.trim() && searchInput_7ree) {
                    searchInput_7ree.value = selectedText.trim();
                    console.log(`已将选中文本 "${selectedText.trim()}" 填充到搜索框`);
                }
            }
        }
        
        // 聚焦搜索输入框
        if (searchInput_7ree) {
            setTimeout(() => {
                searchInput_7ree.focus();
                searchInput_7ree.select(); // 选中已填充的文本
                console.log('搜索输入框已聚焦');
            }, 50);
            
            // 如果有输入内容，立即执行搜索
            if (searchInput_7ree.value.trim()) {
                performSearch();
            }
        }
    }

    // 修复：隐藏搜索条函数
    function hideSearchBar_7ree() {
        console.log('尝试隐藏搜索条');
        if (!searchBar_7ree) {
            searchBar_7ree = document.getElementById('search_bar_7ree');
            if (!searchBar_7ree) {
                console.error('搜索条元素不存在');
                return;
            }
        }
        
        searchBar_7ree.style.display = 'none';
        clearSearch();
        console.log('搜索条已隐藏');
        
        // 返回焦点到编辑器
        if (editor_7ree) {
            editor_7ree.focus();
        }
    }

    // 修复：切换搜索条显示/隐藏函数
    function toggleSearchBar_7ree() {
        console.log('切换搜索条显示状态');
        if (!searchBar_7ree) {
            searchBar_7ree = document.getElementById('search_bar_7ree');
            if (!searchBar_7ree) {
                console.error('搜索条元素不存在');
                return;
            }
        }
        
        if (searchBar_7ree.style.display === 'block') {
            hideSearchBar_7ree();
        } else {
            openSearchBar_7ree();
        }
    }

    // 修复：清除搜索高亮
    function clearSearch() {
        console.log('清除搜索高亮');
        if (!editor_7ree) {
            console.warn('编辑器实例不存在，无法清除搜索高亮');
            return;
        }
        
        try {
            // 获取当前所有装饰
            const model = editor_7ree.getModel();
            if (!model) {
                console.warn('编辑器模型不存在，无法清除搜索高亮');
                return;
            }
            
            const decorations = model.getAllDecorations()
                .filter(d => d.options.className === 'search-match_7ree' || d.options.className === 'search-match-current_7ree')
                .map(d => d.id);
            
            if (decorations.length > 0) {
                editor_7ree.deltaDecorations(decorations, []);
                console.log(`已清除 ${decorations.length} 个搜索高亮`);
            }
            
            // 重置搜索状态
            currentSearchMatch_7ree = 0;
            totalSearchMatches_7ree = 0;
            searchDecorations_7ree = [];
            
            if (searchMatches_7ree) {
                searchMatches_7ree.textContent = '0/0';
            }
        } catch (e) {
            console.error('清除搜索高亮时出错:', e);
        }
    }

    // 新增：应用所有搜索高亮
    function applyAllSearchDecorations_7ree() {
        if (!editor_7ree) return;

        // 清除旧的搜索高亮
        if (searchDecorations_7ree && searchDecorations_7ree.length > 0) {
            editor_7ree.deltaDecorations(searchDecorations_7ree, []);
            console.log(`已清除 ${searchDecorations_7ree.length} 个旧搜索高亮`);
        }
        searchDecorations_7ree = []; // 重置

        if (searchMatchesList_7ree.length === 0) {
            console.log('没有匹配项，不应用高亮');
            return;
        }

        const newDecorations = searchMatchesList_7ree.map((matchRange, index) => {
            const className = (index === currentSearchMatch_7ree) ? 'search-match-current_7ree' : 'search-match_7ree';
            return { range: matchRange, options: { className: className } };
        });

        if (newDecorations.length > 0) {
            searchDecorations_7ree = editor_7ree.deltaDecorations([], newDecorations);
            console.log(`已应用 ${searchDecorations_7ree.length} 个新搜索高亮，当前高亮索引: ${currentSearchMatch_7ree}`);
        }
    }

    // 修复：执行搜索的函数
    function performSearch() {
        console.log('执行搜索');
        
        if (!editor_7ree || !searchInput_7ree) {
            console.warn('编辑器或搜索输入框不存在，无法执行搜索');
            clearSearch(); // 确保在无法搜索时清除状态
            return;
        }
        
        const searchTerm = searchInput_7ree.value.trim();
        // 先清除之前的搜索结果和高亮，无论是否有新的搜索词
        clearSearch(); 

        if (!searchTerm) {
            console.log('搜索词为空，已清除搜索状态');
            // 更新匹配显示为 0/0
            if (searchMatches_7ree) {
                searchMatches_7ree.textContent = '0/0';
            }
            return;
        }
        
        try {
            const editorContent = editor_7ree.getValue();
            const model = editor_7ree.getModel();
            if (!model) {
                console.warn('编辑器模型不存在，无法执行搜索');
                return;
            }
            
            // 重置 searchMatchesList_7ree
            searchMatchesList_7ree = [];
            let matchInstance; // 修改变量名以避免与外部的 match 冲突
            const regex = new RegExp(escapeRegex(searchTerm), 'gi'); // 使用 'gi' 进行全局不区分大小写搜索
            
            while ((matchInstance = regex.exec(editorContent)) !== null) {
                const startPos = model.getPositionAt(matchInstance.index);
                const endPos = model.getPositionAt(matchInstance.index + matchInstance[0].length); // 使用 matchInstance[0].length
                searchMatchesList_7ree.push(new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column));
            }
            
            totalSearchMatches_7ree = searchMatchesList_7ree.length;
            console.log(`找到 ${totalSearchMatches_7ree} 个匹配项`);
            
            if (totalSearchMatches_7ree > 0) {
                currentSearchMatch_7ree = 0; // 默认选中第一个
                applyAllSearchDecorations_7ree(); // 应用所有高亮
                editor_7ree.revealRangeInCenter(searchMatchesList_7ree[currentSearchMatch_7ree]);
            } else {
                 // 如果没有匹配项，也确保应用（空）高亮，这会清除任何残留
                applyAllSearchDecorations_7ree();
            }
            
            updateMatchDisplay(); // 更新匹配计数显示
        } catch (e) {
            console.error('执行搜索时出错:', e);
            clearSearch(); // 出错时也清除状态
             if (searchMatches_7ree) { // 并更新显示
                searchMatches_7ree.textContent = '0/0';
            }
        }
    }

    // 修复：跳转到指定匹配项
    function navigateToMatch(targetIndex) { // 移除 matches 参数
        console.log(`请求导航到索引: ${targetIndex}, 当前索引: ${currentSearchMatch_7ree}, 总匹配数: ${totalSearchMatches_7ree}`);
        
        if (!editor_7ree) {
            console.warn('编辑器实例不存在，无法导航到匹配项');
            return;
        }
        
        if (totalSearchMatches_7ree === 0) {
            console.warn('没有匹配项，无法导航');
            return;
        }
        
        // 处理循环索引
        let newIndex = targetIndex;
        if (newIndex < 0) {
            newIndex = totalSearchMatches_7ree - 1; // 循环到最后一个
            console.log(`索引小于0，实际导航到: ${newIndex} (即第 ${newIndex + 1} 个)`);
        } else if (newIndex >= totalSearchMatches_7ree) {
            newIndex = 0; // 循环到第一个
            console.log(`索引超出范围，实际导航到: ${newIndex} (即第 ${newIndex + 1} 个)`);
        }
        
        currentSearchMatch_7ree = newIndex; // 更新当前匹配索引
        
        try {
            applyAllSearchDecorations_7ree(); // 重新应用所有高亮（包括当前和非当前）
            
            if (searchMatchesList_7ree[currentSearchMatch_7ree]) {
                 editor_7ree.revealRangeInCenter(searchMatchesList_7ree[currentSearchMatch_7ree]);
                 console.log(`已滚动到匹配项 ${currentSearchMatch_7ree + 1}`);
            } else {
                console.warn(`无法滚动到索引 ${currentSearchMatch_7ree}，searchMatchesList_7ree 中可能不存在该项`);
            }
            
            updateMatchDisplay(); // 更新匹配计数显示
        } catch (e) {
            console.error('导航到匹配项时出错:', e);
        }
    }

    // 修复：更新匹配显示
    function updateMatchDisplay() {
        console.log('更新匹配显示');
        if (!searchMatches_7ree) {
            searchMatches_7ree = document.getElementById('search_matches_7ree');
            if (!searchMatches_7ree) {
                console.warn('匹配显示元素不存在');
                return;
            }
        }
        
        if (totalSearchMatches_7ree === 0) {
            searchMatches_7ree.textContent = '0/0';
        } else {
            // 确保当前匹配索引在有效范围内
            if (currentSearchMatch_7ree < 0) {
                currentSearchMatch_7ree = 0;
            } else if (currentSearchMatch_7ree >= totalSearchMatches_7ree) {
                currentSearchMatch_7ree = 0; // 循环回到第一个匹配
            }
            searchMatches_7ree.textContent = `${currentSearchMatch_7ree + 1}/${totalSearchMatches_7ree}`;
        }
    }

    // 修复：下一个匹配
    function nextMatch() {
        console.log('查找下一个匹配');
        if (totalSearchMatches_7ree === 0) {
            console.log('没有匹配项，不执行跳转');
            return;
        }
        // navigateToMatch 会处理循环和边界情况
        navigateToMatch(currentSearchMatch_7ree + 1); 
    }

    // 修复：上一个匹配
    function prevMatch() {
        console.log('查找上一个匹配');
        if (totalSearchMatches_7ree === 0) {
            console.log('没有匹配项，不执行跳转');
            return;
        }
        // navigateToMatch 会处理循环和边界情况
        navigateToMatch(currentSearchMatch_7ree - 1);
    }

    // 修复：转义正则表达式特殊字符
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 在初始化编辑器后初始化搜索条
    function initializeEditor_7ree() {
        // ... existing code ...
        
        // 初始化搜索条
        initSearchBar_7ree();
        
        // ... existing code ...
    }

    // 在接收VSCode消息时处理搜索命令
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.command) {
            // ... existing code ...
            
            case 'openSearch':
                // 显示搜索条
                if (window.toggleSearchBar_7ree) {
                    window.toggleSearchBar_7ree();
                }
                break;
                
            // ... existing code ...
        }
    });

    // ... existing code ...
}); 

// 加载笔记内容
function loadNotes(message) {
    if (message.fileId !== currentOpenFileId_7ree && message.fileId !== 'default_notes_7ree') {
        console.log(`收到加载请求 fileId=${message.fileId}，但当前活动文件为 ${currentOpenFileId_7ree}，跳过处理`);
        return;
    }
    
    console.log(`加载内容: fileId=${message.fileId}, length=${message.text.length}`);
    console.log(`- 视图状态: ${message.viewState ? '已提供' : '未提供'}`);
    
    // 保存当前的文件ID
    currentOpenFileId_7ree = message.fileId;
    
    // 如果没有editor实例，直接返回
    if (!editor_7ree) {
        console.warn('Monaco编辑器实例不存在，无法加载内容');
        return;
    }

    // 更新文件列表
    updateFileList(message.files || []);

    // 分阶段进行处理，以确保DOM更新和编辑器可以正确响应
    // 第一阶段：设置文本内容
    setTimeout(() => {
    // 更新编辑器的值
    if (message.text !== undefined) {
        isSettingContent_7ree = true;
        editor_7ree.setValue(message.text);
        isSettingContent_7ree = false;
            lastSavedContent = message.text;
    }

        // 确保编辑器执行完整布局
        editor_7ree.layout();
    
        console.log('内容已设置，准备恢复视图状态');
        
        // 第二阶段：恢复编辑器状态
    setTimeout(() => {
        restoreEditorPosition(message);
        }, 400);  // 延迟时间更长，确保内容加载完成
    }, 100);  // 短暂延迟设置内容
}

// 保存当前滚动位置
function saveScrollPosition() {
    if (!editor_7ree || !currentOpenFileId_7ree) {
        console.warn('无法保存滚动位置：编辑器或文件ID不可用');
        return;
    }
    
    // 确保编辑器有一个有效的模型
    if (!editor_7ree.getModel()) {
        console.warn('无法保存滚动位置：编辑器模型不可用');
        return;
    }
    
    // 保存编辑器视图状态（包含滚动位置、光标位置等完整信息）
    const viewState = editor_7ree.saveViewState();
    
    // 验证视图状态是否有效
    if (!viewState || !viewState.viewState) {
        console.warn('视图状态不完整或无效，保存取消');
        return;
    }
    
    // 记录行号以便调试
    const firstLine = viewState.viewState.firstPosition?.lineNumber || 1;
    
    console.log(`保存文件 ${currentOpenFileId_7ree} 的滚动位置，第一可见行: ${firstLine}`);
    console.log('使用Monaco编辑器的原生视图状态保存机制');
    
    const serializedState = JSON.stringify(viewState);
    
    // 向扩展发送消息，包含序列化的视图状态
    vscode.postMessage({
        command: 'persistScrollPosition',
        fileId: currentOpenFileId_7ree,
        viewState: serializedState
    });
    
    return viewState; // 返回原始视图状态以便调试
}

// 恢复编辑器位置
function restoreEditorPosition(message) {
    if (!editor_7ree) {
        console.warn('Monaco编辑器实例不存在，无法恢复位置');
        return;
    }
    
    console.log('正在尝试恢复编辑器位置...');
    
    // 使用视图状态进行精确恢复
    if (message.viewState) {
        try {
            // 确保编辑器模型已加载并且稳定，使用延迟恢复
            setTimeout(() => {
                try {
                    const viewState = JSON.parse(message.viewState);
                    console.log('使用保存的视图状态进行精确恢复');
                    console.log(`首行位置: ${viewState.viewState?.firstPosition?.lineNumber || 1}`);
                    
                    // 确保编辑器有模型且已准备好
                    if (editor_7ree.getModel()) {
                        // 尝试先layout编辑器，确保布局已完成
                        editor_7ree.layout();
                        
                        // 恢复视图状态
                        editor_7ree.restoreViewState(viewState);
                        editor_7ree.focus(); // 确保光标和滚动位置生效
                        
                        // 再次延迟确认位置已正确设置
                        setTimeout(() => {
                            // 获取恢复后的当前视图状态用于调试
                            const currentState = editor_7ree.saveViewState();
                            const expectedLine = viewState.viewState?.firstPosition?.lineNumber || 1;
                            const actualLine = currentState.viewState?.firstPosition?.lineNumber || 1;
                            
                            console.log(`恢复状态检查 - 期望行: ${expectedLine}, 实际行: ${actualLine}`);
                            
                            // 如果位置不匹配，尝试强制设置滚动位置
                            if (expectedLine !== actualLine) {
                                console.log(`位置不匹配，尝试强制滚动到行 ${expectedLine}`);
                                editor_7ree.layout(); // 再次强制布局
                                // @ts-ignore
                                editor_7ree.revealLineInCenter(expectedLine);
                                
                                // 最后一次尝试，强制直接设置滚动位置
                                setTimeout(() => {
                                    // @ts-ignore
                                    editor_7ree.setScrollPosition({
                                        scrollTop: (expectedLine - 1) * 19, // 估计每行高度约19px
                                        scrollLeft: 0
                                    });
                                    console.log(`已强制设置滚动位置到行 ${expectedLine}`);
                                }, 100);
                            } else {
                                console.log('✅ 视图状态恢复成功，位置匹配');
                            }
                        }, 200); // 增加延迟时间到200ms
                    } else {
                        console.error('编辑器模型不可用，无法恢复状态');
                        // 基础回退机制
                        // @ts-ignore
                        editor_7ree.revealPosition(new monaco.Position(1, 1));
                    }
                } catch (innerError) {
                    console.error('在延迟过程中恢复视图状态失败:', innerError);
                    // 基础回退机制
                    // @ts-ignore
                    editor_7ree.revealPosition(new monaco.Position(1, 1));
                }
            }, 400); // 增加延迟时间到400ms确保编辑器已完全初始化
            
            return;
        } catch (error) {
            console.error('恢复视图状态失败，将尝试使用回退方法:', error);
        }
    }
    
    // 基础回退机制 - 使用行号1显示文档开头
    console.log('无法恢复精确滚动位置，将显示文档开头');
    // @ts-ignore
    editor_7ree.revealPosition(new monaco.Position(1, 1));
}

// 获取编辑器位置信息
function getEditorPositionInfo() {
    if (!editor_7ree) {
        console.warn('Monaco编辑器实例不存在，无法获取位置信息');
        return {};
    }
    
    // 获取可见范围
    const visibleRanges = editor_7ree.getVisibleRanges();
    if (!visibleRanges || visibleRanges.length === 0) {
        console.warn('无法获取编辑器可见范围');
        return {};
    }
    
    // 获取顶部可见行
    const topVisibleLine = visibleRanges[0].startLineNumber;
    
    // 获取锚点文本 - 选择顶部可见位置周围的内容作为锚点
    const model = editor_7ree.getModel();
    const lineContent = model.getLineContent(topVisibleLine);
    
    // 只有当行内容有足够长度时才使用作为锚点
    let anchorText = '';
    if (lineContent && lineContent.trim().length > 10) {
        anchorText = lineContent;
    } else {
        // 尝试获取周围几行作为锚点
        let contextLines = [];
        const startLine = Math.max(1, topVisibleLine - 2);
        const endLine = Math.min(model.getLineCount(), topVisibleLine + 2);
        
        for (let i = startLine; i <= endLine; i++) {
            const line = model.getLineContent(i);
            if (line && line.trim().length > 0) {
                contextLines.push(line);
            }
        }
        
        if (contextLines.length > 0) {
            anchorText = contextLines.join('\n');
        }
    }
    
    // 获取滚动比例 - 用于向后兼容
    const lineCount = model.getLineCount();
    /** @type {number | 'bottom'} */
    let scrollTopRatio = topVisibleLine / lineCount;
    
    // 如果显示的是最后几行，认为是在底部
    if (typeof scrollTopRatio === 'number' && lineCount - topVisibleLine < 5) {
        scrollTopRatio = 'bottom';
    }
    
    return {
        topVisibleLine,
        anchorText,
        scrollTopRatio,
        position: topVisibleLine  // 兼容原有的position属性
    };
}

// 保存笔记内容
function saveNotes() {
    // 如果还未初始化或正在设置内容，不进行保存
    if (!isInitialized_7ree || isSettingContent_7ree) {
        console.log('跳过保存: 初始化状态=' + isInitialized_7ree + ', 设置内容状态=' + isSettingContent_7ree);
        return;
    }
    
    if (!editor_7ree) {
        console.warn('Monaco编辑器实例不存在，无法保存内容');
        return;
    }
    
    // 获取内容
    const noteContent = editor_7ree.getValue();
    
    // 获取编辑器位置信息
    const positionInfo = getEditorPositionInfo();
    
    // 记录要保存的数据
    console.log(`保存内容: fileId=${currentOpenFileId_7ree}, 内容长度=${noteContent.length}`);
    console.log(`- 顶部可见行: ${positionInfo.topVisibleLine}`);
    console.log(`- 锚点文本: ${positionInfo.anchorText ? '已设置(' + positionInfo.anchorText.length + '字符)' : '未设置'}`);
    console.log(`- 滚动比例: ${typeof positionInfo.scrollTopRatio === 'number' ? positionInfo.scrollTopRatio.toFixed(4) : positionInfo.scrollTopRatio}`);
    
    // 向扩展发送保存请求
    vscode.postMessage({
        command: 'saveNotes',
        text: noteContent,
        fileId: currentOpenFileId_7ree,
        topVisibleLine: positionInfo.topVisibleLine,
        anchorText: positionInfo.anchorText,
        scrollPosition: positionInfo.position,
        scrollTopRatio: positionInfo.scrollTopRatio
    });
}

// 更新文件列表
function updateFileList(files) {
    if (!files || !files.length) {
        console.warn('更新文件列表: 接收到空文件列表');
        return;
    }
    
    // 查找标签容器
    const fileTabsContainer = document.getElementById('file_tabs_container_7ree');
    if (!fileTabsContainer) {
        console.error('更新文件列表: 找不到标签容器元素');
        return;
    }
    
    console.log(`更新文件列表: 文件数量 ${files.length}, 当前活动ID: ${currentOpenFileId_7ree}`);
    renderTabs(files, currentOpenFileId_7ree);
}

// 创建重命名对话框
function createRenameDialog_7ree() {
    // 如果已存在对话框，则先移除
    let existingDialog = document.getElementById('rename_dialog_7ree');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    // 创建对话框容器
    const dialogContainer = document.createElement('div');
    dialogContainer.id = 'rename_dialog_7ree';
    dialogContainer.className = 'rename-dialog_7ree';
    
    // 获取当前主题
    const isDarkTheme = document.body.classList.contains('vscode-dark') || 
                        !document.body.classList.contains('vscode-light');
    const themeFolder_7ree = isDarkTheme ? 'dark' : 'light';
    const SvgResourcesBaseUri_7ree = typeof window !== 'undefined' && window.RESOURCES_BASE_URI_7ree ? window.RESOURCES_BASE_URI_7ree : ''; 
    
    // 创建对话框内容 - 使用data属性替代onclick
    dialogContainer.innerHTML = `
        <div class="rename-dialog-content_7ree">
            <h3>重命名标签</h3>
            <input type="text" id="rename_input_7ree" placeholder="新标签名称">
            <div class="rename-dialog-buttons_7ree">
                <button id="rename_cancel_btn_7ree" data-action="cancel">取消</button>
                <button id="rename_confirm_btn_7ree" data-action="confirm">确定</button>
            </div>
            <div class="rename-dialog-shortcuts_7ree">
                <span class="key-text_7ree">
                    <img src="${SvgResourcesBaseUri_7ree}/icons/${themeFolder_7ree}/esc-key.svg" class="key-icon_7ree" alt="ESC"> 取消 &nbsp;&nbsp;&nbsp;&nbsp; 
                    <img src="${SvgResourcesBaseUri_7ree}/icons/${themeFolder_7ree}/enter-key.svg" class="key-icon_7ree" alt="回车"> 确定
                </span>
            </div>
        </div>
    `;
    
    // 添加到body - 确保在查询子元素前已添加到DOM
    document.body.appendChild(dialogContainer);
    
    // 用于显示状态消息的函数
    function showStatusMessage(message) {
        try {
            const statusElement = document.getElementById('notes_status_7ree');
            if (statusElement) {
                // 备份原始文本
                const originalText = statusElement.textContent;
                
                // 设置新消息
                statusElement.textContent = message;
                statusElement.style.color = 'var(--vscode-notificationsInfoIcon-foreground, #75beff)';
                statusElement.style.fontWeight = 'bold';
                
                // 3秒后恢复原始状态
                setTimeout(() => {
                    statusElement.textContent = originalText;
                    statusElement.style.color = '';
                    statusElement.style.fontWeight = '';
                }, 3000);
            }
        } catch (err) {
            console.error('状态栏显示失败:', err);
        }
    }
    
    // 使用事件委托监听对话框内的所有点击事件
    dialogContainer.addEventListener('click', function(e) {
        console.log('对话框区域被点击:', e.target);
        
        // 修复：正确处理e.target，确保它是HTMLElement
        const target = e.target;
        if (!(target instanceof HTMLElement)) {
            console.log('点击对象不是HTMLElement，无法处理');
            return;
        }
        
        // 使用更安全的方式检查按钮身份
        // 检查点击的是否是取消按钮
        if (target.id === 'rename_cancel_btn_7ree' || 
            (target.dataset && target.dataset.action === 'cancel')) {
            console.log('取消按钮被点击 (事件委托)');
            // showStatusMessage('点击了取消按钮');
            try {
                // 直接内联关闭对话框的逻辑
                console.log('尝试关闭对话框...');
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    // 移除键盘事件监听
                    try {
                        if (dialog._keyHandler) {
                            document.removeEventListener('keydown', dialog._keyHandler, true);
                        }
                    } catch (listenerErr) {
                        console.error('移除键盘监听器失败:', listenerErr);
                    }
                    
                    // 移除可见性
                    dialog.classList.remove('visible_7ree');
                    console.log('对话框可见性已关闭');
                    
                    // 延迟从DOM移除
                    setTimeout(() => {
                        try {
                            if (dialog.parentNode) {
                                dialog.parentNode.removeChild(dialog);
                                console.log('对话框从DOM中移除完成');
                            }
                        } catch (removeErr) {
                            console.error('从DOM移除对话框失败:', removeErr);
                            try {
                                dialog.style.display = 'none';
                            } catch (hideErr) {
                                console.error('隐藏对话框也失败了:', hideErr);
                            }
                        }
                    }, 300);
                    
                    // 重置重命名ID
                    renamingTabId_7ree = null;
                } else {
                    console.error('找不到对话框元素，无法关闭');
                }
            } catch (err) {
                console.error('关闭对话框出错:', err);
                showStatusMessage('关闭对话框失败: ' + err.message);
            }
            return;
        }
        
        // 检查点击的是否是确认按钮
        if (target.id === 'rename_confirm_btn_7ree' || 
            (target.dataset && target.dataset.action === 'confirm')) {
            console.log('确定按钮被点击 (事件委托)');
            try {
                // 直接内联处理确认逻辑，避免函数查找问题
                const renameInput = document.getElementById('rename_input_7ree');
                if (renameInput && renameInput instanceof HTMLInputElement && renamingTabId_7ree) {
                    const newName = renameInput.value.trim();
                    if (newName) {
                        console.log(`重命名标签 ${renamingTabId_7ree} 为 ${newName}`);
                        vscode.postMessage({ 
                            command: 'renameTab', 
                            fileId: renamingTabId_7ree, 
                            newName: newName 
                        });
                        showStatusMessage(`已将标签重命名为: ${newName}`);
                    }
                }
                
                // 内联关闭对话框逻辑
                console.log('尝试关闭对话框...');
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    // 移除键盘事件监听
                    try {
                        if (dialog._keyHandler) {
                            document.removeEventListener('keydown', dialog._keyHandler, true);
                        }
                    } catch (listenerErr) {
                        console.error('移除键盘监听器失败:', listenerErr);
                    }
                    
                    // 移除可见性
                    dialog.classList.remove('visible_7ree');
                    console.log('对话框可见性已关闭');
                    
                    // 延迟从DOM移除
                    setTimeout(() => {
                        try {
                            if (dialog.parentNode) {
                                dialog.parentNode.removeChild(dialog);
                                console.log('对话框从DOM中移除完成');
                            }
                        } catch (removeErr) {
                            console.error('从DOM移除对话框失败:', removeErr);
                            try {
                                dialog.style.display = 'none';
                            } catch (hideErr) {
                                console.error('隐藏对话框也失败了:', hideErr);
                            }
                        }
                    }, 300);
                    
                    // 重置重命名ID
                    renamingTabId_7ree = null;
                } else {
                    console.error('找不到对话框元素，无法关闭');
                }
            } catch (err) {
                console.error('重命名处理出错:', err);
                showStatusMessage('重命名处理失败: ' + err.message);
            }
            return;
        }
        
        // 如果点击的是对话框背景而不是内容，则关闭对话框
        if (target === dialogContainer) {
            console.log('点击了对话框背景');
            try {
                // 内联关闭对话框逻辑
                console.log('尝试关闭对话框...');
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    // 移除键盘事件监听
                    try {
                        if (dialog._keyHandler) {
                            document.removeEventListener('keydown', dialog._keyHandler, true);
                        }
                    } catch (listenerErr) {
                        console.error('移除键盘监听器失败:', listenerErr);
                    }
                    
                    // 移除可见性
                    dialog.classList.remove('visible_7ree');
                    console.log('对话框可见性已关闭');
                    
                    // 延迟从DOM移除
                    setTimeout(() => {
                        try {
                            if (dialog.parentNode) {
                                dialog.parentNode.removeChild(dialog);
                                console.log('对话框从DOM中移除完成');
                            }
                        } catch (removeErr) {
                            console.error('从DOM移除对话框失败:', removeErr);
                            try {
                                dialog.style.display = 'none';
                            } catch (hideErr) {
                                console.error('隐藏对话框也失败了:', hideErr);
                            }
                        }
                    }, 300);
                    
                    // 重置重命名ID
                    renamingTabId_7ree = null;
                } else {
                    console.error('找不到对话框元素，无法关闭');
                }
            } catch (err) {
                console.error('关闭对话框出错:', err);
            }
        }
    });
    
    // 添加键盘事件处理
    const keyHandler = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            try {
                // 直接内联处理确认逻辑
                const renameInput = document.getElementById('rename_input_7ree');
                if (renameInput && renameInput instanceof HTMLInputElement && renamingTabId_7ree) {
                    const newName = renameInput.value.trim();
                    if (newName) {
                        console.log(`重命名标签 ${renamingTabId_7ree} 为 ${newName}`);
                        vscode.postMessage({ 
                            command: 'renameTab', 
                            fileId: renamingTabId_7ree, 
                            newName: newName 
                        });
                        showStatusMessage(`已将标签重命名为: ${newName}`);
                    }
                }
                
                // 内联关闭对话框逻辑
                console.log('尝试关闭对话框 (回车键)...');
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    // 移除键盘事件监听
                    try {
                        if (dialog._keyHandler) {
                            document.removeEventListener('keydown', dialog._keyHandler, true);
                            dialog._keyHandler = null;
                        }
                    } catch (listenerErr) {
                        console.error('移除键盘监听器失败:', listenerErr);
                    }
                    
                    // 移除可见性
                    dialog.classList.remove('visible_7ree');
                    console.log('对话框可见性已关闭');
                    
                    // 延迟从DOM移除
                    setTimeout(() => {
                        try {
                            if (dialog.parentNode) {
                                dialog.parentNode.removeChild(dialog);
                                console.log('对话框从DOM中移除完成');
                            }
                        } catch (removeErr) {
                            console.error('从DOM移除对话框失败:', removeErr);
                            try {
                                dialog.style.display = 'none';
                            } catch (hideErr) {
                                console.error('隐藏对话框也失败了:', hideErr);
                            }
                        }
                    }, 300);
                    
                    // 重置重命名ID
                    renamingTabId_7ree = null;
                } else {
                    console.error('找不到对话框元素，无法关闭');
                }
            } catch (err) {
                console.error('回车键处理出错:', err);
                showStatusMessage('重命名处理失败: ' + err.message);
            }
            return false;
        } else if (e.key === 'Escape') {
            e.preventDefault();
            try {
                // 内联关闭对话框逻辑
                console.log('尝试关闭对话框 (ESC键)...');
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    // 移除键盘事件监听
                    try {
                        if (dialog._keyHandler) {
                            document.removeEventListener('keydown', dialog._keyHandler, true);
                            dialog._keyHandler = null;
                        }
                    } catch (listenerErr) {
                        console.error('移除键盘监听器失败:', listenerErr);
                    }
                    
                    // 移除可见性
                    dialog.classList.remove('visible_7ree');
                    console.log('对话框可见性已关闭');
                    
                    // 延迟从DOM移除
                    setTimeout(() => {
                        try {
                            if (dialog.parentNode) {
                                dialog.parentNode.removeChild(dialog);
                                console.log('对话框从DOM中移除完成');
                            }
                        } catch (removeErr) {
                            console.error('从DOM移除对话框失败:', removeErr);
                            try {
                                dialog.style.display = 'none';
                            } catch (hideErr) {
                                console.error('隐藏对话框也失败了:', hideErr);
                            }
                        }
                    }, 300);
                    
                    // 重置重命名ID
                    renamingTabId_7ree = null;
                } else {
                    console.error('找不到对话框元素，无法关闭');
                }
            } catch (err) {
                console.error('ESC键处理出错:', err);
                showStatusMessage('关闭对话框失败: ' + err.message);
            }
            return false;
        }
    };
    
    // 为文档添加键盘事件监听，使用捕获模式
    document.addEventListener('keydown', keyHandler, true);
    
    // 保存事件处理器引用
    dialogContainer._keyHandler = keyHandler;
    
    // 显示对话框
    dialogContainer.classList.add('visible_7ree');
    
    // 聚焦到输入框
    setTimeout(() => {
        const input = document.getElementById('rename_input_7ree');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
    
    return dialogContainer;
} 

// ... existing code ...

// 在编辑器创建后调用初始化搜索条
function createEditorInstance_7ree(container, initialContent) {
    window.editor_7ree = monaco.editor.create(container, {
        value: initialContent || '',
        language: 'markdown',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        wrappingIndent: 'same',
        fontSize: 14,
        lineHeight: 21,
        lineNumbers: 'on',
        theme: 'vs',
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
        }
    });

    // 监听内容变化
    window.editor_7ree.onDidChangeModelContent(debounce_7ree(function() {
        const editorContent = window.editor_7ree.getValue();
        
        // 更新保存状态
        isDirty_7ree = true;
        updateSaveTime_7ree();
        
        // 通知VSCode内容已更改
        vscode_7ree.postMessage({
            command: 'contentChanged',
            content: editorContent
        });
    }, 500));
    
    // 初始化搜索条
    initSearchBar_7ree();
    
    return window.editor_7ree;
}

// ... existing code ...

// 创建一个简单的测试按钮函数
function createTestButton_7ree() {
    // 此函数已移除
}

// 创建专门的通知栏测试按钮
function createNotificationTestButton_7ree() {
    // 此函数已移除
} 