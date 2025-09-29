// 快速修复活动详情页面

console.log('开始修复活动详情页面...');

// 恢复原始JavaScript文件
const fs = require('fs');
const path = 'C:\\D\\re\\kirojianlu\\admin-frontend\\js\\activity-detail-page.js';

// 检查备份文件是否存在
const backupPath = 'C:\\D\\re\\kirojianlu\\admin-frontend\\js\\activity-detail-page.js.backup';
if (fs.existsSync(backupPath)) {
    console.log('发现备份文件，正在恢复...');
    fs.copyFileSync(backupPath, path);
    console.log('JavaScript文件已恢复');
} else {
    console.log('未找到备份文件，请手动恢复');
}

console.log('修复完成！请刷新浏览器页面。');