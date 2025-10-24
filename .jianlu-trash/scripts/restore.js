#!/usr/bin/env node

/**
 * 简庐项目回收站 - 文件恢复脚本
 * 从回收站恢复文件到原始位置或指定位置
 */

const fs = require('fs');
const path = require('path');

class ProjectRestore {
    constructor() {
        this.trashDir = path.resolve(__dirname, '..');
        this.filesDir = path.join(this.trashDir, 'files');
        this.metadataDir = path.join(this.trashDir, 'metadata');
        this.logFile = path.join(this.trashDir, 'trash.log');
    }

    /**
     * 读取回收站日志
     */
    readTrashLog() {
        try {
            if (!fs.existsSync(this.logFile)) {
                return [];
            }

            const content = fs.readFileSync(this.logFile, 'utf8');
            const lines = content.trim().split('\n');

            return lines.map(line => {
                const [timestamp, originalPath, trashPath, size, fileType, id] = line.split('|');
                return {
                    timestamp,
                    originalPath,
                    trashPath,
                    size: parseInt(size),
                    fileType,
                    id
                };
            }).filter(item => item.id); // 过滤掉空行
        } catch (error) {
            console.error('❌ 读取日志文件失败:', error.message);
            return [];
        }
    }

    /**
     * 根据ID查找文件元数据
     */
    findMetadataById(id) {
        const trashLog = this.readTrashLog();
        const logEntry = trashLog.find(entry => entry.id === id);

        if (!logEntry) {
            return null;
        }

        // 查找元数据文件
        const date = logEntry.timestamp.split(' ')[0].replace(/\//g, '-');
        const metadataDir = path.join(this.metadataDir, date);
        const metadataFiles = fs.readdirSync(metadataDir);

        for (const file of metadataFiles) {
            if (file.endsWith('.json')) {
                const metadataPath = path.join(metadataDir, file);
                try {
                    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    if (metadata.id === id) {
                        return { ...metadata, logEntry };
                    }
                } catch (error) {
                    // 忽略损坏的元数据文件
                }
            }
        }

        return null;
    }

    /**
     * 列出所有可恢复的文件
     */
    listRestoreableFiles() {
        const trashLog = this.readTrashLog();

        if (trashLog.length === 0) {
            console.log('📭 回收站为空');
            return;
        }

        console.log('📋 可恢复的文件列表:\n');
        console.log('ID\t\t\t\t类型\t大小\t\t删除时间\t\t\t原始路径');
        console.log('─'.repeat(120));

        trashLog.forEach(entry => {
            const sizeStr = entry.fileType === 'DIRECTORY' ? '目录' : this.formatFileSize(entry.size);
            const shortPath = entry.originalPath.length > 50 ? '...' + entry.originalPath.slice(-47) : entry.originalPath;

            console.log(`${entry.id}\t${entry.fileType}\t${sizeStr.padEnd(10)}\t${entry.timestamp}\t${shortPath}`);
        });

        console.log('\n💡 使用恢复命令:');
        console.log('  node restore.js --id <文件ID>');
        console.log('  node restore.js --id <文件ID> --to <目标路径>');
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 验证文件完整性
     */
    verifyFileIntegrity(filePath, expectedChecksum) {
        if (!expectedChecksum) {
            return true; // 如果没有校验和，跳过验证
        }

        const crypto = require('crypto');
        try {
            const content = fs.readFileSync(filePath);
            const actualChecksum = crypto.createHash('md5').update(content).digest('hex');
            return actualChecksum === expectedChecksum;
        } catch (error) {
            return false;
        }
    }

    /**
     * 确保目标目录存在
     */
    ensureDirectoryExists(filePath) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * 恢复文件
     */
    async restoreFile(id, targetPath = null) {
        console.log(`🔄 开始恢复文件: ${id}`);

        // 查找文件元数据
        const metadata = this.findMetadataById(id);
        if (!metadata) {
            console.error(`❌ 未找到文件ID: ${id}`);
            return false;
        }

        // 确定恢复路径
        const restorePath = targetPath || metadata.originalPath;
        const trashFilePath = path.join(this.trashDir, metadata.trashPath);

        // 检查回收站文件是否存在
        if (!fs.existsSync(trashFilePath)) {
            console.error(`❌ 回收站文件不存在: ${trashFilePath}`);
            return false;
        }

        // 检查目标路径是否已存在
        if (fs.existsSync(restorePath)) {
            console.error(`❌ 目标路径已存在: ${restorePath}`);
            console.log('💡 请使用 --to 参数指定其他恢复位置，或手动删除现有文件');
            return false;
        }

        try {
            // 确保目标目录存在
            this.ensureDirectoryExists(restorePath);

            // 移动文件
            if (metadata.fileType === 'DIRECTORY') {
                this.moveDirectory(trashFilePath, restorePath);
            } else {
                fs.renameSync(trashFilePath, restorePath);
            }

            // 验证文件完整性
            if (metadata.fileType === 'FILE' && metadata.checksum) {
                if (!this.verifyFileIntegrity(restorePath, metadata.checksum)) {
                    console.error('⚠️  警告: 文件完整性验证失败');
                } else {
                    console.log('✅ 文件完整性验证通过');
                }
            }

            // 恢复文件权限（如果可能）
            if (metadata.permissions) {
                try {
                    fs.chmodSync(restorePath, parseInt(metadata.permissions, 8));
                } catch (error) {
                    console.warn('⚠️  无法恢复文件权限');
                }
            }

            // 从日志中移除记录（可选）
            this.removeFromLog(id);

            console.log(`✅ 文件恢复成功:`);
            console.log(`   原始路径: ${metadata.originalPath}`);
            console.log(`   恢复到:   ${restorePath}`);
            console.log(`   文件大小: ${this.formatFileSize(metadata.originalSize)}`);
            console.log(`   删除时间: ${new Date(metadata.deletedAt).toLocaleString('zh-CN')}`);

            return true;

        } catch (error) {
            console.error(`❌ 恢复文件失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 递归移动目录
     */
    moveDirectory(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const files = fs.readdirSync(src);

        for (const file of files) {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);

            const stats = fs.statSync(srcPath);

            if (stats.isDirectory()) {
                this.moveDirectory(srcPath, destPath);
            } else {
                fs.renameSync(srcPath, destPath);
            }
        }

        // 删除空目录
        try {
            fs.rmdirSync(src);
        } catch (error) {
            // 目录不为空，忽略错误
        }
    }

    /**
     * 从日志中移除记录
     */
    removeFromLog(id) {
        try {
            const trashLog = this.readTrashLog();
            const filteredLog = trashLog.filter(entry => entry.id !== id);

            const logContent = filteredLog.map(entry => {
                return `${entry.timestamp}|${entry.originalPath}|${entry.trashPath}|${entry.size}|${entry.fileType}|${entry.id}`;
            }).join('\n');

            fs.writeFileSync(this.logFile, logContent, 'utf8');
        } catch (error) {
            console.warn('⚠️  无法更新日志文件');
        }
    }

    /**
     * 搜索文件
     */
    searchFiles(query) {
        const trashLog = this.readTrashLog();
        const results = trashLog.filter(entry =>
            entry.originalPath.toLowerCase().includes(query.toLowerCase()) ||
            entry.id.toLowerCase().includes(query.toLowerCase())
        );

        if (results.length === 0) {
            console.log(`🔍 未找到匹配的文件: ${query}`);
            return;
        }

        console.log(`🔍 搜索结果 (${results.length} 个文件):\n`);
        console.log('ID\t\t\t\t类型\t大小\t\t删除时间\t\t\t原始路径');
        console.log('─'.repeat(120));

        results.forEach(entry => {
            const sizeStr = entry.fileType === 'DIRECTORY' ? '目录' : this.formatFileSize(entry.size);
            const shortPath = entry.originalPath.length > 50 ? '...' + entry.originalPath.slice(-47) : entry.originalPath;

            console.log(`${entry.id}\t${entry.fileType}\t${sizeStr.padEnd(10)}\t${entry.timestamp}\t${shortPath}`);
        });
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
🔄 简庐项目回收站 - 文件恢复工具

用法:
  node restore.js --list                    # 列出所有可恢复的文件
  node restore.js --id <文件ID>            # 恢复指定文件到原始位置
  node restore.js --id <文件ID> --to <路径> # 恢复到指定位置
  node restore.js --search <关键词>        # 搜索文件
  node restore.js --help                   # 显示帮助信息

示例:
  node restore.js --list
  node restore.js --id trash_20241024_153045_001
  node restore.js --id trash_20241024_153045_001 --to ./backup/
  node restore.js --search "activities-manager"
        `);
        return;
    }

    const restore = new ProjectRestore();

    if (args[0] === '--help') {
        console.log(`
简庐项目回收站恢复工具帮助信息

该工具可以从回收站恢复文件到原始位置或指定位置。

命令说明:
  --list        列出所有可恢复的文件
  --id <ID>     根据文件ID恢复文件
  --to <路径>   指定恢复位置（与--id一起使用）
  --search <词> 搜索包含关键词的文件
  --help        显示帮助信息

注意事项:
✅ 恢复时会验证文件完整性
✅ 保持原始文件权限
✅ 支持文件和目录恢复
✅ 恢复后自动清理回收站记录

更多信息请查看 README.md
        `);
        return;
    }

    if (args[0] === '--list') {
        restore.listRestoreableFiles();
        return;
    }

    if (args[0] === '--search' && args[1]) {
        restore.searchFiles(args[1]);
        return;
    }

    if (args[0] === '--id') {
        const id = args[1];
        const toIndex = args.indexOf('--to');
        const targetPath = toIndex > -1 ? args[toIndex + 1] : null;

        if (!id) {
            console.error('❌ 请提供文件ID');
            console.log('💡 使用 --list 查看可恢复的文件列表');
            return;
        }

        const success = await restore.restoreFile(id, targetPath);
        process.exit(success ? 0 : 1);
    }

    console.error('❌ 无效的命令参数');
    console.log('💡 使用 --help 查看帮助信息');
    process.exit(1);
}

// 运行主函数
main().catch(error => {
    console.error('❌ 程序执行出错:', error.message);
    process.exit(1);
});