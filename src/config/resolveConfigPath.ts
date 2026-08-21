import * as path from 'path';

export type CarouselPlatform = 'instagram' | 'linkedin';

const DEFAULT_STYLE = 'default';

/**
 * Resolves the design-token YAML path for a given platform + style.
 * New styles are just a new YAML file under config/styles/<platform>/ —
 * no code change needed.
 */
export function resolveConfigPath(platform: CarouselPlatform, style: string = DEFAULT_STYLE): string {
  return path.join(process.cwd(), 'config', 'styles', platform, `${style}.yaml`);
}
