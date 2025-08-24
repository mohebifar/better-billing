import fs, { existsSync } from 'node:fs';
import path from 'node:path';
// @ts-expect-error
import babelPresetReact from '@babel/preset-react';
// @ts-expect-error
import babelPresetTypeScript from '@babel/preset-typescript';
import { loadConfig } from 'c12';
import type { JITIOptions } from 'jiti';

// Type definition for Better Billing options
interface BetterBillingOptions {
  database: any;
  provider?: any;
  billable?: {
    model: string;
    fields?: Record<string, any>;
  };
  products?: Record<string, any>;
  webhooks?: any;
  plugins?: any[];
  advanced?: any;
}

let possiblePaths = [
  'billing.ts',
  'billing.tsx',
  'billing.js',
  'billing.jsx',
  'billing.server.js',
  'billing.server.ts',
];

possiblePaths = [
  ...possiblePaths,
  ...possiblePaths.map((it) => `lib/server/${it}`),
  ...possiblePaths.map((it) => `server/${it}`),
  ...possiblePaths.map((it) => `lib/${it}`),
  ...possiblePaths.map((it) => `utils/${it}`),
];
possiblePaths = [
  ...possiblePaths,
  ...possiblePaths.map((it) => `src/${it}`),
  ...possiblePaths.map((it) => `app/${it}`),
];

function resolveReferencePath(configDir: string, refPath: string): string {
  const resolvedPath = path.resolve(configDir, refPath);

  // If it ends with .json, treat as direct file reference
  if (refPath.endsWith('.json')) {
    return resolvedPath;
  }

  // If the exact path exists and is a file, use it
  if (fs.existsSync(resolvedPath)) {
    try {
      const stats = fs.statSync(resolvedPath);
      if (stats.isFile()) {
        return resolvedPath;
      }
    } catch {
      // Fall through to directory handling
    }
  }

  // Otherwise, assume directory reference
  return path.resolve(configDir, refPath, 'tsconfig.json');
}

function getTsconfigInfo(dir?: string, configPath?: string) {
  const tsconfigPath = configPath || path.join(dir || process.cwd(), 'tsconfig.json');

  if (!fs.existsSync(tsconfigPath)) {
    return { compilerOptions: {} };
  }

  try {
    const content = fs.readFileSync(tsconfigPath, 'utf-8');
    // Remove comments for JSON parsing
    const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    return JSON.parse(cleanContent);
  } catch {
    return { compilerOptions: {} };
  }
}

