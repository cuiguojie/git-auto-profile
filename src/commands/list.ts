import { intro, outro } from '@clack/prompts';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { getConfigPath, getProfilesDir, expandPath } from '../utils.js';
import { GitConfigManager } from '../gitconfig-manager.js';

interface ProfileInfo {
  name: string;
  file: string;
  config: {
    name?: string;
    email?: string;
    sshKey?: string;
  };
  urlPatterns: string[];
}

export async function listCommand(): Promise<void> {
  intro(chalk.cyan('Available profiles'));

  try {
    const configPath = getConfigPath();
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    const profilesDir = getProfilesDir(config);
    
    // 读取所有 profile 文件
    const profileFiles = await fs.readdir(profilesDir).catch(() => []);
    const profiles: ProfileInfo[] = [];

    // 获取 URL 模式映射
    const urlMappings: Record<string, string[]> = {};
    const rules = await GitConfigManager.listIncludeIfRules();
    
    for (const rule of rules) {
      const profileName = path.basename(rule.profilePath, '.conf');
      if (!urlMappings[profileName]) {
        urlMappings[profileName] = [];
      }
      urlMappings[profileName].push(rule.urlPattern);
    }

    // 读取每个 profile 的详细信息
    for (const file of profileFiles) {
      if (!file.endsWith('.conf')) continue;
      
      const profileName = path.basename(file, '.conf');
      const profilePath = path.join(profilesDir, file);
      
      try {
        const content = await fs.readFile(profilePath, 'utf8');
        const lines = content.split('\n');
        const profileConfig: ProfileInfo['config'] = {};
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('name = ')) {
            profileConfig.name = trimmed.replace('name = ', '');
          } else if (trimmed.startsWith('email = ')) {
            profileConfig.email = trimmed.replace('email = ', '');
          } else if (trimmed.startsWith('sshCommand = ')) {
            const sshCmd = trimmed.replace('sshCommand = ', '');
            const match = sshCmd.match(/-i (\S+)/);
            if (match) {
              profileConfig.sshKey = match[1];
            }
          }
        }
        
        profiles.push({
          name: profileName,
          file: profilePath,
          config: profileConfig,
          urlPatterns: urlMappings[profileName] || []
        });
      } catch (error: any) {
        console.log(chalk.yellow(`⚠️  Could not read profile ${profileName}: ${error.message}`));
      }
    }

    if (profiles.length === 0) {
      console.log(chalk.yellow('No profiles found.'));
      console.log(chalk.gray('Run "gap create" to create your first profile.'));
      outro('');
      return;
    }

    console.log(chalk.bold(`\nFound ${profiles.length} profile${profiles.length > 1 ? 's' : ''}:\n`));

    profiles.forEach((profile, index) => {
      console.log(`${chalk.bold(`${index + 1}. ${profile.name}`)}`);
      console.log(`   ${chalk.gray('Name:')} ${profile.config.name || chalk.red('not set')}`);
      console.log(`   ${chalk.gray('Email:')} ${profile.config.email || chalk.red('not set')}`);
      console.log(`   ${chalk.gray('SSH Key:')} ${profile.config.sshKey || chalk.red('not set')}`);
      
      if (profile.urlPatterns.length > 0) {
        console.log(`   ${chalk.gray('URL Patterns:')}`);
        profile.urlPatterns.forEach(pattern => {
          console.log(`     ${chalk.cyan('•')} ${pattern}`);
        });
      } else {
        console.log(`   ${chalk.gray('URL Patterns:')} ${chalk.yellow('not configured')}`);
      }
      
      if (index < profiles.length - 1) {
        console.log();
      }
    });

    outro('');

  } catch (error: any) {
    console.error(chalk.red('Error listing profiles:'), error.message);
    process.exit(1);
  }
}