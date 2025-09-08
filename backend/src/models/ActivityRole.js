const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityRole = sequelize.define('ActivityRole', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: '角色名称不能为空' },
      len: { args: [1, 100], msg: '角色名称长度必须在1-100个字符之间' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: '角色权限列表'
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为系统预设角色'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 999,
    comment: '排序顺序'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false
  }
}, {
  tableName: 'activity_roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['name'] },
    { fields: ['status'] },
    { unique: true, fields: ['name'] }
  ]
});

// 实例方法
ActivityRole.prototype.hasPermission = function(permission) {
  return this.permissions && this.permissions.includes(permission);
};

// 类方法
ActivityRole.findActive = async function(options = {}) {
  return await this.findAll({
    where: { status: 'active' },
    order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    ...options
  });
};

// 获取系统预设活动角色
ActivityRole.getSystemRoles = function() {
  return [
    {
      name: '创建人',
      description: '活动创建者，拥有所有权限',
      permissions: [
        'activity:update',
        'activity:delete',
        'activity:manage_participants',
        'activity:invite_participants',
        'activity:approve_participants',
        'activity:assign_roles',
        'activity:manage_schedule',
        'activity:manage_finances',
        'activity:record_content',
        'activity:edit_records',
        'activity:manage_expenses',
        'activity:approve_expenses',
        'activity:end_activity',
        'activity:share'
      ],
      is_system: true,
      sort_order: 1
    },
    {
      name: '导游',
      description: '活动导游，负责行程安排和讲解',
      permissions: [
        'activity:manage_schedule',
        'activity:record_content',
        'activity:manage_participants',
        'activity:share'
      ],
      is_system: true,
      sort_order: 2
    },
    {
      name: '领队',
      description: '活动领队，负责组织协调',
      permissions: [
        'activity:manage_participants',
        'activity:invite_participants',
        'activity:manage_schedule',
        'activity:record_content',
        'activity:share'
      ],
      is_system: true,
      sort_order: 3
    },
    {
      name: '编导',
      description: '活动编导，负责内容编辑',
      permissions: [
        'activity:record_content',
        'activity:edit_records',
        'activity:share'
      ],
      is_system: true,
      sort_order: 4
    },
    {
      name: '教练',
      description: '活动教练，负责技能指导',
      permissions: [
        'activity:record_content',
        'activity:manage_schedule',
        'activity:share'
      ],
      is_system: true,
      sort_order: 5
    },
    {
      name: '安全',
      description: '安全负责人，负责活动安全',
      permissions: [
        'activity:record_content',
        'activity:manage_participants',
        'activity:share'
      ],
      is_system: true,
      sort_order: 6
    },
    {
      name: '医务',
      description: '医务人员，负责医疗保障',
      permissions: [
        'activity:record_content',
        'activity:share'
      ],
      is_system: true,
      sort_order: 7
    },
    {
      name: '会计',
      description: '财务会计，负责记账',
      permissions: [
        'activity:manage_expenses',
        'activity:record_content',
        'activity:share'
      ],
      is_system: true,
      sort_order: 8
    },
    {
      name: '出纳',
      description: '财务出纳，负责资金管理',
      permissions: [
        'activity:manage_finances',
        'activity:manage_expenses',
        'activity:record_content',
        'activity:share'
      ],
      is_system: true,
      sort_order: 9
    },
    {
      name: '司机',
      description: '活动司机，负责交通',
      permissions: [
        'activity:record_content',
        'activity:share'
      ],
      is_system: true,
      sort_order: 10
    },
    {
      name: '地导',
      description: '当地导游，负责本地服务',
      permissions: [
        'activity:record_content',
        'activity:share'
      ],
      is_system: true,
      sort_order: 11
    },
    {
      name: '成员',
      description: '普通参与者，基础权限',
      permissions: [
        'activity:participate',
        'activity:record_content',
        'activity:share'
      ],
      is_system: true,
      sort_order: 12
    },
    {
      name: '贵宾',
      description: '贵宾参与者，特殊待遇',
      permissions: [
        'activity:participate',
        'activity:record_content',
        'activity:share'
      ],
      is_system: true,
      sort_order: 13
    },
    {
      name: '抢救',
      description: '急救人员，负责紧急救护',
      permissions: [
        'activity:record_content',
        'activity:share'
      ],
      is_system: true,
      sort_order: 14
    },
    {
      name: '劳务',
      description: '劳务人员，负责服务工作',
      permissions: [
        'activity:record_content',
        'activity:share'
      ],
      is_system: true,
      sort_order: 15
    }
  ];
};

// 获取所有活动权限
ActivityRole.getAllPermissions = function() {
  return [
    // 活动管理权限
    { key: 'activity:update', name: '编辑活动信息', category: '活动管理' },
    { key: 'activity:delete', name: '删除活动', category: '活动管理' },
    { key: 'activity:participate', name: '参与活动', category: '活动管理' },
    { key: 'activity:end_activity', name: '结束活动', category: '活动管理' },
    
    // 参与者管理权限
    { key: 'activity:manage_participants', name: '管理参与者', category: '参与者管理' },
    { key: 'activity:invite_participants', name: '邀请参与者', category: '参与者管理' },
    { key: 'activity:approve_participants', name: '审核参与者', category: '参与者管理' },
    { key: 'activity:assign_roles', name: '分配角色', category: '参与者管理' },
    
    // 行程管理权限
    { key: 'activity:manage_schedule', name: '管理行程安排', category: '行程管理' },
    { key: 'activity:edit_schedule', name: '编辑行程', category: '行程管理' },
    
    // 内容记录权限
    { key: 'activity:record_content', name: '记录内容', category: '内容管理' },
    { key: 'activity:edit_records', name: '编辑记录', category: '内容管理' },
    { key: 'activity:share', name: '分享活动', category: '内容管理' },
    
    // 财务管理权限
    { key: 'activity:manage_finances', name: '管理财务', category: '财务管理' },
    { key: 'activity:manage_expenses', name: '记账管理', category: '财务管理' },
    { key: 'activity:approve_expenses', name: '审核账单', category: '财务管理' },
    { key: 'activity:settle_expenses', name: '发起结算', category: '财务管理' },
    { key: 'activity:manage_deposits', name: '诚信金管理', category: '财务管理' }
  ];
};

// 初始化系统角色
ActivityRole.initializeSystemRoles = async function() {
  const systemRoles = this.getSystemRoles();
  const createdRoles = [];
  
  for (const roleData of systemRoles) {
    const [role, created] = await this.findOrCreate({
      where: { name: roleData.name },
      defaults: roleData
    });
    
    if (!created && role.is_system) {
      // 更新系统角色的权限
      await role.update({
        permissions: roleData.permissions,
        description: roleData.description,
        sort_order: roleData.sort_order
      });
    }
    
    createdRoles.push(role);
  }
  
  return createdRoles;
};

module.exports = ActivityRole;