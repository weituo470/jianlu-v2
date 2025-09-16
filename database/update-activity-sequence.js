// 更新现有活动的序号脚本
require('dotenv').config({ path: './.env' }); // 加载环境变量
const { sequelize } = require('../backend/src/config/database');
const { Activity } = require('../backend/src/models');

async function updateActivitySequence() {
  try {
    console.log('开始更新活动序号...');
    
    // 确保数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 按创建时间正序获取所有活动（最早的在前）
    const activities = await Activity.findAll({
      order: [['created_at', 'ASC']] // 按创建时间正序排列
    });
    
    console.log(`找到 ${activities.length} 个活动需要更新序号`);
    
    // 为每个活动分配序号（最早的活动序号最小）
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const sequenceNumber = i + 1;
      
      await activity.update({
        sequence_number: sequenceNumber
      });
      
      if (i % 10 === 0 || i === activities.length - 1) {
        console.log(`更新进度: ${i + 1}/${activities.length} - 活动 "${activity.title}" 的序号为 ${sequenceNumber}`);
      }
    }
    
    console.log('所有活动序号更新完成！');
  } catch (error) {
    console.error('更新活动序号失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 执行更新
updateActivitySequence();