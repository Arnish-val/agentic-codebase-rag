import { glob } from 'glob';
import path from 'path';

export async function scanFiles(repoPath) {
  const ignorePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/*.min.js',
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.pdf',
    '**/*.lock',
    '**/package-lock.json',
  ];

  const files = await glob('**/*.{js,jsx,ts,tsx,py,md,json,html,css}', {
    cwd: repoPath,
    ignore: ignorePatterns,
    nodir: true,
    absolute: true,
  });

  return files;
}
