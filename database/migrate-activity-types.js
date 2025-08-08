const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// 数据库配置
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jianlu_admin',
    charset: 'utf8mb4'
};

async function migrateActivityTypes() {
    let connection;
    
    try {
        console.log('🚀 开始活动类型数据迁移...');
        
        // 创建数据库连接
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ 数据库连接成功');
        
        // 读取SQL文件
        const sqlFile = path.join(__dirname, 'create-activity-types-table.sql');
        const sqlContent = await fs.readFile(sqlFile, 'utf8');
        
        // 分割SQL语句（按分号分割，忽略注释）
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--'));
        
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
                    throw error;
                }
            }
        }
        
        // 验证迁移结果
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM activity_types');
        const count = rows[0].count;
        
        console.log(`🎉 活动类型数据迁移完成！`);
        console.log(`📊 共创建 ${count} 个活动类型`);
        
        // 显示所有活动类型
        const [types] = await connection.execute(`
            SELECT id, name, description, is_default, sort_order, is_active 
            FROM activity_types 
            ORDER BY sort_order, created_at
        `);
        
        console.log('\n📋 活动类型列表:');
        console.table(types);
        
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
    migrateActivityTypes()
        .then(() => {
            console.log('✨ 迁移脚本执行完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 迁移脚本执行失败:', error);
            process.exit(1);
        });
}

module.exports = { migrateActivityTypes };