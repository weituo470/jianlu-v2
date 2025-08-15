const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { UserAccount, AccountTransaction } = require('../models/UserAccount');
const { User } = require('../models');
const logger = require('../utils/logger');
const { body, query } = require('express-validator');

/**
 * 获取用户账户信息
 * GET /api/accounts/profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const account = await UserAccount.getUserAccount(userId);
    
    logger.info(`用户 ${req.user.username} 查询账户信息`);
    
    res.json({
      success: true,
      data: {
        id: account.id,
        balance: parseFloat(account.balance),
        frozenAmount: parseFloat(account.frozenAmount),
        availableBalance: account.getAvailableBalance(),
        totalIncome: parseFloat(account.totalIncome),
        totalExpense: parseFloat(account.totalExpense),
        status: account.status,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      }
    });
  } catch (error) {
    logger.error('获取账户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取账户信息失败'
    });
  }
});

/**
 * 用户充值
 * POST /api/accounts/recharge
 */
router.post('/recharge', [
  authenticateToken,
  body('amount')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('充值金额必须在0.01-10000元之间'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('描述不能超过200字符'),
  validateRequest
], async (req, res) => {
  try {
    const { amount, description = '账户充值' } = req.body;
    const userId = req.user.id;
    
    const result = await UserAccount.updateBalance(userId, 'recharge', amount, {
      description,
      relatedType: 'system'
    });
    
    logger.info(`用户 ${req.user.username} 充值 ${amount} 元`);
    
    res.json({
      success: true,
      message: '充值成功',
      data: {
        transactionId: result.transaction.id,
        newBalance: parseFloat(result.account.balance),
        amount: parseFloat(amount)
      }
    });
  } catch (error) {
    logger.error('充值失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '充值失败'
    });
  }
});

/**
 * 管理员为用户充值
 * POST /api/accounts/admin-recharge
 */
router.post('/admin-recharge', [
  authenticateToken,
  requireRole(['admin']),
  body('userId')
    .isUUID()
    .withMessage('用户ID格式错误'),
  body('amount')
    .isFloat({ min: 0.01, max: 50000 })
    .withMessage('充值金额必须在0.01-50000元之间'),
  body('description')
    .isLength({ min: 1, max: 200 })
    .withMessage('充值说明必填，且不能超过200字符'),
  validateRequest
], async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    const operatorId = req.user.id;
    
    // 检查目标用户是否存在
    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '目标用户不存在'
      });
    }
    
    const result = await UserAccount.updateBalance(userId, 'recharge', amount, {
      description: `管理员充值: ${description}`,
      relatedType: 'admin',
      operatorId
    });
    
    logger.info(`管理员 ${req.user.username} 为用户 ${targetUser.username} 充值 ${amount} 元`);
    
    res.json({
      success: true,
      message: '充值成功',
      data: {
        transactionId: result.transaction.id,
        targetUser: {
          id: targetUser.id,
          username: targetUser.username,
          nickname: targetUser.nickname
        },
        newBalance: parseFloat(result.account.balance),
        amount: parseFloat(amount)
      }
    });
  } catch (error) {
    logger.error('管理员充值失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '充值失败'
    });
  }
});

/**
 * 获取交易记录
 * GET /api/accounts/transactions
 */
router.get('/transactions', [
  authenticateToken,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须在1-100之间'),
  query('type')
    .optional()
    .isIn(['recharge', 'expense', 'refund', 'transfer_in', 'transfer_out'])
    .withMessage('交易类型无效'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式错误'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式错误'),
  validateRequest
], async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      type: transactionType, 
      startDate, 
      endDate 
    } = req.query;
    
    const result = await UserAccount.getTransactionHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      transactionType,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });
    
    logger.info(`用户 ${req.user.username} 查询交易记录`);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取交易记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取交易记录失败'
    });
  }
});

/**
 * 管理员查看所有用户账户
 * GET /api/accounts/admin/users
 */
router.get('/admin/users', [
  authenticateToken,
  requireRole(['admin']),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须在1-100之间'),
  query('keyword')
    .optional()
    .isLength({ max: 50 })
    .withMessage('搜索关键词不能超过50字符'),
  validateRequest
], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      keyword 
    } = req.query;
    
    const whereClause = {};
    const userWhereClause = {};
    
    if (keyword) {
      const { Op } = require('sequelize');
      userWhereClause[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { nickname: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    const { count, rows } = await UserAccount.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'nickname', 'email', 'created_at'],
        where: userWhereClause
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    logger.info(`管理员 ${req.user.username} 查询用户账户列表`);
    
    res.json({
      success: true,
      data: {
        accounts: rows.map(account => ({
          id: account.id,
          user: account.user,
          balance: parseFloat(account.balance),
          frozenAmount: parseFloat(account.frozenAmount),
          availableBalance: account.getAvailableBalance(),
          totalIncome: parseFloat(account.totalIncome),
          totalExpense: parseFloat(account.totalExpense),
          status: account.status,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('获取用户账户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户账户列表失败'
    });
  }
});

/**
 * 管理员查看用户交易记录
 * GET /api/accounts/admin/transactions/:userId
 */
router.get('/admin/transactions/:userId', [
  authenticateToken,
  requireRole(['admin']),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须在1-100之间'),
  validateRequest
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // 检查用户是否存在
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const result = await UserAccount.getTransactionHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    logger.info(`管理员 ${req.user.username} 查询用户 ${user.username} 的交易记录`);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname
        },
        ...result
      }
    });
  } catch (error) {
    logger.error('获取用户交易记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户交易记录失败'
    });
  }
});

/**
 * 账户统计信息
 * GET /api/accounts/admin/statistics
 */
router.get('/admin/statistics', [
  authenticateToken,
  requireRole(['admin'])
], async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    
    // 获取统计数据
    const [accountStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_accounts,
        COUNT(CASE WHEN status = 'frozen' THEN 1 END) as frozen_accounts,
        COALESCE(SUM(balance), 0) as total_balance,
        COALESCE(SUM(total_income), 0) as total_income,
        COALESCE(SUM(total_expense), 0) as total_expense
      FROM user_accounts
    `);
    
    const [transactionStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN transaction_type = 'recharge' THEN 1 END) as recharge_count,
        COUNT(CASE WHEN transaction_type = 'expense' THEN 1 END) as expense_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'recharge' THEN amount ELSE 0 END), 0) as total_recharge,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
      FROM account_transactions
      WHERE status = 'completed'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    logger.info(`管理员 ${req.user.username} 查询账户统计信息`);
    
    res.json({
      success: true,
      data: {
        accounts: accountStats[0],
        transactions: transactionStats[0],
        generatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('获取账户统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取账户统计失败'
    });
  }
});

module.exports = router;