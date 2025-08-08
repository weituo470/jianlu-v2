/**
 * 自动修复团队类型表问题
 * 检查表是否存在，如果不存在则自动创建
 */

// 设置环境变量（如果已经通过setup-db-config.bat设置了，这些会被覆盖）
if (!process.env.DB_PASSWORD) {
  process.env.DB_PASSWORD = 'wei159753...';
  process.env.DB_USER = 'root';
  process.env.DB_NAME = 'jianlu_admin';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '3306';
}

const { sequelize } = require('../backend/src/config/database');

async function autoFixTeamTypes() {
  try {
    console.log('🔍 检查团队类型表状态...');
    
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接正常');
    
    // 检查team_types表是否存在
    const [results] = await sequelize.query(
      "SHOW TABLES LIKE 'team_types'"
    );
    
    if (results.length === 0) {
      console.log('❌ team_types表不存在，正在创建...');
      
      // 同步TeamType模型（创建表）
      const { TeamType } = require('../backend/src/models');
      await TeamType.sync({ force: false });
      console.log('✅ team_types表创建成功');
      
      // 插入默认数据
      await insertDefaultData();
      console.log('✅ 默认数据插入成功');
      
    } else {
      console.log('✅ team_types表已存在');
      
      // 检查是否有数据
      const { TeamType } = require('../backend/src/models');
      const count = await TeamType.count();
      
      if (count === 0) {
        console.log('📝 表为空，插入默认数据...');
        await insertDefaultData();
        console.log('✅ 默认数据插入成功');
      } else {
        console.log(`📊 表中已有 ${count} 条数据`);
      }
    }
    
    // 验证修复结果
    const { TeamType } = require('../backend/src/models');
    const types = await TeamType.findAll({
      order: [['sort_order', 'ASC']]
    });
    
    console.log('\n📋 当前团队类型:');
    types.forEach(type => {
      const status = type.is_default ? '🔒' : '✏️';
      console.log(`   ${status} ${type.name} (${type.id})`);
    });
    
    console.log('\n🎉 团队类型表修复完成！');
    console.log('💡 现在可以重启后端服务，团队类型管理功能应该正常工作');
    
  } catch (error) {
    console.error('❌ 自动修复失败:', error.message);
    
    if (error.name === 'SequelizeConnectionError' || error.message.includes('Access denied')) {
      console.log('\n💡 数据库连接问题，请检查:');
      console.log('   - MySQL服务是否运行');
      console.log('   - 数据库用户名和密码是否正确');
      console.log('   - 用户权限是否足够');
      console.log('\n🔧 快速解决方案:');
      console.log('   1. 运行: node check-db-config.js 检查配置');
      console.log('   2. 运行: setup-db-config.bat 设置正确的数据库配置');
      console.log('   3. 然后重新运行此脚本');
    }
    
    throw error;
  }
}

async function insertDefaultData() {
  const { TeamType } = require('../backend/src/models');
  
  const defaultTypes = [
    {
      id: 'general',
      name: '通用团队',
      description: '适用于一般性工作团队',
      is_default: true,
      sort_order: 1
    },
    {
      id: 'development',
      name: '开发团队',
      description: '负责软件开发和技术实现',
      is_default: true,
      sort_order: 2
    },
    {
      id: 'testing',
      name: '测试团队',
      description: '负责产品测试和质量保证',
      is_default: true,
      sort_order: 3
    },
    {
      id: 'design',
      name: '设计团队',
      description: '负责UI/UX设计和视觉创意',
      is_default: true,
      sort_order: 4
    },
    {
      id: 'marketing',
      name: '市场团队',
      description: '负责市场推广和品牌建设',
      is_default: true,
      sort_order: 5
    },
    {
      id: 'operation',
      name: '运营团队',
      description: '负责产品运营和用户增长',
      is_default: true,
      sort_order: 6
    },
    {
      id: 'research',
      name: '研发团队',
      description: '负责技术研究和创新',
      is_default: true,
      sort_order: 7
    },
    {
      id: 'support',
      name: '支持团队',
      description: '负责客户服务和技术支持',
      is_default: true,
      sort_order: 8
    }
  ];
  
  // 使用findOrCreate避免重复插入
  for (const typeData of defaultTypes) {
    await TeamType.findOrCreate({
      where: { id: typeData.id },
      defaults: typeData
    });
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  autoFixTeamTypes()
    .then(() => {
      console.log('\n✅ 修复完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 修复失败！');
      process.exit(1);
    });
}

module.exports = { autoFixTeamTypes };