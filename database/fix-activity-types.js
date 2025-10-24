const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixActivityTypes() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('连接数据库成功');

        // 修复空的type字段，设置为'other'
        const [result] = await connection.execute(`
            UPDATE activities
            SET type = 'other'
            WHERE type = '' OR type IS NULL
        `);

        console.log(`✅ 修复了 ${result.affectedRows} 个活动的type字段`);

        // 验证修复结果
        const [activities] = await connection.execute(`
            SELECT id, title, type
            FROM activities
            ORDER BY created_at
        `);

        console.log('\n📋 修复后的activities type字段：');
        activities.forEach(activity => {
            console.log(`  - ${activity.id}: ${activity.title} (类型: ${activity.type || '空'})`);
        });

        // 再次检查无效的type值
        const [types] = await connection.execute(`
            SELECT id FROM activity_types WHERE is_active = 1
        `);
        const validTypeIds = types.map(t => t.id);

        const invalidActivities = activities.filter(a => !validTypeIds.includes(a.type));

        if (invalidActivities.length === 0) {
            console.log('\n✅ 所有活动的type字段都有效');
        } else {
            console.log(`\n❌ 仍有 ${invalidActivities.length} 个活动的type字段无效`);
        }

    } catch (error) {
        console.error('修复过程中出错:', error);
    } finally {
        await connection.end();
    }
}

fixActivityTypes();