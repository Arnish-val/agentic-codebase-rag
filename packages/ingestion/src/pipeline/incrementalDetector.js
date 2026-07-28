import { simpleGit } from 'simple-git';

export async function detectChanges(repoPath, fromCommitSha, toCommitSha = 'HEAD') {
  const git = simpleGit(repoPath);

  try {
    const diffSummary = await git.diffSummary([`${fromCommitSha}..${toCommitSha}`]);

    const added = [];
    const modified = [];
    const deleted = [];

    diffSummary.files.forEach(file => {
      if (file.before === 0 && file.after > 0) {
        added.push(file.file);
      } else if (file.before > 0 && file.after === 0) {
        deleted.push(file.file);
      } else {
        modified.push(file.file);
      }
    });

    return { added, modified, deleted, fromCommitSha, toCommitSha };
  } catch (err) {
    console.error('Git diff detection failed:', err.message);
    return { added: [], modified: [], deleted: [], error: err.message };
  }
}
