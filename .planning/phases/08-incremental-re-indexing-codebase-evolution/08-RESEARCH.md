# Phase 8 Research: Incremental Re-Indexing & Codebase Evolution

## 1. Git Diff-Based Change Detection
- `incrementalDetector.js` runs `git diff <lastCommitSha>..HEAD` to classify modified, added, and deleted files.

## 2. Invalidation & Incremental Upsert
- Deleted files: Remove document and associated chunks from Mongo collections.
- Modified files: Re-chunk, re-embed, upsert new chunks, and remove stale chunks (`isStale: true`).
- Added files: Standard full chunking & embedding pipeline.
