const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DataDictionary = sequelize.define('DataDictionary', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '字典分类，如：organization_category, expense_type等'
  },
  key_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '字典键名，用于程序调用'
  },
  display_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '显示名称，用于界面展示'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '详细描述'
  },
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'data_dictionaries', key: 'id' },
    comment: '父级字典ID，支持层级结构'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 999,
    comment: '排序顺序'
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为系统预设字典'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  extra_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '扩展数据，存储额外属性'
  }
}, {
  tableName: 'data_dictionaries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['category'] },
    { fields: ['key_name'] },
    { fields: ['parent_id'] },
    { fields: ['is_active'] },
    { unique: true, fields: ['category', 'key_name'] }
  ]
});

// 关联关系
DataDictionary.associate = (models) => {
  // 自关联：父子关系
  DataDictionary.belongsTo(DataDictionary, {
    foreignKey: 'parent_id',
    as: 'parent'
  });
  
  DataDictionary.hasMany(DataDictionary, {
    foreignKey: 'parent_id',
    as: 'children'
  });
};

// 类方法
DataDictionary.findByCategory = async function(category, options = {}) {
  return await this.findAll({
    where: {
      category,
      is_active: true
    },
    order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    ...options
  });
};

DataDictionary.findByKey = async function(category, keyName) {
  return await this.findOne({
    where: {
      category,
      key_name: keyName,
      is_active: true
    }
  });
};

// 获取层级结构数据
DataDictionary.findHierarchy = async function(category, parentId = null) {
  const items = await this.findAll({
    where: {
      category,
      parent_id: parentId,
      is_active: true
    },
    order: [['sort_order', 'ASC']]
  });

  // 递归获取子级
  for (let item of items) {
    const children = await this.findHierarchy(category, item.id);
    item.dataValues.children = children;
  }

  return items;
};

// 批量创建字典数据
DataDictionary.bulkCreateDictionary = async function(category, items, transaction = null) {
  const dictionaries = items.map((item, index) => ({
    category,
    key_name: item.key || item.key_name,
    display_name: item.name || item.display_name,
    description: item.description || '',
    sort_order: item.sort_order || (index + 1),
    is_system: item.is_system || false,
    extra_data: item.extra_data || null
  }));

  return await this.bulkCreate(dictionaries, {
    ignoreDuplicates: true,
    transaction
  });
};

// 获取所有字典分类
DataDictionary.getAllCategories = async function() {
  const result = await this.findAll({
    attributes: ['category'],
    group: ['category'],
    where: { is_active: true }
  });
  
  return result.map(item => item.category);
};

