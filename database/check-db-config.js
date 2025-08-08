/**
 * 检查数据库配置
 */

console.log('🔍 检查数据库配置...\n');

// 显示当前配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jianlu_admin'
};

console.log('📋 当前数据库配置:');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   User: ${config.user}`);
console.log(`   Password: ${config.password ? '***设置了密码***' : '❌ 未设置密码'}`);
console.log(`   Database: ${config.database}`);

console.log('\n💡 如果配置不正确，请：');
console.log('1. 检查 .env 文件中的数据库配置');
console.log('2. 或者设置环境变量：');
console.log('   set DB_PASSWORD=your_password');
console.log('   set DB_USER=your_username');
console.log('   set DB_NAME=your_database');

// 测试连接
async function testConnection() {
  try {
    let mysql;
    try {
      mysql = require('mysql2/promise');
    } catch (err) {
      console.log('❌ mysql2 模块未安装');
      console.log('💡 请先安装: npm install mysql2');
      console.log('   或者使用SQL脚本方案: fix-with-sql.bat');
      return;
    }
    
    console.log('\n🔌 测试数据库连接...');
    const connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功！');
    
    // 检查数据库是否存在
    const [databases] = await connection.execute('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === config.database);
    
    if (dbExists) {
      console.log(`✅ 数据库 '${config.database}' 存在`);
    } else {
      console.log(`❌ 数据库 '${config.database}' 不存在`);
      console.log(`💡 请创建数据库: CREATE DATABASE ${config.database};`);
    }
    
    await connection.end();
    
  } catch (error) {
    console.log('❌ 数据库连接失败:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 解决方案:');
      console.log('1. 检查用户名和密码是否正确');
      console.log('2. 确保MySQL用户有足够权限');
      console.log('3. 如果是新安装的MySQL，可能需要设置root密码');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 解决方案:');
      console.log('1. 确保MySQL服务正在运行');
      console.log('2. 检查端口是否正确');
    }
  }
}

testConnection();