// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process'); // 添加: 用于执行系统命令打开文件

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('MyNotes 扩展已激活!');

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
}

class NotesViewProvider_7ree {
	constructor(extensionUri, context) {
		this.extensionUri = extensionUri;
		this.context = context;
		this.view = undefined;
		this.notesContent = '';
		this.notesDir = '';
		this.notesFile = '';
		this.settingsFile_7ree = ''; // 统一设置文件路径
		this._initializeNotesPath();
		
		this.openFiles_7ree = [
			{ id: 'default_notes_7ree', name: '备忘录', path: '', content: '' }
		];
		this.currentFileId_7ree = 'default_notes_7ree'; // 默认先显示备忘录
		this.scrollPositions_7ree = {};
		
		// 记录文件的可见行和锚点信息
		this.editorPositions_7ree = {};
		
		// 记录文件的最后修改时间
		this.fileLastModified_7ree = {};
		
		// 文件内容缓存
		this.fileContentCache_7ree = {};
		
		// 存储错误对话框操作的回调函数
		this._pendingCallbacks = {};
		
		// UI设置
		this.uiSettings_7ree = { fontFamily: '', fontSize: '', color: '', backgroundColor: '', selectionBackground: '', autoSaveInterval: 10 };
		this._loadUISettings_7ree(); // 加载保存的UI设置
		
		// 尝试预先加载默认备忘录内容
		this._loadDefaultNotesContent();
		
		this._loadImportedFiles_7ree(); // 加载所有文件和它们的滚动位置
		this._loadLastActiveFileId_7ree(); // 尝试加载并设置上次活动的ID
		console.log(`构造函数结束，当前活动ID: ${this.currentFileId_7ree}`);
	}