// 初始化系统字典数据
DataDictionary.initializeSystemDictionaries = async function() {
  const systemDictionaries = [
    // 机构分类标签
    {
      category: 'organization_category',
      items: [
        { key: 'business_association', name: '商会', sort_order: 1 },
        { key: 'association', name: '协会', sort_order: 2 },
        { key: 'society', name: '社团', sort_order: 3 },
        { key: 'institution', name: '机构', sort_order: 4 },
        { key: 'club', name: '俱乐部', sort_order: 5 },
        { key: 'outdoor', name: '户外', sort_order: 6 },
        { key: 'sports', name: '体育', sort_order: 7 },
        { key: 'basketball', name: '篮球', sort_order: 8 },
        { key: 'badminton', name: '羽毛球', sort_order: 9 },
        { key: 'pingpong', name: '乒乓球', sort_order: 10 },
        { key: 'football', name: '足球', sort_order: 11 },
        { key: 'photography', name: '摄影', sort_order: 12 },
        { key: 'calligraphy', name: '书法', sort_order: 13 },
        { key: 'art', name: '美术', sort_order: 14 },
        { key: 'reading', name: '读书', sort_order: 15 },
        { key: 'chinese_studies', name: '国学', sort_order: 16 },
        { key: 'charity', name: '爱心公益', sort_order: 17 },
        { key: 'classmates', name: '同学', sort_order: 18 },
        { key: 'veterans', name: '战友', sort_order: 19 },
        { key: 'family_friends', name: '亲友', sort_order: 20 },
        { key: 'colleagues', name: '同事', sort_order: 21 },
        { key: 'education', name: '教培', sort_order: 22 },
        { key: 'volunteer', name: '志愿者', sort_order: 23 },
        { key: 'friends', name: '好友', sort_order: 24 },
        { key: 'beauty', name: '美容', sort_order: 25 },
        { key: 'food_drink', name: '吃喝', sort_order: 26 },
        { key: 'entertainment', name: '娱乐', sort_order: 27 },
        { key: 'other', name: '其他', sort_order: 28 }
      ]
    },
    // 活动分类标签
    {
      category: 'activity_category',
      items: [
        { key: 'parent_child', name: '亲子活动', sort_order: 1 },
        { key: 'travel_agency', name: '旅行社旅游', sort_order: 2 },
        { key: 'charity', name: '公益活动', sort_order: 3 },
        { key: 'growth_record', name: '成长记录', sort_order: 4 },
        { key: 'club_activity', name: '俱乐部活动', sort_order: 5 },
        { key: 'outdoor_hiking', name: '驴友户外', sort_order: 6 },
        { key: 'team_building', name: '团建活动', sort_order: 7 },
        { key: 'education_record', name: '教培记录', sort_order: 8 },
        { key: 'daily_accounting', name: '日常记账', sort_order: 9 },
        { key: 'pet_record', name: '萌宠记录', sort_order: 10 },
        { key: 'classmate_gathering', name: '同学会活动', sort_order: 11 },
        { key: 'veteran_gathering', name: '战友会活动', sort_order: 12 },
        { key: 'project_record', name: '项目记录', sort_order: 13 },
        { key: 'society_activity', name: '社团活动', sort_order: 14 }
      ]
    },
    // 活动收入分类
    {
      category: 'activity_income_type',
      items: [
        { key: 'group_fee', name: '团费', sort_order: 1 },
        { key: 'sponsorship', name: '赞助', sort_order: 2 },
        { key: 'crowdfunding', name: '众筹', sort_order: 3 },
        { key: 'other', name: '其他', sort_order: 4 }
      ]
    },
    // 活动支出分类
    {
      category: 'activity_expense_type',
      items: [
        { key: 'meal', name: '餐费', sort_order: 1 },
        { key: 'transportation', name: '交通费', sort_order: 2 },
        { key: 'accommodation', name: '住宿费', sort_order: 3 },
        { key: 'ticket', name: '门票费', sort_order: 4 },
        { key: 'insurance', name: '保险费', sort_order: 5 },
        { key: 'certificate', name: '证件费', sort_order: 6 },
        { key: 'service', name: '劳务费', sort_order: 7 },
        { key: 'medical', name: '医疗费', sort_order: 8 },
        { key: 'aa_expense', name: 'AA开支', sort_order: 9 },
        { key: 'tip', name: '小费', sort_order: 10 },
        { key: 'other', name: '其他', sort_order: 11 }
      ]
    },
    // 个人收入分类
    {
      category: 'personal_income_type',
      items: [
        { key: 'salary', name: '工薪', sort_order: 1 },
        { key: 'investment', name: '投资收益', sort_order: 2 },
        { key: 'part_time', name: '兼职', sort_order: 3 },
        { key: 'gift', name: '受赠', sort_order: 4 },
        { key: 'entertainment', name: '娱乐', sort_order: 5 },
        { key: 'social_income', name: '人情收入', sort_order: 6 },
        { key: 'other', name: '其他', sort_order: 7 }
      ]
    },
    // 个人支出分类
    {
      category: 'personal_expense_type',
      items: [
        { key: 'food', name: '食品', sort_order: 1 },
        { key: 'daily_goods', name: '日用品', sort_order: 2 },
        { key: 'education', name: '教育', sort_order: 3 },
        { key: 'entertainment', name: '娱乐', sort_order: 4 },
        { key: 'travel', name: '旅游', sort_order: 5 },
        { key: 'clothing', name: '衣着', sort_order: 6 },
        { key: 'housing', name: '住房', sort_order: 7 },
        { key: 'transportation', name: '交通', sort_order: 8 },
        { key: 'medical', name: '医疗', sort_order: 9 },
        { key: 'communication', name: '通信', sort_order: 10 },
        { key: 'investment', name: '投资', sort_order: 11 },
        { key: 'home_appliance', name: '家居电器', sort_order: 12 },
        { key: 'housekeeping', name: '家政', sort_order: 13 },
        { key: 'donation', name: '捐赠', sort_order: 14 },
        { key: 'social_expense', name: '人情开支', sort_order: 15 },
        { key: 'other', name: '其他', sort_order: 16 }
      ]
    },
    // 机构收入分类
    {
      category: 'organization_income_type',
      items: [
        { key: 'membership_fee', name: '会费', sort_order: 1 },
        { key: 'sponsorship', name: '赞助', sort_order: 2 },
        { key: 'investment', name: '投资收益', sort_order: 3 },
        { key: 'commission', name: '中介费', sort_order: 4 },
        { key: 'grant', name: '拨款', sort_order: 5 },
        { key: 'other', name: '其他', sort_order: 6 }
      ]
    },
    // 机构支出分类
    {
      category: 'organization_expense_type',
      items: [
        { key: 'rent', name: '租金', sort_order: 1 },
        { key: 'utilities', name: '水电', sort_order: 2 },
        { key: 'promotion', name: '宣传', sort_order: 3 },
        { key: 'salary', name: '工资', sort_order: 4 },
        { key: 'charity', name: '慈善', sort_order: 5 },
        { key: 'sponsorship', name: '赞助', sort_order: 6 },
        { key: 'welfare', name: '慰问', sort_order: 7 },
        { key: 'activity', name: '活动', sort_order: 8 },
        { key: 'team_building', name: '团建', sort_order: 9 },
        { key: 'reception', name: '接待', sort_order: 10 },
        { key: 'external_relations', name: '外联', sort_order: 11 },
        { key: 'investment', name: '投资', sort_order: 12 },
        { key: 'other', name: '其他', sort_order: 13 }
      ]
    }
  ];

  const results = [];
  for (const dict of systemDictionaries) {
    const created = await this.bulkCreateDictionary(dict.category, dict.items.map(item => ({
      ...item,
      is_system: true
    })));
    results.push({ category: dict.category, count: created.length });
  }

  return results;
};

module.exports = DataDictionary;