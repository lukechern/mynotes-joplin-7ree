# MyNotes-7ree 更新日志 🚀
# MyNotes-7ree Changelog 🚀

## [0.2.1]
### ✨ 新功能 / ✨ New Features
- 新增Joplin云笔记支持，实现多端同步
- Added Joplin cloud notes support for multi-device synchronization

### 🔧 优化 / 🔧 Improvements
- 优化云笔记加载速度，提升用户体验
- Improved cloud notes loading speed for better user experience
- 优化视图状态保存和恢复机制
- Enhanced view state saving and restoration mechanism

### 🐛 修复 / 🐛 Bug Fixes
- 修复切换文件标签时视图状态丢失的问题
- Fixed view state loss when switching file tabs
- 修复云笔记同步时的状态更新问题
- Fixed state update issues during cloud notes synchronization

### 📝 其他 / 📝 Others
- 更新依赖包版本
- Updated dependency package versions
- 优化代码结构，提升可维护性
- Optimized code structure for better maintainability



## [0.0.128]

### ✨ 新功能
### ✨ New Features
- 添加了文档编辑快捷键支持：现在可以使用Ctrl+S保存文档
- Added document editing shortcut support: now you can use Ctrl+S to save documents
- 为保存按钮添加了悬停提示，显示"保存 (Ctrl+S)"快捷键信息
- Added a hover tooltip to the save button, displaying "Save (Ctrl+S)" shortcut information
- 添加了保存成功的状态栏通知，提供更直观的反馈
- Added status bar notification upon successful save, providing more intuitive feedback
- 实现编辑器失去焦点时自动保存功能，减少内容丢失风险
- Implemented automatic saving when the editor loses focus, reducing the risk of losing content

## [0.0.127]

### 🔧 功能优化
### 🔧 Feature Optimization
- 优化了非UTF-8编码文件的处理流程，检测到非UTF-8编码文件后直接在VSCode主窗口打开
- Optimized the handling process for non-UTF-8 encoded files. When such files are detected, they are now opened directly in the VSCode main window.
- 简化了错误提示信息，更加直观地引导用户对文件进行UTF-8编码转换
- Simplified error messages to more intuitively guide users to convert files to UTF-8 encoding.
- 更新了确认按钮的文本为"知道了"，使用户体验更加友好
- Updated the confirmation button text to "Got it" for a more user-friendly experience.

## [0.0.126]

### 🔧 功能优化
### 🔧 Feature Optimization
- 改进了非UTF-8编码文件的错误提示
- Improved error prompts for non-UTF-8 encoded files.
- 添加了在遇到编码问题时直接在VSCode主窗口打开文件的功能
- Added the ability to open files directly in the VSCode main window when encoding issues occur.
- 优化了错误对话框，增加了打开文件按钮
- Optimized the error dialog by adding a button to open the file.
- 支持点击错误对话框中的按钮直接打开文件
- Supported opening the file directly by clicking the button in the error dialog.


## [0.0.125]
### 🐛 Bug修复
### 🐛 Bug Fixes
- 修复重命名标签对话框中按钮点击无法响应的问题
- Fixed the issue where button clicks in the rename dialog were unresponsive.
- 增强按钮的点击区域和样式，确保按钮可以正确接收鼠标事件
- Enhanced the clickable area and style of buttons to ensure they properly receive mouse events.
- 添加详细的事件日志，便于调试和排查类似问题
- Added detailed event logs for easier debugging and troubleshooting of similar issues.
- 为按钮元素增加适当的z-index值，避免被其他元素遮挡
- Added appropriate z-index values to button elements to prevent them from being covered by other elements.

## [0.0.122]
### 🎨 UI优化
### 🎨 UI Optimization
- 统一搜索框激活样式：修改了搜索输入框 (`#search_input_7ree`) 在获取焦点时的边框样式，使其与扩展内其他输入表单字段（如重命名、设置输入框）的激活边框颜色（通常为蓝色，取决于VSCode主题 `focusBorder`）保持一致。
- Unified the active style of the search box: Modified the border style of the search input (`#search_input_7ree`) when focused, making it consistent with other input fields (such as rename and settings inputs) in the extension. The active border color is usually blue, depending on the VSCode theme `focusBorder`.
- 移除了搜索框激活时的黄色高亮，提升了UI风格的统一性。
- Removed the yellow highlight when the search box is active, improving UI consistency.
- 微调了搜索输入框的基础样式，使其观感更接近VSCode原生输入框。
- Fine-tuned the base style of the search input to make it look closer to the native VSCode input box.

## [0.0.121]
### 🐛 Bug修复
### 🐛 Bug Fixes
- 修复了重命名标签对话框中，"取消"和"确定"按钮鼠标点击无效的问题。
- Fixed the issue where the "Cancel" and "Confirm" buttons in the rename dialog were unresponsive to mouse clicks.
- 调整了事件绑定时机，确保在对话框元素添加到DOM后再从其内部查找并绑定按钮事件。
- Adjusted the timing of event binding to ensure that button events are bound only after the dialog element is added to the DOM.
- 增加了对 `window.RESOURCES_BASE_URI_7ree` 的 `undefined` 检查，提高代码健壮性。
- Added a check for `window.RESOURCES_BASE_URI_7ree` being `undefined` to improve code robustness.
- 为按钮点击事件添加了日志，方便问题排查。
- Added logs to button click events for easier troubleshooting.

## [0.0.120]
### 🐛 修复与重构
### 🐛 Fixes & Refactoring
- 重构搜索导航逻辑，解决匹配项跳转时卡住或跳过的问题。
- Refactored the search navigation logic to fix issues where navigation would get stuck or skip matches.
- 引入 `applyAllSearchDecorations_7ree` 函数统一处理高亮，确保高亮状态与匹配列表 (`searchMatchesList_7ree`) 实时同步。
- Introduced the `applyAllSearchDecorations_7ree` function to handle highlights uniformly, ensuring highlight status is always in sync with the match list (`searchMatchesList_7ree`).
- 简化 `performSearch`, `navigateToMatch`, `nextMatch`, `prevMatch` 函数，使其职责更清晰，减少状态管理复杂度。
- Simplified the `performSearch`, `navigateToMatch`, `nextMatch`, and `prevMatch` functions for clearer responsibilities and reduced state management complexity.
- `searchMatchesList_7ree` 作为匹配项的唯一数据源，避免了从 DOM 多次重新获取和排序匹配项。
- Made `searchMatchesList_7ree` the sole data source for matches, avoiding repeated DOM queries and sorting.
- 提高了搜索导航的稳定性和可靠性，确保在各种情况下都能正确循环和跳转。
- Improved the stability and reliability of search navigation, ensuring correct cycling and navigation in all scenarios.

