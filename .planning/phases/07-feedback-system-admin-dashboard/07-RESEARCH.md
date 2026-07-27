# Phase 7 Research: Feedback System & Admin Dashboard

## 1. Feedback Persistence & Snapshot Model
- `Feedback` schema in MongoDB captures `messageId`, `sessionId`, `feedbackType` (`thumbs_up`, `thumbs_down`, `flag_hallucination`, `flag_citation`), `comment`, and immutable query/response/sources snapshots for offline evaluation.

## 2. Admin Dashboard & Metrics Pipeline
- Admin route (`/api/v1/admin/metrics`) aggregates feedback stats using MongoDB `$group` pipelines (positive satisfaction percentage, breakdown by type, total query volume).
- Requires admin API key (`requireAdmin` middleware).
