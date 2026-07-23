import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';

export async function cloneRepository(cloneUrl, branch = 'main') {
  const repoName = cloneUrl.replace(/\.git$/, '').split('/').slice(-2).join('_');
  const targetPath = path.join(process.cwd(), 'tmp', 'repos', repoName);

  if (fs.existsSync(targetPath)) {
    const git = simpleGit(targetPath);
    await git.fetch();
    await git.checkout(branch);
    await git.pull();
    return targetPath;
  }

  fs.mkdirSync(targetPath, { recursive: true });
  const git = simpleGit();
  await git.clone(cloneUrl, targetPath, ['--branch', branch, '--depth', '1']);

  return targetPath;
}