## [0.0.119]
### 🐛 彻底修复
### 🐛 Thorough Fix
- 彻底修复搜索功能中"上一个"按钮无法循环回到最后一个的问题
- Completely fixed the issue where the "Previous" button in the search function could not cycle back to the last match.
- 发现并移除了`navigateToMatch`函数中阻止循环导航的索引限制检查
- Found and removed the index limit check in the `navigateToMatch` function that prevented cyclic navigation.
- 重构为更健壮的循环导航逻辑，确保从任意位置都可以循环到任意位置
- Refactored to a more robust cyclic navigation logic, ensuring you can cycle from any position to any other position.
- 增强日志输出，清晰显示当前位置和总匹配数，便于调试
- Enhanced log output to clearly show the current position and total matches, making debugging easier.

## [0.0.118]
### 🐛 修复
### 🐛 Bug Fixes
- 修复搜索功能中"上一个"按钮在第一个匹配项无法循环回到最后一个的问题
- Fixed the issue where the "Previous" button in the search function could not cycle from the first match back to the last one.
- 统一"上一个"和"下一个"按钮的循环逻辑，确保可以在首尾匹配项之间无缝循环
- Unified the cycling logic for the "Previous" and "Next" buttons to ensure seamless cycling between the first and last matches.
- 添加详细日志输出，方便定位和排查搜索导航相关问题
- Added detailed log output to facilitate locating and troubleshooting search navigation issues.

## [0.0.117]
### 🐛 修复
### 🐛 Bug Fixes
- 修复搜索计数显示bug：之前在循环浏览匹配项时可能会出现计数超出总数的情况（如8/7）
- Fixed the bug where the search count could exceed the total number of matches (e.g., 8/7) when cycling through matches.
- 确保匹配计数始终在有效范围内，提高搜索功能稳定性
- Ensured that the match count always stays within a valid range, improving the stability of the search function.

### ✨ 新功能
### ✨ New Features
- 添加智能搜索填充：选中文本后点击搜索按钮，会自动将选中内容填充到搜索框
- Added smart search autofill: after selecting text, clicking the search button will automatically fill the selected content into the search box.
- 自动选中填充的文本，方便用户快速修改搜索内容
- Automatically selects the filled text, making it easier for users to quickly modify the search content.
- 增强搜索体验，减少重复操作
- Enhanced the search experience and reduced repetitive operations.

## [0.0.116]
### ✨ 改进
### ✨ Improvements
- 优化搜索体验：当切换到其他文件标签时，自动关闭搜索框
- Optimized the search experience: the search box now automatically closes when switching to other file tabs.
- 避免了在切换文件时搜索框保持打开的干扰，提升了使用流畅度
- Prevented the search box from remaining open when switching files, improving overall smoothness of use.

## [0.0.115]
### 🐛 修复
### 🐛 Bug Fixes
- 修复了搜索功能导致文件标签和编辑器内容不显示的问题
- Fixed the issue where the search function caused file tabs and editor content to not display.
- 修复了搜索图标的主题适配问题
- Fixed the theme adaptation issue of the search icon.
- 优化了搜索功能的稳定性
- Improved the stability of the search function.

## [0.0.114]
### ✨ 改进
### ✨ Improvements
- 完善搜索条界面，移动关闭按钮到左侧
- Improved the search bar interface, moved the close button to the left.
- 使用外部箭头图标替代文本按钮
- Replaced text buttons with external arrow icons.
- 添加键盘快捷键：Enter下一个匹配，Shift+Enter上一个匹配，ESC关闭搜索框
- Added keyboard shortcuts: Enter for next match, Shift+Enter for previous match, ESC to close the search box.
- 整合搜索功能到VSCode命令
- Integrated the search function into VSCode commands.

## [0.0.113]
### ✨ Improved
### 🔍 Improved search function:
- 🔍 优化搜索功能：
  - 改进搜索条的UI和交互体验
  - Improved the UI and interaction experience of the search bar.
  - 固定搜索条在编辑器顶部，取消浮动对话框
  - Fixed the search bar at the top of the editor, removed the floating dialog.
  - 点击搜索按钮可以切换显示/隐藏搜索条
  - Clicking the search button toggles the display/hide of the search bar.

## [0.0.112]
### 🔧 功能优化
### 🔧 Feature Optimization
- 🔍 优化搜索功能位置：将搜索按钮从HTML界面移至标题栏设置按钮前
- Optimized the search function position: moved the search button from the HTML interface to before the title bar settings button.
- ⚡ 响应优化：通过菜单点击搜索按钮可直接打开搜索对话框
- Response optimization: clicking the search button in the menu now directly opens the search dialog.
- 🧩 改进扩展结构：保持标题栏操作按钮布局更加合理
- Improved extension structure: kept the layout of the title bar action buttons more reasonable.

## [0.0.111]
### ✨ 新功能
### ✨ New Features
- 🔍 新增文档搜索功能：在标题栏添加搜索按钮，支持文档内容搜索
- Added document search function: added a search button in the title bar to support document content search.
- 📊 搜索结果显示匹配次数统计，支持快速导航到上一个/下一个匹配项
- Search results now display match count statistics and support quick navigation to previous/next matches.
- 🔄 搜索对话框支持拖动，避免遮挡需要查看的内容
- The search dialog now supports dragging to avoid covering content you need to see.
- 🎯 搜索结果高亮显示，并标记当前匹配项
- Search results are highlighted and the current match is marked.

## [0.0.110]
###  ✨ 阶段稳定版
###  ✨ Milestone Stable Version

## [0.0.108]
### 🎨 UI优化
### 🎨 UI Optimization
-  优化文件标签切换样式，保留上方、左方、右方浅色圆角边框
-  Optimized file tab switching style, retaining light-colored rounded borders on the top, left, and right.
-  改进标签悬停效果，移除可能引起视觉跳动的粗体效果和外部边框
-  Improved tab hover effect, removing bold effect and outer border that might cause visual jitter.
-  优化保存按钮悬停效果，字体颜色更亮，提升可见性
-  Optimized save button hover effect with brighter font color for improved visibility.
-  将变更日志从package.json移至独立的CHANGELOG.md文件，结构更清晰
-  Moved changelog from package.json to a separate CHANGELOG.md file for a clearer structure.

## [0.0.107]
### 新增式样参数获取
### Added Style Parameter Acquisition
- 添加了未定义式样参数时，会自动从vscode默认主题中获取默认样式
- Added functionality to automatically fetch default styles from the VSCode default theme when style parameters are undefined.
- 添加选中文本背景色设置选项
- Added an option to set the background color for selected text.
- 禁用模糊Unicode字符的警告提示
- Disabled warning prompts for ambiguous Unicode characters.
- 从VSCode主题继承默认UI设置
- Inherited default UI settings from the VSCode theme.
- 统一配置文件存储，精简代码
- Unified configuration file storage and streamlined code.

