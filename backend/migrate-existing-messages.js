/**
 * 为现有消息创建用户状态记录
 * 这是一次性迁移脚本，用于将现有的消息系统迁移到新的用户个性化系统
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { Message, User, UserMessageState } = require('./src/models');

async function migrateExistingMessages() {
    try {
        console.log('🚀 开始迁移现有消息到用户状态系统...');

        // 连接数据库
        await sequelize.authenticate();
        console.log('✅ 数据库连接成功');

        // 获取所有消息
        const messages = await Message.findAll({
            order: [['created_at', 'ASC']]
        });

        console.log(`📊 找到 ${messages.length} 条现有消息`);

        // 获取所有活跃用户
        const users = await User.findAll({
            where: { status: 'active' }
        });

        console.log(`👥 找到 ${users.length} 个活跃用户`);

        let totalStatesCreated = 0;
        let processedMessages = 0;

        // 为每条消息创建用户状态
        for (const message of messages) {
            processedMessages++;

            // 确定哪些用户应该看到这条消息
            const targetUsers = [];

            // 全局消息 - 所有用户都能看到
            if (message.is_global) {
                targetUsers.push(...users);
            }
            // 直接发送给特定用户的消息
            else if (message.recipient_id) {
                const recipient = users.find(u => u.id === message.recipient_id);
                if (recipient) {
                    targetUsers.push(recipient);
                }
            }
            // 按角色发送的消息
            else if (message.recipient_role) {
                const roleUsers = users.filter(u => u.role === message.recipient_role);
                targetUsers.push(...roleUsers);
            }

            console.log(`📨 处理消息: ${message.title.substring(0, 50)}${message.title.length > 50 ? '...' : ''} (${targetUsers.length} 个用户)`);

            // 为每个目标用户创建状态记录
            for (const user of targetUsers) {
                try {
                    await UserMessageState.getOrCreateState(user.id, message.id);
                    totalStatesCreated++;

                    // 如果消息有已读标记，更新状态
                    if (message.is_read) {
                        const state = await UserMessageState.findByUserAndMessage(user.id, message.id);
                        if (state && !state.is_read) {
                            await state.markAsRead();
                        }
                    }
                } catch (error) {
                    console.error(`❌ 为用户 ${user.username} 创建消息状态失败:`, error.message);
                }
            }

            // 显示进度
            if (processedMessages % 10 === 0) {
                console.log(`📈 进度: ${processedMessages}/${messages.length} 条消息, ${totalStatesCreated} 个状态记录已创建`);
            }
        }

        console.log(`\n✅ 迁移完成！`);
        console.log(`📊 处理了 ${processedMessages} 条消息`);
        console.log(`👥 创建了 ${totalStatesCreated} 个用户状态记录`);
        console.log(`🎉 现在每个用户都有独立的消息池了！`);

    } catch (error) {
        console.error('❌ 迁移失败:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// 执行迁移
if (require.main === module) {
    migrateExistingMessages()
        .then(() => {
            console.log('🎉 消息系统迁移完成，请重启服务器以应用更改');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 迁移失败:', error);
            process.exit(1);
        });
}

module.exports = migrateExistingMessages;