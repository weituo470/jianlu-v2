const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrganizationMember = sequelize.define('OrganizationMember', {
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
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  role_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'organization_roles', key: 'id' }
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '在该机构中的昵称'
  },
  join_method: {
    type: DataTypes.ENUM('invite', 'qrcode', 'apply'),
    allowNull: false,
    comment: '加入方式'
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'inactive'),
    defaultValue: 'pending',
    allowNull: false
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'organization_members',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['organization_id', 'user_id'] },
    { fields: ['organization_id'] },
    { fields: ['user_id'] },
    { fields: ['status'] }
  ]
});

// 关联关系
OrganizationMember.associate = (models) => {
  OrganizationMember.belongsTo(models.Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
  });
  
  OrganizationMember.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  OrganizationMember.belongsTo(models.OrganizationRole, {
    foreignKey: 'role_id',
    as: 'role'
  });
};

// 实例方法
OrganizationMember.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // 格式化时间
  if (values.joined_at) {
    values.joined_at = values.joined_at.toISOString();
  }
  if (values.created_at) {
    values.created_at = values.created_at.toISOString();
  }
  if (values.updated_at) {
    values.updated_at = values.updated_at.toISOString();
  }
  
  return values;
};

// 类方法
OrganizationMember.findByOrganization = async function(organizationId, options = {}) {
  return await this.findAll({
    where: {
      organization_id: organizationId,
      status: 'active'
    },
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'profile']
      },
      {
        model: sequelize.models.OrganizationRole,
        as: 'role',
        attributes: ['id', 'name', 'permissions']
      }
    ],
    order: [['joined_at', 'ASC']],
    ...options
  });
};

OrganizationMember.findByUser = async function(userId, options = {}) {
  return await this.findAll({
    where: {
      user_id: userId,
      status: 'active'
    },
    include: [
      {
        model: sequelize.models.Organization,
        as: 'organization',
        attributes: ['id', 'name', 'description', 'avatar_url', 'status']
      },
      {
        model: sequelize.models.OrganizationRole,
        as: 'role',
        attributes: ['id', 'name', 'permissions']
      }
    ],
    order: [['joined_at', 'DESC']],
    ...options
  });
};

OrganizationMember.isOrganizationMember = async function(organizationId, userId) {
  const member = await this.findOne({
    where: {
      organization_id: organizationId,
      user_id: userId,
      status: 'active'
    }
  });
  
  return !!member;
};

OrganizationMember.hasPermission = async function(organizationId, userId, permission) {
  const member = await this.findOne({
    where: {
      organization_id: organizationId,
      user_id: userId,
      status: 'active'
    },
    include: [
      {
        model: sequelize.models.OrganizationRole,
        as: 'role'
      }
    ]
  });
  
  if (!member || !member.role) return false;
  
  return member.role.permissions && member.role.permissions.includes(permission);
};

// 钩子函数
OrganizationMember.addHook('afterCreate', async (member, options) => {
  // 添加成员后更新机构成员数量
  if (member.status === 'active') {
    const organization = await sequelize.models.Organization.findByPk(member.organization_id, {
      transaction: options.transaction
    });
    
    if (organization) {
      await organization.increment('member_count', {
        transaction: options.transaction
      });
    }
  }
});

OrganizationMember.addHook('afterUpdate', async (member, options) => {
  // 状态变更时更新机构成员数量
  if (member.changed('status')) {
    const organization = await sequelize.models.Organization.findByPk(member.organization_id, {
      transaction: options.transaction
    });
    
    if (organization) {
      if (member.status === 'active' && member._previousDataValues.status !== 'active') {
        await organization.increment('member_count', { transaction: options.transaction });
      } else if (member.status !== 'active' && member._previousDataValues.status === 'active') {
        await organization.decrement('member_count', { transaction: options.transaction });
      }
    }
  }
});

OrganizationMember.addHook('afterDestroy', async (member, options) => {
  // 移除成员后更新机构成员数量
  if (member.status === 'active') {
    const organization = await sequelize.models.Organization.findByPk(member.organization_id, {
      transaction: options.transaction
    });
    
    if (organization) {
      await organization.decrement('member_count', {
        transaction: options.transaction
      });
    }
  }
});

module.exports = OrganizationMember;