## [0.0.101]

### 修复
### Fixes
- 解决编辑器状态(`editor.restoreViewState`)恢复失效问题
- Resolved the issue where editor state (`editor.restoreViewState`) restoration failed.
- 改进视图状态(`viewState`)的序列化和解析过程，防止保存无效数据
- Improved the serialization and parsing process of view state (`viewState`) to prevent saving invalid data.
- 添加延迟和多级错误处理，确保编辑器准备就绪后再恢复状态
- Added delays and multi-level error handling to ensure the editor is ready before restoring state.
- 增加验证机制，确保视图状态恢复后与预期一致
- Added a validation mechanism to ensure the view state is consistent with expectations after restoration.
- 修复切换标签时视图状态被错误重写的问题
- Fixed the issue where view state was incorrectly overwritten when switching tabs.

## [0.0.98]

### 优化
### Optimization
- 彻底移除旧版本的滚动位置记忆机制中的`topVisibleLine`相关代码
- Completely removed `topVisibleLine` related code from the old scroll position memory mechanism.
- 专一使用Monaco Editor的原生`viewState`API进行位置保存和恢复
- Exclusively used Monaco Editor's native `viewState` API for position saving and restoration.
- 简化`persistScrollPosition`和`loadNotes`相关代码，消除两种定位机制并存的冲突
- Simplified `persistScrollPosition` and `loadNotes` related code, eliminating conflicts between the two coexisting positioning mechanisms.
- 提高编辑器状态恢复的一致性和可靠性
- Improved the consistency and reliability of editor state restoration.

## [0.0.97]

### 优化
### Optimization
- 完全重写了滚动位置记忆和恢复机制
- Completely rewrote the scroll position memory and restoration mechanism.
- 使用 Monaco Editor 的原生 `saveViewState()` 和 `restoreViewState()` API，实现一次性精确恢复编辑器状态
- Used Monaco Editor's native `saveViewState()` and `restoreViewState()` APIs to achieve precise one-time restoration of editor state.
- 修复了之前滚动位置恢复不准确的问题，现在能够一次性准确定位到保存的位置
- Fixed the previous issue of inaccurate scroll position restoration; now it can accurately locate the saved position in one go.
- 保持向后兼容性，仍支持旧版本配置文件中的 topVisibleLine 属性
- Maintained backward compatibility, still supporting the topVisibleLine attribute in older configuration files.

## [0.0.96]

### 🐛 修复
### 🐛 Bug Fixes
- 进一步优化滚动位置恢复逻辑，解决行号定位偏差问题。
- Further optimized the scroll position restoration logic to resolve line number positioning deviation issues.
- 增加了 `setTimeout` 延迟，并采用 `editor.setScrollTop()` 直接设置滚动位置。
- Added a `setTimeout` delay and used `editor.setScrollTop()` to directly set the scroll position.
- 添加了二次确认机制，在短暂延迟后再次检查并设置滚动位置，以应对编辑器状态更新缓慢的情况。
- Added a secondary confirmation mechanism to recheck and set the scroll position after a short delay to handle slow editor state updates.
- 目标是确保记录的行号与恢复时编辑器实际显示的顶行完全一致。
- The goal is to ensure that the recorded line number is completely consistent with the actual top visible line in the editor upon restoration.

## [0.0.95]

### 🐛 修复
### 🐛 Bug Fixes
- 修复了恢复编辑器滚动位置时行号定位不准确的问题
- Fixed the issue of inaccurate line number positioning when restoring editor scroll position.
- 重写了行号定位逻辑，使用精确控制滚动位置的方式代替原来的`revealLine`方法
- Rewritten the line number positioning logic, using precise scroll position control instead of the original `revealLine` method.
- 确保记录的行号和还原时显示的行号完全一致，解决了之前有偏差的问题
- Ensured that the recorded line number and the displayed line number upon restoration are completely consistent, resolving previous deviation issues.
- 通过直接控制编辑器内部滚动控制器实现精确滚动位置设置
- Achieved precise scroll position setting by directly controlling the editor's internal scroll controller.

## [0.0.94]

### 🐛 修复
### 🐛 Bug Fixes
- 修复切换文件标签后滚动条向上跳动的问题，通过改用`revealLine`代替`revealLineInCenter`方法
- Fixed the issue of the scrollbar jumping upwards after switching file tabs by using `revealLine` instead of `revealLineInCenter`.
- 修复`imported_files_7ree.json`中未记录行号的问题，完善配置文件中的位置记录
- Fixed the issue where line numbers were not recorded in `imported_files_7ree.json`, improving position recording in the configuration file.
- 确保正确读取和保存编辑器顶部可见行信息
- Ensured correct reading and saving of the editor's top visible line information.
- 提高滚动位置恢复的准确性，尤其在频繁切换标签时
- Improved the accuracy of scroll position restoration, especially during frequent tab switching.

## [0.0.93]

### 🛠 优化
### 🛠 Optimization
- 重构滚动位置记录和恢复机制，极大简化逻辑
- Refactored the scroll position recording and restoration mechanism, greatly simplifying the logic.
- 使用Monaco编辑器顶部可见行作为唯一滚动位置依据
- Used the Monaco editor's top visible line as the sole basis for scroll position.
- 移除复杂的锚点文本和滚动比例相关代码，提高性能
- Removed complex anchor text and scroll ratio related code to improve performance.
- 代码更简洁，维护更容易，同时保持准确的滚动位置记忆
- The code is cleaner, easier to maintain, and maintains accurate scroll position memory.

## [0.0.92]

### 🐛 修复
### 🐛 Bug Fixes
- 修复文字颜色未能遵从参数设置的问题
- Fixed the issue where text color did not adhere to parameter settings.
- 修复行号边栏未能遵从背景颜色设置的问题
- Fixed the issue where the line number sidebar did not adhere to background color settings.
- 优化自定义样式应用机制，确保编辑器所有部分颜色统一
- Optimized the custom style application mechanism to ensure uniform color across all parts of the editor.

## [0.0.91]

### ✨ 新功能
### ✨ New Features
- 添加编辑器背景色自定义设置，可在参数设置中直接设置背景色
- Added custom editor background color setting, which can be set directly in the parameter settings.
- 优化编辑器样式应用机制，确保背景色设置立即生效
- Optimized the editor style application mechanism to ensure background color settings take effect immediately.
- 编辑器样式更加灵活，不再强制使用VSCode主题颜色
- Editor styles are more flexible and no longer forced to use VSCode theme colors.

