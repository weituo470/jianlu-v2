# 简庐项目回收站系统

## 概述

这是一个安全的文件删除系统，被删除的文件不会直接永久删除，而是移动到回收站目录中，并保留完整的路径信息，支持随时恢复。

## 目录结构

```
.jianlu-trash/
├── README.md                    # 本文件
├── trash.log                   # 所有删除操作的完整记录
├── files/                      # 被删除的文件存储
│   └── YYYY-MM-DD/            # 按日期分类存储
├── metadata/                   # 文件元数据信息
│   └── YYYY-MM-DD/            # 按日期分类存储元数据
└── scripts/                    # 回收站管理脚本
    ├── trash.js                # 安全删除文件脚本
    ├── restore.js              # 恢复文件脚本
    ├── list.js                 # 列出回收站内容
    └── clean.js                # 永久清理脚本
```

## 使用方法

### 安全删除文件

```bash
# 使用Node.js脚本删除单个文件
node .jianlu-trash/scripts/trash.js path/to/file.txt

# 删除多个文件
node .jianlu-trash/scripts/trash.js file1.txt file2.txt dir/

# 使用通配符删除
node .jianlu-trash/scripts/trash.js "*.log"
```

### 查看回收站内容

```bash
# 列出所有回收站文件
node .jianlu-trash/scripts/list.js

# 按日期查看
node .jianlu-trash/scripts/list.js --date 2024-10-24

# 查看详细记录
node .jianlu-trash/scripts/list.js --verbose
```

### 恢复文件

```bash
# 恢复特定文件
node .jianlu-trash/scripts/restore.js --id <文件ID>

# 列出可恢复的文件
node .jianlu-trash/scripts/restore.js --list

# 恢复到指定位置
node .jianlu-trash/scripts/restore.js --id <文件ID> --to path/to/new/location
```

### 永久清理

```bash
# 清理超过30天的文件
node .jianlu-trash/scripts/clean.js --days 30

# 清理特定日期的文件
node .jianlu-trash/scripts/clean.js --date 2024-10-24

# 清空整个回收站（谨慎使用）
node .jianlu-trash/scripts/clean.js --all
```

## 文件记录格式

### trash.log 格式

每行记录一个删除操作，格式如下：
```
时间戳|原始路径|回收站路径|文件大小|操作类型|唯一ID
```

示例：
```
2024-10-24 15:30:45|admin-frontend/js/activities-manager.js.bak|files/2024-10-24/backup-activities-manager.js.bak|72456|FILE|trash_20241024_153045_001
2024-10-24 15:31:02|jianlu-uniapp/unpackage|files/2024-10-24/unpackage|1679360|DIRECTORY|trash_20241024_153102_002
```

### 元数据格式

每个被删除的文件都有对应的JSON元数据文件：

```json
{
  "id": "trash_20241024_153045_001",
  "originalPath": "admin-frontend/js/activities-manager.js.bak",
  "trashPath": "files/2024-10-24/backup-activities-manager.js.bak",
  "originalSize": 72456,
  "deletedAt": "2024-10-24T15:30:45.123Z",
  "deletedBy": "system",
  "fileType": "file",
  "checksum": "a1b2c3d4e5f6...",
  "permissions": "644"
}
```

## 注意事项

1. **安全性**：所有文件都被完整移动到回收站，不会丢失任何内容
2. **追溯性**：完整的操作日志和元数据记录
3. **恢复性**：支持单个文件或批量恢复
4. **空间管理**：建议定期清理旧的回收站文件
5. **权限保持**：恢复时保持原有的文件权限

## 自动化集成

可以将回收站系统集成到项目的工作流程中：

- Git hooks：在提交前自动清理临时文件
- CI/CD：在部署前安全删除构建产物
- 开发工具：集成到IDE的删除操作中

## 故障排除

如果遇到问题，请检查：
1. 回收站目录的权限设置
2. 磁盘空间是否充足
3. 元数据文件是否完整
4. trash.log文件是否可读写

## 更新日志

- v1.0.0: 初始版本，支持基本的文件删除和恢复功能