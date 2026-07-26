# Phase 6 Research: Frontend — Chat Interface, Citations & Trace View

## 1. UI Components Architecture
- `App.jsx`: Main 3-pane layout (Repository Sidebar + Agent Trace Panel, Center Chat Stream, Right Citation Inspector).
- `useSSE.js`: SSE consumer hook parsing chunk, status, citation, trace, and execution events.

## 2. Citation Modal & Trace Visualization
- Source viewer modal displays full chunk snippet with parent context and line number anchors.
- Agent Decision Trace displays step duration, agent node name (`RouterAgent`, `RetrievalAgent`, `CriticAgent`), and output summaries.
