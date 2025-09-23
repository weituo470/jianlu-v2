-- 创建团队申请表
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
  
  -- 确保同一用户对同一团队只能有一个待处理的申请
  UNIQUE KEY uk_team_user_pending (team_id, user_id, status),
  
  INDEX idx_team_applications_team_id (team_id),
  INDEX idx_team_applications_user_id (user_id),
  INDEX idx_team_applications_status (status),
  INDEX idx_team_applications_applied_at (applied_at)
);

-- 创建团队申请历史表
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
);
