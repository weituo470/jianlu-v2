const { sequelize } = require('./src/config/database');
const { QueryTypes } = require('sequelize');

async function addSequenceNumberToTeams() {
    try {
        console.log('开始为teams表添加sequence_number字段...');

        // 检查字段是否已存在
        const [results] = await sequelize.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'teams'
            AND COLUMN_NAME = 'sequence_number'
        `);

        if (results.length > 0) {
            console.log('sequence_number字段已存在，无需添加');
            return;
        }

        // 添加sequence_number字段
        await sequelize.query(`
            ALTER TABLE teams
            ADD COLUMN sequence_number INT NOT NULL DEFAULT 0 COMMENT '团队序号，用于排序，数值越大越新'
            AFTER activity_count
        `);

        console.log('✅ sequence_number字段添加成功');

        // 为现有的团队设置序号（按创建时间倒序）
        await sequelize.query(`
            SET @row_number = 0;
            UPDATE teams
            SET sequence_number = (@row_number:=@row_number+1)
            ORDER BY created_at DESC;
        `);

        console.log('✅ 已为现有团队设置序号');

        // 添加索引以提高查询性能
        await sequelize.query(`
            CREATE INDEX idx_teams_sequence_number ON teams(sequence_number);
        `);

        console.log('✅ 已创建sequence_number索引');

    } catch (error) {
        console.error('添加sequence_number字段失败:', error);
        throw error;
    }
}

// 执行迁移
if (require.main === module) {
    addSequenceNumberToTeams()
        .then(() => {
            console.log('\n🎉 迁移完成！');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ 迁移失败:', error);
            process.exit(1);
        });
}

module.exports = addSequenceNumberToTeams;