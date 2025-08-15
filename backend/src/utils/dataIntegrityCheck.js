const logger = require('./logger');
const { User, UserDeletionAudit } = require('../models');

/**
 * 数据完整性检查工具
 * 用于验证用户删除操作的数据一致性
 */
class DataIntegrityChecker {
  
  /**
   * 检查用户数据完整性
   * @returns {Promise<Object>} 检查结果
   */
  static async checkUserDataIntegrity() {
    try {
      logger.info('开始用户数据完整性检查...');
      
      const results = {
        timestamp: new Date().toISOString(),
        checks: [],
        passed: true,
        summary: {}
      };

      // 检查1: 删除用户是否有对应的审计记录
      const deletedUsersCheck = await this.checkDeletedUsersAudit();
      results.checks.push(deletedUsersCheck);
      if (!deletedUsersCheck.passed) results.passed = false;

      // 检查2: 用户名和邮箱唯一性
      const uniquenessCheck = await this.checkUsernameEmailUniqueness();
      results.checks.push(uniquenessCheck);
      if (!uniquenessCheck.passed) results.passed = false;

      // 检查3: 软删除用户的状态一致性
      const statusConsistencyCheck = await this.checkDeletedUserStatus();
      results.checks.push(statusConsistencyCheck);
      if (!statusConsistencyCheck.passed) results.passed = false;

      // 生成摘要
      results.summary = {
        totalChecks: results.checks.length,
        passedChecks: results.checks.filter(c => c.passed).length,
        failedChecks: results.checks.filter(c => !c.passed).length,
        overallStatus: results.passed ? '✅ 通过' : '❌ 失败'
      };

      logger.info('用户数据完整性检查完成', results.summary);
      return results;

    } catch (error) {
      logger.error('数据完整性检查异常:', error);
      throw new Error(`数据完整性检查失败: ${error.message}`);
    }
  }

  /**
   * 检查删除用户是否有对应的审计记录
   */
  static async checkDeletedUsersAudit() {
    try {
      const deletedUsers = await User.findAll({ 
        where: { status: 'deleted' },
        attributes: ['id', 'username', 'deleted_at']
      });

      const auditRecords = await UserDeletionAudit.findAll({
        attributes: ['original_user_id', 'deleted_at']
      });

      const missingAudits = deletedUsers.filter(user => 
        !auditRecords.find(audit => audit.original_user_id === user.id)
      );

      return {
        name: '删除用户审计记录检查',
        passed: missingAudits.length === 0,
        details: {
          deletedUsersCount: deletedUsers.length,
          auditRecordsCount: auditRecords.length,
          missingAuditsCount: missingAudits.length,
          missingAudits: missingAudits.map(u => ({
            id: u.id,
            username: u.username,
            deleted_at: u.deleted_at
          }))
        },
        message: missingAudits.length === 0 
          ? '所有删除用户都有对应的审计记录' 
          : `发现 ${missingAudits.length} 个删除用户缺少审计记录`
      };

    } catch (error) {
      return {
        name: '删除用户审计记录检查',
        passed: false,
        error: error.message,
        message: '检查过程中发生异常'
      };
    }
  }

  /**
   * 检查用户名和邮箱唯一性
   */
  static async checkUsernameEmailUniqueness() {
    try {
      // 检查活跃用户中的用户名重复
      const duplicateUsernames = await User.findAll({
        where: { status: { [require('sequelize').Op.ne]: 'deleted' } },
        attributes: ['username'],
        group: ['username'],
        having: require('sequelize').literal('COUNT(*) > 1'),
        raw: true
      });

      // 检查活跃用户中的邮箱重复
      const duplicateEmails = await User.findAll({
        where: { status: { [require('sequelize').Op.ne]: 'deleted' } },
        attributes: ['email'],
        group: ['email'],
        having: require('sequelize').literal('COUNT(*) > 1'),
        raw: true
      });

      const hasDuplicates = duplicateUsernames.length > 0 || duplicateEmails.length > 0;

      return {
        name: '用户名邮箱唯一性检查',
        passed: !hasDuplicates,
        details: {
          duplicateUsernames: duplicateUsernames.map(u => u.username),
          duplicateEmails: duplicateEmails.map(u => u.email)
        },
        message: hasDuplicates 
          ? `发现重复用户名 ${duplicateUsernames.length} 个，重复邮箱 ${duplicateEmails.length} 个`
          : '用户名和邮箱唯一性正常'
      };

    } catch (error) {
      return {
        name: '用户名邮箱唯一性检查',
        passed: false,
        error: error.message,
        message: '检查过程中发生异常'
      };
    }
  }

