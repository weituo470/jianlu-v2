/**
 * 为指定用户隐藏消息的临时解决方案
 * 通过创建用户消息状态记录来模拟"删除"功能
 * 不影响其他用户看到这些消息
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { Message, User } = require('./src/models');

async function hideMessagesForUser(username, options = {}) {
    try {
        console.log(`🎭 为用户 ${username} 隐藏消息...`);

        // 连接数据库
        await sequelize.authenticate();
        console.log('✅ 数据库连接成功');

        // 查找用户
        const user = await User.findOne({
            where: { username: username }
        });

        if (!user) {
            console.error(`❌ 用户 ${username} 不存在`);
            return;
        }

        console.log(`📝 用户信息: ${username} (ID: ${user.id})`);

        // 查找该用户可见的所有消息
        const visibleMessages = await Message.findAll({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { recipient_id: user.id },
                    { is_global: true },
                    { recipient_role: user.role },
                    {
                        recipient_id: null,
                        is_global: false
                    }
                ]
            },
            order: [['created_at', 'DESC']]
        });

        console.log(`📊 找到 ${visibleMessages.length} 条可见消息`);

        if (visibleMessages.length === 0) {
            console.log('✅ 该用户没有可见消息');
            return;
        }

        // 创建一个临时表来存储用户消息状态（如果不存在的话）
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS user_message_states (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                message_id VARCHAR(36) NOT NULL,
                is_deleted BOOLEAN DEFAULT FALSE,
                is_hidden BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP NULL,
                hidden_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uk_user_message (user_id, message_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        let hiddenCount = 0;

        // 为每条消息创建"已隐藏"状态
        for (const message of visibleMessages) {
            const stateId = require('uuid').v4();

            try {
                await sequelize.query(`
                    INSERT INTO user_message_states (id, user_id, message_id, is_hidden, hidden_at)
                    VALUES (:stateId, :userId, :messageId, TRUE, NOW())
                    ON DUPLICATE KEY UPDATE
                    is_hidden = TRUE,
                    hidden_at = NOW()
                `, {
                    replacements: {
                        stateId,
                        userId: user.id,
                        messageId: message.id
                    }
                });

                hiddenCount++;
                console.log(`🙈 已隐藏消息: ${message.title.substring(0, 30)}${message.title.length > 30 ? '...' : ''}`);
            } catch (error) {
                console.error(`❌ 隐藏消息失败: ${message.id} - ${error.message}`);
            }
        }

        console.log(`\n🎉 成功为用户 ${username} 隐藏了 ${hiddenCount} 条消息`);
        console.log(`💡 注意: 这只是临时解决方案，其他用户仍然可以看到这些消息`);

    } catch (error) {
        console.error('❌ 隐藏消息失败:', error);
    } finally {
        await sequelize.close();
    }
}

// 如果是通过命令行运行
if (require.main === module) {
    const username = process.argv[2];

    if (!username) {
        console.log('使用方法: node hide-messages-for-user.js <username>');
        console.log('例如: node hide-messages-for-user.js lisi');
        process.exit(1);
    }

    hideMessagesForUser(username);
}

module.exports = hideMessagesForUser;