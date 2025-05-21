// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process'); // 添加: 用于执行系统命令打开文件
const { backupFile_7ree } = require('./media/backup_utils_7ree'); // 添加: 导入备份工具模块

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// console.log('MyNotes 扩展已激活!');

	// 创建 WebviewViewProvider，并传递 context
	const provider = new NotesViewProvider_7ree(context.extensionUri, context);

	// 注册 WebviewViewProvider
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('mynotes-7ree.notesView', provider)
	);

	// 注册保存笔记命令
	context.subscriptions.push(
		vscode.commands.registerCommand('mynotes-7ree.saveNotes', () => {
			provider.saveNotes();
		})
	);

	// 注册加载笔记命令
	context.subscriptions.push(
		vscode.commands.registerCommand('mynotes-7ree.loadNotes', () => {
			provider.loadNotes();
		})
	);
    
    // 注册搜索命令
    context.subscriptions.push(
        vscode.commands.registerCommand('mynotes-7ree.search', () => {
            provider.search_7ree();
        })
    );
    
    // 注册导入文件命令
    context.subscriptions.push(
        vscode.commands.registerCommand('mynotes-7ree.importFile', async () => {
            await provider.importFile_7ree();
        })
    );
    
    // 注册外部打开命令
    context.subscriptions.push(
        vscode.commands.registerCommand('mynotes-7ree.openFileExternally', async () => {
            await provider.openFileExternally_7ree(provider.currentFileId_7ree);
        })
    );
    
    // 注册备份命令
    context.subscriptions.push(
        vscode.commands.registerCommand('mynotes-7ree.backupCurrentFile', async () => {
            await provider.backupCurrentFile_7ree();
        })
    );
    
    // 注册打开文件夹命令
    context.subscriptions.push(
        vscode.commands.registerCommand('mynotes-7ree.openFileFolder_7ree', async () => {
            await provider.openFileFolder_7ree();
        })
    );
    
    // 注册设置命令
    context.subscriptions.push(
        vscode.commands.registerCommand('mynotes-7ree.openSettings', () => {
            if (provider.view && provider.view.visible) {
                provider.view.webview.postMessage({
                    command: 'openSettings'
                });
            }
        })
    );
    
    // 注册同步Joplin命令
    context.subscriptions.push(
        vscode.commands.registerCommand('mynotes-7ree.syncJoplin', () => {
            if (provider.view && provider.view.visible) {
                provider.view.webview.postMessage({
                    command: 'syncJoplinBackground'
                });
                vscode.window.setStatusBarMessage('正在同步Joplin内容到本地缓存...', 2000);
            } else {
                vscode.window.showInformationMessage('请先打开备忘录视图');
            }
        })
    );
}

class NotesViewProvider_7ree {
	constructor(extensionUri, context) {
		this.extensionUri = extensionUri;
		this.context = context;
		this.view = undefined;
		this.notesContent = '';
		this.notesDir = '';
		this.notesFile = '';
		this.statusFile_7ree = ''; // 项目级状态文件（改名）
		this._initializeNotesPath();
		
		this.openFiles_7ree = [
			{ id: 'default_notes_7ree', name: '备忘录', path: '', content: '' },
			{ id: 'cloud_notes_7ree', name: '云笔记', path: '', content: '' }
		];
		this.currentFileId_7ree = 'default_notes_7ree'; // 默认先显示备忘录
		
		// 云笔记文件路径
		this.cloudNotesFile_7ree = '';
		this._initializeCloudNotesPath_7ree();
		
		// 记录文件的可见行和锚点信息
		this.editorPositions_7ree = {};
		
		// 记录文件的最后修改时间
		this.fileLastModified_7ree = {};
		
		// 文件内容缓存
		this.fileContentCache_7ree = {};
		
		// 存储错误对话框操作的回调函数
		this._pendingCallbacks = {};
		
		// UI设置
		this.uiSettings_7ree = { fontFamily: '', fontSize: '', color: '', backgroundColor: '', selectionBackground: '', autoSaveInterval: 30 };
		this._loadUISettings_7ree(); // 加载保存的UI设置
		
		// 尝试预先加载默认备忘录内容
		this._loadDefaultNotesContent();
		
		this._loadImportedFiles_7ree(); // 加载所有文件和它们的滚动位置
		this._loadLastActiveFileId_7ree(); // 尝试加载并设置上次活动的ID
		// console.log(`构造函数结束，当前活动ID: ${this.currentFileId_7ree}`);
	}

	_initializeNotesPath() {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			this.notesDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
			this.notesFile = path.join(this.notesDir, 'mynotes_defaultNote_7ree.txt');
			this.statusFile_7ree = path.join(this.notesDir, 'mynotes_status_7ree.json'); // 项目级状态文件（改名）
		} else {
			const tempDir = process.env.TEMP || process.env.TMP || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support/Code/User' : '/tmp');
			this.notesDir = path.join(tempDir, 'mynotes_7ree_global');
			this.notesFile = path.join(this.notesDir, 'mynotes_defaultNote_7ree.txt');
			this.statusFile_7ree = path.join(this.notesDir, 'mynotes_status_7ree.json'); // 项目级状态文件（改名）
			// console.warn('No workspace folder found, notes will be saved to a temporary/global directory:', this.notesDir);
		}
		
