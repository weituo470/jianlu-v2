-- 简庐管理后台系统数据库架构
-- MySQL 8.0+

-- 创建数据库
CREATE DATABASE IF NOT EXISTS jianlu_admin 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE jianlu_admin;

-- 用户表
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'system_admin', 'operation_admin', 'team_admin') NOT NULL,
  status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
  profile JSON,
  last_login_at TIMESTAMP NULL,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
);

-- 团队表
CREATE TABLE teams (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar_url VARCHAR(255),
  creator_id VARCHAR(36) NOT NULL,
  status ENUM('active', 'inactive', 'dissolved') DEFAULT 'active',
  member_count INT DEFAULT 0,
  activity_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  INDEX idx_creator (creator_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- 团队成员表
CREATE TABLE team_members (
  id VARCHAR(36) PRIMARY KEY,
  team_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('admin', 'member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_team_user (team_id, user_id),
  INDEX idx_team (team_id),
  INDEX idx_user (user_id)
);

-- 活动表
CREATE TABLE activities (
  id VARCHAR(36) PRIMARY KEY,
  team_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type ENUM('meeting', 'event', 'training', 'other') NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location VARCHAR(255),
  max_participants INT,
  current_participants INT DEFAULT 0,
  status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled') DEFAULT 'draft',
  creator_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  INDEX idx_team (team_id),
  INDEX idx_creator (creator_id),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time)
);

-- 活动参与者表
CREATE TABLE activity_participants (
  id VARCHAR(36) PRIMARY KEY,
  activity_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  status ENUM('registered', 'attended', 'absent', 'cancelled') DEFAULT 'registered',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_activity_user (activity_id, user_id),
  INDEX idx_activity (activity_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);

-- 系统配置表
CREATE TABLE system_configs (
  id VARCHAR(36) PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSON NOT NULL,
  description TEXT,
  category VARCHAR(50),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (config_key),
  INDEX idx_category (category)
);

-- 操作日志表
CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(36),
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at)
);

-- 会话表
CREATE TABLE user_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  refresh_token_hash VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_token (token_hash),
  INDEX idx_expires (expires_at)
);