function getPathAliasesRecursive(
  tsconfigPath: string,
  visited = new Set<string>()
): Record<string, string> {
  if (visited.has(tsconfigPath)) {
    return {};
  }
  visited.add(tsconfigPath);

  if (!fs.existsSync(tsconfigPath)) {
    console.warn(`Referenced tsconfig not found: ${tsconfigPath}`);
    return {};
  }

  try {
    const tsConfig = getTsconfigInfo(undefined, tsconfigPath);
    const { paths = {}, baseUrl = '.' } = tsConfig.compilerOptions || {};
    const result: Record<string, string> = {};

    const configDir = path.dirname(tsconfigPath);
    const obj = Object.entries(paths) as [string, string[]][];
    for (const [alias, aliasPaths] of obj) {
      for (const aliasedPath of aliasPaths) {
        const resolvedBaseUrl = path.resolve(configDir, baseUrl);
        const finalAlias = alias.slice(-1) === '*' ? alias.slice(0, -1) : alias;
        const finalAliasedPath =
          aliasedPath.slice(-1) === '*' ? aliasedPath.slice(0, -1) : aliasedPath;

        result[finalAlias || ''] = path.join(resolvedBaseUrl, finalAliasedPath);
      }
    }

    if (tsConfig.references) {
      for (const ref of tsConfig.references) {
        const refPath = resolveReferencePath(configDir, ref.path);
        const refAliases = getPathAliasesRecursive(refPath, visited);
        for (const [alias, aliasPath] of Object.entries(refAliases)) {
          if (!(alias in result)) {
            result[alias] = aliasPath;
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.warn(`Error parsing tsconfig at ${tsconfigPath}: ${error}`);
    return {};
  }
}

function getPathAliases(cwd: string): Record<string, string> | null {
  const tsConfigPath = path.join(cwd, 'tsconfig.json');
  if (!fs.existsSync(tsConfigPath)) {
    return null;
  }
  try {
    const result = getPathAliasesRecursive(tsConfigPath);
    return result;
  } catch (error) {
    console.error(error);
    throw new Error('Error parsing tsconfig.json');
  }
}

const jitiOptions = (cwd: string): JITIOptions => {
  const alias = getPathAliases(cwd) || {};
  return {
    transformOptions: {
      babel: {
        presets: [
          [
            babelPresetTypeScript,
            {
              isTSX: true,
              allExtensions: true,
            },
          ],
          [babelPresetReact, { runtime: 'automatic' }],
        ],
      },
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias,
  };
};

const isBetterBillingInstance = (object: any): object is { options: BetterBillingOptions } => {
  return (
    typeof object === 'object' &&
    object !== null &&
    !Array.isArray(object) &&
    Object.keys(object).length > 0 &&
    'options' in object
  );
};

const isBetterBillingOptions = (object: any): object is BetterBillingOptions => {
  return (
    typeof object === 'object' && object !== null && !Array.isArray(object) && 'database' in object
  );
};

export async function getConfig({
  cwd,
  configPath,
  shouldThrowOnError = false,
}: {
  cwd: string;
  configPath?: string;
  shouldThrowOnError?: boolean;
}) {
  try {
    let configFile: BetterBillingOptions | null = null;
    if (configPath) {
      let resolvedPath: string = path.join(cwd, configPath);
      if (existsSync(configPath)) resolvedPath = configPath; // If the configPath is a file, use it as is, as it means the path wasn't relative.
      const { config } = await loadConfig<any>({
        configFile: resolvedPath,
        dotenv: true,
        jitiOptions: jitiOptions(cwd),
      });

      if (
        !('billing' in config) &&
        !isBetterBillingInstance(config) &&
        !isBetterBillingOptions(config)
      ) {
        if (shouldThrowOnError) {
          throw new Error(
            `Couldn't read your billing config in ${resolvedPath}. Make sure to default export your billing instance or to export as a variable named billing.`
          );
        }
        console.error(
          `[#better-billing]: Couldn't read your billing config in ${resolvedPath}. Make sure to default export your billing instance or to export as a variable named billing.`
        );
        process.exit(1);
      }
      if ('billing' in config) {
        configFile = config.billing?.options;
      } else if (isBetterBillingInstance(config)) {
        configFile = config.options;
      } else if (isBetterBillingOptions(config)) {
        configFile = config;
      }
    }

    if (!configFile) {
      for (const possiblePath of possiblePaths) {
        try {
          const { config } = await loadConfig<any>({
            configFile: possiblePath,
            jitiOptions: jitiOptions(cwd),
          });
          const hasConfig = Object.keys(config).length > 0;
          if (hasConfig) {
            if (config.billing?.options) {
              configFile = config.billing.options;
            } else if (config.default) {
              if (isBetterBillingInstance(config.default)) {
                configFile = config.default.options;
              } else if (isBetterBillingOptions(config.default)) {
                configFile = config.default;
              }
            }
            if (!configFile) {
              if (shouldThrowOnError) {
                throw new Error(
                  "Couldn't read your billing config. Make sure to default export your billing instance or to export as a variable named billing."
                );
              }
              console.error("[#better-billing]: Couldn't read your billing config.");
              console.log('');
              console.log(
                '[#better-billing]: Make sure to default export your billing instance or to export as a variable named billing.'
              );
              process.exit(1);
            }
            break;
          }
        } catch (e) {
          if (
            typeof e === 'object' &&
            e &&
            'message' in e &&
            typeof e.message === 'string' &&
            e.message.includes('This module cannot be imported from a Client Component module')
          ) {
            if (shouldThrowOnError) {
              throw new Error(
                `Please remove import 'server-only' from your billing config file temporarily. The CLI cannot resolve the configuration with it included. You can re-add it after running the CLI.`
              );
            }
            console.error(
              `Please remove import 'server-only' from your billing config file temporarily. The CLI cannot resolve the configuration with it included. You can re-add it after running the CLI.`
            );
            process.exit(1);
          }
          if (shouldThrowOnError) {
            throw e;
          }
        }
      }
    }
    return configFile;
  } catch (e) {
    if (
      typeof e === 'object' &&
      e &&
      'message' in e &&
      typeof e.message === 'string' &&
      e.message.includes('This module cannot be imported from a Client Component module')
    ) {
      if (shouldThrowOnError) {
        throw new Error(
          `Please remove import 'server-only' from your billing config file temporarily. The CLI cannot resolve the configuration with it included. You can re-add it after running the CLI.`
        );
      }
      console.error(
        `Please remove import 'server-only' from your billing config file temporarily. The CLI cannot resolve the configuration with it included. You can re-add it after running the CLI.`
      );
      process.exit(1);
    }
    if (shouldThrowOnError) {
      throw e;
    }

    console.error("Couldn't read your billing config.", e);
    process.exit(1);
  }
}

export { possiblePaths };
