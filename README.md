# git-auto-profile (gap)

自动根据 Git 远程仓库 URL 切换 Git 配置和 SSH 密钥的工具。

## 功能特点

- 🎯 **智能匹配**：基于远程仓库 URL 自动应用对应 Git 配置
- 🔑 **多 SSH 密钥**：为不同项目使用不同的 SSH 密钥
- 🛡️ **非破坏性**：渐进式采用，不影响现有 Git 配置
- ⚡ **简单易用**：简洁的命令行交互，无需复杂配置

## 使用

### 使用 npx（推荐）
```bash
npx @cuiguojie/gap <command>
```

### 使用 pnpm
```bash
pnpm dlx @cuiguojie/gap <command>
# 或
pnpm exec @cuiguojie/gap <command>
```

### 使用 bun
```bash
bunx @cuiguojie/gap <command>
```

## 快速开始

### 1. 初始化
```bash
npx @cuiguojie/gap init
```
设置 profile 文件存储目录，默认：`~/.git-auto-profile/profiles`

### 2. 创建 Profile
```bash
npx @cuiguojie/gap create
```
交互式创建 profile：
- 输入 profile 名称（如：work-github）
- 设置 Git 用户名和邮箱
- 选择 SSH 密钥
- 设置匹配的 URL 模式（如：git@github.com:your-org/**）

### 3. 查看当前配置
```bash
npx @cuiguojie/gap whoami
```
显示当前 Git 配置和激活的 profile

### 4. 查看所有 Profile
```bash
npx @cuiguojie/gap list
```
列出所有已创建的 profile 及其关联的 URL 模式

### 5. 删除 Profile
```bash
npx @cuiguojie/gap remove
```
交互式选择要删除的 profile

## 使用示例

### 工作和个人项目分离

1. **创建工作 profile**
```bash
npx @cuiguojie/gap create
# Profile name: work-github
# Git user.name: Your Work Name
# Git user.email: work@company.com
# SSH key: ~/.ssh/id_ed25519_work
# URL pattern: git@github.com:company/**
```

2. **创建个人 profile**
```bash
npx @cuiguojie/gap create
# Profile name: personal-github
# Git user.name: Your Name
# Git user.email: personal@example.com
# SSH key: ~/.ssh/id_ed25519_personal
# URL pattern: git@github.com:your-username/**
```

### 多平台支持

支持各种 Git 平台：
- GitHub: `git@github.com:username/**`
- 自建 GitLab: `git@your-gitlab.com:group/**`

## URL 模式语法

支持通配符匹配：
- `**` 匹配任意字符（包括路径分隔符）
- `*` 匹配任意字符（不包括路径分隔符）

示例：
- `git@github.com:your-org/**` - 匹配组织下所有仓库
- `git@gitlab.com:company/project-*` - 匹配特定前缀的项目
- `git@*.company.com:*/**` - 匹配公司所有 GitLab 实例

## 工作原理

1. 在 `~/.gitconfig` 中添加 managed block
2. 使用 `includeIf` 规则根据远程 URL 动态加载配置
3. 每个 profile 存储为独立的 `.conf` 文件
4. 完全兼容现有 Git 配置

## 文件结构

```
~/.git-auto-profile/
├── config.json                 # 工具配置
└── profiles/
    ├── work-github.conf        # 工作配置
    ├── personal-github.conf    # 个人配置
    └── client-xyz.conf         # 客户配置
```

## 开发

### 本地开发
```bash
# 克隆项目
git clone <repo-url>
cd git-auto-profile

# 安装依赖
npm install

# 测试本地版本（在项目内使用）
npm run start init
npm run start create

# 或临时全局测试
npm link
npx @cuiguojie/gap --help

# 构建发布版本
npm run build
```

### 项目结构
```
src/
├── cli.ts              # CLI 入口
├── commands/           # 命令实现
│   ├── init.ts         # 初始化
│   ├── create.ts       # 创建 profile
│   ├── list.ts         # 列出 profile
│   ├── remove.ts       # 删除 profile
│   └── whoami.ts       # 查看当前配置
├── gitconfig-manager.ts # Git 配置管理
└── utils.ts            # 工具函数
```

## 包管理器支持

### npm/yarn
```bash
npx @cuiguojie/gap <command>
```

### pnpm
```bash
pnpm dlx @cuiguojie/gap <command>
# 或
pnpm exec @cuiguojie/gap <command>
```

### bun
```bash
bunx @cuiguojie/gap <command>
```

## 常见问题

### Q: 如何修改已创建的 profile？
A: 直接编辑 `~/.git-auto-profile/profiles/[profile-name].conf` 文件，或使用 `npx @cuiguojie/gap remove` 后重新创建。

### Q: 支持 Windows 吗？
A: 待测试

### Q: 会影响现有 Git 配置吗？
A: 不会。工具只在 managed block 内操作，不会影响现有配置。

### Q: 如何调试？
```bash
# 查看详细输出
npx @cuiguojie/gap whoami

# 检查配置文件
cat ~/.gitconfig
ls ~/.git-auto-profile/profiles/
```
