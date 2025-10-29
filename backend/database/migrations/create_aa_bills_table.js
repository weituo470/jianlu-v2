/**
 * 创建AA分摊账单表
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('aa_bills', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                comment: '账单ID'
            },
            activity_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'activities',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                comment: '活动ID'
            },
            creator_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                comment: '创建者ID'
            },
            total_cost: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: '分摊总金额（用户自定义或记账总额）'
            },
            expense_total_cost: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: '记账总额（所有费用的总和）'
            },
            base_total_cost: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: '基础分摊总额（默认计算的总金额）'
            },
            use_custom_total_cost: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '是否使用了自定义总金额'
            },
            custom_total_cost: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                defaultValue: null,
                comment: '用户自定义的总金额'
            },
            participant_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: '参与人数'
            },
            total_ratio: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: '总系数'
            },
            average_cost: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: '平均金额'
            },
            status: {
                type: Sequelize.ENUM('draft', 'saved', 'pushed'),
                allowNull: false,
                defaultValue: 'draft',
                comment: '账单状态：draft-草稿，saved-已保存，pushed-已推送'
            },
            bill_details: {
                type: Sequelize.JSON,
                allowNull: true,
                defaultValue: null,
                comment: '账单详情（参与者分摊明细）'
            },
            pushed_at: {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null,
                comment: '推送时间'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                comment: '创建时间'
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
                comment: '更新时间'
            }
        });

        // 创建索引
        await queryInterface.addIndex('aa_bills', ['activity_id'], {
            name: 'idx_aa_bills_activity_id'
        });

        await queryInterface.addIndex('aa_bills', ['creator_id'], {
            name: 'idx_aa_bills_creator_id'
        });

        await queryInterface.addIndex('aa_bills', ['status'], {
            name: 'idx_aa_bills_status'
        });

        await queryInterface.addIndex('aa_bills', ['created_at'], {
            name: 'idx_aa_bills_created_at'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('aa_bills');
    }
};