import path from 'node:path';

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function outputDirForApp(outBaseDir: string, appName: string) {
  return path.resolve(process.cwd(), outBaseDir, slugify(appName));
}
