const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityParticipant = sequelize.define('ActivityParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  activity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'activities',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('registered', 'attended', 'absent', 'cancelled'),
    defaultValue: 'registered'
  },
  registered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'activity_participants',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['activity_id', 'user_id']
    }
  ]
});

// 定义关联关系
ActivityParticipant.associate = (models) => {
  // 参与记录属于活动
  ActivityParticipant.belongsTo(models.Activity, {
    foreignKey: 'activity_id',
    as: 'activity'
  });

  // 参与记录属于用户
  ActivityParticipant.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

module.exports = ActivityParticipant;