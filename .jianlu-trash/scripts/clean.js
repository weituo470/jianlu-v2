#!/usr/bin/env node

/**
 * 简庐项目回收站 - 永久清理脚本
 * 永久删除回收站中的文件（谨慎使用）
 */

const fs = require('fs');
const path = require('path');

class ProjectTrashClean {
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
            }).filter(item => item.id);
        } catch (error) {
            console.error('❌ 读取日志文件失败:', error.message);
            return [];
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
     * 计算日期的天数差
     */
    daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.floor((date2 - date1) / oneDay);
    }

    /**
     * 删除文件或目录
     */
    deletePath(filePath) {
        try {
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                this.deleteDirectory(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
            return true;
        } catch (error) {
            console.error(`❌ 删除失败: ${filePath} - ${error.message}`);
            return false;
        }
    }

    /**
     * 递归删除目录
     */
    deleteDirectory(dirPath) {
        try {
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);

                for (const file of files) {
                    const filePath = path.join(dirPath, file);
                    this.deletePath(filePath);
                }

                fs.rmdirSync(dirPath);
            }
        } catch (error) {
            console.error(`❌ 删除目录失败: ${dirPath} - ${error.message}`);
        }
    }

    /**
     * 清理超过指定天数的文件
     */
    cleanByDays(days) {
        const trashLog = this.readTrashLog();
        const now = new Date();
        let cleanedCount = 0;
        let cleanedSize = 0;

        const entriesToClean = trashLog.filter(entry => {
            const entryDate = new Date(entry.timestamp.replace(/\//g, '-'));
            const daysOld = this.daysBetween(entryDate, now);
            return daysOld > days;
        });

        if (entriesToClean.length === 0) {
            console.log(`📭 没有超过 ${days} 天的文件需要清理`);
            return;
        }

        console.log(`🗑️  开始清理超过 ${days} 天的文件 (${entriesToClean.length} 个):`);

        for (const entry of entriesToClean) {
            const trashFilePath = path.join(this.trashDir, entry.trashPath);
            const metadataDate = entry.timestamp.split(' ')[0].replace(/\//g, '-');
            const metadataPath = path.join(this.metadataDir, metadataDate, `${path.basename(entry.originalPath)}.json`);

            // 删除文件
            if (this.deletePath(trashFilePath)) {
                cleanedCount++;
                cleanedSize += entry.size;
                console.log(`✅ 已删除: ${entry.originalPath}`);
            }

            // 删除元数据
            this.deletePath(metadataPath);
        }

        // 更新日志
        this.updateLog(trashLog, entriesToClean);

        console.log(`\n📊 清理完成:`);
        console.log(`   删除文件数: ${cleanedCount}`);
        console.log(`   释放空间: ${this.formatFileSize(cleanedSize)}`);

        // 清理空目录
        this.cleanEmptyDirectories();
    }

    /**
     * 清理指定日期的文件
     */
    cleanByDate(date) {
        const trashLog = this.readTrashLog();
        const entriesToClean = trashLog.filter(entry => {
            const entryDate = entry.timestamp.split(' ')[0];
            return entryDate === date;
        });

        if (entriesToClean.length === 0) {
            console.log(`📅 ${date} 没有文件需要清理`);
            return;
        }

        console.log(`🗑️  开始清理 ${date} 的文件 (${entriesToClean.length} 个):`);

        let cleanedCount = 0;
        let cleanedSize = 0;

        for (const entry of entriesToClean) {
            const trashFilePath = path.join(this.trashDir, entry.trashPath);
            const metadataPath = path.join(this.metadataDir, date, `${path.basename(entry.originalPath)}.json`);

            if (this.deletePath(trashFilePath)) {
                cleanedCount++;
                cleanedSize += entry.size;
                console.log(`✅ 已删除: ${entry.originalPath}`);
            }

            this.deletePath(metadataPath);
        }

        // 更新日志
        this.updateLog(trashLog, entriesToClean);

        console.log(`\n📊 清理完成:`);
        console.log(`   删除文件数: ${cleanedCount}`);
        console.log(`   释放空间: ${this.formatFileSize(cleanedSize)}`);

        // 清理空目录
        this.cleanEmptyDirectories();
    }

    /**
     * 清空整个回收站
     */
    cleanAll() {
        console.log('⚠️  警告: 即将永久删除回收站中的所有文件！');
        console.log('🚨 此操作不可恢复，请确认您真的要执行此操作。');

        // 要求用户确认
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('请输入 "YES" 确认永久删除所有文件: ', (answer) => {
            rl.close();

            if (answer !== 'YES') {
                console.log('❌ 操作已取消');
                return;
            }

            console.log('\n🗑️  开始清空回收站...');

            // 删除所有文件
            this.deleteDirectory(this.filesDir);
            this.deleteDirectory(this.metadataDir);

            // 清空日志
            try {
                fs.writeFileSync(this.logFile, '', 'utf8');
            } catch (error) {
                console.error('❌ 清空日志失败:', error.message);
            }

            // 重新创建目录
            fs.mkdirSync(this.filesDir, { recursive: true });
            fs.mkdirSync(this.metadataDir, { recursive: true });

            console.log('✅ 回收站已清空');
        });
    }

    /**
     * 更新日志文件
     */
    updateLog(trashLog, removedEntries) {
        const removedIds = new Set(removedEntries.map(entry => entry.id));
        const remainingEntries = trashLog.filter(entry => !removedIds.has(entry.id));

        const logContent = remainingEntries.map(entry => {
            return `${entry.timestamp}|${entry.originalPath}|${entry.trashPath}|${entry.size}|${entry.fileType}|${entry.id}`;
        }).join('\n');

        try {
            fs.writeFileSync(this.logFile, logContent, 'utf8');
        } catch (error) {
            console.error('❌ 更新日志失败:', error.message);
        }
    }

    /**
     * 清理空目录
     */
    cleanEmptyDirectories() {
        const cleanEmptyDir = (dir) => {
            if (!fs.existsSync(dir)) return;

            const files = fs.readdirSync(dir);
            let hasContent = false;

            for (const file of files) {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);

                if (stats.isDirectory()) {
                    cleanEmptyDir(filePath);
                    if (fs.existsSync(filePath)) {
                        hasContent = true;
                    }
                } else {
                    hasContent = true;
                }
            }

            // 如果目录为空，删除它
            if (!hasContent && dir !== this.filesDir && dir !== this.metadataDir) {
                try {
                    fs.rmdirSync(dir);
                } catch (error) {
                    // 忽略删除错误
                }
            }
        };

        cleanEmptyDir(this.filesDir);
        cleanEmptyDir(this.metadataDir);
    }

    /**
     * 显示清理预览
     */
    showCleanPreview(days) {
        const trashLog = this.readTrashLog();
        const now = new Date();
        let totalCount = 0;
        let totalSize = 0;

        const entriesToClean = trashLog.filter(entry => {
            const entryDate = new Date(entry.timestamp.replace(/\//g, '-'));
            const daysOld = this.daysBetween(entryDate, now);
            return daysOld > days;
        });

        if (entriesToClean.length === 0) {
            console.log(`📭 没有超过 ${days} 天的文件需要清理`);
            return;
        }

        entriesToClean.forEach(entry => {
            totalCount++;
            totalSize += entry.size;
        });

        console.log(`📋 清理预览 - 超过 ${days} 天的文件:`);
        console.log(`   文件数量: ${totalCount}`);
        console.log(`   总大小: ${this.formatFileSize(totalSize)}`);
        console.log(`   占用空间: ${this.formatFileSize(totalSize)}`);

        console.log('\n文件列表:');
        console.log('ID\t\t\t\t类型\t大小\t\t删除时间\t\t原始路径');
        console.log('─'.repeat(120));

        entriesToClean.slice(0, 10).forEach(entry => {
            const sizeStr = entry.fileType === 'DIRECTORY' ? '目录' : this.formatFileSize(entry.size);
            const shortPath = entry.originalPath.length > 40 ? '...' + entry.originalPath.slice(-37) : entry.originalPath;

            console.log(`${entry.id}\t${entry.fileType}\t${sizeStr.padEnd(10)}\t${entry.timestamp}\t${shortPath}`);
        });

        if (entriesToClean.length > 10) {
            console.log(`... 还有 ${entriesToClean.length - 10} 个文件未显示`);
        }

        console.log('\n💡 执行清理命令: node clean.js --days ' + days);
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
🗑️  简庐项目回收站 - 永久清理工具

⚠️  警告: 此操作将永久删除文件，无法恢复！

用法:
  node clean.js --days <天数>           # 清理超过指定天数的文件
  node clean.js --date YYYY-MM-DD       # 清理指定日期的文件
  node clean.js --all                   # 清空整个回收站（需要确认）
  node clean.js --preview <天数>        # 预览要清理的文件
  node clean.js --help                  # 显示帮助信息

示例:
  node clean.js --days 30               # 清理30天前的文件
  node clean.js --date 2024-10-24       # 清理指定日期的文件
  node clean.js --preview 30            # 预览30天前的文件
  node clean.js --all                   # 清空回收站

建议:
✅ 先使用 --preview 查看要清理的文件
✅ 定期清理30天以上的文件
✅ 重要文件请提前恢复
        `);
        return;
    }

    const cleaner = new ProjectTrashClean();

    if (args[0] === '--help') {
        console.log(`
简庐项目回收站清理工具帮助信息

⚠️  重要提醒:
此工具将永久删除回收站中的文件，操作不可恢复！

清理策略建议:
🟢 日常维护: 清理90天以上的文件
🟡 定期清理: 清理30-90天的文件
🔴 紧急清理: 清空整个回收站

命令说明:
  --days <天数>        清理超过指定天数的文件
  --date <日期>        清理指定日期的文件 (格式: YYYY-MM-DD)
  --all               清空整个回收站 (需要输入 "YES" 确认)
  --preview <天数>    预览要清理的文件，不执行实际删除
  --help              显示帮助信息

安全建议:
1. 使用 --preview 先查看要清理的文件
2. 重要文件请先使用 restore.js 恢复
3. 建议保留最近30天的文件以备需要
4. 定期备份重要的项目文件

自动化建议:
可以设置定时任务定期执行清理:
  # 每周清理30天前的文件
  0 2 * * 0 cd /path/to/project && node .jianlu-trash/scripts/clean.js --days 30
        `);
        return;
    }

    if (args[0] === '--days' && args[1]) {
        const days = parseInt(args[1]);
        if (isNaN(days) || days < 0) {
            console.error('❌ 请提供有效的天数');
            return;
        }
        cleaner.cleanByDays(days);
    } else if (args[0] === '--date' && args[1]) {
        const date = args[1];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            console.error('❌ 日期格式不正确，请使用 YYYY-MM-DD 格式');
            return;
        }
        cleaner.cleanByDate(date);
    } else if (args[0] === '--all') {
        cleaner.cleanAll();
    } else if (args[0] === '--preview' && args[1]) {
        const days = parseInt(args[1]);
        if (isNaN(days) || days < 0) {
            console.error('❌ 请提供有效的天数');
            return;
        }
        cleaner.showCleanPreview(days);
    } else {
        console.error('❌ 无效的命令参数');
        console.log('💡 使用 --help 查看帮助信息');
        process.exit(1);
    }
}

// 运行主函数
main().catch(error => {
    console.error('❌ 程序执行出错:', error.message);
    process.exit(1);
});