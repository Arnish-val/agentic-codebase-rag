import React, { useState } from 'react';
import { useSSE } from './hooks/useSSE.js';
import {
  Send, Bot, User, Code, FileText, CheckCircle, AlertTriangle,
  Play, ThumbsUp, ThumbsDown, GitBranch, ChevronRight, Activity, Terminal
} from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [activeCitation, setActiveCitation] = useState(null);
  const [showTrace, setShowTrace] = useState(false);

  const {
    streamingText, status, citations, trace, executionResults,
    isStreaming, error, submitQuery, stopStream,
  } = useSSE();

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const queryText = input;
    setInput('');

    submitQuery(queryText, 'session-dev-1').then(() => {
      if (streamingText) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: streamingText, citations, trace, executionResults }
        ]);
      }
    });
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar — Repositories & Trace */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Bot className="w-6 h-6 text-indigo-400" />
          <div>
            <h1 className="font-semibold text-sm">Agentic Intelligence</h1>
            <p className="text-xs text-slate-400">Codebase & Docs Copilot</p>
          </div>
        </div>

        {/* Repository status */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>INDEXED REPOSITORY</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Ready
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center gap-2 text-xs font-mono">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <span>myorg/backend-api:main</span>
          </div>
        </div>

        {/* Live Agent Trace / Reasoning Viewer */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" /> Agent Decision Trace
            </span>
            {trace.length > 0 && (
              <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800">
                {trace.length} steps
              </span>
            )}
          </div>

          {trace.length === 0 ? (
            <div className="text-xs text-slate-600 italic py-8 text-center">
              Agent execution trace will appear here during query processing.
            </div>
          ) : (
            <div className="space-y-2">
              {trace.map((step, idx) => (
                <div key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-indigo-400 font-medium mb-1">
                    <span>{step.agent}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{step.durationMs}ms</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-mono leading-relaxed">{step.outputSummary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full bg-slate-950">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400">SESSION: session-dev-1</span>
          {status && (
            <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800/50">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
              {status}
            </div>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !streamingText && (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 max-w-md mx-auto">
              <Bot className="w-12 h-12 text-slate-700 mb-4" />
              <h2 className="text-lg font-medium text-slate-300 mb-1">Ask anything about your codebase</h2>
              <p className="text-xs text-slate-500">
                Ground answers with verified citations, architecture diagrams, and sandboxed code execution.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
              )}
              <div className={`max-w-3xl rounded-xl p-4 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-200'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Citations list */}
                {msg.citations?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                    <span className="text-xs text-slate-400 w-full mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" /> Grounded Sources:
                    </span>
                    {msg.citations.map((c, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => setActiveCitation(c)}
                        className="text-xs bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-slate-700 px-2.5 py-1 rounded font-mono transition-colors"
                      >
                        [{c.index}] {c.filePath}:{c.startLine}-{c.endLine}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          ))}

          {/* Active Streaming Response */}
          {isStreaming && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
              </div>
              <div className="max-w-3xl rounded-xl p-4 text-sm leading-relaxed bg-slate-900 border border-slate-800 text-slate-200">
                <div className="whitespace-pre-wrap">{streamingText}</div>
                {!streamingText && <span className="text-slate-500 italic text-xs">Agent thinking…</span>}

                {/* Live Citations */}
                {citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                    <span className="text-xs text-slate-400 w-full mb-1">Sources:</span>
                    {citations.map((c, cIdx) => (
                      <span key={cIdx} className="text-xs bg-slate-950 text-indigo-300 px-2 py-0.5 rounded border border-slate-800 font-mono">
                        [{c.index}] {c.filePath}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-slate-800">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about authentication middleware, database queries, or architecture..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 pr-12"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Citation Source Viewer Modal */}
      {activeCitation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-mono text-sm text-indigo-300">
                {activeCitation.filePath}:{activeCitation.startLine}-{activeCitation.endLine}
              </span>
              <button onClick={() => setActiveCitation(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-slate-300 bg-slate-950 whitespace-pre">
              {activeCitation.snippet}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
