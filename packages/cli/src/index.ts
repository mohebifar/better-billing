#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import prompts from 'prompts';
import { generate } from './commands/generate';
import { generateTypes } from './commands/generate-types';
import { init } from './commands/init';
import { migrate } from './commands/migrate';
import { syncProducts } from './commands/sync-products';

const program = new Command();

program.name('better-billing').description('CLI tool for Better Billing').version('0.1.0');

// Init command
program
  .command('init')
  .description('Initialize better-billing in your project')
  .option('-d, --database <type>', 'Database adapter (drizzle, prisma)', 'drizzle')
  .option('-p, --provider <type>', 'Payment provider (stripe, polar)', 'stripe')
  .option('-f, --framework <type>', 'Framework (nextjs, remix, hono)')
  .action(async (options) => {
    console.log(chalk.blue('🚀 Initializing Better Billing...'));
    await init(options);
  });

// Generate command - use the command object directly
program.addCommand(generate);

// Migrate command
program
  .command('migrate')
  .description('Run database migrations')
  .option('--force', 'Force migration without confirmation')
  .action(async (options) => {
    if (!options.force) {
      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: 'This will modify your database. Continue?',
        initial: false,
      });

      if (!confirm) {
        console.log(chalk.yellow('Migration cancelled'));
        return;
      }
    }

    const spinner = ora('Running migrations...').start();
    try {
      await migrate(options);
      spinner.succeed(chalk.green('Migrations completed successfully!'));
    } catch (error) {
      spinner.fail(chalk.red('Migration failed'));
      console.error(error);
      process.exit(1);
    }
  });

// Sync products command
program
  .command('sync-products')
  .description('Sync products from payment provider')
  .action(async () => {
    const spinner = ora('Syncing products...').start();
    try {
      await syncProducts();
      spinner.succeed(chalk.green('Products synced successfully!'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to sync products'));
      console.error(error);
      process.exit(1);
    }
  });

// Generate types command
program
  .command('generate-types')
  .description('Generate TypeScript types from schema')
  .option('-o, --output <path>', 'Output file path', './types/billing.ts')
  .action(async (options) => {
    const spinner = ora('Generating types...').start();
    try {
      await generateTypes(options);
      spinner.succeed(chalk.green('Types generated successfully!'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to generate types'));
      console.error(error);
      process.exit(1);
    }
  });

program.parse();
