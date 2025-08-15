#!/usr/bin/env node

/**
 * 数据安全修复验证脚本
 * 验证新的用户删除机制是否正常工作
 */

const path = require('path');

// 设置正确的路径
const backendPath = path.join(__dirname, '../backend');
require('dotenv').config({ path: path.join(backendPath, '.env') });

// 添加backend目录到模块搜索路径
process.chdir(backendPath);

const { connectDatabase } = require('./src/config/database');
const { User, UserDeletionAudit } = require('./src/models');
const logger = require('./src/utils/logger');
const { v4: uuidv4 } = require('uuid');

async function createTestUser() {
  const testUser = await User.create({
    id: uuidv4(),
    username: `test_delete_${Date.now()}`,
    email: `test_delete_${Date.now()}@test.com`,
    password_hash: 'test_password_hash',
    role: 'user',
    status: 'active'
  });
  
  console.log(`✅ 创建测试用户: ${testUser.username}`);
  return testUser;
}

async function testSafeDelete(user, operatorId) {
  console.log(`🧪 测试安全删除用户: ${user.username}`);
  
  const startTime = Date.now();
  
  try {
    // 执行安全删除
    await user.safeDelete('测试删除操作', operatorId);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ 删除操作完成，耗时: ${duration}ms`);
    
    // 验证删除结果
    await user.reload();
    
    const verifications = {
      statusChanged: user.status === 'deleted',
      deletedAtSet: user.deleted_at !== null,
      usernameModified: user.username.includes('deleted_'),
      emailModified: user.email.includes('deleted_') && user.email.includes('@deleted.local'),
      responseTime: duration < 2000 // 响应时间小于2秒
    };
    
    console.log('📊 删除结果验证:');
    Object.entries(verifications).forEach(([key, passed]) => {
      const status = passed ? '✅' : '❌';
      console.log(`   ${status} ${key}: ${passed}`);
    });
    
    // 检查审计记录
    const auditRecord = await UserDeletionAudit.findOne({
      where: { original_user_id: user.id }
    });
    
    const auditExists = auditRecord !== null;
    console.log(`   ${auditExists ? '✅' : '❌'} auditRecordCreated: ${auditExists}`);
    
    if (auditRecord) {
      console.log(`   📝 审计记录详情:`);
      console.log(`      ID: ${auditRecord.id}`);
      console.log(`      删除原因: ${auditRecord.deletion_reason}`);
      console.log(`      删除类型: ${auditRecord.deletion_type}`);
      console.log(`      操作人: ${auditRecord.deleted_by}`);
    }
    
    const allPassed = Object.values(verifications).every(v => v) && auditExists;
    
    return {
      success: true,
      allPassed,
      duration,
      verifications: { ...verifications, auditRecordCreated: auditExists },
      auditRecord: auditRecord ? auditRecord.toJSON() : null
    };
    
  } catch (error) {
    console.error(`❌ 删除操作失败:`, error.message);
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testDataIntegrity() {
  console.log('🔍 测试数据完整性检查...');
  
  const DataIntegrityChecker = require('./src/utils/dataIntegrityCheck');
  
  try {
    const results = await DataIntegrityChecker.checkUserDataIntegrity();
    
    console.log(`📊 完整性检查结果: ${results.summary.overallStatus}`);
    console.log(`   通过检查: ${results.summary.passedChecks}/${results.summary.totalChecks}`);
    
    if (!results.passed) {
      console.log('❌ 发现数据完整性问题:');
      results.checks.filter(c => !c.passed).forEach(check => {
        console.log(`   - ${check.name}: ${check.message}`);
      });
    }
    
    return results.passed;
    
  } catch (error) {
    console.error('❌ 数据完整性检查失败:', error.message);
    return false;
  }
}

async function cleanupTestData(testUsers) {
  console.log('🧹 清理测试数据...');
  
  try {
    // 删除测试用户
    for (const user of testUsers) {
      await User.destroy({ where: { id: user.id }, force: true });
    }
    
    // 删除测试审计记录
    await UserDeletionAudit.destroy({
      where: {
        deletion_reason: { [require('sequelize').Op.like]: '%测试删除操作%' }
      },
      force: true
    });
    
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 清理测试数据失败:', error.message);
  }
}

async function main() {
  console.log('🚀 开始数据安全修复验证...\n');
  
  const testUsers = [];
  
  try {
    // 连接数据库
    await connectDatabase();
    console.log('✅ 数据库连接成功\n');
    
    // 创建测试管理员用户
    const adminUser = await User.findOne({ where: { role: 'super_admin' } });
    if (!adminUser) {
      console.error('❌ 未找到管理员用户，无法进行测试');
      process.exit(1);
    }
    
    console.log(`👤 使用管理员用户进行测试: ${adminUser.username}\n`);
    
    // 测试1: 创建并删除单个用户
    console.log('📋 测试1: 单用户删除测试');
    const testUser1 = await createTestUser();
    testUsers.push(testUser1);
    
    const deleteResult1 = await testSafeDelete(testUser1, adminUser.id);
    
    if (!deleteResult1.success) {
      console.error('❌ 单用户删除测试失败');
      process.exit(1);
    }
    
    console.log(`✅ 单用户删除测试通过 (${deleteResult1.duration}ms)\n`);
    
    // 测试2: 批量删除测试
    console.log('📋 测试2: 批量删除测试');
    const batchUsers = [];
    for (let i = 0; i < 3; i++) {
      const user = await createTestUser();
      batchUsers.push(user);
      testUsers.push(user);
    }
    
    const batchResults = [];
    for (const user of batchUsers) {
      const result = await testSafeDelete(user, adminUser.id);
      batchResults.push(result);
    }
    
    const batchSuccess = batchResults.every(r => r.success && r.allPassed);
    const avgDuration = batchResults.reduce((sum, r) => sum + r.duration, 0) / batchResults.length;
    
    console.log(`${batchSuccess ? '✅' : '❌'} 批量删除测试${batchSuccess ? '通过' : '失败'} (平均耗时: ${avgDuration.toFixed(0)}ms)\n`);
    
    // 测试3: 数据完整性检查
    console.log('📋 测试3: 数据完整性检查');
    const integrityPassed = await testDataIntegrity();
    console.log(`${integrityPassed ? '✅' : '❌'} 数据完整性检查${integrityPassed ? '通过' : '失败'}\n`);
    
    // 生成测试报告
    const overallSuccess = deleteResult1.allPassed && batchSuccess && integrityPassed;
    
    console.log('📊 测试报告摘要:');
    console.log(`   单用户删除: ${deleteResult1.allPassed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   批量删除: ${batchSuccess ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   数据完整性: ${integrityPassed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   整体结果: ${overallSuccess ? '✅ 通过' : '❌ 失败'}`);
    
    // 保存测试报告
    const fs = require('fs');
    const report = {
      timestamp: new Date().toISOString(),
      tests: {
        singleUserDelete: deleteResult1,
        batchDelete: { results: batchResults, avgDuration, success: batchSuccess },
        dataIntegrity: { passed: integrityPassed }
      },
      summary: {
        overallSuccess,
        totalTests: 3,
        passedTests: [deleteResult1.allPassed, batchSuccess, integrityPassed].filter(Boolean).length
      }
    };
    
    const reportFile = `delete-fix-verification-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 测试报告已保存到: ${reportFile}`);
    
    // 清理测试数据
    await cleanupTestData(testUsers);
    
    console.log(`\n🎯 数据安全修复验证${overallSuccess ? '成功' : '失败'}！`);
    process.exit(overallSuccess ? 0 : 1);
    
  } catch (error) {
    console.error('❌ 验证过程中发生异常:', error.message);
    logger.error('删除修复验证异常:', error);
    
    // 尝试清理测试数据
    if (testUsers.length > 0) {
      await cleanupTestData(testUsers);
    }
    
    process.exit(1);
  }
}

// 运行验证
main();