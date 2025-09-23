require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // 1. 添加 require_approval 字段
    console.log('📝 Adding require_approval column to teams table...');
    await sequelize.query(`
      ALTER TABLE teams 
      ADD COLUMN require_approval BOOLEAN DEFAULT FALSE NOT NULL 
      COMMENT '是否需要审核加入申请'
    `);
    console.log('✅ Column added successfully');
    
    // 2. 创建索引
    console.log('📝 Creating index for require_approval...');
    await sequelize.query(`
      CREATE INDEX idx_teams_require_approval ON teams(require_approval)
    `);
    console.log('✅ Index created successfully');
    
    // 3. 创建团队申请表
    console.log('📝 Creating team_applications table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS team_applications (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        reason TEXT,
        status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending' NOT NULL,
        rejection_reason TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        processed_by VARCHAR(36) NULL,
        
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
        
        UNIQUE KEY uk_team_user_pending (team_id, user_id, status),
        
        INDEX idx_team_applications_team_id (team_id),
        INDEX idx_team_applications_user_id (user_id),
        INDEX idx_team_applications_status (status),
        INDEX idx_team_applications_applied_at (applied_at)
      )
    `);
    console.log('✅ team_applications table created successfully');
    
    // 4. 创建团队申请历史表
    console.log('📝 Creating team_application_histories table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS team_application_histories (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        application_id VARCHAR(36) NOT NULL,
        old_status ENUM('pending', 'approved', 'rejected', 'cancelled') NULL,
        new_status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL,
        changed_by VARCHAR(36) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (application_id) REFERENCES team_applications(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_team_application_histories_team_id (team_id),
        INDEX idx_team_application_histories_user_id (user_id),
        INDEX idx_team_application_histories_application_id (application_id),
        INDEX idx_team_application_histories_changed_by (changed_by),
        INDEX idx_team_application_histories_created_at (created_at)
      )
    `);
    console.log('✅ team_application_histories table created successfully');
    
    // 5. 验证迁移结果
    console.log('📝 Verifying migration results...');
    const [teamsColumns] = await sequelize.query('SHOW COLUMNS FROM teams');
    console.log('✅ Teams table structure:');
    console.table(teamsColumns);
    
    const [applicationsCount] = await sequelize.query('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = "team_applications"');
    const [historiesCount] = await sequelize.query('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = "team_application_histories"');
    
    console.log(`✅ team_applications table exists: ${applicationsCount[0].count > 0 ? 'Yes' : 'No'}`);
    console.log(`✅ team_application_histories table exists: ${historiesCount[0].count > 0 ? 'Yes' : 'No'}`);
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
