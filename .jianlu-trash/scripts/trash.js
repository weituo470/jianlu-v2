#!/usr/bin/env node

/**
 * 简庐项目回收站 - 文件删除脚本
 * 安全删除文件到回收站，而不是永久删除
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ProjectTrash {
    constructor() {
        this.trashDir = path.resolve(__dirname, '..');
        this.filesDir = path.join(this.trashDir, 'files');
        this.metadataDir = path.join(this.trashDir, 'metadata');
        this.logFile = path.join(this.trashDir, 'trash.log');

        this.ensureDirectories();
    }

    /**
     * 确保回收站目录存在
     */
    ensureDirectories() {
        [this.filesDir, this.metadataDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * 生成唯一的文件ID
     */
    generateId() {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '').replace('T', '_').slice(0, 15);
        const random = Math.random().toString(36).substr(2, 3);
        return `trash_${timestamp}_${random}`;
    }

    /**
     * 计算文件校验和
     */
    calculateChecksum(filePath) {
        try {
            const content = fs.readFileSync(filePath);
            return crypto.createHash('md5').update(content).digest('hex');
        } catch (error) {
            return null;
        }
    }

    /**
     * 获取文件统计信息
     */
    getFileStats(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return {
                size: stats.size,
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                modified: stats.mtime,
                created: stats.birthtime,
                permissions: stats.mode
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * 记录删除操作到日志
     */
    logDeletion(originalPath, trashPath, stats, id, fileType) {
        const timestamp = new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const logEntry = `${timestamp}|${originalPath}|${trashPath}|${stats.size}|${fileType}|${id}\n`;

        try {
            fs.appendFileSync(this.logFile, logEntry, 'utf8');
        } catch (error) {
            console.error('❌ 无法写入日志文件:', error.message);
        }
    }

    /**
     * 保存文件元数据
     */
    saveMetadata(id, originalPath, trashPath, stats, fileType) {
        const metadata = {
            id,
            originalPath: path.resolve(originalPath),
            trashPath,
            originalSize: stats.size,
            deletedAt: new Date().toISOString(),
            deletedBy: process.env.USER || 'system',
            fileType,
            checksum: fileType === 'FILE' ? this.calculateChecksum(originalPath) : null,
            permissions: stats.permissions.toString(8).slice(-3),
            originalModified: stats.modified.toISOString(),
            originalCreated: stats.created.toISOString()
        };

        const today = new Date().toISOString().split('T')[0];
        const metadataDir = path.join(this.metadataDir, today);

        if (!fs.existsSync(metadataDir)) {
            fs.mkdirSync(metadataDir, { recursive: true });
        }

        const metadataFile = path.join(metadataDir, `${path.basename(originalPath)}.json`);

        try {
            fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ 无法保存元数据:', error.message);
        }

        return metadata;
    }

    /**
     * 安全删除文件到回收站
     */
    async moveToTrash(filePath) {
        const originalPath = path.resolve(filePath);

        // 检查文件是否存在
        if (!fs.existsSync(originalPath)) {
            console.error(`❌ 文件不存在: ${originalPath}`);
            return false;
        }

        // 生成回收站路径
        const today = new Date().toISOString().split('T')[0];
        const todayDir = path.join(this.filesDir, today);

        if (!fs.existsSync(todayDir)) {
            fs.mkdirSync(todayDir, { recursive: true });
        }

        const id = this.generateId();
        const trashFileName = `${id}_${path.basename(originalPath)}`;
        const trashPath = path.join(todayDir, trashFileName);

        // 获取文件统计信息
        const stats = this.getFileStats(originalPath);
        if (!stats) {
            console.error(`❌ 无法读取文件信息: ${originalPath}`);
            return false;
        }

        const fileType = stats.isDirectory ? 'DIRECTORY' : 'FILE';

        try {
            // 移动文件到回收站
            if (stats.isDirectory) {
                this.moveDirectory(originalPath, trashPath);
            } else {
                fs.renameSync(originalPath, trashPath);
            }

            // 保存元数据
            const metadata = this.saveMetadata(id, originalPath, path.relative(this.trashDir, trashPath), stats, fileType);

            // 记录日志
            this.logDeletion(path.relative(process.cwd(), originalPath), path.relative(this.trashDir, trashPath), stats, id, fileType);

            console.log(`✅ 已移动到回收站: ${originalPath} -> ${trashPath}`);
            console.log(`📋 文件ID: ${id}`);
            console.log(`📁 类型: ${fileType === 'DIRECTORY' ? '目录' : '文件'}`);
            console.log(`📏 大小: ${stats.isDirectory ? '目录' : this.formatFileSize(stats.size)}`);

            return { success: true, id, metadata };

        } catch (error) {
            console.error(`❌ 移动文件失败: ${error.message}`);
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
     * 处理通配符路径
     */
    expandWildcards(pattern) {
        const { glob } = require('glob');
        try {
            return glob.sync(pattern, {
                cwd: process.cwd(),
                dot: false,
                absolute: true
            });
        } catch (error) {
            console.error('❌ 通配符展开失败:', error.message);
            return [];
        }
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
🗂️  简庐项目回收站 - 文件删除工具

用法:
  node trash.js <文件路径1> [文件路径2] [...]
  node trash.js "*.log"                 # 使用通配符
  node trash.js --help                  # 显示帮助信息

示例:
  node trash.js backup-file.txt
  node trash.js "*.tmp" "*.bak"
  node trash.js logs/ temp/

注意: 文件不会被永久删除，而是移动到回收站目录中
        `);
        return;
    }

    if (args[0] === '--help') {
        console.log(`
简庐项目回收站帮助信息

该工具提供安全的文件删除功能，文件会被移动到回收站而不是永久删除。

特性:
✅ 保留原始文件路径信息
✅ 记录完整的删除日志
✅ 支持文件和目录
✅ 支持通配符模式
✅ 计算文件校验和确保完整性
✅ 保存文件元数据信息

恢复文件:
  node restore.js --list          # 查看可恢复的文件
  node restore.js --id <文件ID>   # 恢复指定文件

更多信息请查看 README.md
        `);
        return;
    }

    const trash = new ProjectTrash();
    let successCount = 0;
    let totalCount = 0;

    console.log('🚀 开始移动文件到回收站...\n');

    for (const arg of args) {
        // 检查是否包含通配符
        if (arg.includes('*') || arg.includes('?')) {
            const expandedPaths = trash.expandWildcards(arg);

            if (expandedPaths.length === 0) {
                console.log(`⚠️  未找到匹配的文件: ${arg}`);
                continue;
            }

            console.log(`📂 通配符 "${arg}" 匹配到 ${expandedPaths.length} 个文件:`);

            for (const filePath of expandedPaths) {
                totalCount++;
                const result = await trash.moveToTrash(filePath);
                if (result) successCount++;
            }
        } else {
            totalCount++;
            const result = await trash.moveToTrash(arg);
            if (result) successCount++;
        }
    }

    console.log(`\n📊 操作完成: ${successCount}/${totalCount} 个文件成功移动到回收站`);

    if (successCount > 0) {
        console.log('\n💡 提示:');
        console.log('  - 使用 node list.js 查看回收站内容');
        console.log('  - 使用 node restore.js 恢复文件');
        console.log('  - 使用 node clean.js 永久清理回收站');
    }
}

// 检查是否安装了glob依赖
try {
    require('glob');
} catch (error) {
    console.log('⚠️  正在安装依赖包 glob...');
    const { execSync } = require('child_process');
    execSync('npm install glob', { stdio: 'inherit', cwd: path.resolve(__dirname, '../..') });
}

// 运行主函数
main().catch(error => {
    console.error('❌ 程序执行出错:', error.message);
    process.exit(1);
});