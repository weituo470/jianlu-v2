const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkActivityExpensesTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('检查activity_expenses表结构...');

        const [columns] = await connection.execute('DESCRIBE activity_expenses');
        console.log('当前表结构:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `(Default: ${col.Default})` : ''}`);
        });

        // 检查是否有created_at字段
        const hasCreatedAt = columns.some(col => col.Field === 'created_at');
        const hasUpdatedAt = columns.some(col => col.Field === 'updated_at');

        console.log(`\n时间戳字段:`);
        console.log(`  - created_at: ${hasCreatedAt ? '✅ 存在' : '❌ 缺失'}`);
        console.log(`  - updated_at: ${hasUpdatedAt ? '✅ 存在' : '❌ 缺失'}`);

        // 查看现有记录
        const [records] = await connection.execute('SELECT * FROM activity_expenses LIMIT 1');
        if (records.length > 0) {
            console.log('\n示例记录:');
            console.log(JSON.stringify(records[0], null, 2));
        }

    } catch (error) {
        console.error('检查表结构失败:', error);
    } finally {
        await connection.end();
    }
}

checkActivityExpensesTable();