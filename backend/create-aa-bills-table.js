/**
 * 创建AA账单表的脚本
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function createAABillsTable() {
    try {
        console.log('🚀 开始创建AA账单表...');

        // 检查表是否已存在
        const [results] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
            AND table_name = 'aa_bills'
        `);

        if (results[0].count > 0) {
            console.log('✅ aa_bills表已存在，跳过创建');
            return;
        }

        // 创建表
        await sequelize.query(`
            CREATE TABLE aa_bills (
                id VARCHAR(36) PRIMARY KEY,
                activity_id VARCHAR(36) NOT NULL,
                creator_id VARCHAR(36) NOT NULL,
                total_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '分摊总金额（用户自定义或记账总额）',
                expense_total_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '记账总额（所有费用的总和）',
                base_total_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '基础分摊总额（默认计算的总金额）',
                use_custom_total_cost BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否使用了自定义总金额',
                custom_total_cost DECIMAL(10,2) NULL DEFAULT NULL COMMENT '用户自定义的总金额',
                participant_count INT NOT NULL DEFAULT 0 COMMENT '参与人数',
                total_ratio DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '总系数',
                average_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '平均金额',
                status ENUM('draft', 'saved', 'pushed') NOT NULL DEFAULT 'draft' COMMENT '账单状态',
                bill_details JSON NULL COMMENT '账单详情（参与者分摊明细）',
                pushed_at TIMESTAMP NULL DEFAULT NULL COMMENT '推送时间',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

                INDEX idx_aa_bills_activity_id (activity_id),
                INDEX idx_aa_bills_creator_id (creator_id),
                INDEX idx_aa_bills_status (status),
                INDEX idx_aa_bills_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AA分摊账单表'
        `);

        console.log('✅ aa_bills表创建成功');

    } catch (error) {
        console.error('❌ 创建aa_bills表失败:', error);
        throw error;
    }
}

// 执行迁移
if (require.main === module) {
    createAABillsTable()
        .then(() => {
            console.log('🎉 AA账单表迁移完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 迁移失败:', error);
            process.exit(1);
        });
}

module.exports = createAABillsTable;