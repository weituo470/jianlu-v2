/* 最后修改时间: 2025-01-17 14:30:00 */
// 查找序号为69的活动
const { Activity, ActivityParticipant, User } = require('./src/models');

// TODO: 函数较长(80+行)，考虑拆分为多个小函数提高可读性
async function findActivity69() {
    try {
        console.log('🔍 查找序号为69的活动...\n');

        // 查找序号为69的活动
        const activity = await Activity.findOne({
            where: { sequence_number: 69 },
            include: [
                {
                    model: require('./src/models').Team,
                    as: 'team',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                }
            ]
        });

        if (!activity) {
            console.log('❌ 没有找到序号为69的活动');
            
            // 查看所有活动的序号
            const allActivities = await Activity.findAll({
                attributes: ['id', 'title', 'sequence_number'],
                order: [['sequence_number', 'DESC']],
                limit: 10
            });
            
            console.log('\n📋 最近的活动序号:');
            allActivities.forEach(a => {
                console.log(`   序号 ${a.sequence_number || '无'}: ${a.title}`);
            });
            
            return;
        }

        console.log('✅ 找到序号69的活动:');
        console.log(`   ID: ${activity.id}`);
        console.log(`   标题: ${activity.title}`);
        console.log(`   团队: ${activity.team?.name || '无'}`);
        console.log(`   创建者: ${activity.creator?.username || '无'}`);
        console.log(`   状态: ${activity.status}`);

        // 查找参与者
        console.log('\n🔍 查找参与者...');
        const participants = await ActivityParticipant.findAll({
            where: { activity_id: activity.id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email']
                }
            ],
            order: [['registered_at', 'DESC']]
        });

        console.log(`✅ 找到 ${participants.length} 个参与者:`);
        
        if (participants.length === 0) {
            console.log('   暂无参与者');
        } else {
            // 按状态分组
            const pending = participants.filter(p => p.status === 'pending');
            const approved = participants.filter(p => p.status === 'approved');
            const rejected = participants.filter(p => p.status === 'rejected');

            console.log(`   - 待审核: ${pending.length} 人`);
            console.log(`   - 已批准: ${approved.length} 人`);
            console.log(`   - 已拒绝: ${rejected.length} 人`);

            console.log('\n📋 详细列表:');
            participants.forEach((p, index) => {
                console.log(`   ${index + 1}. ${p.user?.username || '未知用户'} - ${p.status} (${new Date(p.registered_at).toLocaleString()})`);
            });
        }

    } catch (error) {
        console.error('❌ 查找失败:', error);
    } finally {
        process.exit(0);
    }
}

findActivity69();