/* global document, window, monaco, require, RESOURCES_BASE_URI_7ree, acquireVsCodeApi, joplinApi_7ree */
// @ts-ignore
// 获取 vscode API
const vscode = acquireVsCodeApi();

// 全局变量
let saveTimeout = null;
let editor_7ree = null;
let lastEditTime_7ree = Date.now();
let isSettingContent_7ree = false;
let actionsDropdown_7ree = null; // 更多操作下拉菜单的全局引用
let currentFileId_7ree = 'default_notes_7ree';
let currentOpenFileId_7ree = 'default_notes_7ree'; // 当前打开的文件ID
window.currentOpenFileId_7ree = currentOpenFileId_7ree; // 关键：挂载到window对象上

// 添加预加载CSS标志
let preloadedEditorStyles_7ree = false;

// 添加全局标志，跟踪Joplin测试消息监听器是否已初始化
let joplinTestListenersInitialized_7ree = false;

// 将自动保存定时器变量暴露给设置API
window.autoSaveInterval_7ree = null;
window.saveCurrentContent = null; // 先声明，后赋值

// 同样暴露状态消息函数
window.showStatusMessage = null;

let lastSavedContent = ''; // 用于跟踪上次保存的内容
let isInitialized_7ree = false; // 标记编辑器是否已初始化
let moreActionsButton_7ree = null; // 更多操作按钮
let anchorTextByFileId_7ree = {}; // 用于通过文本锚点恢复位置
let currentUiSettings_7ree = {
    fontFamily: '',
    fontSize: '',
    color: '',
    backgroundColor: '',
    selectionBackground: '',
    autoSaveInterval: 30
};

// 添加：当前激活的文件类型标志
let isCloudNotesActive_7ree = false;

// 添加：拖拽相关变量
let draggedTab_7ree = null;
let dragTargetTab_7ree = null;
let renamingTabId_7ree = null;
let settingsDialog_7ree = null;
let fileCheckInterval_7ree = null;

// 搜索相关变量
let searchBar_7ree = null; // 搜索条元素
let searchInput_7ree = null; // 搜索输入框
let searchMatches_7ree = null; // 匹配结果显示元素
let currentSearchMatch_7ree = 0; // 当前匹配位置
let totalSearchMatches_7ree = 0; // 总匹配数
let searchDecorations_7ree = []; // 搜索高亮装饰器
let searchMatchesList_7ree = []; // 存储所有匹配项

// 首先，在文件开头添加一个变量跟踪最后一次发送的getUISettings请求
let lastSettingsRequestTime_7ree = 0;
const settingsRequestTimeout_7ree = 1000; // 1秒超时

// 切换搜索条显示/隐藏函数
function toggleSearchBar_7ree() {
    // console.log('切换搜索条显示状态');
    if (!searchBar_7ree) {
        searchBar_7ree = document.getElementById('search_bar_7ree');
        if (!searchBar_7ree) {
            // // console.error('搜索条元素不存在');
            return;
        }
    }
    
    if (searchBar_7ree.style.display === 'block') {
        // 内联实现hideSearchBar_7ree的逻辑
        searchBar_7ree.style.display = 'none';
        
        // 清除搜索（简化版clearSearch）
        if (editor_7ree) {
            try {
                const model = editor_7ree.getModel();
                if (model) {
                    const decorations = model.getAllDecorations()
                        .filter(d => d.options.className === 'search-match_7ree' || d.options.className === 'search-match-current_7ree')
                        .map(d => d.id);
                    
                    if (decorations.length > 0) {
                        editor_7ree.deltaDecorations(decorations, []);
                    }
                    
                    // 重置搜索状态
                    currentSearchMatch_7ree = 0;
                    totalSearchMatches_7ree = 0;
                    searchDecorations_7ree = [];
                    
                    if (searchMatches_7ree) {
                        searchMatches_7ree.textContent = '0/0';
                    }
                }
            } catch (e) {
                // // console.error('清除搜索高亮时出错:', e);
            }
            
            // 返回焦点到编辑器
            editor_7ree.focus();
        }
    } else {
        // 内联实现openSearchBar_7ree的逻辑
        if (!searchInput_7ree) {
            searchInput_7ree = document.getElementById('search_input_7ree');
        }
        
        // 显示搜索条
        searchBar_7ree.style.display = 'block';
        
        // 检查编辑器中是否有选中的文本
        if (editor_7ree) {
            const selection = editor_7ree.getSelection();
            if (selection && !selection.isEmpty()) {
                const selectedText = editor_7ree.getModel().getValueInRange(selection);
                if (selectedText && selectedText.trim() && searchInput_7ree) {
                    searchInput_7ree.value = selectedText.trim();
                }
            }
        }
        
        // 聚焦搜索输入框
        if (searchInput_7ree) {
            setTimeout(() => {
                searchInput_7ree.focus();
                searchInput_7ree.select(); // 选中已填充的文本
            }, 50);
        }
    }
}

// 为了与VSCode扩展通信，将toggleSearchBar_7ree设为全局函数
window.toggleSearchBar_7ree = function() {
    // console.log('全局toggleSearchBar_7ree被调用');
    // 直接实现搜索条切换逻辑，不依赖其他函数
    if (!searchBar_7ree) {
        searchBar_7ree = document.getElementById('search_bar_7ree');
        if (!searchBar_7ree) {
            // // console.error('搜索条元素不存在');
            return;
        }
    }
    
    if (searchBar_7ree.style.display === 'block') {
        // 内联实现hideSearchBar_7ree的逻辑
        searchBar_7ree.style.display = 'none';
        
        // 清除搜索（简化版clearSearch）
        if (editor_7ree) {
            try {
                const model = editor_7ree.getModel();
                if (model) {
                    const decorations = model.getAllDecorations()
                        .filter(d => d.options.className === 'search-match_7ree' || d.options.className === 'search-match-current_7ree')
                        .map(d => d.id);
                    
                    if (decorations.length > 0) {
                        editor_7ree.deltaDecorations(decorations, []);
                    }
                    
                    // 重置搜索状态
                    currentSearchMatch_7ree = 0;
                    totalSearchMatches_7ree = 0;
                    searchDecorations_7ree = [];
                    
                    if (searchMatches_7ree) {
                        searchMatches_7ree.textContent = '0/0';
                    }
                }
            } catch (e) {
                // // console.error('清除搜索高亮时出错:', e);
            }
            
            // 返回焦点到编辑器
            editor_7ree.focus();
        }
    } else {
        // 内联实现openSearchBar_7ree的逻辑
        if (!searchInput_7ree) {
            searchInput_7ree = document.getElementById('search_input_7ree');
        }
        
        // 显示搜索条
        searchBar_7ree.style.display = 'block';
        
        // 检查编辑器中是否有选中的文本
        if (editor_7ree) {
            const selection = editor_7ree.getSelection();
            if (selection && !selection.isEmpty()) {
                const selectedText = editor_7ree.getModel().getValueInRange(selection);
                if (selectedText && selectedText.trim() && searchInput_7ree) {
                    searchInput_7ree.value = selectedText.trim();
                }
            }
        }
        
        // 聚焦搜索输入框
        if (searchInput_7ree) {
            setTimeout(() => {
                searchInput_7ree.focus();
                searchInput_7ree.select(); // 选中已填充的文本
            }, 50);
        }
    }
};

// 新增：开始拖动标签的处理
document.addEventListener('dragstart', (e) => {
    // 阻止搜索条的拖动
    if (e.target && e.target instanceof Element && e.target.closest('#search_bar_7ree')) {
        e.preventDefault();
        return false;
    }
});

// 新增：预加载编辑器样式，防止闪烁问题
function preloadEditorStyles_7ree() {
    if (preloadedEditorStyles_7ree) return; // 防止重复加载
    
    // console.log('预加载编辑器样式以防止闪烁');
    
    // 获取VSCode主题变量值
    const vscodeBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();
    const isDarkTheme = document.body.classList.contains('vscode-dark');
    
    // 使用VSCode变量或默认颜色
    const bgColor = vscodeBgColor || (isDarkTheme ? '#1e1e1e' : '#ffffff');
    
    // 创建预加载样式元素
    let preloadStyle = document.getElementById('preload-editor-styles_7ree');
    if (!preloadStyle) {
        preloadStyle = document.createElement('style');
        preloadStyle.id = 'preload-editor-styles_7ree';
        
        // 确保样式元素添加到头部最前面以获得最高优先级
        if (document.head.firstChild) {
            document.head.insertBefore(preloadStyle, document.head.firstChild);
        } else {
            document.head.appendChild(preloadStyle);
        }
    }
    
    // 设置预加载样式的CSS规则
    preloadStyle.textContent = `
        /* 预先设置全局编辑器背景色以防止闪烁 */
        body, 
        html, 
        .editor-wrapper, 
        #editor-container, 
        .monaco-editor-container_7ree, 
        .notes-container_7ree,
        .monaco-editor,
        .monaco-editor-background,
        .monaco-editor .monaco-editor-background {
            background-color: ${bgColor} !important;
            transition: background-color 0.1s ease;
        }
    `;
    
    // 直接设置编辑器容器的背景色（如果存在）
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
        editorContainer.style.backgroundColor = bgColor;
    }
    
    preloadedEditorStyles_7ree = true;
    // console.log('预加载样式已应用，背景色:', bgColor);
}

