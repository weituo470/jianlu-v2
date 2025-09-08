简庐团队系统设计文档
1. 系统架构设计
基于现有的简单团队系统，我们需要进行重大架构升级来支持简庐文档中的复杂需求：

核心架构变更：

将现有的Team模型扩展为Organization（机构）模型
新增多层级结构支持（一级机构、二级机构、分组）
重构用户身份体系（P/Q/V三种类型）
新增复杂的角色权限系统
集成资金管理和虚拟币系统
2. 数据库设计
新增核心表结构：

organizations - 机构表（替换teams）
organization_hierarchies - 机构层级关系表
organization_members - 机构成员表
organization_roles - 机构角色表
organization_permissions - 机构权限表
user_quantum_accounts - 用户虚拟币账户表
financial_accounts - 资金账户表
trust_deposits - 诚信金管理表
3. 用户身份体系重构
扩展User模型：

添加member_type字段（P/Q/V）
添加17位ID生成规则
添加昵称字段（20字节限制）
添加quantum_balance虚拟币余额
4. 权限系统设计
两套权限体系：

机构权限：12种权限（创建、审核、授权等）
活动权限：10种权限（编辑、记账、结算等）
5. 资金管理系统
五个子系统：

诚信金管理（5级退还规则）
AA费用管理（复杂计算公式）
机构费用管理（多人审核）
个人资金管理（专项账户）
商户资金管理（电商模式）
这个设计需要大约3-4个月的开发时间，包含约50个新的API接口和15个新的数据表。