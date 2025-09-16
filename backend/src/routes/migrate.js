const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { success, error } = require('../utils/response');

/**
 * 执行活动序号字段迁移
 * POST /api/migrate/activity-sequence
 */
router.post('/activity-sequence', authenticateToken, requirePermission('admin'), async (req, res) => {
  try {
    logger.info('开始执行活动序号字段迁移...');

    // 检查字段是否已存在
    const [results] = await sequelize.query(
      `SHOW COLUMNS FROM activities LIKE 'sequence_number'`
    );

    if (results.length > 0) {
      return success(res, null, '序号字段已存在，无需迁移');
    }

    // 添加序号字段
    await sequelize.query(`
      ALTER TABLE activities
      ADD COLUMN sequence_number INT NOT NULL DEFAULT 0 COMMENT '活动序号，用于排序，数值越大越新'
    `);

    // 创建索引
    await sequelize.query(`
      CREATE INDEX idx_activities_sequence_number ON activities(sequence_number)
    `);

    // 更新现有活动的序号（按创建时间倒序）
    await sequelize.query(`
      SET @row_number = 0;
      UPDATE activities
      SET sequence_number = (@row_number := @row_number + 1)
      ORDER BY created_at DESC
    `);

    logger.info('活动序号字段迁移完成');
    return success(res, null, '活动序号字段迁移成功');

  } catch (err) {
    logger.error('活动序号字段迁移失败:', err);
    return error(res, '迁移失败: ' + err.message, 500);
  }
});

/**
 * 检查迁移状态
 * GET /api/migrate/status
 */
router.get('/status', authenticateToken, requirePermission('admin'), async (req, res) => {
  try {
    // 检查序号字段
    const [sequenceResults] = await sequelize.query(
      `SHOW COLUMNS FROM activities LIKE 'sequence_number'`
    );

    const hasSequence = sequenceResults.length > 0;

    // 获取活动总数
    const [countResults] = await sequelize.query(
      `SELECT COUNT(*) as total FROM activities`
    );
    const totalActivities = countResults[0].total;

    // 获取有序号的活动数量
    let activitiesWithSequence = 0;
    if (hasSequence) {
      const [sequenceCountResults] = await sequelize.query(
        `SELECT COUNT(*) as count FROM activities WHERE sequence_number > 0`
      );
      activitiesWithSequence = sequenceCountResults[0].count;
    }

    return success(res, {
      hasSequenceField: hasSequence,
      totalActivities,
      activitiesWithSequence,
      migrationNeeded: !hasSequence || activitiesWithSequence < totalActivities
    }, '获取迁移状态成功');

  } catch (err) {
    logger.error('获取迁移状态失败:', err);
    return error(res, '获取状态失败: ' + err.message, 500);
  }
});

module.exports = router;