		// 初始化全局配置文件路径
		this._initializeGlobalSettingsPath_7ree();
	}
	
	// 初始化全局配置文件路径
	_initializeGlobalSettingsPath_7ree() {
		// 使用VSCode配置目录作为全局配置存储位置
		const homeDir = require('os').homedir();
		let globalConfigDir;
		
		// 根据操作系统选择合适的全局配置目录
		if (process.platform === 'win32') {
			// Windows路径: C:\Users\用户名\AppData\Roaming\Code\User
			globalConfigDir = path.join(homeDir, 'AppData', 'Roaming', 'Code', 'User');
		} else if (process.platform === 'darwin') {
			// macOS路径: ~/Library/Application Support/Code/User
			globalConfigDir = path.join(homeDir, 'Library', 'Application Support', 'Code', 'User');
		} else {
			// Linux路径: ~/.config/Code/User
			globalConfigDir = path.join(homeDir, '.config', 'Code', 'User');
		}
		
		// 确保全局配置目录存在
		if (!fs.existsSync(globalConfigDir)) {
			try {
				fs.mkdirSync(globalConfigDir, { recursive: true });
				// console.log('全局配置目录已创建:', globalConfigDir);
			} catch (err) {
				// console.error('创建全局配置目录失败:', globalConfigDir, err);
				// 失败时回退到用户主目录
				globalConfigDir = homeDir;
			}
		}
		
		// 设置全局配置文件路径
		this.globalSettingsFile_7ree = path.join(globalConfigDir, 'mynotes-vars-7ree.json');
		// console.log('全局配置文件路径:', this.globalSettingsFile_7ree);
	}

	_ensureNotesDirectoryExists() {
		if (!fs.existsSync(this.notesDir)) {
			try {
				fs.mkdirSync(this.notesDir, { recursive: true });
				// console.log('Notes directory created:', this.notesDir);
			} catch (err) {
				// console.error('Failed to create notes directory:', this.notesDir, err);
				if (this.view && this.view.visible) {
					this.showInfoInStatusBar(`创建笔记目录失败: ${this.notesDir}`, true);
				} else {
					vscode.window.showErrorMessage(`创建笔记目录失败: ${this.notesDir}`);
				}
				return false;
			}
		}
		return true;
	}

	_saveLastActiveFileId_7ree() {
		if (!this.currentFileId_7ree || !this._ensureNotesDirectoryExists()) return;
		
		// 保存到项目状态文件中
		this._saveStatus_7ree();
	}

	_loadLastActiveFileId_7ree() {
		// 从项目状态文件加载
		const status = this._loadStatus_7ree();
		if (status && status.lastActiveId) {
			// 检查这个ID是否仍在openFiles_7ree中，以防对应文件已被移除
			if (this.openFiles_7ree.some(f => f.id === status.lastActiveId)) {
				this.currentFileId_7ree = status.lastActiveId;
				// console.log(`已加载并设置上次活动文件ID: ${this.currentFileId_7ree}`);
				return;
			}
		}
		
		// 未找到有效ID，使用默认值
		this.currentFileId_7ree = 'default_notes_7ree';
		// console.log(`未找到有效的上次活动ID，使用默认ID: ${this.currentFileId_7ree}`);
	}

	_loadUISettings_7ree() {
		// 从全局设置文件加载UI设置
		const globalSettings = this._loadGlobalSettings_7ree();
		if (globalSettings) {
			// 优先使用全局UI设置
			this.uiSettings_7ree = { 
				fontFamily: globalSettings.fontFamily || '',
				fontSize: globalSettings.fontSize || '',
				color: globalSettings.color || '',
				backgroundColor: globalSettings.backgroundColor || '',
				selectionBackground: globalSettings.selectionBackground || '',
				autoSaveInterval: globalSettings.autoSaveInterval || 30
			};
			// console.log('已从全局设置文件加载UI设置');
			return;
		}
		
		// 如果没有存储的设置，从VSCode主题加载默认值
		this._loadDefaultUISettingsFromTheme_7ree();
	}
	
	// 新增：从VSCode主题加载默认UI设置
	_loadDefaultUISettingsFromTheme_7ree() {
		try {
			// 获取编辑器设置
			const editorConfig = vscode.workspace.getConfiguration('editor');
			const colorCustomizations = vscode.workspace.getConfiguration('workbench').get('colorCustomizations');
			
			// 获取字体设置
			if (editorConfig.has('fontFamily')) {
				this.uiSettings_7ree.fontFamily = editorConfig.get('fontFamily');
			}
			
			if (editorConfig.has('fontSize')) {
				this.uiSettings_7ree.fontSize = `${editorConfig.get('fontSize')}px`;
			}
			
			// 尝试从VSCode主题获取颜色
			const isDarkTheme = document.body?.classList.contains('vscode-dark');
			
			// 设置默认颜色基于主题
			if (isDarkTheme) {
				this.uiSettings_7ree.backgroundColor = '#1e1e1e';
				this.uiSettings_7ree.color = '#d4d4d4';
				this.uiSettings_7ree.selectionBackground = '#264f78';
			} else {
				this.uiSettings_7ree.backgroundColor = '#ffffff';
				this.uiSettings_7ree.color = '#000000';
				this.uiSettings_7ree.selectionBackground = '#add6ff';
			}
			
			// 如果有自定义颜色，优先使用
			if (colorCustomizations) {
				if (isDarkTheme && colorCustomizations['[Dark]']) {
					const darkCustom = colorCustomizations['[Dark]'];
					if (darkCustom['editor.background']) {
						this.uiSettings_7ree.backgroundColor = darkCustom['editor.background'];
					}
					if (darkCustom['editor.foreground']) {
						this.uiSettings_7ree.color = darkCustom['editor.foreground'];
					}
					if (darkCustom['editor.selectionBackground']) {
						this.uiSettings_7ree.selectionBackground = darkCustom['editor.selectionBackground'];
					}
				} else if (!isDarkTheme && colorCustomizations['[Light]']) {
					const lightCustom = colorCustomizations['[Light]'];
					if (lightCustom['editor.background']) {
						this.uiSettings_7ree.backgroundColor = lightCustom['editor.background'];
					}
					if (lightCustom['editor.foreground']) {
						this.uiSettings_7ree.color = lightCustom['editor.foreground'];
					}
					if (lightCustom['editor.selectionBackground']) {
						this.uiSettings_7ree.selectionBackground = lightCustom['editor.selectionBackground'];
					}
				}
			}
			
			// console.log('已从VSCode主题加载默认UI设置:', this.uiSettings_7ree);
		} catch (err) {
			// console.error('从VSCode主题加载默认设置失败:', err);
			// 使用硬编码的默认值
			this.uiSettings_7ree = { 
				fontFamily: '', 
				fontSize: '', 
				color: '#ffffff',
				backgroundColor: '#000000',
				selectionBackground: '#add6ff',
				autoSaveInterval: 30
			};
		}
	}

	_saveUISettings_7ree(settings) {
		if (this.context) {
			this.uiSettings_7ree = settings;
			
			// 保存到全局设置文件
			this._saveGlobalSettings_7ree({
				fontFamily: settings.fontFamily,
				fontSize: settings.fontSize,
				color: settings.color,
				backgroundColor: settings.backgroundColor,
				selectionBackground: settings.selectionBackground,
				autoSaveInterval: settings.autoSaveInterval
			});
			
			// console.log('UI设置已保存到全局设置');
			
			// 将更新后的设置发送回webview，确保所有视图都同步
			if (this.view && this.view.visible) {
				this.view.webview.postMessage({
					command: 'loadUISettings_7ree',
					settings: this.uiSettings_7ree
				});
				// console.log('已发送更新后的UI设置到webview');
			}
		} else {
			// console.warn('_saveUISettings_7ree: context 未定义');
		}
	}

	resolveWebviewView(webviewView, context, token) {
		this.view = webviewView;
		if (!this.context) {
			this.context = context;
			this._loadUISettings_7ree();
		}
		// console.log('resolveWebviewView: Webview已创建');

		// 添加视图标题栏按钮
		webviewView.title = "备忘&ToDo";
		
		// 注册命令并设置标题栏按钮
		// 删除这里重复注册的命令
		
		// 使用WebviewOptions配置webview
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
		// console.log('resolveWebviewView: HTML已设置');
        
        // 添加对视图可见性变化的监听
        const onDidChangeVisibility = webviewView.onDidChangeVisibility(() => {
            // if (webviewView.visible) {
            //     console.log('-------------------------------------------------------------------');
            //     console.log('【视图可见性变化】备忘录视图变为可见状态');
            //     console.log(`【视图可见性变化】当前活动文件ID: ${this.currentFileId_7ree}`);
            //     console.log('-------------------------------------------------------------------');
            // }
        });
        
        // 确保监听器随视图一起被处理
        token.onCancellationRequested(() => {
            onDidChangeVisibility.dispose();
        });

		webviewView.webview.onDidReceiveMessage(message => {
			// console.log('Extension收到消息:', message.command, message.fileId || '', message.settings || '');
			switch (message.command) {
				case 'saveNotes':
					const fileIdForSave = message.fileId || this.currentFileId_7ree;
					// 删除对scrollTopRatio和scrollPosition的处理，直接保存内容
					this.saveNotesById_7ree(fileIdForSave, message.text, message.switchingTabs);
					break;
				case 'webviewReady':
					// console.log('webviewReady: 准备加载初始笔记');
					this.loadNotes();
					break;
				case 'importFile':
					this.importFile_7ree();
					break;
				case 'switchFile':
					this.switchFile_7ree(message.fileId);
					break;
				case 'closeTab':
					this.closeTab_7ree(message.fileId);
					break;
				case 'renameTab':
					this.renameTab_7ree(message.fileId, message.newName);
					break;
				case 'reorderTabs':
					this.reorderTabs_7ree(message.draggedId, message.targetId, message.position);
					break;
				                // 添加对showError和showInfo消息的处理
                case 'showError':
                    // 不再使用系统通知，改为显示在状态栏
                    this.showInfoInStatusBar(message.message, true);
                    break;
                case 'showInfo':
                    // 不再使用系统通知，改为显示在状态栏
                    this.showInfoInStatusBar(message.message, false);
                    break;
                // 增加测试Joplin连接的处理
                case 'testJoplinConnection':
                    this.testJoplinConnection_7ree(message.serverUrl, message.token, message.noteId);
                    break;
                // 添加备份相关消息的处理
                case 'getContent':
                    // 获取当前编辑器内容用于备份
                    if (message.for === 'backup') {
                        // 获取当前内容后执行备份
                        const fileId = this.currentFileId_7ree;
                        const file = this.openFiles_7ree.find(f => f.id === fileId);
                        
                        if (file && file.path) {
                            // 已经有路径，执行备份
                            this.backupCurrentFile_7ree();
                        }
                    }
                    break;
                case 'contentForBackup':
                    // 收到从前端返回的内容用于备份
                    const content = message.content;
                    const fileId = message.fileId;
                    const file = this.openFiles_7ree.find(f => f.id === fileId);
                    
                    if (file && file.path && content) {
                        // 先确保内容保存到文件
                        try {
                            fs.writeFileSync(file.path, content, 'utf8');
                            // 内容保存后执行备份
                            this.backupCurrentFile_7ree();
                        } catch (error) {
                            // console.error('保存内容到文件失败:', error);
                            this.showInfoInStatusBar(`备份前保存失败: ${error.message}`, true);
                        }
                    } else {
                        this.showInfoInStatusBar('无法备份: 文件路径或内容无效', true);
                    }
                    break;
				case 'persistScrollPosition':
					const fileIdForScroll = message.fileId;
					if (fileIdForScroll) {
						let updated = false;
						
						// 只保留viewState处理
						if (message.viewState) {
							if (!this.editorPositions_7ree) {
								this.editorPositions_7ree = {};
							}
							
							if (!this.editorPositions_7ree[fileIdForScroll]) {
								this.editorPositions_7ree[fileIdForScroll] = {};
							}
							
							// 确保视图状态是有效的JSON
							try {
								// 尝试解析后再存储，以验证JSON的有效性
								const parsedState = JSON.parse(message.viewState);
								if (parsedState && parsedState.viewState) {
									// 保存视图状态（Monaco Editor 的原生状态）
									this.editorPositions_7ree[fileIdForScroll].viewState = message.viewState;
									// console.log(`保存文件 ${fileIdForScroll} 的完整视图状态，长度: ${message.viewState.length} 字符`);
									
									updated = true;
									
									// 立即保存到磁盘
									this._saveImportedFiles_7ree();
								} else {
									// console.warn(`接收到无效的视图状态: 缺少viewState属性`);
								}
							} catch (e) {
								// console.error(`无法解析视图状态JSON: ${e.message}`);
							}
						}
						
						// 删除对scrollTopRatio和scrollPosition的处理
						
						if (updated) {
							// console.log(`persistScrollPosition: 更新视图状态 for ${fileIdForScroll}`);
							this._saveImportedFiles_7ree();
							if (this.currentFileId_7ree === fileIdForScroll) {
								this._saveLastActiveFileId_7ree();
							}
							vscode.window.setStatusBarMessage(`滚动位置已记录: ${this.openFiles_7ree.find(f=>f.id === fileIdForScroll)?.name || fileIdForScroll}`, 2000);
						} else {
							// console.warn('persistScrollPosition: 缺少必要的视图状态信息', message);
						}
					} else {
						// console.warn('persistScrollPosition: 缺少fileId', message);
					}
					break;
				// 新增: 使用系统默认程序打开当前文件
				case 'openFileExternally':
					this.openFileExternally_7ree(message.fileId);
					break;
				// 新增：检查外部文件是否有变动
				case 'checkFileChanged':
					this.checkFileChanged_7ree(message.fileId, message.currentContent);
					break;
				// 新增：处理保存UI设置
				case 'saveUISettings_7ree':
					if (message.settings) {
						this._saveUISettings_7ree(message.settings);
					}
					break;
				case 'errorDialogAction':
					// 处理错误对话框动作回调
					if (message.actionId && this._pendingCallbacks && this._pendingCallbacks[message.actionId]) {
						// 执行回调
						this._pendingCallbacks[message.actionId]();
						// 删除回调引用
						delete this._pendingCallbacks[message.actionId];
					}
					break;
				// 添加对获取缓存文件信息的处理
				case 'getCacheFileInfo':
					// this.getCacheFileInfo_7ree(message.path);
					break;
				// 添加对读取缓存文件内容的处理
				case 'readCacheFile':
					this.readCacheFile_7ree(message.path);
					break;
				case 'writeCacheFile':
					writeCacheFile_7ree(message.path, message.content);
					break;
				// 新增：处理获取UI设置的请求
				case 'getUISettings_7ree':
					// console.log('收到getUISettings_7ree请求，forceRefresh:', message.forceRefresh);
					
					// 如果请求强制刷新，从全局配置文件重新加载
					if (message.forceRefresh) {
						const globalSettings = this._loadGlobalSettings_7ree(true);
						if (globalSettings) {
							// 更新内存中的UI设置
							this.uiSettings_7ree = {
								fontFamily: globalSettings.fontFamily || this.uiSettings_7ree.fontFamily,
								fontSize: globalSettings.fontSize || this.uiSettings_7ree.fontSize,
								color: globalSettings.color || this.uiSettings_7ree.color,
								backgroundColor: globalSettings.backgroundColor || this.uiSettings_7ree.backgroundColor,
								selectionBackground: globalSettings.selectionBackground || this.uiSettings_7ree.selectionBackground,
								autoSaveInterval: globalSettings.autoSaveInterval || this.uiSettings_7ree.autoSaveInterval
							};
							// console.log('已从全局配置文件重新加载UI设置');
						}
					}
					
					// 将当前内存中的设置发送回webview
					if (this.view && this.view.visible) {
						this.view.webview.postMessage({
							command: 'loadUISettings_7ree',
							settings: this.uiSettings_7ree
						});
						// console.log('已发送UI设置到webview:', JSON.stringify(this.uiSettings_7ree));
					}
					break;
					
				// 新增: 获取系统级设置
				case 'getSystemSettings_7ree':
					// console.log('收到getSystemSettings_7ree请求，forceRefresh:', message.forceRefresh);
					
					// 从全局配置文件重新加载
					const systemSettings = this._loadGlobalSettings_7ree(message.forceRefresh);
					
					// 将系统设置发送回webview
					if (this.view && this.view.visible) {
						this.view.webview.postMessage({
							command: 'loadSystemSettings_7ree',
							settings: systemSettings
						});
						// console.log('已发送系统设置到webview:', JSON.stringify(systemSettings));
					}
					break;
					
				// 新增: 获取全局设置
				case 'getGlobalSettings_7ree':
					// console.log('收到getGlobalSettings_7ree请求，forceRefresh:', message.forceRefresh);
					
					// 加载全局设置
					const globalSettings = this._loadGlobalSettings_7ree(message.forceRefresh);
					
					// 将全局设置发送回webview
					if (this.view && this.view.visible) {
						this.view.webview.postMessage({
							command: 'loadGlobalSettings_7ree',
							settings: globalSettings
						});
						// console.log('已发送全局设置到webview:', JSON.stringify(globalSettings));
					}
					break;
					
				// 新增: 保存全局设置
				case 'saveGlobalSettings_7ree':
					if (message.settings) {
						this._saveGlobalSettings_7ree(message.settings, message.filename);
					}
					break;
			}
		});



		// 重新检查并处理云笔记的可用性
		if (this.currentFileId_7ree === 'cloud_notes_7ree') {
			// 加载全局设置，检查云笔记是否可用
			const globalSettings = this._loadGlobalSettings_7ree(true);
			let enableJoplin = false;
			
			if (globalSettings && globalSettings.enableJoplin_7ree !== undefined) {
				if (typeof globalSettings.enableJoplin_7ree === 'string') {
					enableJoplin = globalSettings.enableJoplin_7ree.toLowerCase() === 'true';
				} else if (typeof globalSettings.enableJoplin_7ree === 'boolean') {
					enableJoplin = globalSettings.enableJoplin_7ree;
				}
			}
			
			// console.log(`【resolveWebviewView】重新检查云笔记可用性: ${enableJoplin}`);
			if (!enableJoplin) {
				// 如果云笔记不可用，切换到默认备忘录
				// console.log('【resolveWebviewView】云笔记不可用，切换到默认备忘录');
				this.currentFileId_7ree = 'default_notes_7ree';
				this._saveLastActiveFileId_7ree(); // 保存新的活动文件ID
			}
		} else {
			// 重新加载最后的活动文件ID
			this._loadLastActiveFileId_7ree();
		}
		
		// console.log('resolveWebviewView: 即将调用 loadNotes, 当前活动ID:', this.currentFileId_7ree);
		this.loadNotes();
        
        // 无论当前是什么标签页，在初始化完成后延迟发送后台同步Joplin命令
        setTimeout(() => {
            if (this.view && this.view.visible) {
                // console.log('向WebView发送请求，执行Joplin后台同步');
                this.view.webview.postMessage({
                    command: 'syncJoplinBackground'
                });
            }
        }, 3000); // 延迟3秒执行，确保WebView已完全加载
	}

	// 新增：显示错误消息在webview中
	showErrorInWebview_7ree(message, title = "提示", buttonText = "确定") {
		if (this.view && this.view.visible) {
			// 判断是否需要对话框
			if (message.includes("<br>") || message.length > 80) {
				// 复杂消息使用对话框
				this.view.webview.postMessage({
					command: 'showError',
					message: message,
					title: title,
					buttonText: buttonText
				});
			} else {
				// 简单消息使用状态栏
				this.showInfoInStatusBar(message, true);
			}
		} else {
			// 如果webview不可见，则使用vscode原生消息
			vscode.window.showErrorMessage(message);
		}
	}

	// 新增：显示错误消息在webview中，并支持确定按钮执行回调操作
	showErrorInWebviewWithAction_7ree(message, title = "提示", callback = null) {
		if (this.view && this.view.visible) {
			// 生成唯一ID用于标识回调
			const actionId = `action_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
			
			// 临时存储回调函数
			if (callback) {
				this._pendingCallbacks = this._pendingCallbacks || {};
				this._pendingCallbacks[actionId] = callback;
			}
			
			// 发送消息
			this.view.webview.postMessage({
				command: 'showErrorWithAction',
				message: message,
				title: title,
				actionId: actionId,
				hasCallback: !!callback
			});
		} else {
			// 如果webview不可见，使用vscode原生消息提示，并提供操作按钮
			if (callback) {
				vscode.window.showErrorMessage(message, { modal: true }, "打开文件").then(selection => {
					if (selection === "打开文件") {
						callback();
					}
				});
			} else {
				vscode.window.showErrorMessage(message);
			}
		}
	}

	// 处理webview中的消息

	// 添加：关闭标签功能
	closeTab_7ree(fileId) {
		// console.log('接收到关闭标签请求:', fileId);
		
		// 不能关闭默认备忘录或云笔记
		if (fileId === 'default_notes_7ree' || fileId === 'cloud_notes_7ree') {
			// console.log('不能关闭默认备忘录或云笔记');
			return;
		}

		// 查找要关闭的文件索引
		const fileIndex = this.openFiles_7ree.findIndex(f => f.id === fileId);
		if (fileIndex === -1) {
			// console.log('未找到对应的文件:', fileId);
			return;
		}

		// console.log('关闭文件:', this.openFiles_7ree[fileIndex].name);

		// 如果关闭的是当前活动文件，则切换到备忘录
		const isActiveFile = this.currentFileId_7ree === fileId;
		
		// 从文件列表中移除
		this.openFiles_7ree.splice(fileIndex, 1);
		

		
		// 如果关闭的是当前活动文件，则切换到备忘录
		if (isActiveFile) {
			// console.log('关闭的是当前活动文件，切换到备忘录');
			this.switchFile_7ree('default_notes_7ree');
		} else {
			// 仅更新标签视图，不切换文件
			// console.log('更新标签视图');
			if (this.view && this.view.visible) {
				// 获取当前文件内容
				const currentFile = this.openFiles_7ree.find(f => f.id === this.currentFileId_7ree);
				if (!currentFile) {
					// console.warn(`当前文件ID ${this.currentFileId_7ree} 未找到，将切换到默认备忘录`);
					this.switchFile_7ree('default_notes_7ree');
					return;
				}
				
				let currentContent = currentFile.content;
				// 确保不发送undefined内容
				if (currentContent === undefined || currentContent === null) {
					// console.warn(`当前文件 ${this.currentFileId_7ree} 内容为undefined或null，已替换为空字符串`);
					currentContent = '';
					currentFile.content = ''; // 同时更新内存对象
				}
				
				// 获取视图状态信息
				const viewState = this.editorPositions_7ree && this.editorPositions_7ree[this.currentFileId_7ree] 
				    ? this.editorPositions_7ree[this.currentFileId_7ree].viewState 
				    : undefined;
				
				// console.log(`更新标签视图，当前文件: ${this.currentFileId_7ree}, 内容长度: ${currentContent.length}`);
				// console.log(`- 视图状态: ${viewState ? '已保存' : '未保存'}`);
				
				this.view.webview.postMessage({
					command: 'loadNotes',
					text: currentContent,
					fileId: this.currentFileId_7ree,
					files: this.openFiles_7ree,
					viewState: viewState
				});
			}
		}
		
		// 保存更新后的文件配置
		this._saveImportedFiles_7ree();
		
		// 发送关闭成功的消息
		if (this.view) {
			this.view.webview.postMessage({
				command: 'tabClosed',
				fileId: fileId
			});
		}
	}

	// 修改: 保存导入的文件列表到项目状态
	_saveImportedFiles_7ree() {
		// console.log('保存文件列表及视图状态到项目状态文件');
		this._saveStatus_7ree(); // 使用项目状态保存方法
	}

	// 修改: 从项目状态加载导入的文件列表
	_loadImportedFiles_7ree() {
		// console.log('从项目状态加载文件列表及视图状态');
		
		// 从项目状态文件加载
		const status = this._loadStatus_7ree();
		if (status && status.files && status.files.length > 0) {
			this._loadFilesFromData_7ree(status.files);
			return;
		}
		
		// console.log('没有找到已保存的文件列表，将只使用默认备忘录和云笔记');
	}

	// 处理加载的文件数据
	_loadFilesFromData_7ree(files) {
		// console.log('从数据加载文件列表，文件数:', files.length);
		
		// 保留默认备忘录和云笔记标签
		const defaultNotesSkel = this.openFiles_7ree.find(f => f.id === 'default_notes_7ree');
		const cloudNotesSkel = this.openFiles_7ree.find(f => f.id === 'cloud_notes_7ree');
		this.openFiles_7ree = []; 
		// 删除对scrollPositions_7ree的重置
		this.editorPositions_7ree = {}; // 重置编辑器位置记录
		
		// 添加默认备忘录
		if (defaultNotesSkel) {
			this.openFiles_7ree.push(defaultNotesSkel);
		} else {
			this.openFiles_7ree.push({ id: 'default_notes_7ree', name: '备忘录', path: '', content: '' });
		}
		
		// 添加云笔记
		if (cloudNotesSkel) {
			this.openFiles_7ree.push(cloudNotesSkel);
		} else {
			this.openFiles_7ree.push({ id: 'cloud_notes_7ree', name: '云笔记', path: '', content: '' });
		}
		
		// console.log(`已保留固定标签，当前文件列表数: ${this.openFiles_7ree.length}`);
		
		// 处理每个文件
		for (const file of files) {
			const fileId = file.id;


			if (file.viewState !== undefined) {
				if (!this.editorPositions_7ree[fileId]) {
					this.editorPositions_7ree[fileId] = {};
				}
				
				// 验证视图状态是有效的JSON
				try {
					// 测试解析一下以确保JSON有效
					const testParse = JSON.parse(file.viewState);
					if (testParse && testParse.viewState) {
						this.editorPositions_7ree[fileId].viewState = file.viewState;
						
						// 打印视图状态信息
						const firstLine = testParse.viewState.firstPosition?.lineNumber || 1;
						// console.log(`已加载文件 ID: ${fileId} 的完整视图状态，首行: ${firstLine}, 长度: ${file.viewState.length} 字符`);
					} else {
						console.warn(`文件 ${fileId} 的视图状态无效，缺少viewState属性`);
					}
				} catch (e) {
					console.error(`无法解析文件 ${fileId} 的视图状态: ${e.message}`);
				}
			}

			
			// 跳过已添加的默认备忘录和云笔记
			if (fileId === 'default_notes_7ree' || fileId === 'cloud_notes_7ree') {
	
				continue; // 继续下一个文件
			}

			// 处理外部导入的文件
			if (file.path && fs.existsSync(file.path)) {
				try {
					const content = fs.readFileSync(file.path, 'utf8');
					
					// 记录文件的最后修改时间
					const stats = fs.statSync(file.path);
					this.fileLastModified_7ree[fileId] = stats.mtimeMs;
					// console.log(`记录文件初始修改时间: ${fileId}, 时间: ${new Date(stats.mtimeMs).toLocaleString()}`);
					
					this.openFiles_7ree.push({
						id: fileId,
						name: file.name,
						path: file.path,
						content: content
					});
					// console.log(`已自动加载导入的文件: ${file.name} (ID: ${fileId})`);
				} catch (readErr) {
					// console.error(`读取导入文件 ${file.path} 失败:`, readErr);
				}
			} else if (file.path) {
				// console.warn(`导入的文件路径不存在: ${file.path}`);
			}
		}
		// console.log('完成从数据加载文件列表');
	}

	// 新增：检测文件编码是否为UTF-8
	async isFileUTF8_7ree(filePath) {
		return new Promise((resolve, reject) => {
			try {
				// 读取文件头部数据来检测编码
				const fd = fs.openSync(filePath, 'r');
				const buffer = Buffer.alloc(4); // 读取前4个字节用于检测BOM标记
				fs.readSync(fd, buffer, 0, 4, 0);
				fs.closeSync(fd);
				
				// 检查BOM标记
				if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
					// UTF-8 with BOM
					// console.log(`文件 ${filePath} 为UTF-8(BOM)编码`);
					resolve(true);
					return;
				}
				
				// 读取完整文件内容进行更严格的UTF-8检测
				const fileBuffer = fs.readFileSync(filePath);
				
				// 更严格的UTF-8有效性检查
				let isValidUTF8 = true;
				let i = 0;
				
				while (i < fileBuffer.length) {
					// 单字节 ASCII (0xxxxxxx)
					if ((fileBuffer[i] & 0x80) === 0) {
						i += 1;
						continue;
					}
					
					// 检查多字节序列
					let bytesInSequence = 0;
					let firstByte = fileBuffer[i];
					
					// 确定多字节序列长度
					if ((firstByte & 0xE0) === 0xC0) { // 110xxxxx - 2字节序列
						bytesInSequence = 2;
					} else if ((firstByte & 0xF0) === 0xE0) { // 1110xxxx - 3字节序列
						bytesInSequence = 3;
					} else if ((firstByte & 0xF8) === 0xF0) { // 11110xxx - 4字节序列
						bytesInSequence = 4;
					} else {
						// 无效的UTF-8起始字节
						isValidUTF8 = false;
						break;
					}
					
					// 检查是否有足够的字节
					if (i + bytesInSequence > fileBuffer.length) {
						isValidUTF8 = false;
						break;
					}
					
					// 确认后续字节是否符合UTF-8格式 (10xxxxxx)
					for (let j = 1; j < bytesInSequence; j++) {
						if ((fileBuffer[i + j] & 0xC0) !== 0x80) {
							isValidUTF8 = false;
							break;
						}
					}
					
					if (!isValidUTF8) {
						break;
					}
					
					i += bytesInSequence;
				}
				
				// 如果整个文件都是有效的UTF-8编码，那么可以确定是UTF-8
				if (isValidUTF8) {
					// console.log(`文件 ${filePath} 通过严格验证为UTF-8编码`);
					resolve(true);
					return;
				}
				
				// 额外检查GBK特有特征字节序列
				// GBK编码的第一个字节范围通常在0x81-0xFE之间，第二个字节在0x40-0xFE之间
				let potentialGBK = false;
				for (let i = 0; i < fileBuffer.length - 1; i++) {
					if (fileBuffer[i] >= 0x81 && fileBuffer[i] <= 0xFE) {
						if (fileBuffer[i+1] >= 0x40 && fileBuffer[i+1] <= 0xFE) {
							potentialGBK = true;
							break;
						}
					}
				}
				
				if (potentialGBK) {
					// console.log(`文件 ${filePath} 检测到可能的GBK编码特征`);
				}
				
				// console.log(`文件 ${filePath} 不是UTF-8编码，检测结果: ${isValidUTF8 ? "有效UTF-8" : "无效UTF-8"}${potentialGBK ? "，可能是GBK编码" : ""}`);
				resolve(false);
			} catch (err) {
				// // console.error(`检查文件编码失败: ${err.message}`);
				reject(err);
			}
		});
	}

	// 修改: 导入外部文件方法
	async importFile_7ree() {
		try {
			// 先保存当前编辑的内容
			const currentFile = this.openFiles_7ree.find(f => f.id === this.currentFileId_7ree);
			if (currentFile) {
				this.saveNotesById_7ree(this.currentFileId_7ree, currentFile.content);
			}

			// 打开文件选择对话框
			const fileUri = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				filters: {
					'文本文件': ['txt', 'md', 'js', 'php', 'html', 'htm', 'css', 'json', 'xml', 'yaml', 'yml'],
					'All Files': ['*']
				},
				title: '导入外部文件'
			});

			if (fileUri && fileUri.length > 0) {
				const filePath = fileUri[0].fsPath;
				const fileName = path.basename(filePath);
				const fileId = `file_${Date.now()}_7ree`;
				
				// 验证文件是否存在
				if (!fs.existsSync(filePath)) {
					this.showErrorInWebview_7ree(
						`文件 ${fileName} 不存在或无法访问。`,
						"文件访问错误"
					);
					return;
				}
				
				// 新增：检查文件编码是否为UTF-8
				const isUTF8 = await this.isFileUTF8_7ree(filePath);
				if (!isUTF8) {
					// 直接在VSCode主窗口打开文件，不等待用户确认
					const fileUri = vscode.Uri.file(filePath);
					vscode.window.showTextDocument(fileUri, { preview: false });
					
					// 显示简化的提示信息
					this.showErrorInWebview_7ree(
						"错误，编码不兼容。<br>我们已经帮你用VSCode打开了此文件，请点击右下角文件编码类型文字将其另存为UTF-8编码后再导入。",
						"编码不兼容",
						"知道了" // 按钮文字
					);
					return;
				}
				
				// 读取文件内容 - 使用try-catch直接捕获编码错误
				let content;
				try {
					content = fs.readFileSync(filePath, 'utf8');
					
					// 额外检查：如果文件包含乱码（通常表现为替换字符），可能是编码问题
					if (content.includes('\uFFFD')) {
						throw new Error('检测到可能的编码问题（包含替换字符）');
					}
					
					// 确保内容不是undefined或null
					if (content === undefined || content === null) {
						// console.warn(`读取文件 ${fileName} 返回undefined或null内容`);
						content = ''; // 使用空字符串而不是undefined
					}
					
					// console.log(`成功读取文件内容: ${fileName}, 内容长度: ${content.length}`);
				} catch (readError) {
					// console.error(`读取文件 ${fileName} 失败，可能是编码问题:`, readError);
					// console.error(`错误详情: ${readError.stack}`);
					this.showErrorInWebviewWithAction_7ree(
						`读取 ${fileName} 时遇到了一些问题，这通常是由文件编码不兼容导致的。建议您在VSCode主窗口中打开此文件，将其转换为UTF-8格式后再导入。`,
						"读取文件失败",
						() => {
							// 创建URI并在主窗口打开该文件
							const fileUri = vscode.Uri.file(filePath);
							vscode.window.showTextDocument(fileUri, { preview: false });
						}
					);
					return;
				}
				
				// 新增：记录文件的最后修改时间
				const stats = fs.statSync(filePath);
				this.fileLastModified_7ree[fileId] = stats.mtimeMs;
				// console.log(`记录新导入文件修改时间: ${fileId}, 时间: ${new Date(stats.mtimeMs).toLocaleString()}`);
				
				// 确保文件内容有效后再添加到文件列表
				if (content === undefined) {
					content = ''; // 最后一次保证内容不是undefined
				}
				
				// 添加到打开的文件列表
				this.openFiles_7ree.push({
					id: fileId,
					name: fileName,
					path: filePath,
					content: content
				});
				
				// console.log(`成功添加文件到openFiles_7ree: ${fileName}, 内容长度: ${content.length}`);
				
				// 保存导入的文件配置
				this._saveImportedFiles_7ree();
				
				// 切换到这个文件
				this.switchFile_7ree(fileId);
			}
		} catch (err) {
			// console.error('导入文件失败:', err);
			// console.error(`错误详情: ${err.stack}`);
			// 使用状态栏显示错误
			this.showInfoInStatusBar(`导入文件失败: ${err.message}`, true);
		}
	}

	// 修改: 切换到指定文件
	async switchFile_7ree(fileId) {
		// console.log(`开始切换文件: ${fileId}`);
		
		// 如果已经是当前文件，不需要切换
		if (fileId === this.currentFileId_7ree) {
			// console.log(`已经是当前文件: ${fileId}`);
			return;
		}
		
		// 先保存当前文件的内容
		const currentFile = this.openFiles_7ree.find(f => f.id === this.currentFileId_7ree);
		if (currentFile) {
			// console.log(`保存当前文件内容: ${this.currentFileId_7ree}`);
			this.saveNotesById_7ree(this.currentFileId_7ree, currentFile.content);
		}

		// 找到要切换到的文件
		const targetFile = this.openFiles_7ree.find(f => f.id === fileId);
		if (!targetFile) {
			// console.error(`未找到ID为 ${fileId} 的文件`);
			this.showInfoInStatusBar(`未找到ID为 ${fileId} 的文件`, true);
			return;
		}
		
		// 如果是外部文件，验证其存在性和编码格式
		if (fileId !== 'default_notes_7ree' && fileId !== 'cloud_notes_7ree' && targetFile.path) {
			// 检查文件是否存在
			if (!fs.existsSync(targetFile.path)) {
				// console.error(`文件不存在: ${targetFile.path}`);
				this.showInfoInStatusBar(`文件不存在: ${targetFile.path}。该文件可能已被移动或删除。`, true);
				return;
			}
			
			// 验证文件是否为UTF-8编码
			try {
				const isUTF8 = await this.isFileUTF8_7ree(targetFile.path);
				if (!isUTF8) {
					// 直接在VSCode主窗口打开文件
					const fileUri = vscode.Uri.file(targetFile.path);
					vscode.window.showTextDocument(fileUri, { preview: false });
					
					// 显示简化的错误消息
					this.showErrorInWebview_7ree(
						"错误，编码不兼容。<br>我们已经帮你用VSCode打开了此文件，请点击右下角文件编码类型文字将其另存为UTF-8编码后再导入。",
						"编码不兼容",
						"知道了" // 按钮文字
					);
					return;
				}
			} catch (err) {
				// // console.error(`检查文件编码失败: ${err.message}`);
				this.showErrorInWebview_7ree(`检查文件时遇到了问题: ${err.message}`, "检查文件失败");
				return;
			}
		}
		
		// 更新当前文件ID
		// console.log(`更新当前文件ID从 ${this.currentFileId_7ree} 到 ${fileId}`);
		this.currentFileId_7ree = fileId;
		
		// console.log(`切换到文件: ${targetFile.name}`);
		
		// 如果是默认备忘录，加载保存的内容
		if (fileId === 'default_notes_7ree') {
			// console.log('加载默认备忘录');
			
			// 尝试从文件中读取最新内容
			try {
				if (fs.existsSync(this.notesFile)) {
					const content = fs.readFileSync(this.notesFile, 'utf8');
					this.notesContent = content;
					// console.log(`已从文件读取默认备忘录内容，长度: ${content.length}`);
					
					// 更新内存中的内容
					const defaultNote = this.openFiles_7ree.find(f => f.id === 'default_notes_7ree');
					if (defaultNote) {
						defaultNote.content = content;
					}
				} else {
					// console.log(`默认备忘录文件不存在，将创建: ${this.notesFile}`);
					this._ensureNotesDirectoryExists();
					fs.writeFileSync(this.notesFile, '', 'utf8');
					this.notesContent = '';
					
					// 更新内存中的内容
					const defaultNote = this.openFiles_7ree.find(f => f.id === 'default_notes_7ree');
					if (defaultNote) {
						defaultNote.content = '';
					}
				}
			} catch (err) {
				// console.error(`读取默认备忘录失败: ${err.message}`);
				// 出错时使用空内容
				this.notesContent = '';
				const defaultNote = this.openFiles_7ree.find(f => f.id === 'default_notes_7ree');
				if (defaultNote) {
					defaultNote.content = '';
				}
			}
			
			// 加载笔记
			this.loadNotes();
		} 
		// 如果是云笔记，加载云笔记内容
		else if (fileId === 'cloud_notes_7ree') {
			// console.log('加载云笔记');
			
			// 修改逻辑：首先发送一个特殊消息，通知webview准备使用临时变量中的内容
			if (this.view && this.view.webview) {
				// 先获取已保存的视图状态（如有）
				const cloudNote = this.openFiles_7ree.find(f => f.id === 'cloud_notes_7ree');
				const viewState = this.editorPositions_7ree && this.editorPositions_7ree[fileId] 
					? this.editorPositions_7ree[fileId].viewState 
					: undefined;
				
				// console.log('云笔记切换策略：先发送切换消息，然后使用临时缓存的Joplin内容');
				
				// 尝试从文件中读取最新内容作为备用
				let fallbackContent = '';
				try {
					if (fs.existsSync(this.cloudNotesFile_7ree)) {
						fallbackContent = fs.readFileSync(this.cloudNotesFile_7ree, 'utf8');
						// console.log(`已从文件读取云笔记内容作为备用，长度: ${fallbackContent.length}`);
						
						// 更新内存中的内容
						if (cloudNote) {
							cloudNote.content = fallbackContent;
						}
					} else {
						// console.log(`云笔记文件不存在，将创建: ${this.cloudNotesFile_7ree}`);
						// 确保目录存在
						const dirPath = path.dirname(this.cloudNotesFile_7ree);
						if (!fs.existsSync(dirPath)) {
							fs.mkdirSync(dirPath, { recursive: true });
						}
						fs.writeFileSync(this.cloudNotesFile_7ree, '', 'utf8');
						fallbackContent = '';
						
						// 更新内存中的内容
						if (cloudNote) {
							cloudNote.content = '';
						}
					}
				} catch (err) {
					// // console.error(`读取云笔记失败: ${err.message}`);
					fallbackContent = '';
					// 出错时使用空内容
					if (cloudNote) {
						cloudNote.content = '';
					}
				}
				
				// 发送内容到WebView，带上useTemporaryContent标志
				this.view.webview.postMessage({
					command: 'loadNotes',
					text: fallbackContent, // 发送备用内容
					fileId: fileId,
					files: this.openFiles_7ree,
					viewState: viewState,
					useTemporaryContent: true // 新增标志，指示webview优先使用临时变量中的内容
				});
				
				// 随后发送初始化Joplin API的消息，触发从临时变量获取最新内容
				setTimeout(() => {
					if (this.view && this.view.webview) {
						this.view.webview.postMessage({
								command: 'initJoplinApi'
							});
						// console.log('已发送初始化Joplin API消息，优先使用临时变量中的内容');
					}
				}, 800); // 延迟发送，确保WebView已准备好
			}
		}
		else {
			// 加载外部文件内容
			if (this.view && this.view.visible) {
				// console.log(`加载外部文件: ${targetFile.name}, 当前内存中内容长度: ${targetFile.content ? targetFile.content.length : 0}`);
				
				// 确保文件内容是最新的
				try {
					if (targetFile.path && fs.existsSync(targetFile.path)) {
						const newContent = fs.readFileSync(targetFile.path, 'utf8');
						// 如果读取成功，更新内容
						if (newContent !== undefined && newContent !== null) {
							targetFile.content = newContent;
							// console.log(`已重新读取文件内容: ${targetFile.path}, 内容长度: ${newContent.length}`);
						} else {
							// // console.error(`文件内容读取为空或undefined: ${targetFile.path}`);
							// 如果内容为空或undefined，但现有内容存在，则保留现有内容
							if (!targetFile.content) {
								targetFile.content = ''; // 确保至少有空字符串而不是undefined
							}
						}
					} else {
						// // console.warn(`文件路径不存在: ${targetFile.path}, 使用现有缓存内容`);
						// 确保现有内容不是undefined
						if (!targetFile.content) {
							targetFile.content = '';
						}
					}
				} catch (err) {
					// console.error(`重新读取文件失败: ${targetFile.path}`, err);
					// // console.error(`错误详情: ${err.stack}`);
					
					// 如果读取失败，但现有内容存在，保留现有内容
					if (!targetFile.content) {
						targetFile.content = `// 无法读取文件内容，可能是编码问题或文件访问限制\n// 错误信息: ${err.message}`;
					}
					
					vscode.window.showErrorMessage(`重新读取文件失败: ${err.message}`);
				}
				

				
				// 确保不发送undefined内容
				if (targetFile.content === undefined || targetFile.content === null) {
					// console.warn(`准备发送的内容为undefined或null，已替换为空字符串`);
					targetFile.content = '';
				}
				
				// 获取视图状态信息
				const viewState = this.editorPositions_7ree && this.editorPositions_7ree[fileId] 
				    ? this.editorPositions_7ree[fileId].viewState 
				    : undefined;
				
				// console.log(`向WebView发送内容 for fileId: ${fileId}, 内容长度: ${targetFile.content.length}`);
				// console.log(`- 视图状态: ${viewState ? '已保存' : '未保存'}`);
				
				this.view.webview.postMessage({
					command: 'loadNotes',
					text: targetFile.content,
					fileId: fileId,
					files: this.openFiles_7ree,
					viewState: viewState
				});
				
				// console.log(`已发送消息到webview，切换到文件: ${targetFile.name}`);
			} else {
				// console.warn('WebView不可见，无法加载文件');
			}
		}
		this._saveLastActiveFileId_7ree();
		
		// 如果是外部文件，检查并更新文件的最后修改时间
		if (fileId !== 'default_notes_7ree') {
			const file = this.openFiles_7ree.find(f => f.id === fileId);
			if (file && file.path && fs.existsSync(file.path)) {
				try {
					const stats = fs.statSync(file.path);
					this.fileLastModified_7ree[fileId] = stats.mtimeMs;
					// console.log(`切换文件时更新修改时间: ${fileId}, 时间: ${new Date(stats.mtimeMs).toLocaleString()}`);
				} catch (err) {
					// console.error(`获取文件修改时间失败: ${err.message}`);
				}
			}
		}
	}

	// 保存笔记到文件
	saveNotes() {
		if (!this._ensureNotesDirectoryExists()) {
			return; // 如果目录创建失败则不保存
		}
		try {
			fs.writeFileSync(this.notesFile, this.notesContent);
			// 更新状态
			if (this.view) {
				this.view.webview.postMessage({
					command: 'updateStatus',
					status: `上次保存: ${new Date().toLocaleTimeString()}`
				});
			}
			vscode.window.setStatusBarMessage('笔记已保存到: ' + this.notesFile, 3000);
		} catch (err) {
			vscode.window.showErrorMessage(`保存笔记失败: ${err.message}`);
			// console.error('Failed to save notes to', this.notesFile, err);
		}
	}

	// 修改：saveNotesById_7ree，移除topVisibleLineAndAnchor参数
	saveNotesById_7ree(fileId, content, isSwitchingTabs = false) {
		// console.log(`开始保存文件 ${fileId}，是否切换标签: ${isSwitchingTabs}`);
		
		const fileIndex = this.openFiles_7ree.findIndex(f => f.id === fileId);
		if (fileIndex !== -1) {
			this.openFiles_7ree[fileIndex].content = content;
			// console.log(`文件 ${fileId} 的内存内容已更新`);
		} else {
			// console.warn(`尝试保存未在openFiles_7ree中找到的文件ID: ${fileId}`);
		}
		
		if (fileId === 'default_notes_7ree') {
			this.notesContent = content;
			this.saveNotes(); 
			// console.log(`默认备忘录 ${fileId} 已通过 saveNotes() 保存`);
		} 
		else if (fileId === 'cloud_notes_7ree') {
			// 保存云笔记内容到文件
			try {
				// 确保目录存在
				const dirPath = path.dirname(this.cloudNotesFile_7ree);
				if (!fs.existsSync(dirPath)) {
					fs.mkdirSync(dirPath, { recursive: true });
				}
				fs.writeFileSync(this.cloudNotesFile_7ree, content);
				// console.log(`云笔记 ${fileId} 已保存到 ${this.cloudNotesFile_7ree}`);
				if (this.view && !isSwitchingTabs && this.currentFileId_7ree === fileId) {
					this.view.webview.postMessage({
						command: 'updateStatus',
						status: `上次保存: ${new Date().toLocaleTimeString()}`
					});
				}
				if (!isSwitchingTabs) {
					vscode.window.setStatusBarMessage(`云笔记已保存到: ${this.cloudNotesFile_7ree}`, 3000);
				}
			} catch (err) {
				vscode.window.showErrorMessage(`保存云笔记失败: ${err.message}`);
				// console.error(`保存云笔记失败:`, err);
			}
		}
		else {
			const file = this.openFiles_7ree.find(f => f.id === fileId);
			if (file && file.path) {
				try {
					fs.writeFileSync(file.path, content);
					
					// 更新文件的最后修改时间
					const stats = fs.statSync(file.path);
					this.fileLastModified_7ree[fileId] = stats.mtimeMs;
					// console.log(`保存文件后更新修改时间: ${fileId}, 时间: ${new Date(stats.mtimeMs).toLocaleString()}`);
					
					// console.log(`外部文件 ${file.path} (ID: ${fileId}) 已保存`);
					if (this.view && !isSwitchingTabs && this.currentFileId_7ree === fileId) {
						this.view.webview.postMessage({
							command: 'updateStatus',
							status: `上次保存: ${new Date().toLocaleTimeString()}`
						});
					}
					if (!isSwitchingTabs) {
						vscode.window.setStatusBarMessage(`笔记已保存到: ${file.path}`, 3000);
					}
				} catch (err) {
					vscode.window.showErrorMessage(`保存到 ${file.path} 失败: ${err.message}`);
					// console.error(`保存 ${file.path} 失败:`, err);
				}
			} else {
				// console.warn(`尝试保存的外部文件 ${fileId} 没有有效的路径或未找到`);
			}
		}
		

		this._saveImportedFiles_7ree(); 
		if (this.currentFileId_7ree === fileId) { 
            this._saveLastActiveFileId_7ree();
        }
	}

	// 新增：检查外部文件是否有变动
	async checkFileChanged_7ree(fileId, currentContent) {
		// console.log(`检查文件是否有变动: ${fileId}`);
		
		const file = this.openFiles_7ree.find(f => f.id === fileId);
		let filePath = '';
		
		// 针对不同类型文件获取对应的文件路径
		if (fileId === 'default_notes_7ree') {
			// 对于默认备忘录，使用notesFile作为路径
			filePath = this.notesFile;
			
			// 确保默认备忘录文件存在
			if (!fs.existsSync(filePath)) {
				// console.log(`默认备忘录文件不存在: ${filePath}`);
				// 如果默认备忘录不存在，直接返回无变动
				this.view?.webview.postMessage({
					command: 'fileCheckResult',
					fileId: fileId,
					changed: false
				});
				return;
			}
		}else if (fileId === 'cloud_notes_7ree') {
			// 针对云笔记，使用cloudNotesFile_7ree作为路径 
			filePath = this.cloudNotesFile_7ree;
			
			// 确保云笔记文件存在
			if (!fs.existsSync(filePath)) {
				// console.log(`云笔记文件不存在: ${filePath}`);
				// 确保目录存在
				const dirPath = path.dirname(filePath);
				if (!fs.existsSync(dirPath)) {
					fs.mkdirSync(dirPath, { recursive: true });
				}
				fs.writeFileSync(filePath, '', 'utf8');
				
				this.view?.webview.postMessage({
					command: 'fileCheckResult',
					fileId: fileId,
					changed: false
				});
				return;
			}
		}else {
			// 对于导入的外部文件，使用文件对象的path
			if (!file || !file.path || !fs.existsSync(file.path)) {
				// console.log(`文件不存在或路径无效: ${fileId}`);
				this.view?.webview.postMessage({
					command: 'fileCheckResult',
					fileId: fileId,
					changed: false
				});
				return;
			}
			filePath = file.path;
		}
		
		try {
			// 获取文件的当前修改时间和大小
			const stats = fs.statSync(filePath);
			const currentMtime = stats.mtimeMs;
			const currentSize = stats.size;
			const formattedSize = this.formatFileSize_7ree(currentSize);
			
			// 如果没有记录过这个文件的修改时间，先记录下来
			if (!this.fileLastModified_7ree[fileId]) {
				this.fileLastModified_7ree[fileId] = currentMtime;
				// console.log(`首次记录文件修改时间: ${fileId}, 时间: ${new Date(currentMtime).toLocaleString()}, 大小: ${formattedSize}`);
				this.view?.webview.postMessage({
					command: 'fileCheckResult',
					fileId: fileId,
					changed: false
				});
				return;
			}
			
			// 检查修改时间是否变化
			if (currentMtime > this.fileLastModified_7ree[fileId]) {
				// console.log(`检测到文件变动: ${fileId}`);
				// console.log(`- 上次修改时间: ${new Date(this.fileLastModified_7ree[fileId]).toLocaleString()}`);
				// console.log(`- 当前修改时间: ${new Date(currentMtime).toLocaleString()}`);
				// console.log(`- 文件大小: ${formattedSize}`);
				
				// 更新记录的修改时间
				this.fileLastModified_7ree[fileId] = currentMtime;
				
				// 新增：检查文件编码是否为UTF-8
				try {
					const isUTF8 = await this.isFileUTF8_7ree(filePath);
					if (!isUTF8) {
						// console.error(`检测到文件编码不是UTF-8: ${filePath}`);
						this.showErrorInWebview_7ree(
							`发现 ${file?.name || path.basename(filePath)} 有更新，但文件编码似乎不是UTF-8。您可以尝试转换后再查看最新内容。`,
							"编码不兼容"
						);
						
						// 不更新内容，返回未变更状态
						this.view?.webview.postMessage({
							command: 'fileCheckResult',
							fileId: fileId,
							changed: false,
							error: "文件编码不兼容，无法加载更新"
						});
						return;
					}
				} catch (err) {
					// console.error(`检查文件编码失败: ${err.message}`);
					// 继续处理，因为这可能是暂时性错误
				}
				
				// 读取文件的最新内容
				const newContent = fs.readFileSync(filePath, 'utf8');
				
				// 如果内容有变化，通知webview更新
				if (newContent !== currentContent) {
					const newSize = Buffer.byteLength(newContent, 'utf8');
					const oldSize = Buffer.byteLength(currentContent, 'utf8');
					const sizeDiff = newSize - oldSize;
					// console.log(`文件内容已变化, 新大小: ${this.formatFileSize_7ree(newSize)}, 变化: ${sizeDiff > 0 ? '+' : ''}${this.formatFileSize_7ree(Math.abs(sizeDiff))}`);
					
					// 更新内存中的文件内容
					if (fileId === 'default_notes_7ree') {
						this.notesContent = newContent;
					} else if (file) {
						file.content = newContent;
					}
					
					// 通知webview更新内容
					this.view?.webview.postMessage({
						command: 'fileCheckResult',
						fileId: fileId,
						changed: true,
						newContent: newContent
					});
					
					// 更新状态栏
					const displayName = fileId === 'default_notes_7ree' ? '备忘录' : (file?.name || fileId);
					vscode.window.setStatusBarMessage(`文件已从外部更新: ${displayName} (${this.formatFileSize_7ree(newSize)})`, 3000);
					return;
				}
			}
			
			// 文件没有变动
			// console.log(`文件无变动: ${fileId}, 大小: ${formattedSize}`);
			this.view?.webview.postMessage({
				command: 'fileCheckResult',
				fileId: fileId,
				changed: false
			});
			
		} catch (err) {
			// console.error(`检查文件变动出错: ${err.message}`);
			this.view?.webview.postMessage({
				command: 'fileCheckResult',
				fileId: fileId,
				changed: false,
				error: err.message
			});
		}
	}

	// 修改: 从文件加载笔记
	loadNotes() {
		// console.log(`loadNotes: 当前活动文件ID: ${this.currentFileId_7ree}`);
		
		if (!this.view) {
			// console.warn('loadNotes: View 未初始化');
			return;
		}
		
		if (!this.view.visible) {
			// console.log('loadNotes: View 当前不可见，跳过加载');
			return;
		}
		
		let filePath = '';
		let fileId = this.currentFileId_7ree;
		let isDefaultNotes = fileId === 'default_notes_7ree';
		let isCloudNotes = fileId === 'cloud_notes_7ree';
		
		// 如果当前活动标签是云笔记，检查云笔记是否可用
		if (isCloudNotes) {
			// 加载全局设置，确保有最新的enableJoplin_7ree值
			const globalSettings = this._loadGlobalSettings_7ree(false);
			
			// 检查云笔记是否可用
			let enableJoplin = false;
			if (globalSettings && globalSettings.enableJoplin_7ree !== undefined) {
				if (typeof globalSettings.enableJoplin_7ree === 'string') {
					enableJoplin = globalSettings.enableJoplin_7ree.toLowerCase() === 'true';
				} else if (typeof globalSettings.enableJoplin_7ree === 'boolean') {
					enableJoplin = globalSettings.enableJoplin_7ree;
				}
			}
			
			// console.log(`【loadNotes】检查云笔记可用性: ${enableJoplin}，当前活动标签是云笔记`);
			
			// 如果云笔记不可用，切换到默认备忘录
			if (!enableJoplin) {
				// console.log('【loadNotes】云笔记不可用，切换到默认备忘录');
				fileId = 'default_notes_7ree';
				this.currentFileId_7ree = fileId;
				isCloudNotes = false;
				isDefaultNotes = true;
			}
		}
		
		// 确定文件路径
		if (isDefaultNotes) {
			// 对于默认笔记，使用预设路径
			filePath = this.notesFile; // 使用notesFile而不是拼接路径
			// console.log(`默认笔记路径: ${filePath}`);
		} 
		else if (isCloudNotes) {
			// 对于云笔记，使用预设路径
			filePath = this.cloudNotesFile_7ree;
			// console.log(`云笔记路径: ${filePath}`);
			//添加检查点，读取云笔记文件的更新时间用console.log()打印出来
			const stats = fs.statSync(filePath);
			const updateTime = stats.mtimeMs;
			// console.log(`云笔记文件的原始更新时间: ${new Date(updateTime).toLocaleString()}`);
		}
		else {
			// 对于导入的文件，使用存储的路径
			const fileInfo = this.openFiles_7ree.find(f => f.id === fileId);
			if (fileInfo && fileInfo.path) {
				filePath = fileInfo.path;
				// console.log(`导入的文件路径: ${filePath}`);
			} else {
				// console.warn(`找不到文件ID: ${fileId} 的路径，切换到默认笔记`);
				fileId = 'default_notes_7ree';
				filePath = this.notesFile; // 使用notesFile而不是拼接路径
				this.currentFileId_7ree = fileId;
				isDefaultNotes = true;
			}
		}
		
		try {
			// 读取文件内容
			let fileContent = '';
			
			if (isDefaultNotes) {
				// 对默认备忘录使用notesFile的路径
				filePath = this.notesFile;
				
				// 确保文件存在，如果不存在则先保存
				if (!fs.existsSync(filePath)) {
					// console.log(`默认备忘录文件不存在，将先创建: ${filePath}`);
					this.saveNotes(); // 先保存一次确保文件存在
				}
			} 
			else if (isCloudNotes) {
				// 对于云笔记，使用cloudNotesFile_7ree的路径
				filePath = this.cloudNotesFile_7ree;
				
				// 确保云笔记文件存在
				if (!fs.existsSync(filePath)) {
					// console.log(`云笔记文件不存在: ${filePath}`);
					this.view?.webview.postMessage({
						command: 'fileCheckResult',
						fileId: fileId,
						changed: false
					});
					return;
				}
			}
			else {
				// 获取外部文件对象
				const file = this.openFiles_7ree.find(f => f.id === fileId);
				if (file && file.path) {
					
					filePath = file.path;
				} else {
					// console.error(`未找到有效路径的文件: ${fileId}`);
					if (this.view) {
						this.view.webview.postMessage({
							command: 'openFileResult',
							success: false,
							error: '未找到文件或文件无有效路径'
						});
					}
					vscode.window.showErrorMessage(`无法找到文件，该文件可能已被删除或移动`);
					return;
				}
			}
			
			// 确保文件存在
			if (!fs.existsSync(filePath)) {
				const errorMsg = `文件不存在: ${filePath}。该文件可能已被移动或删除。`;
				// console.error(errorMsg);
				if (this.view) {
					this.view.webview.postMessage({
						command: 'openFileResult',
						success: false,
						error: errorMsg
					});
				}
				vscode.window.showErrorMessage(errorMsg);
				return;
			}
			
			// 先保存文件内容，确保最新
			try {
				if (fileId === 'default_notes_7ree') {
					this.saveNotes();
				}
				else if (fileId === 'cloud_notes_7ree') {
					// 对于云笔记，如果内存中有内容，则保存到文件
					const cloudNote = this.openFiles_7ree.find(f => f.id === 'cloud_notes_7ree');
					if (cloudNote && cloudNote.content !== undefined) {
						this.saveNotesById_7ree(fileId, cloudNote.content);
					}
				}
			} catch (err) {
				// console.error(`在打开前保存文件失败: ${err.message}`);
			}
			
			// 读取文件内容
			fileContent = fs.readFileSync(filePath, 'utf8');
			// console.log(`已读取文件: ${filePath}, 内容长度: ${fileContent.length}`);
			
			
			// 获取视图状态，删除滚动信息相关代码
			let viewState = undefined;
			if (this.editorPositions_7ree && this.editorPositions_7ree[fileId]) {
				viewState = this.editorPositions_7ree[fileId].viewState;
				// console.log(`获取到文件 ${fileId} 的视图状态:`, viewState);
			}else {
				// console.log(`未找到文件 ${fileId} 的视图状态，editorPositions_7ree:`, this.editorPositions_7ree);
			}
			
			// 保存到缓存
			this.fileContentCache_7ree[fileId] = fileContent;
			
			// 发送内容到 WebView
			if (this.view.visible) {
				// 确保未定义的项不会被传递为 null 或 undefined
				const textToSend = fileContent || '';
				
				// 发送完整的数据包括视图状态，删除scrollPosition和scrollTopRatio参数
				this.view.webview.postMessage({
					command: 'loadNotes',
					text: textToSend,
					fileId: fileId,
					files: this.openFiles_7ree,
					viewState: viewState, // 只发送视图状态
					settings: this.uiSettings_7ree
				});
				
				// console.log(`已发送内容到WebView: 文件ID=${fileId}, 内容长度=${textToSend.length}`);
				// console.log(`- 视图状态: ${viewState ? '已设置' : '未设置'}`);
				
				// 如果是云笔记，发送初始化Joplin API的消息，触发从API获取最新内容
				if (isCloudNotes) {
					setTimeout(() => {
						if (this.view && this.view.webview) {
							this.view.webview.postMessage({
								command: 'initJoplinApi'
							});
							// console.log('loadNotes后发送initJoplinApi消息，将从API获取最新内容');
						}
					}, 1000); // 延迟1秒，确保WebView已加载完成
				}
			} else {
				// console.warn('loadNotes: WebView不可见，无法发送消息');
			}
		} catch (err) {
			// console.error(`读取文件错误: ${filePath}`, err);
			
			// 尝试使用缓存
			const cachedContent = this.fileContentCache_7ree[fileId];
			if (cachedContent) {
				// console.log(`使用缓存内容: ${fileId}，长度: ${cachedContent.length}`);
				this.sendContentToWebview(fileId, cachedContent);
				
				// 如果是云笔记，即使使用缓存也尝试从API获取最新内容
				if (isCloudNotes) {
					setTimeout(() => {
						if (this.view && this.view.webview) {
							this.view.webview.postMessage({
								command: 'initJoplinApi'
							});
							// console.log('加载缓存后尝试从Joplin API获取内容');
						}
					}, 1000);
				}
			} else if (isDefaultNotes) {
				// 默认笔记出错且无缓存，使用空字符串
				// console.warn('默认笔记读取错误且无缓存，使用空内容');
				this.sendContentToWebview(fileId, '');
			} else {
				// 导入文件出错且无缓存，切换到默认笔记
				// console.warn(`文件读取错误且无缓存: ${filePath}，切换到默认笔记`);
				this.loadDefaultNotes_7ree();
			}
		}
	}

	// 在 sendContentToWebview 方法中也删除topVisibleLine部分
	sendContentToWebview(fileId, content) {
		if (!this.view || !this.view.visible) {
			// console.log('WebView不可见，无法发送内容');
			return;
		}
		
		// 获取视图状态，删除滚动信息相关代码
		let viewState = undefined;
		
		// 从编辑器位置中获取视图状态
		if (this.editorPositions_7ree && this.editorPositions_7ree[fileId]) {
			viewState = this.editorPositions_7ree[fileId].viewState;
		}
		
		// 删除对scrollPosition和scrollTopRatio的获取
		
		this.view.webview.postMessage({
			command: 'loadNotes',
			text: content || '',
			fileId: fileId,
			files: this.openFiles_7ree,
			viewState: viewState, // 只发送视图状态
			settings: this.uiSettings_7ree
		});
	}

	// 新增：格式化文件大小的辅助函数
	formatFileSize_7ree(bytes) {
		if (bytes === 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
	}

	// 生成 HTML
	_getHtmlForWebview(webview) {
		// 获取文件 URI
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'webview.js'));
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'style.css'));
        const resourcesBaseUri_7ree = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources'));
        
        // 添加Joplin API脚本URI
        const webviewUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media'));
        
        // 添加Monaco Editor资源URI
        const monacoEditorUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', 'monaco-editor', 'min', 'vs'));

		// 读取 HTML 模板
		const htmlPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'main.html').fsPath;
		let html = fs.readFileSync(htmlPath, 'utf8');

		// 替换占位符
		html = html.replace(/\{\{scriptUri\}\}/g, scriptUri.toString());
		html = html.replace(/\{\{styleUri\}\}/g, styleUri.toString());
        html = html.replace(/\{\{resourcesBaseUri_7ree\}\}/g, resourcesBaseUri_7ree.toString());
        html = html.replace(/\{\{monacoEditorUri\}\}/g, monacoEditorUri.toString() + '/loader.js');
        html = html.replace(/\{\{webviewUri\}\}/g, webviewUri.toString());

		return html;
	}

	// 修改: 使用VSCode在主窗口打开文件
	openFileExternally_7ree(fileId) {
		// console.log(`尝试在VSCode主窗口打开文件 ${fileId}`);
		
		// 查找文件
		const file = this.openFiles_7ree.find(f => f.id === fileId);
		
		// 处理默认备忘录的情况
		let filePath = '';
		if (fileId === 'default_notes_7ree') {
			// 对默认备忘录使用notesFile的路径
			filePath = this.notesFile;
			
			// 确保文件存在，如果不存在则先保存
			if (!fs.existsSync(filePath)) {
				// console.log(`默认备忘录文件不存在，将先创建: ${filePath}`);
				this.saveNotes(); // 先保存一次确保文件存在
			}
		}else if (fileId === 'cloud_notes_7ree') {
			// 对云笔记使用cloudNotesFile_7ree的路径
			filePath = this.cloudNotesFile_7ree;
			
			// 确保文件存在，如果不存在则先创建
			if (!fs.existsSync(filePath)) {
				// console.log(`云笔记文件不存在，将先创建: ${filePath}`);
				// 确保目录存在
				const dirPath = path.dirname(filePath);
				if (!fs.existsSync(dirPath)) {
					fs.mkdirSync(dirPath, { recursive: true });
				}
				fs.writeFileSync(filePath, '', 'utf8');
			}

		} else if (file && file.path) {
			filePath = file.path;
		} else {
			// console.error(`未找到有效路径的文件: ${fileId}`);
			if (this.view) {
				this.view.webview.postMessage({
					command: 'openFileResult',
					success: false,
					error: '未找到文件或文件无有效路径'
				});
			}
			vscode.window.showErrorMessage(`无法找到文件，该文件可能已被删除或移动`);
			return;
		}
		
		// 确保文件存在
		if (!fs.existsSync(filePath)) {
			const errorMsg = `文件不存在: ${filePath}。该文件可能已被移动或删除。`;
			// console.error(errorMsg);
			if (this.view) {
				this.view.webview.postMessage({
					command: 'openFileResult',
					success: false,
					error: errorMsg
				});
			}
			this.showInfoInStatusBar(errorMsg, true);
			return;
		}
		
		// 先保存文件内容，确保最新
		try {
			if (fileId === 'default_notes_7ree') {
				this.saveNotes();
			} else if (file) {
				this.saveNotesById_7ree(fileId, file.content);
			}
		} catch (err) {
			// console.error(`在打开前保存文件失败: ${err.message}`);
		}
		
		// 使用VSCode API打开文件
		try {
			// 创建URI
			const fileUri = vscode.Uri.file(filePath);
			
			// 使用VSCode打开文件
			vscode.window.showTextDocument(fileUri, {
				preview: false, // 不是预览模式，而是真正打开文件
				viewColumn: vscode.ViewColumn.One // 在第一个编辑器组打开
			}).then(() => {
				const displayName = fileId === 'default_notes_7ree' ? '默认备忘录' : (file ? file.name : filePath);
				// console.log(`已在VSCode主窗口打开文件: ${filePath}`);
				if (this.view) {
					this.view.webview.postMessage({
						command: 'openFileResult',
						success: true
					});
				}
				// 使用我们自己的状态栏信息替代VSCode的状态栏消息
				this.showInfoInStatusBar(`已在主窗口打开: ${displayName}`, false);
			}, (err) => {
				// console.error(`打开文件失败: ${err.message}`);
				if (this.view) {
					this.view.webview.postMessage({
						command: 'openFileResult',
						success: false,
						error: err.message
					});
				}
				this.showInfoInStatusBar(`打开文件失败: ${err.message}`, true);
			});
		} catch (error) {
			// console.error(`打开文件过程中发生错误: ${error.message}`);
			if (this.view) {
				this.view.webview.postMessage({
					command: 'openFileResult',
					success: false,
					error: error.message
				});
			}
			this.showInfoInStatusBar(`打开文件失败: ${error.message}`, true);
		}
	}

	// 新增：重命名标签功能
	renameTab_7ree(fileId, newName) {
		// console.log(`收到重命名标签请求: ${fileId} -> ${newName}`);
		
		if (!fileId || !newName) {
			// console.warn('重命名标签 - 缺少必要参数');
			return;
		}
		
		// 查找要重命名的文件
		const fileIndex = this.openFiles_7ree.findIndex(f => f.id === fileId);
		if (fileIndex === -1) {
			// console.warn(`找不到要重命名的标签: ${fileId}`);
			return;
		}
		
		// 保存原始名称用于显示
		const oldName = this.openFiles_7ree[fileIndex].name;
		
		// 只更新标签名称，不影响文件路径
		this.openFiles_7ree[fileIndex].name = newName;
		// console.log(`标签已重命名: ${oldName} -> ${newName}`);
		
		// 保存更新后的设置
		this._saveImportedFiles_7ree();
		
		// 通知 Webview 更新显示，删除滚动位置信息
		if (this.view && this.view.visible) {
			this.view.webview.postMessage({
				command: 'loadNotes',
				files: this.openFiles_7ree,
				fileId: this.currentFileId_7ree,
				text: this.openFiles_7ree.find(f => f.id === this.currentFileId_7ree)?.content,
				// 删除scrollPosition和scrollTopRatio
			});
			
			// 在状态栏显示重命名成功消息
			vscode.window.setStatusBarMessage(`标签已重命名: ${oldName} -> ${newName}`, 3000);
		}
	}

	// 新增：处理标签重排序
	reorderTabs_7ree(draggedId, targetId, position) {
		// console.log(`收到重排序标签请求: ${draggedId} ${position} ${targetId}`);
		
		if (!draggedId || !targetId || !position) {
			// console.warn('重排序标签 - 缺少必要参数');
			return;
		}
		
		// 查找要移动的标签和目标标签
		const draggedIndex = this.openFiles_7ree.findIndex(f => f.id === draggedId);
		const targetIndex = this.openFiles_7ree.findIndex(f => f.id === targetId);
		
		// 检查标签是否存在
		if (draggedIndex === -1 || targetIndex === -1) {
			// console.warn(`找不到要重排序的标签: ${draggedId} 或 ${targetId}`);
			return;
		}
		
		// 如果是默认备忘录或云笔记，或者目标和拖动的是同一个标签，则不处理
		if (draggedId === 'default_notes_7ree' || draggedId === 'cloud_notes_7ree' || draggedId === targetId) {
			// console.warn(`无法重排序: ${draggedId} ${position} ${targetId}`);
			return;
		}
		
		// 从数组中移除拖动的标签
		const [movedTab] = this.openFiles_7ree.splice(draggedIndex, 1);
		
		// 确定新的插入位置
		let newIndex;
		if (position === 'before') {
			newIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
		} else { // 'after'
			newIndex = targetIndex > draggedIndex ? targetIndex : targetIndex + 1;
		}
		
		// 确保默认备忘录和云笔记始终在前两位
		if (newIndex <= 1 && (this.openFiles_7ree[0].id === 'default_notes_7ree' && this.openFiles_7ree[1].id === 'cloud_notes_7ree')) {
			newIndex = 2;
		}
		else if (newIndex === 0 && this.openFiles_7ree[0].id === 'default_notes_7ree') {
			newIndex = 1;
		}
		
		// 插入到新位置
		this.openFiles_7ree.splice(newIndex, 0, movedTab);
		
		// console.log(`标签已重排序: ${draggedId} 从 ${draggedIndex} 移动到 ${newIndex}`);
		
		// 保存更新后的设置
		this._saveImportedFiles_7ree();
		
		// 通知 Webview 更新显示，删除滚动位置信息
		if (this.view && this.view.visible) {
			this.view.webview.postMessage({
				command: 'loadNotes',
				files: this.openFiles_7ree,
				fileId: this.currentFileId_7ree,
				text: this.openFiles_7ree.find(f => f.id === this.currentFileId_7ree)?.content,
				// 删除scrollPosition和scrollTopRatio
			});
			
			// 在状态栏显示重排序成功消息
			vscode.window.setStatusBarMessage(`标签顺序已更新`, 3000);
		}
	}

	// 新增：获取笔记目录的方法
	getNotesDirectory_7ree() {
		if (!this.notesDir) {
			this._initializeNotesPath();
		}
		this._ensureNotesDirectoryExists();
		return this.notesDir;
	}

	// 新增：加载默认笔记的方法
	loadDefaultNotes_7ree() {
		// console.log('加载默认笔记');
		this.currentFileId_7ree = 'default_notes_7ree';
		this._saveLastActiveFileId_7ree();
		this.loadNotes();
	}

	// 添加新方法：预先加载默认备忘录和云笔记内容
	_loadDefaultNotesContent() {
		try {
			// 确保notesFile路径已经初始化
			if (this.notesFile && fs.existsSync(this.notesFile)) {
				// 读取默认备忘录内容
				this.notesContent = fs.readFileSync(this.notesFile, 'utf8');
				// console.log(`已预加载默认备忘录内容，长度: ${this.notesContent.length}`);
				
				// 更新默认备忘录的内存内容
				const defaultNote = this.openFiles_7ree.find(f => f.id === 'default_notes_7ree');
				if (defaultNote) {
					defaultNote.content = this.notesContent;
				}
			} else if (this.notesFile) {
				// console.log(`默认备忘录文件不存在: ${this.notesFile}，将在需要时创建`);
			}
			
			// 加载云笔记内容
			if (this.cloudNotesFile_7ree && fs.existsSync(this.cloudNotesFile_7ree)) {
				// 读取云笔记内容
				const cloudContent = fs.readFileSync(this.cloudNotesFile_7ree, 'utf8');
				// console.log(`已预加载云笔记内容，长度: ${cloudContent.length}`);
				
				// 更新云笔记的内存内容
				const cloudNote = this.openFiles_7ree.find(f => f.id === 'cloud_notes_7ree');
				if (cloudNote) {
					cloudNote.content = cloudContent;
				}
			} else if (this.cloudNotesFile_7ree) {
				// console.log(`云笔记文件不存在: ${this.cloudNotesFile_7ree}，将在需要时创建`);
			}
		} catch (err) {
			// console.error('加载默认备忘录或云笔记内容失败:', err);
		}
	}


    
    // 添加处理搜索的方法
    search_7ree() {
        // 向Webview发送搜索命令
        if (this.view) {
            this.view.webview.postMessage({ command: 'openSearch' });
        }
    }

	_initializeCloudNotesPath_7ree() {
		// 获取工作区路径
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			// 在.vscode目录下创建云笔记文件
			const vscodeDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
			// 确保.vscode目录存在
			if (!fs.existsSync(vscodeDir)) {
				try {
					fs.mkdirSync(vscodeDir, { recursive: true });
				} catch (err) {
					// console.error('创建.vscode目录失败:', err);
				}
			}
			
			this.cloudNotesFile_7ree = path.join(vscodeDir, 'mynotes_joplin_cache_7ree.md');
			// console.log(`云笔记文件路径: ${this.cloudNotesFile_7ree}`);
            
            // 检查云笔记文件是否存在，不自动创建空文件
            if (fs.existsSync(this.cloudNotesFile_7ree)) {
                // console.log(`云笔记文件已存在，长度: ${fs.statSync(this.cloudNotesFile_7ree).size} 字节`);
            } else {
                // console.log(`云笔记文件不存在，将在首次使用时创建: ${this.cloudNotesFile_7ree}`);
            }
		} else {
			// 如果没有工作区，使用用户的主目录
			const homeDir = require('os').homedir();
			const vscodeDir = path.join(homeDir, '.vscode');
			if (!fs.existsSync(vscodeDir)) {
				try {
					fs.mkdirSync(vscodeDir, { recursive: true });
				} catch (err) {
					// console.error('创建.vscode目录失败:', err);
				}
			}
			
			this.cloudNotesFile_7ree = path.join(vscodeDir, 'mynotes_joplin_cache_7ree.md');
			// console.log(`云笔记文件路径(无工作区): ${this.cloudNotesFile_7ree}`);
            
            // 检查云笔记文件是否存在，不自动创建空文件
            if (fs.existsSync(this.cloudNotesFile_7ree)) {
                // console.log(`云笔记文件已存在，长度: ${fs.statSync(this.cloudNotesFile_7ree).size} 字节`);
            } else {
                // console.log(`云笔记文件不存在，将在首次使用时创建: ${this.cloudNotesFile_7ree}`);
            }
		}
	}

	// 读取缓存文件内容
	readCacheFile_7ree(filePath) {
		try {
			const fullPath = path.join(this.context.extensionPath, filePath);
			// console.log(`读取缓存文件内容: ${fullPath}`);
			
			if (fs.existsSync(fullPath)) {
				const content = fs.readFileSync(fullPath, 'utf8');
				
				// console.log(`成功读取缓存文件内容，长度: ${content.length}`);
				
				// 向WebView发送文件内容
				if (this.view) {
					this.view.webview.postMessage({
						command: 'cacheFileContent',
						path: filePath,
						success: true,
						content: content
					});
				}
			} else {
				// console.log(`缓存文件不存在: ${fullPath}`);
				
				// 向WebView发送文件不存在的信息
				if (this.view) {
					this.view.webview.postMessage({
						command: 'cacheFileContent',
						path: filePath,
						success: false,
						error: "缓存文件不存在"
					});
				}
			}
		} catch (error) {
			// console.error(`读取缓存文件内容失败:`, error);
			
			// 向WebView发送错误信息
			if (this.view) {
				this.view.webview.postMessage({
					command: 'cacheFileContent',
					path: filePath,
					success: false,
					error: error.message
				});
			}
		}
	}

	// 添加在状态栏显示消息的方法
	showInfoInStatusBar(message, isError = false) {
		if (this.view && this.view.visible) {
			this.view.webview.postMessage({
				command: 'showInfo',
				message: message,
				isError: isError
			});
		} else {
			// 如果webview不可见，依然使用VSCode原生消息
			if (isError) {
				vscode.window.showErrorMessage(message);
			} else {
				vscode.window.showInformationMessage(message);
			}
		}
	}
	
	// 测试Joplin连接
	testJoplinConnection_7ree(serverUrl, token, noteId) {
		// console.log(`测试Joplin连接: ${serverUrl}, noteId: ${noteId}`);
		
		// 参数验证
		if (!serverUrl || !token || !noteId) {
			this.showInfoInStatusBar('错误：Joplin连接参数不完整', true);
			
			// 向设置对话框返回错误结果
			if (this.view && this.view.webview) {
				this.view.webview.postMessage({
					command: 'joplinTestResult',
					success: false,
					error: '错误：Joplin连接参数不完整'
				});
			}
			return;
		}
		
		// 在状态栏显示测试中提示
		this.showInfoInStatusBar('正在测试Joplin连接...', false);
		
		// 向webview发送测试请求
		if (this.view && this.view.webview) {
			// 设置测试用的设置信息
			const testSettings = {
				joplinServerUrl_7ree: serverUrl,
				joplinToken_7ree: token,
				joplinNoteId_7ree: noteId
			};
			

			// 清除之前的超时定时器
			if (this._joplinTestTimeoutId) {
				clearTimeout(this._joplinTestTimeoutId);
				this._joplinTestTimeoutId = null;
			}
			
			// 增加日志以便排查问题
			// console.log('🔴🔴🔴 [修复bug] extension.js已发送测试连接请求，正在设置延长超时时间...');
			
			// 设置超时计时器 - 改为30秒超时，给消息传递更多时间
			this._joplinTestTimeoutId = setTimeout(() => {
				// console.log('🔴🔴🔴 [修复bug] 测试Joplin连接超时(30秒)');
				this.showInfoInStatusBar('测试Joplin连接超时', true);
				
				// 尝试再次请求webview的状态检查 - 直接询问webview模块是否有连接结果
				if (this.view && this.view.webview) {
					// console.log('🔴🔴🔴 [修复bug] 发送最后的状态检查请求...');

					// 在超时前，先发送一个状态检查请求
					this.view.webview.postMessage({
						command: 'checkJoplinTestStatus'
					});

					// 再等待5秒，看是否能收到状态反馈
					setTimeout(() => {
						if (this._joplinTestTimeoutId) { // 如果仍然超时
							// 向设置对话框发送超时错误
							this.view.webview.postMessage({
								command: 'joplinTestResult',
								success: false,
								error: '测试超时，请检查参数是否正确、Joplin服务器是否已运行'
							});
							
							// 清除超时定时器
							this._joplinTestTimeoutId = null;
						}
					}, 5000);
				} else {
					// 没有webview，直接超时
					this._joplinTestTimeoutId = null;
					// console.error('🔴🔴🔴 [修复bug] 测试超时时WebView不可用');
				}
			}, 30000); // 增加到3秒超时，给消息传递更多时间
			
			// 设置消息处理函数，响应joplinTestResponse消息
			this._setupJoplinTestResponseHandler();
			
			// 发送测试设置到webview
			this.view.webview.postMessage({
				command: 'testJoplinSettings',
				settings: testSettings
			});
			
			// 发送测试连接命令并传递表单参数
			this.view.webview.postMessage({
				command: 'testJoplinConnection',
				serverUrl: serverUrl,  // 直接传递表单参数
				token: token,        // 直接传递表单参数
				noteId: noteId       // 直接传递表单参数
			});
		} else {
			// console.error('测试Joplin连接失败：WebView不可用');
			this.showInfoInStatusBar('测试Joplin连接失败：WebView不可用', true);
		}
	}
	
	// 设置Joplin测试响应处理器
	_setupJoplinTestResponseHandler() {
		// 如果还没有设置全局消息处理，先初始化
		if (!this._joplinTestMessageHandler) {
			this._joplinTestMessageHandler = (message) => {
				if (message.command === 'joplinTestResponse') {
					// console.log('收到Joplin测试连接响应:', message.success);
					
					// 清除超时定时器
					if (this._joplinTestTimeoutId) {
						clearTimeout(this._joplinTestTimeoutId);
						this._joplinTestTimeoutId = null;
					}
					
					// 在状态栏显示测试结果
					if (message.success) {
						this.showInfoInStatusBar('测试Joplin连接成功', false);
					} else {
						this.showInfoInStatusBar(`测试Joplin连接失败: ${message.error || '未知错误'}`, true);
					}
					
					// 将测试结果转发到设置对话框
					if (this.view && this.view.webview) {
						this.view.webview.postMessage({
							command: 'joplinTestResult',
							success: message.success,
							error: message.error || '',
							data: message.data
						});
					}
				}
			};
		}
		
		// 添加消息监听器
		if (this.view && this.view.webview) {
			// 注册一次性消息监听器
			this.view.webview.onDidReceiveMessage(this._joplinTestMessageHandler);
		}
	}

	// 新增: 加载全局设置文件
	_loadGlobalSettings_7ree(forceRefresh = false) {
		// 如果已加载且不强制刷新，直接返回缓存的设置
		if (this.globalSettings_7ree && !forceRefresh) {
			return this.globalSettings_7ree;
		}
		
		try {
			// 检查全局配置文件是否存在
			if (fs.existsSync(this.globalSettingsFile_7ree)) {
				// console.log('找到全局配置文件:', this.globalSettingsFile_7ree);
				const settingsJson = fs.readFileSync(this.globalSettingsFile_7ree, 'utf8');
				this.globalSettings_7ree = JSON.parse(settingsJson);
				// console.log('已加载全局配置文件');
				return this.globalSettings_7ree;
			} else {
				// console.log('全局配置文件不存在，将创建默认配置');
				// 创建默认全局设置
				this.globalSettings_7ree = {
					fontFamily: this.uiSettings_7ree.fontFamily || '',
					fontSize: this.uiSettings_7ree.fontSize || '',
					color: this.uiSettings_7ree.color || '',
					backgroundColor: this.uiSettings_7ree.backgroundColor || '',
					selectionBackground: this.uiSettings_7ree.selectionBackground || '',
					autoSaveInterval: this.uiSettings_7ree.autoSaveInterval || 30,
					joplinServerUrl_7ree: '',
					joplinToken_7ree: '',
					joplinNoteId_7ree: '',
					enableJoplin_7ree: 'false'  // 添加默认的enableJoplin_7ree设置
				};
				
				// 保存默认设置
				this._saveGlobalSettings_7ree(this.globalSettings_7ree);
				return this.globalSettings_7ree;
			}
		} catch (err) {
			// console.error('加载全局配置文件错误:', err);
			// 创建默认全局设置
			this.globalSettings_7ree = {
				fontFamily: this.uiSettings_7ree.fontFamily || '',
				fontSize: this.uiSettings_7ree.fontSize || '',
				color: this.uiSettings_7ree.color || '',
				backgroundColor: this.uiSettings_7ree.backgroundColor || '',
				selectionBackground: this.uiSettings_7ree.selectionBackground || '',
				autoSaveInterval: this.uiSettings_7ree.autoSaveInterval || 30,
				joplinServerUrl_7ree: '',
				joplinToken_7ree: '',
				joplinNoteId_7ree: '',
				enableJoplin_7ree: 'false'  // 添加默认的enableJoplin_7ree设置
			};
			return this.globalSettings_7ree;
		}
	}
	
	// 新增: 保存全局设置文件
	_saveGlobalSettings_7ree(settings, filename = 'mynotes-vars-7ree.json') {
		try {
			// 判断云笔记开关状态是否发生变化
			const oldEnableJoplin = this.globalSettings_7ree?.enableJoplin_7ree;
			const newEnableJoplin = settings.enableJoplin_7ree;
			
			// 记录状态变化
			let joplinStateChanged = false;
			let joplinTurnedOff = false;
			let joplinTurnedOn = false;
			
			if (newEnableJoplin !== undefined && oldEnableJoplin !== newEnableJoplin) {
				joplinStateChanged = true;
				// console.log(`云笔记开关状态发生变化: ${oldEnableJoplin} -> ${newEnableJoplin}`);
				
				// 检查开关状态具体变化
				if ((oldEnableJoplin === 'true' || oldEnableJoplin === true) && 
					(newEnableJoplin === 'false' || newEnableJoplin === false)) {
					joplinTurnedOff = true;
					// console.log('云笔记开关由开转为关');
				} else if ((oldEnableJoplin === 'false' || oldEnableJoplin === false || oldEnableJoplin === undefined) && 
					(newEnableJoplin === 'true' || newEnableJoplin === true)) {
					joplinTurnedOn = true;
					// console.log('云笔记开关由关转为开');
				}
			}
			
			// 更新内存中的全局设置
			this.globalSettings_7ree = { ...this.globalSettings_7ree, ...settings };
			
			// 获取全局配置文件目录
			const globalConfigDir = path.dirname(this.globalSettingsFile_7ree);
			
			// 确保目录存在
			if (!fs.existsSync(globalConfigDir)) {
				fs.mkdirSync(globalConfigDir, { recursive: true });
			}
			
			// 保存到指定的全局配置文件
			const targetFile = path.join(globalConfigDir, filename);
			fs.writeFileSync(
				targetFile,
				JSON.stringify(this.globalSettings_7ree, null, 2),
				'utf8'
			);
			// console.log(`全局设置已保存到: ${targetFile}`);
			
			// 处理云笔记状态变化
			if (joplinStateChanged && this.view && this.view.visible) {
				// 如果是由开转关，切换到默认备忘录
				if (joplinTurnedOff && this.currentFileId_7ree === 'cloud_notes_7ree') {
					// console.log('云笔记已关闭，且当前为云笔记标签，自动切换到默认备忘录');
					this.currentFileId_7ree = 'default_notes_7ree';
					this._saveLastActiveFileId_7ree(); // 保存新的活动文件ID
				}
				
				// 刷新WebView，让标签更新
				this.view.webview.postMessage({
					command: 'loadGlobalSettings_7ree',
					settings: this.globalSettings_7ree
				});
				
				// 如果标签发生变化，重新加载当前文件
				setTimeout(() => {
					if (this.view && this.view.visible) {
						this.loadNotes(); // 重新加载并刷新全部界面
						// console.log('云笔记设置已更新，界面已刷新');
					}
				}, 200); // 延迟一小段时间确保设置先被接收
			}
			
			// 向webview发送确认消息
			if (this.view && this.view.visible) {
				this.view.webview.postMessage({
					command: 'globalSettingsSaved_7ree',
					success: true
				});
			}
			
			// 同步更新UI设置
			// 从全局设置优先更新UI设置
			this.uiSettings_7ree = {
				...this.uiSettings_7ree,
				fontFamily: this.globalSettings_7ree.fontFamily || this.uiSettings_7ree.fontFamily,
				fontSize: this.globalSettings_7ree.fontSize || this.uiSettings_7ree.fontSize,
				color: this.globalSettings_7ree.color || this.uiSettings_7ree.color,
				backgroundColor: this.globalSettings_7ree.backgroundColor || this.uiSettings_7ree.backgroundColor,
				selectionBackground: this.globalSettings_7ree.selectionBackground || this.uiSettings_7ree.selectionBackground,
				autoSaveInterval: this.globalSettings_7ree.autoSaveInterval || this.uiSettings_7ree.autoSaveInterval
			};
			
			// 保存更新后的状态到项目状态文件
			this._saveStatus_7ree();
			
			return true;
		} catch (err) {
			// console.error('保存全局设置错误:', err);
			
			// 向webview发送错误消息
			if (this.view && this.view.visible) {
				this.view.webview.postMessage({
					command: 'globalSettingsSaved_7ree',
					success: false,
					error: err.message
				});
			}
			
			return false;
		}
	}

	// 添加: 备份当前文件方法
	async backupCurrentFile_7ree() {
		try {
			// 获取当前文件ID
			const fileId = this.currentFileId_7ree;
			
			// 在文件列表中找到对应的文件
			const currentFile = this.openFiles_7ree.find(f => f.id === fileId);
			
			if (!currentFile) {
				this.showInfoInStatusBar('无法备份：未找到当前文件', true);
				return;
			}
			
			// 如果没有文件路径（例如是默认的备忘录），使用浏览器中的内容先保存
			if (!currentFile.path) {
				// 默认备忘录使用默认路径
				if (fileId === 'default_notes_7ree') {
					currentFile.path = this.notesFile;
				} else if (fileId === 'cloud_notes_7ree') {
					currentFile.path = this.cloudNotesFile_7ree;
				} else {
					this.showInfoInStatusBar('无法备份：文件没有物理路径', true);
					return;
				}
				
				// 先获取当前内容并保存
				if (this.view) {
					this.view.webview.postMessage({
						command: 'getContent',
						for: 'backup'
					});
					// 在返回消息中处理备份操作
					return;
				}
			}
			
			// 执行文件备份
			const result = await backupFile_7ree(currentFile.path);
			
			if (result.success) {
				this.showInfoInStatusBar(result.message);
				
				// 在WebView中显示成功消息
				if (this.view) {
					this.view.webview.postMessage({
						command: 'showBackupSuccess',
						message: result.message
					});
				}
			} else {
				this.showInfoInStatusBar(result.message, true);
			}
		} catch (error) {
			// console.error('备份文件时出错:', error);
			this.showInfoInStatusBar(`备份失败: ${error.message}`, true);
		}
	}
	
	// 添加: 打开文件所在文件夹方法
	async openFileFolder_7ree() {
		try {
			// 获取当前文件ID
			const fileId = this.currentFileId_7ree;
			
			// 在文件列表中找到对应的文件
			const currentFile = this.openFiles_7ree.find(f => f.id === fileId);
			
			if (!currentFile) {
				this.showInfoInStatusBar('无法打开文件夹：未找到当前文件', true);
				return;
			}
			
			// 如果没有文件路径（例如是默认的备忘录），使用默认路径
			let filePath = currentFile.path;
			if (!filePath) {
				// 默认备忘录使用默认路径
				if (fileId === 'default_notes_7ree') {
					filePath = this.notesFile;
				} else if (fileId === 'cloud_notes_7ree') {
					filePath = this.cloudNotesFile_7ree;
				} else {
					this.showInfoInStatusBar('无法打开文件夹：文件没有物理路径', true);
					return;
				}
			}
			
			// 获取文件所在目录
			const folderPath = path.dirname(filePath);
			
			// 检查文件夹是否存在
			if (!fs.existsSync(folderPath)) {
				this.showInfoInStatusBar(`文件夹不存在: ${folderPath}`, true);
				return;
			}
			
			// 使用系统默认的文件管理器打开文件夹
			const success = await vscode.env.openExternal(vscode.Uri.file(folderPath));
			
			if (success) {
				this.showInfoInStatusBar(`已打开文件夹: ${path.basename(folderPath)}`);
			} else {
				this.showInfoInStatusBar(`打开文件夹失败: ${folderPath}`, true);
			}
		} catch (error) {
			// console.error('打开文件夹时出错:', error);
			this.showInfoInStatusBar(`打开文件夹出错: ${error.message}`, true);
		}
	}

	// 修改: 保存项目状态文件（不再包含设置）
	_saveStatus_7ree() {
		if (!this._ensureNotesDirectoryExists()) {
			// console.warn('笔记目录不存在，无法保存项目状态');
			return;
		}

		try {
			// 获取要保存的文件列表数据
			const filesToSave = this.openFiles_7ree
				.map(file => {
					const fileData = {
						id: file.id,
						name: file.name,
						path: file.path, // 对于默认笔记，path可能为空或特定值
					};
					
					// 添加编辑器位置信息（如果有）- 仅保留viewState
					if (this.editorPositions_7ree && this.editorPositions_7ree[file.id]) {
						// 保存 viewState（如果有）
						if (this.editorPositions_7ree[file.id].viewState !== undefined) {
							fileData.viewState = this.editorPositions_7ree[file.id].viewState;
						}
					}
					
					// 只保存外部文件的路径，默认笔记和云笔记的路径不重要
					if (file.id === 'default_notes_7ree' || file.id === 'cloud_notes_7ree') {
						delete fileData.path; // 不保存默认笔记和云笔记的路径
					}
					return fileData;
				})
				.filter(fileData => 
					fileData.viewState !== undefined || 
					fileData.id !== 'default_notes_7ree'
				); // 修改过滤条件，只检查viewState和文件ID

			// 创建项目状态对象（不再包含UI设置）
			const status = {
				lastActiveId: this.currentFileId_7ree,
				files: filesToSave
				// 不再包含 uiSettings
			};

			// 写入状态文件
			fs.writeFileSync(
				this.statusFile_7ree,
				JSON.stringify(status, null, 2),
				'utf8'
			);
			// console.log(`项目状态已保存到: ${this.statusFile_7ree}`);
		} catch (err) {
			// // console.error('保存项目状态错误:', err);
		}
	}

	// 修改: 加载项目状态文件
	_loadStatus_7ree() {
		if (!this._ensureNotesDirectoryExists()) {
			// // console.warn('笔记目录不存在，无法加载项目状态');
			return null;
		}
			
		try {
			// 加载项目状态文件
			if (fs.existsSync(this.statusFile_7ree)) {
				// console.log('找到项目状态文件:', this.statusFile_7ree);
				const statusJson = fs.readFileSync(this.statusFile_7ree, 'utf8');
				const status = JSON.parse(statusJson);
				// console.log('已解析项目状态');
				return status;
			} else {
				// 向后兼容：检查旧的设置文件
				const oldSettingsFile = path.join(path.dirname(this.statusFile_7ree), 'mynotes_settings_7ree.json');
				if (fs.existsSync(oldSettingsFile)) {
					// console.log('找到旧的设置文件，转换为项目状态:', oldSettingsFile);
					const settingsJson = fs.readFileSync(oldSettingsFile, 'utf8');
					const oldSettings = JSON.parse(settingsJson);
					
					// 提取项目状态信息并返回（不包含UI设置）
					const status = {
						lastActiveId: oldSettings.lastActiveId,
						files: oldSettings.files || []
					};
					
					// 保存转换后的状态到新文件
					fs.writeFileSync(
						this.statusFile_7ree,
						JSON.stringify(status, null, 2),
						'utf8'
					);
					// console.log(`已将旧设置转换为项目状态并保存到: ${this.statusFile_7ree}`);
					
					// 尝试删除旧文件
					try {
						fs.unlinkSync(oldSettingsFile);
						// console.log('已删除旧的设置文件:', oldSettingsFile);
					} catch (unlinkErr) {
						// // console.warn('无法删除旧的设置文件:', unlinkErr);
					}
					
					return status;
				}
				
				// console.log('项目状态文件不存在，将使用默认值');
				return null;
			}
		} catch (err) {
			// // console.error('加载项目状态错误:', err);
			return null;
		}
	}
}

function writeCacheFile_7ree(CacheFilepath, content){
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders && workspaceFolders.length > 0) {
		const workspaceRootPath_7ree = workspaceFolders[0].uri.fsPath;
		const actualCachePath_join_7ree = path.join(workspaceRootPath_7ree,CacheFilepath);


		// console.log('writeCacheFile Info: 准备写入缓存文件路径为：', actualCachePath_join_7ree);
		fs.writeFileSync(
			actualCachePath_join_7ree,
			content,
			'utf8'
		);
		// console.log('writeCacheFile Info: 缓存文件写入成功');
	}else{
		// console.log('writeCacheFile Info: 缓存文件写入失败，原因：未找到打开的工作区');
	}
}

// 扩展停用时调用的函数
function deactivate() { // 遵循您的命名规范
	// console.log('Extension "mynotes-7ree" is now deactivating!');
	// 在这里可以添加任何清理逻辑，例如：
	// - 注销事件监听器
	// - 清理定时器
	// - 保存任何未保存的状态
	// 如果没有特别的清理工作，留空也可以，但函数必须存在并被导出。
  }


module.exports = {
	activate,
	deactivate
}
