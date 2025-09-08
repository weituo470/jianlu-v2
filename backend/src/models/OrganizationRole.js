const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrganizationRole = sequelize.define('OrganizationRole', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'organizations', key: 'id' }
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
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为默认角色'
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
  tableName: 'organization_roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['organization_id'] },
    { fields: ['name'] },
    { fields: ['status'] },
    { unique: true, fields: ['organization_id', 'name'] }
  ]
});

// 关联关系
OrganizationRole.associate = (models) => {
  OrganizationRole.belongsTo(models.Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
  });
  
  OrganizationRole.hasMany(models.OrganizationMember, {
    foreignKey: 'role_id',
    as: 'members'
  });
};

// 实例方法
OrganizationRole.prototype.hasPermission = function(permission) {
  return this.permissions && this.permissions.includes(permission);
};

OrganizationRole.prototype.addPermission = function(permission) {
  if (!this.permissions) {
    this.permissions = [];
  }
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
  }
};

OrganizationRole.prototype.removePermission = function(permission) {
  if (this.permissions) {
    this.permissions = this.permissions.filter(p => p !== permission);
  }
};

// 类方法
OrganizationRole.findByOrganization = async function(organizationId, options = {}) {
  return await this.findAll({
    where: {
      organization_id: organizationId,
      status: 'active'
    },
    order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    ...options
  });
};

OrganizationRole.getDefaultRoles = function() {
  return [
    {
      name: '创建者',
      description: '机构创建者，拥有所有权限',
      permissions: [
        'organization:update',
        'organization:delete',
        'organization:manage_members',
        'organization:invite_members',
        'organization:approve_members',
        'organization:assign_roles',
        'organization:manage_roles',
        'organization:generate_qrcode',
        'organization:manage_finances',
        'organization:create_activities',
        'organization:manage_activities',
        'organization:view_reports'
      ],
      is_system: true,
      sort_order: 1
    },
    {
      name: '管理员',
      description: '机构管理员，拥有大部分管理权限',
      permissions: [
        'organization:manage_members',
        'organization:invite_members',
        'organization:approve_members',
        'organization:generate_qrcode',
        'organization:create_activities',
        'organization:manage_activities',
        'organization:view_reports'
      ],
      is_system: true,
      sort_order: 2
    },
    {
      name: '成员',
      description: '普通成员，基础权限',
      permissions: [
        'organization:view',
        'organization:participate_activities'
      ],
      is_default: true,
      is_system: true,
      sort_order: 3
    }
  ];
};

// 创建机构默认角色
OrganizationRole.createDefaultRoles = async function(organizationId, transaction = null) {
  const defaultRoles = this.getDefaultRoles();
  const createdRoles = [];
  
  for (const roleData of defaultRoles) {
    const role = await this.create({
      organization_id: organizationId,
      ...roleData
    }, { transaction });
    
    createdRoles.push(role);
  }
  
  return createdRoles;
};

// 获取所有可用权限
OrganizationRole.getAllPermissions = function() {
  return [
    // 机构管理权限
    { key: 'organization:update', name: '编辑机构信息', category: '机构管理' },
    { key: 'organization:delete', name: '删除机构', category: '机构管理' },
    { key: 'organization:view', name: '查看机构信息', category: '机构管理' },
    
    // 成员管理权限
    { key: 'organization:manage_members', name: '管理成员', category: '成员管理' },
    { key: 'organization:invite_members', name: '邀请成员', category: '成员管理' },
    { key: 'organization:approve_members', name: '审核成员申请', category: '成员管理' },
    { key: 'organization:assign_roles', name: '分配角色', category: '成员管理' },
    { key: 'organization:generate_qrcode', name: '生成邀请二维码', category: '成员管理' },
    
    // 角色权限管理
    { key: 'organization:manage_roles', name: '管理角色权限', category: '角色管理' },
    { key: 'organization:create_roles', name: '创建自定义角色', category: '角色管理' },
    
    // 活动管理权限
    { key: 'organization:create_activities', name: '创建活动', category: '活动管理' },
    { key: 'organization:manage_activities', name: '管理活动', category: '活动管理' },
    { key: 'organization:participate_activities', name: '参与活动', category: '活动管理' },
    
    // 财务管理权限
    { key: 'organization:manage_finances', name: '管理财务', category: '财务管理' },
    { key: 'organization:approve_expenses', name: '审批支出', category: '财务管理' },
    { key: 'organization:view_finances', name: '查看财务报表', category: '财务管理' },
    
    // 报表权限
    { key: 'organization:view_reports', name: '查看统计报表', category: '报表管理' },
    { key: 'organization:export_data', name: '导出数据', category: '报表管理' }
  ];
};

module.exports = OrganizationRole;