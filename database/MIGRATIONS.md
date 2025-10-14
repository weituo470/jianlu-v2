# 数据库迁移指南 / Database Migration Guide

该目录下的 SQL 与脚本现在通过统一的迁移清单进行管理。`migrations.json` 会按照分组定义执行顺序，新的 CLI 可以自动读取清单并串行执行需要的脚本。

## 1. 环境准备

1. 确保本地已安装 MySQL 并能访问目标实例。
2. 在 `database/.env` 中配置连接参数（或通过环境变量覆盖）：
   ```ini
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=jianlu_admin
   DB_USER=jianlu_app
   DB_PASSWORD=your_password_here
   ```
3. （首次使用）在 `database` 目录下安装依赖：`npm install`

## 2. 查看迁移分组

```bash
cd database
npm run migrate -- --list
```

默认会执行 `migrations.json` 中 `defaultGroups` 定义的组（当前仅包含 `baseline`）。

| Group ID            | 默认 | 描述 | 包含文件 |
|---------------------|------|------|----------|
| `baseline`          | ✅   | 建库必需的核心表结构、账号及初始化数据 | `schema.sql`, `setup.sql`, `init_data.sql` |
| `team-types`        | ⭕️  | 团队类型元数据（表结构 + teams 列扩展） | `create-team-types-table.sql`, `add-team-type-field.sql` |
| `activity-sequence` | ⭕️  | 活动排序字段与初始数据填充 | `add-activity-sequence-field.sql` |
| `wechat-login`      | ⭕️  | 用户表的微信登录字段及索引优化 | `add-wechat-fields.sql`, `optimize-wechat-fields.sql` |
| `cost-sharing`      | ⭕️  | 活动费用分摊与 AA 账户体系 | `extend-activities-cost-sharing.sql`, `create-account-system.sql`, `verify-aa-system.sql` |

> 说明：⭕️ 表示可选组，需要显式通过 `--group` 参数启用；默认不会执行。

## 3. 执行示例

- 仅运行基线脚本：
  ```bash
  npm run migrate
  ```
- 预览执行计划（不真正写库）：
  ```bash
  npm run migrate -- --dry-run --group baseline,wechat-login
  ```
- 执行基线 + 微信登录扩展：
  ```bash
  npm run migrate -- --group baseline,wechat-login
  ```
- 执行全部分组（包括可选项）：
  ```bash
  npm run migrate -- --all
  ```
- 指定临时数据库用户：
  ```bash
  npm run migrate -- --group baseline --user root --password secret --database jianlu_admin_dev
  ```

## 4. 传统脚本与人工步骤

以下脚本未纳入自动执行计划，原因包括：覆盖范围与现有分组重复、依赖后端代码（Sequelize）或只适用于一次性补数据。

- `add-activity-cost-fields.sql`、`extend-activities-simple.sql`、`create-accounts-simple.sql`
- `backup-before-delete-fix.sql`、`fix-user-deletion-mechanism.sql`
- `migrate-*.js`, `update-activity-sequence.js`, `migrate-team-types.js`
- 各类 `verify-*.sql` / `*check*.js`

如需使用这些脚本，请根据业务场景手动审阅内容并单独执行。

## 5. 故障排查

- **连接失败**：确认 `.env` 或命令行参数中的主机/端口/账号密码正确，并且 MySQL 已启动。
- **权限不足**：确保执行账号具备 `CREATE/ALTER/INSERT` 等权限；必要时可先用具有 `SUPER` 权限的账号运行 `setup.sql`。
- **重复执行导致的列存在错误**：大多数脚本属于一次性迁移，请在生产环境执行前先在备份库验证；必要时手动移除已存在字段或调整脚本。
- **想查看详细错误栈**：添加环境变量 `DEBUG=1` 再运行 CLI，会打印完整堆栈。

---

如需调整迁移顺序或新增脚本，请更新 `migrations.json` 并提交对应说明。
