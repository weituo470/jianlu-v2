/**
 * 快速设置团队类型表
 * 检查表是否存在，如果不存在则创建并插入默认数据
 */

const mysql = require('mysql2/promise');

// 数据库配置（从环境变量或默认值获取，与后端保持一致）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jianlu_admin'
};

async function quickSetupTeamTypes() {
  let connection;
  
  try {
    console.log('🚀 开始快速设置团队类型表...');
    
    // 创建数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 检查表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'team_types'"
    );
    
    if (tables.length > 0) {
      console.log('✅ team_types 表已存在');
      
      // 检查数据
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM team_types');
      console.log(`📊 当前有 ${rows[0].count} 条团队类型数据`);
      
      if (rows[0].count === 0) {
        console.log('📝 插入默认数据...');
        await insertDefaultData(connection);
      }
    } else {
      console.log('📝 创建 team_types 表...');
      await createTable(connection);
      console.log('📝 插入默认数据...');
      await insertDefaultData(connection);
    }
    
    // 验证结果
    const [finalRows] = await connection.execute(
      'SELECT id, name, description, is_default FROM team_types ORDER BY sort_order'
    );
    
    console.log('\n📋 当前团队类型列表:');
    finalRows.forEach(row => {
      const status = row.is_default ? '🔒默认' : '✏️自定义';
      console.log(`   ${status} ${row.name} (${row.id}) - ${row.description}`);
    });
    
    console.log('\n🎉 团队类型表设置完成！');
    console.log('💡 现在可以重启后端服务并测试团队类型管理功能');
    
  } catch (error) {
    console.error('❌ 设置失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 解决方案:');
      console.log('   1. 确保MySQL服务正在运行');
      console.log('   2. 检查数据库连接配置');
      console.log('   3. 确认数据库用户名和密码正确');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 解决方案:');
      console.log('   1. 检查数据库用户名和密码');
      console.log('   2. 确保用户有足够的权限');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 解决方案:');
      console.log('   1. 确认数据库名称正确');
      console.log('   2. 创建数据库: CREATE DATABASE jianlu_admin;');
    }
    
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function createTable(connection) {
  const createTableSQL = `
    CREATE TABLE team_types (
      id VARCHAR(50) PRIMARY KEY COMMENT '团队类型ID',
      name VARCHAR(100) NOT NULL COMMENT '团队类型名称',
      description TEXT COMMENT '团队类型描述',
      is_default BOOLEAN DEFAULT FALSE NOT NULL COMMENT '是否为系统默认类型',
      sort_order INT DEFAULT 0 NOT NULL COMMENT '排序顺序',
      is_active BOOLEAN DEFAULT TRUE NOT NULL COMMENT '是否启用',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_team_types_is_active (is_active),
      INDEX idx_team_types_is_default (is_default),
      INDEX idx_team_types_sort_order (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队类型表'
  `;
  
  await connection.execute(createTableSQL);
  console.log('✅ team_types 表创建成功');
}

async function insertDefaultData(connection) {
  const defaultTypes = [
    ['general', '通用团队', '适用于一般性工作团队', true, 1],
    ['development', '开发团队', '负责软件开发和技术实现', true, 2],
    ['testing', '测试团队', '负责产品测试和质量保证', true, 3],
    ['design', '设计团队', '负责UI/UX设计和视觉创意', true, 4],
    ['marketing', '市场团队', '负责市场推广和品牌建设', true, 5],
    ['operation', '运营团队', '负责产品运营和用户增长', true, 6],
    ['research', '研发团队', '负责技术研究和创新', true, 7],
    ['support', '支持团队', '负责客户服务和技术支持', true, 8]
  ];
  
  const insertSQL = `
    INSERT INTO team_types (id, name, description, is_default, sort_order, is_active) 
    VALUES (?, ?, ?, ?, ?, TRUE)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      description = VALUES(description),
      sort_order = VALUES(sort_order),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  for (const typeData of defaultTypes) {
    await connection.execute(insertSQL, typeData);
  }
  
  console.log(`✅ 插入 ${defaultTypes.length} 条默认数据`);
}

// 如果直接运行此脚本
if (require.main === module) {
  quickSetupTeamTypes()
    .then(() => {
      console.log('\n✅ 设置完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 设置失败！');
      process.exit(1);
    });
}

module.exports = { quickSetupTeamTypes };