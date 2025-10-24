const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTeamApplicationsTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('开始创建team_applications表...');

        // 创建team_applications表
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS team_applications (
                id CHAR(36) NOT NULL PRIMARY KEY COMMENT '申请ID (UUID)',
                team_id CHAR(36) NOT NULL COMMENT '团队ID',
                user_id CHAR(36) NOT NULL COMMENT '申请用户ID',
                reason TEXT COMMENT '申请理由',
                status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '申请状态',
                rejection_reason TEXT COMMENT '拒绝原因',
                application_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
                approved_at DATETIME NULL COMMENT '批准时间',
                approved_by CHAR(36) NULL COMMENT '批准人ID',
                rejected_at DATETIME NULL COMMENT '拒绝时间',
                rejected_by CHAR(36) NULL COMMENT '拒绝人ID',
                INDEX idx_team_id (team_id),
                INDEX idx_user_id (user_id),
                INDEX idx_status (status),
                INDEX idx_application_time (application_time),
                UNIQUE KEY uk_team_user_pending (team_id, user_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队申请表';
        `;

        await connection.execute(createTableSQL);
        console.log('✅ team_applications表创建成功');

        // 添加外键约束（如果teams和users表已存在）
        try {
            await connection.execute(`
                ALTER TABLE team_applications
                ADD CONSTRAINT fk_team_applications_team_id
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
            `);
            console.log('✅ 添加team_id外键约束成功');
        } catch (error) {
            console.log('⚠️ team_id外键约束已存在或添加失败:', error.message);
        }

        try {
            await connection.execute(`
                ALTER TABLE team_applications
                ADD CONSTRAINT fk_team_applications_user_id
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            `);
            console.log('✅ 添加user_id外键约束成功');
        } catch (error) {
            console.log('⚠️ user_id外键约束已存在或添加失败:', error.message);
        }

        try {
            await connection.execute(`
                ALTER TABLE team_applications
                ADD CONSTRAINT fk_team_applications_approved_by
                FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
            `);
            console.log('✅ 添加approved_by外键约束成功');
        } catch (error) {
            console.log('⚠️ approved_by外键约束已存在或添加失败:', error.message);
        }

        try {
            await connection.execute(`
                ALTER TABLE team_applications
                ADD CONSTRAINT fk_team_applications_rejected_by
                FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL
            `);
            console.log('✅ 添加rejected_by外键约束成功');
        } catch (error) {
            console.log('⚠️ rejected_by外键约束已存在或添加失败:', error.message);
        }

        // 验证表结构
        const [tableInfo] = await connection.execute('DESCRIBE team_applications');
        console.log('\n📋 team_applications表结构:');
        tableInfo.forEach(column => {
            console.log(`  ${column.Field} - ${column.Type} - ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} - ${column.Default || '无默认值'}`);
        });

        // 检查现有数据
        const [applications] = await connection.execute('SELECT COUNT(*) as count FROM team_applications');
        console.log(`\n📊 当前申请记录数: ${applications[0].count}`);

        console.log('\n🎉 team_applications表创建完成！');

    } catch (error) {
        console.error('创建team_applications表失败:', error);
    } finally {
        await connection.end();
    }
}

createTeamApplicationsTable();