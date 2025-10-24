const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function fixActivitiesTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('连接数据库成功');

        // 读取SQL文件
        const sqlFile = fs.readFileSync('fix-activities-table.sql', 'utf8');

        // 简单的SQL语句分割
        const statements = [];
        let currentStatement = '';
        const lines = sqlFile.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();

            // 跳过空行和注释行
            if (!trimmedLine || trimmedLine.startsWith('--') || trimmedLine.startsWith('/*')) {
                continue;
            }

            currentStatement += ' ' + trimmedLine;

            // 如果行以分号结尾，结束当前语句
            if (trimmedLine.endsWith(';')) {
                const statement = currentStatement.trim();
                if (statement) {
                    statements.push(statement.replace(/;\s*$/, ''));
                }
                currentStatement = '';
            }
        }

        console.log(`找到 ${statements.length} 条SQL语句`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            // 跳过注释和空行
            if (statement.startsWith('--') || statement === '' || statement.startsWith('/*')) {
                continue;
            }

            try {
                console.log(`执行语句 ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);

                if (statement.includes('SELECT') && statement.includes('FROM INFORMATION_SCHEMA')) {
                    const [rows] = await connection.execute(statement);
                    console.log('查询结果：', rows);
                } else {
                    const [result] = await connection.execute(statement);
                    console.log(`执行成功，影响行数: ${result.affectedRows || result.length || 0}`);
                }
            } catch (error) {
                if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_COLUMN_EXISTS') {
                    console.log('字段已存在，跳过');
                } else {
                    console.error(`执行语句失败: ${statement}`, error.message);
                }
            }
        }

        console.log('✅ activities表结构修复完成');

        // 验证表结构
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activities'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n📋 当前activities表结构：');
        columns.forEach(col => {
            console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE}) - ${col.COLUMN_COMMENT || '无注释'}`);
        });

    } catch (error) {
        console.error('修复过程中出错:', error);
    } finally {
        await connection.end();
    }
}

fixActivitiesTable();