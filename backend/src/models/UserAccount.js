const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const uuid = require('uuid');

/**
 * 用户账户模型 - 管理用户虚拟余额
 */
const UserAccount = sequelize.define('UserAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: '账户ID'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'user_id',
    comment: '用户ID'
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: '账户余额(元)',
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'user_accounts',
  timestamps: false, // 暂时禁用时间戳，因为表中可能没有这些字段
  comment: '用户账户表',
  indexes: [
    {
      unique: true,
      fields: ['user_id']
    }
  ]
});

/**
 * 账户交易记录模型
 */
const AccountTransaction = sequelize.define('AccountTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: '交易ID'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    comment: '用户ID'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '交易金额(元)',
    validate: {
      min: 0
    }
  },
  transactionType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'transaction_type',
    comment: '交易类型'
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '交易描述'
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'completed',
    comment: '交易状态'
  }
}, {
  tableName: 'account_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  comment: '账户交易记录表'
});

// 建立关联关系
UserAccount.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasOne(UserAccount, {
  foreignKey: 'userId',
  as: 'account'
});

AccountTransaction.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

AccountTransaction.belongsTo(UserAccount, {
  foreignKey: 'accountId',
  as: 'account'
});

UserAccount.hasMany(AccountTransaction, {
  foreignKey: 'accountId',
  as: 'transactions'
});

/**
 * 实例方法 - 获取可用余额
 */
UserAccount.prototype.getAvailableBalance = function() {
  return parseFloat(this.balance);
};

/**
 * 实例方法 - 检查余额是否充足
 */
UserAccount.prototype.hasEnoughBalance = function(amount) {
  return this.getAvailableBalance() >= parseFloat(amount);
};

/**
 * 静态方法 - 创建用户账户
 */
UserAccount.createAccount = async function(userId, transaction = null) {
  const options = transaction ? { transaction } : {};
  
  const account = await UserAccount.create({
    userId,
    balance: 0.00,
    frozenAmount: 0.00,
    totalIncome: 0.00,
    totalExpense: 0.00,
    status: 'active'
  }, options);
  
  return account;
};

/**
 * 静态方法 - 安全的余额变更（简化版）
 */
UserAccount.updateBalance = async function(userId, transactionType, amount, options = {}) {
  const { 
    description = `余额${transactionType === 'recharge' ? '充值' : '扣费'}`, 
    transaction = null 
  } = options;
  
  const t = transaction || await sequelize.transaction();
  
  try {
    // 获取用户账户(行锁)
    const account = await UserAccount.findOne({
      where: { userId },
      transaction: t
    });
    
    if (!account) {
      // 如果账户不存在，自动创建
      const newAccount = await UserAccount.create({
        userId,
        balance: 0.00
      }, { transaction: t });
      
      // 继续处理
      return await UserAccount.updateBalance(userId, transactionType, amount, { description, transaction: t });
    }
    
    const currentBalance = parseFloat(account.balance);
    let newBalance;
    
    // 计算新余额
    switch (transactionType) {
      case 'recharge':
      case 'refund':
        newBalance = currentBalance + parseFloat(amount);
        break;
      case 'expense':
        if (currentBalance < parseFloat(amount)) {
          throw new Error('余额不足');
        }
        newBalance = currentBalance - parseFloat(amount);
        break;
      default:
        throw new Error('无效的交易类型');
    }
    
    // 创建交易记录
    const transactionRecord = await AccountTransaction.create({
      userId,
      transactionType,
      amount: parseFloat(amount),
      description,
      status: 'completed'
    }, { transaction: t });
    
    // 更新账户余额
    await account.update({
      balance: newBalance
    }, { transaction: t });
    
    // 如果没有外部事务，提交事务
    if (!transaction) {
      await t.commit();
    }
    
    return {
      account: await account.reload({ transaction: transaction || undefined }),
      transaction: transactionRecord
    };
    
  } catch (error) {
    // 如果没有外部事务，回滚事务
    if (!transaction && t && !t.finished) {
      await t.rollback();
    }
    throw error;
  }
};

/**
 * 静态方法 - 获取用户账户信息
 */
UserAccount.getUserAccount = async function(userId) {
  let account = await UserAccount.findOne({
    where: { userId }
  });
  
  if (!account) {
    // 如果账户不存在，自动创建
    account = await UserAccount.create({
      userId,
      balance: 0.00
    });
  }
  
  return account;
};

/**
 * 静态方法 - 获取交易记录
 */
UserAccount.getTransactionHistory = async function(userId, options = {}) {
  const { 
    page = 1, 
    limit = 20, 
    transactionType = null,
    startDate = null,
    endDate = null 
  } = options;
  
  const where = { userId };
  
  if (transactionType) {
    where.transactionType = transactionType;
  }
  
  if (startDate && endDate) {
    where.createdAt = {
      [sequelize.Sequelize.Op.between]: [startDate, endDate]
    };
  }
  
  const { count, rows } = await AccountTransaction.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'nickname']
    }]
  });
  
  return {
    transactions: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / limit)
    }
  };
};

module.exports = {
  UserAccount,
  AccountTransaction
};