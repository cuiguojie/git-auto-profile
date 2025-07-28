import { intro, outro, text, confirm } from '@clack/prompts';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { expandPath, ensureDir, getConfigPath, getGitConfigPath, Config } from '../utils.js';

export async function initCommand(): Promise<void> {
  intro(chalk.cyan('Initialize git-auto-profile'));

  const configPath = getConfigPath();
  const gitConfigPath = getGitConfigPath();

  try {
    try {
      await fs.access(configPath);
      const shouldOverwrite = await confirm({
        message: 'git-auto-profile is already initialized. Re-initialize?'
      });
      
      if (!shouldOverwrite) {
        outro(chalk.yellow('Initialization cancelled'));
        return;
      }
    } catch {
      // 配置文件不存在，继续初始化
    }

    const profilesPath = await text({
      message: 'Where should profile files be stored?',
      placeholder: '~/.git-auto-profile/profiles',
      initialValue: '~/.git-auto-profile/profiles'
    });

    if (typeof profilesPath !== 'string') {
      outro(chalk.yellow('Initialization cancelled'));
      return;
    }

    const configDir = path.dirname(configPath);
    await ensureDir(configDir);
    
    const expandedPath = expandPath(profilesPath);
    await ensureDir(expandedPath);

    const config: Config = {
      profilesPath: profilesPath
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    try {
      let gitConfigContent = '';
      try {
        gitConfigContent = await fs.readFile(gitConfigPath, 'utf8');
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
      }

      const managedBlockStart = '# --- GIT-AUTO-PROFILE MANAGED BLOCK ---';
      const managedBlockEnd = '# --- END GIT-AUTO-PROFILE MANAGED BLOCK ---';

      const startIndex = gitConfigContent.indexOf(managedBlockStart);
      const endIndex = gitConfigContent.indexOf(managedBlockEnd);

      let newContent: string;
      if (startIndex !== -1 && endIndex !== -1) {
        // 块已存在，替换内容
        newContent = gitConfigContent.substring(0, startIndex) + 
                    managedBlockStart + '\n' + managedBlockEnd + '\n' +
                    gitConfigContent.substring(endIndex + managedBlockEnd.length);
      } else {
        // 添加新块
        newContent = gitConfigContent + 
                    (gitConfigContent.endsWith('\n') ? '' : '\n') +
                    managedBlockStart + '\n' + managedBlockEnd + '\n';
      }

      await fs.writeFile(gitConfigPath, newContent);
    } catch (error: any) {
      console.error(chalk.red('Warning: Failed to update .gitconfig'), error.message);
    }

    outro(chalk.green('✅ git-auto-profile initialized successfully!'));
    console.log(`Profile directory: ${chalk.cyan(profilesPath)}`);

  } catch (error: any) {
    console.error(chalk.red('Error during initialization:'), error.message);
    process.exit(1);
  }
}