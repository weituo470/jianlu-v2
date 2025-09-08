const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: '机构名称不能为空' },
      len: { args: [2, 100], msg: '机构名称长度必须在2-100个字符之间' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  // 机构类型：国家认证 or 民间团体
  organization_type: {
    type: DataTypes.ENUM('government_certified', 'civil_organization'),
    allowNull: false,
    defaultValue: 'civil_organization',
    comment: '机构类型：government_certified=国家认证，civil_organization=民间团体'
  },
  // 分类标签（最多3个）
  category_tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: '机构分类标签，最多3个'
  },
  // 层级信息
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'organizations', key: 'id' },
    comment: '父级机构ID，null表示一级机构'
  },
  hierarchy_level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '层级：1=一级机构，2=二级机构，3=分组'
  },
  hierarchy_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '层级路径，如：/org1/org2/group1'
  },
  // 加入方式配置
  join_methods: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: ['invite'],
    comment: '允许的加入方式：invite=邀请，qrcode=扫码，apply=申请'
  },
  // 状态和统计
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'dissolved'),
    defaultValue: 'active',
    allowNull: false
  },
  member_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  activity_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  }
}, {
  tableName: 'organizations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['creator_id'] },
    { fields: ['parent_id'] },
    { fields: ['hierarchy_level'] },
    { fields: ['status'] },
    { fields: ['organization_type'] }
  ]
});

// 关联关系
Organization.associate = (models) => {
  // 创建者
  Organization.belongsTo(models.User, {
    foreignKey: 'creator_id',
    as: 'creator'
  });
  
  // 层级关系
  Organization.belongsTo(Organization, {
    foreignKey: 'parent_id',
    as: 'parent'
  });
  
  Organization.hasMany(Organization, {
    foreignKey: 'parent_id',
    as: 'children'
  });
  
  // 成员关系
  Organization.belongsToMany(models.User, {
    through: models.OrganizationMember,
    foreignKey: 'organization_id',
    otherKey: 'user_id',
    as: 'members'
  });
};

// 实例方法
Organization.prototype.getFullHierarchyPath = function() {
  return this.hierarchy_path || `/${this.name}`;
};

Organization.prototype.canUserJoin = function(method) {
  return this.join_methods.includes(method);
};

// 类方法
Organization.findWithHierarchy = async function(id) {
  return await this.findByPk(id, {
    include: [
      { model: Organization, as: 'parent' },
      { model: Organization, as: 'children' },
      { model: sequelize.models.User, as: 'creator', attributes: ['id', 'username'] }
    ]
  });
};

module.exports = Organization;