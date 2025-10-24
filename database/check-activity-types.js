const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkActivityTypes() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('连接数据库成功');

        // 检查activity_types表数据
        const [types] = await connection.execute(`
            SELECT id, name, description, is_default, sort_order, is_active
            FROM activity_types
            ORDER BY sort_order, created_at
        `);

        console.log('\n📋 activity_types表数据：');
        types.forEach(type => {
            console.log(`  - ${type.id}: ${type.name} (默认: ${type.is_default}, 活跃: ${type.is_active})`);
        });

        // 检查activities表中的type字段数据
        const [activities] = await connection.execute(`
            SELECT id, title, type
            FROM activities
            ORDER BY created_at
        `);

        console.log('\n📋 activities表中的type字段：');
        activities.forEach(activity => {
            console.log(`  - ${activity.id}: ${activity.title} (类型: ${activity.type})`);
        });

        // 检查是否存在不匹配的type值
        const activityTypeIds = types.map(t => t.id);
        const activityTypes = activities.map(a => a.type);
        const invalidTypes = activityTypes.filter(type => !activityTypeIds.includes(type));

        if (invalidTypes.length > 0) {
            console.log('\n❌ 发现无效的type值：');
            invalidTypes.forEach(type => {
                console.log(`  - ${type}`);
            });
        } else {
            console.log('\n✅ 所有activities的type值都有效');
        }

    } catch (error) {
        console.error('检查过程中出错:', error);
    } finally {
        await connection.end();
    }
}

checkActivityTypes();