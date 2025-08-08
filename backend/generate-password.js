const bcrypt = require('bcryptjs');

async function generatePassword() {
  const password = 'admin123';
  const saltRounds = 12;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('密码:', password);
    console.log('哈希:', hash);
    
    // 验证哈希
    const isValid = await bcrypt.compare(password, hash);
    console.log('验证结果:', isValid);
    
  } catch (error) {
    console.error('错误:', error);
  }
}

generatePassword();