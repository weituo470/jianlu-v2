const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jianlu_admin'
};

async function createOrganizationTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');

    // 1. 创建机构表
    const createOrganizationsTable = `
      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        avatar_url VARCHAR(255),
        creator_id VARCHAR(36) NOT NULL,
        organization_type ENUM('government_certified', 'civil_organization') NOT NULL DEFAULT 'civil_organization',
        category_tags JSON,
        parent_id VARCHAR(36),
        hierarchy_level INT NOT NULL DEFAULT 1,
        hierarchy_path VARCHAR(500),
        join_methods JSON NOT NULL DEFAULT ('["invite"]'),
        status ENUM('active', 'inactive', 'dissolved') NOT NULL DEFAULT 'active',
        member_count INT NOT NULL DEFAULT 0,
        activity_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_creator_id (creator_id),
        INDEX idx_parent_id (parent_id),
        INDEX idx_hierarchy_level (hierarchy_level),
        INDEX idx_status (status),
        INDEX idx_organization_type (organization_type),
        
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES organizations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createOrganizationsTable);
    console.log('✅ organizations 表创建成功');

    // 2. 创建机构层级关系表
    const createOrganizationHierarchiesTable = `
      CREATE TABLE IF NOT EXISTS organization_hierarchies (
        id VARCHAR(36) PRIMARY KEY,
        ancestor_id VARCHAR(36) NOT NULL,
        descendant_id VARCHAR(36) NOT NULL,
        depth INT NOT NULL,
        
        UNIQUE KEY unique_hierarchy (ancestor_id, descendant_id),
        INDEX idx_ancestor_id (ancestor_id),
        INDEX idx_descendant_id (descendant_id),
        INDEX idx_depth (depth),
        
        FOREIGN KEY (ancestor_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (descendant_id) REFERENCES organizations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createOrganizationHierarchiesTable);
    console.log('✅ organization_hierarchies 表创建成功');

    // 3. 创建机构成员表
    const createOrganizationMembersTable = `
      CREATE TABLE IF NOT EXISTS organization_members (
        id VARCHAR(36) PRIMARY KEY,
        organization_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        role_id VARCHAR(36),
        nickname VARCHAR(50),
        join_method ENUM('invite', 'qrcode', 'apply') NOT NULL,
        status ENUM('pending', 'active', 'inactive') NOT NULL DEFAULT 'pending',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_member (organization_id, user_id),
        INDEX idx_organization_id (organization_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createOrganizationMembersTable);
    console.log('✅ organization_members 表创建成功');

    // 4. 创建机构角色表
    const createOrganizationRolesTable = `
      CREATE TABLE IF NOT EXISTS organization_roles (
        id VARCHAR(36) PRIMARY KEY,
        organization_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        permissions JSON NOT NULL DEFAULT ('[]'),
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INT NOT NULL DEFAULT 999,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_org_role (organization_id, name),
        INDEX idx_organization_id (organization_id),
        INDEX idx_name (name),
        INDEX idx_status (status),
        
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createOrganizationRolesTable);
    console.log('✅ organization_roles 表创建成功');

    // 5. 创建活动角色表
    const createActivityRolesTable = `
      CREATE TABLE IF NOT EXISTS activity_roles (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        permissions JSON NOT NULL DEFAULT ('[]'),
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INT NOT NULL DEFAULT 999,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_role_name (name),
        INDEX idx_name (name),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createActivityRolesTable);
    console.log('✅ activity_roles 表创建成功');

    // 6. 创建活动参与者角色表
    const createActivityParticipantRolesTable = `
      CREATE TABLE IF NOT EXISTS activity_participant_roles (
        id VARCHAR(36) PRIMARY KEY,
        activity_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        role_id VARCHAR(36) NOT NULL,
        assigned_by VARCHAR(36) NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_activity_user_role (activity_id, user_id, role_id),
        INDEX idx_activity_id (activity_id),
        INDEX idx_user_id (user_id),
        INDEX idx_role_id (role_id),
        INDEX idx_status (status),
        
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES activity_roles(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createActivityParticipantRolesTable);
    console.log('✅ activity_participant_roles 表创建成功');

    // 4. 插入机构分类标签数据
    const insertCategoryTags = `
      INSERT IGNORE INTO data_dictionaries (id, category, key_name, display_name, sort_order, is_active, created_at, updated_at) VALUES
      (UUID(), 'organization_category', 'business_association', '商会', 1, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'association', '协会', 2, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'society', '社团', 3, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'institution', '机构', 4, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'club', '俱乐部', 5, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'outdoor', '户外', 6, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'sports', '体育', 7, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'basketball', '篮球', 8, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'badminton', '羽毛球', 9, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'pingpong', '乒乓球', 10, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'football', '足球', 11, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'photography', '摄影', 12, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'calligraphy', '书法', 13, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'art', '美术', 14, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'reading', '读书', 15, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'chinese_studies', '国学', 16, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'charity', '爱心公益', 17, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'classmates', '同学', 18, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'veterans', '战友', 19, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'family_friends', '亲友', 20, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'colleagues', '同事', 21, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'education', '教培', 22, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'volunteer', '志愿者', 23, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'friends', '好友', 24, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'beauty', '美容', 25, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'food_drink', '吃喝', 26, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'entertainment', '娱乐', 27, 1, NOW(), NOW()),
      (UUID(), 'organization_category', 'other', '其他', 28, 1, NOW(), NOW());
    `;

    // 先检查data_dictionaries表是否存在
    const [tables] = await connection.execute("SHOW TABLES LIKE 'data_dictionaries'");
    if (tables.length === 0) {
      console.log('⚠️  data_dictionaries 表不存在，跳过分类标签数据插入');
    } else {
      await connection.execute(insertCategoryTags);
      console.log('✅ 机构分类标签数据插入成功');
    }

    console.log('\n🎉 机构管理系统数据库迁移完成！');
    console.log('\n创建的表：');
    console.log('- organizations (机构表)');
    console.log('- organization_hierarchies (机构层级关系表)');
    console.log('- organization_members (机构成员表)');

  } catch (error) {
    console.error('❌ 数据库迁移失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createOrganizationTables()
    .then(() => {
      console.log('迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { createOrganizationTables };