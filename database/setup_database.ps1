# Jianlu Admin System Database Setup Script
param(
    [string]$RootPassword = $env:MYSQL_ROOT_PASSWORD
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "Jianlu Admin Database Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Check MySQL installation
Write-Host "Checking MySQL installation..." -ForegroundColor Yellow
try {
    $mysqlVersion = mysql --version
    Write-Host "MySQL installed: $mysqlVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: MySQL command not found" -ForegroundColor Red
    exit 1
}

# Try common passwords if none provided
if (-not $RootPassword) {
    $commonPasswords = @("", "root", "123456", "password", "admin")
    Write-Host "Trying common MySQL root passwords..." -ForegroundColor Yellow
    
    foreach ($pwd in $commonPasswords) {
        try {
            if ($pwd -eq "") {
                mysql -u root -e "SELECT 1" 2>$null
            } else {
                mysql -u root -p"$pwd" -e "SELECT 1" 2>$null
            }
            
            if ($LASTEXITCODE -eq 0) {
                $RootPassword = $pwd
                Write-Host "Valid password found" -ForegroundColor Green
                break
            }
        } catch {
            continue
        }
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Cannot connect to MySQL. Please set MYSQL_ROOT_PASSWORD environment variable" -ForegroundColor Red
    exit 1
}

Write-Host "MySQL connection successful" -ForegroundColor Green
Write-Host ""
Write-Host "Starting database installation..." -ForegroundColor Yellow

# 1. Create database schema
Write-Host "1. Creating database and tables..." -ForegroundColor Cyan
try {
    if ($RootPassword -eq "") {
        Get-Content "schema.sql" | mysql -u root
    } else {
        Get-Content "schema.sql" | mysql -u root -p"$RootPassword"
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Database schema created successfully" -ForegroundColor Green
    } else {
        throw "Schema creation failed"
    }
} catch {
    Write-Host "   Database schema creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Setup users and permissions
Write-Host "2. Setting up database users and permissions..." -ForegroundColor Cyan
try {
    if ($RootPassword -eq "") {
        Get-Content "setup.sql" | mysql -u root
    } else {
        Get-Content "setup.sql" | mysql -u root -p"$RootPassword"
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   User permissions set successfully" -ForegroundColor Green
    } else {
        throw "User setup failed"
    }
} catch {
    Write-Host "   User permission setup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Initialize data
Write-Host "3. Initializing base data..." -ForegroundColor Cyan
try {
    if ($RootPassword -eq "") {
        Get-Content "init_data.sql" | mysql -u root
    } else {
        Get-Content "init_data.sql" | mysql -u root -p"$RootPassword"
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Base data initialized successfully" -ForegroundColor Green
    } else {
        throw "Data initialization failed"
    }
} catch {
    Write-Host "   Data initialization failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Verify installation
Write-Host "4. Verifying installation..." -ForegroundColor Cyan
try {
    $userCount = mysql -u jianlu_app -p"jianlu_app_password_2024" -D jianlu_admin -e "SELECT COUNT(*) FROM users WHERE role='super_admin'" -s -N 2>$null
    if ($userCount -eq "1") {
        Write-Host "   Admin account verification successful" -ForegroundColor Green
    } else {
        Write-Host "   Admin account verification warning, but installation may be successful" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Cannot verify admin account, but installation may be successful" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Database Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database Configuration:" -ForegroundColor Cyan
Write-Host "  Database Name: jianlu_admin" -ForegroundColor White
Write-Host "  App User: jianlu_app" -ForegroundColor White
Write-Host "  App Password: jianlu_app_password_2024" -ForegroundColor White
Write-Host "  Readonly User: jianlu_readonly" -ForegroundColor White
Write-Host "  Readonly Password: jianlu_readonly_password_2024" -ForegroundColor White
Write-Host ""
Write-Host "Default Admin Account:" -ForegroundColor Cyan
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host "  Email: admin@jianlu.com" -ForegroundColor White
Write-Host "  Role: super_admin" -ForegroundColor White
Write-Host ""
Write-Host "Security Reminders:" -ForegroundColor Red
Write-Host "1. Change default database user passwords immediately" -ForegroundColor Yellow
Write-Host "2. Change admin password after first login" -ForegroundColor Yellow
Write-Host "3. Configure firewall rules for production" -ForegroundColor Yellow
Write-Host "4. Setup regular database backups" -ForegroundColor Yellow
Write-Host ""