// 初始化Joplin测试消息监听器
function initJoplinTestListeners_7ree() {
    // 允许重新初始化，确保每次测试连接时都能正确处理响应
    if (joplinTestListenersInitialized_7ree) {
        // console.log('🔴🔴🔴 [修复bug] Joplin测试消息监听器已初始化，但将重新初始化');
        // 不要提前返回，允许重新初始化
    }
    
    // console.log('🔴🔴🔴 [修复bug] 初始化Joplin测试消息监听器');
    
    // 方式1：全局消息事件监听
    window.addEventListener('message', function joplinTestMessageHandler(evt) {
        if (evt.data && evt.data.command === 'joplinTestResponse') {
            // console.log('🔴🔴🔴 [修复bug] 全局消息监听器捕获到joplinTestResponse:', evt.data);
            
            // 转发消息到extension.js
            vscode.postMessage({
                command: 'joplinTestResponse',
                success: evt.data.success,
                error: evt.data.error || '',
                data: evt.data.data
            });
            
            // 创建并分发一个自定义事件，用于通知设置对话框
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
            // console.log('🔴🔴🔴 [修复bug] 已分发joplinTestResult事件');
        }
    });
    
    // 方式2：自定义事件监听
    window.addEventListener('joplinTestResultEvent_7ree', function(evt) {
        // console.log('🔴🔴🔴 [修复bug] 全局事件监听器捕获到joplinTestResultEvent_7ree:', evt.detail);
        
        if (evt.detail && evt.detail.command === 'joplinTestResponse') {
            // 转发消息到extension.js
            vscode.postMessage({
                command: 'joplinTestResponse',
                success: evt.detail.success,
                error: evt.detail.error || '',
                data: evt.detail.data
            });
            
            // 创建并分发一个自定义事件，用于通知设置对话框
            const resultEvent = new CustomEvent('joplinTestResult', {
                detail: {
                    success: evt.detail.success,
                    error: evt.detail.error || '',
                    data: evt.detail.data
                },
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(resultEvent);
            // console.log('🔴🔴🔴 [修复bug] 已分发joplinTestResult事件');
        }
    });
    
    // 方式3：创建并分发一个自定义事件，通知其他模块监听器已初始化
    const resultEvent = new CustomEvent('joplinTestListenersInitialized_7ree', {
        detail: { initialized: true },
        bubbles: true,
        cancelable: true
    });
    window.dispatchEvent(resultEvent);
    
    // 标记为已初始化
    joplinTestListenersInitialized_7ree = true;
    // console.log('🔴🔴🔴 [修复bug] Joplin测试消息监听器初始化完成');
    
    // 确保全局变量可用
    window.joplinTestListenersInitialized_7ree = true;
}

// 当DOM内容加载完成时初始化
// @ts-ignore
document.addEventListener('DOMContentLoaded', () => {
    // 确保全局函数已赋值
    window.saveCurrentContent = saveCurrentContent;
    window.showStatusMessage = showStatusMessage;
    
    // 首先预加载样式防止闪烁
    preloadEditorStyles_7ree();
    
    // 初始化Joplin测试消息监听器
    initJoplinTestListeners_7ree();
    
    // 在DOM加载完成后再初始化编辑器
    setTimeout(() => {
        initMonacoEditor_7ree();
    }, 100);
    
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
    
    // 显示状态消息的函数
    function showStatusMessage(message, isError = false) {
        if (!statusTextElement) return;
        
        // 保存原始样式
        const originalColor = statusTextElement.style.color;
        const originalWeight = statusTextElement.style.fontWeight;
        
        // 设置消息
        statusTextElement.textContent = message;
        
        // 设置样式
        if (isError) {
            statusTextElement.style.color = 'var(--vscode-errorForeground, #f14c4c)';
            statusTextElement.style.fontWeight = 'bold';
        } else {
            statusTextElement.style.color = 'var(--vscode-notificationsInfoIcon-foreground, #75beff)';
            statusTextElement.style.fontWeight = 'bold';
        }
        
        // 5秒后恢复原始样式
        setTimeout(() => {
            statusTextElement.textContent = `上次保存: ${new Date().toLocaleTimeString()}`;
            statusTextElement.style.color = originalColor;
            statusTextElement.style.fontWeight = originalWeight;
        }, 5000);
    }
    
    // 修改：手动保存按钮点击事件，调用 saveCurrentContent
    if (manualSaveButton) {
        manualSaveButton.addEventListener('click', () => {
            // console.log('手动保存按钮点击');
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
    
    // 新增：备份按钮点击事件
    const backupButton = document.getElementById('backup_button_7ree');
    if (backupButton) {
        backupButton.addEventListener('click', () => {
            // console.log('备份按钮点击');
            
            // 先执行保存，确保最新内容被备份
            saveCurrentContent(false);
            
            // 发送备份命令到扩展
            postMessageToExtension('backupCurrentFile');
            
            // 显示正在备份的提示
            showStatusMessage('正在备份当前文件...');
            
            // 添加视觉反馈（备份开始时）
            backupButton.classList.add('backup-in-progress_7ree');
        });
    }
    
    // 添加全局键盘事件，监听Ctrl+S快捷键
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault(); // 阻止默认的浏览器保存行为
            // console.log('检测到Ctrl+S快捷键');
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
                    // console.log('点击外部区域，关闭下拉菜单');
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
            // console.log('Webview即将不可见，立即保存滚动位置');
            saveScrollPosition();
        }
    });
    
    // 新增： 初始化 Monaco 编辑器
    function initMonacoEditor_7ree() {
        // 检查编辑器容器是否存在
        let editorContainer = document.getElementById('editor-container');
        
        // 如果editor-container不存在，先创建notes-container和editor-container
        if (!editorContainer) {
            // console.log('找不到editor-container元素，开始创建必要的DOM结构');
            
            // 创建notes-container（如果不存在）
            let notesContainer = document.getElementById('notes-container');
            if (!notesContainer) {
                notesContainer = document.createElement('div');
                notesContainer.id = 'notes-container';
                notesContainer.className = 'notes-container_7ree';
                document.body.appendChild(notesContainer);
                // console.log('已创建notes-container元素');
            }
            
            // 创建editor-container
            editorContainer = document.createElement('div');
            editorContainer.id = 'editor-container';
            editorContainer.className = 'monaco-editor-container_7ree';
            notesContainer.appendChild(editorContainer);
            // console.log('已创建editor-container元素');
            
            // 确保编辑器容器有预设的背景色
            if (!preloadedEditorStyles_7ree) {
                preloadEditorStyles_7ree();
            }
        }
        
        // @ts-ignore
        if (typeof require !== 'undefined' && typeof require.config === 'function') {
             // @ts-ignore
            require.config({ paths: { 'vs': window.RESOURCES_BASE_URI_7ree.replace('resources', 'node_modules/monaco-editor/min/vs') } });
        } else {
            // console.error("RequireJS或类似加载器未找到或未配置，无法初始化编辑器");
            return;
        }
        
        // 在初始化编辑器前预先获取必要的样式
        // 获取VSCode主题变量值或当前保存的设置
        const isDarkTheme = document.body.classList.contains('vscode-dark');
        const vscodeBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();
        const vscodeTextColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-foreground').trim();
        const vscodeSelectionBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-selectionBackground').trim();
        
        // 应用优先级：当前UI设置 > VSCode变量 > 默认硬编码值
        const bgColor = currentUiSettings_7ree.backgroundColor || vscodeBgColor || (isDarkTheme ? '#1e1e1e' : '#ffffff');
        const textColor = currentUiSettings_7ree.color || vscodeTextColor || (isDarkTheme ? '#d4d4d4' : '#000000');
        const selectionBgColor = currentUiSettings_7ree.selectionBackground || vscodeSelectionBgColor || (isDarkTheme ? '#264f78' : '#add6ff');
        const theme = isDarkTheme ? 'vs-dark' : 'vs';
        
        // console.log('编辑器初始化前确定的样式 - 主题:', theme, '背景色:', bgColor, '文字颜色:', textColor);
        
        // 确保DOM更新后再创建编辑器
        setTimeout(() => {
        // @ts-ignore
            require(['vs/editor/editor.main'], function() {
                // 重新获取确保存在
                const container = document.getElementById('editor-container');
                if (!container) {
                    console.error('即使创建后仍找不到editor-container元素，无法继续');
                    return;
                }

                try {
                    // 创建编辑器实例，同时应用已确定的样式参数
                    editor_7ree = monaco.editor.create(container, {
                        value: '',
                        language: 'plaintext',
                        lineNumbers: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        theme: theme, // 使用预先确定的主题
                        fontSize: currentUiSettings_7ree.fontSize || 14,
                        fontFamily: currentUiSettings_7ree.fontFamily || 'var(--vscode-editor-font-family)',
                        automaticLayout: true, // 自动布局适应容器大小变化
                        // 禁用模糊Unicode字符的警告提示
                        unicodeHighlight: {
                            ambiguousCharacters: false,
                            invisibleCharacters: false,
                            nonBasicASCII: false
                        }
                    });
                    
                    // 创建或更新自定义样式
                    let styleElement = document.getElementById('monaco-custom-styles_7ree');
                    if (!styleElement) {
                        styleElement = document.createElement('style');
                        styleElement.id = 'monaco-custom-styles_7ree';
                        // 确保样式元素添加到头部
                        document.head.appendChild(styleElement);
                    }
                    
                    // 设置完整的CSS规则
                    styleElement.textContent = `
                        /* 增强编辑器背景色 */
                        body .monaco-editor, 
                        body .monaco-editor .monaco-editor-background, 
                        body .monaco-editor-background,
                        body .monaco-editor .margin,
                        body .monaco-editor .margin-view-overlays,
                        #editor-container .monaco-editor,
                        #editor-container .monaco-editor-background {
                            background-color: ${bgColor} !important;
                        }
                        
                        /* 编辑器容器背景色 */
                        #editor-container,
                        .monaco-editor-container_7ree,
                        .notes-container_7ree {
                            background-color: ${bgColor} !important;
                        }
                        
                        /* 文字颜色 */
                        body .monaco-editor .lines-content,
                        body .monaco-editor .view-line span,
                        body .monaco-editor .view-lines,
                        #editor-container .monaco-editor .view-line span {
                            color: ${textColor} !important;
                        }
                        
                        /* 选中文本背景色 */
                        body .monaco-editor .selected-text,
                        #editor-container .monaco-editor .selected-text {
                            background-color: ${selectionBgColor} !important;
                        }
                        
                        /* 确保行号边栏背景色 */
                        body .monaco-editor .margin-view-overlays .line-numbers,
                        #editor-container .monaco-editor .margin-view-overlays .line-numbers {
                            background-color: ${bgColor} !important;
                        }
                    `;
                    
                    // 可以移除预加载样式元素，因为我们现在有更精确的样式规则
                    const preloadStyle = document.getElementById('preload-editor-styles_7ree');
                    if (preloadStyle) {
                        // 延迟移除，确保新样式已完全应用
                        setTimeout(() => {
                            preloadStyle.remove();
                            // console.log('已移除预加载样式元素');
                        }, 500);
                    }
                    
                    // 监听编辑器内容变化
                    editor_7ree.onDidChangeModelContent(() => {
                        if (isSettingContent_7ree) return;
                        lastEditTime_7ree = Date.now();
                        if (saveTimeout) clearTimeout(saveTimeout);
                        const autoSaveInterval = (currentUiSettings_7ree.autoSaveInterval || 30) * 1000;
                        saveTimeout = setTimeout(() => {
                            // console.log('文本输入超时，自动保存内容和滚动位置');
                            saveCurrentContent(false);
                        }, autoSaveInterval);
                    });
                    
                    
                    // 监听编辑器失去焦点事件，自动保存内容
                    editor_7ree.onDidBlurEditorWidget(() => {
                        // console.log('编辑器失去焦点，自动保存内容');
                        saveCurrentContent(false);
                    });
                    
                    // 监听编辑器主题变化
                    window.addEventListener('message', function(event) {
                        const message = event.data;
                        if (message && message.type === 'vscode-theme-changed') {
                            // 更新编辑器主题
                            const isDark = document.body.classList.contains('vscode-dark');
                            monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
                            
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
                    // console.log('Monaco编辑器初始化完成');
                    postMessageToExtension('webviewReady');
                    
                    // 重要：在编辑器初始化完成后再初始化设置API
                    if (window.settingsApi_7ree) {
                        // console.log('正在初始化设置API...');
                        window.settingsApi_7ree.init(editor_7ree, vscode);
                        
                        // 应用初始设置（如果有）
                        if (currentUISettings_7ree) {
                            // console.log('正在应用初始UI设置...');
                            window.settingsApi_7ree.updateSettings(currentUISettings_7ree);
                            window.settingsApi_7ree.applySettings();
                        }
                    } else {
                        // console.warn('设置API未加载，无法初始化');
                    }
                } catch (err) {
                    // console.error('创建编辑器时出错:', err);
                }
            });
        }, 100);
    }
    
    // 修改：应用编辑器自定义样式（背景色和文字颜色）
    function applyEditorCustomStyles(options) {
        if (!options) return;
        
        // console.log('webview.js中的applyEditorCustomStyles被调用:', JSON.stringify(options));
        
        // 优先设置背景色，即使编辑器尚未创建，也确保HTML元素有正确的背景色
        if (options.backgroundColor) {
            // 直接设置容器背景色，防止闪烁
            const editorContainer = document.getElementById('editor-container');
            if (editorContainer) {
                editorContainer.style.backgroundColor = options.backgroundColor;
                // console.log('直接设置了editor-container的背景色:', options.backgroundColor);
            }
            
            // 设置其他相关容器的背景色
            const notesContainer = document.getElementById('notes-container');
            if (notesContainer) {
                notesContainer.style.backgroundColor = options.backgroundColor;
            }
            
            const monacoEditorContainer = document.querySelector('.monaco-editor-container_7ree');
            if (monacoEditorContainer) {
                monacoEditorContainer.style.backgroundColor = options.backgroundColor;
            }
        }
        
        const isDarkTheme = document.body.classList.contains('vscode-dark');
        
        // 如果选项为空，尝试从VSCode CSS变量获取
        const vscodeBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();
        const vscodeTextColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-foreground').trim();
        const vscodeSelectionBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-selectionBackground').trim();
        
        // console.log('VSCode CSS变量 - 背景色:', vscodeBgColor, '文字颜色:', vscodeTextColor, '选中背景:', vscodeSelectionBgColor);
        
        // 应用优先级：传入的选项 > 当前UI设置 > VSCode变量 > 默认硬编码值
        const bgColor = options.backgroundColor || currentUiSettings_7ree.backgroundColor || vscodeBgColor || (isDarkTheme ? '#1e1e1e' : '#ffffff');
        const textColor = options.color || currentUiSettings_7ree.color || vscodeTextColor || (isDarkTheme ? '#d4d4d4' : '#000000');
        const selectionBgColor = options.selectionBackground || currentUiSettings_7ree.selectionBackground || vscodeSelectionBgColor || (isDarkTheme ? '#264f78' : '#add6ff');
        
        // console.log('最终应用的颜色 - 背景色:', bgColor, '文字颜色:', textColor, '选中背景:', selectionBgColor);
        
        // 创建或获取自定义样式元素
        let styleElement = document.getElementById('monaco-custom-styles_7ree');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'monaco-custom-styles_7ree';
            // 将样式元素添加到head的最前面，确保最高优先级
            if (document.head.firstChild) {
                document.head.insertBefore(styleElement, document.head.firstChild);
            } else {
                document.head.appendChild(styleElement);
            }
            // console.log('创建了新的样式元素: monaco-custom-styles_7ree');
        } else {
            // console.log('使用现有样式元素: monaco-custom-styles_7ree');
        }
        
        // 检查与editor-custom-styles_7ree的冲突
        const otherStyleElement = document.getElementById('editor-custom-styles_7ree');
        if (otherStyleElement) {
            // // console.warn('发现潜在冲突: editor-custom-styles_7ree 已存在，这可能导致样式覆盖问题');
            // 移除冲突的样式元素
            otherStyleElement.remove();
            // console.log('已移除潜在冲突的样式元素');
        }
        
        // 创建更完整的CSS规则
        styleElement.textContent = `
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
            
            /* 编辑器容器背景色 */
            #editor-container,
            .monaco-editor-container_7ree,
            .notes-container_7ree {
                background-color: ${bgColor} !important;
            }
            
            /* 文字颜色 */
            body .monaco-editor .lines-content,
            body .monaco-editor .view-line span,
            body .monaco-editor .view-lines,
            #editor-container .monaco-editor .view-line span {
                color: ${textColor} !important;
            }
            
            /* 选中文本背景色 */
            body .monaco-editor .selected-text,
            #editor-container .monaco-editor .selected-text {
                background-color: ${selectionBgColor} !important;
            }
            
            /* 确保行号边栏背景色 */
            body .monaco-editor .margin-view-overlays .line-numbers,
            #editor-container .monaco-editor .margin-view-overlays .line-numbers,
            .monaco-editor .margin-view-overlays .line-numbers {
                background-color: ${bgColor} !important;
            }
        `;
        
        
        // 可以移除预加载样式元素，因为我们现在有更精确的样式规则
        const preloadStyle = document.getElementById('preload-editor-styles_7ree');
        if (preloadStyle) {
            // 延迟移除，确保新样式已完全应用
            setTimeout(() => {
                preloadStyle.remove();
                // console.log('已移除预加载样式元素');
            }, 500);
        }
        
        // 在editor_7ree存在时，强制重绘以确保样式应用
        if (editor_7ree && editor_7ree.layout) {
            try {
                setTimeout(() => {
                    editor_7ree.layout();
                    // console.log('触发了编辑器重新布局以应用样式变化');
                }, 100);
            } catch (e) {
                // console.error('触发编辑器重新布局时出错:', e);
            }
        }
        
        // console.log(`已应用编辑器样式 - 背景色: ${bgColor}, 文字颜色: ${textColor}`);
    }
    
    // 修改：保存当前内容
    function saveCurrentContent(switchingTabs = false) {
        if (!editor_7ree || !isInitialized_7ree || isSettingContent_7ree) {
            // console.log('跳过保存: 编辑器未初始化或正在设置内容');
            return;
        }
        
        let content = '';
        try {
            content = editor_7ree.getValue();
        } catch (e) {
            // console.error('获取编辑器内容失败:', e);
            return;
        }
        
        // 如果内容没有变化，只是在切换标签，则不发送保存消息以减少不必要的 IO
        if (switchingTabs && content === lastSavedContent) {
            // console.log('内容未变化，跳过保存');
            return;
        }
        
        // 保存内容和视图状态
        lastSavedContent = content;
        
        // 保存当前状态
        const state = saveScrollPosition();
        // console.log(`已保存编辑器状态，视图状态：${state ? '有效' : '无效'}`);
        
        // 向 vscode 发送保存请求
        vscode.postMessage({
            command: 'saveNotes',
            text: content,
            fileId: currentOpenFileId_7ree,
            switchingTabs
        });
        
        // 仅当不是切换标签时更新状态栏
        if (!switchingTabs) {
            // 更新状态栏显示
            const statusElement = document.getElementById('status_7ree');
            if (statusElement) {
                statusElement.textContent = `已保存 (${new Date().toLocaleTimeString()})`;
            }
            
            // 对于云笔记特别处理，自动推送到Joplin
            if (isCloudNotesActive_7ree) {
                // console.log('当前是云笔记标签，尝试推送到Joplin API');
                // 确保joplinApi_7ree已初始化
                if (window.joplinApi_7ree && typeof window.joplinApi_7ree.init === 'function') {
                    // 推送到Joplin API的正确方式是调用pushNoteToJoplin_7ree函数
                    // 但由于该函数未直接暴露，我们通过joplinApi_7ree的对象进行调用
                    try {
                        // 通过回调推送到Joplin API
                        setTimeout(() => {
                            if (window.joplinApi_7ree && typeof window.joplinApi_7ree.pushNote === 'function') {
                                window.joplinApi_7ree.pushNote(content)
                                     // .then(() =>console.log('内容已自动推送到Joplin API'))
                                     //.catch(err => console.error('自动推送到Joplin API失败:', err));
                            } else {
                                // console.log('joplinApi_7ree.pushNote方法不可用，尝试使用syncNotes');
                                // 如果pushNote不可用，退回到使用syncNotes方法
                                if (window.joplinApi_7ree && typeof window.joplinApi_7ree.syncNotes === 'function') {
                                    window.joplinApi_7ree.syncNotes()
                                         // .then(() =>console.log('内容已通过syncNotes自动推送到Joplin API'))
                                         //.catch(err => console.error('通过syncNotes自动推送到Joplin API失败:', err));
                                }
                            }
                        }, 500); // 延迟500ms，确保保存完成
                    } catch (err) {
                        // console.error('尝试推送到Joplin API失败:', err);
                    }
                } else {
                    // console.log('joplinApi_7ree未初始化或init方法不可用，尝试初始化');
                    if (typeof window.joplinApi_7ree === 'undefined') {
                        // console.warn('joplinApi_7ree对象未定义');
                        
                        // 通过发送消息请求脚本进行初始化
                        if (vscode) {
                            vscode.postMessage({
                                command: 'initJoplinApi',
                                editorInstance: editor_7ree
                            });
                            // console.log('已发送初始化Joplin API的请求');
                        }
                        
                        // 延迟尝试加载和初始化joplinApi_7ree
                        setTimeout(() => {
                            if (window.joplinApi_7ree && typeof window.joplinApi_7ree.init === 'function') {
                                window.joplinApi_7ree.init(editor_7ree, vscode);
                                // console.log('已延迟初始化joplinApi_7ree');
                            } else {
                                // console.error('无法延迟加载joplinApi_7ree');
                            }
                        }, 1000);
                    }
                }
            }
        }
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
        
        // 检查是否收到loadUISettings_7ree响应
        if (message.command === 'loadUISettings_7ree') {
            // 重置请求时间，表示已收到响应
            lastSettingsRequestTime_7ree = 0;
            
            // 立即应用UI设置，即使编辑器尚未创建，避免闪烁
            if (message.settings) {
                // 更新当前UI设置
                // console.log('收到UI设置', message.settings);
                currentUiSettings_7ree = { ...currentUiSettings_7ree, ...message.settings };
                
                // 立即预加载样式
                if (!preloadedEditorStyles_7ree) {
                    preloadEditorStyles_7ree();
                }
                
                // 立即应用样式，不论编辑器是否已创建
                applyEditorCustomStyles({
                    backgroundColor: currentUiSettings_7ree.backgroundColor,
                    color: currentUiSettings_7ree.color,
                    selectionBackground: currentUiSettings_7ree.selectionBackground
                });
            }
        }
        
        switch (message.command) {
            case 'loadNotes':
                // console.log('[WebView] Received message with command: loadNotes', message);
                
                // 在加载笔记前确保样式已预加载，避免闪烁
                if (!preloadedEditorStyles_7ree) {
                    preloadEditorStyles_7ree();
                }
                
                // 接收并显示笔记内容
                if (editor_7ree) {
                    // 在设置内容前确保编辑器样式已应用
                    const vscodeBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();
                    const isDarkTheme = document.body.classList.contains('vscode-dark');
                    const bgColor = currentUiSettings_7ree.backgroundColor || vscodeBgColor || (isDarkTheme ? '#1e1e1e' : '#ffffff');
                    
                    // 确保编辑器容器的背景色已设置
                    const editorContainer = document.getElementById('editor-container');
                    if (editorContainer) {
                        editorContainer.style.backgroundColor = bgColor;
                    }
                    
                    // 检查是否为云笔记标签，以及是否有useTemporaryContent标志
                    const isCloudNotesTag = message.fileId === 'cloud_notes_7ree';
                    const shouldUseTemporaryContent = isCloudNotesTag && message.useTemporaryContent === true;
                    
                    // 如果是云笔记标签且有临时缓存，优先使用临时缓存
                    if (shouldUseTemporaryContent && 
                        window.joplinApi_7ree && 
                        window.tempJoplinContent_7ree &&
                        window.tempJoplinContentTime_7ree && 
                        (Date.now() - window.tempJoplinContentTime_7ree < 30000)) {
                        
                        // console.log('---------------------------------------------');
                        // console.log('【云笔记加载】检测到临时Joplin内容，优先使用');
                        // console.log(`【云笔记加载】临时内容长度: ${window.tempJoplinContent_7ree.length}`);
                        // console.log(`【云笔记加载】临时内容获取时间: ${new Date(window.tempJoplinContentTime_7ree).toLocaleString()}`);
                        // console.log(`【云笔记加载】内容获取至今: ${Math.round((Date.now() - window.tempJoplinContentTime_7ree) / 1000)}秒前`);
                            
                        // 保存当前编辑器状态
                        const viewState = message.viewState || editor_7ree.saveViewState();
                            
                        // 使用临时缓存内容
                        isSettingContent_7ree = true;
                        editor_7ree.setValue(window.tempJoplinContent_7ree);
                        isSettingContent_7ree = false;
                        lastSavedContent = window.tempJoplinContent_7ree;
                            
                        // 恢复视图状态
                        if (viewState) {
                            try {
                                editor_7ree.restoreViewState(viewState);
                                // console.log('【云笔记加载】已使用保存的视图状态');
                            } catch (e) {
                                // console.error('【云笔记加载】恢复视图状态失败:', e);
                            }
                        }
                            
                        // 显示通知
                        showStatusMessage('已从临时Joplin缓存加载内容');
                        // console.log('【云笔记加载】用临时内容更新编辑器完成，现在清空临时变量');
                        
                        // 清空临时变量，避免过时内容在后续切换时被重复使用
                        window.tempJoplinContent_7ree = null;
                        window.tempJoplinContentTime_7ree = 0;
                        
                        // 如果joplinApi_7ree对象存在，同时清空其内部变量
                        if (window.joplinApi_7ree && typeof window.joplinApi_7ree.clearTempContent === 'function') {
                            window.joplinApi_7ree.clearTempContent();
                            // console.log('【云笔记加载】已通知joplinApi_7ree清空临时内容');
                        }
                        
                        // console.log('---------------------------------------------');
                    } else {
                        // 没有可用的临时内容或非云笔记标签，使用传入的文本内容
                        if (shouldUseTemporaryContent) {
                            // console.log('【云笔记加载】无可用临时内容，使用备用内容');
                        }
                            
                        // 使用message中的text内容
                        const text = message.text || '';
                        isSettingContent_7ree = true; // 标记开始设置内容
                        editor_7ree.setValue(text);
                        isSettingContent_7ree = false; // 标记结束设置内容
                        lastSavedContent = text;
                            
                        if (message.viewState) {
                            // console.log(`loadNotes: 使用保存的视图状态恢复编辑器位置`);
                            restoreEditorPosition(message); // 使用恢复逻辑
                        } else {
                            // 如果没有视图状态，则尝试恢复上次的位置或滚动到顶部
                            restoreEditorPosition(message); 
                        }
                    }
                    
                    setupFileChangeDetection(); // 设置文件变更检测
                }
                
                // 显示文件名和状态
                if (statusTextElement) {
                    statusTextElement.textContent = `加载成功: ${new Date().toLocaleTimeString()}`;
                }
                
                // 处理文件列表和活动文件ID
                currentOpenFileId_7ree = message.fileId || 'default_notes_7ree';
                window.currentOpenFileId_7ree = currentOpenFileId_7ree;
                // console.log(`接收loadNotes命令，当前文件ID: ${currentOpenFileId_7ree}`);
                
                // 处理UI设置
                if (message.settings) {
                    currentUISettings_7ree = message.settings;
                    
                    // 只有在编辑器已初始化时才应用设置
                    if (editor_7ree && window.settingsApi_7ree) {
                        // console.log('应用接收到的UI设置...');
                        window.settingsApi_7ree.updateSettings(currentUISettings_7ree);
                        window.settingsApi_7ree.applySettings();
                    } else {
                        // console.log('存储UI设置，编辑器初始化后将应用');
                        // 设置会存储在currentUISettings_7ree中，等编辑器初始化后再应用
                    }
                }
                
                // 渲染标签页
                if (message.files && message.files.length > 0) {
                    // 更新全局文件列表变量，确保在设置更新时可以使用
                    globalFiles = message.files;
                    globalActiveFileId = currentOpenFileId_7ree;
                    // console.log('【loadNotes】更新全局文件列表变量，文件数:', globalFiles.length);
                    
                    // 渲染标签
                    window.renderTabs(message.files, currentOpenFileId_7ree);
                }

                // 如果是云笔记，发送初始化Joplin API的消息
                if (isCloudNotesActive_7ree) {
                    // 先发送一个获取全局设置的请求，确保设置已加载
                    vscode.postMessage({
                        command: 'getGlobalSettings_7ree',
                        forceRefresh: true
                    });
                    
                    // console.log('【云笔记切换】已请求获取最新全局设置');
                    
                    // 然后延迟初始化Joplin API，确保设置已加载完成
                    setTimeout(() => {
                        if (vscode && editor_7ree) {
                            vscode.postMessage({
                                command: 'initJoplinApi',
                                editorInstance: true
                            });
                            // console.log('【云笔记切换】已发送初始化Joplin API消息，将从API获取最新内容');
                        }
                    }, 800); // 延迟发送，确保全局设置已加载
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
                        // console.warn(`文件检查错误: ${message.error}`);
                    }
                }
                break;
                
            case 'openFileResult':
                // 处理打开文件结果
                if (!message.success && message.error) {
                    showStatusMessage(message.error, true);
                }
                break;
                
            // 添加处理后台同步Joplin缓存的命令
            case 'syncJoplinBackground':
                // 处理后台同步Joplin缓存的请求
                // console.log('---------------------------------------------');
                // console.log('【后台同步】收到后台同步Joplin内容的请求');
                // console.log(`【后台同步】当前活动标签：${currentOpenFileId_7ree}`);
                // console.log(`【后台同步】是否为云笔记标签：${currentOpenFileId_7ree === 'cloud_notes_7ree'}`);
                
                // 输出当前Joplin配置状态
                if (window.currentSettings_7ree) {
                    // console.log(`【后台同步】Joplin配置状态：`);
                    // console.log(`- 服务器URL: ${window.currentSettings_7ree.joplinServerUrl_7ree ? '已设置' : '未设置'}`);
                    // console.log(`- Token: ${window.currentSettings_7ree.joplinToken_7ree ? '已设置' : '未设置'}`);
                    // console.log(`- 笔记ID: ${window.currentSettings_7ree.joplinNoteId_7ree ? '已设置' : '未设置'}`);
                } else {
                    // console.log(`【后台同步】Joplin配置状态：未初始化`);
                }
                // console.log('---------------------------------------------');
                
                // 使用延迟执行，确保全局设置已完全加载
                setTimeout(() => {
                    if (window.joplinApi_7ree && typeof window.joplinApi_7ree.syncCacheFile === 'function') {
                        // 执行后台同步，更新临时变量或缓存文件
                        // console.log('【后台同步】开始执行后台同步操作');
                        window.joplinApi_7ree.syncCacheFile()
                            .then((success) => {
                                if (success) {
                                    // console.log('【后台同步】Joplin内容同步成功');
                                } else {
                                    console.warn('【后台同步】Joplin内容同步未完全成功');
                                }
                            })
                            .catch((err) => {
                                console.error('【后台同步】Joplin内容同步失败:', err);
                            });
                    } else {
                        console.warn('【后台同步】joplinApi_7ree未初始化或syncCacheFile方法不可用');
                        // 尝试进行初始化
                        vscode.postMessage({
                            command: 'initJoplinApi',
                            editorInstance: true
                        });
                        // console.log('【后台同步】已请求初始化Joplin API');
                    }
                }, 600); // 延迟600毫秒执行，确保配置已加载
                break;
            
            case 'loadUISettings_7ree':
                // 接收UI设置
                if (message.settings) {
                    // console.log('webview.js收到loadUISettings_7ree消息:', JSON.stringify(message.settings));
                    // 重置最后一次设置请求时间
                    lastSettingsRequestTime_7ree = 0;
                    
                    // 更新全局设置对象
                    currentUiSettings_7ree = { ...message.settings };
                    
                    // 如果编辑器已初始化，直接应用设置
                    if (editor_7ree) {
                        // 应用字体和字号
                        if (currentUiSettings_7ree.fontFamily) editor_7ree.updateOptions({ fontFamily: currentUiSettings_7ree.fontFamily });
                        if (currentUiSettings_7ree.fontSize) editor_7ree.updateOptions({ fontSize: currentUiSettings_7ree.fontSize });
                        
                        // 应用背景色和文字颜色
                        applyEditorCustomStyles({
                            backgroundColor: currentUiSettings_7ree.backgroundColor,
                            color: currentUiSettings_7ree.color,
                            selectionBackground: currentUiSettings_7ree.selectionBackground
                        });
                    }
                    
                    // 不再直接调用settingsApi的更新方法，因为settings_api_7ree.js会自己处理这个消息
                    // 让settings_api_7ree.js有优先处理权
                }
                break;
                
            case 'showError':
                // 还原：使用弹窗显示错误消息
                showErrorMessage_7ree(message.message);
                break;
                
            case 'showErrorWithAction':
                // 还原：使用弹窗显示带操作的错误消息
                showErrorMessageWithAction_7ree(message.message, message.actionText, message.actionId);
                break;

            case 'showInfo':
                // 信息消息保持在状态栏显示，isError参数决定样式
                showStatusMessage(message.message, message.isError || false);
                break;

            case 'openSettings':
                // 收到打开设置对话框的消息
                // console.log('收到打开设置对话框的消息');
                openSettingsDialog_7ree(); // 直接调用优化后的函数
                break;
            
            case 'openSearch':
                // 收到打开搜索条的消息
                // console.log('收到打开搜索条的消息');
                openSearchBar_7ree();
                break;
                
            case 'joplinApiInitialized':
                // 处理Joplin API初始化响应
                if (message.success) {
                    // console.log('Joplin API初始化成功');
                    // 如果当前是云笔记标签，尝试同步
                    if (isCloudNotesActive_7ree) {
                        setTimeout(() => {
                            if (window.joplinApi_7ree && typeof window.joplinApi_7ree.syncNotes === 'function') {
                                // console.log('Joplin API初始化成功后尝试同步');
                                window.joplinApi_7ree.syncNotes()
                                    // .then(() => console.log('初始化后同步成功'))
                                    // .catch(err => console.error('初始化后同步失败:', err));
                            }
                        }, 500);
                    }
                } else {
                    console.error('Joplin API初始化失败:', message.error);
                    showStatusMessage(`Joplin API初始化失败: ${message.error || '未知错误'}`, true);
                }
                break;

            case 'initJoplinApi':
                // 处理初始化Joplin API的请求
                // // console.log('---------------------------------------------');
                // console.log('【API初始化】收到initJoplinApi请求处理');
                // console.log(`【API初始化】当前活动标签: ${currentOpenFileId_7ree}`);
                // console.log(`【API初始化】是否为云笔记标签: ${currentOpenFileId_7ree === 'cloud_notes_7ree'}`);
                
                // 先发送全局设置请求，确保配置正确
                vscode.postMessage({
                    command: 'getGlobalSettings_7ree',
                    forceRefresh: true
                });
                // console.log('【API初始化】已请求全局设置刷新');
                
                // 延迟执行初始化，确保全局设置已更新
                setTimeout(() => {
                    if (editor_7ree && window.joplinApi_7ree && typeof window.joplinApi_7ree.init === 'function') {
                        // console.log('【API初始化】开始初始化Joplin API组件');
                        try {
                            window.joplinApi_7ree.init(editor_7ree, vscode);
                            // console.log('【API初始化】Joplin API初始化成功');
                        } catch(err) {
                            console.error('【API初始化】初始化失败:', err);
                        }
                    } else {
                        console.warn('【API初始化】joplinApi_7ree组件未加载，尝试再次延迟');
                        
                        // 再次延迟尝试
                        setTimeout(() => {
                            if (window.joplinApi_7ree && typeof window.joplinApi_7ree.init === 'function') {
                                try {
                                    window.joplinApi_7ree.init(editor_7ree, vscode);
                                    // console.log('【API初始化】二次延迟Joplin API初始化成功');
                                } catch(err) {
                                    console.error('【API初始化】二次延迟初始化失败:', err);
                                }
                            } else {
                                console.error('【API初始化】joplinApi_7ree组件无法加载，请检查脚本引用');
                            }
                        }, 1000);
                    }
                }, 500);
                // console.log('---------------------------------------------');
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
            // console.log(`确认关闭标签: ${currentOpenFileId_7ree}`);
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
            // console.log(`确认关闭标签: ${fileToClose_7ree}`);
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

    // 获取可见文件列表，根据enableJoplin设置过滤
    function getVisibleFiles(files, currentSettings) {
        // 打印原始文件列表以进行调试
        // console.log('【获取可见文件】调用开始，原始文件列表:', JSON.stringify(files.map(f => ({id: f.id, name: f.name}))));
        
        // 确保settings对象存在
        if (!currentSettings) {
            // console.log('【获取可见文件】settings对象不存在，使用原始文件列表');
            return files;
        }
        
        // 详细打印enableJoplin_7ree的原始值和类型
        // console.log('【获取可见文件】enableJoplin_7ree原始值:',  currentSettings.enableJoplin_7ree);
        // console.log('【获取可见文件】enableJoplin_7ree类型:', typeof currentSettings.enableJoplin_7ree);
        
        // 确保正确判断字符串类型的布尔值
        let enableJoplin = false;
        if (typeof currentSettings.enableJoplin_7ree === 'string') {
            enableJoplin = currentSettings.enableJoplin_7ree.toLowerCase() === 'true';
            // console.log('【获取可见文件】从字符串转换得到enableJoplin:', enableJoplin);
        } else if (typeof currentSettings.enableJoplin_7ree === 'boolean') {
            enableJoplin = currentSettings.enableJoplin_7ree;
            // console.log('【获取可见文件】从布尔值转换得到enableJoplin:', enableJoplin);
        }
        
        // console.log('【获取可见文件】enableJoplin最终值:', enableJoplin);
        
        // 如果未启用Joplin云笔记，移除云笔记标签
        if (!enableJoplin) {
            const filteredFiles = files.filter(f => f.id !== 'cloud_notes_7ree');
            // console.log('【获取可见文件】移除云笔记后的文件列表:', JSON.stringify(filteredFiles.map(f => ({id: f.id, name: f.name}))));
            return filteredFiles;
        }
        
        // 启用Joplin云笔记，使用原始文件列表
        const hasCloudNotes = files.some(f => f.id === 'cloud_notes_7ree');
        // console.log('【获取可见文件】原始文件列表中是否包含云笔记:', hasCloudNotes);
        return files;
    }
    
    // 渲染文件标签 - 将其设为全局函数以确保在消息事件监听器中可以访问
    window.renderTabs = function(files, activeFileId) {
        // 确保 window.currentSettings_7ree 与 enableJoplin_7ree 字段存在
        if (!window.currentSettings_7ree) {
            window.currentSettings_7ree = {};
            // console.log('【标签渲染】创建了空的 window.currentSettings_7ree 对象');
        }
        
        // 打印完整的settings对象内容以进行调试
        // console.log('【标签渲染】currentSettings_7ree完整内容:', JSON.stringify(window.currentSettings_7ree, null, 2));
        
        // 确保 enableJoplin_7ree 字段存在，设置默认值为 'false'
        if (window.currentSettings_7ree.enableJoplin_7ree === undefined) {
            window.currentSettings_7ree.enableJoplin_7ree = 'false';
            // console.log('【标签渲染】设置了缺失的 enableJoplin_7ree=false');
        }
        
        // console.log('【标签渲染】window.currentSettings_7ree是否存在:', Boolean(window.currentSettings_7ree));
        // console.log('【标签渲染】enableJoplin_7ree的值:', window.currentSettings_7ree.enableJoplin_7ree);
        // console.log('【标签渲染】enableJoplin_7ree的类型:', typeof window.currentSettings_7ree.enableJoplin_7ree);
        
        // 在全局设置加载时才会过滤文件，此处只记录原始文件列表
        // console.log('【标签渲染】原始文件列表:', JSON.stringify(files.map(f => ({id: f.id, name: f.name}))));
        
        // 使用getVisibleFiles函数根据当前设置过滤文件列表
        let visibleFiles = getVisibleFiles(files, window.currentSettings_7ree);
        // console.log(`渲染标签，活动ID: ${activeFileId}，应用过滤后文件数量: ${visibleFiles.length}`);
        // @ts-ignore
        const fileTabsContainer = document.getElementById('file_tabs_container_7ree');
        if (!fileTabsContainer) return;
        fileTabsContainer.innerHTML = ''; 
        
        // 判断当前激活的文件是否为云笔记
        isCloudNotesActive_7ree = (activeFileId === 'cloud_notes_7ree');
        
        // 不再需要显示或隐藏同步按钮
        
        // 创建标签容器并添加到DOM
        const tabsElement = document.createElement('div');
        tabsElement.className = 'file-tabs_7ree';
        fileTabsContainer.appendChild(tabsElement);

        currentOpenFileId_7ree = activeFileId;

        visibleFiles.forEach(file => {
            const tab = document.createElement('div');
            tab.className = 'file-tab_7ree';
            if (file.id === activeFileId) {
                tab.classList.add('active_7ree');
            }
            tab.dataset.fileId = file.id;
            
            // 云笔记和默认备忘录都不可拖动
            if (file.id !== 'default_notes_7ree' && file.id !== 'cloud_notes_7ree') {
                tab.draggable = true;
                tab.classList.add('draggable_7ree');
            }
            
            tab.onclick = function(e) {
                if (e.target instanceof Element && !e.target.classList.contains('tab-close_7ree')) {
                    if (file.id === currentOpenFileId_7ree) return;
                    
                    // 如果是云笔记，先检查其可用性
                    if (file.id === 'cloud_notes_7ree') {
                        // 确保 window.currentSettings_7ree 与 enableJoplin_7ree 字段存在
                        if (!window.currentSettings_7ree || window.currentSettings_7ree.enableJoplin_7ree === undefined) {
                            // console.log('【标签点击】云笔记设置不存在，请求获取设置');
                            // 发送请求获取最新设置
                            vscode.postMessage({ command: 'getGlobalSettings_7ree' });
                            return;
                        }
                        
                        // 检查云笔记是否可用
                        let enableJoplin = false;
                        if (typeof window.currentSettings_7ree.enableJoplin_7ree === 'string') {
                            enableJoplin = window.currentSettings_7ree.enableJoplin_7ree.toLowerCase() === 'true';
                        } else if (typeof window.currentSettings_7ree.enableJoplin_7ree === 'boolean') {
                            enableJoplin = window.currentSettings_7ree.enableJoplin_7ree;
                        }
                        
                        // console.log(`【标签点击】检查云笔记可用性: ${enableJoplin}`);
                        
                        // 如果云笔记不可用，不执行切换
                        if (!enableJoplin) {
                            // console.log('【标签点击】云笔记不可用，忽略点击');
                            return;
                        }
                    }
                    
                    // 如果搜索框正在显示，则关闭它
                    if (searchBar_7ree && searchBar_7ree.style.display === 'block') {
                        hideSearchBar_7ree();
                        // console.log('切换标签时关闭搜索框');
                    }
                    
                    // 然后保存内容
                    saveCurrentContent(true); 
                    
                    // 最后通知扩展切换文件
                    // console.log(`点击标签，切换到文件: ${file.id}，已保存当前视图状态`);
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
            
            // 只有普通导入的文件才支持拖拽功能
            if (file.id !== 'default_notes_7ree' && file.id !== 'cloud_notes_7ree') {
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
                // 默认备忘录和云笔记都不能被放置
                if (draggedTab_7ree === null || draggedTab_7ree === file.id || file.id === 'default_notes_7ree' || file.id === 'cloud_notes_7ree') return;
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
                // 默认备忘录和云笔记都不能被放置
                if (draggedTab_7ree === null || draggedTab_7ree === file.id || file.id === 'default_notes_7ree' || file.id === 'cloud_notes_7ree') return;
                tab.classList.add('drag-over_7ree');
            });
            
            tab.addEventListener('dragleave', () => {
                tab.classList.remove('drag-over_7ree', 'drag-over-left_7ree', 'drag-over-right_7ree');
                if (dragTargetTab_7ree === file.id) dragTargetTab_7ree = null;
            });
            
            tab.addEventListener('drop', (e) => {
                e.preventDefault();
                // 默认备忘录和云笔记都不能被放置
                if (draggedTab_7ree === null || draggedTab_7ree === file.id || file.id === 'default_notes_7ree' || file.id === 'cloud_notes_7ree') {
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
            // 为默认备忘录和云笔记显示原始名称，为其他文件去掉扩展名
            const displayName = (file.id === 'default_notes_7ree' || file.id === 'cloud_notes_7ree') 
                ? file.name 
                : file.name.replace(/\.[^/.]+$/, '');
            nameSpan.textContent = displayName;
            nameSpan.className = 'tab-name_7ree';
            tab.appendChild(nameSpan);

            // 只有普通导入的文件才有关闭按钮
            if (file.id !== 'default_notes_7ree' && file.id !== 'cloud_notes_7ree') {
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
            tabsElement.appendChild(tab);
        });
        
        if (tabsElement && moreActionsButton_7ree && moreActionsButton_7ree.parentElement === tabsElement) {
             tabsElement.removeChild(moreActionsButton_7ree);
        }
        if (tabsElement && moreActionsButton_7ree) {
            tabsElement.appendChild(moreActionsButton_7ree);
        } else if (tabsElement && !moreActionsButton_7ree) {
            createMoreActionsButton_7ree();
        }

        const activeTabElement = tabsElement.querySelector(`.file-tab_7ree[data-file-id="${activeFileId}"]`);
        if (activeTabElement) {
            activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }

    // 新增：创建错误提示对话框
    function createErrorDialog_7ree(message, onClose) {
        // 如果已存在错误对话框，则先移除
        let existingDialog = document.getElementById('error_dialog_7ree');
        if (existingDialog) {
            document.body.removeChild(existingDialog);
        }
        
        // 创建对话框容器
        const dialogContainer = document.createElement('div');
        dialogContainer.id = 'error_dialog_7ree';
        dialogContainer.className = 'error-dialog_7ree'; // 用于CSS样式
        
        // 获取当前主题
        const isDarkTheme = document.body.classList.contains('vscode-dark') || 
                           !document.body.classList.contains('vscode-light');
        const themeFolder_7ree = isDarkTheme ? 'dark' : 'light';
        const SvgResourcesBaseUri_7ree = window.RESOURCES_BASE_URI_7ree || '';
        
        // 创建对话框内容
        dialogContainer.innerHTML = `
            <div class="error-dialog-content_7ree">
                <div class="error-header_7ree">
                    <img src="${SvgResourcesBaseUri_7ree}/icons/${themeFolder_7ree}/error.svg" class="error-icon_7ree" alt="错误">
                    <h3>错误</h3>
                </div>
                <p id="error_message_7ree">${message}</p>
                <div class="error-dialog-buttons_7ree">
                    <button id="error_ok_btn_7ree" class="primary-button_7ree">确定</button>
                </div>
            </div>
        `;
        
        // 添加到body
        document.body.appendChild(dialogContainer);
        
        // 获取按钮元素
        const okBtn = document.getElementById('error_ok_btn_7ree');
        
        // 添加按钮点击事件
        if (okBtn) {
            okBtn.onclick = () => {
            closeErrorDialog_7ree();
                if (typeof onClose === 'function') {
                    onClose();
                }
        };
        }
        
        // 添加键盘事件处理，使用捕获阶段保证无论焦点在哪里都能响应
        const keyHandler = (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                closeErrorDialog_7ree();
                if (typeof onClose === 'function') {
                    onClose();
                }
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
    function createErrorDialogWithAction_7ree(message, actionText, onAction, onClose) {
        // 如果已存在错误对话框，则先移除
        let existingDialog = document.getElementById('error_dialog_7ree');
        if (existingDialog) {
            document.body.removeChild(existingDialog);
        }
        
        // 创建对话框容器
        const dialogContainer = document.createElement('div');
        dialogContainer.id = 'error_dialog_7ree';
        dialogContainer.className = 'error-dialog_7ree'; // 用于CSS样式
        
        // 获取当前主题
        const isDarkTheme = document.body.classList.contains('vscode-dark') || 
                           !document.body.classList.contains('vscode-light');
        const themeFolder_7ree = isDarkTheme ? 'dark' : 'light';
        const SvgResourcesBaseUri_7ree = window.RESOURCES_BASE_URI_7ree || '';
        
        // 创建对话框内容
        dialogContainer.innerHTML = `
            <div class="error-dialog-content_7ree">
                <div class="error-header_7ree">
                    <img src="${SvgResourcesBaseUri_7ree}/icons/${themeFolder_7ree}/error.svg" class="error-icon_7ree" alt="错误">
                    <h3>错误</h3>
                </div>
                <p id="error_message_7ree">${message}</p>
                <div class="error-dialog-buttons_7ree">
                    <button id="error_cancel_btn_7ree">取消</button>
                    <button id="error_action_btn_7ree" class="primary-button_7ree">${actionText || '确定'}</button>
                </div>
            </div>
        `;
        
        // 添加到body
        document.body.appendChild(dialogContainer);
        
        // 获取按钮元素
        const actionBtn = document.getElementById('error_action_btn_7ree');
        const cancelBtn = document.getElementById('error_cancel_btn_7ree');
        
        // 添加操作按钮点击事件
        if (actionBtn) {
            actionBtn.onclick = () => {
            closeErrorDialog_7ree();
                if (typeof onAction === 'function') {
                    onAction();
                }
            };
        }
        
        // 添加取消按钮点击事件
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                closeErrorDialog_7ree();
                if (typeof onClose === 'function') {
                    onClose();
                }
            };
        }
        
        // 添加键盘事件处理，使用捕获阶段保证无论焦点在哪里都能响应
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                closeErrorDialog_7ree();
                if (typeof onAction === 'function') {
                    onAction();
                }
                return false;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeErrorDialog_7ree();
                if (typeof onClose === 'function') {
                    onClose();
                }
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
            
            // 可选：延迟后移除DOM元素，确保动画完成
            setTimeout(() => {
                if (dialog.parentNode) {
                    dialog.parentNode.removeChild(dialog);
                }
            }, 300);
        }
    }

    // 新增：显示错误提示
    function showErrorMessage_7ree(message, onClose) {
        return createErrorDialog_7ree(message, onClose);
    }

    // 新增：显示带操作的错误提示
    function showErrorMessageWithAction_7ree(message, actionText, actionId) {
        return createErrorDialogWithAction_7ree(
            message, 
            actionText, 
            () => {
                vscode.postMessage({ 
                    command: 'errorDialogAction',
                    actionId: actionId
                });
            },
            null
        );
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
            // console.log('开始关闭重命名对话框');
        const dialog = document.getElementById('rename_dialog_7ree');
            if (!dialog) {
                // console.log('对话框元素不存在，无需关闭');
                return;
            }
            
            // 先移除键盘事件监听器（如果存在）
            if (dialog._keyHandler) {
                try {
                document.removeEventListener('keydown', dialog._keyHandler, true);
                dialog._keyHandler = null;
                    // console.log('键盘事件监听器已移除');
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
                        // console.log('对话框从DOM中移除完成');
                    }
                } catch (removeErr) {
                    // console.error('从DOM移除对话框失败:', removeErr);
                    
                    // 如果移除失败，尝试隐藏它
                    try {
                        dialog.style.display = 'none';
                        // console.log('无法移除对话框，已设为不可见');
                    } catch (hideErr) {
                        // console.error('隐藏对话框也失败了:', hideErr);
                    }
                }
            }, 300); // 等待动画结束
            
            // 重置当前重命名的ID
            renamingTabId_7ree = null; 
            // console.log('重命名标签ID已重置');
        } catch (err) {
            // console.error('关闭对话框过程中发生未捕获的错误:', err);
            
            // 最后的挽救措施 - 直接尝试关闭所有可能的重命名对话框
            try {
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    dialog.style.display = 'none';
                    // console.log('通过紧急措施隐藏了对话框');
                }
                renamingTabId_7ree = null;
            } catch (finalErr) {
                // console.error('最终紧急措施也失败了:', finalErr);
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
                // console.log(`重命名标签 ${renamingTabId_7ree} 为 ${newName}`);
                vscode.postMessage({ 
                    command: 'renameTab', 
                    fileId: renamingTabId_7ree, 
                    newName: newName 
                });
            }
        }
        closeRenameDialog_7ree();
    }

    // 修改打开设置对话框的函数
    function openSettingsDialog_7ree() {
        // 直接调用settingsApi的openSettings方法，让它处理设置加载和对话框显示
        if (window.settingsApi_7ree && typeof window.settingsApi_7ree.openSettings === 'function') {
            // console.log('使用settingsApi_7ree.openSettings打开设置对话框');
            window.settingsApi_7ree.openSettings(currentUiSettings_7ree);
        } else {
            // console.error('设置API未加载');
            showStatusMessage('设置API未加载，无法打开设置', true);
            
            // 如果settingsApi不可用，尝试直接向VSCode请求设置
            try {
                vscode.postMessage({
                    command: 'getUISettings_7ree',
                    forceRefresh: true
                });
                // console.log('已发送getUISettings_7ree请求');
            } catch (e) {
                // console.error('请求设置失败:', e);
            }
        }
    }



    // 新增：检查外部文件是否有变动
    function checkFileChanged() {
        if (!currentOpenFileId_7ree) {
            // console.log('没有打开的文件，跳过检查');
            return;
        }

        // 获取当前编辑区内容
        const currentContent = editor_7ree ? editor_7ree.getValue() : '';
        
        // console.log(`检查外部文件变动: ${currentOpenFileId_7ree}`);
        
        // 调用VSCode扩展检查文件是否有变动
        postMessageToExtension('checkFileChanged', {
            fileId: currentOpenFileId_7ree,
            currentContent: currentContent
        });
    }
    
    // 新增：设置定时检查文件变化
    // 允许自定义检查间隔
    function setupFileChangeDetection(intervalSeconds) {
        // console.log('设置文件变化检测定时器');
        
        // 获取间隔时间（秒），默认30秒
        const interval = intervalSeconds || (currentUiSettings_7ree.autoSaveInterval || 30);
        const intervalMs = interval * 1000;
        
        // console.log(`使用自动保存间隔: ${interval}秒`);
        
        // 清除可能存在的前一个定时器
        if (fileCheckInterval_7ree) {
            clearInterval(fileCheckInterval_7ree);
        }
        
        // 设置新的定时器，按照指定间隔检查
        fileCheckInterval_7ree = setInterval(() => {
            // console.log(`定时器触发文件检查 (间隔: ${interval}秒)`);
            
            // 如果当前文本域内容与上次保存的内容相同，则检查文件是否有外部变动
            if (!editor_7ree || !currentOpenFileId_7ree) {
                return;
            }
            
            // 更新计时器
            const now = Date.now();
            if (lastEditTime_7ree > 0 && (now - lastEditTime_7ree < intervalMs)) {
                // console.log(`上次编辑时间距今 ${now - lastEditTime_7ree}ms，小于${interval}秒，跳过检查`);
                return;
            }
            
            // 如果最近指定间隔内没有编辑操作，检查外部文件是否变动
            checkFileChanged();
            
        }, intervalMs);
    }
    
    // 新增：处理外部文件更新
    function handleExternalFileUpdate(fileId, newContent) {
        // console.log(`处理外部文件更新: ${fileId}`);
        
        if (!editor_7ree) return;
        
        
        // 更新文本内容前先获取旧内容的大小
        const oldContent = editor_7ree.getValue();
        const oldSize = new TextEncoder().encode(oldContent).length;
        const newSize = new TextEncoder().encode(newContent).length;
        const sizeDiff = newSize - oldSize;
        
        // 更新文本内容
        editor_7ree.setValue(newContent);
        lastSavedContent = newContent; // 更新保存的内容，防止再次触发保存
        
        
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
        
        // console.log(`文件内容已从外部更新: ${fileId}`);
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



    // 修改：初始化搜索条
    function initSearchBar_7ree() {
        // console.log('初始化搜索条...');
        searchBar_7ree = document.getElementById('search_bar_7ree');
        searchInput_7ree = document.getElementById('search_input_7ree');
        const searchPrev = document.getElementById('search_prev_7ree');
        const searchNext = document.getElementById('search_next_7ree');
        const searchClose = document.getElementById('search_close_7ree');
        searchMatches_7ree = document.getElementById('search_matches_7ree');
        
        if (!searchBar_7ree || !searchInput_7ree || !searchMatches_7ree) {
            // console.error('搜索条元素未找到', {
            //     bar: !!searchBar_7ree,
            //     input: !!searchInput_7ree,
            //     matches: !!searchMatches_7ree
            // });
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
        
        // console.log('搜索条初始化完成');
    }

    // 打开搜索条函数
    function openSearchBar_7ree() {
        // console.log('尝试打开搜索条');
        if (!searchBar_7ree) {
            searchBar_7ree = document.getElementById('search_bar_7ree');
            if (!searchBar_7ree) {
                // // console.error('搜索条元素不存在');
                return;
            }
        }
        
        if (!searchInput_7ree) {
            searchInput_7ree = document.getElementById('search_input_7ree');
        }
        
        // 显示搜索条
        searchBar_7ree.style.display = 'block';
        // console.log('搜索条已显示');
        
        // 检查编辑器中是否有选中的文本
        if (editor_7ree) {
            const selection = editor_7ree.getSelection();
            if (selection && !selection.isEmpty()) {
                const selectedText = editor_7ree.getModel().getValueInRange(selection);
                if (selectedText && selectedText.trim() && searchInput_7ree) {
                    searchInput_7ree.value = selectedText.trim();
                    // console.log(`已将选中文本 "${selectedText.trim()}" 填充到搜索框`);
                }
            }
        }
        
        // 聚焦搜索输入框
        if (searchInput_7ree) {
            setTimeout(() => {
                searchInput_7ree.focus();
                searchInput_7ree.select(); // 选中已填充的文本
                // console.log('搜索输入框已聚焦');
            }, 50);
            
            // 如果有输入内容，立即执行搜索
            if (searchInput_7ree.value.trim()) {
                performSearch();
            }
        }
    }

    // 隐藏搜索条函数
    function hideSearchBar_7ree() {
        // console.log('尝试隐藏搜索条');
        if (!searchBar_7ree) {
            searchBar_7ree = document.getElementById('search_bar_7ree');
            if (!searchBar_7ree) {
                // // console.error('搜索条元素不存在');
                return;
            }
        }
        
        searchBar_7ree.style.display = 'none';
        clearSearch();
        // console.log('搜索条已隐藏');
        
        // 返回焦点到编辑器
        if (editor_7ree) {
            editor_7ree.focus();
        }
    }

    // 清除搜索高亮
    function clearSearch() {
        // console.log('清除搜索高亮');
        if (!editor_7ree) {
            // console.warn('编辑器实例不存在，无法清除搜索高亮');
            return;
        }
        
        try {
            // 获取当前所有装饰
            const model = editor_7ree.getModel();
            if (!model) {
                // console.warn('编辑器模型不存在，无法清除搜索高亮');
                return;
            }
            
            const decorations = model.getAllDecorations()
                .filter(d => d.options.className === 'search-match_7ree' || d.options.className === 'search-match-current_7ree')
                .map(d => d.id);
            
            if (decorations.length > 0) {
                editor_7ree.deltaDecorations(decorations, []);
                // console.log(`已清除 ${decorations.length} 个搜索高亮`);
            }
            
            // 重置搜索状态
            currentSearchMatch_7ree = 0;
            totalSearchMatches_7ree = 0;
            searchDecorations_7ree = [];
            
            if (searchMatches_7ree) {
                searchMatches_7ree.textContent = '0/0';
            }
        } catch (e) {
            // console.error('清除搜索高亮时出错:', e);
        }
    }

    // 应用所有搜索高亮
    function applyAllSearchDecorations_7ree() {
        if (!editor_7ree) return;

        // 清除旧的搜索高亮
        if (searchDecorations_7ree && searchDecorations_7ree.length > 0) {
            editor_7ree.deltaDecorations(searchDecorations_7ree, []);
            // console.log(`已清除 ${searchDecorations_7ree.length} 个旧搜索高亮`);
        }
        searchDecorations_7ree = []; // 重置

        if (searchMatchesList_7ree.length === 0) {
            // console.log('没有匹配项，不应用高亮');
            return;
        }

        const newDecorations = searchMatchesList_7ree.map((matchRange, index) => {
            const className = (index === currentSearchMatch_7ree) ? 'search-match-current_7ree' : 'search-match_7ree';
            return { range: matchRange, options: { className: className } };
        });

        if (newDecorations.length > 0) {
            searchDecorations_7ree = editor_7ree.deltaDecorations([], newDecorations);
            // console.log(`已应用 ${searchDecorations_7ree.length} 个新搜索高亮，当前高亮索引: ${currentSearchMatch_7ree}`);
        }
    }

    // 执行搜索的函数
    function performSearch() {
        // console.log('执行搜索');
        
        if (!editor_7ree || !searchInput_7ree) {
            // console.warn('编辑器或搜索输入框不存在，无法执行搜索');
            clearSearch(); // 确保在无法搜索时清除状态
            return;
        }
        
        const searchTerm = searchInput_7ree.value.trim();
        // 先清除之前的搜索结果和高亮，无论是否有新的搜索词
        clearSearch(); 

        if (!searchTerm) {
            // console.log('搜索词为空，已清除搜索状态');
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
                // console.warn('编辑器模型不存在，无法执行搜索');
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
            // console.log(`找到 ${totalSearchMatches_7ree} 个匹配项`);
            
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
            // console.error('执行搜索时出错:', e);
            clearSearch(); // 出错时也清除状态
             if (searchMatches_7ree) { // 并更新显示
                searchMatches_7ree.textContent = '0/0';
            }
        }
    }

    // 跳转到指定匹配项
    function navigateToMatch(targetIndex) { // 移除 matches 参数
        // console.log(`请求导航到索引: ${targetIndex}, 当前索引: ${currentSearchMatch_7ree}, 总匹配数: ${totalSearchMatches_7ree}`);
        
        if (!editor_7ree) {
            // console.warn('编辑器实例不存在，无法导航到匹配项');
            return;
        }
        
        if (totalSearchMatches_7ree === 0) {
            // console.warn('没有匹配项，无法导航');
            return;
        }
        
        // 处理循环索引
        let newIndex = targetIndex;
        if (newIndex < 0) {
            newIndex = totalSearchMatches_7ree - 1; // 循环到最后一个
            // console.log(`索引小于0，实际导航到: ${newIndex} (即第 ${newIndex + 1} 个)`);
        } else if (newIndex >= totalSearchMatches_7ree) {
            newIndex = 0; // 循环到第一个
            // console.log(`索引超出范围，实际导航到: ${newIndex} (即第 ${newIndex + 1} 个)`);
        }
        
        currentSearchMatch_7ree = newIndex; // 更新当前匹配索引
        
        try {
            applyAllSearchDecorations_7ree(); // 重新应用所有高亮（包括当前和非当前）
            
            if (searchMatchesList_7ree[currentSearchMatch_7ree]) {
                 editor_7ree.revealRangeInCenter(searchMatchesList_7ree[currentSearchMatch_7ree]);
                 // console.log(`已滚动到匹配项 ${currentSearchMatch_7ree + 1}`);
            } else {
                // console.warn(`无法滚动到索引 ${currentSearchMatch_7ree}，searchMatchesList_7ree 中可能不存在该项`);
            }
            
            updateMatchDisplay(); // 更新匹配计数显示
        } catch (e) {
            // console.error('导航到匹配项时出错:', e);
        }
    }

    // 更新匹配显示
    function updateMatchDisplay() {
        // console.log('更新匹配显示');
        if (!searchMatches_7ree) {
            searchMatches_7ree = document.getElementById('search_matches_7ree');
            if (!searchMatches_7ree) {
                // console.warn('匹配显示元素不存在');
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

    // 下一个匹配
    function nextMatch() {
        // console.log('查找下一个匹配');
        if (totalSearchMatches_7ree === 0) {
            // console.log('没有匹配项，不执行跳转');
            return;
        }
        // navigateToMatch 会处理循环和边界情况
        navigateToMatch(currentSearchMatch_7ree + 1); 
    }

    // 上一个匹配
    function prevMatch() {
        // console.log('查找上一个匹配');
        if (totalSearchMatches_7ree === 0) {
            // console.log('没有匹配项，不执行跳转');
            return;
        }
        // navigateToMatch 会处理循环和边界情况
        navigateToMatch(currentSearchMatch_7ree - 1);
    }

    // 转义正则表达式特殊字符
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
                // 收到打开搜索条的消息
                // console.log('收到打开搜索条的消息');
                openSearchBar_7ree();
                break;
            
            case 'testJoplinSettings':
                // 接收测试设置，临时存储但不写入主设置
                if (message.settings) {
                    // console.log('收到Joplin测试设置');
                    // 可以在这里缓存这些设置其他操作使用
                }
                break;
                
            case 'testJoplinConnection':
                // 测试Joplin连接
                if (window.joplinApi_7ree && window.joplinApi_7ree.testConnection) {
                    // 直接使用消息中的表单参数，而不是使用settings对象
                    // console.log('🔴🔴🔴 [修复bug] 测试Joplin连接，使用表单参数:', {
                    //     apiUrl: message.serverUrl,
                    //     token: message.token ? '已提供令牌' : '未提供',
                    //     noteId: message.noteId
                    // });
                    
                    // 为了确保可以捕获到joplin_api_7ree.js的测试结果，添加多种监听器
                    try {
                        // 方式1：消息事件监听
                        const messageHandler = function handleJoplinResponse(evt) {
                            if (evt.data && evt.data.command === 'joplinTestResponse') {
                                // console.log('🔴🔴🔴 [修复bug] 方式1捕获到Joplin API的joplinTestResponse消息:', evt.data);
                                
                                // 立即转发消息到extension.js
                                vscode.postMessage({
                                    command: 'joplinTestResponse',
                                    success: evt.data.success,
                                    error: evt.data.error || '',
                                    data: evt.data.data
                                });
                                
                                // 处理完成后移除事件监听器
                                window.removeEventListener('message', messageHandler);
                                // 清除其他所有的消息监听器
                                clearTimeout(timeoutId);
                                window.removeEventListener('joplinTestResponseEvent', customEventHandler);
                            }
                        };
                        window.addEventListener('message', messageHandler);
                        
                        // 方式2：自定义事件监听
                        const customEventHandler = function(evt) {
                            // console.log('🔴🔴🔴 [修复bug] 方式2捕获到自定义事件joplinTestResponseEvent:', evt.detail);
                            
                            if (evt.detail && evt.detail.command === 'joplinTestResponse') {
                                // 转发消息到extension.js
                                vscode.postMessage({
                                    command: 'joplinTestResponse',
                                    success: evt.detail.success,
                                    error: evt.detail.error || '',
                                    data: evt.detail.data
                                });
                                
                                // 清除监听器
                                window.removeEventListener('joplinTestResponseEvent', customEventHandler);
                                window.removeEventListener('message', messageHandler);
                                clearTimeout(timeoutId);
                            }
                        };
                        window.addEventListener('joplinTestResponseEvent', customEventHandler);
                        
                        // 设置超时处理，为了确保不会永久监听
                        const timeoutId = setTimeout(() => {
                            // console.log('🔴🔴🔴 [修复bug] 消息捕获超时，移除程序临时添加的消息监听器');
                            window.removeEventListener('message', messageHandler);
                            window.removeEventListener('joplinTestResponseEvent', customEventHandler);
                        }, 10000); // 10秒超时
                        
                        // 正常调用测试功能
                        window.joplinApi_7ree.testConnection({
                            apiUrl: message.serverUrl,  // 使用直接从表单传递的URL
                            token: message.token,       // 使用直接从表单传递的token
                            noteId: message.noteId      // 使用直接从表单传递的noteId
                        });
                    } catch (err) {
                        // console.error('🔴🔴🔴 [修复bug] 测试Joplin连接时出错:', err);
                        // 向扩展发送测试失败消息
                        vscode.postMessage({
                            command: 'joplinTestResponse',
                            success: false,
                            error: '测试过程出错: ' + (err.message || err)
                        });
                    }
                } else {
                    // console.log('🔴🔴🔴 [修复bug] Joplin API未初始化，正在尝试加载...');
                    // 尝试动态加载joplinApi_7ree模块
                    loadJoplinApi_7ree().then(() => {
                        // console.log('🔴🔴🔴 [修复bug] Joplin API模块已加载，现在测试连接');
                        // 加载成功后重试测试连接
                        if (window.joplinApi_7ree && window.joplinApi_7ree.testConnection) {
                            // 为了确保消息能正确传递到extension.js，我们需要注册joplinTestResponse事件处理程序
                            window.addEventListener('message', function handleJoplinResponse(evt) {
                                if (evt.data && evt.data.command === 'joplinTestResponse') {
                                    // console.log('🔴🔴🔴 [修复bug] 捕获到Joplin API发送的joplinTestResponse消息:', evt.data);
                                    
                                    // 立即转发消息到extension.js
                                    vscode.postMessage({
                                        command: 'joplinTestResponse',
                                        success: evt.data.success,
                                        error: evt.data.error || '',
                                        data: evt.data.data
                                    });
                                    
                                    // 处理完成后移除消息监听器
                                    window.removeEventListener('message', handleJoplinResponse);
                                }
                            });
                            
                            // 调用测试功能
                            window.joplinApi_7ree.testConnection({
                                apiUrl: message.serverUrl,
                                token: message.token,
                                noteId: message.noteId
                            });
                        } else {
                            // console.error('🔴🔴🔴 [修复bug] 加载Joplin API后仍未初始化');
                            // 向扩展发送测试失败消息
                            vscode.postMessage({
                                command: 'joplinTestResponse',
                                success: false,
                                error: 'Joplin API测试模块无法加载'
                            });
                        }
                    }).catch(err => {
                        // console.error('🔴🔴🔴 [修复bug] 加载Joplin API失败:', err);
                        // 向扩展发送测试失败消息
                        vscode.postMessage({
                            command: 'joplinTestResponse',
                            success: false,
                            error: 'Joplin API测试模块加载失败: ' + (err.message || err)
                        });
                    });
                }
                break;
                
            // 用于保存最近的Joplin测试状态
            case 'checkJoplinTestStatus':
                // extension.js在超时前发送的最后状态检查命令
                // console.log('🔴🔴🔴 [修复bug] 收到checkJoplinTestStatus命令，检查测试状态');
                
                // 如果有最近的测试结果，直接发送给extension.js
                if (window._lastJoplinTestResult) {
                    // console.log('🔴🔴🔴 [修复bug] 找到缓存的测试结果，发送给extension.js');
                    vscode.postMessage({
                        command: 'joplinTestResponse',
                        success: window._lastJoplinTestResult.success,
                        error: window._lastJoplinTestResult.error || '',
                        data: window._lastJoplinTestResult.data 
                    });
                } else {
                    // console.log('🔴🔴🔴 [修复bug] 未找到缓存的测试结果');
                }
                break;
                
            case 'joplinTestResult':
                // 测试Joplin连接的响应结果
                // console.log('🔴🔴🔴 [修复测试连接bug] 收到joplinTestResult消息:', message);
                
                // 保存最近的测试结果(在内存中)
                window._lastJoplinTestResult = {
                    success: message.success,
                    error: message.error,
                    data: message.data,
                    timestamp: Date.now()
                };
                
                // 创建自定义事件传递给settings_api中的测试按钮点击处理程序
                const resultEvent = new CustomEvent('joplinTestResponse', {
                    detail: {
                        success: message.success,
                        error: message.error,
                        data: message.data
                    }
                });
                
                // 分发事件
                window.dispatchEvent(resultEvent);
                
                // 值得注意的是，我们在settings_api_7ree.js中注册了这个事件的监听器
                // console.log('🔴🔴🔴 [修复测试连接bug] 已分发joplinTestResponse事件');
                break;
                
            case 'getContent':
                // 获取当前编辑器内容用于备份
                if (message.for === 'backup' && editor_7ree) {
                    const currentFileId = currentOpenFileId_7ree || currentFileId_7ree;
                    const content = editor_7ree.getValue();
                    
                    // 将内容发送回扩展以进行备份
                    postMessageToExtension('contentForBackup', {
                        fileId: currentFileId,
                        content: content
                    });
                    // console.log('已发送当前内容用于备份');
                }
                break;
                
            case 'showBackupSuccess':
                // 显示备份成功消息
                if (message.message) {
                    showStatusMessage(message.message);
                    
                    // 显示视觉反馈
                    const backupButton = document.getElementById('backup_button_7ree');
                    if (backupButton) {
                        backupButton.classList.add('backup-success_7ree');
                        setTimeout(() => {
                            backupButton.classList.remove('backup-success_7ree');
                        }, 1000); // 1秒后移除样式
                    }
                }
                break;
                // 测试Joplin连接
                if (window.joplinApi_7ree && window.joplinApi_7ree.testConnection) {
                    // 直接使用消息中的表单参数，而不是使用settings对象
                    // console.log('测试Joplin连接，使用表单参数:', {
                    //     apiUrl: message.serverUrl,
                    //     token: message.token ? '****' : '未提供',
                    //     noteId: message.noteId
                    // });
                    
                    // 直接传递表单参数
                    window.joplinApi_7ree.testConnection({
                        apiUrl: message.serverUrl,  // 使用直接从表单传递的URL
                        token: message.token,       // 使用直接从表单传递的token
                        noteId: message.noteId      // 使用直接从表单传递的noteId
                    });
                } else {
                    // console.error('Joplin API未初始化');
                    // 向扩展发送测试失败消息
                    vscode.postMessage({
                        command: 'joplinTestResponse',
                        success: false,
                        error: 'Joplin API测试模块未初始化'
                    });
                }
                break;
                
            case 'joplinTestResult':
                // 转发测试结果到设置对话框
                // console.log('收到Joplin测试结果，转发到设置对话框:', message.success);
                // 使用事件触发通知设置对话框
                const joplinTestResultEvent = new CustomEvent('joplinTestResult', { 
                    detail: { 
                        success: message.success,
                        error: message.error || '',
                        data: message.data 
                    } 
                });
                window.dispatchEvent(joplinTestResultEvent);
                break;
                
            // 移除syncJoplinBackground case
                
            // ... existing code ...
        }
    });

    // ... existing code ...

    // 确保全局函数已赋值
    if (typeof initJoplinAPI !== 'function') {
        // 定义初始化Joplin API的函数
        window.initJoplinAPI = function(editor, vscode) {
            // console.log('全局初始化Joplin API');
            if (window.joplinApi_7ree && typeof window.joplinApi_7ree.init === 'function') {
                window.joplinApi_7ree.init(editor, vscode);
                return true;
            } else {
                // console.error('joplinApi_7ree不可用，无法初始化');
                return false;
            }
        };
    }
}); 

// 加载 Joplin API 模块
function loadJoplinApi_7ree() {
    return new Promise((resolve, reject) => {
        // 如果已经加载，直接返回
        if (window.joplinApi_7ree && typeof window.joplinApi_7ree.testConnection === 'function') {
            // console.log('Joplin API模块已经加载，直接返回');
            return resolve(window.joplinApi_7ree);
        }

        // 动态加载Joplin API脚本
        // console.log('开始动态加载Joplin API模块...');
        const script = document.createElement('script');
        script.onload = function() {
            // console.log('Joplin API脚本加载成功');
            // 初始化API
            if (window.joplinApi_7ree && typeof window.joplinApi_7ree.init === 'function') {
                window.joplinApi_7ree.init(editor_7ree, vscode);
                // console.log('Joplin API初始化成功');
                resolve(window.joplinApi_7ree);
            } else {
                const error = new Error('Joplin API脚本已加载但模块未正确初始化');
                // console.error(error);
                reject(error);
            }
        };
        script.onerror = function(e) {
            const error = new Error('加载Joplin API脚本失败');
            // console.error(error, e);
            reject(error);
        };
        
        // 设置脚本路径
        script.src = 'joplin_api_7ree.js';
        document.head.appendChild(script);
    });
}

// 加载笔记内容
/* 😱😱😱😱😱😱😱😱😱😱😱这个函数好像没有用？？？
function loadNotes(message) {
    
    try {
        // 在加载笔记前确保样式已预加载，避免闪烁
        if (!preloadedEditorStyles_7ree) {
            preloadEditorStyles_7ree();
        }
        
        // 处理文件列表和活动文件ID
        currentOpenFileId_7ree = message.fileId || 'default_notes_7ree';
        window.currentOpenFileId_7ree = currentOpenFileId_7ree;
        // console.log(`接收loadNotes命令，当前文件ID: ${currentOpenFileId_7ree}`);
        
        // 应用UI设置，如果有的话
        if (message.settings) {
            try {
                // 先应用UI设置，因为这会影响后续的编辑器创建和渲染
                applyAndSaveUISettings_7ree(message.settings);
                
                // 立即应用样式，不论编辑器是否已创建
                applyEditorCustomStyles({
                    backgroundColor: currentUiSettings_7ree.backgroundColor,
                    color: currentUiSettings_7ree.color,
                    selectionBackground: currentUiSettings_7ree.selectionBackground
                });
            } catch (settingsError) {
                // console.error('应用UI设置失败:', settingsError);
            }
        } else {
            // 即使没有特定的UI设置，仍然需要确保编辑器容器有正确的背景色
            const vscodeBgColor = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();
            const isDarkTheme = document.body.classList.contains('vscode-dark');
            const bgColor = currentUiSettings_7ree.backgroundColor || vscodeBgColor || (isDarkTheme ? '#1e1e1e' : '#ffffff');
            
            // 确保编辑器容器的背景色已设置
            const editorContainer = document.getElementById('editor-container');
            if (editorContainer) {
                editorContainer.style.backgroundColor = bgColor;
            }
        }
        
        isCloudNotesActive_7ree = currentOpenFileId_7ree === 'cloud_notes_7ree';
        const fileContent = message.text || '';
        
        updateFileList(message.files || []);
        
        if (isSettingContent_7ree) {
            // console.warn('正在设置内容中，跳过loadNotes');
            return;
        }

        isSettingContent_7ree = true;
        
        if (!editor_7ree) {
            // console.log('编辑器实例不存在，将创建一个新实例');
            initMonacoEditor_7ree();
        }
        
        // 设置编辑器内容
        if (editor_7ree) {
            const model = editor_7ree.getModel();
            if (model) {
                // 保存之前的内容，用于检测文档是否已改变
                // const previousContent = model.getValue();
                
                // 将内容设置到编辑器
                model.setValue(fileContent);
                // console.log(`已设置编辑器内容，长度: ${fileContent.length}`);
                lastSavedContent = fileContent;
                
                // 恢复滚动位置和状态
                const viewState = message.viewState;

                if (viewState) {
                    restoreEditorPosition({ viewState });
                } else if (anchorTextByFileId_7ree[currentOpenFileId_7ree]) {
                    restoreScrollPositionByAnchorText_7ree(currentOpenFileId_7ree, anchorTextByFileId_7ree[currentOpenFileId_7ree]);
                } else {
                    // console.log('无有效的位置信息，将光标设置到文件开头');
                    editor_7ree.setPosition({ lineNumber: 1, column: 1 });
                    editor_7ree.revealLineInCenter(1);
                }
            } else {
                // console.error('Monaco编辑器模型不存在');
            }
        }
        
        isSettingContent_7ree = false;
        isInitialized_7ree = true;
        
        // 初始化状态栏
        const statusElement = document.getElementById('status_7ree');
        if (statusElement) {
            statusElement.textContent = '';
        }
        
        // 设置文档标题
        if (currentOpenFileId_7ree === 'default_notes_7ree') {
            document.title = '备忘录';
        } else if (currentOpenFileId_7ree === 'cloud_notes_7ree') {
            document.title = '云笔记';
        } else {
            const file = message.files?.find(f => f.id === currentOpenFileId_7ree);
            if (file) {
                document.title = file.name;
            }
        }
        
        // 如果是云笔记，发送初始化Joplin API的消息，触发从API获取最新内容
        if (isCloudNotesActive_7ree) {
            // 先发送一个获取全局设置的请求，确保设置已加载
            vscode.postMessage({
                command: 'getGlobalSettings_7ree',
                forceRefresh: true
            });
            
            // console.log('【云笔记切换】已请求获取最新全局设置');
            
            // 然后延迟初始化Joplin API，确保设置已加载完成
            setTimeout(() => {
                if (vscode && editor_7ree) {
                    vscode.postMessage({
                        command: 'initJoplinApi',
                        editorInstance: true
                    });
                    // console.log('【云笔记切换】已发送初始化Joplin API消息，将从API获取最新内容');
                }
            }, 800); // 延迟发送，确保全局设置已加载
        }
    } catch (e) {
        // console.error('处理loadNotes消息时出错:', e);
        isSettingContent_7ree = false;
    }
}

😱😱😱😱😱😱😱😱😱😱😱😱😱😱😱😱*/

// 保存当前滚动位置
function saveScrollPosition() {
    if (!editor_7ree || !currentOpenFileId_7ree) {
        // console.warn('无法保存滚动位置：编辑器或文件ID不可用');
        return;
    }
    
    // 确保编辑器有一个有效的模型
    if (!editor_7ree.getModel()) {
        // console.warn('无法保存滚动位置：编辑器模型不可用');
        return;
    }
    
    // 保存编辑器视图状态（包含滚动位置、光标位置等完整信息）
    const viewState = editor_7ree.saveViewState();
    
    // 验证视图状态是否有效
    if (!viewState || !viewState.viewState) {
        // console.warn('视图状态不完整或无效，保存取消');
        return;
    }
    

    // console.log('使用Monaco编辑器的原生视图状态保存机制');
    
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
        // console.warn('Monaco编辑器实例不存在，无法恢复位置');
        return;
    }
    
    // console.log('正在尝试恢复编辑器位置...');
    
    // 使用视图状态进行精确恢复
    if (message.viewState) {
        try {
            // 确保编辑器模型已加载并且稳定，使用延迟恢复
            setTimeout(() => {
                try {
                    const viewState = JSON.parse(message.viewState);
                    // console.log('使用保存的视图状态进行精确恢复');

                    
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
                            
                            // console.log(`恢复状态检查 - 期望行: ${expectedLine}, 实际行: ${actualLine}`);
                            
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
                                    //console.log(`已强制设置滚动位置到行 ${expectedLine}`);
                                }, 100);
                            } else {
                                // console.log('视图状态恢复成功，位置匹配');
                            }
                        }, 200); // 增加延迟时间到200ms
                    } else {
                        // console.error('编辑器模型不可用，无法恢复状态');
                        // 基础回退机制
                        // @ts-ignore
                        editor_7ree.revealPosition(new monaco.Position(1, 1));
                    }
                } catch (innerError) {
                    // console.error('在延迟过程中恢复视图状态失败:', innerError);
                    // 基础回退机制
                    // @ts-ignore
                    editor_7ree.revealPosition(new monaco.Position(1, 1));
                }
            }, 400); // 增加延迟时间到400ms确保编辑器已完全初始化
            
            return;
        } catch (error) {
            // console.error('恢复视图状态失败，将尝试使用回退方法:', error);
        }
    }
    
    // 基础回退机制 - 使用行号1显示文档开头
    // console.log('无法恢复精确滚动位置，将显示文档开头');
    // @ts-ignore
    editor_7ree.revealPosition(new monaco.Position(1, 1));
}



// 保存笔记内容
function saveNotes() {
    // 如果还未初始化或正在设置内容，不进行保存
    if (!isInitialized_7ree || isSettingContent_7ree) {
        // console.log('跳过保存: 初始化状态=' + isInitialized_7ree + ', 设置内容状态=' + isSettingContent_7ree);
        return;
    }
    
    if (!editor_7ree) {
        // console.warn('Monaco编辑器实例不存在，无法保存内容');
        return;
    }
    
    // 获取内容
    const noteContent = editor_7ree.getValue();
    
    
    
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

// 全局变量保存文件列表和当前活动文件ID
let globalFiles = [];
let globalActiveFileId = 'default_notes_7ree';

// 更新文件列表
function updateFileList(files) {
    if (!files || !files.length) {
        // console.warn('更新文件列表: 接收到空文件列表');
        return;
    }
    
    // 保存文件列表到全局变量
    globalFiles = files;
    globalActiveFileId = currentOpenFileId_7ree || 'default_notes_7ree';
    
    // 查找标签容器
    const fileTabsContainer = document.getElementById('file_tabs_container_7ree');
    if (!fileTabsContainer) {
        // console.error('更新文件列表: 找不到标签容器元素');
        return;
    }
    
    // console.log(`更新文件列表: 文件数量 ${files.length}, 当前活动ID: ${globalActiveFileId}`);
    
    // 使用getVisibleFiles过滤文件列表，确保只显示云笔记可用时的云笔记标签
    const visibleFiles = getVisibleFiles(files, window.currentSettings_7ree);
    // console.log(`更新文件列表: 过滤后文件数量 ${visibleFiles.length}`);
    
    window.renderTabs(visibleFiles, globalActiveFileId);
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
    function showStatusMessage(message, isError = false) {
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
            // console.error('状态栏显示失败:', err);
        }
    }
    
    // 使用事件委托监听对话框内的所有点击事件
    dialogContainer.addEventListener('click', function(e) {
        // console.log('对话框区域被点击:', e.target);
        
        // 修复：正确处理e.target，确保它是HTMLElement
        const target = e.target;
        if (!(target instanceof HTMLElement)) {
            // console.log('点击对象不是HTMLElement，无法处理');
            return;
        }
        
        // 使用更安全的方式检查按钮身份
        // 检查点击的是否是取消按钮
        if (target.id === 'rename_cancel_btn_7ree' || 
            (target.dataset && target.dataset.action === 'cancel')) {
            // console.log('取消按钮被点击 (事件委托)');
            // showStatusMessage('点击了取消按钮');
            try {
                // 直接内联关闭对话框的逻辑
                // console.log('尝试关闭对话框...');
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    // 移除键盘事件监听
                    try {
                        if (dialog._keyHandler) {
                            document.removeEventListener('keydown', dialog._keyHandler, true);
                        }
                    } catch (listenerErr) {
                        // console.error('移除键盘监听器失败:', listenerErr);
                    }
                    
                    // 移除可见性
                    dialog.classList.remove('visible_7ree');
                    // console.log('对话框可见性已关闭');
                    
                    // 延迟从DOM移除
                    setTimeout(() => {
                        try {
                            if (dialog.parentNode) {
                                dialog.parentNode.removeChild(dialog);
                                // console.log('对话框从DOM中移除完成');
                            }
                        } catch (removeErr) {
                            // console.error('从DOM移除对话框失败:', removeErr);
                            try {
                                dialog.style.display = 'none';
                            } catch (hideErr) {
                                // console.error('隐藏对话框也失败了:', hideErr);
                            }
                        }
                    }, 300);
                    
                    // 重置重命名ID
                    renamingTabId_7ree = null;
                } else {
                    // console.error('找不到对话框元素，无法关闭');
                }
            } catch (err) {
                // console.error('关闭对话框出错:', err);
                showStatusMessage('关闭对话框失败: ' + err.message);
            }
            return;
        }
        
        // 检查点击的是否是确认按钮
        if (target.id === 'rename_confirm_btn_7ree' || 
            (target.dataset && target.dataset.action === 'confirm')) {
            // console.log('确定按钮被点击 (事件委托)');
            try {
                // 直接内联处理确认逻辑，避免函数查找问题
                const renameInput = document.getElementById('rename_input_7ree');
                if (renameInput && renameInput instanceof HTMLInputElement && renamingTabId_7ree) {
                    const newName = renameInput.value.trim();
                    if (newName) {
                        // console.log(`重命名标签 ${renamingTabId_7ree} 为 ${newName}`);
                        vscode.postMessage({ 
                            command: 'renameTab', 
                            fileId: renamingTabId_7ree, 
                            newName: newName 
                        });
                        showStatusMessage(`已将标签重命名为: ${newName}`);
                    }
                }
                
                // 内联关闭对话框逻辑
                // console.log('尝试关闭对话框...');
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    // 移除键盘事件监听
                    try {
                        if (dialog._keyHandler) {
                            document.removeEventListener('keydown', dialog._keyHandler, true);
                        }
                    } catch (listenerErr) {
                        // console.error('移除键盘监听器失败:', listenerErr);
                    }
                    
                    // 移除可见性
                    dialog.classList.remove('visible_7ree');
                    // console.log('对话框可见性已关闭');
                    
                    // 延迟从DOM移除
                    setTimeout(() => {
                        try {
                            if (dialog.parentNode) {
                                dialog.parentNode.removeChild(dialog);
                                // console.log('对话框从DOM中移除完成');
                            }
                        } catch (removeErr) {
                            // console.error('从DOM移除对话框失败:', removeErr);
                            try {
                                dialog.style.display = 'none';
                            } catch (hideErr) {
                                // console.error('隐藏对话框也失败了:', hideErr);
                            }
                        }
                    }, 300);
                    
                    // 重置重命名ID
                    renamingTabId_7ree = null;
                } else {
                    // console.error('找不到对话框元素，无法关闭');
                }
            } catch (err) {
                // console.error('重命名处理出错:', err);
                showStatusMessage('重命名处理失败: ' + err.message);
            }
            return;
        }
        
        // 如果点击的是对话框背景而不是内容，则关闭对话框
        if (target === dialogContainer) {
            // console.log('点击了对话框背景');
            try {
                // 内联关闭对话框逻辑
                // console.log('尝试关闭对话框...');
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    // 移除键盘事件监听
                    try {
                        if (dialog._keyHandler) {
                            document.removeEventListener('keydown', dialog._keyHandler, true);
                        }
                    } catch (listenerErr) {
                        // console.error('移除键盘监听器失败:', listenerErr);
                    }
                    
                    // 移除可见性
                    dialog.classList.remove('visible_7ree');
                    // console.log('对话框可见性已关闭');
                    
                    // 延迟从DOM移除
                    setTimeout(() => {
                        try {
                            if (dialog.parentNode) {
                                dialog.parentNode.removeChild(dialog);
                                // console.log('对话框从DOM中移除完成');
                            }
                        } catch (removeErr) {
                            // console.error('从DOM移除对话框失败:', removeErr);
                            try {
                                dialog.style.display = 'none';
                            } catch (hideErr) {
                                // console.error('隐藏对话框也失败了:', hideErr);
                            }
                        }
                    }, 300);
                    
                    // 重置重命名ID
                    renamingTabId_7ree = null;
                } else {
                    // console.error('找不到对话框元素，无法关闭');
                }
            } catch (err) {
                // console.error('关闭对话框出错:', err);
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
                        // console.log(`重命名标签 ${renamingTabId_7ree} 为 ${newName}`);
                        vscode.postMessage({ 
                            command: 'renameTab', 
                            fileId: renamingTabId_7ree, 
                            newName: newName 
                        });
                        showStatusMessage(`已将标签重命名为: ${newName}`);
                    }
                }
                
                // 内联关闭对话框逻辑
                // console.log('尝试关闭对话框 (回车键)...');
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    // 移除键盘事件监听
                    try {
                        if (dialog._keyHandler) {
                            document.removeEventListener('keydown', dialog._keyHandler, true);
                            dialog._keyHandler = null;
                        }
                    } catch (listenerErr) {
                        // console.error('移除键盘监听器失败:', listenerErr);
                    }
                    
                    // 移除可见性
                    dialog.classList.remove('visible_7ree');
                    // console.log('对话框可见性已关闭');
                    
                    // 延迟从DOM移除
                    setTimeout(() => {
                        try {
                            if (dialog.parentNode) {
                                dialog.parentNode.removeChild(dialog);
                                // console.log('对话框从DOM中移除完成');
                            }
                        } catch (removeErr) {
                            // console.error('从DOM移除对话框失败:', removeErr);
                            try {
                                dialog.style.display = 'none';
                            } catch (hideErr) {
                                // console.error('隐藏对话框也失败了:', hideErr);
                            }
                        }
                    }, 300);
                    
                    // 重置重命名ID
                    renamingTabId_7ree = null;
                } else {
                    // console.error('找不到对话框元素，无法关闭');
                }
            } catch (err) {
                // console.error('回车键处理出错:', err);
                showStatusMessage('重命名处理失败: ' + err.message);
            }
            return false;
        } else if (e.key === 'Escape') {
            e.preventDefault();
            try {
                // 内联关闭对话框逻辑
                // console.log('尝试关闭对话框 (ESC键)...');
                const dialog = document.getElementById('rename_dialog_7ree');
                if (dialog) {
                    // 移除键盘事件监听
                    try {
                        if (dialog._keyHandler) {
                            document.removeEventListener('keydown', dialog._keyHandler, true);
                            dialog._keyHandler = null;
                        }
                    } catch (listenerErr) {
                        // console.error('移除键盘监听器失败:', listenerErr);
                    }
                    
                    // 移除可见性
                    dialog.classList.remove('visible_7ree');
                    // console.log('对话框可见性已关闭');
                    
                    // 延迟从DOM移除
                    setTimeout(() => {
                        try {
                            if (dialog.parentNode) {
                                dialog.parentNode.removeChild(dialog);
                                // console.log('对话框从DOM中移除完成');
                            }
                        } catch (removeErr) {
                            // console.error('从DOM移除对话框失败:', removeErr);
                            try {
                                dialog.style.display = 'none';
                            } catch (hideErr) {
                                // console.error('隐藏对话框也失败了:', hideErr);
                            }
                        }
                    }, 300);
                    
                    // 重置重命名ID
                    renamingTabId_7ree = null;
                } else {
                    // console.error('找不到对话框元素，无法关闭');
                }
            } catch (err) {
                // console.error('ESC键处理出错:', err);
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
    
    // 添加到初始化编辑器后的代码中:
    editor_7ree.onDidLayoutChange(() => {
        // 编辑器布局变化时重新应用样式
        applyEditorCustomStyles({
            backgroundColor: currentUiSettings_7ree.backgroundColor,
            color: currentUiSettings_7ree.color,
            selectionBackground: currentUiSettings_7ree.selectionBackground
        });
    });
    
    return window.editor_7ree;
}

// 添加：应用并保存UI设置
function applyAndSaveUISettings_7ree(settings) {
    if (!settings) return;
    
    // console.log('应用并保存UI设置:', JSON.stringify(settings));
    
    // 合并设置到当前UI设置
    currentUiSettings_7ree = { ...currentUiSettings_7ree, ...settings };
    
    // 即使编辑器尚未初始化，也确保容器有正确的背景色
    if (settings.backgroundColor) {
        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
            editorContainer.style.backgroundColor = settings.backgroundColor;
        }
        
        const notesContainer = document.getElementById('notes-container');
        if (notesContainer) {
            notesContainer.style.backgroundColor = settings.backgroundColor;
        }
        
        const monacoContainer = document.querySelector('.monaco-editor-container_7ree');
        if (monacoContainer) {
            monacoContainer.style.backgroundColor = settings.backgroundColor;
        }
    }
    
    // 如果编辑器已初始化，应用设置
    if (editor_7ree) {
        // 应用字体和字号
        if (settings.fontFamily) {
            editor_7ree.updateOptions({ fontFamily: settings.fontFamily });
        }
        
        if (settings.fontSize) {
            editor_7ree.updateOptions({ fontSize: parseInt(settings.fontSize, 10) || 14 });
        }
        
        // 应用自定义样式（背景色、文字颜色等）
        applyEditorCustomStyles({
            backgroundColor: settings.backgroundColor,
            color: settings.color,
            selectionBackground: settings.selectionBackground
        });
        
        // 设置自动保存间隔
        if (typeof settings.autoSaveInterval !== 'undefined') {
            const interval = settings.autoSaveInterval * 1000;
            
            // 清除现有的自动保存定时器
            if (window.autoSaveInterval_7ree) {
                clearInterval(window.autoSaveInterval_7ree);
            }
            
            // 设置新的自动保存定时器（如果间隔大于0）
            if (interval > 0 && typeof window.saveCurrentContent === 'function') {
                window.autoSaveInterval_7ree = setInterval(window.saveCurrentContent, interval);
                // console.log(`已设置自动保存间隔: ${settings.autoSaveInterval} 秒`);
            }
        }
    }
    
    // 确保应用了预加载样式
    if (!preloadedEditorStyles_7ree) {
        preloadEditorStyles_7ree();
    }
    
    // 将设置保存到VSCode扩展
    vscode.postMessage({
        command: 'saveUISettings_7ree',
        settings: currentUiSettings_7ree
    });
    
    return currentUiSettings_7ree;
}

