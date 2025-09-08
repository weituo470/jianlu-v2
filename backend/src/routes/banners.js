const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Banner = require('../models/Banner');
const { authenticateToken } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/banners');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'banner-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        // 检查文件类型
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件'));
        }
    }
});

// 获取轮播图列表
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            status,
            page = 1,
            limit = 50,
            orderBy = 'sort_order',
            orderDirection = 'ASC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const options = {
            status,
            limit: parseInt(limit),
            offset,
            orderBy,
            orderDirection
        };

        const [banners, total] = await Promise.all([
            Banner.getList(options),
            Banner.getCount({ status })
        ]);

        // 处理图片URL
        const processedBanners = banners.map(banner => ({
            ...banner,
            image_url: banner.image_url.startsWith('http') 
                ? banner.image_url 
                : `${req.protocol}://${req.get('host')}${banner.image_url}`
        }));

        return success(res, {
            data: processedBanners,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        }, '获取轮播图列表成功');

    } catch (err) {
        console.error('获取轮播图列表失败:', err);
        return error(res, '获取轮播图列表失败', 500);
    }
});

// 获取轮播图详情
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await Banner.getById(id);

        if (!banner) {
            return error(res, '轮播图不存在', 404);
        }

        // 处理图片URL
        banner.image_url = banner.image_url.startsWith('http') 
            ? banner.image_url 
            : `${req.protocol}://${req.get('host')}${banner.image_url}`;

        return success(res, banner, '获取轮播图详情成功');

    } catch (err) {
        console.error('获取轮播图详情失败:', err);
        return error(res, '获取轮播图详情失败', 500);
    }
});

// 创建轮播图
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { title, description, link_url, status, sort_order } = req.body;

        // 验证必填字段
        if (!title) {
            return error(res, '轮播图标题不能为空', 400);
        }

        if (!req.file) {
            return error(res, '请上传轮播图图片', 400);
        }

        // 生成图片URL
        const image_url = `/uploads/banners/${req.file.filename}`;

        // 如果没有指定排序，获取下一个排序号
        const finalSortOrder = sort_order || await Banner.getNextSortOrder();

        const bannerData = {
            title: title.trim(),
            description: description ? description.trim() : '',
            image_url,
            link_url: link_url ? link_url.trim() : '',
            status: status || 'active',
            sort_order: parseInt(finalSortOrder)
        };

        const newBanner = await Banner.createBanner(bannerData);

        // 处理返回的图片URL
        newBanner.image_url = `${req.protocol}://${req.get('host')}${newBanner.image_url}`;

        return success(res, newBanner, '轮播图创建成功', 201);

    } catch (err) {
        console.error('创建轮播图失败:', err);
        
        // 如果上传了文件但创建失败，删除文件
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkErr) {
                console.error('删除上传文件失败:', unlinkErr);
            }
        }

        return error(res, '创建轮播图失败: ' + err.message, 500);
    }
});

// 更新轮播图
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, link_url, status, sort_order } = req.body;

        // 检查轮播图是否存在
        const existingBanner = await Banner.getById(id);
        if (!existingBanner) {
            return error(res, '轮播图不存在', 404);
        }

        const updateData = {};

        if (title !== undefined) {
            updateData.title = title.trim();
        }
        if (description !== undefined) {
            updateData.description = description.trim();
        }
        if (link_url !== undefined) {
            updateData.link_url = link_url.trim();
        }
        if (status !== undefined) {
            updateData.status = status;
        }
        if (sort_order !== undefined) {
            updateData.sort_order = parseInt(sort_order);
        }

        // 如果上传了新图片
        if (req.file) {
            updateData.image_url = `/uploads/banners/${req.file.filename}`;
            
            // 删除旧图片文件
            if (existingBanner.image_url && !existingBanner.image_url.startsWith('http')) {
                const oldImagePath = path.join(__dirname, '../../', existingBanner.image_url);
                try {
                    await fs.unlink(oldImagePath);
                } catch (unlinkErr) {
                    console.warn('删除旧图片文件失败:', unlinkErr);
                }
            }
        }

        const updatedBanner = await Banner.updateBanner(id, updateData);

        // 处理返回的图片URL
        updatedBanner.image_url = updatedBanner.image_url.startsWith('http') 
            ? updatedBanner.image_url 
            : `${req.protocol}://${req.get('host')}${updatedBanner.image_url}`;

        return success(res, updatedBanner, '轮播图更新成功');

    } catch (err) {
        console.error('更新轮播图失败:', err);
        
        // 如果上传了文件但更新失败，删除文件
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkErr) {
                console.error('删除上传文件失败:', unlinkErr);
            }
        }

        return error(res, '更新轮播图失败: ' + err.message, 500);
    }
});