## [0.0.90]

### ✨ 新功能
### ✨ New Features
- 集成Monaco编辑器替代原有的textarea，提供更强大的文本编辑体验
- Integrated Monaco editor to replace the original textarea, providing a more powerful text editing experience.
- 添加对行号显示、代码高亮等高级编辑功能的支持
- Added support for advanced editing features such as line number display and code highlighting.
- 优化编辑器位置记忆功能，增加顶部可见行和锚点文本双重定位机制
- Optimized the editor position memory function, adding a dual positioning mechanism of top visible line and anchor text.
- 改进滚动位置保存逻辑，确保切换标签和重新加载后准确恢复位置
- Improved the scroll position saving logic to ensure accurate position restoration after switching tabs and reloading.

### 🛠 功能改进
### 🛠 Feature Improvements
- 加强错误边界处理，提高在各种异常情况下的稳定性
- Strengthened error boundary handling to improve stability in various exceptional situations.
- 优化自动保存机制，避免不必要的保存操作
- Optimized the auto-save mechanism to avoid unnecessary save operations.
- 提升与VSCode主题的集成度，自动适配明暗主题
- Improved integration with VSCode themes, automatically adapting to light and dark themes.

## [0.0.89]

### 🛠 功能改进
### 🛠 Feature Improvements
- 优化文件打开方式：将"外部打开"功能改为"编辑器打开"，在VSCode主窗口中直接打开文件，提供更无缝的编辑体验。
- Optimized file opening method: changed the "Open Externally" feature to "Open in Editor", opening files directly in the VSCode main window for a more seamless editing experience.
- 统一操作流程，使文件在同一编辑环境中打开，避免在多个程序间切换。
- Unified the operation flow, allowing files to be opened in the same editing environment and avoiding switching between multiple programs.

## [0.0.88]

### 🛠 界面优化
### 🛠 UI Optimization
- 优化编码不兼容弹窗的快捷键，移除Enter键关闭功能，只保留ESC键关闭，减少冗余操作提示。
- Optimized shortcuts for the encoding incompatibility pop-up, removing the Enter key to close and retaining only ESC to close, reducing redundant operation prompts.
- 进一步缩小弹窗按钮高度，将内边距从5px 12px调整为4px 10px，使界面更加紧凑。
- Further reduced the height of pop-up buttons, adjusting padding from 5px 12px to 4px 10px for a more compact interface.

## [0.0.87]

### 🛠 界面优化
### 🛠 UI Optimization
- 降低所有弹窗（重命名对话框、设置对话框、确认对话框）中操作按钮的高度约20%，使界面更加紧凑精致。
- Reduced the height of action buttons in all pop-ups (rename dialog, settings dialog, confirmation dialog) by about 20% for a more compact and refined interface.

## [0.0.86]

### 🛠 界面优化
### 🛠 UI Optimization
- 优化关闭文件标签小叉叉图标的悬停效果，移除红色圆形背景，只保留图标变亮变粗的效果，使界面更加简洁一致。
- Optimized the hover effect of the small close icon on file tabs, removing the red circular background and retaining only the effect of the icon becoming brighter and thicker, for a cleaner and more consistent interface.

## [0.0.85]

### 🛠 界面优化
### 🛠 UI Optimization
- 统一各类对话框中操作按钮的尺寸，让关闭标签确认对话框和参数设置窗口的按钮与重命名标签对话框的按钮保持一致。
- Unified the size of action buttons in various dialogs, making the buttons in the close tab confirmation dialog and settings window consistent with those in the rename tab dialog.
- 移除了设置对话框按钮的最小宽度限制，使整体界面风格更加统一。
- Removed the minimum width limit for settings dialog buttons for a more unified overall interface style.

## [0.0.84]

### 🛠 界面优化
### 🛠 UI Optimization
- 进一步优化回车键图标，加强垂直线条部分，使其更加明显和易于识别。
- Further optimized the Enter key icon, strengthening the vertical line part to make it more prominent and easier to recognize.
- 调整图标比例和粗细，提高整体平衡性和可视性。
- Adjusted icon proportions and thickness to improve overall balance and visibility.

## [0.0.83]

### 🛠 界面优化
### 🛠 UI Optimization
- 修复 Enter 键图标在亮色和暗色主题下的显示问题，重新设计图标使其与 ESC 键风格保持一致。
- Fixed the display issue of the Enter key icon in light and dark themes, redesigning the icon to be consistent with the ESC key style.
- 确保对话框中的键盘快捷键提示图标在各主题下都清晰可见。
- Ensured that keyboard shortcut hint icons in dialogs are clearly visible in all themes.

## [0.0.82]

### 🐛 修复
### 🐛 Bug Fixes
- 修复所有对话框中的键盘快捷键问题，现在无论焦点在哪里（包括点击对话框空白区域后），Enter和Escape键都能正常工作。
- Fixed keyboard shortcut issues in all dialogs; Enter and Escape keys now work correctly regardless of focus (including after clicking on empty areas of the dialog).
- 彻底解决了设置对话框、重命名对话框、关闭确认对话框和错误提示框的键盘交互问题。
- Completely resolved keyboard interaction issues in settings dialogs, rename dialogs, close confirmation dialogs, and error pop-ups.

## [0.0.81]

### 🐛 修复
### 🐛 Bug Fixes
- 修复参数设置弹窗中ESC和ENTER快捷键不可用的问题，现在可以通过键盘快捷键关闭和确认设置。
- Fixed the issue where ESC and ENTER shortcuts were unavailable in the settings pop-up; settings can now be closed and confirmed via keyboard shortcuts.

### 📖 文档
### 📖 Documentation
- 全面重写README文档，使其更加生动有趣，同时补充了更多使用提示和功能介绍。
- Comprehensively rewrote the README documentation to be more engaging and informative, adding more usage tips and feature introductions.


## [0.0.80]

### 优化
### Optimization
- 进一步确保重命名弹窗中输入框（`#rename_input_7ree`）激活状态的边框样式与其他弹窗（如参数设置）中的输入框一致，明确移除了可能干扰边框颜色显示的 `outline` 和 `box-shadow` 属性。
- Further ensured that the border style of the active input field (`#rename_input_7ree`) in the rename pop-up is consistent with input fields in other pop-ups (e.g., settings), explicitly removing `outline` and `box-shadow` properties that might interfere with border color display.
- 多项UI细节调整：
- Multiple UI detail adjustments:
  - 标签名称弹窗中输入框与确认按钮右侧对齐。
  - Input field in the tab name pop-up is right-aligned with the confirm button.
  - ESC图标边框宽度优化，增加文字与边框的内边距。
  - Optimized ESC icon border width, increasing padding between text and border.
  - 修复了重命名弹窗中输入框激活时边框颜色与参数设置弹窗不一致的问题。
  - Fixed the issue where the border color of the active input field in the rename pop-up was inconsistent with the settings pop-up.

