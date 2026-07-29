import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET ?? '/var/run/docker.sock' });

const IMAGES = {
  python: process.env.SANDBOX_PYTHON_IMAGE ?? 'agentic-sandbox-python:latest',
  javascript: process.env.SANDBOX_NODE_IMAGE ?? 'agentic-sandbox-node:latest',
  js: process.env.SANDBOX_NODE_IMAGE ?? 'agentic-sandbox-node:latest',
  shell: process.env.SANDBOX_SHELL_IMAGE ?? 'agentic-sandbox-shell:latest',
  bash: process.env.SANDBOX_SHELL_IMAGE ?? 'agentic-sandbox-shell:latest',
  sh: process.env.SANDBOX_SHELL_IMAGE ?? 'agentic-sandbox-shell:latest',
};

const TIMEOUT_MS = parseInt(process.env.SANDBOX_TIMEOUT_MS ?? '30000');
const MEMORY_LIMIT = process.env.SANDBOX_MEMORY_LIMIT ?? '256m';
const CPU_QUOTA = parseInt(process.env.SANDBOX_CPU_QUOTA ?? '50000');

/**
 * CodeExecutionAgent node — runs code blocks in isolated Docker containers.
 */
export async function codeExecutionNode(state) {
  const { codeBlocks, sessionId, streamCallback } = state;
  const log = logger.child({ node: 'codeExecution', sessionId });

  if (!codeBlocks || codeBlocks.length === 0) {
    return { executionResults: [] };
  }

  streamCallback?.('status', { step: 'executing', message: 'Running code in sandbox…' });

  const results = [];
  for (const block of codeBlocks.slice(0, 3)) { // Max 3 blocks per response
    const result = await runInSandbox(block.language, block.code, log);
    results.push({ ...block, ...result });
    streamCallback?.('execution', { language: block.language, ...result });
  }

  return {
    executionResults: results,
    currentNode: 'codeExecution',
    trace: [{
      step: 'execute',
      agent: 'CodeExecutionAgent',
      durationMs: results.reduce((s, r) => s + (r.executionTimeMs ?? 0), 0),
      inputSummary: `${codeBlocks.length} code blocks`,
      outputSummary: results.map(r => `exit=${r.exitCode}`).join(', '),
    }],
  };
}

async function runInSandbox(language, code, log) {
  const lang = language.toLowerCase();
  const image = IMAGES[lang];

  if (!image) {
    return { stdout: '', stderr: `Unsupported language: ${language}`, exitCode: 1, executionTimeMs: 0 };
  }

  // Security check — reject obviously dangerous patterns
  const dangerPatterns = [/rm\s+-rf/i, /fork\s*bomb/i, /:(){ :|:& };:/i, /\/dev\/sd/i];
  if (dangerPatterns.some(p => p.test(code))) {
    return { stdout: '', stderr: 'Code rejected by security policy', exitCode: 1, executionTimeMs: 0 };
  }

  const start = Date.now();
  let container = null;

  try {
    // Determine command based on language
    const cmd = lang === 'python'
      ? ['python3', '-c', code]
      : (lang === 'javascript' || lang === 'js')
        ? ['node', '-e', code]
        : ['sh', '-c', code];

    container = await docker.createContainer({
      Image: image,
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Memory: parseMemory(MEMORY_LIMIT),
        MemorySwap: parseMemory(MEMORY_LIMIT),
        CpuQuota: CPU_QUOTA,
        CpuPeriod: 100000,
        PidsLimit: 50,
        NetworkMode: 'none',           // No network access
        ReadonlyRootfs: true,
        CapDrop: ['ALL'],
        SecurityOpt: ['no-new-privileges'],
        Tmpfs: { '/tmp': 'rw,size=50m,noexec' },
      },
    });

    await container.start();

    // Wait with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Execution timeout')), TIMEOUT_MS)
    );

    const waitPromise = container.wait();
    const waitResult = await Promise.race([waitPromise, timeoutPromise]);

    // Capture logs
    const logs = await container.logs({ stdout: true, stderr: true, follow: false });
    const { stdout, stderr } = parseLogs(logs);

    return {
      stdout: stdout.slice(0, 10000),
      stderr: stderr.slice(0, 5000),
      exitCode: waitResult?.StatusCode ?? 0,
      executionTimeMs: Date.now() - start,
    };
  } catch (err) {
    log.warn({ err, language }, 'Sandbox execution error');
    return {
      stdout: '',
      stderr: err.message.includes('timeout') ? 'Execution timed out' : `Execution error: ${err.message}`,
      exitCode: 1,
      executionTimeMs: Date.now() - start,
    };
  } finally {
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (e) {
        log.warn({ err: e }, 'Failed to remove sandbox container');
      }
    }
  }
}

function parseMemory(mem) {
  if (typeof mem === 'number') return mem;
  const match = mem.match(/^(\d+)([kmg])$/i);
  if (!match) return 256 * 1024 * 1024;
  const [, num, unit] = match;
  const multipliers = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
  return parseInt(num) * (multipliers[unit.toLowerCase()] ?? 1);
}

function parseLogs(logsBuffer) {
  // Docker log stream has 8-byte header per frame: [stream_type, 0, 0, 0, size_4_bytes]
  let stdout = '';
  let stderr = '';
  let offset = 0;
  const buf = Buffer.isBuffer(logsBuffer) ? logsBuffer : Buffer.from(logsBuffer);
  while (offset + 8 <= buf.length) {
    const streamType = buf[offset];
    const frameSize = buf.readUInt32BE(offset + 4);
    const frame = buf.slice(offset + 8, offset + 8 + frameSize).toString('utf8');
    if (streamType === 1) stdout += frame;
    else if (streamType === 2) stderr += frame;
    offset += 8 + frameSize;
  }
  return { stdout: stdout || buf.toString('utf8'), stderr };
}
