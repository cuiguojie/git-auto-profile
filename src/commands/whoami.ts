import { intro, outro } from '@clack/prompts';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { getConfigPath, expandPath } from '../utils.js';

export async function whoamiCommand(): Promise<void> {
  intro(chalk.cyan('Current Git configuration'));

  try {
    const isInRepo = execSync('git rev-parse --is-inside-work-tree 2>/dev/null || echo "false"', { encoding: 'utf8' }).trim();
    
    if (isInRepo === 'false') {
      console.log(chalk.yellow('Not in a Git repository. Showing global config:'));
    } else {
      const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
      console.log(chalk.gray(`Repository: ${repoRoot}`));
      
      // 检查是否有对应profile
      try {
        const configPath = getConfigPath();
        const configContent = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configContent);
        const profilesPath = expandPath(config.profilesPath);
        
        // 获取当前仓库的远程URL
        try {
          const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
          
          // 读取git配置，查找匹配的includeIf规则
          const gitConfigPath = path.join(process.env.HOME || '', '.gitconfig');
          const gitConfigContent = await fs.readFile(gitConfigPath, 'utf8');
          
          // 查找所有有效的includeIf规则
          const includeIfRegex = /\[includeIf "hasconfig:remote\.\*\.url:([^"]+)"\][\s\S]*?path = ([^\n]+)/g;
          const matches = Array.from(gitConfigContent.matchAll(includeIfRegex));
          
          let matchedProfile = null;
          for (const match of matches) {
            const [, pattern, profilePath] = match;
            // 简单的通配符匹配
            const regexPattern = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
            if (new RegExp(regexPattern).test(remoteUrl)) {
              const profileName = path.basename(profilePath, '.conf');
              matchedProfile = profileName;
              break;
            }
          }
          
          if (matchedProfile) {
            console.log(chalk.green(`✅ Active profile: ${matchedProfile}`));
          } else {
            console.log(chalk.yellow(`⚠️  No matching profile found for remote: ${remoteUrl}`));
          }
        } catch (error: any) {
          console.log(chalk.yellow(`⚠️  Could not determine active profile`));
        }
      } catch {
        console.log(chalk.red('❌ git-auto-profile not initialized'));
      }
      console.log();
    }

    const commands = [
      'git config --show-origin --get user.name',
      'git config --show-origin --get user.email',
      'git config --show-origin --get core.sshCommand'
    ];

    const results = commands.map(cmd => {
      try {
        const output = execSync(cmd, { encoding: 'utf8' }).trim();
        const [source, value] = output.split('\t');
        return { key: cmd.split('.').pop()!, source: source.replace('file:', ''), value };
      } catch (error: any) {
        const key = cmd.split('.').pop()!;
        return { key, source: 'not set', value: 'not set' };
      }
    });

    console.log(chalk.bold('Current Git settings:'));
    results.forEach(({ key, source, value }) => {
      console.log(`${chalk.bold(key)}: ${chalk.green(value)}`);
      console.log(`  ${chalk.gray('from:')} ${chalk.dim(source)}`);
      console.log();
    });

    outro('');

  } catch (error: any) {
    console.error(chalk.red('Error checking configuration:'), error.message);
    process.exit(1);
  }
}