### 🐛 已知问题
### 🐛 Known Issues
- 参数设置弹窗中，ESC 快捷键和 ENTER 快捷键失效，无法通过键盘关闭或确认设置。
- In the settings pop-up, ESC and ENTER shortcuts are disabled, preventing closing or confirming settings via keyboard.


## [0.0.79]

### 优化
### Optimization
- 统一重命名弹窗中输入框激活状态的边框颜色，使其与参数设置弹窗一致（使用蓝色焦点边框）。
- Unified the border color of the active input field in the rename pop-up to be consistent with the settings pop-up (using a blue focus border).
- 调整ESC图标的SVG定义，增加文字与边框之间的左右间距，略微调整图标长宽比例以适应新的间距。
- Adjusted the SVG definition of the ESC icon, increasing left/right padding between text and border, and slightly adjusting the icon's aspect ratio to accommodate the new spacing.

## [0.0.78]

### 优化
### Optimization
- 调整重命名对话框中输入框与下方确认按钮的右侧对齐方式。
- Adjusted the right alignment of the input field with the confirm button below it in the rename dialog.
- 调整 ESC 图标的边框粗细和内边距，使其更清晰。
- Adjusted the border thickness and padding of the ESC icon to make it clearer.


## ✨  0.0.77

### 🛠 界面优化
### 🛠 UI Optimization
- 修复重命名弹窗中输入框右侧与弹窗边缘间距过近的问题。
- Fixed the issue where the right side of the input field in the rename pop-up was too close to the pop-up edge.
- 重新绘制ESC键的SVG图标，改为更清晰的矩形框内含"ESC"文字样式。
- Redrew the SVG icon for the ESC key to a clearer style with "ESC" text within a rectangular box.

## ✨  0.0.76

### 🛠 界面优化
### 🛠 UI Optimization
- 恢复对话框中输入框（`input`）和选择框（`select`）的宽度为100%（或适应内边距的宽度）。
- Restored the width of input fields (`input`) and select boxes (`select`) in dialogs to 100% (or a width that accommodates padding).
- 将重命名对话框（`.rename-dialog-content_7ree`）和设置对话框（`.settings-dialog-content_7ree`）的整体宽度减小了约25%，使弹窗更加紧凑。
- Reduced the overall width of the rename dialog (`.rename-dialog-content_7ree`) and settings dialog (`.settings-dialog-content_7ree`) by about 25% for more compact pop-ups.

## ✨  0.0.75

### 🐛 修复 & 界面优化
### 🐛 Fixes & UI Optimization
- 再次尝试修复对话框中SVG图标的显示问题，通过在 `extension.js` 中生成资源URI并传递给 `webview`。
- Attempted again to fix SVG icon display issues in dialogs by generating resource URIs in `extension.js` and passing them to the `webview`.
- 将对话框中的 `input` 和 `select` 元素的宽度减少了30%，使弹窗布局更协调。
- Reduced the width of `input` and `select` elements in dialogs by 30% for a more harmonious pop-up layout.

## ✨  0.0.74

### 🛠 界面优化
### 🛠 UI Optimization
- 调整确认对话框快捷键提示布局，取消键在左、确认键在右
- Adjusted the layout of shortcut hints in the confirmation dialog: Cancel key on the left, Confirm key on the right.
- 优化键盘快捷键图标显示效果，适配当前主题
- Optimized the display effect of keyboard shortcut icons to adapt to the current theme.
- 移除快捷键提示中的分隔竖线，改为等距空格，界面更简洁
- Removed the vertical separator line in shortcut hints, replacing it with equal spacing for a cleaner interface.

## ✨  0.0.73

### 🐛 修复
### 🐛 Bug Fixes
- 修复确认对话框中的回车和ESC键图标显示问题
- Fixed display issues with Enter and ESC key icons in the confirmation dialog.
- 移除键盘图标后的冒号，优化视觉效果
- Removed the colon after keyboard icons for an optimized visual effect.
- 增加"确定"和"取消"提示之间的间距，改善可读性
- Increased spacing between "Confirm" and "Cancel" hints to improve readability.

## ✨  0.0.72

### 🛠 界面优化
### 🛠 UI Optimization
- 减小标题栏操作按钮图标尺寸15%，更适合整体布局
- Reduced the size of title bar action button icons by 15% to better fit the overall layout.
- 减小文件标签文字大小20%，使界面更加简洁紧凑
- Reduced file tab text size by 20% for a cleaner and more compact interface.
- 将确认对话框和设置窗口中的快捷键文本替换为SVG图标，统一界面风格
- Replaced shortcut key text in confirmation dialogs and settings windows with SVG icons to unify the interface style.
- 提高视觉一致性，增强用户体验
- Improved visual consistency and enhanced user experience.

## ✨  0.0.71

### 🛠 界面优化
### 🛠 UI Optimization
- 优化标题栏操作按钮，使用更大尺寸的自定义SVG图标
- Optimized title bar action buttons using larger custom SVG icons.
- 操作按钮悬停时显示正确的功能描述文本
- Action buttons now display correct functional description text on hover.
- 保持符合VSCode设计风格的简洁界面
- Maintained a clean interface consistent with VSCode design style.

## ✨  0.0.70

### 🛠 界面优化
### 🛠 UI Optimization
- 优化标题栏按钮，仅显示符号不显示文字，界面更加简洁
- Optimized title bar buttons to display only symbols, not text, for a cleaner interface.
- 保留按钮悬停时的功能提示文字，确保操作清晰明了
- Retained functional hint text on button hover to ensure clear operation.
- 保持按钮排序和符号类型不变:
- Maintained button order and symbol types:
  - + (显示悬停提示: 导入文件)
  - + (Hover hint: Import file)
  - ↗ (显示悬停提示: 外部打开)
  - ↗ (Hover hint: Open externally)
  - ⚙ (显示悬停提示: 参数设置)
  - ⚙ (Hover hint: Settings)

## ✨  0.0.69

### 🛠 界面优化
### 🛠 UI Optimization
- 改用简洁线条式符号替代彩色emoji，视觉效果更加清爽
- Replaced colorful emojis with simple line-style symbols for a cleaner visual effect.
- 优化按钮悬停提示，确保显示说明文字而非符号
- Optimized button hover hints to ensure descriptive text is displayed instead of symbols.
- 调整按钮顺序，将设置(⚙)按钮放置在最右侧
- Adjusted button order, placing the settings (⚙) button on the far right.
- 三个按钮现在使用：
- The three buttons now use:
  - + (导入文件)
  - + (Import file)
  - ↗ (外部打开)
  - ↗ (Open externally)
  - ⚙ (参数设置)
  - ⚙ (Settings)

