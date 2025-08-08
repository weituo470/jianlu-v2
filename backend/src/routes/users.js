const express = require('express');
const { Op } = require('sequelize');
const { User } = require('../models');
const { success, successWithPagination, error, notFound } = require('../utils/response');
const { 
  validate, 
  createUserSchema, 
  updateUserSchema, 
  paginationSchema, 
  idParamSchema,
  resetPasswordSchema,
  batchOperationSchema 
} = require('../middleware/validation');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 所有用户路由都需要认证
router.use(authenticateToken);

/**
 * 获取用户列表
 * GET /api/users
 */
router.get('/', 
  requirePermission('user:read'),
  validate(paginationSchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, search, status, role, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;

      // 构建查询条件
      const whereConditions = {
        status: { [Op.ne]: 'deleted' }
      };

      // 普通用户只能看到自己
      if (req.user.role === 'user') {
        whereConditions.id = req.user.id;
      }

      if (search) {
        whereConditions[Op.or] = [
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { 'profile.nickname': { [Op.like]: `%${search}%` } }
        ];
      }

      if (status) {
        whereConditions.status = status;
      }

      if (role) {
        whereConditions.role = role;
      }

      if (startDate && endDate) {
        whereConditions.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      // 查询用户列表
      const { count, rows: users } = await User.findAndCountAll({
        where: whereConditions,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        attributes: { exclude: ['password_hash'] }
      });

      successWithPagination(res, users, {
        page,
        limit,
        total: count
      }, '获取用户列表成功');

    } catch (err) {
      next(err);
    }
  }
);/**

 * 获取单个用户详情
 * GET /api/users/:id
 */
router.get('/:id',
  requirePermission('user:read'),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const user = await User.findOne({
        where: { 
          id: req.params.id,
          status: { [Op.ne]: 'deleted' }
        },
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        return notFound(res, '用户不存在');
      }

      success(res, user, '获取用户详情成功');

    } catch (err) {
      next(err);
    }
  }
);

/**
 * 创建新用户
 * POST /api/users
 */
router.post('/',
  requirePermission('user:create'),
  validate(createUserSchema),
  async (req, res, next) => {
    try {
      const { username, email, password, role, profile } = req.body;

      // 权限控制：只有超级管理员才能创建管理员账号
      if (role === 'admin' && req.user.role !== 'super_admin') {
        return error(res, '只有超级管理员才能创建管理员账号', 403, 'INSUFFICIENT_PERMISSION');
      }
      
      // 只有超级管理员才能创建超级管理员账号
      if (role === 'super_admin' && req.user.role !== 'super_admin') {
        return error(res, '只有超级管理员才能创建超级管理员账号', 403, 'INSUFFICIENT_PERMISSION');
      }

      // 检查用户名是否已存在
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { username },
            { email }
          ],
          status: { [Op.ne]: 'deleted' }
        }
      });

      if (existingUser) {
        if (existingUser.username === username) {
          return error(res, '用户名已存在', 400, 'DUPLICATE_USERNAME');
        }
        if (existingUser.email === email) {
          return error(res, '邮箱已存在', 400, 'DUPLICATE_EMAIL');
        }
      }

      // 创建用户
      const user = await User.create({
        id: uuidv4(),
        username,
        email,
        password_hash: password, // 会在模型的hook中自动加密
        role,
        profile: profile || {},
        status: 'active'
      });

      // 记录操作日志
      logger.info(`管理员${req.user.username}创建了新用户: ${username} (角色: ${role})`);

      success(res, {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        status: user.status,
        created_at: user.created_at
      }, '用户创建成功', 201);

    } catch (err) {
      next(err);
    }
  }
);

/**
 * 更新用户信息
 * PUT /api/users/:id
 */
