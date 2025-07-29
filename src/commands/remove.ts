import { intro, outro, select, confirm } from '@clack/prompts';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { getConfigPath, getProfilesDir, expandPath } from '../utils.js';
import { GitConfigManager } from '../gitconfig-manager.js';

export async function removeCommand(): Promise<void> {
  intro(chalk.cyan('Remove profile'));

  try {
    const configPath = getConfigPath();
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    const profilesDir = getProfilesDir(config);
    
    // 获取所有 profile
    const profileFiles = await fs.readdir(profilesDir).catch(() => []);
    const profiles = profileFiles.filter(f => f.endsWith('.conf'));

    if (profiles.length === 0) {
      console.log(chalk.yellow('No profiles found to remove.'));
      outro('');
      return;
    }

    const profileNames = profiles.map(f => path.basename(f, '.conf'));

    const profileToRemove = await select({
      message: 'Select profile to remove:',
      options: profileNames.map(name => ({
        value: name,
        label: name
      }))
    });

    if (typeof profileToRemove !== 'string') {
      outro(chalk.yellow('Cancelled'));
      return;
    }

    // 确认删除
    const shouldRemove = await confirm({
      message: `Are you sure you want to remove profile "${profileToRemove}"?`,
      initialValue: false
    });

    if (!shouldRemove) {
      outro(chalk.yellow('Cancelled'));
      return;
    }

    // 删除 profile 文件
    const profileFile = path.join(profilesDir, `${profileToRemove}.conf`);
    await fs.unlink(profileFile);

    // 从 gitconfig 中移除对应的 includeIf 规则
    try {
      await GitConfigManager.removeIncludeIfRule(`${config.profilesPath}/${profileToRemove}.conf`);
    } catch (error: any) {
      console.warn(chalk.yellow('Warning: Failed to update .gitconfig'), error.message);
    }


    outro(chalk.green(`✅ Profile "${profileToRemove}" removed successfully!`));

  } catch (error: any) {
    console.error(chalk.red('Error removing profile:'), error.message);
    process.exit(1);
  }
}