## ✨  0.0.68

### 🛠 界面优化
### 🛠 UI Optimization
- 使用emoji替代按钮文字，提供更直观的视觉体验
- Replaced button text with emojis for a more intuitive visual experience.
- 添加按钮悬停提示，方便用户理解按钮功能
- Added button hover hints to help users understand button functions.
- 优化命令注册逻辑，提升用户交互体验
- Optimized command registration logic to improve user interaction experience.
- 三个按钮分别使用：
- The three buttons now use:
  - ➕ (导入文件)
  - ➕ (Import file)
  - ↗️ (外部打开)
  - ↗️ (Open externally)
  - ⚙️ (参数设置)
  - ⚙️ (Settings)

## ✨  0.0.67

### 🛠 Bug修复
### 🛠 Bug Fixes
- 彻底解决视图标题栏按钮不显示的问题
- Completely resolved the issue of view title bar buttons not displaying.
- 使用VSCode内置的codicons图标替代自定义SVG图标
- Replaced custom SVG icons with VSCode built-in codicons.
- 完善扩展激活事件，确保视图和命令正确注册
- Improved extension activation events to ensure correct view and command registration.
- 添加menus配置，完善视图标题栏按钮与命令的绑定
- Added menus configuration to improve the binding of view title bar buttons with commands.

## ✨  0.0.66

### 🐛 Bug修复
### 🐛 Bug Fixes
- 修复视图标题栏右侧操作按钮未显示的问题
- Fixed the issue of action buttons on the right side of the view title bar not displaying.
- 使用SVG图标文件替代主题图标，提供更清晰的视觉效果
- Replaced theme icons with SVG icon files for a clearer visual effect.
- 优化VSCode标题栏按钮的实现方式，提高兼容性
- Optimized the implementation of VSCode title bar buttons to improve compatibility.

## ✨  0.0.65

### 🛠 界面优化
### 🛠 UI Optimization
- 操作按钮移至VSCode原生视图标题栏，更符合VSCode设计规范
- Moved action buttons to the native VSCode view title bar to better conform to VSCode design specifications.
- 移除自定义标题栏，增加有效内容区域空间
- Removed the custom title bar to increase effective content area space.
- 视图标题与侧边栏标题保持一致，统一显示为"备忘&ToDo"
- Kept the view title consistent with the sidebar title, uniformly displaying as "Memo & ToDo".
- 使用VSCode原生图标，视觉效果更加统一
- Used native VSCode icons for a more unified visual effect.

## ✨  0.0.64

### 🛠 界面优化
### 🛠 UI Optimization
- 修改插件标题为"备忘&ToDo"，更准确地反映其功能
- Changed the plugin title to "Memo & ToDo" to more accurately reflect its functionality.
- 将操作按钮从文件标签栏移至标题栏，节省文件标签栏空间
- Moved action buttons from the file tab bar to the title bar to save space on the file tab bar.
- 拆分原有的三点菜单为三个独立按钮（导入、外部打开、设置），提高直观性和可用性
- Split the original three-dot menu into three separate buttons (Import, Open Externally, Settings) to improve intuitiveness and usability.
- 美化按钮样式，增加悬停效果和工具提示，提升用户体验
- Beautified button styles, adding hover effects and tooltips to enhance user experience.

## ✨  0.0.63

### 🐛 Bug修复
### 🐛 Bug Fixes
- 修复导入外部文件后标签显示但内容为undefined的问题
- Fixed the issue where the tab was displayed but the content was undefined after importing an external file.
- 增强文件内容加载时的错误处理和日志记录
- Enhanced error handling and logging during file content loading.
- 确保所有文件操作（导入、切换、关闭等）时不会发送undefined内容
- Ensured that undefined content is not sent during any file operations (import, switch, close, etc.).
- 添加更多防御性编程措施，提高插件稳定性
- Added more defensive programming measures to improve plugin stability.

## ✨  0.0.62

### 🐛 Bug修复
### 🐛 Bug Fixes
- 修复边栏切换后滚动条位置丢失的问题
- Fixed the issue of scrollbar position being lost after switching sidebars.
- 修复了重命名文件名标签后，文件内容无法加载的问题
- Fixed the issue where file content could not be loaded after renaming a file tab.
- 优化滚动位置跨会话保存与恢复机制
- Optimized the cross-session saving and restoration mechanism for scroll position.
- 添加Webview可见性变化监听，确保滚动位置实时保存
- Added a listener for Webview visibility changes to ensure real-time saving of scroll position.

## ✨  0.0.60

### 🛠 界面优化
### 🛠 UI Optimization
- 优化标签右侧的"更多操作"按钮(⋮)悬停效果，使其与标签hover效果保持一致
- Optimized the hover effect of the "More Actions" button (⋮) on the right side of tabs to be consistent with the tab hover effect.
- 为三点按钮添加边框高亮、细微阴影和平滑过渡动画，提升视觉统一性
- Added border highlight, subtle shadow, and smooth transition animation to the three-dot button to enhance visual unity.
- 统一了整个界面的交互反馈样式，带来更一致的用户体验
- Unified the interaction feedback style of the entire interface for a more consistent user experience.

## ✨  0.0.59

### 🛠 界面优化
### 🛠 UI Optimization
- 优化标签页悬停效果，保留并增强边框显示，不再出现边框消失的问题
- Optimized tab hover effect, retaining and enhancing border display, and preventing the border from disappearing.
- 提升标签悬停时的视觉反馈：加粗字体、优化文字颜色、添加细微阴影效果
- Improved visual feedback on tab hover: bold font, optimized text color, added subtle shadow effect.
- 为悬停状态添加平滑过渡动画，使界面变化更加自然
- Added smooth transition animation for hover states to make interface changes more natural.
- 统一活动标签和非活动标签的悬停效果，保持一致的用户体验
- Unified the hover effect for active and inactive tabs for a consistent user experience.

## ✨  0.0.58

- 新增自动保存间隔设置功能，可在设置对话框中选择30秒到60秒的自动保存间隔
- Added an auto-save interval setting feature; you can choose an auto-save interval from 30 to 60 seconds in the settings dialog.
- 优化了文件变更检测的实现方式，使用自定义间隔进行检测
- Optimized the implementation of file change detection, using a custom interval for detection.

## ✨ 0.0.57

