const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const crypto = require('crypto');

const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');
const User = require('../models/User');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const Joi = require('joi');

// 邀请验证模式
const inviteSchema = Joi.object({
  user_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .required()
    .messages({
      'array.min': '至少选择一个用户',
      'any.required': '用户列表不能为空'
    }),
  role_id: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.uuid': '角色ID格式不正确'
    }),
  message: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': '邀请消息不能超过500个字符'
    })
});

// 申请验证模式
const applySchema = Joi.object({
  message: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': '申请消息不能超过500个字符'
    })
});

// 邀请用户加入机构
router.post('/:organizationId/invite',
  authenticateToken,
  requirePermission(['organization:invite_members']),
  validate(inviteSchema),
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { user_ids, role_id, message } = req.body;

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查是否支持邀请加入
      if (!organization.canUserJoin('invite')) {
        return error(res, '该机构不支持邀请加入', 400);
      }

      // 检查权限
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(organizationId, req.user.id, 'organization:invite_members');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限邀请成员', 403);
      }

      const results = [];
      const errors = [];

      for (const user_id of user_ids) {
        try {
          // 检查用户是否存在
          const user = await User.findByPk(user_id);
          if (!user) {
            errors.push({ user_id, error: '用户不存在' });
            continue;
          }

          // 检查用户是否已经是成员
          const existingMember = await OrganizationMember.findOne({
            where: {
              organization_id: organizationId,
              user_id
            }
          });

          if (existingMember) {
            errors.push({ user_id, error: '用户已经是机构成员' });
            continue;
          }

          // 创建邀请记录（直接设为active状态）
          const member = await OrganizationMember.create({
            organization_id: organizationId,
            user_id,
            role_id: role_id || null,
            join_method: 'invite',
            status: 'active'
          });

          results.push({
            user_id,
            username: user.username,
            status: 'invited',
            member_id: member.id
          });

          // TODO: 发送邀请通知（邮件/短信/站内信）
          logger.info(`用户 ${req.user.username} 邀请 ${user.username} 加入机构 ${organization.name}`);

        } catch (err) {
          errors.push({ user_id, error: err.message });
        }
      }

      return success(res, {
        successful: results,
        failed: errors,
        total: user_ids.length,
        success_count: results.length,
        error_count: errors.length
      }, '邀请处理完成');

    } catch (err) {
      logger.error('邀请用户失败:', err);
      return error(res, '邀请用户失败', 500);
    }
  }
);

// 生成机构二维码
router.post('/:organizationId/qrcode',
  authenticateToken,
  requirePermission(['organization:generate_qrcode']),
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { expires_in = 24 } = req.body; // 默认24小时过期

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查是否支持扫码加入
      if (!organization.canUserJoin('qrcode')) {
        return error(res, '该机构不支持扫码加入', 400);
      }

      // 检查权限
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(organizationId, req.user.id, 'organization:generate_qrcode');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限生成二维码', 403);
      }

      // 生成唯一的邀请码
      const inviteCode = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + expires_in * 60 * 60 * 1000);

      // 存储邀请码信息（这里简化处理，实际应该存储到数据库）
      const qrcodeData = {
        organization_id: organizationId,
        organization_name: organization.name,
        invite_code: inviteCode,
        created_by: req.user.id,
        created_at: new Date(),
        expires_at: expiresAt,
        join_url: `${process.env.FRONTEND_URL || 'http://localhost:3459'}/join/${inviteCode}`
      };

      // TODO: 将二维码信息存储到Redis或数据库中
      // await redis.setex(`qrcode:${inviteCode}`, expires_in * 3600, JSON.stringify(qrcodeData));

      logger.info(`用户 ${req.user.username} 为机构 ${organization.name} 生成了二维码`);

      return success(res, {
        invite_code: inviteCode,
        join_url: qrcodeData.join_url,
        expires_at: expiresAt,
        expires_in_hours: expires_in,
        organization: {
          id: organization.id,
          name: organization.name,
          avatar_url: organization.avatar_url
        }
      }, '二维码生成成功');

    } catch (err) {
      logger.error('生成二维码失败:', err);
      return error(res, '生成二维码失败', 500);
    }
  }
);

// 通过二维码加入机构
router.post('/join/:inviteCode',
  authenticateToken,
  async (req, res) => {
    try {
      const { inviteCode } = req.params;

      // TODO: 从Redis或数据库中获取邀请码信息
      // const qrcodeData = await redis.get(`qrcode:${inviteCode}`);
      // if (!qrcodeData) {
      //   return error(res, '邀请码无效或已过期', 400);
      // }

      // 临时模拟数据（实际应该从存储中获取）
      // 这里需要根据实际的存储方案来实现
      return error(res, '二维码功能需要配置Redis存储', 501);

    } catch (err) {
      logger.error('通过二维码加入失败:', err);
      return error(res, '加入失败', 500);
    }
  }
);

