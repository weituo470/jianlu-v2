const mysql = require('mysql2/promise');
require('dotenv').config();

async function addCostDescription() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('连接数据库成功');

        // 添加cost_description字段
        await connection.execute(`
            ALTER TABLE activities
            ADD COLUMN cost_description TEXT NULL COMMENT '费用说明'
        `);

        console.log('✅ 成功添加cost_description字段');

        // 验证添加结果
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'activities'
              AND COLUMN_NAME = 'cost_description'
        `);

        if (columns.length > 0) {
            console.log('✅ cost_description字段验证成功');
            console.log(`  字段信息: ${columns[0].COLUMN_NAME} - ${columns[0].DATA_TYPE} - ${columns[0].COLUMN_COMMENT}`);
        } else {
            console.log('❌ cost_description字段验证失败');
        }

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ cost_description字段已存在');
        } else {
            console.error('添加字段失败:', error.message);
        }
    } finally {
        await connection.end();
    }
}

addCostDescription();