# git-auto-profile 开发路线图

## 阶段 1 - MVP 最小可用版本 ✅
**目标**: 解决核心痛点，实现基础功能

### 功能列表
- [x] `gap init` - 初始化工具环境
- [x] `gap create` - 创建单个 profile + URL 规则
- [x] `gap whoami` - 查看当前配置

### 技术实现要点
- Node.js ES 模块
- 使用 `commander` + `@clack/prompts` + `chalk`
- 支持 `~` 路径处理
- 非破坏性修改 `.gitconfig`
- 渐进式采用策略：不破坏现有配置

### 已修复问题
- [x] `init` 命令在取消时不再创建目录
- [x] `whoami` 命令显示仓库 profile 状态
- [x] 修复 includeIf 语法错误（将 `=` 改为 `:`）
- [x] 修复 `create` 命令的追加逻辑（避免覆盖）
- [x] 改进 SSH key 检测逻辑，支持自定义文件名
- [x] 修复 `whoami` 命令显示问题（不再误用文件夹名）

---

## 阶段 2 - 增强管理功能
**目标**: 提升管理体验

### 功能列表
- [ ] `gap list` - 查看所有 profile
- [ ] `gap remove` - 删除 profile

---

## 阶段 3 - 体验优化
**目标**: 完善用户体验

### 功能列表
- [ ] 支持多个 URL 模式
- [ ] 交互式体验优化
- [ ] 配置文件备份机制
- [ ] Windows 兼容性测试
