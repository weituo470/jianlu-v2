#!/usr/bin/env node

/**
 * 简庐项目回收站 - 命令行接口
 * 统一的回收站管理命令行工具
 */

const { spawn } = require('child_process');
const path = require('path');

class TrashCLI {
    constructor() {
        this.scriptsDir = path.resolve(__dirname, 'scripts');
    }

    /**
     * 执行脚本
     */
    runScript(scriptName, args = []) {
        const scriptPath = path.join(this.scriptsDir, scriptName);

        return new Promise((resolve, reject) => {
            const child = spawn('node', [scriptPath, ...args], {
                stdio: 'inherit',
                cwd: path.resolve(__dirname, '..')
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(code);
                } else {
                    reject(new Error(`脚本执行失败，退出码: ${code}`));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        console.log(`
🗂️  简庐项目回收站 - 命令行工具

快速命令:
  trash <文件路径>           # 删除文件到回收站
  trash-list                # 列出回收站内容
  trash-restore <ID>        # 恢复文件
  trash-clean <天数>        # 清理N天前的文件

详细命令:
  trash --help              # 删除文件帮助
  trash-list --help         # 列表查看帮助
  trash-restore --help      # 恢复文件帮助
  trash-clean --help        # 清理文件帮助

使用示例:
  trash *.log               # 删除所有日志文件
  trash backup-file.txt     # 删除备份文件
  trash-list                # 查看回收站内容
  trash-restore ID123       # 恢复文件
  trash-clean 30            # 清理30天前的文件

安全特性:
✅ 文件不会被永久删除
✅ 保留完整路径信息
✅ 支持文件完整性验证
✅ 记录详细的操作日志
✅ 支持批量操作

更多信息请查看: .jianlu-trash/README.md
        `);
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const cli = new TrashCLI();

    if (args.length === 0) {
        cli.showHelp();
        return;
    }

    const command = args[0];

    try {
        switch (command) {
            case 'trash':
                await cli.runScript('trash.js', args.slice(1));
                break;

            case 'trash-list':
                await cli.runScript('list.js', args.slice(1));
                break;

            case 'trash-restore':
                await cli.runScript('restore.js', args.slice(1));
                break;

            case 'trash-clean':
                await cli.runScript('clean.js', args.slice(1));
                break;

            case '--help':
            case 'help':
                cli.showHelp();
                break;

            default:
                console.error(`❌ 未知命令: ${command}`);
                console.log('💡 使用 --help 查看帮助信息');
                process.exit(1);
        }
    } catch (error) {
        console.error(`❌ 命令执行失败: ${error.message}`);
        process.exit(1);
    }
}

// 检查是否在正确的目录中运行
const currentDir = process.cwd();
const trashDir = path.join(currentDir, '.jianlu-trash');

if (!require('fs').existsSync(trashDir)) {
    console.error('❌ 未找到回收站目录');
    console.log('💡 请确保在项目根目录中运行此命令');
    process.exit(1);
}

// 运行主函数
main();