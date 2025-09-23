// 创建活动申请历史记录表的迁移文件
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('activity_application_histories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      activity_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'activities',
          key: 'id'
        },
        comment: '活动ID'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: '用户ID'
      },
      participant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'activity_participants',
          key: 'id'
        },
        comment: '参与者记录ID'
      },
      old_status: {
        type: Sequelize.ENUM('pending', 'registered', 'approved', 'attended', 'absent', 'cancelled', 'rejected'),
        allowNull: true,
        comment: '原状态'
      },
      new_status: {
        type: Sequelize.ENUM('pending', 'registered', 'approved', 'attended', 'absent', 'cancelled', 'rejected'),
        allowNull: false,
        comment: '新状态'
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: '操作人ID'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '操作原因'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: '创建时间'
      }
    });

    // 添加索引
    await queryInterface.addIndex('activity_application_histories', ['activity_id']);
    await queryInterface.addIndex('activity_application_histories', ['user_id']);
    await queryInterface.addIndex('activity_application_histories', ['participant_id']);
    await queryInterface.addIndex('activity_application_histories', ['changed_by']);
    await queryInterface.addIndex('activity_application_histories', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('activity_application_histories');
  }
};