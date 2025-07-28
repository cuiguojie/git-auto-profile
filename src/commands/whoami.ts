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
        
        const profileName = path.basename(repoRoot);
        const profileFile = path.join(profilesPath, `${profileName}.gitconfig`);
        
        try {
          await fs.access(profileFile);
          console.log(chalk.green(`✅ Profile configured: ${profileName}`));
        } catch {
          console.log(chalk.yellow(`⚠️  No profile found for: ${profileName}`));
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