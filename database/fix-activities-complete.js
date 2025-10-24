const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixActivitiesComplete() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('连接数据库成功');

        // 获取当前表结构
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activities'
        `);

        const existingColumns = new Set(columns.map(col => col.COLUMN_NAME));
        console.log('当前表字段:', Array.from(existingColumns));

        // 要添加的缺失字段（基于Activity模型的完整定义）
        const missingColumns = [
            {
                name: 'total_cost',
                sql: `ADD COLUMN \`total_cost\` DECIMAL(10,2) DEFAULT 0.00 COMMENT '活动总费用'`
            },
            {
                name: 'company_ratio',
                sql: `ADD COLUMN \`company_ratio\` DECIMAL(5,2) DEFAULT 0.00 COMMENT '公司承担比例(0-100)'`
            },
            {
                name: 'cost_per_person',
                sql: `ADD COLUMN \`cost_per_person\` DECIMAL(10,2) DEFAULT 0.00 COMMENT '每人应付费用'`
            },
            {
                name: 'payment_deadline',
                sql: `ADD COLUMN \`payment_deadline\` TIMESTAMP NULL COMMENT '支付截止时间'`
            },
            {
                name: 'company_budget',
                sql: `ADD COLUMN \`company_budget\` DECIMAL(10,2) NULL DEFAULT NULL COMMENT '公司预算上限'`
            },
            {
                name: 'auto_cancel_threshold',
                sql: `ADD COLUMN \`auto_cancel_threshold\` ENUM('min_participants', 'max_participants', 'both') NULL DEFAULT NULL COMMENT '自动取消条件'`
            },
            {
                name: 'activity_special_type',
                sql: `ADD COLUMN \`activity_special_type\` ENUM('dinner_party', 'team_building', 'company_event', 'normal') NULL DEFAULT 'normal' COMMENT '活动特殊类型'`
            },
            {
                name: 'enable_participant_limit',
                sql: `ADD COLUMN \`enable_participant_limit\` BOOLEAN DEFAULT TRUE NOT NULL COMMENT '是否开启人数限制'`
            },
            {
                name: 'min_participants',
                sql: `ADD COLUMN \`min_participants\` INT NULL DEFAULT 3 COMMENT '最少参与人数'`
            }
        ];

        // 添加缺失的字段
        for (const column of missingColumns) {
            if (!existingColumns.has(column.name)) {
                try {
                    console.log(`添加字段: ${column.name}`);
                    await connection.execute(`ALTER TABLE \`activities\` ${column.sql}`);
                    console.log(`✅ 成功添加字段: ${column.name}`);
                } catch (error) {
                    console.error(`❌ 添加字段失败 ${column.name}:`, error.message);
                }
            } else {
                console.log(`字段 ${column.name} 已存在，跳过`);
            }
        }

        // 验证最终表结构
        const [finalColumns] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activities'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n📋 最终activities表结构：');
        finalColumns.forEach(col => {
            console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE}) - ${col.COLUMN_COMMENT || '无注释'}`);
        });

        console.log(`\n✅ activities表结构修复完成，共 ${finalColumns.length} 个字段`);

    } catch (error) {
        console.error('修复过程中出错:', error);
    } finally {
        await connection.end();
    }
}

fixActivitiesComplete();