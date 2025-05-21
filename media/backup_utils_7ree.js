// 文件备份工具模块
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * 为文件创建备份
 * 备份文件命名规则：原主文件名_bak_自然时间字符串.原文件扩展名
 * @param {string} filePath 要备份的文件完整路径
 * @returns {Promise<object>} 备份结果，包含状态和消息
 */
async function backupFile_7ree(filePath) {
    return new Promise((resolve, reject) => {
        try {
            // 检查文件是否存在
            if (!fs.existsSync(filePath)) {
                return resolve({
                    success: false,
                    message: '无法备份：文件不存在'
                });
            }

            // 解析文件路径，获取目录、文件名、扩展名
            const dir = path.dirname(filePath);
            const ext = path.extname(filePath);
            const basename = path.basename(filePath, ext);
            
            // 生成自然时间字符串
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timeString = `${year}${month}${day}_${hours}${minutes}${seconds}`;
            
            // 创建备份文件名
            const backupFilename = `${basename}_bak_${timeString}${ext}`;
            const backupPath = path.join(dir, backupFilename);
            
            // 复制文件
            fs.copyFileSync(filePath, backupPath);
            
            // 检查备份是否成功
            if (fs.existsSync(backupPath)) {
                // 获取原文件和备份文件的大小，确保大小一致
                const originalSize = fs.statSync(filePath).size;
                const backupSize = fs.statSync(backupPath).size;
                
                if (originalSize === backupSize) {
                    const displayName = `bak_${timeString}${ext}`;
                    return resolve({
                        success: true,
                        message: `已备份 ${displayName}`,
                        backupPath: backupPath
                    });
                } else {
                    return resolve({
                        success: false,
                        message: '备份文件大小不匹配，备份可能不完整'
                    });
                }
            } else {
                return resolve({
                    success: false,
                    message: '备份文件创建失败'
                });
            }
        } catch (error) {
            // console.error('备份文件时出错:', error);
            return resolve({
                success: false,
                message: `备份失败：${error.message}`
            });
        }
    });
}

module.exports = {
    backupFile_7ree
};
