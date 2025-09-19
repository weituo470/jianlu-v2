const mysql = require('mysql2/promise');

// 数据库连接配置 (使用项目实际配置)
const dbConfig = {
  host: 'localhost',
  port: 3306,
  database: 'jianlu_admin',
  user: 'jianlu_app',
  password: 'jianlu_app_password_2024'
};

async function checkAdminStatus() {
  let connection;
  try {
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');

    // 1. 查看所有用户基本信息
    console.log('\n=== 所有用户基本信息 ===');
    const [allUsers] = await connection.execute(`
      SELECT id, username, email, role, created_at, updated_at
      FROM users
      ORDER BY id
    `);

    allUsers.forEach(user => {
      console.log(`ID: ${user.id}, 用户名: ${user.username}, 邮箱: ${user.email}, 角色: ${user.role}, 创建时间: ${user.created_at}`);
    });

    // 2. 详细查看admin账户信息
    console.log('\n=== Admin账户详细信息 ===');
    const [adminUsers] = await connection.execute(`
      SELECT * FROM users WHERE username IN ('admin', 'admin5') ORDER BY id
    `);

    adminUsers.forEach(user => {
      console.log(`\n用户名: ${user.username}`);
      console.log(`ID: ${user.id}`);
      console.log(`邮箱: ${user.email}`);
      console.log(`角色: ${user.role}`);
      console.log(`创建时间: ${user.created_at}`);
      console.log(`更新时间: ${user.updated_at}`);
      // 显示所有字段，以便查看是否有禁用相关字段
      Object.keys(user).forEach(key => {
        if (!['id', 'username', 'email', 'role', 'password', 'created_at', 'updated_at'].includes(key)) {
          console.log(`${key}: ${user[key]}`);
        }
      });
      console.log('---');
    });

    // 3. 检查是否有锁定相关字段
    console.log('\n=== 检查可能的锁定相关字段 ===');
    const [columns] = await connection.execute(`
      DESCRIBE users
    `);

    const lockFields = columns.filter(col =>
      col.Field.includes('lock') ||
      col.Field.includes('block') ||
      col.Field.includes('ban') ||
      col.Field.includes('suspend') ||
      col.Field.includes('fail') ||
      col.Field.includes('attempt')
    );

    if (lockFields.length > 0) {
      console.log('发现可能的锁定相关字段:');
      lockFields.forEach(field => {
        console.log(`- ${field.Field}: ${field.Type} (${field.Null === 'YES' ? '可空' : '非空'})`);
      });
    } else {
      console.log('未发现明显的锁定相关字段');
    }

    // 4. 检查admin和admin5的具体区别
    console.log('\n=== Admin和Admin5对比分析 ===');
    if (adminUsers.length === 2) {
      const admin = adminUsers.find(u => u.username === 'admin');
      const admin5 = adminUsers.find(u => u.username === 'admin5');

      console.log('\nAdmin账户状态:');
      console.log(`- 账户角色: ${admin.role}`);
      console.log(`- 创建时间: ${admin.created_at}`);
      console.log(`- 更新时间: ${admin.updated_at}`);

      console.log('\nAdmin5账户状态:');
      console.log(`- 账户角色: ${admin5.role}`);
      console.log(`- 创建时间: ${admin5.created_at}`);
      console.log(`- 更新时间: ${admin5.updated_at}`);

      console.log('\n关键差异:');
      if (admin.role !== admin5.role) {
        console.log('⚠️  角色权限不同');
      }

      // 检查其他字段差异
      Object.keys(admin).forEach(key => {
        if (key !== 'id' && key !== 'username' && key !== 'password' && admin[key] !== admin5[key]) {
          console.log(`⚠️  字段 ${key} 不同: admin=${admin[key]}, admin5=${admin5[key]}`);
        }
      });
    } else {
      console.log('❌ 未找到admin和admin5两个账户');
    }

    // 5. 检查最近的登录活动
    console.log('\n=== 最近登录活动 ===');
    const [recentLogins] = await connection.execute(`
      SELECT username, last_login_at, updated_at
      FROM users
      WHERE username IN ('admin', 'admin5')
      ORDER BY last_login_at DESC
    `);

    recentLogins.forEach(user => {
      console.log(`${user.username}: 最后登录 ${user.last_login_at || '从未登录'}`);
    });

    console.log('\n✅ 检查完成');

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('数据库访问被拒绝，请检查用户名和密码');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('数据库不存在，请检查数据库名称');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('无法连接到数据库，请检查数据库服务是否启动');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📡 数据库连接已关闭');
    }
  }
}

// 执行检查
checkAdminStatus();