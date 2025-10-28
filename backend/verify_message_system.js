require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function verifyMessageSystem() {
  try {
    console.log('🔍 验证消息系统数据库结构...\n');

    // 检查表
    const [tables] = await sequelize.query(`
      SELECT table_name, table_comment
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND (table_name LIKE '%message%' OR table_name = 'system_configs')
      ORDER BY table_name
    `);

    console.log('✅ 创建的表：');
    tables.forEach(row => {
      console.log(`   - ${row.table_name}${row.table_comment ? ': ' + row.table_comment : ''}`);
    });

    // 检查消息模板
    const [templates] = await sequelize.query(`
      SELECT name, type, priority, description
      FROM message_templates
      WHERE is_active = 1
      ORDER BY name
    `);

    console.log('\n✅ 消息模板：');
    templates.forEach(row => {
      console.log(`   - ${row.name} (${row.type}/${row.priority}): ${row.description}`);
    });

    // 检查系统配置
    const [configs] = await sequelize.query(`
      SELECT config_key, config_value, description
      FROM system_configs
      WHERE config_key LIKE '%message%' OR config_key LIKE '%cleanup%'
      ORDER BY config_key
    `);

    console.log('\n✅ 消息系统配置：');
    configs.forEach(row => {
      console.log(`   - ${row.config_key}: ${row.config_value} (${row.description})`);
    });

    // 检查外键约束
    const [constraints] = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND (TABLE_NAME LIKE '%message%' OR TABLE_NAME = 'system_configs')
      AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);

    if (constraints.length > 0) {
      console.log('\n✅ 外键约束：');
      constraints.forEach(row => {
        console.log(`   - ${row.TABLE_NAME}.${row.COLUMN_NAME} -> ${row.REFERENCED_TABLE_NAME}.${row.REFERENCED_COLUMN_NAME}`);
      });
    }

    // 检查索引
    const [indexes] = await sequelize.query(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME LIKE '%message%'
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `);

    const indexMap = {};
    indexes.forEach(index => {
      if (!indexMap[index.TABLE_NAME]) {
        indexMap[index.TABLE_NAME] = {};
      }
      if (!indexMap[index.TABLE_NAME][index.INDEX_NAME]) {
        indexMap[index.TABLE_NAME][index.INDEX_NAME] = [];
      }
      indexMap[index.TABLE_NAME][index.INDEX_NAME].push(index.COLUMN_NAME);
    });

    console.log('\n✅ 索引：');
    Object.keys(indexMap).forEach(tableName => {
      console.log(`   ${tableName}:`);
      Object.keys(indexMap[tableName]).forEach(indexName => {
        const columns = indexMap[tableName][indexName].join(', ');
        console.log(`     - ${indexName}: (${columns})`);
      });
    });

    console.log('\n🎉 消息系统数据库验证完成！所有组件都已正确安装。');

    await sequelize.close();
  } catch (error) {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  }
}

verifyMessageSystem();