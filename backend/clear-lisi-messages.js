const { sequelize } = require('./src/models');
const { UserMessageState, Message } = require('./src/models');

async function clearLisiMessages() {
    try {
        console.log('🗑️ 开始清空 lisi 的消息池...');

        // 获取lisi的用户ID
        const lisiUserId = 'c5e4f16f-aef1-11f0-ac44-10ffe0d4f0f1';
        console.log(`👤 目标用户ID: ${lisiUserId}`);

        // 查找lisi的所有消息状态记录
        const messageStates = await UserMessageState.findAll({
            where: { user_id: lisiUserId },
            include: [{
                model: Message,
                as: 'message'
            }]
        });

        console.log(`📋 找到 ${messageStates.length} 条消息状态记录`);

        // 删除所有消息状态记录
        const deletedStates = await UserMessageState.destroy({
            where: { user_id: lisiUserId }
        });

        console.log(`✅ 删除了 ${deletedStates} 条用户消息状态记录`);

        // 显示被删除的消息信息
        messageStates.forEach(state => {
            if (state.message) {
                console.log(`   📝 删除消息: ${state.message.title}`);
            }
        });

        console.log('🎉 lisi 的消息池已清空完成！');

    } catch (error) {
        console.error('❌ 操作失败:', error);
    } finally {
        if (sequelize) {
            await sequelize.close();
        }
    }
}

clearLisiMessages();