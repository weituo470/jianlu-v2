const mysql = require('mysql2/promise');
require('dotenv').config();

async function createActivityExpensesTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('开始创建activity_expenses表...');

        // 创建表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS activity_expenses (
                id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
                activity_id VARCHAR(36) NOT NULL,
                item VARCHAR(200) NOT NULL COMMENT '费用事项',
                amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL COMMENT '金额',
                expense_date DATE NOT NULL COMMENT '费用发生日期',
                description TEXT NULL COMMENT '备注说明',
                payer VARCHAR(100) NULL COMMENT '付款人',
                image_path VARCHAR(500) NULL COMMENT '图片存档路径',
                recorder_id VARCHAR(36) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_activity_id (activity_id),
                INDEX idx_recorder_id (recorder_id),
                INDEX idx_expense_date (expense_date),
                FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
                FOREIGN KEY (recorder_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ activity_expenses表创建成功');

        // 检查表结构
        const [columns] = await connection.execute('DESCRIBE activity_expenses');
        console.log('表结构:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? '(' + col.Key + ')' : ''}`);
        });

        // 检查记录数
        const [count] = await connection.execute('SELECT COUNT(*) as count FROM activity_expenses');
        console.log(`✅ 表中有 ${count[0].count} 条记录`);

    } catch (error) {
        console.error('创建表失败:', error);
    } finally {
        await connection.end();
    }
}

createActivityExpensesTable();