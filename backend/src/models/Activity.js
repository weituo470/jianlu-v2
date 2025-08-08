const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Activity = sequelize.define('Activity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  team_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'teams',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('meeting', 'event', 'training', 'other'),
    allowNull: false
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  max_participants: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  current_participants: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled'),
    defaultValue: 'draft'
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'activities',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义关联关系
Activity.associate = (models) => {
  // 活动属于团队
  Activity.belongsTo(models.Team, {
    foreignKey: 'team_id',
    as: 'team'
  });

  // 活动属于创建者
  Activity.belongsTo(models.User, {
    foreignKey: 'creator_id',
    as: 'creator'
  });

  // 活动有多个参与者
  Activity.belongsToMany(models.User, {
    through: models.ActivityParticipant,
    foreignKey: 'activity_id',
    otherKey: 'user_id',
    as: 'participants'
  });

  // 活动属于活动类型
  Activity.belongsTo(models.ActivityType, {
    foreignKey: 'type',
    targetKey: 'id',
    as: 'activityType'
  });
};

// 静态方法：获取活动详情（包含关联数据）
Activity.findWithDetails = async function(id) {
  return await this.findByPk(id, {
    include: [
      {
        model: sequelize.models.Team,
        as: 'team',
        attributes: ['id', 'name']
      },
      {
        model: sequelize.models.User,
        as: 'creator',
        attributes: ['id', 'username', 'email', 'profile']
      }
    ]
  });
};

// 实例方法：获取参与者数量
Activity.prototype.getParticipantCount = async function() {
  const count = await sequelize.models.ActivityParticipant.count({
    where: {
      activity_id: this.id,
      status: ['registered', 'attended']
    }
  });
  
  // 更新当前参与者数量
  if (count !== this.current_participants) {
    await this.update({ current_participants: count });
  }
  
  return count;
};

// 实例方法：检查是否可以参与
Activity.prototype.canParticipate = function() {
  if (this.status !== 'published') return false;
  if (this.max_participants && this.current_participants >= this.max_participants) return false;
  if (new Date() > new Date(this.end_time)) return false;
  return true;
};

module.exports = Activity;