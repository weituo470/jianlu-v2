const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const DataDictionary = require('../models/DataDictionary');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const Joi = require('joi');

// 字典验证模式
const createDictionarySchema = Joi.object({
  category: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': '字典分类至少1个字符',
      'string.max': '字典分类最多100个字符',
      'any.required': '字典分类不能为空'
    }),
  key_name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': '字典键名至少1个字符',
      'string.max': '字典键名最多100个字符',
      'any.required': '字典键名不能为空'
    }),
  display_name: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.min': '显示名称至少1个字符',
      'string.max': '显示名称最多200个字符',
      'any.required': '显示名称不能为空'
    }),
  description: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': '描述不能超过1000个字符'
    }),
  parent_id: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.uuid': '父级ID格式不正确'
    }),
  sort_order: Joi.number()
    .integer()
    .min(0)
    .default(999)
    .messages({
      'number.integer': '排序必须是整数',
      'number.min': '排序不能小于0'
    }),
  extra_data: Joi.object()
    .allow(null)
});

// 获取所有字典分类
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await DataDictionary.getAllCategories();
    
    // 为每个分类添加描述信息
    const categoryInfo = {
      'organization_category': '机构分类标签',
      'activity_category': '活动分类标签',
      'activity_income_type': '活动收入分类',
      'activity_expense_type': '活动支出分类',
      'personal_income_type': '个人收入分类',
      'personal_expense_type': '个人支出分类',
      'organization_income_type': '机构收入分类',
      'organization_expense_type': '机构支出分类'
    };

    const result = categories.map(category => ({
      category,
      description: categoryInfo[category] || category
    }));

    return success(res, result);

  } catch (err) {
    logger.error('获取字典分类失败:', err);
    return error(res, '获取字典分类失败', 500);
  }
});

// 获取指定分类的字典数据
router.get('/category/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const { include_hierarchy = 'false' } = req.query;

    let dictionaries;
    
    if (include_hierarchy === 'true') {
      // 获取层级结构数据
      dictionaries = await DataDictionary.findHierarchy(category);
    } else {
      // 获取平铺数据
      dictionaries = await DataDictionary.findByCategory(category);
    }

    return success(res, dictionaries);

  } catch (err) {
    logger.error('获取字典数据失败:', err);
    return error(res, '获取字典数据失败', 500);
  }
});

// 获取字典列表（支持搜索和分页）
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category = '',
      search = '',
      is_active = '',
      is_system = ''
    } = req.query;

    // 构建查询条件
    const where = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where[Op.or] = [
        { key_name: { [Op.like]: `%${search}%` } },
        { display_name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (is_active !== '') {
      where.is_active = is_active === 'true';
    }
    
    if (is_system !== '') {
      where.is_system = is_system === 'true';
    }

    // 分页参数
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = parseInt(limit);

    // 查询字典列表
    const { count, rows: dictionaries } = await DataDictionary.findAndCountAll({
      where,
      include: [
        {
          model: DataDictionary,
          as: 'parent',
          attributes: ['id', 'key_name', 'display_name']
        }
      ],
      order: [['category', 'ASC'], ['sort_order', 'ASC'], ['created_at', 'ASC']],
      limit: pageLimit,
      offset,
      distinct: true
    });

    return success(res, {
      dictionaries,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: count,
        pages: Math.ceil(count / pageLimit)
      }
    });

  } catch (err) {
    logger.error('获取字典列表失败:', err);
    return error(res, '获取字典列表失败', 500);
  }
});

// 创建字典项
router.post('/',
  authenticateToken,
  requirePermission(['system:manage_dictionaries']),
  validate(createDictionarySchema),
  async (req, res) => {
    try {
      const { category, key_name, display_name, description, parent_id, sort_order, extra_data } = req.body;

      // 检查键名是否已存在
      const existing = await DataDictionary.findByKey(category, key_name);
      if (existing) {
        return error(res, '该分类下键名已存在', 400);
      }

      // 如果有父级，检查父级是否存在且属于同一分类
      if (parent_id) {
        const parent = await DataDictionary.findByPk(parent_id);
        if (!parent) {
          return error(res, '父级字典项不存在', 404);
        }
        if (parent.category !== category) {
          return error(res, '父级字典项必须属于同一分类', 400);
        }
      }

      // 创建字典项
      const dictionary = await DataDictionary.create({
        category,
        key_name,
        display_name,
        description: description || '',
        parent_id: parent_id || null,
        sort_order: sort_order || 999,
        is_system: false,
        extra_data: extra_data || null
      });

      logger.info(`用户 ${req.user.username} 创建了字典项: ${category}.${key_name}`);
      return success(res, dictionary, '字典项创建成功', 201);

    } catch (err) {
      logger.error('创建字典项失败:', err);
      return error(res, '创建字典项失败', 500);
    }
  }
);

