import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { generateSchema } from '../generators';
import { getConfig } from '../utils/get-config';

interface GenerateOptions {
  cwd: string;
  config?: string;
  output?: string;
  format?: 'sql' | 'prisma' | 'drizzle';
  y?: boolean;
  yes?: boolean;
}

export async function generateAction(opts: GenerateOptions) {
  const options = {
    cwd: opts.cwd || process.cwd(),
    config: opts.config,
    output: opts.output,
    format: opts.format || 'drizzle',
    y: opts.y || false,
    yes: opts.yes || false,
  } as const;

  const cwd = path.resolve(options.cwd);
  if (!existsSync(cwd)) {
    console.error(`The directory "${cwd}" does not exist.`);
    process.exit(1);
  }

  const config = await getConfig({
    cwd,
    configPath: options.config,
  });

  if (!config) {
    console.error(
      'No configuration file found. Add a `billing.ts` file to your project or pass the path to the configuration file using the `--config` flag.'
    );
    return;
  }

  // Get adapter from config or create mock adapter
  const adapter = getAdapterFromConfig(config, options.format);

  console.log('Preparing schema...');

  const schema = await generateSchema({
    adapter,
    file: options.output,
    options: config,
    format: options.format,
  });

  if (!schema.code) {
    console.log('Your schema is already up to date.');
    process.exit(0);
  }

  // Handle overwrite confirmation
  if (schema.overwrite) {
    let confirm = options.y || options.yes;
    if (!confirm) {
      // For now, just proceed without prompting
      // In a real implementation, you'd use prompts here
      confirm = true;
    }

    if (confirm) {
      const outputPath = path.join(cwd, schema.fileName);
      const outputDir = path.dirname(outputPath);

      if (!existsSync(outputDir)) {
        await fs.mkdir(outputDir, { recursive: true });
      }

      await fs.writeFile(outputPath, schema.code);
      console.log(`🚀 Schema was generated successfully at: ${schema.fileName}`);
      process.exit(0);
    } else {
      console.error('Schema generation aborted.');
      process.exit(1);
    }
  }

  // Handle new file creation
  let confirm = options.yes;
  if (!confirm) {
    // For now, just proceed without prompting
    // In a real implementation, you'd use prompts here
    confirm = true;
  }

  if (!confirm) {
    console.error('Schema generation aborted.');
    process.exit(1);
  }

  const outputPath = options.output
    ? path.resolve(cwd, options.output)
    : path.join(cwd, schema.fileName);

  const outputDir = path.dirname(outputPath);
  if (!existsSync(outputDir)) {
    await fs.mkdir(outputDir, { recursive: true });
  }

  await fs.writeFile(outputPath, schema.code);
  console.log(`🚀 Schema was generated successfully at: ${path.relative(cwd, outputPath)}`);
  process.exit(0);
}

/**
 * Get adapter from billing config or create mock adapter based on format
 */
function getAdapterFromConfig(config: any, format?: string) {
  if (config?.database) {
    return config.database;
  }

  // Create mock adapter based on format preference
  const adapterType = format || 'drizzle';
  return {
    type: adapterType,
    id: adapterType,
    provider: 'postgres', // Default provider
  };
}

export const generate = new Command('generate')
  .option(
    '-c, --cwd <cwd>',
    'the working directory. defaults to the current directory.',
    process.cwd()
  )
  .option(
    '--config <config>',
    'the path to the configuration file. defaults to the first configuration file found.'
  )
  .option('--output <output>', 'the file to output the generated schema')
  .option(
    '--format <format>',
    'the format of the schema to generate (sql, prisma, drizzle)',
    'drizzle'
  )
  .option('-y, --yes', 'automatically answer yes to all prompts', false)
  .action(generateAction);
