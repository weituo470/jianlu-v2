const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const Organization = require('../models/Organization');
const OrganizationHierarchy = require('../models/OrganizationHierarchy');
const OrganizationMember = require('../models/OrganizationMember');
const User = require('../models/User');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const Joi = require('joi');

// 机构验证模式
const createOrganizationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': '机构名称至少2个字符',
      'string.max': '机构名称最多100个字符',
      'any.required': '机构名称不能为空'
    }),
  description: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': '机构描述不能超过1000个字符'
    }),
  avatar_url: Joi.string()
    .uri()
    .allow('')
    .messages({
      'string.uri': '头像URL格式不正确'
    }),
  organization_type: Joi.string()
    .valid('government_certified', 'civil_organization')
    .default('civil_organization')
    .messages({
      'any.only': '机构类型无效'
    }),
  category_tags: Joi.array()
    .items(Joi.string())
    .max(3)
    .default([])
    .messages({
      'array.max': '最多只能选择3个分类标签'
    }),
  parent_id: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.uuid': '父级机构ID格式不正确'
    }),
  join_methods: Joi.array()
    .items(Joi.string().valid('invite', 'qrcode', 'apply'))
    .min(1)
    .default(['invite'])
    .messages({
      'array.min': '至少选择一种加入方式',
      'any.only': '加入方式无效'
    })
});

// 获取机构分类标签
router.get('/category-tags', authenticateToken, async (req, res) => {
  try {
    // 28种机构分类标签
    const categoryTagsTemp = [
      { value: 'business_association', label: '商会' },
      { value: 'association', label: '协会' },
      { value: 'society', label: '社团' },
      { value: 'institution', label: '机构' },
      { value: 'club', label: '俱乐部' },
      { value: 'outdoor', label: '户外' },
      { value: 'sports', label: '体育' },
      { value: 'basketball', label: '篮球' },
      { value: 'badminton', label: '羽毛球' },
      { value: 'pingpong', label: '乒乓球' },
      { value: 'football', label: '足球' },
      { value: 'photography', label: '摄影' },
      { value: 'calligraphy', label: '书法' },
      { value: 'art', label: '美术' },
      { value: 'reading', label: '读书' },
      { value: 'chinese_studies', label: '国学' },
      { value: 'charity', label: '爱心公益' },
      { value: 'classmates', label: '同学' },
      { value: 'veterans', label: '战友' },
      { value: 'family_friends', label: '亲友' },
      { value: 'colleagues', label: '同事' },
      { value: 'education', label: '教培' },
      { value: 'volunteer', label: '志愿者' },
      { value: 'friends', label: '好友' },
      { value: 'beauty', label: '美容' },
      { value: 'food_drink', label: '吃喝' },
      { value: 'entertainment', label: '娱乐' },
      { value: 'other', label: '其他' }
    ];

    logger.info(`用户 ${req.user.username} 获取机构分类标签列表`);
    return success(res, categoryTagsTemp);

  } catch (err) {
    logger.error('获取机构分类标签失败:', err);
    return error(res, '获取机构分类标签失败', 500);
  }
});

// 获取机构列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      organization_type = '',
      creator_id = '',
      parent_id = '',
      hierarchy_level = '',
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    // 构建查询条件
    const where = {
      status: {
        [Op.ne]: 'dissolved'
      }
    };
    
    if (search) {
      where.name = {
        [Op.like]: `%${search}%`
      };
    }
    
    if (status) {
      where.status = status;
    }
    
    if (organization_type) {
      where.organization_type = organization_type;
    }
    
    if (creator_id) {
      where.creator_id = creator_id;
    }
    
    if (parent_id) {
      where.parent_id = parent_id;
    }
    
    if (hierarchy_level) {
      where.hierarchy_level = parseInt(hierarchy_level);
    }

    // 分页参数
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = parseInt(limit);

    // 查询机构列表
    const { count, rows: organizations } = await Organization.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email', 'profile']
        },
        {
          model: Organization,
          as: 'parent',
          attributes: ['id', 'name', 'hierarchy_level']
        }
      ],
      order: [[sort, order.toUpperCase()]],
      limit: pageLimit,
      offset,
      distinct: true
    });

    return success(res, {
      organizations,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: count,
        pages: Math.ceil(count / pageLimit)
      }
    });

  } catch (err) {
    logger.error('获取机构列表失败:', err);
    return error(res, '获取机构列表失败', 500);
  }
});

