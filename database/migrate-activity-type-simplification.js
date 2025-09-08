/**
 * 活动类型简化迁移脚本
 * 将活动表的type字段从ENUM改为VARCHAR，并更新现有数据
 */

const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jianlu_admin'
};

// 类型映射表：将旧的ID映射到新的名称
const typeMapping = {
  'meeting': '会议',
  'training': '培训',
  'workshop': '工作坊',
  'team_building': '团建',
  'project': '项目',
  'presentation': '演示',
  'brainstorm': '头脑风暴',
  'review': '评审',
  'ceremony': '仪式',
  'event': '活动',
  'other': '其他'
};

async function migrateActivityTypes() {
  let connection;
  
  try {
    console.log('🔄 开始活动类型简化迁移...');
    
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 1. 检查当前activities表结构
    console.log('\n📋 检查当前表结构...');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM activities WHERE Field = 'type'
    `);
    
    if (columns.length > 0) {
      console.log(`当前type字段类型: ${columns[0].Type}`);
    }
    
    // 2. 查看当前活动数据中的类型使用情况
    console.log('\n🎯 分析当前活动类型使用情况...');
    const [activities] = await connection.execute(`
      SELECT type, COUNT(*) as count FROM activities GROUP BY type
    `);
    
    console.log('当前类型分布:');
    activities.forEach(row => {
      const newName = typeMapping[row.type] || row.type;
      console.log(`  - ${row.type} -> ${newName}: ${row.count} 个活动`);
    });
    
    // 3. 开始事务
    await connection.beginTransaction();
    console.log('\n🔄 开始数据迁移事务...');
    
    // 4. 添加临时列
    console.log('📝 添加临时type_new列...');
    await connection.execute(`
      ALTER TABLE activities ADD COLUMN type_new VARCHAR(100) DEFAULT '其他'
    `);
    
    // 5. 更新数据：将旧的类型ID转换为新的类型名称
    console.log('🔄 转换活动类型数据...');
    for (const [oldType, newType] of Object.entries(typeMapping)) {
      const [result] = await connection.execute(`
        UPDATE activities SET type_new = ? WHERE type = ?
      `, [newType, oldType]);
      
      if (result.affectedRows > 0) {
        console.log(`  ✅ ${oldType} -> ${newType}: ${result.affectedRows} 条记录`);
      }
    }
    
    // 6. 处理未映射的类型（保持原值）
    await connection.execute(`
      UPDATE activities SET type_new = type WHERE type_new = '其他' AND type NOT IN (${Object.keys(typeMapping).map(() => '?').join(',')})
    `, Object.keys(typeMapping));
    
    // 7. 删除旧的type列
    console.log('🗑️ 删除旧的type列...');
    await connection.execute(`
      ALTER TABLE activities DROP COLUMN type
    `);
    
    // 8. 重命名新列为type
    console.log('📝 重命名type_new为type...');
    await connection.execute(`
      ALTER TABLE activities CHANGE COLUMN type_new type VARCHAR(100) NOT NULL DEFAULT '其他'
    `);
    
    // 9. 添加索引
    console.log('📊 添加type字段索引...');
    await connection.execute(`
      CREATE INDEX idx_activities_type ON activities(type)
    `);
    
    // 10. 验证迁移结果
    console.log('\n✅ 验证迁移结果...');
    const [newActivities] = await connection.execute(`
      SELECT type, COUNT(*) as count FROM activities GROUP BY type
    `);
    
    console.log('迁移后类型分布:');
    newActivities.forEach(row => {
      console.log(`  - ${row.type}: ${row.count} 个活动`);
    });
    
    // 11. 提交事务
    await connection.commit();
    console.log('\n🎉 活动类型简化迁移完成！');
    
    // 12. 显示新的表结构
    const [newColumns] = await connection.execute(`
      SHOW COLUMNS FROM activities WHERE Field = 'type'
    `);
    console.log(`\n📋 新的type字段类型: ${newColumns[0].Type}`);
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    
    if (connection) {
      try {
        await connection.rollback();
        console.log('🔄 已回滚事务');
      } catch (rollbackError) {
        console.error('❌ 回滚失败:', rollbackError.message);
      }
    }
    
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行迁移
if (require.main === module) {
  migrateActivityTypes()
    .then(() => {
      console.log('\n✅ 迁移脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { migrateActivityTypes };