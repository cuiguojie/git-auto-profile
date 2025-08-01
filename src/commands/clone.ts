import { intro, outro, select, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

interface SshKey {
  path: string;
  name: string;
  isDefault: boolean;
}

export async function cloneCommand(repoUrl: string): Promise<void> {
  intro(chalk.cyan('Interactive Git Clone'));

  try {
    // 扫描 SSH 密钥
    const sshKeys = await scanSshKeys();
    
    if (sshKeys.length === 0) {
      outro(chalk.red('No SSH keys found in ~/.ssh directory'));
      return;
    }

    // 交互式选择密钥
    const selectedKey = await select({
      message: 'Select SSH key for clone:',
      options: sshKeys.map(key => ({
        value: key.path,
        label: `${key.name} ${key.isDefault ? chalk.gray('(default)') : ''}`
      }))
    });

    if (typeof selectedKey !== 'string') {
      outro(chalk.yellow('Cancelled'));
      return;
    }

    // 执行克隆
    const s = spinner();
    s.start('Cloning repository...');

    await gitCloneWithSshKey(repoUrl, selectedKey);
    
    s.stop('Repository cloned successfully');
    outro(chalk.green('✅ Clone completed!'));

  } catch (error: any) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function scanSshKeys(): Promise<SshKey[]> {
  const sshDir = path.join(process.env.HOME || '', '.ssh');
  const keys: SshKey[] = [];
  
  try {
    const files = await fs.readdir(sshDir);
    
    for (const file of files) {
      if (file.endsWith('.pub')) continue;
      
      const filePath = path.join(sshDir, file);
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) continue;
        
        const content = await fs.readFile(filePath, 'utf8');
        
        // 检测 SSH 私钥格式
        const isPrivateKey = (
          content.includes('-----BEGIN ') && 
          content.includes(' PRIVATE KEY-----') ||
          content.startsWith('-----BEGIN OPENSSH PRIVATE KEY-----') ||
          content.startsWith('-----BEGIN RSA PRIVATE KEY-----') ||
          content.startsWith('-----BEGIN DSA PRIVATE KEY-----') ||
          content.startsWith('-----BEGIN EC PRIVATE KEY-----') ||
          content.startsWith('-----BEGIN ED25519 PRIVATE KEY-----') ||
          content.startsWith('SSH PRIVATE KEY FILE FORMAT 1.1')
        );
        
        if (isPrivateKey) {
          const isDefault = file === 'id_rsa' || file === 'id_ed25519';
          keys.push({
            path: filePath,
            name: path.join('~/.ssh', file),
            isDefault
          });
        }
      } catch {
        continue;
      }
    }
  } catch {
    // SSH 目录不存在
  }
  
  return keys;
}

function gitCloneWithSshKey(repoUrl: string, sshKeyPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const sshCommand = `ssh -i ${sshKeyPath}`;
    
    const git = spawn('git', ['-c', `core.sshCommand=${sshCommand}`, 'clone', repoUrl], {
      stdio: 'inherit'
    });

    git.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Git clone failed with exit code ${code}`));
      }
    });

    git.on('error', reject);
  });
}