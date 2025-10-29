require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function executeBillTypeMigration() {
    try {
        console.log('🚀 开始执行账单类型数据库迁移...');

        // 1. 更新 messages 表的 type ENUM，添加 'bill' 类型
        console.log('📝 正在更新 messages 表的 type ENUM...');
        await updateMessagesTypeEnum();

        // 2. 更新 message_templates 表的 type ENUM，添加 'bill' 类型
        console.log('📝 正在更新 message_templates 表的 type ENUM...');
        await updateMessageTemplatesTypeEnum();

        // 3. 检查 users 表是否有 nickname 列，如果没有则添加
        console.log('👤 正在检查 users 表结构...');
        await ensureUserNicknameColumn();

        // 4. 验证迁移结果
        console.log('✅ 验证迁移结果...');
        await validateMigration();

        console.log('🎉 账单类型数据库迁移执行成功！');

    } catch (error) {
        console.error('❌ 账单类型数据库迁移失败：', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

async function updateMessagesTypeEnum() {
    // MySQL 不支持直接修改 ENUM，需要先删除默认值，修改 ENUM，再设置默认值
    const alterTableSQL = `
        ALTER TABLE \`messages\`
        MODIFY COLUMN \`type\`
        ENUM('system','personal','activity','team','announcement','bill')
        NOT NULL DEFAULT 'system'
    `;

    await sequelize.query(alterTableSQL);
    console.log('✅ messages 表 type ENUM 更新成功');
}

async function updateMessageTemplatesTypeEnum() {
    const alterTableSQL = `
        ALTER TABLE \`message_templates\`
        MODIFY COLUMN \`type\`
        ENUM('system','personal','activity','team','announcement','bill')
        NOT NULL DEFAULT 'system'
    `;

    await sequelize.query(alterTableSQL);
    console.log('✅ message_templates 表 type ENUM 更新成功');
}

async function ensureUserNicknameColumn() {
    // 检查 nickname 列是否存在
    const [columns] = await sequelize.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'nickname'
    `);

    if (columns.length === 0) {
        console.log('📝 添加 nickname 列到 users 表...');
        await sequelize.query(`
            ALTER TABLE \`users\`
            ADD COLUMN \`nickname\` VARCHAR(100)
            AFTER \`username\`
        `);
        console.log('✅ users 表 nickname 列添加成功');
    } else {
        console.log('✅ users 表 nickname 列已存在');
    }
}

async function validateMigration() {
    // 验证 messages 表 ENUM 值
    const [messageEnumResults] = await sequelize.query(`
        SELECT COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'messages'
        AND COLUMN_NAME = 'type'
    `);

    console.log('📋 messages 表 type 列:', messageEnumResults[0]?.COLUMN_TYPE);

    // 验证 message_templates 表 ENUM 值
    const [templateEnumResults] = await sequelize.query(`
        SELECT COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'message_templates'
        AND COLUMN_NAME = 'type'
    `);

    console.log('📋 message_templates 表 type 列:', templateEnumResults[0]?.COLUMN_TYPE);

    // 验证 users 表 nickname 列
    const [userColumns] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'nickname'
    `);

    if (userColumns.length > 0) {
        console.log('👤 users 表 nickname 列:', userColumns[0]);
    } else {
        console.log('❌ users 表 nickname 列不存在');
    }

    // 测试插入一条账单类型消息
    console.log('🧪 测试插入账单类型消息...');
    try {
        const testMessage = {
            id: 'test-bill-' + Date.now(),
            title: '测试账单消息',
            content: '这是一条测试账单消息',
            type: 'bill',
            priority: 'normal',
            sender_id: null,
            recipient_id: null,
            is_global: false,
            is_read: false,
            status: 'sent',
            metadata: JSON.stringify({
                type: 'bill',
                test: true
            })
        };

        await sequelize.query(`
            INSERT INTO \`messages\` (
                \`id\`, \`title\`, \`content\`, \`type\`, \`priority\`,
                \`sender_id\`, \`recipient_id\`, \`is_global\`, \`is_read\`,
                \`status\`, \`metadata\`
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
            replacements: [
                testMessage.id,
                testMessage.title,
                testMessage.content,
                testMessage.type,
                testMessage.priority,
                testMessage.sender_id,
                testMessage.recipient_id,
                testMessage.is_global,
                testMessage.is_read,
                testMessage.status,
                testMessage.metadata
            ]
        });

        // 删除测试消息
        await sequelize.query(`
            DELETE FROM \`messages\` WHERE \`id\` = ?
        `, {
            replacements: [testMessage.id]
        });

        console.log('✅ 账单类型消息测试成功');

    } catch (error) {
        console.error('❌ 账单类型消息测试失败:', error.message);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    executeBillTypeMigration();
}

module.exports = { executeBillTypeMigration };