  /**
   * 检查软删除用户的状态一致性
   */
  static async checkDeletedUserStatus() {
    try {
      // 查找状态为deleted但deleted_at为空的用户
      const inconsistentUsers = await User.findAll({
        where: {
          status: 'deleted',
          deleted_at: null
        },
        attributes: ['id', 'username', 'status', 'deleted_at']
      });

      // 查找deleted_at不为空但状态不是deleted的用户
      const { Op } = require('sequelize');
      const inconsistentUsers2 = await User.findAll({
        where: {
          deleted_at: { [Op.ne]: null },
          status: { [Op.ne]: 'deleted' }
        },
        attributes: ['id', 'username', 'status', 'deleted_at']
      });

      const totalInconsistent = inconsistentUsers.length + inconsistentUsers2.length;

      return {
        name: '删除状态一致性检查',
        passed: totalInconsistent === 0,
        details: {
          deletedWithoutTimestamp: inconsistentUsers.length,
          timestampWithoutDeleted: inconsistentUsers2.length,
          inconsistentUsers: [
            ...inconsistentUsers.map(u => ({ ...u.toJSON(), issue: 'deleted状态但deleted_at为空' })),
            ...inconsistentUsers2.map(u => ({ ...u.toJSON(), issue: 'deleted_at不为空但状态不是deleted' }))
          ]
        },
        message: totalInconsistent === 0 
          ? '删除状态一致性正常' 
          : `发现 ${totalInconsistent} 个用户状态不一致`
      };

    } catch (error) {
      return {
        name: '删除状态一致性检查',
        passed: false,
        error: error.message,
        message: '检查过程中发生异常'
      };
    }
  }

  /**
   * 修复数据不一致问题
   * @param {Object} checkResults 检查结果
   */
  static async fixDataInconsistencies(checkResults) {
    logger.info('开始修复数据不一致问题...');
    
    const fixes = [];
    
    for (const check of checkResults.checks) {
      if (!check.passed) {
        try {
          const fix = await this.fixSpecificIssue(check);
          fixes.push(fix);
        } catch (error) {
          logger.error(`修复 ${check.name} 失败:`, error);
          fixes.push({
            checkName: check.name,
            success: false,
            error: error.message
          });
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      fixes,
      summary: {
        totalFixes: fixes.length,
        successfulFixes: fixes.filter(f => f.success).length,
        failedFixes: fixes.filter(f => !f.success).length
      }
    };
  }

  /**
   * 修复特定问题
   */
  static async fixSpecificIssue(check) {
    switch (check.name) {
      case '删除状态一致性检查':
        return await this.fixDeletedStatusInconsistency(check);
      default:
        return {
          checkName: check.name,
          success: false,
          message: '暂不支持自动修复此类问题'
        };
    }
  }

  /**
   * 修复删除状态不一致问题
   */
  static async fixDeletedStatusInconsistency(check) {
    const { inconsistentUsers } = check.details;
    let fixedCount = 0;

    for (const user of inconsistentUsers) {
      try {
        if (user.issue === 'deleted状态但deleted_at为空') {
          // 为deleted状态的用户添加deleted_at时间戳
          await User.update(
            { deleted_at: new Date() },
            { where: { id: user.id } }
          );
          fixedCount++;
        } else if (user.issue === 'deleted_at不为空但状态不是deleted') {
          // 将有deleted_at的用户状态改为deleted
          await User.update(
            { status: 'deleted' },
            { where: { id: user.id } }
          );
          fixedCount++;
        }
      } catch (error) {
        logger.error(`修复用户 ${user.id} 状态失败:`, error);
      }
    }

    return {
      checkName: check.name,
      success: fixedCount > 0,
      fixedCount,
      totalIssues: inconsistentUsers.length,
      message: `成功修复 ${fixedCount}/${inconsistentUsers.length} 个状态不一致问题`
    };
  }
}

module.exports = DataIntegrityChecker;