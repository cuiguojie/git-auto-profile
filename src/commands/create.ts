import { intro, outro, text, select } from '@clack/prompts';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { getConfigPath, getProfilesDir, expandPath, Profile } from '../utils.js';
import { GitConfigManager } from '../gitconfig-manager.js';

export async function createCommand(): Promise<void> {
  intro(chalk.cyan('Create new profile'));

  try {
    const configPath = getConfigPath();
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    const profilesDir = getProfilesDir(config);

    const name = await text({
      message: 'Profile name:',
      placeholder: 'work-github',
      validate: (value) => {
        if (!value) return 'Profile name is required';
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Use only letters, numbers, hyphens, and underscores';
        return undefined;
      }
    });

    if (typeof name !== 'string') {
      outro(chalk.yellow('Cancelled'));
      return;
    }

    const userName = await text({
      message: 'Git user.name:',
      placeholder: 'Your Name',
      validate: (value) => value ? undefined : 'User name is required'
    });

    const userEmail = await text({
      message: 'Git user.email:',
      placeholder: 'your.email@example.com',
      validate: (value) => {
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
        return undefined;
      }
    });

    const sshDir = path.join(process.env.HOME || '', '.ssh');
    const sshFiles = await fs.readdir(sshDir).catch(() => []);
    
    // 更智能的 SSH 私钥检测
    const privateKeys = [];
    for (const file of sshFiles) {
      if (file.endsWith('.pub')) continue; // 跳过公钥
      
      const filePath = path.join(sshDir, file);
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) continue;
        
        const content = await fs.readFile(filePath, 'utf8');
        
        // 检测常见的 SSH 私钥格式
        const isPrivateKey = (
          content.includes('-----BEGIN ') && 
          content.includes(' PRIVATE KEY-----') ||
          content.startsWith('-----BEGIN OPENSSH PRIVATE KEY-----') ||
          content.startsWith('-----BEGIN RSA PRIVATE KEY-----') ||
          content.startsWith('-----BEGIN DSA PRIVATE KEY-----') ||
          content.startsWith('-----BEGIN EC PRIVATE KEY-----') ||
          content.startsWith('-----BEGIN ED25519 PRIVATE KEY-----') ||
          // 老版本 OpenSSH 格式
          content.startsWith('SSH PRIVATE KEY FILE FORMAT 1.1')
        );
        
        if (isPrivateKey) {
          privateKeys.push(file);
        }
      } catch {
        // 文件无法读取，跳过
        continue;
      }
    }

    if (privateKeys.length === 0) {
      outro(chalk.red('No SSH keys found in ~/.ssh directory'));
      return;
    }

    const sshKey = await select({
      message: 'Select SSH key:',
      options: privateKeys.map(key => ({
        value: path.join('~/.ssh', key),
        label: key
      }))
    });

    if (typeof sshKey !== 'string') {
      outro(chalk.yellow('Cancelled'));
      return;
    }

    const urlPattern = await text({
      message: 'URL pattern (e.g., git@github.com:your-org/**):',
      placeholder: 'git@github.com:your-org/**',
      validate: (value) => value ? undefined : 'URL pattern is required'
    });

    if (typeof urlPattern !== 'string') {
      outro(chalk.yellow('Cancelled'));
      return;
    }

    // Create profile file
    const profile: Profile = {
      name: userName as string,
      email: userEmail as string,
      sshKey: sshKey as string
    };

    const profileContent = [
      '[user]',
      `    name = ${profile.name}`,
      `    email = ${profile.email}`,
      '[core]',
      `    sshCommand = ssh -i ${profile.sshKey}`
    ].join('\n');

    const profileFile = path.join(profilesDir, `${name}.conf`);
    await fs.writeFile(profileFile, profileContent);

    // 添加 includeIf 规则到 gitconfig
    try {
      await GitConfigManager.addIncludeIfRule(urlPattern, `${config.profilesPath}/${name}.conf`);
    } catch (error: any) {
      outro(chalk.red(error.message));
      return;
    }

    outro(chalk.green('✅ Profile created successfully!'));
    console.log(`Profile: ${chalk.cyan(name)}`);
    console.log(`File: ${chalk.cyan(profileFile)}`);

  } catch (error: any) {
    console.error(chalk.red('Error creating profile:'), error.message);
    process.exit(1);
  }
}