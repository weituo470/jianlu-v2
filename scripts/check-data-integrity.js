#!/usr/bin/env node

/**
 * 数据完整性检查命令行工具
 * 用法: node scripts/check-data-integrity.js [--fix]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const { connectDatabase } = require('../backend/src/config/database');
const DataIntegrityChecker = require('../backend/src/utils/dataIntegrityCheck');
const logger = require('../backend/src/utils/logger');

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  
  console.log('🔍 开始数据完整性检查...\n');
  
  try {
    // 连接数据库
    await connectDatabase();
    console.log('✅ 数据库连接成功\n');
    
    // 执行完整性检查
    const checkResults = await DataIntegrityChecker.checkUserDataIntegrity();
    
    // 显示检查结果
    console.log('📊 检查结果摘要:');
    console.log(`   总检查项: ${checkResults.summary.totalChecks}`);
    console.log(`   通过检查: ${checkResults.summary.passedChecks}`);
    console.log(`   失败检查: ${checkResults.summary.failedChecks}`);
    console.log(`   整体状态: ${checkResults.summary.overallStatus}\n`);
    
    // 显示详细结果
    console.log('📋 详细检查结果:');
    checkResults.checks.forEach((check, index) => {
      const status = check.passed ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${check.name}`);
      console.log(`      ${check.message}`);
      
      if (!check.passed && check.details) {
        // 显示问题详情
        if (check.details.missingAuditsCount > 0) {
          console.log(`      缺少审计记录的用户: ${check.details.missingAuditsCount} 个`);
        }
        if (check.details.duplicateUsernames?.length > 0) {
          console.log(`      重复用户名: ${check.details.duplicateUsernames.join(', ')}`);
        }
        if (check.details.duplicateEmails?.length > 0) {
          console.log(`      重复邮箱: ${check.details.duplicateEmails.join(', ')}`);
        }
        if (check.details.inconsistentUsers?.length > 0) {
          console.log(`      状态不一致用户: ${check.details.inconsistentUsers.length} 个`);
        }
      }
      console.log('');
    });
    
    // 如果有问题且用户要求修复
    if (!checkResults.passed && shouldFix) {
      console.log('🔧 开始修复数据不一致问题...\n');
      
      const fixResults = await DataIntegrityChecker.fixDataInconsistencies(checkResults);
      
      console.log('🛠️ 修复结果摘要:');
      console.log(`   总修复项: ${fixResults.summary.totalFixes}`);
      console.log(`   成功修复: ${fixResults.summary.successfulFixes}`);
      console.log(`   修复失败: ${fixResults.summary.failedFixes}\n`);
      
      // 显示修复详情
      console.log('📋 详细修复结果:');
      fixResults.fixes.forEach((fix, index) => {
        const status = fix.success ? '✅' : '❌';
        console.log(`   ${index + 1}. ${status} ${fix.checkName}`);
        console.log(`      ${fix.message || fix.error}`);
        console.log('');
      });
      
      // 修复后重新检查
      if (fixResults.summary.successfulFixes > 0) {
        console.log('🔍 修复后重新检查...\n');
        const recheckResults = await DataIntegrityChecker.checkUserDataIntegrity();
        console.log(`修复后状态: ${recheckResults.summary.overallStatus}`);
      }
      
    } else if (!checkResults.passed) {
      console.log('💡 发现数据不一致问题，使用 --fix 参数可尝试自动修复');
      console.log('   命令: node scripts/check-data-integrity.js --fix\n');
    }
    
    // 保存检查结果到文件
    const fs = require('fs');
    const resultFile = `data-integrity-check-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(resultFile, JSON.stringify({
      checkResults,
      fixResults: shouldFix ? fixResults : null
    }, null, 2));
    
    console.log(`📄 检查结果已保存到: ${resultFile}`);
    
    // 设置退出码
    process.exit(checkResults.passed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ 数据完整性检查失败:', error.message);
    logger.error('数据完整性检查异常:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

// 运行主函数
main();