const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// 数据库配置
const dbConfig = {
    host: 'localhost',
    user: 'jianlu_app',
    password: 'jianlu_app_password_2024',
    database: 'jianlu_admin',
    charset: 'utf8mb4'
};

async function migrateActivities() {
    let connection;
    
    try {
        console.log('🚀 开始活动数据迁移...');
        
        // 创建数据库连接
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ 数据库连接成功');
        
        // 读取SQL文件
        const sqlFile = path.join(__dirname, 'create-activities-table.sql');
        const sqlContent = await fs.readFile(sqlFile, 'utf8');
        
        // 分割SQL语句（按分号分割，忽略注释）
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--') && stmt.length > 10);
        
        console.log(`📝 准备执行 ${statements.length} 条SQL语句`);
        
        // 执行每条SQL语句
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement) {
                try {
                    const [result] = await connection.execute(statement);
                    console.log(`✅ 语句 ${i + 1}/${statements.length} 执行成功`);
                    
                    // 如果是查询语句，显示结果
                    if (statement.toLowerCase().includes('select')) {
                        console.log('📊 查询结果:', result);
                    }
                } catch (error) {
                    console.error(`❌ 语句 ${i + 1} 执行失败:`, error.message);
                    console.error('SQL:', statement);
                    // 对于某些错误（如重复插入），继续执行
                    if (!error.message.includes('Duplicate entry')) {
                        throw error;
                    }
                }
            }
        }
        
        // 验证迁移结果
        const [activities] = await connection.execute('SELECT COUNT(*) as count FROM activities');
        const [participants] = await connection.execute('SELECT COUNT(*) as count FROM activity_participants');
        
        const activityCount = activities[0].count;
        const participantCount = participants[0].count;
        
        console.log(`🎉 活动数据迁移完成！`);
        console.log(`📊 共创建 ${activityCount} 个活动`);
        console.log(`📊 共创建 ${participantCount} 个参与记录`);
        
        // 显示所有活动
        const [activityList] = await connection.execute(`
            SELECT a.id, a.title, a.type, a.status, a.start_time, a.max_participants, a.current_participants,
                   t.name as team_name, u.username as creator_name
            FROM activities a
            LEFT JOIN teams t ON a.team_id = t.id
            LEFT JOIN users u ON a.creator_id = u.id
            ORDER BY a.start_time DESC
        `);
        
        console.log('\n📋 活动列表:');
        console.table(activityList);
        
    } catch (error) {
        console.error('💥 迁移失败:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 数据库连接已关闭');
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    migrateActivities()
        .then(() => {
            console.log('✨ 迁移脚本执行完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 迁移脚本执行失败:', error);
            process.exit(1);
        });
}

module.exports = { migrateActivities };