router.put('/:id',
  requirePermission('user:update'),
  validate(idParamSchema, 'params'),
  validate(updateUserSchema),
  async (req, res, next) => {
    try {
      const user = await User.findOne({
        where: { 
          id: req.params.id,
          status: { [Op.ne]: 'deleted' }
        }
      });

      if (!user) {
        return notFound(res, '用户不存在');
      }

      // 管理员不能修改超级管理员账号
      if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
        return error(res, '无权限修改超级管理员账号', 403, 'INSUFFICIENT_PERMISSION');
      }

      const updateData = req.body;

      // 如果更新用户名或邮箱，检查是否重复
      if (updateData.username || updateData.email) {
        const whereConditions = {
          id: { [Op.ne]: req.params.id },
          status: { [Op.ne]: 'deleted' }
        };

        const orConditions = [];
        if (updateData.username) {
          orConditions.push({ username: updateData.username });
        }
        if (updateData.email) {
          orConditions.push({ email: updateData.email });
        }

        if (orConditions.length > 0) {
          whereConditions[Op.or] = orConditions;
        }

        const existingUser = await User.findOne({ where: whereConditions });
        if (existingUser) {
          if (existingUser.username === updateData.username) {
            return error(res, '用户名已存在', 400, 'DUPLICATE_USERNAME');
          }
          if (existingUser.email === updateData.email) {
            return error(res, '邮箱已存在', 400, 'DUPLICATE_EMAIL');
          }
        }
      }

      // 更新用户信息
      await user.update(updateData);

      // 记录操作日志
      logger.info(`管理员${req.user.username}更新了用户${user.username}的信息`);

      success(res, {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        status: user.status,
        updated_at: user.updated_at
      }, '用户信息更新成功');

    } catch (err) {
      next(err);
    }
  }
);/**
 * 删
除用户（软删除）
 * DELETE /api/users/:id
 */
router.delete('/:id',
  requirePermission('user:delete'),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const user = await User.findOne({
        where: { 
          id: req.params.id,
          status: { [Op.ne]: 'deleted' }
        }
      });

      if (!user) {
        return notFound(res, '用户不存在');
      }

      // 不能删除自己
      if (user.id === req.user.id) {
        return error(res, '不能删除自己的账户', 400, 'CANNOT_DELETE_SELF');
      }

      // 管理员不能删除超级管理员账号
      if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
        return error(res, '无权限删除超级管理员账号', 403, 'INSUFFICIENT_PERMISSION');
      }

      // 软删除用户
      await user.update({ status: 'deleted' });

      // 记录操作日志
      logger.info(`管理员${req.user.username}删除了用户: ${user.username}`);

      success(res, null, '用户删除成功');

    } catch (err) {
      next(err);
    }
  }
);

/**
 * 重置用户密码
 * POST /api/users/:id/reset-password
 */
router.post('/:id/reset-password',
  requirePermission('user:update'),
  validate(idParamSchema, 'params'),
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const user = await User.findOne({
        where: { 
          id: req.params.id,
          status: { [Op.ne]: 'deleted' }
        }
      });

      if (!user) {
        return notFound(res, '用户不存在');
      }

      // 更新密码
      await user.update({ 
        password_hash: req.body.newPassword,
        login_attempts: 0,
        locked_until: null
      });

      // 记录操作日志
      logger.info(`管理员${req.user.username}重置了用户${user.username}的密码`);

      success(res, null, '密码重置成功');

    } catch (err) {
      next(err);
    }
  }
);

/**
 * 批量操作用户
 * POST /api/users/batch
 */
router.post('/batch',
  requirePermission('user:update'),
  validate(batchOperationSchema),
  async (req, res, next) => {
    try {
      const { ids, action } = req.body;

      // 查找要操作的用户
      const users = await User.findAll({
        where: {
          id: { [Op.in]: ids },
          status: { [Op.ne]: 'deleted' }
        }
      });

      if (users.length === 0) {
        return notFound(res, '未找到要操作的用户');
      }

      // 检查是否包含当前用户
      const currentUserInList = users.find(user => user.id === req.user.id);
      if (currentUserInList && (action === 'deactivate' || action === 'delete')) {
        return error(res, '不能对自己的账户执行此操作', 400, 'CANNOT_OPERATE_SELF');
      }

      let updateData = {};
      let successMessage = '';

      switch (action) {
        case 'activate':
          updateData = { status: 'active' };
          successMessage = '批量激活成功';
          break;
        case 'deactivate':
          updateData = { status: 'inactive' };
          successMessage = '批量停用成功';
          break;
        case 'delete':
          updateData = { status: 'deleted' };
          successMessage = '批量删除成功';
          break;
        default:
          return error(res, '无效的操作类型', 400, 'INVALID_ACTION');
      }

      // 执行批量更新
      await User.update(updateData, {
        where: { id: { [Op.in]: ids } }
      });

      // 记录操作日志
      const usernames = users.map(user => user.username).join(', ');
      logger.info(`管理员${req.user.username}批量${action}了用户: ${usernames}`);

      success(res, {
        affectedCount: users.length,
        action
      }, successMessage);

    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;