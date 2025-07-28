# **项目开发文档：`git-auto-profile` (CLI 工具)**

## **1. 项目概述 (Overview)**

**项目名称**: `git-auto-profile`

**核心目标**: 开发一个 Node.js 命令行接口 (CLI) 工具，名为 `git-auto-profile` (可执行命令为 `npx @cuiguojie/git-auto-profile` 或者 `npx @cuiguojie/gap`)。该工具旨在为单机环境（尤其是公司电脑）下的用户，提供一个无缝的、自动化的、上下文感知的 Git 身份管理方案。它通过根据当前 Git 仓库的远程 URL，自动切换 `user.name`, `user.email` 和使用的 SSH 密钥，从根本上解决在多身份（如工作与个人）间切换时容易出错的核心痛点。


## **2. 核心概念与架构 (Core Concepts & Architecture)**

该工具的架构基于三个核心文件类型和清晰的分层：

1.  **工具锚点配置 (`config.json`)**:
    *   **位置**: `~/.git-auto-profile/config.json` (固定路径)。
    *   **格式**: JSON。
    *   **作用**: 由 `git-auto-profile` 工具自身管理和读取。其**唯一核心职责**是记录用户存放所有 Profile 文件的目录路径 (`profilesPath`)。这使得用户的 Profile 库位置可以自定义。
    *   **Git 感知**: Git 完全不知道此文件的存在。

2.  **Profile 配置文件 (`<profile-name>.conf`)**:
    *   **位置**: 用户在 `init` 时指定的 `profilesPath` 目录内。
    *   **格式**: INI (Git Config 格式)。
    *   **作用**: 定义一个独立的“身份卡片”，包含 `user.name`, `user.email` 和 `core.sshCommand` (指向特定 SSH 密钥)。每个 Profile 一个文件。
    *   **Git 感知**: Git 通过 `~/.gitconfig` 中的 `includeIf` 指令来读取这些文件。

3.  **Git 主配置文件 (`~/.gitconfig`)**:
    *   **位置**: `~/.gitconfig` (固定路径)。
    *   **格式**: INI。
    *   **作用**: 这是 Git 的主配置文件。我们的工具**只应**在一个被特殊注释标记的区块内，以非破坏性的方式添加、修改或删除 `[includeIf]` 规则。这些规则是连接“远程 URL 模式”和“Profile 配置文件”的桥梁。
    *   **Git 感知**: 这是 Git 的核心配置文件，所有规则都由 Git 直接解析和执行。


## **3. V1 版本功能命令详解 (CLI Commands Specification - V1)**

### **`gap init`**
*   **描述**: 初始化工具环境。这是用户必须执行的第一个命令。
*   **实现逻辑**:
    1.  检查 `~/.git-auto-profile/config.json` 是否已存在。如果存在，提示用户已初始化，并询问是否要覆盖并重新开始。
    2.  交互式地询问用户存放 Profile 文件的目录路径。
    3.  提供一个默认路径建议: `~/.git-auto-profile/profiles`。用户可直接回车接受或输入自定义路径。
    4.  创建用户指定的目录（如果不存在）。
    5.  创建并写入 `~/.git-auto-profile/config.json`，内容为 `{ "profilesPath": "<用户选择的路径>" }`。**注意**: 路径中应使用 `~` 而非展开的绝对路径，以保证可移植性。
    6.  检查 `~/.gitconfig` 文件。如果不存在我们管理的标记块，则在文件末尾追加：
        ```
        # --- GIT-AUTO-PROFILE MANAGED BLOCK ---
        # --- END GIT-AUTO-PROFILE MANAGED BLOCK ---
        ```
    7.  显示成功信息，告知用户 Profile 库的位置。

