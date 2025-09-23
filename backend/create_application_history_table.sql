-- 创建活动申请历史记录表
CREATE TABLE IF NOT EXISTS activity_application_histories (
  id CHAR(36) PRIMARY KEY,
  activity_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  participant_id CHAR(36) NOT NULL,
  old_status ENUM('pending', 'registered', 'approved', 'attended', 'absent', 'cancelled', 'rejected') NULL,
  new_status ENUM('pending', 'registered', 'approved', 'attended', 'absent', 'cancelled', 'rejected') NOT NULL,
  changed_by CHAR(36) NOT NULL,
  reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (activity_id) REFERENCES activities(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (participant_id) REFERENCES activity_participants(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- 添加索引
CREATE INDEX idx_history_activity_id ON activity_application_histories(activity_id);
CREATE INDEX idx_history_user_id ON activity_application_histories(user_id);
CREATE INDEX idx_history_participant_id ON activity_application_histories(participant_id);
CREATE INDEX idx_history_changed_by ON activity_application_histories(changed_by);
CREATE INDEX idx_history_created_at ON activity_application_histories(created_at);