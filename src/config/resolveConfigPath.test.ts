import * as path from 'path';
import { resolveConfigPath } from './resolveConfigPath';

describe('resolveConfigPath', () => {
  it('resolves the default instagram style', () => {
    expect(resolveConfigPath('instagram', 'default')).toBe(
      path.join(process.cwd(), 'config', 'styles', 'instagram', 'default.yaml'),
    );
  });

  it('resolves the default linkedin style', () => {
    expect(resolveConfigPath('linkedin', 'default')).toBe(
      path.join(process.cwd(), 'config', 'styles', 'linkedin', 'default.yaml'),
    );
  });

  it('resolves a named style for a platform', () => {
    expect(resolveConfigPath('instagram', 'bold-editorial')).toBe(
      path.join(process.cwd(), 'config', 'styles', 'instagram', 'bold-editorial.yaml'),
    );
  });

  it('defaults to the "default" style when none is given', () => {
    expect(resolveConfigPath('instagram')).toBe(
      path.join(process.cwd(), 'config', 'styles', 'instagram', 'default.yaml'),
    );
  });
});