// 获取机构层级树
router.get('/hierarchy-tree', authenticateToken, async (req, res) => {
  try {
    const { root_id = null, max_depth = 3 } = req.query;

    // 获取根级机构
    const rootWhere = root_id ? { id: root_id } : { parent_id: null };
    
    const rootOrganizations = await Organization.findAll({
      where: {
        ...rootWhere,
        status: 'active'
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    // 递归获取子级机构
    const buildHierarchyTree = async (organizations, currentDepth = 0) => {
      if (currentDepth >= max_depth) return organizations;

      for (let org of organizations) {
        const children = await Organization.findAll({
          where: {
            parent_id: org.id,
            status: 'active'
          },
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'username']
            }
          ],
          order: [['created_at', 'ASC']]
        });

        org.dataValues.children = await buildHierarchyTree(children, currentDepth + 1);
      }

      return organizations;
    };

    const hierarchyTree = await buildHierarchyTree(rootOrganizations);

    logger.info(`用户 ${req.user.username} 获取机构层级树`);
    return success(res, hierarchyTree);

  } catch (err) {
    logger.error('获取机构层级树失败:', err);
    return error(res, '获取机构层级树失败', 500);
  }
});

// 获取机构详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { include_members = 'false', include_hierarchy = 'false' } = req.query;

    const includeOptions = [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'email', 'profile']
      },
      {
        model: Organization,
        as: 'parent',
        attributes: ['id', 'name', 'hierarchy_level', 'hierarchy_path']
      }
    ];

    // 如果需要包含成员信息
    if (include_members === 'true') {
      includeOptions.push({
        model: User,
        as: 'members',
        attributes: ['id', 'username', 'email', 'profile'],
        through: {
          attributes: ['role_id', 'nickname', 'join_method', 'status', 'joined_at']
        }
      });
    }

    // 如果需要包含层级信息
    if (include_hierarchy === 'true') {
      includeOptions.push({
        model: Organization,
        as: 'children',
        attributes: ['id', 'name', 'hierarchy_level', 'member_count', 'status']
      });
    }

    const organization = await Organization.findByPk(id, {
      include: includeOptions
    });

    if (!organization) {
      return error(res, '机构不存在', 404);
    }

    return success(res, organization);

  } catch (err) {
    logger.error('获取机构详情失败:', err);
    return error(res, '获取机构详情失败', 500);
  }
});

