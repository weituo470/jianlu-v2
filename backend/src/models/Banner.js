const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const Banner = sequelize.define('Banner', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '轮播图标题'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '轮播图描述'
    },
    image_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: '图片URL'
    },
    link_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '跳转链接'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
        comment: '状态：active-显示，inactive-隐藏'
    },
    sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '排序顺序，数字越小越靠前'
    }
}, {
    tableName: 'banners',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['status']
        },
        {
            fields: ['sort_order']
        },
        {
            fields: ['created_at']
        }
    ]
});

// 静态方法
Banner.getList = async function(options = {}) {
    const {
        status = null,
        limit = 50,
        offset = 0,
        orderBy = 'sort_order',
        orderDirection = 'ASC'
    } = options;

    const whereClause = {};
    if (status) {
        whereClause.status = status;
    }

    try {
        const banners = await this.findAll({
            where: whereClause,
            order: [[orderBy, orderDirection]],
            limit: limit > 0 ? limit : undefined,
            offset: offset
        });
        
        return banners.map(banner => banner.toJSON());
    } catch (error) {
        console.error('获取轮播图列表失败:', error);
        throw error;
    }
};

Banner.getCount = async function(options = {}) {
    const { status = null } = options;

    const whereClause = {};
    if (status) {
        whereClause.status = status;
    }

    try {
        const count = await this.count({
            where: whereClause
        });
        return count;
    } catch (error) {
        console.error('获取轮播图总数失败:', error);
        throw error;
    }
};

Banner.getById = async function(id) {
    try {
        const banner = await this.findByPk(id);
        return banner ? banner.toJSON() : null;
    } catch (error) {
        console.error('获取轮播图详情失败:', error);
        throw error;
    }
};

Banner.createBanner = async function(bannerData) {
    const {
        title,
        description = '',
        image_url,
        link_url = '',
        status = 'active',
        sort_order = 0
    } = bannerData;

    try {
        const banner = await this.create({
            title,
            description,
            image_url,
            link_url,
            status,
            sort_order
        });

        return banner.toJSON();
    } catch (error) {
        console.error('创建轮播图失败:', error);
        throw error;
    }
};

Banner.updateBanner = async function(id, bannerData) {
    const updateData = {};

    if (bannerData.title !== undefined) updateData.title = bannerData.title;
    if (bannerData.description !== undefined) updateData.description = bannerData.description;
    if (bannerData.image_url !== undefined) updateData.image_url = bannerData.image_url;
    if (bannerData.link_url !== undefined) updateData.link_url = bannerData.link_url;
    if (bannerData.status !== undefined) updateData.status = bannerData.status;
    if (bannerData.sort_order !== undefined) updateData.sort_order = bannerData.sort_order;

    if (Object.keys(updateData).length === 0) {
        throw new Error('没有要更新的字段');
    }

    try {
        const [affectedCount] = await this.update(updateData, {
            where: { id }
        });

        if (affectedCount === 0) {
            throw new Error('轮播图不存在');
        }

        return await this.getById(id);
    } catch (error) {
        console.error('更新轮播图失败:', error);
        throw error;
    }
};

Banner.updateStatus = async function(id, status) {
    try {
        const [affectedCount] = await this.update(
            { status },
            { where: { id } }
        );

        if (affectedCount === 0) {
            throw new Error('轮播图不存在');
        }

        return await this.getById(id);
    } catch (error) {
        console.error('更新轮播图状态失败:', error);
        throw error;
    }
};

Banner.updateSort = async function(id, sortOrder) {
    try {
        const [affectedCount] = await this.update(
            { sort_order: sortOrder },
            { where: { id } }
        );

        if (affectedCount === 0) {
            throw new Error('轮播图不存在');
        }

        return await this.getById(id);
    } catch (error) {
        console.error('更新轮播图排序失败:', error);
        throw error;
    }
};

Banner.batchUpdateSort = async function(sortData) {
    const transaction = await sequelize.transaction();
    
    try {
        for (const item of sortData) {
            await this.update(
                { sort_order: item.sort_order },
                { 
                    where: { id: item.id },
                    transaction
                }
            );
        }

        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        console.error('批量更新轮播图排序失败:', error);
        throw error;
    }
};

Banner.deleteBanner = async function(id) {
    try {
        const affectedCount = await this.destroy({
            where: { id }
        });

        if (affectedCount === 0) {
            throw new Error('轮播图不存在');
        }

        return true;
    } catch (error) {
        console.error('删除轮播图失败:', error);
        throw error;
    }
};

Banner.getActiveBanners = async function() {
    try {
        const banners = await this.findAll({
            where: { status: 'active' },
            order: [['sort_order', 'ASC']]
        });
        
        return banners.map(banner => banner.toJSON());
    } catch (error) {
        console.error('获取活跃轮播图失败:', error);
        throw error;
    }
};

Banner.getNextSortOrder = async function() {
    try {
        const result = await this.max('sort_order');
        return (result || 0) + 1;
    } catch (error) {
        console.error('获取下一个排序号失败:', error);
        throw error;
    }
};

module.exports = Banner;