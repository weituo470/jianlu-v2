#!/usr/bin/env node

/**
 * 简庐项目回收站 - 内容查看脚本
 * 列出回收站中的文件和详细信息
 */

const fs = require('fs');
const path = require('path');

class ProjectTrashList {
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
     * 计算回收站总大小
     */
    calculateTotalSize() {
        let totalSize = 0;
        let fileCount = 0;
        let dirCount = 0;

        if (fs.existsSync(this.filesDir)) {
            const calculateDirSize = (dir) => {
                const files = fs.readdirSync(dir);

                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stats = fs.statSync(filePath);

                    if (stats.isDirectory()) {
                        dirCount++;
                        calculateDirSize(filePath);
                    } else {
                        fileCount++;
                        totalSize += stats.size;
                    }
                }
            };

            calculateDirSize(this.filesDir);
        }

        return { totalSize, fileCount, dirCount };
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
     * 列出所有文件
     */
    listAllFiles(verbose = false) {
        const trashLog = this.readTrashLog();

        if (trashLog.length === 0) {
            console.log('📭 回收站为空');
            return;
        }

        console.log('📋 回收站文件列表:\n');

        if (verbose) {
            console.log('ID\t\t\t\t类型\t大小\t\t删除时间\t\t原始路径\t\t\t\t\t元数据状态');
            console.log('─'.repeat(180));

            trashLog.forEach(entry => {
                const sizeStr = entry.fileType === 'DIRECTORY' ? '目录' : this.formatFileSize(entry.size);
                const shortPath = entry.originalPath.length > 40 ? '...' + entry.originalPath.slice(-37) : entry.originalPath;

                // 检查元数据状态
                const date = entry.timestamp.split(' ')[0].replace(/\//g, '-');
                const metadataPath = path.join(this.metadataDir, date, `${path.basename(entry.originalPath)}.json`);
                const metadataStatus = fs.existsSync(metadataPath) ? '✅' : '❌';

                console.log(`${entry.id}\t${entry.fileType}\t${sizeStr.padEnd(10)}\t${entry.timestamp}\t${shortPath.padEnd(40)}\t${metadataStatus}`);
            });
        } else {
            console.log('ID\t\t\t\t类型\t大小\t\t删除时间\t\t\t原始路径');
            console.log('─'.repeat(120));

            trashLog.forEach(entry => {
                const sizeStr = entry.fileType === 'DIRECTORY' ? '目录' : this.formatFileSize(entry.size);
                const shortPath = entry.originalPath.length > 50 ? '...' + entry.originalPath.slice(-47) : entry.originalPath;

                console.log(`${entry.id}\t${entry.fileType}\t${sizeStr.padEnd(10)}\t${entry.timestamp}\t${shortPath}`);
            });
        }

        // 显示统计信息
        const { totalSize, fileCount, dirCount } = this.calculateTotalSize();
        console.log(`\n📊 统计信息:`);
        console.log(`   文件总数: ${trashLog.length}`);
        console.log(`   文件数量: ${fileCount}`);
        console.log(`   目录数量: ${dirCount}`);
        console.log(`   总大小: ${this.formatFileSize(totalSize)}`);
    }

    /**
     * 按日期列出文件
     */
    listByDate(date, verbose = false) {
        const trashLog = this.readTrashLog();
        const filtered = trashLog.filter(entry => {
            const entryDate = entry.timestamp.split(' ')[0];
            return entryDate === date;
        });

        if (filtered.length === 0) {
            console.log(`📅 ${date} 没有删除的文件`);
            return;
        }

        console.log(`📅 ${date} 删除的文件 (${filtered.length} 个):\n`);

        if (verbose) {
            console.log('ID\t\t\t\t类型\t大小\t\t删除时间\t\t原始路径');
            console.log('─'.repeat(120));
        } else {
            console.log('ID\t\t\t\t类型\t大小\t\t原始路径');
            console.log('─'.repeat(100));
        }

        filtered.forEach(entry => {
            const sizeStr = entry.fileType === 'DIRECTORY' ? '目录' : this.formatFileSize(entry.size);
            const shortPath = entry.originalPath.length > 50 ? '...' + entry.originalPath.slice(-47) : entry.originalPath;

            if (verbose) {
                console.log(`${entry.id}\t${entry.fileType}\t${sizeStr.padEnd(10)}\t${entry.timestamp}\t${shortPath}`);
            } else {
                console.log(`${entry.id}\t${entry.fileType}\t${sizeStr.padEnd(10)}\t${shortPath}`);
            }
        });
    }

    /**
     * 按类型列出文件
     */
    listByType(type, verbose = false) {
        const trashLog = this.readTrashLog();
        const filtered = trashLog.filter(entry => entry.fileType.toUpperCase() === type.toUpperCase());

        if (filtered.length === 0) {
            console.log(`📁 类型为 ${type} 的文件不存在`);
            return;
        }

        console.log(`📁 类型为 ${type} 的文件 (${filtered.length} 个):\n`);

        if (verbose) {
            console.log('ID\t\t\t\t大小\t\t删除时间\t\t原始路径');
            console.log('─'.repeat(110));
        } else {
            console.log('ID\t\t\t\t大小\t\t原始路径');
            console.log('─'.repeat(90));
        }

        filtered.forEach(entry => {
            const sizeStr = entry.fileType === 'DIRECTORY' ? '目录' : this.formatFileSize(entry.size);
            const shortPath = entry.originalPath.length > 50 ? '...' + entry.originalPath.slice(-47) : entry.originalPath;

            if (verbose) {
                console.log(`${entry.id}\t${sizeStr.padEnd(10)}\t${entry.timestamp}\t${shortPath}`);
            } else {
                console.log(`${entry.id}\t${sizeStr.padEnd(10)}\t${shortPath}`);
            }
        });
    }

    /**
     * 显示文件详细信息
     */
    showFileDetails(id) {
        const trashLog = this.readTrashLog();
        const entry = trashLog.find(item => item.id === id);

        if (!entry) {
            console.error(`❌ 未找到文件ID: ${id}`);
            return;
        }

        // 查找元数据
        const date = entry.timestamp.split(' ')[0].replace(/\//g, '-');
        const metadataPath = path.join(this.metadataDir, date, `${path.basename(entry.originalPath)}.json`);

        console.log(`📄 文件详细信息: ${id}`);
        console.log('─'.repeat(80));

        console.log(`原始路径: ${entry.originalPath}`);
        console.log(`回收站路径: ${entry.trashPath}`);
        console.log(`文件类型: ${entry.fileType}`);
        console.log(`文件大小: ${this.formatFileSize(entry.size)}`);
        console.log(`删除时间: ${entry.timestamp}`);

        if (fs.existsSync(metadataPath)) {
            try {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                console.log(`删除者: ${metadata.deletedBy}`);
                console.log(`删除时间(ISO): ${metadata.deletedAt}`);
                console.log(`文件权限: ${metadata.permissions}`);

                if (metadata.checksum) {
                    console.log(`MD5校验和: ${metadata.checksum}`);
                }

                if (metadata.originalModified) {
                    console.log(`原始修改时间: ${new Date(metadata.originalModified).toLocaleString('zh-CN')}`);
                }

                if (metadata.originalCreated) {
                    console.log(`原始创建时间: ${new Date(metadata.originalCreated).toLocaleString('zh-CN')}`);
                }

                // 验证文件完整性
                const trashFilePath = path.join(this.trashDir, entry.trashPath);
                if (fs.existsSync(trashFilePath) && metadata.checksum) {
                    const crypto = require('crypto');
                    const content = fs.readFileSync(trashFilePath);
                    const actualChecksum = crypto.createHash('md5').update(content).digest('hex');
                    const isValid = actualChecksum === metadata.checksum;

                    console.log(`文件完整性: ${isValid ? '✅ 验证通过' : '❌ 验证失败'}`);
                    if (!isValid) {
                        console.log(`期望校验和: ${metadata.checksum}`);
                        console.log(`实际校验和: ${actualChecksum}`);
                    }
                }

            } catch (error) {
                console.log('⚠️  元数据文件损坏或无法读取');
            }
        } else {
            console.log('⚠️  元数据文件不存在');
        }

        // 检查回收站文件是否存在
        const trashFilePath = path.join(this.trashDir, entry.trashPath);
        const fileExists = fs.existsSync(trashFilePath);
        console.log(`文件状态: ${fileExists ? '✅ 存在' : '❌ 缺失'}`);
    }

    /**
     * 显示回收站统计信息
     */
    showStatistics() {
        const trashLog = this.readTrashLog();
        const { totalSize, fileCount, dirCount } = this.calculateTotalSize();

        if (trashLog.length === 0) {
            console.log('📭 回收站为空');
            return;
        }

        console.log('📊 回收站统计信息:');
        console.log('─'.repeat(50));

        console.log(`总项目数: ${trashLog.length}`);
        console.log(`文件数量: ${fileCount}`);
        console.log(`目录数量: ${dirCount}`);
        console.log(`总大小: ${this.formatFileSize(totalSize)}`);

        // 按日期统计
        const dateStats = {};
        trashLog.forEach(entry => {
            const date = entry.timestamp.split(' ')[0];
            if (!dateStats[date]) {
                dateStats[date] = { count: 0, size: 0 };
            }
            dateStats[date].count++;
            dateStats[date].size += entry.size;
        });

        console.log('\n📅 按日期统计:');
        Object.keys(dateStats).sort().forEach(date => {
            console.log(`${date}: ${dateStats[date].count} 项, ${this.formatFileSize(dateStats[date].size)}`);
        });

        // 按类型统计
        const typeStats = { FILE: { count: 0, size: 0 }, DIRECTORY: { count: 0, size: 0 } };
        trashLog.forEach(entry => {
            typeStats[entry.fileType].count++;
            typeStats[entry.fileType].size += entry.size;
        });

        console.log('\n📁 按类型统计:');
        console.log(`文件: ${typeStats.FILE.count} 个, ${this.formatFileSize(typeStats.FILE.size)}`);
        console.log(`目录: ${typeStats.DIRECTORY.count} 个`);

        // 最近删除的文件
        const recentFiles = trashLog.slice(-5).reverse();
        console.log('\n⏰ 最近删除的文件:');
        recentFiles.forEach(entry => {
            console.log(`${entry.timestamp}: ${path.basename(entry.originalPath)}`);
        });
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
📋 简庐项目回收站 - 内容查看工具

用法:
  node list.js                           # 列出所有文件
  node list.js --verbose                 # 详细信息
  node list.js --date YYYY-MM-DD         # 按日期查看
  node list.js --type FILE|DIRECTORY     # 按类型查看
  node list.js --id <文件ID>              # 查看文件详情
  node list.js --stats                   # 显示统计信息
  node list.js --help                    # 显示帮助信息

示例:
  node list.js
  node list.js --verbose
  node list.js --date 2024-10-24
  node list.js --type FILE
  node list.js --id trash_20241024_153045_001
  node list.js --stats
        `);
        return;
    }

    const lister = new ProjectTrashList();

    if (args[0] === '--help') {
        console.log(`
简庐项目回收站查看工具帮助信息

该工具提供多种方式查看回收站内容。

命令说明:
  --verbose           显示详细信息
  --date <日期>       查看指定日期的文件 (格式: YYYY-MM-DD)
  --type <类型>       按类型查看 (FILE 或 DIRECTORY)
  --id <ID>          查看特定文件的详细信息
  --stats            显示回收站统计信息
  --help             显示帮助信息

输出说明:
✅ 元数据状态良好
❌ 元数据文件缺失或损坏

更多信息请查看 README.md
        `);
        return;
    }

    const verbose = args.includes('--verbose');
    const cleanArgs = args.filter(arg => arg !== '--verbose');

    if (cleanArgs[0] === '--date' && cleanArgs[1]) {
        lister.listByDate(cleanArgs[1], verbose);
    } else if (cleanArgs[0] === '--type' && cleanArgs[1]) {
        lister.listByType(cleanArgs[1], verbose);
    } else if (cleanArgs[0] === '--id' && cleanArgs[1]) {
        lister.showFileDetails(cleanArgs[1]);
    } else if (cleanArgs[0] === '--stats') {
        lister.showStatistics();
    } else {
        lister.listAllFiles(verbose);
    }
}

// 运行主函数
main().catch(error => {
    console.error('❌ 程序执行出错:', error.message);
    process.exit(1);
});