// 更新轮播图状态
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['active', 'inactive'].includes(status)) {
            return error(res, '状态参数无效', 400);
        }

        const updatedBanner = await Banner.updateStatus(id, status);

        return success(res, updatedBanner, '轮播图状态更新成功');

    } catch (err) {
        console.error('更新轮播图状态失败:', err);
        return error(res, '更新轮播图状态失败: ' + err.message, 500);
    }
});

// 更新轮播图排序
router.put('/:id/sort', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { sort_order } = req.body;

        if (sort_order === undefined || isNaN(sort_order)) {
            return error(res, '排序参数无效', 400);
        }

        const updatedBanner = await Banner.updateSort(id, parseInt(sort_order));

        return success(res, updatedBanner, '轮播图排序更新成功');

    } catch (err) {
        console.error('更新轮播图排序失败:', err);
        return error(res, '更新轮播图排序失败: ' + err.message, 500);
    }
});

// 批量更新排序
router.put('/batch-sort', authenticateToken, async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return error(res, '排序数据无效', 400);
        }

        // 验证数据格式
        for (const item of items) {
            if (!item.id || item.sort_order === undefined) {
                return error(res, '排序数据格式错误', 400);
            }
        }

        await Banner.batchUpdateSort(items);

        return success(res, null, '批量更新排序成功');

    } catch (err) {
        console.error('批量更新排序失败:', err);
        return error(res, '批量更新排序失败: ' + err.message, 500);
    }
});

// 删除轮播图
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // 获取轮播图信息，用于删除文件
        const banner = await Banner.getById(id);
        if (!banner) {
            return error(res, '轮播图不存在', 404);
        }

        // 删除数据库记录
        await Banner.deleteBanner(id);

        // 删除图片文件
        if (banner.image_url && !banner.image_url.startsWith('http')) {
            const imagePath = path.join(__dirname, '../../', banner.image_url);
            try {
                await fs.unlink(imagePath);
            } catch (unlinkErr) {
                console.warn('删除图片文件失败:', unlinkErr);
            }
        }

        return success(res, null, '轮播图删除成功');

    } catch (err) {
        console.error('删除轮播图失败:', err);
        return error(res, '删除轮播图失败: ' + err.message, 500);
    }
});

// 获取活跃轮播图（公开接口，用于前端展示）
router.get('/public/active', async (req, res) => {
    try {
        const banners = await Banner.getActiveBanners();

        // 处理图片URL - 为小程序生成完整URL
        const processedBanners = banners.map(banner => {
            let imageUrl = banner.image_url;
            
            // 如果不是完整URL，生成完整URL
            if (!imageUrl.startsWith('http')) {
                const host = req.get('host');
                const protocol = req.protocol;
                
                // 如果是localhost，尝试使用实际IP地址（适配小程序）
                if (host.includes('localhost')) {
                    // 获取本机IP地址（简单实现）
                    const os = require('os');
                    const networkInterfaces = os.networkInterfaces();
                    let localIP = 'localhost';
                    
                    // 查找第一个非内部IPv4地址
                    for (const interfaceName in networkInterfaces) {
                        const addresses = networkInterfaces[interfaceName];
                        for (const addr of addresses) {
                            if (addr.family === 'IPv4' && !addr.internal) {
                                localIP = addr.address;
                                break;
                            }
                        }
                        if (localIP !== 'localhost') break;
                    }
                    
                    imageUrl = `${protocol}://${localIP}:${host.split(':')[1] || process.env.PORT || '3460'}${banner.image_url}`;
                } else {
                    imageUrl = `${protocol}://${host}${banner.image_url}`;
                }
            }
            
            return {
                id: banner.id,
                title: banner.title,
                description: banner.description,
                image_url: imageUrl,
                link_url: banner.link_url,
                sort_order: banner.sort_order
            };
        });

        return success(res, processedBanners, '获取活跃轮播图成功');

    } catch (err) {
        console.error('获取活跃轮播图失败:', err);
        return error(res, '获取活跃轮播图失败', 500);
    }
});

module.exports = router;