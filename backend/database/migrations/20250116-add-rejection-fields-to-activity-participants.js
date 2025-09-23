const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('activity_participants', 'rejection_reason', {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '拒绝原因'
    });

    await queryInterface.addColumn('activity_participants', 'rejected_at', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '拒绝时间'
    });

    await queryInterface.addColumn('activity_participants', 'rejected_by', {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '拒绝者ID'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('activity_participants', 'rejection_reason');
    await queryInterface.removeColumn('activity_participants', 'rejected_at');
    await queryInterface.removeColumn('activity_participants', 'rejected_by');
  }
};