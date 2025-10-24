const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('连接数据库成功');

        // 获取所有表
        const [tables] = await connection.execute(`
            SHOW TABLES
        `);

        console.log('\n📋 数据库中的所有表：');
        tables.forEach(row => {
            console.log(`  - ${Object.values(row)[0]}`);
        });

        // 检查activities表数据
        const [activities] = await connection.execute(`
            SELECT COUNT(*) as count FROM activities
        `);
        console.log(`\n📊 activities表中数据量: ${activities[0].count} 条`);

        // 检查关联表
        const requiredTables = ['users', 'teams', 'activities', 'activity_types', 'activity_participants'];
        console.log('\n🔍 检查必要的表：');

        for (const table of requiredTables) {
            const [result] = await connection.execute(`
                SELECT COUNT(*) as count FROM information_schema.tables
                WHERE table_schema = DATABASE() AND table_name = ?
            `, [table]);

            if (result[0].count > 0) {
                console.log(`  ✅ ${table} - 存在`);
            } else {
                console.log(`  ❌ ${table} - 不存在`);
            }
        }

    } catch (error) {
        console.error('检查过程中出错:', error);
    } finally {
        await connection.end();
    }
}

checkTables();