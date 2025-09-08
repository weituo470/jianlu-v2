const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrganizationHierarchy = sequelize.define('OrganizationHierarchy', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ancestor_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'organizations', key: 'id' }
  },
  descendant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'organizations', key: 'id' }
  },
  depth: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '层级深度：0=自己，1=直接子级，2=孙子级'
  }
}, {
  tableName: 'organization_hierarchies',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['ancestor_id', 'descendant_id'] },
    { fields: ['ancestor_id'] },
    { fields: ['descendant_id'] },
    { fields: ['depth'] }
  ]
});

// 关联关系
OrganizationHierarchy.associate = (models) => {
  OrganizationHierarchy.belongsTo(models.Organization, {
    foreignKey: 'ancestor_id',
    as: 'ancestor'
  });
  
  OrganizationHierarchy.belongsTo(models.Organization, {
    foreignKey: 'descendant_id',
    as: 'descendant'
  });
};

// 类方法：获取所有子级机构
OrganizationHierarchy.getDescendants = async function(ancestorId, maxDepth = null) {
  const where = { ancestor_id: ancestorId, depth: { [require('sequelize').Op.gt]: 0 } };
  if (maxDepth) {
    where.depth = { [require('sequelize').Op.lte]: maxDepth };
  }
  
  return await this.findAll({
    where,
    include: [
      {
        model: sequelize.models.Organization,
        as: 'descendant'
      }
    ],
    order: [['depth', 'ASC']]
  });
};

// 类方法：获取所有父级机构
OrganizationHierarchy.getAncestors = async function(descendantId) {
  return await this.findAll({
    where: { 
      descendant_id: descendantId,
      depth: { [require('sequelize').Op.gt]: 0 }
    },
    include: [
      {
        model: sequelize.models.Organization,
        as: 'ancestor'
      }
    ],
    order: [['depth', 'DESC']]
  });
};

module.exports = OrganizationHierarchy;