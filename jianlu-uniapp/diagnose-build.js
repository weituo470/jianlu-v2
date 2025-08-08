const fs = require('fs')
const path = require('path')

console.log('🔍 HBuilderX 编译问题诊断')
console.log('========================')

// 1. 检查项目基本信息
console.log('\n1️⃣ 项目基本信息:')
const packagePath = path.join(__dirname, 'package.json')
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  console.log(`   - 项目名称: ${pkg.name || 'N/A'}`)
  console.log(`   - 版本: ${pkg.version || 'N/A'}`)
  console.log(`   - uni-app版本: ${pkg.dependencies?.['@dcloudio/uni-app'] || 'N/A'}`)
} else {
  console.log('   ❌ 未找到 package.json 文件')
}

// 2. 检查关键文件
console.log('\n2️⃣ 关键文件检查:')
const criticalFiles = [
  'manifest.json',
  'pages.json',
  'main.js',
  'App.vue',
  'uni.scss'
]

criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath)
    console.log(`   ✅ ${file} (${stats.size} bytes)`)
  } else {
    console.log(`   ❌ ${file} 缺失`)
  }
})

// 3. 检查pages.json语法
console.log('\n3️⃣ pages.json 语法检查:')
try {
  const pagesPath = path.join(__dirname, 'pages.json')
  if (fs.existsSync(pagesPath)) {
    const pagesContent = fs.readFileSync(pagesPath, 'utf8')
    const pagesJson = JSON.parse(pagesContent)
    console.log(`   ✅ pages.json 语法正确`)
    console.log(`   - 页面数量: ${pagesJson.pages?.length || 0}`)
    console.log(`   - 分包数量: ${pagesJson.subPackages?.length || 0}`)
    
    // 检查页面文件是否存在
    if (pagesJson.pages) {
      let missingPages = 0
      pagesJson.pages.forEach(page => {
        const pagePath = path.join(__dirname, page.path + '.vue')
        if (!fs.existsSync(pagePath)) {
          console.log(`   ⚠️  页面文件缺失: ${page.path}.vue`)
          missingPages++
        }
      })
      if (missingPages === 0) {
        console.log(`   ✅ 所有页面文件都存在`)
      }
    }
  }
} catch (error) {
  console.log(`   ❌ pages.json 语法错误: ${error.message}`)
}

// 4. 检查manifest.json语法
console.log('\n4️⃣ manifest.json 语法检查:')
try {
  const manifestPath = path.join(__dirname, 'manifest.json')
  if (fs.existsSync(manifestPath)) {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8')
    const manifestJson = JSON.parse(manifestContent)
    console.log(`   ✅ manifest.json 语法正确`)
    console.log(`   - 应用名称: ${manifestJson.name}`)
    console.log(`   - 应用ID: ${manifestJson.appid}`)
    console.log(`   - Vue版本: ${manifestJson.vueVersion}`)
    console.log(`   - 微信小程序AppID: ${manifestJson['mp-weixin']?.appid || 'N/A'}`)
  }
} catch (error) {
  console.log(`   ❌ manifest.json 语法错误: ${error.message}`)
}

// 5. 检查依赖和node_modules
console.log('\n5️⃣ 依赖检查:')
const nodeModulesPath = path.join(__dirname, 'node_modules')
if (fs.existsSync(nodeModulesPath)) {
  console.log(`   ✅ node_modules 存在`)
  
  // 检查关键依赖
  const keyDeps = [
    '@dcloudio/uni-app',
    '@dcloudio/uni-mp-weixin',
    '@dcloudio/uni-cli-shared'
  ]
  
  keyDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep)
    if (fs.existsSync(depPath)) {
      console.log(`   ✅ ${dep}`)
    } else {
      console.log(`   ❌ ${dep} 缺失`)
    }
  })
} else {
  console.log(`   ❌ node_modules 不存在，请运行 npm install`)
}

// 6. 检查编译输出目录
console.log('\n6️⃣ 编译输出检查:')
const unpackagePath = path.join(__dirname, 'unpackage')
if (fs.existsSync(unpackagePath)) {
  console.log(`   ✅ unpackage 目录存在`)
  
  const distPath = path.join(unpackagePath, 'dist')
  if (fs.existsSync(distPath)) {
    console.log(`   ✅ dist 目录存在`)
    
    const mpWeixinPath = path.join(distPath, 'dev', 'mp-weixin')
    if (fs.existsSync(mpWeixinPath)) {
      console.log(`   ✅ 微信小程序编译输出存在`)
      
      // 检查关键编译文件
      const compiledFiles = ['app.js', 'app.json', 'app.wxss']
      compiledFiles.forEach(file => {
        const filePath = path.join(mpWeixinPath, file)
        if (fs.existsSync(filePath)) {
          console.log(`   ✅ ${file}`)
        } else {
          console.log(`   ❌ ${file} 缺失`)
        }
      })
    } else {
      console.log(`   ⚠️  微信小程序编译输出不存在`)
    }
  } else {
    console.log(`   ⚠️  dist 目录不存在`)
  }
} else {
  console.log(`   ⚠️  unpackage 目录不存在`)
}

// 7. 检查可能的语法错误
console.log('\n7️⃣ 常见问题检查:')

// 检查main.js
try {
  const mainPath = path.join(__dirname, 'main.js')
  if (fs.existsSync(mainPath)) {
    const mainContent = fs.readFileSync(mainPath, 'utf8')
    if (mainContent.includes('createApp')) {
      console.log(`   ✅ main.js 使用 Vue 3 语法`)
    } else if (mainContent.includes('new Vue')) {
      console.log(`   ⚠️  main.js 使用 Vue 2 语法，但manifest.json配置为Vue 3`)
    }
  }
} catch (error) {
  console.log(`   ❌ main.js 检查失败: ${error.message}`)
}

// 8. 提供解决建议
console.log('\n🔧 解决建议:')
console.log('   1. 确保HBuilderX版本 >= 3.6.0')
console.log('   2. 确保微信开发者工具版本 >= 1.06.0')
console.log('   3. 清理编译缓存: 删除 unpackage 目录')
console.log('   4. 重新安装依赖: npm install')
console.log('   5. 检查项目路径中是否包含中文或特殊字符')
console.log('   6. 尝试重启HBuilderX和微信开发者工具')
console.log('   7. 检查防火墙和杀毒软件是否阻止了编译进程')

console.log('\n✅ 诊断完成！')
console.log('如果问题仍然存在，请检查HBuilderX控制台的详细错误信息。')
