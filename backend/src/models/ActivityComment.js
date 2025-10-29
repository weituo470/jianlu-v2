const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ActivityComment extends Model {
  static associate(models) {
    // 一个评论属于一个活动
    this.belongsTo(models.Activity, {
      foreignKey: 'activity_id',
      as: 'activity'
    });

    // 一个评论属于一个用户
    this.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // 一个评论可以有一个父评论（用于回复）
    this.belongsTo(this, {
      foreignKey: 'parent_id',
      as: 'parent'
    });

    // 一个评论可以有多个子评论（回复）
    this.hasMany(this, {
      foreignKey: 'parent_id',
      as: 'replies'
    });
  }
}

ActivityComment.init({
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  activity_id: {
    type: DataTypes.STRING(36),
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING(36),
    allowNull: false
  },
  parent_id: {
    type: DataTypes.STRING(36),
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'ActivityComment',
  tableName: 'activity_comments',
  timestamps: true,
  paranoid: true, // 启用软删除
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

module.exports = ActivityComment;