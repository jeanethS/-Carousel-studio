import { resolve, join } from 'path';

/**
 * Directory pictures are ingested from. Override with ASSETS_DIR (absolute or
 * relative to cwd); defaults to <cwd>/assets.
 */
export function assetsDir(): string {
  const override = process.env.ASSETS_DIR;
  return override ? resolve(override) : join(process.cwd(), 'assets');
}

/**
 * Directory rendered results are written to. Override with OUTPUT_DIR (absolute
 * or relative to cwd); defaults to <cwd>/output.
 */
export function outputDir(): string {
  const override = process.env.OUTPUT_DIR;
  return override ? resolve(override) : join(process.cwd(), 'output');
}