### 🛠 界面优化
### 🛠 UI Optimization
- 禁止文件标签栏、下拉菜单和按钮文字被选择，提升用户体验
- Disabled text selection for file tab bar, dropdown menus, and button text to improve user experience.
- 优化对话框按钮样式，统一添加文字不可选中属性
- Optimized dialog button styles, uniformly adding the non-selectable text attribute.
- 改进更多操作按钮和下拉菜单项的交互体验
- Improved the interaction experience of the "More Actions" button and dropdown menu items.

## 🛠 0.0.56

### 🛠 界面优化
### 🛠 UI Optimization
- 统一了错误提示的显示方式，使用与设置对话框相同风格的自定义提示框
- Unified the display method of error prompts, using custom pop-ups with the same style as the settings dialog.
- 所有错误消息现在直接显示在插件视图中，而非VSCode的通知区域
- All error messages are now displayed directly in the plugin view instead of VSCode's notification area.
- 错误提示框支持键盘操作，按回车或ESC可快速关闭
- Error pop-ups support keyboard operations; press Enter or ESC to quickly close them.
- 优化了错误提示文案，使其更易于理解
- Optimized error prompt text to make it easier to understand.

## 0.0.55

### 🛠 功能改进
### 🛠 Feature Improvements
- 优化了文件编码错误的提示信息，使其更加友好和易于理解
- Optimized error messages for file encoding issues to be more friendly and easier to understand.
- 统一了所有错误提示的语言风格，减少技术术语的使用
- Unified the language style of all error prompts, reducing the use of technical jargon.
- 提供更多实用建议，帮助用户解决编码问题
- Provided more practical suggestions to help users solve encoding problems.

## 0.0.54

### 🛠 功能改进
### 🛠 Feature Improvements
- 加强文件编码检测逻辑，更准确识别GBK等非UTF-8编码文件
- Strengthened file encoding detection logic to more accurately identify non-UTF-8 encoded files such as GBK.
- 增加对Unicode替换字符的检测，防止导入包含乱码的文件
- Added detection for Unicode replacement characters to prevent importing files with garbled text.
- 使用更严格的UTF-8有效性验证算法，提高编码检测准确率
- Used a stricter UTF-8 validity verification algorithm to improve encoding detection accuracy.

## 0.0.53

### 🛠 功能改进
### 🛠 Feature Improvements
- 修复重命名对话框边框颜色与其他对话框不一致的问题
- Fixed the issue where the border color of the rename dialog was inconsistent with other dialogs.
- 添加文件编码检测功能，确保只能打开和导入UTF-8编码的文件
- Added a file encoding detection feature to ensure that only UTF-8 encoded files can be opened and imported.
- 对非UTF-8编码的文件会显示友好的错误提示，避免乱码问题
- Displayed friendly error prompts for non-UTF-8 encoded files to avoid garbled text issues.
- 优化了文件不存在时的错误提示，更清晰地指出文件可能已被移动或删除
- Optimized error prompts for when a file does not exist, more clearly indicating that the file may have been moved or deleted.

## 0.0.52

### 🛠 界面优化
### 🛠 UI Optimization
- 统一了所有对话框样式，包括标签重命名对话框、关闭确认对话框和设置对话框
- Unified all dialog styles, including the tab rename dialog, close confirmation dialog, and settings dialog.
- 所有确认按钮统一使用"确定"文本，并应用主按钮样式
- All confirm buttons uniformly use the text "确定" (Confirm) and apply the primary button style.
- 所有对话框使用相同的边框、背景和布局，提升了界面一致性
- All dialogs use the same border, background, and layout, improving interface consistency.
- 键盘快捷键提示文本统一格式和位置
- Unified the format and position of keyboard shortcut hint text.

## 0.0.51

### ✨ 界面优化
### ✨ UI Optimization
- 统一对话框风格：关闭确认对话框现在与设置弹窗保持一致的样式
- Unified dialog style: the close confirmation dialog now has the same style as the settings pop-up.
- 简化按钮文字："保存并应用"按钮简化为"确定"
- Simplified button text: the "Save and Apply" button is simplified to "确定" (Confirm).
- 添加主按钮样式：统一确认按钮的视觉风格，增强交互体验
- Added primary button style: unified the visual style of confirm buttons to enhance interaction experience.

## 0.0.50

### ✨ 功能增强 & 界面优化
### ✨ Feature Enhancement & UI Optimization
- 增加关闭标签前的确认对话框，防止意外关闭（支持Enter确认，Esc取消）
- Added a confirmation dialog before closing a tab to prevent accidental closure (supports Enter to confirm, Esc to cancel).
- 设置弹窗底部快捷键提示文字改为右对齐，保持与按钮相同的对齐方式
- Changed the shortcut key hint text at the bottom of the settings pop-up to be right-aligned, consistent with the button alignment.
- 自定义字体大小时，行号高度同步调整，保持文本与行号对齐
- When customizing font size, the line number height is adjusted synchronously to keep text aligned with line numbers.
- 改进加载自定义设置时对行号区域的样式同步，提升一致性
- Improved style synchronization for the line number area when loading custom settings, enhancing consistency.

## 0.0.49

### ✨ 界面优化
### ✨ UI Optimization
- 进一步优化下拉菜单宽度，去除多余右侧空白，使菜单更加紧凑
- Further optimized dropdown menu width, removing excess right-side whitespace to make the menu more compact.
- 减小菜单项内边距和图标间距，提供更精简的视觉体验
- Reduced padding of menu items and spacing between icons for a more streamlined visual experience.

## 0.0.48

### ✨ 界面优化
### ✨ UI Optimization
- 下拉菜单宽度现在会自适应内容，更加紧凑
- Dropdown menu width now adapts to content, making it more compact.
- 设置弹窗宽度减小25%，更加美观
- Reduced settings pop-up width by 25% for a more aesthetically pleasing look.
- 调整设置弹窗边框颜色为更暗的色调，减少视觉干扰
- Adjusted the settings pop-up border color to a darker shade to reduce visual interference.
- 为设置弹窗添加键盘快捷键支持：Enter确认，Esc取消
- Added keyboard shortcut support for the settings pop-up: Enter to confirm, Esc to cancel.

## 0.0.47

### 🐛 修复问题
### 🐛 Bug Fixes
- 修复了"更多操作"按钮没有正确右对齐的问题
- Fixed the issue where the "More Actions" button was not correctly right-aligned.
- 修复了下拉菜单可能超出窗口右侧边界的问题，优化了菜单位置计算逻辑
- Fixed the issue where the dropdown menu might extend beyond the right edge of the window, optimizing menu position calculation logic.

## 0.0.46

