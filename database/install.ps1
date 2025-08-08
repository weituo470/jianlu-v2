# 简庐管理后台数据库安装脚本 (PowerShell)
# 支持安全密码输入和错误处理

Write-Host "========================================" -ForegroundColor Green
Write-Host "简庐管理后台数据库安装脚本" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 检查MySQL是否安装
try {
    $mysqlVersion = mysql --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL not found"
    }
    Write-Host "✓ MySQL已安装: $mysqlVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 错误: 未找到MySQL命令，请先安装MySQL 8.0" -ForegroundColor Red
    Write-Host "下载地址: https://dev.mysql.com/downloads/mysql/" -ForegroundColor Yellow
    Read-Host "按任意键退出"
    exit 1
}

Write-Host ""

# 安全地获取MySQL root密码
$rootPassword = Read-Host "请输入MySQL root密码" -AsSecureString
$rootPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($rootPassword))

Write-Host ""
Write-Host "正在测试MySQL连接..." -ForegroundColor Yellow

# 测试MySQL连接
try {
    $testResult = mysql -u root -p"$rootPasswordPlain" -e "SELECT 1" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Connection failed"
    }
    Write-Host "✓ MySQL连接成功" -ForegroundColor Green
} catch {
    Write-Host "✗ 错误: MySQL连接失败，请检查密码是否正确" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

Write-Host ""

# 检查数据库是否已存在
Write-Host "正在检查数据库状态..." -ForegroundColor Yellow
try {
    $dbExists = mysql -u root -p"$rootPasswordPlain" -e "SHOW DATABASES LIKE 'jianlu_admin'" 2>&1
    if ($dbExists -match "jianlu_admin") {
        $overwrite = Read-Host "数据库 'jianlu_admin' 已存在，是否覆盖? (y/N)"
        if ($overwrite -ne "y" -and $overwrite -ne "Y") {
            Write-Host "安装已取消" -ForegroundColor Yellow
            Read-Host "按任意键退出"
            exit 0
        }
        Write-Host "正在删除现有数据库..." -ForegroundColor Yellow
        mysql -u root -p"$rootPasswordPlain" -e "DROP DATABASE IF EXISTS jianlu_admin" 2>&1
    }
} catch {
    Write-Host "警告: 无法检查数据库状态，继续安装..." -ForegroundColor Yellow
}

Write-Host ""

# 执行数据库架构创建
Write-Host "正在创建数据库和表结构..." -ForegroundColor Yellow
try {
    $result = mysql -u root -p"$rootPasswordPlain" < schema.sql 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Schema creation failed: $result"
    }
    Write-Host "✓ 数据库架构创建成功" -ForegroundColor Green
} catch {
    Write-Host "✗ 错误: 数据库架构创建失败" -ForegroundColor Red
    Write-Host "错误详情: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "请检查 schema.sql 文件是否存在且格式正确" -ForegroundColor Yellow
    Read-Host "按任意键退出"
    exit 1
}

# 执行用户权限设置
Write-Host "正在设置数据库用户和权限..." -ForegroundColor Yellow
try {
    $result = mysql -u root -p"$rootPasswordPlain" < setup.sql 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "User setup failed: $result"
    }
    Write-Host "✓ 用户权限设置成功" -ForegroundColor Green
} catch {
    Write-Host "✗ 错误: 用户权限设置失败" -ForegroundColor Red
    Write-Host "错误详情: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "请检查 setup.sql 文件是否存在且格式正确" -ForegroundColor Yellow
    Read-Host "按任意键退出"
    exit 1
}

# 执行初始化数据
Write-Host "正在初始化基础数据..." -ForegroundColor Yellow
try {
    $result = mysql -u root -p"$rootPasswordPlain" < init_data.sql 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Data initialization failed: $result"
    }
    Write-Host "✓ 初始化数据成功" -ForegroundColor Green
} catch {
    Write-Host "✗ 错误: 初始化数据失败" -ForegroundColor Red
    Write-Host "错误详情: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "请检查 init_data.sql 文件是否存在且格式正确" -ForegroundColor Yellow
    Read-Host "按任意键退出"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "数据库安装完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 验证安装结果
Write-Host "正在验证安装结果..." -ForegroundColor Yellow
try {
    $userCount = mysql -u jianlu_app -pjianlu_app_password_2024 -D jianlu_admin -e "SELECT COUNT(*) as count FROM users WHERE role='super_admin'" -s -N 2>&1
    if ($userCount -eq "1") {
        Write-Host "✓ 管理员账户创建成功" -ForegroundColor Green
    } else {
        Write-Host "⚠ 警告: 管理员账户验证失败，返回值: $userCount" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ 警告: 无法验证管理员账户 - $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "数据库信息:" -ForegroundColor Cyan
Write-Host "  数据库名: jianlu_admin" -ForegroundColor White
Write-Host "  应用用户: jianlu_app" -ForegroundColor White
Write-Host "  应用密码: jianlu_app_password_2024" -ForegroundColor White
Write-Host ""
Write-Host "默认管理员账户:" -ForegroundColor Cyan
Write-Host "  用户名: admin" -ForegroundColor White
Write-Host "  密码: admin123" -ForegroundColor White
Write-Host "  邮箱: admin@jianlu.com" -ForegroundColor White
Write-Host ""
Write-Host "重要提醒:" -ForegroundColor Red
Write-Host "1. 请立即修改默认的数据库用户密码" -ForegroundColor Yellow
Write-Host "2. 首次登录后请修改管理员密码" -ForegroundColor Yellow
Write-Host "3. 生产环境请配置防火墙规则" -ForegroundColor Yellow
Write-Host "4. 定期备份数据库" -ForegroundColor Yellow
Write-Host ""

Read-Host "按任意键退出"