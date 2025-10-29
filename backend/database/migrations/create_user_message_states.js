/**
 * 创建用户消息状态表
 * 用于管理每个用户对消息的独立状态（已读/删除/隐藏等）
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('user_message_states', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                comment: '状态记录ID'
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                comment: '用户ID'
            },
            message_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'messages',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                comment: '消息ID'
            },
            is_read: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '是否已读'
            },
            is_deleted: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '是否已删除'
            },
            is_hidden: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: '是否已隐藏'
            },
            read_at: {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null,
                comment: '阅读时间'
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null,
                comment: '删除时间'
            },
            hidden_at: {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null,
                comment: '隐藏时间'
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

        // 创建唯一索引（每个用户对每条消息只能有一条状态记录）
        await queryInterface.addIndex('user_message_states', ['user_id', 'message_id'], {
            unique: true,
            name: 'uk_user_message_states_user_message'
        });

        // 创建其他索引
        await queryInterface.addIndex('user_message_states', ['user_id'], {
            name: 'idx_user_message_states_user_id'
        });

        await queryInterface.addIndex('user_message_states', ['message_id'], {
            name: 'idx_user_message_states_message_id'
        });

        await queryInterface.addIndex('user_message_states', ['is_deleted'], {
            name: 'idx_user_message_states_is_deleted'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('user_message_states');
    }
};