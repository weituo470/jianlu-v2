const { Team, TeamApplication, TeamMember, User } = require('../models');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class TeamApplicationController {
  // 申请加入团队
  async applyToTeam(req, res) {
    try {
      console.log('\n=== 团队申请请求开始 ===');
      console.log('请求参数:', {
        params: req.params,
        body: req.body,
        user: req.user ? { id: req.user.id, username: req.user.username } : 'Unknown'
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('参数验证失败:', errors.array());
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { teamId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      console.log('解析后的数据:', { teamId, userId, reason: reason?.substring(0, 50) + '...' });

      // 检查团队是否存在
      console.log('正在查找团队...');
      const team = await Team.findByPk(teamId);
      if (!team) {
        console.log('团队不存在:', teamId);
        return res.status(404).json({
          success: false,
          message: '团队不存在'
        });
      }
      console.log('找到团队:', { id: team.id, name: team.name });

      // 检查用户是否可以申请
      console.log('正在检查用户是否可以申请...');
      const canApplyResult = await Team.canUserApply(teamId, userId);
      console.log('申请检查结果:', canApplyResult);

      if (!canApplyResult.canApply) {
        console.log('用户不能申请，原因:', canApplyResult.reason);
        return res.status(400).json({
          success: false,
          message: canApplyResult.reason
        });
      }

      // 创建申请
      console.log('正在创建申请记录...');
      const application = await TeamApplication.create({
        teamId,
        userId,
        reason: reason || '',
        status: 'pending'
      });
      console.log('申请创建成功:', { id: application.id, status: application.status });

      logger.info(`用户 ${userId} 申请加入团队 ${teamId}`);
      console.log('=== 团队申请请求成功 ===\n');

      res.json({
        success: true,
        message: '申请提交成功，请等待审核',
        data: {
          id: application.id,
          status: application.status,
          applicationTime: application.applicationTime
        }
      });
    } catch (error) {
      console.error('\n=== 团队申请请求失败 ===');
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        sql: error.original?.sql,
        parameters: error.original?.parameters
      });
      logger.error('申请加入团队失败:', error);
      res.status(500).json({
        success: false,
        message: '申请失败，请稍后重试'
      });
    }
  }

  // 获取团队的申请列表
  async getTeamApplications(req, res) {
    try {
      const { teamId } = req.params;
      const { status, page = 1, limit = 20 } = req.query;
      const userId = req.user.id;

      console.log('\n=== 获取团队申请列表 ===');
      console.log('参数:', { teamId, userId, status, page, limit });

      // 检查权限（团队创建者或管理员）
      const team = await Team.findByPk(teamId, {
        include: [
          {
            model: TeamMember,
            as: 'TeamMembers',
            where: {
              user_id: userId,
              role: 'admin'
            },
            required: false
          }
        ]
      });

      console.log('团队查询结果:', team ? '找到团队' : '未找到团队');
      if (team) {
        console.log('团队创建者:', team.creator_id);
        console.log('当前用户:', userId);
        console.log('团队成员数量:', team.TeamMembers ? team.TeamMembers.length : 0);
      }

      if (!team || (team.creator_id !== userId && !team.TeamMembers.length)) {
        console.log('权限检查失败');
        return res.status(403).json({
          success: false,
          message: '无权限查看申请列表'
        });
      }

      const where = { teamId };
      if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
        where.status = status;
      }

      const { count, rows } = await TeamApplication.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname', 'email', 'profile']
          },
          {
            model: User,
            as: 'approver',
            attributes: ['id', 'username', 'nickname'],
            required: false
          },
          {
            model: User,
            as: 'rejecter',
            attributes: ['id', 'username', 'nickname'],
            required: false
          }
        ],
        order: [['applicationTime', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      res.json({
        success: true,
        data: {
          applications: rows,
          total: count,
          page: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error('获取团队申请列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取申请列表失败'
      });
    }
  }

  // 获取我的申请记录
  async getMyApplications(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const userId = req.user.id;

      const where = { userId };
      if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
        where.status = status;
      }

      const { count, rows } = await TeamApplication.findAndCountAll({
        where,
        include: [
          {
            model: Team,
            as: 'team',
            attributes: ['id', 'name', 'avatarUrl', 'status']
          }
        ],
        order: [['applicationTime', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      res.json({
        success: true,
        data: {
          applications: rows,
          total: count,
          page: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error('获取我的申请记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取申请记录失败'
      });
    }
  }

  // 批准申请
  async approveApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const userId = req.user.id;

      const application = await TeamApplication.findByPk(applicationId, {
        include: [
          {
            model: Team,
            as: 'team'
          }
        ]
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: '申请不存在'
        });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '申请已被处理'
        });
      }

      // 检查权限
      const isAdmin = await TeamMember.findOne({
        where: {
          teamId: application.teamId,
          userId,
          role: 'admin'
        }
      });

      if (!isAdmin && application.team.creator_id !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权限处理此申请'
        });
      }

      // 开启事务
      const transaction = await TeamApplication.sequelize.transaction();

      try {
        // 更新申请状态
        await application.approve(userId, { transaction });

        // 创建团队成员记录
        await TeamMember.create({
          teamId: application.teamId,
          userId: application.userId,
          role: 'member',
          joinedAt: new Date()
        }, { transaction });

        // 更新团队人数
        await application.team.increment('memberCount', { transaction });

        await transaction.commit();

        logger.info(`用户 ${userId} 批准了申请 ${applicationId}`);

        res.json({
          success: true,
          message: '申请已批准'
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('批准申请失败:', error);
      res.status(500).json({
        success: false,
        message: '批准申请失败'
      });
    }
  }

  // 拒绝申请
  async rejectApplication(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { applicationId } = req.params;
      const { rejectionReason } = req.body;
      const userId = req.user.id;

      const application = await TeamApplication.findByPk(applicationId, {
        include: [
          {
            model: Team,
            as: 'team'
          }
        ]
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: '申请不存在'
        });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '申请已被处理'
        });
      }

      // 检查权限
      const isAdmin = await TeamMember.findOne({
        where: {
          teamId: application.teamId,
          userId,
          role: 'admin'
        }
      });

      if (!isAdmin && application.team.creator_id !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权限处理此申请'
        });
      }

      // 更新申请状态
      await application.reject(userId, rejectionReason);

      logger.info(`用户 ${userId} 拒绝了申请 ${applicationId}，原因：${rejectionReason}`);

      res.json({
        success: true,
        message: '申请已拒绝'
      });
    } catch (error) {
      logger.error('拒绝申请失败:', error);
      res.status(500).json({
        success: false,
        message: '拒绝申请失败'
      });
    }
  }

  // 取消申请
  async cancelApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const userId = req.user.id;

      const application = await TeamApplication.findByPk(applicationId);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: '申请不存在'
        });
      }

      if (application.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权限取消此申请'
        });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '只能取消待处理的申请'
        });
      }

      await application.cancel();

      logger.info(`用户 ${userId} 取消了申请 ${applicationId}`);

      res.json({
        success: true,
        message: '申请已取消'
      });
    } catch (error) {
      logger.error('取消申请失败:', error);
      res.status(500).json({
        success: false,
        message: '取消申请失败'
      });
    }
  }

  // 获取申请详情
  async getApplicationDetail(req, res) {
    try {
      const { applicationId } = req.params;
      const userId = req.user.id;

      const application = await TeamApplication.findByPk(applicationId, {
        include: [
          {
            model: Team,
            as: 'team',
            attributes: ['id', 'name', 'avatarUrl', 'creator_id']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'nickname', 'email', 'profile']
          },
          {
            model: User,
            as: 'approver',
            attributes: ['id', 'username', 'nickname'],
            required: false
          },
          {
            model: User,
            as: 'rejecter',
            attributes: ['id', 'username', 'nickname'],
            required: false
          }
        ]
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: '申请不存在'
        });
      }

      // 检查权限
      const isApplicant = application.userId === userId;
      const isTeamAdmin = application.team.creator_id === userId ||
        await TeamMember.findOne({
          where: {
            teamId: application.teamId,
            userId,
            role: 'admin'
          }
        });

      if (!isApplicant && !isTeamAdmin) {
        return res.status(403).json({
          success: false,
          message: '无权限查看此申请'
        });
      }

      res.json({
        success: true,
        data: application
      });
    } catch (error) {
      logger.error('获取申请详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取申请详情失败'
      });
    }
  }
}

module.exports = new TeamApplicationController();