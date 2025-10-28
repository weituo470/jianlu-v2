require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/database');

async function executeMessageMigration() {
  try {
    console.log('开始执行消息系统数据库迁移...');

    // 创建消息表
    console.log('正在创建 messages 表...');
    await createMessagesTable();

    // 创建消息模板表
    console.log('正在创建 message_templates 表...');
    await createMessageTemplatesTable();

    // 创建消息阅读记录表
    console.log('正在创建 message_read_records 表...');
    await createMessageReadRecordsTable();

    // 创建系统配置表
    console.log('正在创建 system_configs 表...');
    await createSystemConfigsTable();

    // 插入默认配置
    console.log('正在插入默认系统配置...');
    await insertDefaultConfigs();

    // 插入默认消息模板
    console.log('正在插入默认消息模板...');
    await insertDefaultTemplates();

    console.log('✅ 消息系统数据库迁移执行成功！');

    // 验证表是否创建成功
    const [results] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name IN ('messages', 'message_templates', 'message_read_records', 'system_configs')
    `);

    console.log('✅ 验证表创建成功：');
    results.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // 检查插入的模板数据
    const [templateResults] = await sequelize.query('SELECT name, description FROM message_templates WHERE is_active = 1');
    console.log('✅ 默认消息模板创建成功：');
    templateResults.forEach(row => {
      console.log(`   - ${row.name}: ${row.description}`);
    });

  } catch (error) {
    console.error('❌ 消息系统数据库迁移失败：', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

async function createMessagesTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`messages\` (
      \`id\` varchar(36) NOT NULL,
      \`title\` varchar(200) NOT NULL,
      \`content\` text NOT NULL,
      \`type\` enum('system','personal','activity','team','announcement') NOT NULL DEFAULT 'system',
      \`priority\` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
      \`sender_id\` varchar(36) DEFAULT NULL,
      \`recipient_id\` varchar(36) DEFAULT NULL,
      \`recipient_role\` enum('super_admin','admin','user') DEFAULT NULL,
      \`is_global\` tinyint(1) NOT NULL DEFAULT '0',
      \`is_read\` tinyint(1) NOT NULL DEFAULT '0',
      \`read_at\` datetime DEFAULT NULL,
      \`scheduled_at\` datetime DEFAULT NULL,
      \`expires_at\` datetime DEFAULT NULL,
      \`status\` enum('draft','sent','scheduled','expired','cancelled') NOT NULL DEFAULT 'draft',
      \`metadata\` json,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_recipient_id\` (\`recipient_id\`),
      KEY \`idx_sender_id\` (\`sender_id\`),
      KEY \`idx_type\` (\`type\`),
      KEY \`idx_status\` (\`status\`),
      KEY \`idx_is_read\` (\`is_read\`),
      KEY \`idx_priority\` (\`priority\`),
      KEY \`idx_created_at\` (\`created_at\`),
      KEY \`idx_scheduled_at\` (\`scheduled_at\`),
      KEY \`idx_expires_at\` (\`expires_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await sequelize.query(createTableSQL);

  // 添加外键约束
  try {
    await sequelize.query(`
      ALTER TABLE \`messages\`
      ADD CONSTRAINT \`fk_messages_sender\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
    `);
  } catch (error) {
    console.log('   注意: fk_messages_sender 外键可能已存在，跳过');
  }

  try {
    await sequelize.query(`
      ALTER TABLE \`messages\`
      ADD CONSTRAINT \`fk_messages_recipient\` FOREIGN KEY (\`recipient_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    `);
  } catch (error) {
    console.log('   注意: fk_messages_recipient 外键可能已存在，跳过');
  }
}

async function createMessageTemplatesTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`message_templates\` (
      \`id\` varchar(36) NOT NULL,
      \`name\` varchar(100) NOT NULL,
      \`title_template\` varchar(200) NOT NULL,
      \`content_template\` text NOT NULL,
      \`type\` enum('system','personal','activity','team','announcement') NOT NULL DEFAULT 'system',
      \`priority\` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
      \`variables\` json,
      \`description\` varchar(500) DEFAULT NULL,
      \`is_active\` tinyint(1) NOT NULL DEFAULT '1',
      \`created_by\` varchar(36) DEFAULT NULL,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_name\` (\`name\`),
      KEY \`idx_type\` (\`type\`),
      KEY \`idx_is_active\` (\`is_active\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await sequelize.query(createTableSQL);

  // 添加外键约束
  try {
    await sequelize.query(`
      ALTER TABLE \`message_templates\`
      ADD CONSTRAINT \`fk_message_templates_creator\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
    `);
  } catch (error) {
    console.log('   注意: fk_message_templates_creator 外键可能已存在，跳过');
  }
}

async function createMessageReadRecordsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`message_read_records\` (
      \`id\` varchar(36) NOT NULL,
      \`message_id\` varchar(36) NOT NULL,
      \`user_id\` varchar(36) NOT NULL,
      \`read_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`read_device\` varchar(100) DEFAULT NULL,
      \`read_ip\` varchar(45) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_message_user\` (\`message_id\`,\`user_id\`),
      KEY \`idx_message_id\` (\`message_id\`),
      KEY \`idx_user_id\` (\`user_id\`),
      KEY \`idx_read_at\` (\`read_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await sequelize.query(createTableSQL);

  // 添加外键约束
  try {
    await sequelize.query(`
      ALTER TABLE \`message_read_records\`
      ADD CONSTRAINT \`fk_message_read_message\` FOREIGN KEY (\`message_id\`) REFERENCES \`messages\` (\`id\`) ON DELETE CASCADE
    `);
  } catch (error) {
    console.log('   注意: fk_message_read_message 外键可能已存在，跳过');
  }

  try {
    await sequelize.query(`
      ALTER TABLE \`message_read_records\`
      ADD CONSTRAINT \`fk_message_read_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    `);
  } catch (error) {
    console.log('   注意: fk_message_read_user 外键可能已存在，跳过');
  }
}

