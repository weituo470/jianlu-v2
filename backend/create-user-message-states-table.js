/**
 * 创建用户消息状态表
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function createUserMessageStatesTable() {
    try {
        console.log('🚀 开始创建用户消息状态表...');

        // 检查表是否已存在
        const [results] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
            AND table_name = 'user_message_states'
        `);

        if (results[0].count > 0) {
            console.log('✅ user_message_states表已存在，跳过创建');
            return;
        }

        // 创建表
        await sequelize.query(`
            CREATE TABLE user_message_states (
                id VARCHAR(36) PRIMARY KEY COMMENT '状态记录ID',
                user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
                message_id VARCHAR(36) NOT NULL COMMENT '消息ID',
                is_read BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已读',
                is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已删除',
                is_hidden BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已隐藏',
                read_at TIMESTAMP NULL DEFAULT NULL COMMENT '阅读时间',
                deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
                hidden_at TIMESTAMP NULL DEFAULT NULL COMMENT '隐藏时间',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

                INDEX idx_user_message_states_user_id (user_id),
                INDEX idx_user_message_states_message_id (message_id),
                INDEX idx_user_message_states_is_deleted (is_deleted),
                INDEX idx_user_message_states_is_hidden (is_hidden),
                INDEX idx_user_message_states_is_read (is_read),

                UNIQUE KEY uk_user_message_states_user_message (user_id, message_id),

                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户消息状态表'
        `);

        console.log('✅ user_message_states表创建成功');

    } catch (error) {
        console.error('❌ 创建user_message_states表失败:', error);
        throw error;
    }
}

// 执行迁移
if (require.main === module) {
    createUserMessageStatesTable()
        .then(() => {
            console.log('🎉 用户消息状态表迁移完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 迁移失败:', error);
            process.exit(1);
        });
}

module.exports = createUserMessageStatesTable;