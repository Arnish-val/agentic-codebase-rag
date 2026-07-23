import 'dotenv/config';
import { runPipeline } from './pipeline/orchestrator.js';

const repoUrl = process.argv[2] || process.env.REPO_URL;
if (!repoUrl) {
  console.log('Usage: node src/index.js <git_clone_url>');
  process.exit(1);
}

runPipeline(repoUrl)
  .then(() => console.log('Ingestion pipeline completed successfully.'))
  .catch(err => {
    console.error('Ingestion failed:', err);
    process.exit(1);
  });
