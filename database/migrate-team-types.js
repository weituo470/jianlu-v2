/**
 * 团队类型数据迁移脚本
 * 将硬编码的团队类型数据迁移到数据库表中
 */

const { sequelize } = require('../backend/src/config/database');
const { TeamType } = require('../backend/src/models');

async function migrateTeamTypes() {
  try {
    console.log('🚀 开始团队类型数据迁移...');

    // 确保数据库连接正常
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 同步TeamType模型（创建表）
    await TeamType.sync({ force: false });
    console.log('✅ 团队类型表同步完成');

    // 定义默认团队类型数据
    const defaultTeamTypes = [
      {
        id: 'general',
        name: '通用团队',
        description: '适用于一般性工作团队',
        is_default: true,
        sort_order: 1,
        is_active: true
      },
      {
        id: 'development',
        name: '开发团队',
        description: '负责软件开发和技术实现',
        is_default: true,
        sort_order: 2,
        is_active: true
      },
      {
        id: 'testing',
        name: '测试团队',
        description: '负责产品测试和质量保证',
        is_default: true,
        sort_order: 3,
        is_active: true
      },
      {
        id: 'design',
        name: '设计团队',
        description: '负责UI/UX设计和视觉创意',
        is_default: true,
        sort_order: 4,
        is_active: true
      },
      {
        id: 'marketing',
        name: '市场团队',
        description: '负责市场推广和品牌建设',
        is_default: true,
        sort_order: 5,
        is_active: true
      },
      {
        id: 'operation',
        name: '运营团队',
        description: '负责产品运营和用户增长',
        is_default: true,
        sort_order: 6,
        is_active: true
      },
      {
        id: 'research',
        name: '研发团队',
        description: '负责技术研究和创新',
        is_default: true,
        sort_order: 7,
        is_active: true
      },
      {
        id: 'support',
        name: '支持团队',
        description: '负责客户服务和技术支持',
        is_default: true,
        sort_order: 8,
        is_active: true
      }
    ];

    // 批量插入或更新数据
    let createdCount = 0;
    let updatedCount = 0;

    for (const typeData of defaultTeamTypes) {
      const [teamType, created] = await TeamType.findOrCreate({
        where: { id: typeData.id },
        defaults: typeData
      });

      if (created) {
        createdCount++;
        console.log(`✅ 创建团队类型: ${typeData.name} (${typeData.id})`);
      } else {
        // 更新现有记录（除了is_default字段）
        await teamType.update({
          name: typeData.name,
          description: typeData.description,
          sort_order: typeData.sort_order,
          is_active: typeData.is_active
        });
        updatedCount++;
        console.log(`🔄 更新团队类型: ${typeData.name} (${typeData.id})`);
      }
    }

    // 验证迁移结果
    const totalTypes = await TeamType.count();
    const activeTypes = await TeamType.count({ where: { is_active: true } });
    const defaultTypes = await TeamType.count({ where: { is_default: true } });

    console.log('\n📊 迁移结果统计:');
    console.log(`   新创建: ${createdCount} 个类型`);
    console.log(`   已更新: ${updatedCount} 个类型`);
    console.log(`   总计: ${totalTypes} 个类型`);
    console.log(`   活跃: ${activeTypes} 个类型`);
    console.log(`   默认: ${defaultTypes} 个类型`);

    // 显示所有团队类型
    console.log('\n📋 当前团队类型列表:');
    const allTypes = await TeamType.findAll({
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']]
    });

    allTypes.forEach(type => {
      const status = type.is_default ? '🔒默认' : '✏️自定义';
      const active = type.is_active ? '✅' : '❌';
      console.log(`   ${active} ${status} ${type.name} (${type.id}) - ${type.description}`);
    });

    console.log('\n🎉 团队类型数据迁移完成！');
    
  } catch (error) {
    console.error('❌ 团队类型数据迁移失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateTeamTypes()
    .then(() => {
      console.log('✅ 迁移脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { migrateTeamTypes };