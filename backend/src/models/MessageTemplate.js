const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MessageTemplate = sequelize.define('MessageTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      len: [1, 100]
    }
  },
  title_template: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200]
    }
  },
  content_template: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 5000]
    }
  },
  type: {
    type: DataTypes.ENUM('system', 'personal', 'activity', 'team', 'announcement'),
    allowNull: false,
    defaultValue: 'system'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'normal'
  },
  variables: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '模板变量列表，用于验证和说明'
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '创建者ID'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'message_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['type']
    },
    {
      fields: ['is_active']
    }
  ]
});

// 关联关系
MessageTemplate.associate = function(models) {
  MessageTemplate.belongsTo(models.User, {
    foreignKey: 'created_by',
    as: 'creator'
  });
};

// 实例方法
MessageTemplate.prototype.render = function(variables = {}) {
  let title = this.title_template;
  let content = this.content_template;

  // 替换模板变量
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    title = title.replace(new RegExp(placeholder, 'g'), value);
    content = content.replace(new RegExp(placeholder, 'g'), value);
  }

  return {
    title,
    content,
    type: this.type,
    priority: this.priority
  };
};

MessageTemplate.prototype.validateVariables = function(variables) {
  const errors = [];

  for (const variable of this.variables) {
    if (variable.required && !variables[variable.name]) {
      errors.push(`缺少必需变量: ${variable.name}`);
    }
  }

  return errors;
};

// 类方法
MessageTemplate.findByName = function(name) {
  return MessageTemplate.findOne({
    where: {
      name,
      is_active: true
    }
  });
};

MessageTemplate.createSystemTemplate = async function(options) {
  const {
    name,
    titleTemplate,
    contentTemplate,
    type = 'system',
    priority = 'normal',
    variables = [],
    description = '',
    createdBy = null
  } = options;

  return await MessageTemplate.create({
    name,
    title_template: titleTemplate,
    content_template: contentTemplate,
    type,
    priority,
    variables,
    description,
    created_by: createdBy
  });
};

// 常用模板创建方法
MessageTemplate.createActivityReminderTemplate = async function() {
  return await MessageTemplate.create({
    name: 'activity_reminder',
    title_template: '活动提醒：{{activity_name}}',
    content_template: '亲爱的{{user_name}}，您报名的活动"{{activity_name}}"即将开始。\n\n活动时间：{{activity_time}}\n活动地点：{{activity_location}}\n\n请准时参加！',
    type: 'activity',
    priority: 'high',
    variables: [
      { name: 'user_name', description: '用户姓名', required: true },
      { name: 'activity_name', description: '活动名称', required: true },
      { name: 'activity_time', description: '活动时间', required: true },
      { name: 'activity_location', description: '活动地点', required: true }
    ],
    description: '活动提醒模板'
  });
};

MessageTemplate.createWelcomeTemplate = async function() {
  return await MessageTemplate.create({
    name: 'welcome',
    title_template: '欢迎加入简庐管理系统',
    content_template: '亲爱的{{user_name}}，欢迎您加入简庐管理系统！\n\n系统功能：\n- 团队管理\n- 活动报名\n- 费用结算\n- 消息通知\n\n如有问题，请联系管理员。',
    type: 'system',
    priority: 'normal',
    variables: [
      { name: 'user_name', description: '用户姓名', required: true }
    ],
    description: '新用户欢迎模板'
  });
};

MessageTemplate.createMaintenanceNoticeTemplate = async function() {
  return await MessageTemplate.create({
    name: 'maintenance_notice',
    title_template: '系统维护通知',
    content_template: '尊敬的用户：\n\n系统将于{{maintenance_time}}进行维护升级，预计持续{{duration}}。\n\n维护期间系统将暂时无法访问，请提前做好准备。\n\n给您带来的不便，敬请谅解。',
    type: 'system',
    priority: 'urgent',
    variables: [
      { name: 'maintenance_time', description: '维护时间', required: true },
      { name: 'duration', description: '维护时长', required: true }
    ],
    description: '系统维护通知模板'
  });
};

module.exports = MessageTemplate;