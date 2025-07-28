import { intro, outro, text, select } from '@clack/prompts';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { getConfigPath, getProfilesDir, expandPath, getGitConfigPath, Profile } from '../utils.js';

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
    const privateKeys = sshFiles.filter(f => 
      (f.startsWith('id_') || f.endsWith('.pem')) && 
      !f.endsWith('.pub')
    );

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

    // Update .gitconfig
    const gitConfigPath = getGitConfigPath();
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

    if (startIndex === -1 || endIndex === -1) {
      outro(chalk.red('Managed block not found. Please run "gap init" first.'));
      return;
    }

    const includeIfRule = `[includeIf "hasconfig:remote.*.url=${urlPattern}"]
    path = ${config.profilesPath}/${name}.conf`;

    const beforeBlock = gitConfigContent.substring(0, startIndex + managedBlockStart.length);
    const afterBlock = gitConfigContent.substring(endIndex);
    
    const newContent = beforeBlock + '\n' + includeIfRule + '\n' + afterBlock;

    await fs.writeFile(gitConfigPath, newContent);

    outro(chalk.green('✅ Profile created successfully!'));
    console.log(`Profile: ${chalk.cyan(name)}`);
    console.log(`File: ${chalk.cyan(profileFile)}`);

  } catch (error: any) {
    console.error(chalk.red('Error creating profile:'), error.message);
    process.exit(1);
  }
}