// ... existing code ...

// 确保收到全局设置消息时同步更新window.currentSettings_7ree
window.addEventListener('message', event => {
    const message = event.data;
    
    // 监听全局设置消息，确保及时更新Joplin API配置
    if (message.command === 'loadGlobalSettings_7ree' || 
        message.command === 'loadSystemSettings_7ree' || 
        message.command === 'loadUISettings_7ree') {
        
        // console.log(`【配置更新】收到${message.command}消息，准备更新Joplin配置`);
        
        // 确保window.currentSettings_7ree对象存在
        if (typeof window.currentSettings_7ree === 'undefined') {
            window.currentSettings_7ree = {};
            // console.log('【配置更新】初始化window.currentSettings_7ree对象');
        }
        
        // 从消息中提取Joplin相关配置
        if (message.settings) {
            // 新增: 更新 Joplin 云笔记开关状态
            if (message.settings.enableJoplin_7ree !== undefined) {
                window.currentSettings_7ree.enableJoplin_7ree = message.settings.enableJoplin_7ree;
                // console.log(`【配置更新】已更新enableJoplin_7ree: ${message.settings.enableJoplin_7ree}`);
            }

            // 更新Joplin配置
            if (message.settings.joplinServerUrl_7ree) {
                window.currentSettings_7ree.joplinServerUrl_7ree = message.settings.joplinServerUrl_7ree;
                // console.log(`【配置更新】已更新joplinServerUrl_7ree: ${message.settings.joplinServerUrl_7ree.substring(0, 30)}...`);
            }
            
            if (message.settings.joplinToken_7ree) {
                window.currentSettings_7ree.joplinToken_7ree = message.settings.joplinToken_7ree;
                // console.log(`【配置更新】已更新joplinToken_7ree: ${message.settings.joplinToken_7ree.substring(0, 10)}...`);
            }
            
            if (message.settings.joplinNoteId_7ree) {
                window.currentSettings_7ree.joplinNoteId_7ree = message.settings.joplinNoteId_7ree;
                // console.log(`【配置更新】已更新joplinNoteId_7ree: ${message.settings.joplinNoteId_7ree}`);
            }
            
            // console.log('【配置更新】Joplin配置已同步到window.currentSettings_7ree');
            
            // 特别处理enableJoplin_7ree设置的变更，确保立即更新UI
            let joplinSettingChanged = false;
            // 检查是否有Joplin设置更新
            if (message.settings.hasOwnProperty('enableJoplin_7ree')) {
                joplinSettingChanged = true;
                // console.log('【配置更新-关键】enableJoplin_7ree设置发生变化，需要重新过滤文件列表!');
            }
            
            // 重新渲染标签，确保设置更新后立即生效
            try {
                // console.log('【配置更新】尝试重新渲染标签...');
                // 使用全局变量获取文件列表和活动ID
                if (globalFiles.length > 0) {
                    // 调试信息：显示当前的enableJoplin_7ree值
                    // console.log('【配置更新-当前设置】enableJoplin_7ree =', window.currentSettings_7ree.enableJoplin_7ree,
                                // '(类型:', typeof window.currentSettings_7ree.enableJoplin_7ree, ')');
                    
                    // 特别处理enableJoplin_7ree的值
                    let enableJoplin = false;
                    if (typeof window.currentSettings_7ree.enableJoplin_7ree === 'string') {
                        enableJoplin = window.currentSettings_7ree.enableJoplin_7ree.toLowerCase() === 'true';
                    } else if (typeof window.currentSettings_7ree.enableJoplin_7ree === 'boolean') {
                        enableJoplin = window.currentSettings_7ree.enableJoplin_7ree;
                    }
                    // console.log('【配置更新-处理后】enableJoplin =', enableJoplin);
                    
                    // 强制过滤文件列表
                    // console.log('【配置更新】原始文件列表:', JSON.stringify(globalFiles.map(f => ({id: f.id, name: f.name}))));
                    
                    let visibleFiles = [];
                    if (enableJoplin) {
                        // 如果启用了Joplin，保留所有文件
                        visibleFiles = [...globalFiles];
                        // console.log('【配置更新】Joplin已启用，显示全部标签');
                    } else {
                        // 如果禁用了Joplin，过滤掉云笔记标签
                        visibleFiles = globalFiles.filter(f => f.id !== 'cloud_notes_7ree');
                        // console.log('【配置更新】Joplin已禁用，已移除云笔记标签');
                    }
                    
                    // console.log('【配置更新】过滤后文件列表:', JSON.stringify(visibleFiles.map(f => ({id: f.id, name: f.name}))));
                    
                    // 如果当前活动文件是云笔记，但云笔记被禁用了，切换到默认备忘录
                    let newActiveFileId = globalActiveFileId;
                    if (globalActiveFileId === 'cloud_notes_7ree' && !enableJoplin) {
                        // console.log('【配置更新】云笔记被禁用，切换到默认备忘录');
                        newActiveFileId = 'default_notes_7ree';
                        vscode.postMessage({ command: 'switchFile', fileId: 'default_notes_7ree' });
                    }
                    
                    // 渲染标签
                    // console.log('【配置更新】准备渲染标签，标签数量:', visibleFiles.length);
                    window.renderTabs(visibleFiles, newActiveFileId);
                    // console.log('【配置更新】标签重新渲染完成');
                }
            } catch (renderError) {
                // console.error('【配置更新】重新渲染标签失败:', renderError);
            }
        }
    }
});