	_initializeNotesPath() {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			this.notesDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
			this.notesFile = path.join(this.notesDir, 'mynotes_defaultNote_7ree.txt');
			this.settingsFile_7ree = path.join(this.notesDir, 'mynotes_settings_7ree.json'); // 统一配置文件
		} else {
			const tempDir = process.env.TEMP || process.env.TMP || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support/Code/User' : '/tmp');
			this.notesDir = path.join(tempDir, 'mynotes_7ree_global');
			this.notesFile = path.join(this.notesDir, 'mynotes_defaultNote_7ree.txt');
			this.settingsFile_7ree = path.join(this.notesDir, 'mynotes_settings_7ree.json'); // 统一配置文件
			console.warn('No workspace folder found, notes will be saved to a temporary/global directory:', this.notesDir);
		}
	}

	_ensureNotesDirectoryExists() {
		if (!fs.existsSync(this.notesDir)) {
			try {
				fs.mkdirSync(this.notesDir, { recursive: true });
				console.log('Notes directory created:', this.notesDir);
			} catch (err) {
				console.error('Failed to create notes directory:', this.notesDir, err);
				vscode.window.showErrorMessage(`创建笔记目录失败: ${this.notesDir}`);
				return false;
			}
		}
		return true;
	}

	_saveLastActiveFileId_7ree() {
		if (!this.currentFileId_7ree || !this._ensureNotesDirectoryExists()) return;
		
		// 保存到统一设置文件中
		this._saveSettings_7ree();
	}

	_loadLastActiveFileId_7ree() {
		// 从统一设置文件加载
		const settings = this._loadSettings_7ree();
		if (settings && settings.lastActiveId) {
			// 检查这个ID是否仍在openFiles_7ree中，以防对应文件已被移除
			if (this.openFiles_7ree.some(f => f.id === settings.lastActiveId)) {
				this.currentFileId_7ree = settings.lastActiveId;
				console.log(`已加载并设置上次活动文件ID: ${this.currentFileId_7ree}`);
				return;
			}
		}
		
		// 未找到有效ID，使用默认值
		this.currentFileId_7ree = 'default_notes_7ree';
		console.log(`未找到有效的上次活动ID，使用默认ID: ${this.currentFileId_7ree}`);
	}

	_loadUISettings_7ree() {
		// 从统一设置文件加载
		const settings = this._loadSettings_7ree();
		if (settings && settings.uiSettings) {
			this.uiSettings_7ree = { ...this.uiSettings_7ree, ...settings.uiSettings };
			console.log('已从设置文件加载UI设置');
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
			
			console.log('已从VSCode主题加载默认UI设置:', this.uiSettings_7ree);
		} catch (err) {
			console.error('从VSCode主题加载默认设置失败:', err);
			// 使用硬编码的默认值
			this.uiSettings_7ree = { 
				fontFamily: '', 
				fontSize: '', 
				color: '#ffffff',
				backgroundColor: '#000000',
				selectionBackground: '#add6ff',
				autoSaveInterval: 10
			};
		}
	}

	_saveUISettings_7ree(settings) {
		if (this.context) {
			this.uiSettings_7ree = settings;
			
			// 保存到统一设置文件
			this._saveSettings_7ree();
			console.log('UI设置已保存:', settings);
		} else {
			console.warn('_saveUISettings_7ree: context 未定义');
		}
	}

	resolveWebviewView(webviewView, context, token) {
		this.view = webviewView;
		if (!this.context) {
			this.context = context;
			this._loadUISettings_7ree();
		}
		console.log('resolveWebviewView: Webview已创建');

		// 添加视图标题栏按钮
		webviewView.title = "备忘&ToDo";
		
		// 注册命令并设置标题栏按钮
		if (this.context && this.context.subscriptions) {
			// 注册导入文件命令
			this.context.subscriptions.push(
				vscode.commands.registerCommand('mynotes-7ree.importFile', async () => {
					await this.importFile_7ree();
				})
			);
			
			// 注册外部打开命令
			this.context.subscriptions.push(
				vscode.commands.registerCommand('mynotes-7ree.openFileExternally', async () => {
					await this.openFileExternally_7ree(this.currentFileId_7ree);
				})
			);
			
			// 注册设置命令
			this.context.subscriptions.push(
				vscode.commands.registerCommand('mynotes-7ree.openSettings', () => {
					if (this.view && this.view.visible) {
						this.view.webview.postMessage({
							command: 'openSettings'
						});
					}
				})
			);
		}

		// 使用WebviewOptions配置webview
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
		console.log('resolveWebviewView: HTML已设置');

		webviewView.webview.onDidReceiveMessage(message => {
			console.log('Extension收到消息:', message.command, message.fileId || '', message.settings || '');
			switch (message.command) {
				case 'saveNotes':
					const fileIdForSave = message.fileId || this.currentFileId_7ree;
					if (message.scrollTopRatio !== undefined) {
						this.scrollPositions_7ree[fileIdForSave] = {
							position: message.scrollPosition,
							ratio: message.scrollTopRatio
						};
						console.log(`saveNotes: 从webview接收并更新滚动信息 for ${fileIdForSave}:`);
						console.log(`- 滚动位置: ${message.scrollPosition}`);
						console.log(`- 滚动比例: ${message.scrollTopRatio !== 'bottom' ? message.scrollTopRatio.toFixed(4) : 'bottom'}`);
					} else if (message.scrollPosition !== undefined) {
						this.scrollPositions_7ree[fileIdForSave] = {
							position: message.scrollPosition
						};
						console.log(`saveNotes: 从webview接收并更新滚动位置 for ${fileIdForSave}: ${message.scrollPosition}`);
					}
					this.saveNotesById_7ree(fileIdForSave, message.text, message.switchingTabs);
					break;
				case 'webviewReady':
					console.log('webviewReady: 准备加载初始笔记');
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
				case 'persistScrollPosition':
					const fileIdForScroll = message.fileId;
					if (fileIdForScroll) {
						let updated = false;
						
						// 删除对topVisibleLine的处理，只保留viewState
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
									console.log(`保存文件 ${fileIdForScroll} 的完整视图状态，长度: ${message.viewState.length} 字符`);
									
									// 打印关键位置信息用于调试
									const firstLine = parsedState.viewState.firstPosition?.lineNumber || 1;
									const firstColumn = parsedState.viewState.firstPosition?.column || 1;
									console.log(`视图状态首行位置: 行=${firstLine}, 列=${firstColumn}`);
									
									updated = true;
									
									// 立即保存到磁盘
									this._saveImportedFiles_7ree();
								} else {
									console.warn(`接收到无效的视图状态: 缺少viewState属性`);
								}
							} catch (e) {
								console.error(`无法解析视图状态JSON: ${e.message}`);
							}
						}
						
						// 为了兼容旧版本，保留对scrollTopRatio和scrollPosition的处理
						if (message.scrollTopRatio !== undefined) {
							if (!this.scrollPositions_7ree[fileIdForScroll]) {
								this.scrollPositions_7ree[fileIdForScroll] = {};
							}
							this.scrollPositions_7ree[fileIdForScroll].ratio = message.scrollTopRatio;
							updated = true;
						}
						if (message.scrollPosition !== undefined) {
							if (!this.scrollPositions_7ree[fileIdForScroll]) {
								this.scrollPositions_7ree[fileIdForScroll] = {};
							}
							this.scrollPositions_7ree[fileIdForScroll].position = message.scrollPosition;
							updated = true;
						}
						
						if (updated) {
							console.log(`persistScrollPosition: 更新滚动信息 for ${fileIdForScroll}`);
							this._saveImportedFiles_7ree();
							if (this.currentFileId_7ree === fileIdForScroll) {
								this._saveLastActiveFileId_7ree();
							}
							vscode.window.setStatusBarMessage(`滚动位置已记录: ${this.openFiles_7ree.find(f=>f.id === fileIdForScroll)?.name || fileIdForScroll}`, 2000);
						} else {
							console.warn('persistScrollPosition: 缺少必要的位置信息', message);
						}
					} else {
						console.warn('persistScrollPosition: 缺少fileId', message);
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
			}
		});

		webviewView.onDidChangeVisibility(() => {
			console.log('Webview可见性改变，当前可见:', webviewView.visible);
			if (webviewView.visible) {
				// 确保loadNotes在webview可见时正确恢复滚动位置
				// 当滚动条位置最近有更新（例如通过visibilitychange事件保存的），这里会使用该位置
				console.log('Webview再次可见，当前滚动位置信息:');
				const scrollInfo = this.scrollPositions_7ree[this.currentFileId_7ree] || {};
				console.log(`- 文件ID: ${this.currentFileId_7ree}`);
				console.log(`- 滚动位置: ${scrollInfo.position}`);
				console.log(`- 滚动比例: ${scrollInfo.ratio !== 'bottom' ? (scrollInfo.ratio?.toFixed(4) || 'undefined') : 'bottom'}`);
				
				this.loadNotes();
			} else {
				// 当Webview不可见时，visibilitychange事件会被触发，滚动位置会被保存
				console.log('Webview变为不可见，滚动位置将由visibilitychange事件处理');
			}
		});

		console.log('resolveWebviewView: 即将调用 loadNotes, 当前活动ID:', this.currentFileId_7ree);
		this.loadNotes();
	}

	// 新增：显示错误消息在webview中
	showErrorInWebview_7ree(message, title = "提示", buttonText = "确定") {
		if (this.view && this.view.visible) {
			this.view.webview.postMessage({
				command: 'showError',
				message: message,
				title: title,
				buttonText: buttonText
			});
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
		console.log('接收到关闭标签请求:', fileId);
		
		// 不能关闭默认备忘录
		if (fileId === 'default_notes_7ree') {
			console.log('不能关闭默认备忘录');
			return;
		}

		// 查找要关闭的文件索引
		const fileIndex = this.openFiles_7ree.findIndex(f => f.id === fileId);
		if (fileIndex === -1) {
			console.log('未找到对应的文件:', fileId);
			return;
		}

		console.log('关闭文件:', this.openFiles_7ree[fileIndex].name);

		// 如果关闭的是当前活动文件，则切换到备忘录
		const isActiveFile = this.currentFileId_7ree === fileId;
		
		// 从文件列表中移除
		this.openFiles_7ree.splice(fileIndex, 1);
		
		// 删除对应的滚动位置记录
		if (this.scrollPositions_7ree[fileId]) {
			delete this.scrollPositions_7ree[fileId];
		}
		
		// 如果关闭的是当前活动文件，则切换到备忘录
		if (isActiveFile) {
			console.log('关闭的是当前活动文件，切换到备忘录');
			this.switchFile_7ree('default_notes_7ree');
		} else {
			// 仅更新标签视图，不切换文件
			console.log('更新标签视图');
			if (this.view && this.view.visible) {
				// 获取当前文件内容
				const currentFile = this.openFiles_7ree.find(f => f.id === this.currentFileId_7ree);
				if (!currentFile) {
					console.warn(`当前文件ID ${this.currentFileId_7ree} 未找到，将切换到默认备忘录`);
					this.switchFile_7ree('default_notes_7ree');
					return;
				}
				
				let currentContent = currentFile.content;
				// 确保不发送undefined内容
				if (currentContent === undefined || currentContent === null) {
					console.warn(`当前文件 ${this.currentFileId_7ree} 内容为undefined或null，已替换为空字符串`);
					currentContent = '';
					currentFile.content = ''; // 同时更新内存对象
				}
				
				// 获取视图状态信息
				const viewState = this.editorPositions_7ree && this.editorPositions_7ree[this.currentFileId_7ree] 
				    ? this.editorPositions_7ree[this.currentFileId_7ree].viewState 
				    : undefined;
				
				console.log(`更新标签视图，当前文件: ${this.currentFileId_7ree}, 内容长度: ${currentContent.length}`);
				console.log(`- 视图状态: ${viewState ? '已保存' : '未保存'}`);
				
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

	// 修改: 保存导入的文件列表到配置
	_saveImportedFiles_7ree() {
		console.log('保存文件列表及滚动信息');
		this._saveSettings_7ree(); // 使用统一保存方法
	}

	// 修改: 从配置加载导入的文件列表，移除topVisibleLine的加载处理
	_loadImportedFiles_7ree() {
		console.log('从设置加载文件列表及滚动信息');
		
		// 从统一设置文件加载
		const settings = this._loadSettings_7ree();
		if (settings && settings.files && settings.files.length > 0) {
			this._loadFilesFromData_7ree(settings.files);
			return;
		}
		
		console.log('没有找到已保存的文件列表，将只使用默认备忘录');
	}

	// 新增：从数据加载文件的辅助方法
	_loadFilesFromData_7ree(loadedFiles) {
		// 清空现有的外部文件（保留默认备忘录骨架）和滚动位置
		const defaultNotesSkel = this.openFiles_7ree.find(f => f.id === 'default_notes_7ree');
		this.openFiles_7ree = defaultNotesSkel ? [defaultNotesSkel] : []; 
		this.scrollPositions_7ree = {}; // 重置滚动位置记录
		this.editorPositions_7ree = {}; // 重置编辑器位置记录

		for (const file of loadedFiles) {
			const fileId = file.id;
			
			// 处理滚动信息
			if (file.scrollTopRatio !== undefined || file.scrollPosition !== undefined) {
				this.scrollPositions_7ree[fileId] = {};
				
				if (file.scrollTopRatio !== undefined) {
					this.scrollPositions_7ree[fileId].ratio = file.scrollTopRatio;
					console.log(`已加载文件 ID: ${fileId} 的滚动比例: ${file.scrollTopRatio !== 'bottom' ? file.scrollTopRatio.toFixed(4) : 'bottom'}`);
				}
				
				if (file.scrollPosition !== undefined) {
					this.scrollPositions_7ree[fileId].position = file.scrollPosition;
					console.log(`已加载文件 ID: ${fileId} 的滚动位置: ${file.scrollPosition}`);
				}
			}
			
			// 处理视图状态
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
						console.log(`已加载文件 ID: ${fileId} 的完整视图状态，首行: ${firstLine}, 长度: ${file.viewState.length} 字符`);
					} else {
						console.warn(`文件 ${fileId} 的视图状态无效，缺少viewState属性`);
					}
				} catch (e) {
					console.error(`无法解析文件 ${fileId} 的视图状态: ${e.message}`);
				}
			}
			
			// 处理默认笔记
			if (fileId === 'default_notes_7ree') {
				// 默认备忘录内容将通过 loadNotes() 加载，这里只处理滚动位置
				continue; // 继续下一个文件
			}

			// 处理外部导入的文件
			if (file.path && fs.existsSync(file.path)) {
				try {
					const content = fs.readFileSync(file.path, 'utf8');
					
					// 记录文件的最后修改时间
					const stats = fs.statSync(file.path);
					this.fileLastModified_7ree[fileId] = stats.mtimeMs;
					console.log(`记录文件初始修改时间: ${fileId}, 时间: ${new Date(stats.mtimeMs).toLocaleString()}`);
					
					this.openFiles_7ree.push({
						id: fileId,
						name: file.name,
						path: file.path,
						content: content
					});
					console.log(`已自动加载导入的文件: ${file.name} (ID: ${fileId})`);
				} catch (readErr) {
					console.error(`读取导入文件 ${file.path} 失败:`, readErr);
				}
			} else if (file.path) {
				console.warn(`导入的文件路径不存在: ${file.path}`);
			}
		}
		console.log('完成从数据加载文件列表及滚动信息');
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
					console.log(`文件 ${filePath} 为UTF-8(BOM)编码`);
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
					console.log(`文件 ${filePath} 通过严格验证为UTF-8编码`);
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
					console.log(`文件 ${filePath} 检测到可能的GBK编码特征`);
				}
				
				console.log(`文件 ${filePath} 不是UTF-8编码，检测结果: ${isValidUTF8 ? "有效UTF-8" : "无效UTF-8"}${potentialGBK ? "，可能是GBK编码" : ""}`);
				resolve(false);
			} catch (err) {
				console.error(`检查文件编码失败: ${err.message}`);
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
						"我们已经帮你用VSCode打开了此文件，请点击右下角文件编码类型文字将其另存为UTF-8编码后再导入。",
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
						console.warn(`读取文件 ${fileName} 返回undefined或null内容`);
						content = ''; // 使用空字符串而不是undefined
					}
					
					console.log(`成功读取文件内容: ${fileName}, 内容长度: ${content.length}`);
				} catch (readError) {
					console.error(`读取文件 ${fileName} 失败，可能是编码问题:`, readError);
					console.error(`错误详情: ${readError.stack}`);
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
				console.log(`记录新导入文件修改时间: ${fileId}, 时间: ${new Date(stats.mtimeMs).toLocaleString()}`);
				
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
				
				console.log(`成功添加文件到openFiles_7ree: ${fileName}, 内容长度: ${content.length}`);
				
				// 保存导入的文件配置
				this._saveImportedFiles_7ree();
				
				// 切换到这个文件
				this.switchFile_7ree(fileId);
			}
		} catch (err) {
			console.error('导入文件失败:', err);
			console.error(`错误详情: ${err.stack}`);
			vscode.window.showErrorMessage(`导入文件失败: ${err.message}`);
		}
	}

	// 修改: 切换到指定文件
	async switchFile_7ree(fileId) {
		console.log(`开始切换文件: ${fileId}`);
		
		// 如果已经是当前文件，不需要切换
		if (fileId === this.currentFileId_7ree) {
			console.log(`已经是当前文件: ${fileId}`);
			return;
		}
		
		// 先保存当前文件的内容
		const currentFile = this.openFiles_7ree.find(f => f.id === this.currentFileId_7ree);
		if (currentFile) {
			console.log(`保存当前文件内容: ${this.currentFileId_7ree}`);
			this.saveNotesById_7ree(this.currentFileId_7ree, currentFile.content);
		}

		// 找到要切换到的文件
		const targetFile = this.openFiles_7ree.find(f => f.id === fileId);
		if (!targetFile) {
			console.error(`未找到ID为 ${fileId} 的文件`);
			vscode.window.showErrorMessage(`未找到ID为 ${fileId} 的文件`);
			return;
		}
		
		// 如果是外部文件，验证其存在性和编码格式
		if (fileId !== 'default_notes_7ree' && targetFile.path) {
			// 检查文件是否存在
			if (!fs.existsSync(targetFile.path)) {
				console.error(`文件不存在: ${targetFile.path}`);
				vscode.window.showErrorMessage(`文件不存在: ${targetFile.path}。该文件可能已被移动或删除。`);
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
						"我们已经帮你用VSCode打开了此文件，请点击右下角文件编码类型文字将其另存为UTF-8编码后再导入。",
						"编码不兼容",
						"知道了" // 按钮文字
					);
					return;
				}
			} catch (err) {
				console.error(`检查文件编码失败: ${err.message}`);
				this.showErrorInWebview_7ree(`检查文件时遇到了问题: ${err.message}`, "检查文件失败");
				return;
			}
		}
		
		// 更新当前文件ID
		console.log(`更新当前文件ID从 ${this.currentFileId_7ree} 到 ${fileId}`);
		this.currentFileId_7ree = fileId;
		
		console.log(`切换到文件: ${targetFile.name}`);
		
		// 如果是默认备忘录，加载保存的内容
		if (fileId === 'default_notes_7ree') {
			console.log('加载默认备忘录');
			
			// 尝试从文件中读取最新内容
			try {
				if (fs.existsSync(this.notesFile)) {
					const content = fs.readFileSync(this.notesFile, 'utf8');
					this.notesContent = content;
					console.log(`已从文件读取默认备忘录内容，长度: ${content.length}`);
					
					// 更新内存中的内容
					const defaultNote = this.openFiles_7ree.find(f => f.id === 'default_notes_7ree');
					if (defaultNote) {
						defaultNote.content = content;
					}
				} else {
					console.log(`默认备忘录文件不存在，将创建: ${this.notesFile}`);
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
				console.error(`读取默认备忘录失败: ${err.message}`);
				// 出错时使用空内容
				this.notesContent = '';
				const defaultNote = this.openFiles_7ree.find(f => f.id === 'default_notes_7ree');
				if (defaultNote) {
					defaultNote.content = '';
				}
			}
			
			// 加载笔记
			this.loadNotes();
		} else {
			// 加载外部文件内容
			if (this.view && this.view.visible) {
				console.log(`加载外部文件: ${targetFile.name}, 当前内存中内容长度: ${targetFile.content ? targetFile.content.length : 0}`);
				
				// 确保文件内容是最新的
				try {
					if (targetFile.path && fs.existsSync(targetFile.path)) {
						const newContent = fs.readFileSync(targetFile.path, 'utf8');
						// 如果读取成功，更新内容
						if (newContent !== undefined && newContent !== null) {
							targetFile.content = newContent;
							console.log(`已重新读取文件内容: ${targetFile.path}, 内容长度: ${newContent.length}`);
						} else {
							console.error(`文件内容读取为空或undefined: ${targetFile.path}`);
							// 如果内容为空或undefined，但现有内容存在，则保留现有内容
							if (!targetFile.content) {
								targetFile.content = ''; // 确保至少有空字符串而不是undefined
							}
						}
					} else {
						console.warn(`文件路径不存在: ${targetFile.path}, 使用现有缓存内容`);
						// 确保现有内容不是undefined
						if (!targetFile.content) {
							targetFile.content = '';
						}
					}
				} catch (err) {
					console.error(`重新读取文件失败: ${targetFile.path}`, err);
					console.error(`错误详情: ${err.stack}`);
					
					// 如果读取失败，但现有内容存在，保留现有内容
					if (!targetFile.content) {
						targetFile.content = `// 无法读取文件内容，可能是编码问题或文件访问限制\n// 错误信息: ${err.message}`;
					}
					
					vscode.window.showErrorMessage(`重新读取文件失败: ${err.message}`);
				}
				
				// 获取滚动信息
				const scrollInfo = this.scrollPositions_7ree[fileId] || {};
				
				// 获取锚点文本和顶部可见行
				const editorInfo = this.editorPositions_7ree ? this.editorPositions_7ree[fileId] || {} : {};
				
				// 确保不发送undefined内容
				if (targetFile.content === undefined || targetFile.content === null) {
					console.warn(`准备发送的内容为undefined或null，已替换为空字符串`);
					targetFile.content = '';
				}
				
				// 获取视图状态信息
				const viewState = this.editorPositions_7ree && this.editorPositions_7ree[fileId] 
				    ? this.editorPositions_7ree[fileId].viewState 
				    : undefined;
				
				console.log(`向WebView发送内容 for fileId: ${fileId}, 内容长度: ${targetFile.content.length}`);
				console.log(`- 滚动位置: ${scrollInfo.position}`);
				console.log(`- 滚动比例: ${scrollInfo.ratio !== 'bottom' ? (scrollInfo.ratio?.toFixed(4) || 'undefined') : 'bottom'}`);
				console.log(`- 顶部可见行: ${editorInfo.topVisibleLine || 'undefined'}`);
				console.log(`- 锚点文本: ${editorInfo.anchorText ? '已保存' : 'undefined'}`);
				console.log(`- 视图状态: ${viewState ? '已保存' : '未保存'}`);
				
				this.view.webview.postMessage({
					command: 'loadNotes',
					text: targetFile.content,
					fileId: fileId,
					files: this.openFiles_7ree,
					scrollPosition: scrollInfo.position,
					scrollTopRatio: scrollInfo.ratio,
					topVisibleLine: editorInfo.topVisibleLine,
					anchorText: editorInfo.anchorText,
					viewState: viewState
				});
				
				console.log(`已发送消息到webview，切换到文件: ${targetFile.name}`);
			} else {
				console.warn('WebView不可见，无法加载文件');
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
					console.log(`切换文件时更新修改时间: ${fileId}, 时间: ${new Date(stats.mtimeMs).toLocaleString()}`);
				} catch (err) {
					console.error(`获取文件修改时间失败: ${err.message}`);
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
			console.error('Failed to save notes to', this.notesFile, err);
		}
	}

	// 修改：saveNotesById_7ree，移除topVisibleLineAndAnchor参数
	saveNotesById_7ree(fileId, content, isSwitchingTabs = false) {
		console.log(`开始保存文件 ${fileId}，是否切换标签: ${isSwitchingTabs}`);
		
		const fileIndex = this.openFiles_7ree.findIndex(f => f.id === fileId);
		if (fileIndex !== -1) {
			this.openFiles_7ree[fileIndex].content = content;
			console.log(`文件 ${fileId} 的内存内容已更新`);
		} else {
			console.warn(`尝试保存未在openFiles_7ree中找到的文件ID: ${fileId}`);
		}
		
		if (fileId === 'default_notes_7ree') {
			this.notesContent = content;
			this.saveNotes(); 
			console.log(`默认备忘录 ${fileId} 已通过 saveNotes() 保存`);
		} else {
			const file = this.openFiles_7ree.find(f => f.id === fileId);
			if (file && file.path) {
				try {
					fs.writeFileSync(file.path, content);
					
					// 更新文件的最后修改时间
					const stats = fs.statSync(file.path);
					this.fileLastModified_7ree[fileId] = stats.mtimeMs;
					console.log(`保存文件后更新修改时间: ${fileId}, 时间: ${new Date(stats.mtimeMs).toLocaleString()}`);
					
					console.log(`外部文件 ${file.path} (ID: ${fileId}) 已保存`);
					if (this.view && !isSwitchingTabs && this.currentFileId_7ree === fileId) {
						this.view.webview.postMessage({
							command: 'updateStatus',
							status: `上次保存: ${new Date().toLocaleTimeString()}`
						});
					}
					if (!isSwitchingTabs) {
						vscode.window.setStatusBarMessage(`已保存到: ${file.path}`, 3000);
					}
				} catch (err) {
					vscode.window.showErrorMessage(`保存到 ${file.path} 失败: ${err.message}`);
					console.error(`保存 ${file.path} 失败:`, err);
				}
			} else {
				console.warn(`尝试保存的外部文件 ${fileId} 没有有效的路径或未找到`);
			}
		}
		
		// this.scrollPositions_7ree[fileId] 应该已由 onDidReceiveMessage 更新
		console.log(`准备为文件 ${fileId} 保存配置文件，当前已记录的滚动位置: ${this.scrollPositions_7ree[fileId]}`);
		this._saveImportedFiles_7ree(); 
		if (this.currentFileId_7ree === fileId) { 
            this._saveLastActiveFileId_7ree();
        }
	}

	// 新增：检查外部文件是否有变动
	async checkFileChanged_7ree(fileId, currentContent) {
		console.log(`检查文件是否有变动: ${fileId}`);
		
		const file = this.openFiles_7ree.find(f => f.id === fileId);
		let filePath = '';
		
		// 针对不同类型文件获取对应的文件路径
		if (fileId === 'default_notes_7ree') {
			// 对于默认备忘录，使用notesFile作为路径
			filePath = this.notesFile;
			
			// 确保默认备忘录文件存在
			if (!fs.existsSync(filePath)) {
				console.log(`默认备忘录文件不存在: ${filePath}`);
				// 如果默认备忘录不存在，直接返回无变动
				this.view?.webview.postMessage({
					command: 'fileCheckResult',
					fileId: fileId,
					changed: false
				});
				return;
			}
		} else {
			// 对于导入的外部文件，使用文件对象的path
			if (!file || !file.path || !fs.existsSync(file.path)) {
				console.log(`文件不存在或路径无效: ${fileId}`);
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
				console.log(`首次记录文件修改时间: ${fileId}, 时间: ${new Date(currentMtime).toLocaleString()}, 大小: ${formattedSize}`);
				this.view?.webview.postMessage({
					command: 'fileCheckResult',
					fileId: fileId,
					changed: false
				});
				return;
			}
			
			// 检查修改时间是否变化
			if (currentMtime > this.fileLastModified_7ree[fileId]) {
				console.log(`检测到文件变动: ${fileId}`);
				console.log(`- 上次修改时间: ${new Date(this.fileLastModified_7ree[fileId]).toLocaleString()}`);
				console.log(`- 当前修改时间: ${new Date(currentMtime).toLocaleString()}`);
				console.log(`- 文件大小: ${formattedSize}`);
				
				// 更新记录的修改时间
				this.fileLastModified_7ree[fileId] = currentMtime;
				
				// 新增：检查文件编码是否为UTF-8
				try {
					const isUTF8 = await this.isFileUTF8_7ree(filePath);
					if (!isUTF8) {
						console.error(`检测到文件编码不是UTF-8: ${filePath}`);
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
					console.error(`检查文件编码失败: ${err.message}`);
					// 继续处理，因为这可能是暂时性错误
				}
				
				// 读取文件的最新内容
				const newContent = fs.readFileSync(filePath, 'utf8');
				
				// 如果内容有变化，通知webview更新
				if (newContent !== currentContent) {
					const newSize = Buffer.byteLength(newContent, 'utf8');
					const oldSize = Buffer.byteLength(currentContent, 'utf8');
					const sizeDiff = newSize - oldSize;
					console.log(`文件内容已变化, 新大小: ${this.formatFileSize_7ree(newSize)}, 变化: ${sizeDiff > 0 ? '+' : ''}${this.formatFileSize_7ree(Math.abs(sizeDiff))}`);
					
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
			console.log(`文件无变动: ${fileId}, 大小: ${formattedSize}`);
			this.view?.webview.postMessage({
				command: 'fileCheckResult',
				fileId: fileId,
				changed: false
			});
			
		} catch (err) {
			console.error(`检查文件变动出错: ${err.message}`);
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
		console.log(`loadNotes: 当前活动文件ID: ${this.currentFileId_7ree}`);
		
		if (!this.view) {
			console.warn('loadNotes: View 未初始化');
			return;
		}
		
		if (!this.view.visible) {
			console.log('loadNotes: View 当前不可见，跳过加载');
			return;
		}
		
		let filePath = '';
		let fileId = this.currentFileId_7ree;
		let isDefaultNotes = fileId === 'default_notes_7ree';
		
		// 确定文件路径
		if (isDefaultNotes) {
			// 对于默认笔记，使用预设路径
			filePath = this.notesFile; // 使用notesFile而不是拼接路径
			console.log(`默认笔记路径: ${filePath}`);
		} else {
			// 对于导入的文件，使用存储的路径
			const fileInfo = this.openFiles_7ree.find(f => f.id === fileId);
			if (fileInfo && fileInfo.path) {
				filePath = fileInfo.path;
				console.log(`导入的文件路径: ${filePath}`);
			} else {
				console.warn(`找不到文件ID: ${fileId} 的路径，切换到默认笔记`);
				fileId = 'default_notes_7ree';
				filePath = this.notesFile; // 使用notesFile而不是拼接路径
				this.currentFileId_7ree = fileId;
				isDefaultNotes = true;
			}
		}
		
		// 尝试加载文件内容
		try {
			console.log(`尝试读取文件: ${filePath}`);
			
			// 检查文件是否存在
			if (!fs.existsSync(filePath)) {
				console.warn(`文件不存在: ${filePath}`);
				
				if (isDefaultNotes) {
					// 默认笔记不存在，创建空文件
					console.log('创建默认笔记文件');
					this._ensureNotesDirectoryExists();
					fs.writeFileSync(filePath, '', 'utf8');
				} else {
					// 导入的文件不存在，检查缓存
					const cachedContent = this.fileContentCache_7ree[fileId];
					if (cachedContent) {
						console.log(`使用缓存内容: ${fileId}，长度: ${cachedContent.length}`);
						this.sendContentToWebview(fileId, cachedContent);
						return;
					} else {
						// 无缓存，切换到默认笔记
						console.warn(`文件不存在且无缓存: ${filePath}，切换到默认笔记`);
						fileId = 'default_notes_7ree';
						filePath = this.notesFile; // 使用notesFile而不是拼接路径
						
						if (fs.existsSync(filePath)) {
							const defaultContent = fs.readFileSync(filePath, 'utf8');
							this.sendContentToWebview('default_notes_7ree', defaultContent);
						} else {
							console.log('默认笔记也不存在，创建空文件');
							this._ensureNotesDirectoryExists();
							fs.writeFileSync(filePath, '', 'utf8');
							this.sendContentToWebview('default_notes_7ree', '');
						}
						return;
					}
				}
			}
			
			// 读取文件内容
			const content = fs.readFileSync(filePath, 'utf8');
			console.log(`已读取文件: ${filePath}, 内容长度: ${content.length}`);
			
			// 获取滚动信息
			let scrollPosition = 0;
			let viewState = undefined;
			let scrollTopRatio = undefined;
			
			// 从编辑器位置和滚动位置中获取信息
			if (this.editorPositions_7ree && this.editorPositions_7ree[fileId]) {
				viewState = this.editorPositions_7ree[fileId].viewState;
			}
			
			// 为向后兼容获取 scrollTopRatio
			if (this.scrollPositions_7ree[fileId]) {
				scrollPosition = this.scrollPositions_7ree[fileId].position;
				scrollTopRatio = this.scrollPositions_7ree[fileId].ratio;
			}
			
			// 保存到缓存
			this.fileContentCache_7ree[fileId] = content;
			
			// 发送内容到 WebView
			if (this.view.visible) {
				// 确保未定义的项不会被传递为 null 或 undefined
				const textToSend = content || '';
				
				// 发送完整的数据包括视图状态
				this.view.webview.postMessage({
					command: 'loadNotes',
					text: textToSend,
					fileId: fileId,
					files: this.openFiles_7ree,
					scrollPosition: scrollPosition,
					scrollTopRatio: scrollTopRatio,
					viewState: viewState, // 发送视图状态
					settings: this.uiSettings_7ree
				});
				
				console.log(`已发送内容到WebView: 文件ID=${fileId}, 内容长度=${textToSend.length}`);
				console.log(`- 滚动信息: 位置=${scrollPosition || '未设置'}, 比例=${scrollTopRatio !== undefined ? (scrollTopRatio !== 'bottom' ? scrollTopRatio.toFixed(4) : 'bottom') : '未设置'}`);
				console.log(`- 视图状态: ${viewState ? '已设置' : '未设置'}`);
			} else {
				console.warn('loadNotes: WebView不可见，无法发送消息');
			}
		} catch (err) {
			console.error(`读取文件错误: ${filePath}`, err);
			
			// 尝试使用缓存
			const cachedContent = this.fileContentCache_7ree[fileId];
			if (cachedContent) {
				console.log(`使用缓存内容: ${fileId}，长度: ${cachedContent.length}`);
				this.sendContentToWebview(fileId, cachedContent);
			} else if (isDefaultNotes) {
				// 默认笔记出错且无缓存，使用空字符串
				console.warn('默认笔记读取错误且无缓存，使用空内容');
				this.sendContentToWebview(fileId, '');
			} else {
				// 导入文件出错且无缓存，切换到默认笔记
				console.warn(`文件读取错误且无缓存: ${filePath}，切换到默认笔记`);
				this.loadDefaultNotes_7ree();
			}
		}
	}

	// 在 sendContentToWebview 方法中也删除topVisibleLine部分
	sendContentToWebview(fileId, content) {
		if (!this.view || !this.view.visible) {
			console.log('WebView不可见，无法发送内容');
			return;
		}
		
		// 获取滚动信息
		let scrollPosition = 0;
		let viewState = undefined;
		let scrollTopRatio = undefined;
		
		// 从编辑器位置和滚动位置中获取信息
		if (this.editorPositions_7ree && this.editorPositions_7ree[fileId]) {
			viewState = this.editorPositions_7ree[fileId].viewState;
		}
		
		// 为向后兼容获取 scrollTopRatio
		if (this.scrollPositions_7ree[fileId]) {
			scrollPosition = this.scrollPositions_7ree[fileId].position;
			scrollTopRatio = this.scrollPositions_7ree[fileId].ratio;
		}
		
		this.view.webview.postMessage({
			command: 'loadNotes',
			text: content || '',
			fileId: fileId,
			files: this.openFiles_7ree,
			scrollPosition: scrollPosition,
			scrollTopRatio: scrollTopRatio,
			viewState: viewState, // 发送视图状态
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
        
        // 添加Monaco Editor资源URI
        const monacoEditorUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', 'monaco-editor', 'min', 'vs'));

		// 读取 HTML 模板
		const htmlPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'main.html').fsPath;
		let html = fs.readFileSync(htmlPath, 'utf8');

		// 替换占位符
		html = html.replace('{{scriptUri}}', scriptUri.toString());
		html = html.replace('{{styleUri}}', styleUri.toString());
        html = html.replace('{{resourcesBaseUri_7ree}}', resourcesBaseUri_7ree.toString());
        html = html.replace('{{monacoEditorUri}}', monacoEditorUri.toString() + '/loader.js');

		return html;
	}

	// 修改: 使用VSCode在主窗口打开文件
	openFileExternally_7ree(fileId) {
		console.log(`尝试在VSCode主窗口打开文件 ${fileId}`);
		
		// 查找文件
		const file = this.openFiles_7ree.find(f => f.id === fileId);
		
		// 处理默认备忘录的情况
		let filePath = '';
		if (fileId === 'default_notes_7ree') {
			// 对默认备忘录使用notesFile的路径
			filePath = this.notesFile;
			
			// 确保文件存在，如果不存在则先保存
			if (!fs.existsSync(filePath)) {
				console.log(`默认备忘录文件不存在，将先创建: ${filePath}`);
				this.saveNotes(); // 先保存一次确保文件存在
			}
		} else if (file && file.path) {
			filePath = file.path;
		} else {
			console.error(`未找到有效路径的文件: ${fileId}`);
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
			console.error(errorMsg);
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
			} else if (file) {
				this.saveNotesById_7ree(fileId, file.content);
			}
		} catch (err) {
			console.error(`在打开前保存文件失败: ${err.message}`);
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
				console.log(`已在VSCode主窗口打开文件: ${filePath}`);
				if (this.view) {
					this.view.webview.postMessage({
						command: 'openFileResult',
						success: true
					});
				}
				vscode.window.setStatusBarMessage(`已在主窗口打开: ${displayName}`, 3000);
			}, (err) => {
				console.error(`打开文件失败: ${err.message}`);
				if (this.view) {
					this.view.webview.postMessage({
						command: 'openFileResult',
						success: false,
						error: err.message
					});
				}
				vscode.window.showErrorMessage(`在VSCode主窗口打开文件失败: ${err.message}`);
			});
		} catch (error) {
			console.error(`打开文件过程中发生错误: ${error.message}`);
			if (this.view) {
				this.view.webview.postMessage({
					command: 'openFileResult',
					success: false,
					error: error.message
				});
			}
			vscode.window.showErrorMessage(`打开文件失败: ${error.message}`);
		}
	}

	// 新增：重命名标签功能
	renameTab_7ree(fileId, newName) {
		console.log(`收到重命名标签请求: ${fileId} -> ${newName}`);
		
		if (!fileId || !newName) {
			console.warn('重命名标签 - 缺少必要参数');
			return;
		}
		
		// 查找要重命名的文件
		const fileIndex = this.openFiles_7ree.findIndex(f => f.id === fileId);
		if (fileIndex === -1) {
			console.warn(`找不到要重命名的标签: ${fileId}`);
			return;
		}
		
		// 保存原始名称用于显示
		const oldName = this.openFiles_7ree[fileIndex].name;
		
		// 只更新标签名称，不影响文件路径
		this.openFiles_7ree[fileIndex].name = newName;
		console.log(`标签已重命名: ${oldName} -> ${newName}`);
		
		// 保存更新后的设置
		this._saveImportedFiles_7ree();
		
		// 通知 Webview 更新显示
		if (this.view && this.view.visible) {
			this.view.webview.postMessage({
				command: 'loadNotes',
				files: this.openFiles_7ree,
				fileId: this.currentFileId_7ree,
				text: this.openFiles_7ree.find(f => f.id === this.currentFileId_7ree)?.content,
				scrollPosition: this.scrollPositions_7ree[this.currentFileId_7ree]?.position,
				scrollTopRatio: this.scrollPositions_7ree[this.currentFileId_7ree]?.ratio
			});
			
			// 在状态栏显示重命名成功消息
			vscode.window.setStatusBarMessage(`标签已重命名: ${oldName} -> ${newName}`, 3000);
		}
	}

	// 新增：处理标签重排序
	reorderTabs_7ree(draggedId, targetId, position) {
		console.log(`收到重排序标签请求: ${draggedId} ${position} ${targetId}`);
		
		if (!draggedId || !targetId || !position) {
			console.warn('重排序标签 - 缺少必要参数');
			return;
		}
		
		// 查找要移动的标签和目标标签
		const draggedIndex = this.openFiles_7ree.findIndex(f => f.id === draggedId);
		const targetIndex = this.openFiles_7ree.findIndex(f => f.id === targetId);
		
		// 检查标签是否存在
		if (draggedIndex === -1 || targetIndex === -1) {
			console.warn(`找不到要重排序的标签: ${draggedId} 或 ${targetId}`);
			return;
		}
		
		// 如果是默认备忘录，或者目标和拖动的是同一个标签，则不处理
		if (draggedId === 'default_notes_7ree' || draggedId === targetId) {
			console.warn(`无法重排序: ${draggedId} ${position} ${targetId}`);
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
		
		// 确保默认备忘录始终在第一位
		if (newIndex === 0 && this.openFiles_7ree[0].id === 'default_notes_7ree') {
			newIndex = 1;
		}
		
		// 插入到新位置
		this.openFiles_7ree.splice(newIndex, 0, movedTab);
		
		console.log(`标签已重排序: ${draggedId} 从 ${draggedIndex} 移动到 ${newIndex}`);
		
		// 保存更新后的设置
		this._saveImportedFiles_7ree();
		
		// 通知 Webview 更新显示
		if (this.view && this.view.visible) {
			this.view.webview.postMessage({
				command: 'loadNotes',
				files: this.openFiles_7ree,
				fileId: this.currentFileId_7ree,
				text: this.openFiles_7ree.find(f => f.id === this.currentFileId_7ree)?.content,
				scrollPosition: this.scrollPositions_7ree[this.currentFileId_7ree]?.position,
				scrollTopRatio: this.scrollPositions_7ree[this.currentFileId_7ree]?.ratio
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
		console.log('加载默认笔记');
		this.currentFileId_7ree = 'default_notes_7ree';
		this._saveLastActiveFileId_7ree();
		this.loadNotes();
	}

	// 添加新方法：预先加载默认备忘录内容
	_loadDefaultNotesContent() {
		try {
			// 确保notesFile路径已经初始化
			if (this.notesFile && fs.existsSync(this.notesFile)) {
				// 读取默认备忘录内容
				this.notesContent = fs.readFileSync(this.notesFile, 'utf8');
				console.log(`已预加载默认备忘录内容，长度: ${this.notesContent.length}`);
				
				// 更新默认备忘录的内存内容
				const defaultNote = this.openFiles_7ree.find(f => f.id === 'default_notes_7ree');
				if (defaultNote) {
					defaultNote.content = this.notesContent;
				}
			} else if (this.notesFile) {
				console.log(`默认备忘录文件不存在: ${this.notesFile}，将在需要时创建`);
			}
		} catch (err) {
			console.error('加载默认备忘录内容失败:', err);
		}
	}

	// 新增: 保存统一设置文件
	_saveSettings_7ree() {
		if (!this._ensureNotesDirectoryExists()) {
			console.warn('笔记目录不存在，无法保存配置');
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
					
					// 添加滚动信息（如果有）
					const scrollInfo = this.scrollPositions_7ree[file.id];
					if (scrollInfo) {
						if (scrollInfo.ratio !== undefined) {
							fileData.scrollTopRatio = scrollInfo.ratio;
						}
						if (scrollInfo.position !== undefined) {
							fileData.scrollPosition = scrollInfo.position;
						}
					}
					
					// 添加编辑器位置信息（如果有）- 仅保留viewState
					if (this.editorPositions_7ree && this.editorPositions_7ree[file.id]) {
						// 保存 viewState（如果有）
						if (this.editorPositions_7ree[file.id].viewState !== undefined) {
							fileData.viewState = this.editorPositions_7ree[file.id].viewState;
						}
					}
					
					// 只保存外部文件的路径，默认笔记的路径不重要
					if (file.id === 'default_notes_7ree') {
						delete fileData.path; // 不保存默认笔记的路径
					}
					return fileData;
				})
				.filter(fileData => 
					(fileData.scrollTopRatio !== undefined || 
					 fileData.scrollPosition !== undefined || 
					 fileData.viewState !== undefined) || 
					fileData.id !== 'default_notes_7ree'
				); // 确保至少有滚动信息或者不是默认笔记才保存

			// 创建统一设置对象
			const settings = {
				lastActiveId: this.currentFileId_7ree,
				files: filesToSave,
				uiSettings: this.uiSettings_7ree
			};

			// 写入设置文件
			fs.writeFileSync(
				this.settingsFile_7ree,
				JSON.stringify(settings, null, 2),
				'utf8'
			);
			console.log(`统一设置已保存到: ${this.settingsFile_7ree}`);
		} catch (err) {
			console.error('保存统一设置错误:', err);
		}
	}

	// 新增: 加载统一设置文件
	_loadSettings_7ree() {
		if (!this._ensureNotesDirectoryExists()) {
			console.warn('笔记目录不存在，无法加载设置');
			return null;
		}

		try {
			// 加载统一设置文件
			if (fs.existsSync(this.settingsFile_7ree)) {
				console.log('找到统一设置文件:', this.settingsFile_7ree);
				const settingsJson = fs.readFileSync(this.settingsFile_7ree, 'utf8');
				const settings = JSON.parse(settingsJson);
				console.log('已解析统一设置');
				return settings;
			} else {
				console.log('统一设置文件不存在，将使用默认值');
				return null;
			}
		} catch (err) {
			console.error('加载统一设置错误:', err);
			return null;
		}
	}

	// 保存文件列表
	_saveImportedFiles_7ree() {
		console.log('保存文件列表及滚动信息');
		this._saveSettings_7ree(); // 使用统一保存方法
	}

	// 加载导入的文件列表
	_loadImportedFiles_7ree() {
		console.log('从设置加载文件列表及滚动信息');
		
		// 从统一设置文件加载
		const settings = this._loadSettings_7ree();
		if (settings && settings.files && settings.files.length > 0) {
			this._loadFilesFromData_7ree(settings.files);
			return;
		}
		
		console.log('没有找到已保存的文件列表，将只使用默认备忘录');
	}
    
    // 添加处理搜索的方法
    search_7ree() {
        // 向Webview发送搜索命令
        if (this.view) {
            this.view.webview.postMessage({ command: 'openSearch' });
        }
    }
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
