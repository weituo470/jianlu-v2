// 更新用户表结构
const { sequelize } = require('./src/config/database');

async function updateUserTable() {
    try {
        console.log('🔄 更新用户表结构...');
        
        // 1. 更新角色枚举类型
        console.log('1. 更新角色枚举类型...');
        await sequelize.query(`
            ALTER TABLE users 
            MODIFY COLUMN role ENUM('super_admin', 'system_admin', 'operation_admin', 'team_admin', 'user') 
            NOT NULL DEFAULT 'user'
        `);
        console.log('✅ 角色枚举类型更新成功');
        
        // 2. 检查当前用户表结构
        console.log('\n2. 检查当前用户表结构...');
        const [results] = await sequelize.query('DESCRIBE users');
        console.log('用户表字段:');
        results.forEach(field => {
            console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${field.Default ? `DEFAULT ${field.Default}` : ''}`);
        });
        
        // 3. 测试创建用户
        console.log('\n3. 测试创建用户...');
        const { User } = require('./src/models');
        const { v4: uuidv4 } = require('uuid');
        
        const testUser = await User.create({
            id: uuidv4(),
            username: 'test_user_validation',
            email: 'test_user_validation@example.com',
            password_hash: 'testpassword123',
            role: 'user',
            profile: {
                nickname: '测试用户'
            },
            status: 'active'
        });
        
        console.log('✅ 测试用户创建成功！');
        console.log(`   用户ID: ${testUser.id}`);
        console.log(`   用户名: ${testUser.username}`);
        console.log(`   角色: ${testUser.role}`);
        
        // 清理测试用户
        await testUser.destroy();
        console.log('✅ 测试用户已清理');
        
    } catch (error) {
        console.error('❌ 更新用户表失败:', error.message);
        console.error('错误详情:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

updateUserTable();