async function createSystemConfigsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`system_configs\` (
      \`id\` varchar(36) NOT NULL,
      \`config_key\` varchar(100) NOT NULL,
      \`config_value\` text,
      \`config_type\` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
      \`description\` varchar(500) DEFAULT NULL,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_config_key\` (\`config_key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await sequelize.query(createTableSQL);
}

async function insertDefaultConfigs() {
  const configs = [
    {
      key: 'message_retention_days',
      value: '365',
      type: 'number',
      description: '消息保留天数'
    },
    {
      key: 'max_message_per_user',
      value: '1000',
      type: 'number',
      description: '每个用户最大消息数量'
    },
    {
      key: 'enable_message_scheduling',
      value: 'true',
      type: 'boolean',
      description: '是否启用消息定时发送'
    },
    {
      key: 'default_message_priority',
      value: 'normal',
      type: 'string',
      description: '默认消息优先级'
    },
    {
      key: 'enable_message_template',
      value: 'true',
      type: 'boolean',
      description: '是否启用消息模板'
    },
    {
      key: 'auto_delete_expired_messages',
      value: 'true',
      type: 'boolean',
      description: '是否自动删除过期消息'
    },
    {
      key: 'message_cleanup_interval_hours',
      value: '24',
      type: 'number',
      description: '消息清理间隔（小时）'
    }
  ];

  for (const config of configs) {
    try {
      await sequelize.query(`
        INSERT IGNORE INTO \`system_configs\` (\`id\`, \`config_key\`, \`config_value\`, \`config_type\`, \`description\`)
        VALUES (UUID(), ?, ?, ?, ?)
      `, {
        replacements: [config.key, config.value, config.type, config.description]
      });
    } catch (error) {
      console.log(`   注意: 配置 ${config.key} 可能已存在，跳过`);
    }
  }
}

async function insertDefaultTemplates() {
  const templates = [
    {
      name: 'welcome',
      titleTemplate: '欢迎加入简庐管理系统',
      contentTemplate: '亲爱的{{user_name}}，欢迎您加入简庐管理系统！\n\n系统功能：\n- 团队管理\n- 活动报名\n- 费用结算\n- 消息通知\n\n如有问题，请联系管理员。',
      type: 'system',
      priority: 'normal',
      variables: JSON.stringify([{name: 'user_name', description: '用户姓名', required: true}]),
      description: '新用户欢迎模板'
    },
    {
      name: 'activity_reminder',
      titleTemplate: '活动提醒：{{activity_name}}',
      contentTemplate: '亲爱的{{user_name}}，您报名的活动"{{activity_name}}"即将开始。\n\n活动时间：{{activity_time}}\n活动地点：{{activity_location}}\n\n请准时参加！',
      type: 'activity',
      priority: 'high',
      variables: JSON.stringify([
        {name: 'user_name', description: '用户姓名', required: true},
        {name: 'activity_name', description: '活动名称', required: true},
        {name: 'activity_time', description: '活动时间', required: true},
        {name: 'activity_location', description: '活动地点', required: true}
      ]),
      description: '活动提醒模板'
    },
    {
      name: 'maintenance_notice',
      titleTemplate: '系统维护通知',
      contentTemplate: '尊敬的用户：\n\n系统将于{{maintenance_time}}进行维护升级，预计持续{{duration}}。\n\n维护期间系统将暂时无法访问，请提前做好准备。\n\n给您带来的不便，敬请谅解。',
      type: 'system',
      priority: 'urgent',
      variables: JSON.stringify([
        {name: 'maintenance_time', description: '维护时间', required: true},
        {name: 'duration', description: '维护时长', required: true}
      ]),
      description: '系统维护通知模板'
    },
    {
      name: 'team_invitation',
      titleTemplate: '团队邀请：{{team_name}}',
      contentTemplate: '亲爱的{{user_name}}，您被邀请加入团队"{{team_name}}"。\n\n邀请人：{{inviter_name}}\n团队描述：{{team_description}}\n\n请登录系统查看详情并决定是否接受邀请。',
      type: 'team',
      priority: 'normal',
      variables: JSON.stringify([
        {name: 'user_name', description: '用户姓名', required: true},
        {name: 'team_name', description: '团队名称', required: true},
        {name: 'inviter_name', description: '邀请人姓名', required: true},
        {name: 'team_description', description: '团队描述', required: false}
      ]),
      description: '团队邀请模板'
    }
  ];

  for (const template of templates) {
    try {
      await sequelize.query(`
        INSERT IGNORE INTO \`message_templates\`
        (\`id\`, \`name\`, \`title_template\`, \`content_template\`, \`type\`, \`priority\`, \`variables\`, \`description\`)
        VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          template.name,
          template.titleTemplate,
          template.contentTemplate,
          template.type,
          template.priority,
          template.variables,
          template.description
        ]
      });
    } catch (error) {
      console.log(`   注意: 模板 ${template.name} 可能已存在，跳过`);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  executeMessageMigration();
}

module.exports = { executeMessageMigration };