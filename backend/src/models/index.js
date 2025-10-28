const { sequelize } = require('../config/database');

// 导入所有模型
const User = require('./User');
const Team = require('./Team');
const TeamMember = require('./TeamMember');
const TeamType = require('./TeamType');
const Activity = require('./Activity');
const ActivityType = require('./ActivityType');
const ActivityParticipant = require('./ActivityParticipant');
const UserActivity = require('./UserActivity');
const UserDeletionAudit = require('./UserDeletionAudit');
const { UserAccount, AccountTransaction } = require('./UserAccount');
const { ActivityRegistration, ActivityCostSharing } = require('./ActivityRegistration');
const TeamApplication = require('./TeamApplication');
const TeamApplicationHistory = require('./TeamApplicationHistory');
const ActivityExpense = require('./ActivityExpense');
const Message = require('./Message');
const MessageTemplate = require('./MessageTemplate');

// 创建模型对象
const models = {
  User,
  Team,
  TeamMember,
  TeamType,
  Activity,
  ActivityType,
  ActivityParticipant,
  UserActivity,
  UserDeletionAudit,
  UserAccount,
  AccountTransaction,
  ActivityRegistration,
  ActivityCostSharing,
  TeamApplication,
  TeamApplicationHistory,
  ActivityExpense,
  Message,
  MessageTemplate
};

// 初始化所有模型关联
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// 将模型添加到sequelize实例
sequelize.models = models;

module.exports = {
  sequelize,
  ...models
};