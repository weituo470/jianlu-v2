const { DataTypes, Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [3, 50],
      is: /^[a-zA-Z0-9_]+$/
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'user'),
    allowNull: false,
    defaultValue: 'user'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'deleted'),
    allowNull: false,
    defaultValue: 'active'
  },
  profile: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '软删除时间'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['username']
    },
    {
      fields: ['email']
    },
    {
      fields: ['role']
    },
    {
      fields: ['status']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        user.password_hash = await bcrypt.hash(user.password_hash, saltRounds);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        user.password_hash = await bcrypt.hash(user.password_hash, saltRounds);
      }
    }
  }
});

// 实例方法
User.prototype.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password_hash);
};

User.prototype.isLocked = function () {
  return this.locked_until && this.locked_until > new Date();
};

User.prototype.incrementLoginAttempts = async function () {
  const maxAttempts = 5;
  const lockTime = 15 * 60 * 1000; // 15分钟

  this.login_attempts += 1;

  if (this.login_attempts >= maxAttempts) {
    this.locked_until = new Date(Date.now() + lockTime);
  }

  await this.save();
};

User.prototype.resetLoginAttempts = async function () {
  this.login_attempts = 0;
  this.locked_until = null;
  this.last_login_at = new Date();
  await this.save();
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password_hash;
  return values;
};

// 类方法
User.findByUsername = function (username) {
  return User.findOne({
    where: { username, status: { [Op.ne]: 'deleted' } }
  });
};

User.findByEmail = function (email) {
  return User.findOne({
    where: { email, status: { [Op.ne]: 'deleted' } }
  });
};

// 安全的软删除方法 - 简化版本，降低事务复杂度
User.prototype.safeDelete = async function (reason, operatorId) {
  const logger = require('../utils/logger');
  
  try {
    // 生成唯一标识符，避免用户名/邮箱冲突
    const timestamp = Date.now();
    const uniqueId = this.id.substring(0, 8); // 使用UUID前8位
    
    // 1. 先创建审计记录（独立事务，即使失败也不影响删除）
    try {
      const UserDeletionAudit = require('./UserDeletionAudit');
      const { v4: uuidv4 } = require('uuid');
      
      await UserDeletionAudit.create({
        id: uuidv4(),
        original_user_id: this.id,
        deleted_user_data: this.toJSON(),
        deletion_reason: reason || '用户删除',
        deletion_type: 'soft',
        deleted_by: operatorId || 'system'
      });
      
      logger.info(`用户删除审计记录创建成功: ${this.username}`);
    } catch (auditError) {
      // 审计记录创建失败不阻止删除操作，但要记录警告
      logger.warn(`用户删除审计记录创建失败: ${this.username}`, auditError);
    }

    // 2. 执行安全的软删除（单一原子操作）
    const updateResult = await this.update({
      username: `deleted_${uniqueId}_${timestamp}`,
      email: `deleted_${uniqueId}_${timestamp}@deleted.local`,
      status: 'deleted',
      deleted_at: new Date()
    });

    logger.info(`用户安全删除成功: ${this.username} -> deleted_${uniqueId}_${timestamp}`);
    return updateResult;
    
  } catch (error) {
    logger.error(`用户安全删除失败: ${this.username}`, error);
    throw new Error(`用户删除失败: ${error.message}`);
  }
};

// 保留原有的复杂删除方法作为备用（标记为已弃用）
User.prototype.softDelete = async function (reason, operatorId) {
  const logger = require('../utils/logger');
  logger.warn('softDelete方法已弃用，请使用safeDelete方法');
  
  // 调用新的安全删除方法
  return await this.safeDelete(reason, operatorId);
};

// 硬删除方法
User.prototype.hardDelete = async function (reason, operatorId) {
  const UserDeletionAudit = require('./UserDeletionAudit');
  const { v4: uuidv4 } = require('uuid');

  const transaction = await User.sequelize.transaction();
  try {
    // 1. 创建审计记录
    await UserDeletionAudit.create({
      id: uuidv4(),
      original_user_id: this.id,
      deleted_user_data: this.toJSON(),
      deletion_reason: reason,
      deletion_type: 'hard',
      deleted_by: operatorId,
      can_restore: false
    }, { transaction });

    // 2. 物理删除用户
    await this.destroy({ transaction });

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// 恢复软删除的用户
User.restoreFromAudit = async function (auditId, operatorId) {
  const UserDeletionAudit = require('./UserDeletionAudit');

  const transaction = await User.sequelize.transaction();
  try {
    // 1. 获取审计记录
    const auditRecord = await UserDeletionAudit.findByPk(auditId, { transaction });
    if (!auditRecord || !auditRecord.canBeRestored()) {
      throw new Error('无法恢复此用户');
    }

    // 2. 检查用户名和邮箱是否可用
    const originalData = auditRecord.getOriginalUserData();
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: originalData.username },
          { email: originalData.email }
        ],
        status: { [Op.ne]: 'deleted' }
      },
      transaction
    });

    if (existingUser) {
      throw new Error('用户名或邮箱已被占用，无法恢复');
    }

    // 3. 恢复用户
    const restoredUser = await User.create({
      ...originalData,
      id: uuidv4(), // 使用新的ID
      status: 'active',
      deleted_at: null
    }, { transaction });

    // 4. 更新审计记录
    await auditRecord.update({
      restored_at: new Date(),
      restored_by: operatorId
    }, { transaction });

    await transaction.commit();
    return restoredUser;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = User;