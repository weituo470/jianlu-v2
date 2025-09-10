const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// 创建数据库连接
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'jianlu_app',
  password: 'jianlu_app_password_2024',
  database: 'jianlu_admin',
  logging: console.log
});

// 定义活动模型
const Activity = sequelize.define('Activity', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  team_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  // ... 其他字段
}, {
  tableName: 'activities',
  timestamps: true
});

async function checkActivityData() {
  try {
    console.log('正在检查活动数据...\n');
    
    // 查询所有活动及其团队和创建者信息
    const [results] = await sequelize.query(`
      SELECT 
        a.id,
        a.title,
        a.team_id,
        a.creator_id,
        t.name as team_name,
        u.username as creator_name
      FROM activities a
      LEFT JOIN teams t ON a.team_id = t.id
      LEFT JOIN users u ON a.creator_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);
    
    console.log('=== 活动数据分析 ===');
    results.forEach((activity, index) => {
      console.log(`\n活动 ${index + 1}:`);
      console.log(`ID: ${activity.id}`);
      console.log(`标题: ${activity.title}`);
      console.log(`team_id: ${activity.team_id}`);
      console.log(`creator_id: ${activity.creator_id}`);
      console.log(`team_name: ${activity.team_name}`);
      console.log(`creator_name: ${activity.creator_name}`);
      
      // 检查是否有问题
      if (!activity.team_id) {
        console.log('⚠️  警告: team_id 为空！');
      }
      if (!activity.creator_id) {
        console.log('⚠️  警告: creator_id 为空！');
      }
      if (activity.team_id && !activity.team_name) {
        console.log('⚠️  警告: 有team_id但没有对应的团队记录！');
      }
      if (activity.creator_id && !activity.creator_name) {
        console.log('⚠️  警告: 有creator_id但没有对应的用户记录！');
      }
    });
    
    // 检查是否有孤立的team_id或creator_id
    console.log('\n=== 检查孤立ID ===');
    
    const [orphanedTeams] = await sequelize.query(`
      SELECT DISTINCT a.team_id
      FROM activities a
      LEFT JOIN teams t ON a.team_id = t.id
      WHERE a.team_id IS NOT NULL AND t.id IS NULL
    `);
    
    if (orphanedTeams.length > 0) {
      console.log('发现孤立的team_id:', orphanedTeams.map(t => t.team_id));
    } else {
      console.log('✅ 没有发现孤立的team_id');
    }
    
    const [orphanedCreators] = await sequelize.query(`
      SELECT DISTINCT a.creator_id
      FROM activities a
      LEFT JOIN users u ON a.creator_id = u.id
      WHERE a.creator_id IS NOT NULL AND u.id IS NULL
    `);
    
    if (orphanedCreators.length > 0) {
      console.log('发现孤立的creator_id:', orphanedCreators.map(c => c.creator_id));
    } else {
      console.log('✅ 没有发现孤立的creator_id');
    }
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await sequelize.close();
  }
}

checkActivityData();