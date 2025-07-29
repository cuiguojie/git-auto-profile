import { intro, outro, text, confirm } from '@clack/prompts';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { expandPath, ensureDir, getConfigPath, Config } from '../utils.js';
import { GitConfigManager } from '../gitconfig-manager.js';

export async function initCommand(): Promise<void> {
  intro(chalk.cyan('Initialize git-auto-profile'));

  const configPath = getConfigPath();

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
      await GitConfigManager.ensureManagedBlock();
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