// 更新字典项
router.put('/:id',
  authenticateToken,
  requirePermission(['system:manage_dictionaries']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { key_name, display_name, description, parent_id, sort_order, is_active, extra_data } = req.body;

      // 查找字典项
      const dictionary = await DataDictionary.findByPk(id);
      if (!dictionary) {
        return error(res, '字典项不存在', 404);
      }

      // 系统预设字典项不能修改键名和分类
      if (dictionary.is_system && key_name && key_name !== dictionary.key_name) {
        return error(res, '系统预设字典项不能修改键名', 400);
      }

      // 检查键名是否重复（排除当前项）
      if (key_name && key_name !== dictionary.key_name) {
        const existing = await DataDictionary.findOne({
          where: {
            category: dictionary.category,
            key_name,
            id: { [Op.ne]: id },
            is_active: true
          }
        });
        
        if (existing) {
          return error(res, '该分类下键名已存在', 400);
        }
      }

      // 如果有父级，检查父级是否存在且属于同一分类
      if (parent_id) {
        const parent = await DataDictionary.findByPk(parent_id);
        if (!parent) {
          return error(res, '父级字典项不存在', 404);
        }
        if (parent.category !== dictionary.category) {
          return error(res, '父级字典项必须属于同一分类', 400);
        }
        // 不能将自己设为父级
        if (parent_id === id) {
          return error(res, '不能将自己设为父级', 400);
        }
      }

      // 更新字典项
      const updateData = {};
      if (key_name !== undefined) updateData.key_name = key_name;
      if (display_name !== undefined) updateData.display_name = display_name;
      if (description !== undefined) updateData.description = description;
      if (parent_id !== undefined) updateData.parent_id = parent_id;
      if (sort_order !== undefined) updateData.sort_order = sort_order;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (extra_data !== undefined) updateData.extra_data = extra_data;

      await dictionary.update(updateData);

      logger.info(`用户 ${req.user.username} 更新了字典项: ${dictionary.category}.${dictionary.key_name}`);
      return success(res, dictionary, '字典项更新成功');

    } catch (err) {
      logger.error('更新字典项失败:', err);
      return error(res, '更新字典项失败', 500);
    }
  }
);

// 删除字典项
router.delete('/:id',
  authenticateToken,
  requirePermission(['system:manage_dictionaries']),
  async (req, res) => {
    try {
      const { id } = req.params;

      // 查找字典项
      const dictionary = await DataDictionary.findByPk(id);
      if (!dictionary) {
        return error(res, '字典项不存在', 404);
      }

      // 系统预设字典项不能删除
      if (dictionary.is_system) {
        return error(res, '系统预设字典项不能删除', 400);
      }

      // 检查是否有子级字典项
      const childrenCount = await DataDictionary.count({
        where: {
          parent_id: id,
          is_active: true
        }
      });

      if (childrenCount > 0) {
        return error(res, `无法删除：还有 ${childrenCount} 个子级字典项`, 400);
      }

      // 软删除：设置为非活跃状态
      await dictionary.update({ is_active: false });

      logger.info(`用户 ${req.user.username} 删除了字典项: ${dictionary.category}.${dictionary.key_name}`);
      return success(res, null, '字典项删除成功');

    } catch (err) {
      logger.error('删除字典项失败:', err);
      return error(res, '删除字典项失败', 500);
    }
  }
);

// 批量创建字典项
router.post('/batch',
  authenticateToken,
  requirePermission(['system:manage_dictionaries']),
  async (req, res) => {
    try {
      const { category, items } = req.body;

      if (!category || !items || !Array.isArray(items) || items.length === 0) {
        return error(res, '分类和字典项列表不能为空', 400);
      }

      // 验证每个字典项
      for (const item of items) {
        if (!item.key_name || !item.display_name) {
          return error(res, '每个字典项都必须包含键名和显示名称', 400);
        }
      }

      // 批量创建
      const dictionaries = await DataDictionary.bulkCreateDictionary(category, items);

      logger.info(`用户 ${req.user.username} 批量创建了 ${dictionaries.length} 个字典项`);
      return success(res, {
        category,
        created_count: dictionaries.length,
        dictionaries
      }, '字典项批量创建成功');

    } catch (err) {
      logger.error('批量创建字典项失败:', err);
      return error(res, '批量创建字典项失败', 500);
    }
  }
);

// 初始化系统字典
router.post('/initialize-system',
  authenticateToken,
  requirePermission(['system:admin']),
  async (req, res) => {
    try {
      const results = await DataDictionary.initializeSystemDictionaries();

      const totalCount = results.reduce((sum, result) => sum + result.count, 0);

      logger.info(`用户 ${req.user.username} 初始化了系统字典，共 ${totalCount} 个字典项`);
      return success(res, {
        results,
        total_count: totalCount
      }, '系统字典初始化成功');

    } catch (err) {
      logger.error('初始化系统字典失败:', err);
      return error(res, '初始化系统字典失败', 500);
    }
  }
);

// 获取字典项详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const dictionary = await DataDictionary.findByPk(id, {
      include: [
        {
          model: DataDictionary,
          as: 'parent',
          attributes: ['id', 'key_name', 'display_name']
        },
        {
          model: DataDictionary,
          as: 'children',
          attributes: ['id', 'key_name', 'display_name', 'sort_order'],
          where: { is_active: true },
          required: false,
          order: [['sort_order', 'ASC']]
        }
      ]
    });

    if (!dictionary) {
      return error(res, '字典项不存在', 404);
    }

    return success(res, dictionary);

  } catch (err) {
    logger.error('获取字典项详情失败:', err);
    return error(res, '获取字典项详情失败', 500);
  }
});

module.exports = router;