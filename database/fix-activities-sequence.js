const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixActivitiesSequence() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('开始修复活动序列号...');

        // 获取所有活动，按创建时间排序
        const [activities] = await connection.execute('SELECT id, title, created_at FROM activities ORDER BY created_at ASC');

        console.log(`找到 ${activities.length} 个活动需要修复序列号`);

        let sequenceNumber = 1;
        let updatedCount = 0;

        for (const activity of activities) {
            try {
                await connection.execute(
                    'UPDATE activities SET sequence_number = ? WHERE id = ?',
                    [sequenceNumber, activity.id]
                );
                console.log(`✅ 更新活动 "${activity.title}" 序列号为: ${sequenceNumber}`);
                sequenceNumber++;
                updatedCount++;
            } catch (error) {
                console.error(`❌ 更新活动 "${activity.title}" 失败:`, error.message);
            }
        }

        console.log(`\n📊 修复完成统计:`);
        console.log(`  - 成功更新: ${updatedCount} 个活动`);
        console.log(`  - 序列号范围: 1 到 ${sequenceNumber - 1}`);

        // 验证修复结果
        const [updatedActivities] = await connection.execute('SELECT id, title, sequence_number FROM activities ORDER BY sequence_number ASC');
        console.log('\n👀 修复后的活动序列号:');
        updatedActivities.forEach(activity => {
            console.log(`  #${activity.sequence_number} - ${activity.title}`);
        });

    } catch (error) {
        console.error('修复活动序列号失败:', error);
    } finally {
        await connection.end();
    }
}

fixActivitiesSequence();