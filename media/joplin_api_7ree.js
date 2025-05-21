/**
 * joplin_api_7ree.js - Joplin API 集成模块
 * 该模块提供与Joplin笔记应用程序同步的功能
 */

(function() {
    // console.log('joplin_api_7ree.js script executing'); // 新增日志，确认脚本执行
    // 全局变量，用于访问编辑器实例
    let editor_7ree;
    // VSCode API实例
    let vscode;
    // 初始化状态
    let isInitialized = false;
    // 缓存文件更新时间
    let cacheFileUpdateTime_7ree = null;
    // 缓存文件路径
    const CACHE_FILE_PATH_7ree = '.vscode/mynotes_joplin_cache_7ree.md';
    // 缓存文件是否存在
    let cacheFileExists_7ree = false;
    // 缓存文件大小
    let cacheFileSize_7ree = 0;
    // 临时存储Joplin内容的变量，用于在非云笔记标签页获取内容后，切换到云笔记时使用
    let tempJoplinContent_7ree = null;
    // 临时内容的获取时间
    let tempJoplinContentTime_7ree = 0;
    
    // 将临时变量暴露给全局作用域，便于webview.js访问
    if (typeof window !== 'undefined') {
        window.tempJoplinContent_7ree = tempJoplinContent_7ree;
        window.tempJoplinContentTime_7ree = tempJoplinContentTime_7ree;
        // console.log('已将tempJoplinContent_7ree和tempJoplinContentTime_7ree暴露给window对象');
    }
    
    // 先确保window.currentSettings_7ree存在
    if (typeof window.currentSettings_7ree === 'undefined') {
        window.currentSettings_7ree = {
            joplinServerUrl_7ree: '',
            joplinNoteId_7ree: '',
            joplinToken_7ree: ''
        };
        // console.log('初始化window.currentSettings_7ree，防止访问未定义属性');
    }
    
    // Joplin API配置，使用默认值初始化，后续会通过updateJoplinConfig_7ree更新
    const JOPLIN_CONFIG_7ree = {
        apiUrl: window.currentSettings_7ree.joplinServerUrl_7ree || '',
        noteId: window.currentSettings_7ree.joplinNoteId_7ree || '',
        token: window.currentSettings_7ree.joplinToken_7ree || '',
        fields: 'id,title,body,updated_time'
    };
    



    /**
     * 从Joplin API获取笔记内容
     * @returns {Promise<Object>} 包含笔记数据的Promise
     */
    async function fetchNoteFromJoplin_7ree() {
        try {
            // 确保使用最新的Joplin配置
            updateJoplinConfig_7ree();

            // 检查配置是否完整有效
            if (!JOPLIN_CONFIG_7ree.apiUrl || !JOPLIN_CONFIG_7ree.noteId || !JOPLIN_CONFIG_7ree.token) {
                // console.error('---------------------------------------------');
                // console.error('【API请求错误】Joplin API配置不完整:');
                // console.error(`- API URL: ${JOPLIN_CONFIG_7ree.apiUrl ? '已设置' : '未设置'}`);
                // console.error(`- Note ID: ${JOPLIN_CONFIG_7ree.noteId ? '已设置' : '未设置'}`);
                // console.error(`- Token: ${JOPLIN_CONFIG_7ree.token ? '已设置' : '未设置'}`);
                
                // 打印全局设置状态
                if (typeof window.currentSettings_7ree !== 'undefined') {
                    // console.error('【API请求错误】当前window.currentSettings_7ree状态:');
                    // console.error(`- joplinServerUrl_7ree: ${window.currentSettings_7ree.joplinServerUrl_7ree ? '已设置' : '未设置'}`);
                    // console.error(`- joplinNoteId_7ree: ${window.currentSettings_7ree.joplinNoteId_7ree ? '已设置' : '未设置'}`);
                    // console.error(`- joplinToken_7ree: ${window.currentSettings_7ree.joplinToken_7ree ? '已设置' : '未设置'}`);
                } else {
                    // console.error('【API请求错误】window.currentSettings_7ree对象未定义');
                    
                    // 尝试请求全局设置
                    if (vscode) {
                        // console.log('【API请求错误】正在请求获取全局设置...');
                        vscode.postMessage({
                            command: 'getGlobalSettings_7ree',
                            forceRefresh: true
                        });
                    }
                }
                // console.error('---------------------------------------------');
                
                throw new Error("Joplin API配置不完整，请在设置中配置Joplin服务器URL、Token和笔记ID");
            }
            
            // 构建API请求URL
            const apiUrl = `${JOPLIN_CONFIG_7ree.apiUrl}/notes/${JOPLIN_CONFIG_7ree.noteId}?token=${JOPLIN_CONFIG_7ree.token}&fields=${JOPLIN_CONFIG_7ree.fields}`;
            
            // console.log(`【API请求】正在从Joplin API获取笔记: ${apiUrl.substring(0, apiUrl.indexOf('?'))}...`);
            
            // 发送HTTP请求
            const response = await fetch(apiUrl);
            
            // 检查响应状态
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            
            // 解析JSON响应
            const noteData = await response.json();
            // console.log(`成功获取笔记: "${noteData.title}"`);
            
            // 成功后显示状态消息
            if (vscode) {
                vscode.postMessage({
                    command: 'showInfo',
                    message: `从Joplin获取笔记成功: ${noteData.title}`
                });
            }
            
            return noteData;
        } catch (error) {
            // console.error('从Joplin获取笔记失败:', error);
            // 错误处理 - 使用弹窗显示错误
            if (vscode) {
                vscode.postMessage({
                    command: 'showError',
                    message: `从Joplin获取笔记失败: ${error.message}`
                });
            }
            
            // 如果缓存文件存在，尝试使用缓存数据
            if (cacheFileExists_7ree) {
                // console.log('尝试从缓存文件获取笔记');
                return await readFromCache_7ree();
            }
            
            // 返回模拟数据（仅用于演示）
            return {
                id: JOPLIN_CONFIG_7ree.noteId || "未配置",
                title: "模拟笔记（API连接失败）",
                body: `# Joplin API连接错误\n\n获取Joplin内容失败，原因：${error.message}\n\n请检查：\n1. Joplin客户端是否运行\n2. API服务是否启用（工具->选项->网页剪辑器）\n3. 服务URL、Token和笔记ID是否正确配置`
            };
        }
    }
    
    /**
     * 从缓存文件读取笔记内容
     * @returns {Promise<Object>} 包含笔记数据的Promise
     */
    async function readFromCache_7ree() {
        return new Promise((resolve) => {
            // 请求读取缓存文件内容
            if (vscode) {
                // 监听一次性消息事件来获取响应
                const messageHandler = (event) => {
                    const message = event.data;
                    if (message.command === 'cacheFileContent') {
                        // 移除消息监听器，避免内存泄漏
                        window.removeEventListener('message', messageHandler);
                        
                        if (message.success && message.content) {
                            // console.log(`成功从缓存文件读取内容，长度: ${message.content.length}`);
                            resolve({
                                id: JOPLIN_CONFIG_7ree.noteId,
                                title: "从缓存加载的笔记",
                                body: message.content
                            });
                        } else {
                            // console.error('从缓存文件读取内容失败:', message.error);
                            resolve({
                                id: JOPLIN_CONFIG_7ree.noteId,
                                title: "缓存读取失败",
                                body: "无法读取缓存文件内容。\n\n" + (message.error || "未知错误")
                            });
                        }
                    }
                };
                
                // 添加一次性消息监听器
                window.addEventListener('message', messageHandler);
                
                // 发送请求读取缓存文件内容
                vscode.postMessage({
                    command: 'readCacheFile',
                    path: CACHE_FILE_PATH_7ree
                });
            } else {
                resolve({
                    id: JOPLIN_CONFIG_7ree.noteId,
                    title: "VSCode API未初始化",
                    body: "无法读取缓存文件，因为VSCode API未初始化。"
                });
            }
        });
    }


    // 推送编辑器内消息到Joplin API//
    async function pushNoteToJoplin_7ree(editorContent_7ree) {
        try {
            // 确保使用最新的Joplin配置
            updateJoplinConfig_7ree();
            
            // 构建API请求URL
            const apiUrl = `${JOPLIN_CONFIG_7ree.apiUrl}/notes/${JOPLIN_CONFIG_7ree.noteId}?token=${JOPLIN_CONFIG_7ree.token}`;
            
            // console.log(`pushNoteToJoplin_7ree：正在推送笔记到Joplin API: ${apiUrl}`);
            
            // 准备请求体数据
            const updateData = {
                body: editorContent_7ree
                // 注意：这里只更新body内容，不修改标题，如需修改标题可添加 title 字段
            };
            
            // 发送PUT请求
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            
            // 检查响应状态
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            
            // 解析JSON响应
            const updatedNote = await response.json();
            // console.log(`成功更新笔记: "${updatedNote.title}"`);
            
            // 推送成功，同时更新缓存文件
            if (vscode) {
                vscode.postMessage({
                    command: 'updateCacheFile',
                    path: CACHE_FILE_PATH_7ree,
                    content: editorContent_7ree
                });
                
                // 显示成功消息 - 保持在状态栏显示
                vscode.postMessage({
                    command: 'showInfo',
                    message: '笔记已成功推送到Joplin'
                });
            }

           
            return updatedNote;
        } catch (error) {
            // console.error('推送笔记到Joplin失败:', error);
            
            // 错误处理 - 使用弹窗显示错误
            if (vscode) {
                vscode.postMessage({
                    command: 'showError',
                    message: `推送笔记到Joplin失败: ${error.message}`
                });
            }
            
            // 即使API请求失败，仍然尝试更新本地缓存
            if (vscode) {
                vscode.postMessage({
                    command: 'updateCacheFile',
                    path: CACHE_FILE_PATH_7ree,
                    content: editorContent_7ree
                });
                // console.log('已将内容保存到本地缓存');
            }
            
            throw error; // 重新抛出错误，让调用者知道发生了错误
        }
    }
    


    
    /**
     * 初始化Joplin API模块
     * @param {Object} editorInstance - Monaco编辑器实例
     * @param {Object} vscodeInstance - VSCode API实例
     */
    function initJoplinApi_7ree(editorInstance, vscodeInstance) {
        // 检查是否已初始化，避免重复初始化
        if (isInitialized && editor_7ree === editorInstance) {
            // console.log('Joplin API模块已初始化，跳过重复初始化');
            return;
        }

        // console.log('---------------------------------------------');
        // console.log('【初始化】Joplin API模块初始化开始');
        editor_7ree = editorInstance;
        vscode = vscodeInstance; // 使用传入的VSCode API实例
        
        // 确保使用最新的Joplin配置
        updateJoplinConfig_7ree();
        
        // 获取当前活动标签ID
        const currentActiveId_7ree = typeof window !== 'undefined' && window.currentOpenFileId_7ree ? 
            window.currentOpenFileId_7ree : 'unknown';
        
        // console.log(`【初始化】当前活动标签ID: ${currentActiveId_7ree}`);
        // console.log(`【初始化】是否有临时内容: ${tempJoplinContent_7ree ? '是' : '否'}`);
        if (tempJoplinContent_7ree) {
            // console.log(`【初始化】临时内容长度: ${tempJoplinContent_7ree.length}`);
            // console.log(`【初始化】临时内容获取时间: ${new Date(tempJoplinContentTime_7ree).toLocaleString()}`);
        }
        
        // 只有当前标签是cloud_notes_7ree时才进行自动同步
        if (currentActiveId_7ree === 'cloud_notes_7ree') {
            // 始终尝试从Joplin API获取最新内容并更新到编辑器和缓存
            // console.log('【初始化】当前是云笔记标签，正在从Joplin API获取最新内容...');
            // 延迟一下，确保编辑器已完全加载
            setTimeout(() => {
                syncCacheFileWithJoplin_7ree(true); // 强制更新
            }, 300);
        }

        isInitialized = true;
        // console.log('【初始化】Joplin API模块初始化完成');
        // console.log('---------------------------------------------');
    }

    async function syncCacheFileWithJoplin_7ree(forceUpdate = false) {
        //console.log('执行缓存文件同步操作');
        
        // 确保使用最新的Joplin配置
        updateJoplinConfig_7ree();
        
        // 获取当前活动标签ID
        const currentActiveId_7ree = typeof window !== 'undefined' && window.currentOpenFileId_7ree ? 
            window.currentOpenFileId_7ree : 'unknown';
        
        // 如果是云笔记标签，并且存在临时Joplin内容(且不超过30秒)，优先使用临时内容
        if (currentActiveId_7ree === 'cloud_notes_7ree' && 
            tempJoplinContent_7ree && 
            (Date.now() - tempJoplinContentTime_7ree < 30000)) {
            
            // console.log('---------------------------------------------');
            // console.log('【云笔记切换】使用临时缓存的Joplin内容，无需重新从API获取');
            // console.log(`【云笔记切换】临时内容长度: ${tempJoplinContent_7ree.length}`);
            // console.log(`【云笔记切换】临时内容获取时间: ${new Date(tempJoplinContentTime_7ree).toLocaleString()}`);
            // console.log(`【云笔记切换】内容获取至今: ${Math.round((Date.now() - tempJoplinContentTime_7ree) / 1000)}秒前`);
            // console.log(`【云笔记切换】前30个字符: "${tempJoplinContent_7ree.substring(0, 30).replace(/\n/g, "\\n")}..."`);
            // console.log(`【云笔记切换】后30个字符: "...${tempJoplinContent_7ree.substring(tempJoplinContent_7ree.length - 30).replace(/\n/g, "\\n")}"`);
            
            // 更新缓存文件
            await writeToCacheFile_7ree(tempJoplinContent_7ree);
            // console.log(`【云笔记切换】已将临时内容写入缓存文件`);
            
            // 更新编辑器内容 - 修改这部分，确保临时内容总是被应用到编辑器
            // console.log(`【云笔记切换】准备更新编辑器内容，forceUpdate=${forceUpdate}, 当前编辑器内容长度=${editor_7ree.getValue().trim().length}`);
            
            // 保存当前光标位置和滚动状态
            const viewState = editor_7ree.saveViewState();
            
            // 始终更新编辑器内容，不再检查是否为空
            editor_7ree.setValue(tempJoplinContent_7ree);
            // console.log('【云笔记切换】已将临时缓存的Joplin内容同步到当前云笔记标签的编辑器');
            
            // 如果有保存的视图状态，恢复它
            if (viewState) {
                editor_7ree.restoreViewState(viewState);
                editor_7ree.focus();
                //console.log('【云笔记切换】已恢复编辑器视图状态');
            }
            
            // 通知内容已更新
            if (vscode) {
                vscode.postMessage({
                    command: 'showInfo',
                    message: '已从Joplin临时缓存获取最新内容'
                });
            }
            
            // 清除临时内容，确保下次会重新获取
            // console.log('【云笔记切换】清除临时缓存，下次将重新从API获取');
            clearTempContent_7ree();
            
            // console.log('---------------------------------------------');
            return;
        }
        
        // 如果没有临时缓存内容或已过期，则从Joplin API获取
        // console.log('---------------------------------------------');
        // console.log('【云笔记获取】临时内容不可用，直接从API获取');
        const noteData = await fetchNoteFromJoplin_7ree();

        if (noteData && noteData.body) {
            // console.log(`【云笔记获取】成功获取API内容，长度: ${noteData.body.length}`);
            
            // 将内容保存到临时变量
            tempJoplinContent_7ree = noteData.body;
            tempJoplinContentTime_7ree = Date.now();

            // 同时更新window对象上的属性，确保webview.js能访问到
            if (typeof window !== 'undefined') {
                window.tempJoplinContent_7ree = tempJoplinContent_7ree;
                window.tempJoplinContentTime_7ree = tempJoplinContentTime_7ree;
            }

            // console.log('---------------------------------------------');
            // console.log(`【Joplin临时内容】已保存到临时变量，长度: ${noteData.body.length}`);
            // console.log(`【Joplin临时内容】获取时间: ${new Date(tempJoplinContentTime_7ree).toLocaleString()}`);
            // console.log(`【Joplin临时内容】前30个字符: "${noteData.body.substring(0, 30).replace(/\n/g, "\\n")}..."`);
            // console.log(`【Joplin临时内容】后30个字符: "...${noteData.body.substring(noteData.body.length - 30).replace(/\n/g, "\\n")}"`);
            // console.log('---------------------------------------------');
            
            // 更新缓存文件
            await writeToCacheFile_7ree(noteData.body);
            // console.log('【云笔记获取】已将API内容写入缓存文件');

            // 如果当前标签页是云笔记，且需要强制更新或编辑器内容为空，才将从api获取的内容更新到编辑器
            if (currentActiveId_7ree === 'cloud_notes_7ree') {
                //console.log(`【云笔记获取】准备更新编辑器内容，forceUpdate=${forceUpdate}, 当前编辑器内容长度=${editor_7ree.getValue().trim().length}`);
                
                // 保存当前光标位置和滚动状态
                const viewState = editor_7ree.saveViewState();
                
                // 始终更新编辑器内容，不再检查是否为空或强制更新
                editor_7ree.setValue(noteData.body);
                // console.log('【云笔记获取】已将Joplin笔记内容同步到当前云笔记标签的编辑器');
                
                // 如果有保存的视图状态，恢复它
                if (viewState) {
                    editor_7ree.restoreViewState(viewState);
                    editor_7ree.focus();
                    // console.log('【云笔记获取】已恢复编辑器视图状态');
                }
                
                // 通知内容已更新
                if (vscode) {
                    vscode.postMessage({
                        command: 'showInfo',
                        message: '已从Joplin API获取最新内容'
                    });
                }
            } else {
                // console.log('【云笔记获取】当前不是云笔记标签，跳过更新编辑器内容');
            }
            // console.log('---------------------------------------------');
        }
    }

    async function writeToCacheFile_7ree(content) {
        // console.log('准备写入缓存文件');
        // 使用vscode API写入缓存文件
        if (vscode) {
            vscode.postMessage({
                command: 'writeCacheFile',
                path: CACHE_FILE_PATH_7ree,
                content: content
            });
            // console.log('写入缓存文件成功！！！');
        }
    }
    
    // 更新Joplin配置，确保使用最新设置
    function updateJoplinConfig_7ree() {
        // console.log('---------------------------------------------');
        // console.log('【配置更新】开始更新Joplin API配置');
        
        // 从全局设置中获取最新的Joplin配置
        if (typeof window !== 'undefined' && window.currentSettings_7ree) {
            // console.log('【配置更新】window.currentSettings_7ree对象存在');
            
            // 打印当前window.currentSettings_7ree中的配置
            const hasServerUrl = !!window.currentSettings_7ree.joplinServerUrl_7ree;
            const hasToken = !!window.currentSettings_7ree.joplinToken_7ree;
            const hasNoteId = !!window.currentSettings_7ree.joplinNoteId_7ree;
            
            // console.log(`【配置更新】当前配置状态：`);
            // console.log(`- 服务器URL: ${hasServerUrl ? '已设置' : '未设置'} ${hasServerUrl ? window.currentSettings_7ree.joplinServerUrl_7ree.substring(0, 30) + '...' : ''}`);
            // console.log(`- Token: ${hasToken ? '已设置' : '未设置'} ${hasToken ? window.currentSettings_7ree.joplinToken_7ree.substring(0, 10) + '...' : ''}`);
            // console.log(`- 笔记ID: ${hasNoteId ? '已设置' : '未设置'} ${hasNoteId ? window.currentSettings_7ree.joplinNoteId_7ree : ''}`);
            
            if (window.currentSettings_7ree.joplinServerUrl_7ree) {
                JOPLIN_CONFIG_7ree.apiUrl = window.currentSettings_7ree.joplinServerUrl_7ree;
                // console.log(`【配置更新】已更新API URL: ${JOPLIN_CONFIG_7ree.apiUrl.substring(0, 30)}...`);
            }
            if (window.currentSettings_7ree.joplinNoteId_7ree) {
                JOPLIN_CONFIG_7ree.noteId = window.currentSettings_7ree.joplinNoteId_7ree;
                // console.log(`【配置更新】已更新Note ID: ${JOPLIN_CONFIG_7ree.noteId}`);
            }
            if (window.currentSettings_7ree.joplinToken_7ree) {
                JOPLIN_CONFIG_7ree.token = window.currentSettings_7ree.joplinToken_7ree;
                // console.log(`【配置更新】已更新Token: ${JOPLIN_CONFIG_7ree.token.substring(0, 10)}...`);
            }
            
            // 只有在所有参数都不为空时才输出调试信息
            if (JOPLIN_CONFIG_7ree.apiUrl && JOPLIN_CONFIG_7ree.noteId && JOPLIN_CONFIG_7ree.token) {
                // console.log('【配置更新】Joplin配置已完整更新，全部参数有效');
            } else {
                // console.log('【配置更新】Joplin配置更新，但部分参数为空:');
                // console.log(`- API URL: ${JOPLIN_CONFIG_7ree.apiUrl ? '有效' : '为空'}`);
                // console.log(`- Note ID: ${JOPLIN_CONFIG_7ree.noteId ? '有效' : '为空'}`);
                // console.log(`- Token: ${JOPLIN_CONFIG_7ree.token ? '有效' : '为空'}`);
            }
        } else {
            // console.warn('【配置更新】无法更新Joplin配置: window.currentSettings_7ree未定义');
            // 如果设置对象不存在，尝试创建它
            if (typeof window !== 'undefined' && !window.currentSettings_7ree) {
                window.currentSettings_7ree = {
                    joplinServerUrl_7ree: '',
                    joplinNoteId_7ree: '',
                    joplinToken_7ree: ''
                };
                // console.log('【配置更新】已创建默认的window.currentSettings_7ree对象，但值为空');
            }
        }
        // console.log('---------------------------------------------');
    }
    
    /**
     * 同步笔记内容
     * 该函数从编辑器获取内容并推送到Joplin API
     */
    async function syncNotesWithJoplin_7ree() {
        //console.log('执行Joplin同步操作');
        
        // 确保使用最新的Joplin配置
        updateJoplinConfig_7ree();
        
        // console.log('缓存文件状态: ' + (cacheFileExists_7ree ? '存在' : '不存在') + 
        //     (cacheFileExists_7ree ? `，大小: ${formatFileSize_7ree(cacheFileSize_7ree)}` : ''));
        
        if (!editor_7ree) {
            console.error('编辑器实例未初始化');
            // 发送错误通知 - 使用弹窗
            if (vscode) {
                vscode.postMessage({
                    command: 'showError',
                    message: '同步失败：编辑器未初始化'
                });
            }
            return;
        }

        try {
            // 获取当前编辑器内容
            const editorContent_7ree = editor_7ree.getValue();
            
            // 保存原始光标位置和滚动状态
            const originalViewState = editor_7ree.saveViewState();
            
            // 推送编辑器内容到Joplin API
            const noteData = await pushNoteToJoplin_7ree(editorContent_7ree);
            
            // 直接更新缓存文件（避免再次从Joplin获取内容）
            await writeToCacheFile_7ree(editorContent_7ree);
            
            // 确保编辑器内容不被覆盖 - 不需要重新设置内容，因为已经是最新的
            
            // 恢复原始视图状态（光标位置和滚动位置）
            if (originalViewState) {
                editor_7ree.restoreViewState(originalViewState);
                editor_7ree.focus();
            }
            
            // 更新成功，显示成功消息 - 保持在状态栏显示
            if (vscode) {
                vscode.postMessage({
                    command: 'showInfo',
                    message: '同步成功：内容已推送到Joplin'
                });
            }
            
            // console.log('同步成功，笔记已更新到Joplin');
            return noteData;
        } catch (error) {
            // console.error('同步过程中发生错误:', error);
            
            // 发送错误通知 - 使用弹窗
            if (vscode) {
                vscode.postMessage({
                    command: 'showError',
                    message: `同步失败：${error.message}`
                });
            }
        }
    }
    
    /**
     * 格式化文件大小为可读格式
     * @param {number} size - 文件大小（字节）
     * @returns {string} 格式化后的文件大小
     */
    function formatFileSize_7ree(size) {
        if (size < 1024) {
            return size + ' B';
        } else if (size < 1024 * 1024) {
            return (size / 1024).toFixed(2) + ' KB';
        } else {
            return (size / (1024 * 1024)).toFixed(2) + ' MB';
        }
    }
    
    // 设置消息监听器，接收来自VSCode扩展的消息
    window.addEventListener('message', event => {
        const message = event.data;
        
        // 处理初始化请求
        if (message.command === 'initJoplinApi') {
            // console.log('---------------------------------------------');
            // console.log('【初始化Joplin API】收到初始化Joplin API请求');
            
            // 检查临时内容状态
            if (tempJoplinContent_7ree) {
                const ageSeconds = Math.round((Date.now() - tempJoplinContentTime_7ree) / 1000);
                // console.log(`【初始化Joplin API】存在临时Joplin内容，长度: ${tempJoplinContent_7ree.length}, 获取时间: ${ageSeconds}秒前`);
                
                if (ageSeconds < 30) {
                    // console.log(`【初始化Joplin API】临时内容可用（小于30秒）`);
                } else {
                    // console.log(`【初始化Joplin API】临时内容已过期（超过30秒）`);
                }
                
                // console.log(`【初始化Joplin API】前30个字符: "${tempJoplinContent_7ree.substring(0, 30).replace(/\n/g, "\\n")}..."`);
            } else {
                // console.log(`【初始化Joplin API】没有可用的临时Joplin内容`);
            }
            // console.log('---------------------------------------------');
            
            if (message.editorInstance) {
                // console.log('收到Joplin API初始化请求');
                if (window.joplinApi_7ree && typeof window.joplinApi_7ree.init === 'function') {
                    try {
                        window.joplinApi_7ree.init(message.editorInstance, vscode);
                        // console.log('Joplin API已成功初始化');
                        
                        // 响应初始化成功
                        if (vscode) {
                            vscode.postMessage({
                                command: 'joplinApiInitialized',
                                success: true
                            });
                        }
                    } catch (err) {
                        // console.error('响应初始化请求时出错:', err);
                        
                        // 响应初始化失败
                        if (vscode) {
                            vscode.postMessage({
                                command: 'joplinApiInitialized',
                                success: false,
                                error: err.message
                            });
                        }
                    }
                } else {
                    // console.warn('收到初始化请求，但joplinApi_7ree对象尚未准备好');
                    
                    // 响应初始化失败
                    if (vscode) {
                        vscode.postMessage({
                            command: 'joplinApiInitialized',
                            success: false,
                            error: 'joplinApi_7ree对象未定义'
                        });
                    }
                }
            }
        }
        
        // 处理缓存文件信息响应
        if (message.command === 'cacheFileInfo') {
            cacheFileUpdateTime_7ree = message.updateTime;
            cacheFileExists_7ree = message.exists;
            cacheFileSize_7ree = message.size || 0;
            
            // console.log('缓存文件信息已更新:');
            // console.log(`- 路径: ${message.path}`);
            // console.log(`- 存在: ${cacheFileExists_7ree}`);
            // console.log(`- 更新时间: ${cacheFileUpdateTime_7ree || 'N/A'}`);
            // console.log(`- 大小: ${cacheFileExists_7ree ? formatFileSize_7ree(cacheFileSize_7ree) : 'N/A'}`);
            
            if (message.error) {
                // console.error('获取缓存文件信息时出错:', message.error);
            }
        }
        
        // 处理设置更新消息
        if (message.command === 'loadUISettings_7ree' || message.command === 'loadSystemSettings_7ree' || message.command === 'loadGlobalSettings_7ree') {
            // console.log(`收到${message.command}消息，更新Joplin配置`);
            if (message.settings) {
                // 更新全局设置引用
                if (typeof window !== 'undefined') {
                    window.currentSettings_7ree = window.currentSettings_7ree || {};
                    // 合并接收到的设置
                    window.currentSettings_7ree = { ...window.currentSettings_7ree, ...message.settings };
                    // console.log('全局设置已更新，Joplin相关设置:',
                    //     `joplinServerUrl_7ree: ${window.currentSettings_7ree.joplinServerUrl_7ree || 'N/A'}`,
                    //     `joplinNoteId_7ree: ${window.currentSettings_7ree.joplinNoteId_7ree || 'N/A'}`);
                    
                    // 更新配置
                    updateJoplinConfig_7ree();
                }
            }
        }
    });

    /**
     * 在后台同步 Joplin 内容到缓存文件，不管当前编辑器处于哪个标签页
     * 该函数只更新缓存文件，不更新编辑器内容
     */
    async function syncBackgroundCacheFile_7ree() {
        // console.log('---------------------------------------------');
        // console.log('【后台同步函数】执行后台缓存文件同步操作');
        
        // 确保使用最新的Joplin配置
        updateJoplinConfig_7ree();
        
        // 手动输出当前配置状态用于调试
        // console.log('【后台同步函数】当前JOPLIN_CONFIG_7ree:');
        // console.log(`- API URL: ${JOPLIN_CONFIG_7ree.apiUrl ? JOPLIN_CONFIG_7ree.apiUrl.substring(0, 30) + '...' : '未设置'}`);
        // console.log(`- Note ID: ${JOPLIN_CONFIG_7ree.noteId || '未设置'}`);
        // console.log(`- Token: ${JOPLIN_CONFIG_7ree.token ? JOPLIN_CONFIG_7ree.token.substring(0, 10) + '...' : '未设置'}`);
        
        try {
            // 获取Joplin笔记内容
            //console.log('【后台同步函数】开始调用fetchNoteFromJoplin_7ree()获取内容');
            const noteData = await fetchNoteFromJoplin_7ree();
    
            if (noteData && noteData.body) {
                // 获取当前活动标签ID
                const currentActiveId_7ree = typeof window !== 'undefined' && window.currentOpenFileId_7ree ? 
                    window.currentOpenFileId_7ree : 'unknown';
                
                // 将内容保存到临时变量
                tempJoplinContent_7ree = noteData.body;
                tempJoplinContentTime_7ree = Date.now();

                // 同时更新window对象上的属性，确保webview.js能访问到
                if (typeof window !== 'undefined') {
                    window.tempJoplinContent_7ree = tempJoplinContent_7ree;
                    window.tempJoplinContentTime_7ree = tempJoplinContentTime_7ree;
                }

                // console.log('---------------------------------------------');
                // console.log(`【Joplin临时内容】已保存到临时变量，长度: ${noteData.body.length}`);
                // console.log(`【Joplin临时内容】获取时间: ${new Date(tempJoplinContentTime_7ree).toLocaleString()}`);
                // console.log(`【Joplin临时内容】前30个字符: "${noteData.body.substring(0, 30).replace(/\n/g, "\\n")}..."`);
                // console.log(`【Joplin临时内容】后30个字符: "...${noteData.body.substring(noteData.body.length - 30).replace(/\n/g, "\\n")}"`);
                // console.log('---------------------------------------------');
                
                // 只有当当前标签是云笔记时，才写入缓存文件
                if (currentActiveId_7ree === 'cloud_notes_7ree') {
                    // 更新缓存文件
                    await writeToCacheFile_7ree(noteData.body);
                    // console.log('当前是云笔记标签，已将Joplin内容同步到缓存文件');
                } else {
                    // console.log('当前不是云笔记标签，仅保存到临时变量，不更新缓存文件');
                }
                
                // 通知同步成功
                if (vscode) {
                    vscode.postMessage({
                        command: 'showInfo',
                        message: '已在后台从Joplin更新临时内容'
                    });
                }
                
                return true;
            } else {
                // console.log('从Joplin获取内容失败或内容为空');
                return false;
            }
        } catch (error) {
            // console.error('后台同步Joplin内容失败:', error);
            return false;
        }
    }

    /**
     * 清空临时Joplin内容
     * 在成功使用临时内容后调用，防止过时内容被重复使用
     */
    function clearTempContent_7ree() {
        //console.log('【临时内容】执行清空临时Joplin内容');
        tempJoplinContent_7ree = null;
        tempJoplinContentTime_7ree = 0;
        
        // 同时更新window对象上的属性
        if (typeof window !== 'undefined') {
            window.tempJoplinContent_7ree = null;
            window.tempJoplinContentTime_7ree = 0;
        }
        
        // console.log('【临时内容】临时Joplin内容已清空');
    }

    /**
     * 测试Joplin连接
     * @param {Object} config - 包含服务器URL、Token、笔记ID的配置对象
     * @returns {Promise<Object>} 测试结果
     */
    async function testJoplinConnection_7ree(config) {
        //console.log('🔴🔴🔴 testJoplinConnection_7ree 被调用');
        // console.log('🔴 传入的原始参数:', JSON.stringify(config, (key, value) => {
        //     return value;
        // }));
        
        try {
            // 从传入的config对象获取必要的配置参数
            const apiUrl = config.apiUrl || config.joplinServerUrl_7ree || '';
            const token = config.token || config.joplinToken_7ree || '';
            const noteId = config.noteId || config.joplinNoteId_7ree || '';
            
            //console.log('🔴 处理后的参数:');
            //console.log('🔴 apiUrl =', apiUrl);
            //console.log('🔴 token =', token ? ('长度:' + token.length) : '未提供');
            //console.log('🔴 noteId =', noteId);
            
            // 严格使用表单中的参数而非全局配置
            // console.log('使用表单参数测试Joplin连接:', config);
            
            // 检查参数是否完整
            if (!apiUrl || !noteId || !token) {
                throw new Error("测试失败：Joplin API参数不完整");
            }
            
            // 直接构建请求URL，不使用全局变量
            const requestUrl = `${apiUrl}/notes/${noteId}?token=${token}&fields=id,title`;
            
            // 带有显眼的emoji标记的详细日志输出
            //console.log('🚩🚩🚩 测试Joplin连接请求详情：');
            //console.log('🚩 参数来源：表单直接传入');
            //console.log('🚩 apiUrl:', apiUrl);
            //console.log('🚩 noteId:', noteId);
            //console.log('🚩 token:', token ? token.substring(0, 10) + '...' + token.substring(token.length - 10) : 'undefined');
            //console.log('🚩 完整请求URL:', requestUrl.replace(token, '****'));
            
            // 发送HTTP请求
            //console.log('🚩 即将发起fetch请求...');
            const response = await fetch(requestUrl);
            
            // 检查响应状态
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            
            // 解析JSON响应
            const noteData = await response.json();
            //console.log('获取笔记信息成功:', noteData.title);
            
            // 向VSCode发送测试成功响应
            //console.log('🔴🔴🔴 测试连接成功，直接发送消息到extension.js');
            
            // 尝试使用所有可能的方式确保消息能正确传递
            try {
                // 创建返回数据
                const joplinTestResult_7ree = {
                    command: 'joplinTestResponse',
                    success: true,
                    data: {
                        noteId: noteData.id,
                        title: noteData.title
                    }
                };
                
                // 保存数据到全局缓存，供其他代码使用
                if (typeof window !== 'undefined') {
                    window._lastJoplinTestResult_7ree = joplinTestResult_7ree;
                }
                
                // 方式1：vscode接口
                if (vscode) {
                    vscode.postMessage(joplinTestResult_7ree);
                    //console.log('🔴🔴🔴 方式1：已通过vscode接口发送✅');
                }
                
                // 方式2：尝试全局window对象的消息
                if (typeof window !== 'undefined' && window.parent) {
                    try {
                        window.parent.postMessage(joplinTestResult_7ree, '*');
                        //console.log('🔴🔴🔴 方式2：已通过父窗口发送✅');
                    } catch (e) {
                        //console.log('🔴🔴🔴 方式2发送失败：', e);
                    }
                }
                
                // 方式3：触发自定义事件
                if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
                    try {
                        const eventType = 'joplinTestResultEvent_7ree';
                        
                        // 创建事件
                        const event = new CustomEvent(eventType, {
                            detail: joplinTestResult_7ree,
                            bubbles: true,
                            cancelable: true
                        });
                        
                        // 分发事件
                        window.dispatchEvent(event);
                        //console.log('🔴🔴🔴 方式3：已分发自定义事件✅');
                        
                        // 对事件进行中继
                        setTimeout(() => { 
                            window.dispatchEvent(new CustomEvent('joplinTestResultEvent_7ree', {
                                detail: joplinTestResult_7ree
                            })); 
                        }, 100);
                    } catch (e) {
                        //console.log('🔴🔴🔴 方式3发送失败：', e);
                    }
                }
                
                // 方式4：返回数据到全局window对象
                if (typeof window !== 'undefined') {
                    window.JOPLIN_TEST_RESULT_7REE = joplinTestResult_7ree;
                    //console.log('🔴🔴🔴 方式4：已绑定到全局window对象✅');
                }
                
                //console.log('🔴🔴🔴 已尝试所有可能的消息传递方式');
            } catch (err) {
                console.error('🔴🔴🔴 测试成功消息发送过程出错:', err);
            }
            
            return { success: true, data: noteData };
        } catch (error) {
            console.error('测试Joplin连接失败:', error.message);
            
            // 向VSCode发送测试失败响应
            if (vscode) {
                vscode.postMessage({
                    command: 'joplinTestResponse',
                    success: false,
                    error: error.message
                });
            }
            
            return { success: false, error: error.message };
        }
    }

    // 向window对象暴露接口
    window.joplinApi_7ree = {
        init: initJoplinApi_7ree,
        syncNotes: syncNotesWithJoplin_7ree,
        testConnection: testJoplinConnection_7ree,
        pushNote: pushNoteToJoplin_7ree,
        syncCacheFile: syncBackgroundCacheFile_7ree,
        isInitialized: isInitialized,
        clearTempContent: clearTempContent_7ree
    };

    // 在处理完所有 loadNotes 相关的UI和数据更新后，初始化 Joplin API
    if (isInitialized && editor_7ree) {
        setTimeout(() => {
            // 再次检查编辑器是否有效
            if (editor_7ree && editor_7ree.getValue !== undefined) {
                if (window.joplinApi_7ree && typeof window.joplinApi_7ree.init === 'function') {
                    // console.log('编辑器已初始化且可用，现在初始化Joplin API');
                    try {
                        window.joplinApi_7ree.init(editor_7ree, vscode);
                        
                        // 在初始化完成后，执行后台同步
                        setTimeout(() => {
                            if (window.joplinApi_7ree && typeof window.joplinApi_7ree.syncCacheFile === 'function') {
                                // console.log('执行启动时的后台缓存同步');
                                window.joplinApi_7ree.syncCacheFile()
                                    .then(success => {
                                        if (success) {
                                            // console.log('启动时后台缓存同步成功');
                                        } else {
                                            // console.warn('启动时后台缓存同步未成功');
                                        }
                                    })
                                    .catch(err => {
                                        // console.error('启动时后台缓存同步出错:', err);
                                    });
                            }
                        }, 1500); // 延迟1.5秒执行后台同步，确保配置已完全加载
                    } catch (err) {
                        // console.error('初始化Joplin API时出错:', err);
                    }
                }
            } else {
                // console.warn('延迟1000ms后编辑器仍然不可用，跳过Joplin API初始化');
            }
        }, 1000); // 增加到1000ms以确保编辑器完全初始化
    }

    // 添加初始化检查，确保在页面加载后及时检查全局设置
    setTimeout(() => {
        // console.log('---------------------------------------------');
        // console.log('【自动检查】执行Joplin API设置自动检查');
        
        // 检查全局设置是否存在
        if (typeof window.currentSettings_7ree !== 'undefined') {
            // console.log('【自动检查】发现window.currentSettings_7ree对象已存在:');
            
            // 打印设置状态
            const hasServerUrl = !!window.currentSettings_7ree.joplinServerUrl_7ree;
            const hasToken = !!window.currentSettings_7ree.joplinToken_7ree;
            const hasNoteId = !!window.currentSettings_7ree.joplinNoteId_7ree;
            
            // console.log(`- 服务器URL: ${hasServerUrl ? '已设置' : '未设置'} ${hasServerUrl ? window.currentSettings_7ree.joplinServerUrl_7ree.substring(0, 30) + '...' : ''}`);
            // console.log(`- Token: ${hasToken ? '已设置' : '未设置'} ${hasToken ? window.currentSettings_7ree.joplinToken_7ree.substring(0, 10) + '...' : ''}`);
            // console.log(`- 笔记ID: ${hasNoteId ? '已设置' : '未设置'} ${hasNoteId ? window.currentSettings_7ree.joplinNoteId_7ree : ''}`);
            
            // 主动更新Joplin配置
            updateJoplinConfig_7ree();
        } else {
            // console.log('【自动检查】window.currentSettings_7ree对象不存在，创建空对象');
            window.currentSettings_7ree = {
                joplinServerUrl_7ree: '',
                joplinNoteId_7ree: '',
                joplinToken_7ree: ''
            };
            
            // 请求VSCode扩展发送设置
            if (vscode) {
                // console.log('【自动检查】向VSCode扩展请求全局设置');
                vscode.postMessage({
                    command: 'getGlobalSettings_7ree',
                    forceRefresh: true
                });
            }
        }
        
        // console.log('---------------------------------------------');
    }, 1000); // 延迟1秒执行，确保页面加载完成
})();