### **`gap create` (别名: `add`)**
*   **描述**: 一体化地创建一个新的 Profile 并关联其第一个 URL 规则。
*   **实现逻辑**:
    1.  交互式地提示用户输入 Profile 的名称（如 `work-new`）。此名称将作为 `.conf` 文件的文件名。
    2.  交互式地提示用户输入 `user.name` 和 `user.email`。
    3.  扫描 `~/.ssh` 目录，列出所有可用的私钥文件，让用户选择。
    4.  交互式地提示用户输入第一个关联的 URL 模式 (e.g., `git@github.com:my-org/**`)。
    5.  **文件写入操作**:
        a. **创建 Profile 文件**: 在 `profilesPath` 目录下创建一个新的 `<profile-name>.conf` 文件。文件内容格式如下：
           ```ini
           [user]
               name = <输入的用户名>
               email = <输入的邮箱>
           [core]
               sshCommand = ssh -i <选择的SSH密钥路径，使用~符号>
           ```
        b. **修改 `.gitconfig`**: 在管理标记块内，添加一条新的 `[includeIf]` 规则：
           ```ini
           [includeIf "hasconfig:remote.*.url=<输入的URL模式>"]
               path = <Profile文件的路径，使用~符号>
           ```

### **`gap list` (别名: `ls`)**
*   **描述**: 列出所有已配置的 Profile 及其详细信息和关联规则。
*   **实现逻辑**:
    1.  读取 `config.json` 获取 `profilesPath`。
    2.  遍历 `profilesPath` 目录下的所有 `.conf` 文件，解析它们的内容（name, email, key）。
    3.  解析 `~/.gitconfig`，提取管理标记块内的所有 `[includeIf]` 规则。
    4.  对于每个 Profile，查找有哪些 `includeIf` 规则的 `path` 指向它。
    5.  以清晰、美观的格式，将每个 Profile 及其关联的 URL 列表打印到控制台。

### **`gap remove` (别名: `rm`)**
*   **描述**: 安全地删除一个 Profile 及其所有关联的 URL 规则。
*   **实现逻辑**:
    1.  列出所有 Profile，让用户选择一个进行删除。
    2.  进行二次确认，防止误操作。
    3.  **执行操作**:
        a. **首先**，解析 `~/.gitconfig`，删除所有 `path` 指向该 Profile 文件的 `includeIf` 规则。
        b. **然后**，从 `profilesPath` 目录中删除对应的 `.conf` 文件。

### **`gap whoami`**
*   **描述**: 显示当前 Git 上下文最终生效的配置及其来源。
*   **实现逻辑**:
    1.  使用 `child_process` 执行 `git rev-parse --is-inside-work-tree` 判断是否在 Git 仓库内。
    2.  **如果在仓库外**：执行 `git config --global ...` 显示全局配置。
    3.  **如果在仓库内**：
        a. 执行 `git config --show-origin --get user.name`。
        b. 执行 `git config --show-origin --get user.email`。
        c. 执行 `git config --show-origin --get core.sshCommand`。
        d. 解析命令的输出，将值和来源文件路径 (`from: ...`) 分开，并格式化输出。


## **4. 技术栈与依赖建议 (Tech Stack & Dependencies)**

*   **语言**: Node.js (建议使用最新的 LTS 版本)
*   **模块系统**: ES Modules (`"type": "module"` in `package.json`)
*   **核心依赖**:
    *   **命令行框架**: `commander` 或 `yargs` (用于构建命令和解析参数)
    *   **交互式提示**: `@clack/prompts` (现代、美观) 或 `inquirer` (经典、稳定)
    *   **INI 文件处理**: `ini` (用于安全地解析和序列化 `.gitconfig` 和 `.conf` 文件，避免破坏性的字符串操作)
    *   **美化输出**: `chalk` (用于在控制台输出带颜色的文本)
*   **内置模块**: `fs/promises`, `path`, `os`, `child_process`。


## **5. `package.json` 关键配置**

```json
{
  "name": "cuiguojie@git-auto-profile",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "git-auto-profile": "./cli.js",
    "gap": "./cli.js"
  }
}
```