### 🐛 修复问题
### 🐛 Bug Fixes
- 修复了"更多操作"下拉菜单被文本区域遮挡的问题，调整了下拉菜单的定位方式和层级
- Fixed the issue where the "More Actions" dropdown menu was obscured by the text area, adjusting its positioning method and z-index.

## [0.0.45]

### ✨ 新功能 & 优化
### ✨ New Features & Optimizations

*   **更多操作菜单**：标签栏最右侧新增"更多操作"（⋮）下拉菜单，整合常用功能：
*   **More Actions Menu**: Added a "More Actions" (⋮) dropdown menu on the far right of the tab bar, integrating common functions:
    *   导入新文件 (+)
    *   Import new file (+)
    *   外部程序打开 (↗️)
    *   Open in external program (↗️)
    *   编辑器设置 (⚙️) - 可自定义字体、字号和文本颜色，设置将自动保存。
    *   Editor Settings (⚙️) - Customizable font, font size, and text color; settings are auto-saved.
*   **界面调整**：原独立的"导入"和"外部打开"按钮已移入新的"更多操作"菜单中，使标签栏更简洁。
*   **UI Adjustment**: The original separate "Import" and "Open Externally" buttons have been moved into the new "More Actions" menu, making the tab bar cleaner.

## [0.0.44]

### ✨ 新功能 & 优化
### ✨ New Features & Optimizations

*   **文件变更增强**：添加文件大小显示和变化跟踪 📊
*   **File Change Enhancement**: Added file size display and change tracking 📊
    *   在状态栏显示文件大小和变化信息
    *   Display file size and change information in the status bar.
    *   变更检测时显示详细的文件大小变化
    *   Display detailed file size changes during change detection.
    *   状态栏突出显示外部文件更新通知
    *   Highlight external file update notifications in the status bar.
    *   格式化显示，支持B、KB、MB等多种单位
    *   Formatted display, supporting units like B, KB, MB, etc.

## [0.0.43]

### ✨ 新功能 & 优化
### ✨ New Features & Optimizations

*   **标签拖动排序**：现在可以通过拖拽重新排列标签的顺序啦！🔄
*   **Tab Drag-and-Drop Sorting**: You can now reorder tabs by dragging and dropping! 🔄
    *   默认备忘录固定在第一位，不参与排序
    *   The default memo is fixed in the first position and does not participate in sorting.
    *   其他标签可自由拖动调整位置
    *   Other tabs can be freely dragged to adjust their positions.
    *   直观的视觉反馈，方便判断放置位置
    *   Intuitive visual feedback makes it easy to determine placement.
    *   所有更改会自动保存，重启VSCode后依然保持您的排序
    *   All changes are automatically saved and your sort order will be maintained after restarting VSCode.

## [0.0.42]

### ✨ 新功能 & 优化
### ✨ New Features & Optimizations

*   **多文件格式支持**：现在可以导入更多类型的文件啦！🎉
*   **Multi-file Format Support**: You can now import more types of files! 🎉
    *   支持 `.md`、`.js`、`.php`、`.html`、`.htm`、`.css`、`.json`、`.xml`、`.yaml`、`.yml` 等格式
    *   Supports formats like `.md`, `.js`, `.php`, `.html`, `.htm`, `.css`, `.json`, `.xml`, `.yaml`, `.yml`, etc.
    *   无论您是记录代码片段、编辑配置文件，还是撰写Markdown笔记，都能轻松完成
    *   Whether you're recording code snippets, editing configuration files, or writing Markdown notes, you can do it all with ease.

## [0.0.41]

### ✨ 新功能 & 优化
### ✨ New Features & Optimizations

*   **标签重命名**：双击任何标签即可打开重命名对话框，自定义展示名称（不影响实际文件名）！✏️
*   **Tab Renaming**: Double-click any tab to open the rename dialog and customize the display name (does not affect the actual filename)! ✏️
    *   可通过回车键（确认）和ESC键（取消）快速操作
    *   Quick operations via Enter key (confirm) and ESC key (cancel).
    *   友好的视觉反馈和交互体验
    *   Friendly visual feedback and interaction experience.

## [0.0.38]

### ✨ 新功能 & 优化
### ✨ New Features & Optimizations

*   **畅通无阻**：默认备忘录现在也可以通过"外部打开"按钮（↗️）在系统默认应用中打开啦！
*   **Unobstructed Access**: The default memo can now also be opened in the system's default application via the "Open Externally" button (↗️)!

## [0.0.36]

### ✨ 新功能 & 优化
### ✨ New Features & Optimizations

*   **全面检测**：默认备忘录现已支持外部文件变动检测！✍️↔️💻
*   **Comprehensive Detection**: The default memo now supports external file change detection! ✍️↔️💻

### 🐛 Bug 修复
### 🐛 Bug Fixes

*   修复了与 `activeId` 相关的一些内部变量名问题，增强了稳定性。
*   Fixed some internal variable name issues related to `activeId`, enhancing stability.

## [0.0.35]

### ✨ 新功能 & 优化
### ✨ New Features & Optimizations

*   **革命性同步**：引入了强大的双向自动同步机制！
*   **Revolutionary Sync**: Introduced a powerful bidirectional automatic synchronization mechanism!
    *   **自动保存**：在扩展中编辑后，10秒无操作即自动保存到TXT文件。
    *   **Auto-save**: After editing in the extension, it automatically saves to a TXT file after 10 seconds of inactivity.
    *   **外部变动检测**：若10秒内无编辑，则检查外部TXT文件是否有变动。如有，则自动加载新内容，并巧妙保持滚动位置！
    *   **External Change Detection**: If there is no editing within 10 seconds, it checks if the external TXT file has changed. If so, it automatically loads the new content and cleverly maintains the scroll position!
    *   **状态栏通知**：外部文件更新时，状态栏会有提示信息。
    *   **Status Bar Notification**: When an external file is updated, there will be a notification in the status bar.

## [0.0.27]

### ✨ 新功能 & 优化
### ✨ New Features & Optimizations

*   **视觉升级**：优化了标签页的悬停效果，移除了下划线，改为更清晰的背景色变化，提升了视觉体验。💅
*   **Visual Upgrade**: Optimized the hover effect of tabs, removed the underline, and changed to a clearer background color change, improving the visual experience. 💅

## [0.0.26]

### ✨ 新功能 & 优化
### ✨ New Features & Optimizations

*   **界面调整**：将"导入文件"的"+"按钮移至标签栏最右侧，操作更便捷。
*   **UI Adjustment**: Moved the "+" button for "Import File" to the far right of the tab bar for more convenient operation.




---

*早期版本可能未详细记录，敬请谅解。*
*Earlier versions may not have been fully documented, thank you for your understanding.*