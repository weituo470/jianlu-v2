/**
 * 清空指定用户的所有消息
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { Message } = require('./src/models');

async function clearUserMessages(username, userId = null) {
    try {
        console.log(`🚀 开始清空用户 ${username} 的所有消息...`);

        // 连接数据库
        await sequelize.authenticate();
        console.log('✅ 数据库连接成功');

        let user;

        // 如果没有提供userId，根据用户名查找
        if (!userId) {
            const { User } = require('./src/models');
            user = await User.findOne({
                where: { username: username }
            });

            if (!user) {
                console.error(`❌ 用户 ${username} 不存在`);
                return;
            }
            userId = user.id;
            console.log(`📝 找到用户: ${username} (ID: ${userId})`);
        }

        // 查找该用户的所有消息
        const messages = await Message.findAll({
            where: {
                recipient_id: userId
            }
        });

        console.log(`📊 找到 ${messages.length} 条消息`);

        if (messages.length === 0) {
            console.log('✅ 该用户没有消息，无需清空');
            return;
        }

        // 删除所有消息
        const result = await Message.destroy({
            where: {
                recipient_id: userId
            }
        });

        console.log(`✅ 成功删除 ${result} 条消息`);
        console.log(`🎉 用户 ${username} 的消息已全部清空`);

    } catch (error) {
        console.error('❌ 清空消息失败:', error);
    } finally {
        await sequelize.close();
    }
}

// 如果是通过命令行运行
if (require.main === module) {
    const username = process.argv[2];

    if (!username) {
        console.log('使用方法: node clear-user-messages.js <username>');
        console.log('例如: node clear-user-messages.js lisi');
        process.exit(1);
    }

    clearUserMessages(username);
}

module.exports = clearUserMessages;