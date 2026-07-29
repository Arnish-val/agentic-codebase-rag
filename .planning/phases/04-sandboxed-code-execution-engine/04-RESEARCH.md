# Phase 4 Research: Sandboxed Code Execution Engine

## 1. Docker Isolation & Security Hardening
- **Network Egress Isolation**: `NetworkMode: 'none'` guarantees no external HTTP/socket connections.
- **Resource Constraints**:
  - Memory: 256MB hard limit (`MemorySwap` set equal to `Memory` to disable swap).
  - CPU: `CpuQuota: 50000`, `CpuPeriod: 100000` (50% single-core quota).
  - PIDs: `PidsLimit: 50` to prevent fork bombs.
- **FileSystem Security**:
  - `ReadonlyRootfs: true`
  - Writable tmpfs mounted at `/tmp` (`rw,size=50m,noexec`).
  - Drop all Linux capabilities: `CapDrop: ['ALL']`.
  - Disable privilege escalation: `SecurityOpt: ['no-new-privileges']`.

## 2. Multi-Language Containers
- `agentic-sandbox-python:latest`: Python 3.11-slim with `numpy`, `pandas`, `requests` pre-baked.
- `agentic-sandbox-node:latest`: Node 20-alpine.
- `agentic-sandbox-shell:latest`: Alpine 3.20 with `bash`, `curl`, `jq`.

## 3. Log Stream Parsing & Timeout Enforcement
- Parse 8-byte Docker stream headers to separate stdout (stream 1) from stderr (stream 2).
- Hard timeout (30 seconds) race against container wait promise.