// 申请加入机构
router.post('/:organizationId/apply',
  authenticateToken,
  validate(applySchema),
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { message } = req.body;

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查是否支持在线申请
      if (!organization.canUserJoin('apply')) {
        return error(res, '该机构不支持在线申请', 400);
      }

      // 检查用户是否已经是成员
      const existingMember = await OrganizationMember.findOne({
        where: {
          organization_id: organizationId,
          user_id: req.user.id
        }
      });

      if (existingMember) {
        if (existingMember.status === 'active') {
          return error(res, '您已经是该机构成员', 400);
        } else if (existingMember.status === 'pending') {
          return error(res, '您的申请正在审核中', 400);
        }
      }

      // 创建申请记录
      const application = await OrganizationMember.create({
        organization_id: organizationId,
        user_id: req.user.id,
        join_method: 'apply',
        status: 'pending'
      });

      // TODO: 通知机构管理员有新的申请

      logger.info(`用户 ${req.user.username} 申请加入机构 ${organization.name}`);

      return success(res, {
        application_id: application.id,
        organization: {
          id: organization.id,
          name: organization.name,
          avatar_url: organization.avatar_url
        },
        status: 'pending',
        message: '申请已提交，等待审核'
      }, '申请提交成功');

    } catch (err) {
      logger.error('申请加入机构失败:', err);
      return error(res, '申请提交失败', 500);
    }
  }
);

// 获取待审核的申请列表
router.get('/:organizationId/applications',
  authenticateToken,
  requirePermission(['organization:approve_members']),
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 20, status = 'pending' } = req.query;

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查权限
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(organizationId, req.user.id, 'organization:approve_members');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限查看申请列表', 403);
      }

      // 分页参数
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const pageLimit = parseInt(limit);

      // 查询申请列表
      const { count, rows: applications } = await OrganizationMember.findAndCountAll({
        where: {
          organization_id: organizationId,
          status,
          join_method: 'apply'
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'profile']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: pageLimit,
        offset,
        distinct: true
      });

      return success(res, {
        applications,
        pagination: {
          page: parseInt(page),
          limit: pageLimit,
          total: count,
          pages: Math.ceil(count / pageLimit)
        }
      });

    } catch (err) {
      logger.error('获取申请列表失败:', err);
      return error(res, '获取申请列表失败', 500);
    }
  }
);

// 批量处理申请
router.put('/:organizationId/applications/batch',
  authenticateToken,
  requirePermission(['organization:approve_members']),
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { application_ids, action, role_id } = req.body; // action: 'approve' | 'reject'

      if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
        return error(res, '请选择要处理的申请', 400);
      }

      if (!['approve', 'reject'].includes(action)) {
        return error(res, '操作类型无效', 400);
      }

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查权限
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(organizationId, req.user.id, 'organization:approve_members');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限处理申请', 403);
      }

      const results = [];
      const errors = [];

      for (const applicationId of application_ids) {
        try {
          const application = await OrganizationMember.findOne({
            where: {
              id: applicationId,
              organization_id: organizationId,
              status: 'pending'
            },
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username']
              }
            ]
          });

          if (!application) {
            errors.push({ application_id: applicationId, error: '申请不存在或已处理' });
            continue;
          }

          const newStatus = action === 'approve' ? 'active' : 'inactive';
          const updateData = { status: newStatus };
          
          if (action === 'approve' && role_id) {
            updateData.role_id = role_id;
          }

          await application.update(updateData);

          results.push({
            application_id: applicationId,
            user_id: application.user_id,
            username: application.user.username,
            action,
            status: newStatus
          });

          // TODO: 发送处理结果通知

        } catch (err) {
          errors.push({ application_id: applicationId, error: err.message });
        }
      }

      logger.info(`用户 ${req.user.username} 批量${action === 'approve' ? '通过' : '拒绝'}了 ${results.length} 个申请`);

      return success(res, {
        successful: results,
        failed: errors,
        total: application_ids.length,
        success_count: results.length,
        error_count: errors.length
      }, '批量处理完成');

    } catch (err) {
      logger.error('批量处理申请失败:', err);
      return error(res, '批量处理失败', 500);
    }
  }
);

module.exports = router;