// 创建机构
router.post('/', 
  authenticateToken,
  requirePermission(['organization:create']),
  validate(createOrganizationSchema),
  async (req, res) => {
    try {
      const { 
        name, 
        description, 
        avatar_url, 
        organization_type, 
        category_tags, 
        parent_id, 
        join_methods 
      } = req.body;
      const creator_id = req.user.id;

      // 检查机构名称是否已存在（同一层级下）
      const existingOrg = await Organization.findOne({
        where: {
          name,
          parent_id: parent_id || null,
          status: {
            [Op.ne]: 'dissolved'
          }
        }
      });

      if (existingOrg) {
        return error(res, '同一层级下机构名称已存在', 400);
      }

      // 确定层级信息
      let hierarchy_level = 1;
      let hierarchy_path = `/${name}`;
      
      if (parent_id) {
        const parentOrg = await Organization.findByPk(parent_id);
        if (!parentOrg) {
          return error(res, '父级机构不存在', 404);
        }
        
        if (parentOrg.hierarchy_level >= 3) {
          return error(res, '最多支持3级机构层级', 400);
        }
        
        hierarchy_level = parentOrg.hierarchy_level + 1;
        hierarchy_path = `${parentOrg.hierarchy_path}/${name}`;
      }

      // 创建机构
      const organization = await Organization.create({
        name,
        description,
        avatar_url: avatar_url && avatar_url.trim() !== '' ? avatar_url : null,
        creator_id,
        organization_type,
        category_tags: category_tags || [],
        parent_id: parent_id || null,
        hierarchy_level,
        hierarchy_path,
        join_methods: join_methods || ['invite']
      });

      // 创建层级关系记录
      await OrganizationHierarchy.create({
        ancestor_id: organization.id,
        descendant_id: organization.id,
        depth: 0
      });

      // 如果有父级，创建所有祖先关系
      if (parent_id) {
        const ancestorRelations = await OrganizationHierarchy.findAll({
          where: { descendant_id: parent_id }
        });

        for (let relation of ancestorRelations) {
          await OrganizationHierarchy.create({
            ancestor_id: relation.ancestor_id,
            descendant_id: organization.id,
            depth: relation.depth + 1
          });
        }
      }

      // 自动将创建者添加为管理员成员
      await OrganizationMember.create({
        organization_id: organization.id,
        user_id: creator_id,
        join_method: 'invite',
        status: 'active'
      });

      // 获取完整的机构信息
      const fullOrganization = await Organization.findWithHierarchy(organization.id);

      logger.info(`用户 ${req.user.username} 创建了机构: ${name}`);
      return success(res, fullOrganization, '机构创建成功', 201);

    } catch (err) {
      logger.error('创建机构失败:', err);
      return error(res, '创建机构失败', 500);
    }
  }
);

// 更新机构
router.put('/:id',
  authenticateToken,
  requirePermission(['organization:update']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const organization = await Organization.findByPk(id);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查权限：只有机构创建者或系统管理员可以更新
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(id, req.user.id, 'organization:update');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限更新此机构', 403);
      }

      // 如果更新名称，检查是否重复
      if (updates.name && updates.name !== organization.name) {
        const existingOrg = await Organization.findOne({
          where: {
            name: updates.name,
            parent_id: organization.parent_id,
            id: {
              [Op.ne]: id
            },
            status: {
              [Op.ne]: 'dissolved'
            }
          }
        });

        if (existingOrg) {
          return error(res, '同一层级下机构名称已存在', 400);
        }

        // 更新层级路径
        if (organization.parent_id) {
          const parentOrg = await Organization.findByPk(organization.parent_id);
          updates.hierarchy_path = `${parentOrg.hierarchy_path}/${updates.name}`;
        } else {
          updates.hierarchy_path = `/${updates.name}`;
        }
      }

      // 更新机构
      await organization.update(updates);

      // 获取更新后的完整信息
      const updatedOrganization = await Organization.findWithHierarchy(id);

      logger.info(`用户 ${req.user.username} 更新了机构: ${organization.name}`);
      return success(res, updatedOrganization, '机构更新成功');

    } catch (err) {
      logger.error('更新机构失败:', err);
      return error(res, '更新机构失败', 500);
    }
  }
);

// 删除机构
router.delete('/:id',
  authenticateToken,
  requirePermission(['organization:delete']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const organization = await Organization.findByPk(id);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查权限：只有机构创建者或系统管理员可以删除
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';

      if (!isCreator && !isAdmin) {
        return error(res, '没有权限删除此机构', 403);
      }

      // 检查是否有子级机构
      const childrenCount = await Organization.count({
        where: {
          parent_id: id,
          status: {
            [Op.ne]: 'dissolved'
          }
        }
      });

      if (childrenCount > 0) {
        return error(res, '请先删除所有子级机构', 400);
      }

      // 软删除：将状态设置为dissolved
      await organization.update({ status: 'dissolved' });

      logger.info(`用户 ${req.user.username} 删除了机构: ${organization.name}`);
      return success(res, null, '机构删除成功');

    } catch (err) {
      logger.error('删除机构失败:', err);
      return error(res, '删除机构失败', 500);
    }
  }
);

module.exports = router;