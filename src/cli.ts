import { program } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { createCommand } from './commands/create.js';
import { whoamiCommand } from './commands/whoami.js';
import { listCommand } from './commands/list.js';
import { removeCommand } from './commands/remove.js';
import { cloneCommand } from './commands/clone.js';

program
  .name('gap')
  .description('Automatic Git profile switching based on remote URL patterns')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize git-auto-profile environment')
  .action(initCommand);

program
  .command('create')
  .alias('add')
  .description('Create a new profile and associate URL pattern')
  .action(createCommand);

program
  .command('whoami')
  .description('Show current Git configuration and its source')
  .action(whoamiCommand);

program
  .command('list')
  .alias('ls')
  .description('List all available profiles')
  .action(listCommand);

program
  .command('remove')
  .alias('rm')
  .description('Remove a profile')
  .action(removeCommand);

program
  .command('clone')
  .description('Interactive clone with SSH key selection')
  .argument('<repo-url>', 'Repository URL to clone')
  .action(cloneCommand);

program.parse();
