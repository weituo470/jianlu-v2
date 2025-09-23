const jwt = require('jsonwebtoken');

// 使用环境变量中的JWT_SECRET
const JWT_SECRET = 'your_jwt_secret_key_here';

// 创建测试token
const tokenPayload = {
    id: '2dc4e858-f57b-42c4-a987-3c4f53243473',
    username: 'admin',
    role: 'super_admin',
    permissions: ['*']
};

const tokenOptions = {
    expiresIn: '24h'
};

const token = jwt.sign(tokenPayload, JWT_SECRET, tokenOptions);

console.log('测试Token:');
console.log(token);
console.log('\n使用方法:');
console.log('Authorization: Bearer ' + token);