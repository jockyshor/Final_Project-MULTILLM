# MULTILLM Orchestrator: Autonomous Multi-Provider Agent & RAG Workspace

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v24_LTS-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.0-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Neon](https://img.shields.io/badge/Neon-pgvector-00E599?style=flat&logo=postgresql&logoColor=black)](https://neon.tech/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standard-purple?style=flat)](https://modelcontextprotocol.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

An enterprise-grade, autonomous multi-model orchestration platform engineered with **React 18**, **Express 5**, and **TypeScript**. Features a 2-tier supervisory routing pattern across **Groq LPUs** and **Google Gemini**, an autonomous ReAct loop with Model Context Protocol (MCP) tooling, in-database semantic vector RAG with **Neon pgvector**, and hardened system prompt safety policies.

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [System Architecture](#system-architecture)
- [Key Engineering Pillars](#key-engineering-pillars)
  - [1. 2-Tier Supervisory Pattern & Dynamic Model Tiers](#tier-supervisory-pattern)
  - [2. High-Ceiling ReAct Loop & Deduplication Guard](#react-loop-deduplication)
  - [3. Model Context Protocol (MCP) Bridge](#mcp-bridge)
  - [4. Vector RAG Pipeline (Neon pgvector)](#vector-rag-pipeline)
  - [5. Temporal Freshness & Web Grounding Engine](#temporal-freshness-engine)
  - [6. System Prompt Safety & Anti-Leak Policy](#system-prompt-safety)
  - [7. Token Economics & Groq TPM Shield](#token-economics-tpm-shield)
- [Repository Structure](#repository-structure)
- [REST API Reference & SSE Streaming](#api-reference-and-streaming)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Installation & Execution](#installation-and-execution)
- [Production Build & Verification](#production-build-and-verification)
- [License](#license)

---

<a id="architectural-overview"></a>
## Architectural Overview

MULTILLM Orchestrator is designed to solve common limitations in production AI systems: high latency, token bloat, rate limiting, and knowledge hallucination. Instead of routing all incoming traffic to a single monolithic LLM, the platform implements a layered architecture:

1. **Presentation Layer**: A responsive React 18 single-page application built on Vite and Tailwind CSS. Features dynamic sidebar resizing, local thread dismissal, Markdown rendering with GitHub Flavored Markdown (GFM), and real-time streaming consumption via the Vercel AI Data Stream Protocol.
2. **Controller & Routing Layer**: An Express 5 server organized around standard Route-Controller-Service patterns. Intercepts adversarial prompt extraction attempts before model invocation and manages Server-Sent Events (SSE) connections.
3. **Orchestration Layer**: A multi-model supervisory engine powered by Groq LPUs (`openai/gpt-oss-20b` and `openai/gpt-oss-120b`) and Google Gemini (`gemini-flash-lite-latest`).
4. **Data & Retrieval Layer**: Serverless PostgreSQL hosted on Neon with the `pgvector` extension enabled, storing threads, messages, document metadata, and 768-dimensional dense vector embeddings.
5. **Tool & Protocol Layer**: A zero-touch tool registry integrating local utilities, live search engines (Tavily AI), and isolated background tools via the Model Context Protocol (MCP) running over JSON-RPC standard I/O (`stdio`).

---

<a id="system-architecture"></a>
## System Architecture

The application handles client requests through a deterministic execution sequence:

1. **Client Dispatch**: The React frontend sends a `POST /api/chat` request containing the current conversation identifier and recent message history.
2. **Boundary Validation & Thread Auto-Healing**: The request passes through Express middlewares. The `ConversationService` inspects the thread state. If the client lost its thread context during a reconnect, the service queries PostgreSQL for matching content hashes and automatically re-attaches the turn.
3. **Safety Interception**: The query is evaluated against deterministic injection rules. If the user is attempting to dump internal directives, the request is halted immediately.
4. **Supervisory Triage**: If valid, the fast Groq 20B model evaluates the message and recent context, returning a structured JSON decision: model tier (`FAST`, `REASONING`, or `RESEARCH`), tool policy (`needsTools: true/false`), and a temporally neutral search query.
5. **ReAct Reasoning Loop**: When tools are required, the Groq 120B reasoning model enters an autonomous multi-step cycle. It dispatches tool calls, inspects findings, verifies dates, and deduplicates signatures in memory.
6. **Synthesis & Streaming**: The final context is formatted with synthesis rules and streamed back to the client using Server-Sent Events. The complete assistant turn, token counts, and latency metrics are persisted to Neon PostgreSQL.

---

<a id="key-engineering-pillars"></a>
## Key Engineering Pillars

<a id="tier-supervisory-pattern"></a>
### 1. 2-Tier Supervisory Pattern & Dynamic Model Tiers

Routing all tasks to high-capacity models creates unnecessary latency and token costs. A lightweight supervisor (`openai/gpt-oss-20b`) acts as an intent classifier and query normalizer with sub-50ms processing times:

- **FAST Tier (`openai/gpt-oss-20b`)**: Dedicated to conceptual tutorials, mathematics, code syntax generation from first principles, and casual non-tool chat. Operates with sub-second response times.
- **REASONING Tier (`openai/gpt-oss-120b`)**: Assigned to real-world factual verification, multi-step tool execution, document RAG synthesis, and codebase inspections.
- **RESEARCH Tier (`gemini-flash-lite-latest`)**: Utilized for large-context documents, long comparative essays, and multi-perspective topic synthesis.

<a id="react-loop-deduplication"></a>
### 2. High-Ceiling ReAct Loop & Deduplication Guard

The reasoning engine executes an autonomous **Reasoning + Acting (ReAct)** loop capped at 5 steps:

- **Autonomous Multi-Hop**: If an initial web or document search yields partial evidence, the agent formulates a targeted follow-up query autonomously.
- **Signature Deduplication Guard**: An in-memory `Set<string>` tracks every execution signature in the format `toolName:JSON.stringify(args)`. If the model attempts to invoke the exact same query with identical parameters, the loop terminates immediately, preventing thrashing and token exhaustion.
- **Defensive Parameter Normalization**: Automatically normalizes tool aliases (such as mapping `lookup_wikipedia` or `web_search` to `browse_web`) and extracts target cities from natural language.

<a id="mcp-bridge"></a>
### 3. Model Context Protocol (MCP) Bridge

The system implements Anthropic's open **Model Context Protocol (MCP)** specification via a decoupled client-server architecture:

- **Isolated Background Process**: `external-server.ts` executes in a separate background process, communicating with the Express backend over standard input/output (`stdio`) via JSON-RPC.
- **Broken Pipe Defense**: Handles `EPIPE` and standard input close signals gracefully without crashing the parent application.
- **Dynamic Tool Discovery**: On startup, the MCP client queries the external server and dynamically binds its capabilities into the Vercel AI SDK registry:
  - `get_system_metrics`: Live server metrics (RAM utilization, CPU architecture, platform, uptime).
  - `fetch_webpage`: Safe HTTP/HTTPS text scraper that strips boilerplate, script, and style tags.

<a id="vector-rag-pipeline"></a>
### 4. Vector RAG Pipeline (Neon pgvector)

- **In-Database Vector Storage**: Relational tables (`documents`, `document_chunks`) in Neon Serverless PostgreSQL with native `pgvector` indexing.
- **Binary Parsing**: In-memory parsing for binary `.pdf` files (`pdf-parse`) and Word `.docx` archives (`mammoth`), alongside `.md` and `.txt` files.
- **Chunking Geometry**: Text is split into 500-character segments with a 60-character sliding-window semantic overlap.
- **Dual Embedding Strategy**:
  - Cloud-based vector generation via Google text embeddings (`embedding-001`, 768 dimensions).
  - Deterministic 768-dimensional L2-normalized vector projector (`generateSemanticVector`) running locally with 0ms latency for offline resilience.
- **Cosine Distance Retrieval**: Queries are resolved in PostgreSQL via the `<=>` distance operator: `Similarity = 1 - (embedding <=> query_vector)`.

<a id="temporal-freshness-engine"></a>
### 5. Temporal Freshness & Web Grounding Engine

- **Query Contamination Prevention**: The supervisor prompt forbids hardcoding assumed past years (such as automatically searching for 2022 when asked about a championship) when users ask about "latest", "current", or "most recent" events.
- **Search Engine Grounding**: Integrates Tavily AI with advanced depth, direct answer prioritization, and snippet length pruning (700 characters max) to eliminate context pollution.
- **Date Verification Directive**: Prompts explicitly mandate distinguishing between the **publication date of an article** and the **actual date an event occurred**.

<a id="system-prompt-safety"></a>
### 6. System Prompt Safety & Anti-Leak Policy

To prevent prompt extraction and social engineering attacks:

1. **Pre-Execution Regex Guard**: The controller inspects incoming messages for known prompt extraction patterns (`what is your system prompt`, `repeat instructions above`, `ignore previous directives`). Extraction attempts are halted in **<1ms**, returning a canonical refusal without calling external LLM APIs.
2. **Constitutional System Hardening**: Prompts include strict confidentiality rules forbidding the disclosure of internal role assignments, system prompts, or configuration parameters under roleplay or administrative override scenarios.

<a id="token-economics-tpm-shield"></a>
### 7. Token Economics & Groq TPM Shield

Designed to operate within Groq's free-tier rate limit of **8,000 Tokens Per Minute (TPM)**:

- **Context Distillation**: Truncates historical turn content beyond 1,200 characters and limits history to the last 6 messages.
- **Minified JSON Injection**: Strips whitespace from tool output payloads before passing them to the model context.
- **Strict Payload Budget**: Maintains average turn size at **~1,050 to 1,200 tokens**, permitting up to 6 consecutive requests per minute without triggering HTTP 429 rate limit errors.

---

<a id="repository-structure"></a>
## Repository Structure

```text
FinalProjectMULTILLM/
├── client/                          # React 18 + Vite Frontend
│   ├── src/
│   │   ├── components/              # Single-Responsibility UI Components
│   │   │   ├── ChatInput.tsx        # Input form, dropzones & attachment triggers
│   │   │   ├── ChatMessage.tsx      # Markdown bubble with syntax highlight & telemetry
│   │   │   ├── DragDropOverlay.tsx  # Drag & drop upload state
│   │   │   ├── EmptyState.tsx       # Initial workspace view
│   │   │   ├── Header.tsx           # Navigation bar & drawer toggle
│   │   │   └── Sidebar.tsx          # Thread navigation & model tier widget
│   │   ├── types/
│   │   │   └── chat.ts              # Domain interfaces (Conversation, Metadata)
│   │   ├── App.tsx                  # Root presentation orchestrator
│   │   ├── main.tsx                 # React DOM mount point
│   │   └── index.css                # Tailwind directives & typography overrides
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── server/                          # Express 5 + Node 24 ESM Backend
│   ├── src/
│   │   ├── config/                  # Configuration & Environment
│   │   │   ├── env.ts               # Type-safe environment variables & models
│   │   │   └── db.ts                # Neon database & Drizzle connection
│   │   ├── models/                  # Database Schemas & Data Layer
│   │   │   └── schema.ts            # Drizzle tables (conversations, messages, chunks)
│   │   ├── controllers/             # Request & Response Handlers
│   │   │   ├── chat.controller.ts
│   │   │   ├── conversation.controller.ts
│   │   │   ├── document.controller.ts
│   │   │   └── health.controller.ts
│   │   ├── services/                # Business Logic Layer
│   │   │   ├── conversation.service.ts
│   │   │   ├── document.service.ts
│   │   │   └── orchestrator.service.ts
│   │   ├── routes/                  # Express Route Definitions
│   │   │   ├── chat.routes.ts
│   │   │   ├── conversation.routes.ts
│   │   │   ├── document.routes.ts
│   │   │   ├── health.routes.ts
│   │   │   └── index.ts             # Master API router (/api)
│   │   ├── middlewares/             # Custom Middlewares
│   │   │   ├── errorHandler.middleware.ts
│   │   │   └── logger.middleware.ts
│   │   ├── utils/                   # Shared Utilities
│   │   │   ├── safety.util.ts       # Anti-leak regex filters & safety policy
│   │   │   └── temporal.util.ts     # Temporal query normalization
│   │   ├── mcp/                     # Model Context Protocol
│   │   │   ├── client.ts            # Environment-aware stdio transport client
│   │   │   ├── external-server.ts   # Standalone stdio MCP server process
│   │   │   ├── tools.ts             # Extensible tools registry & sandbox guard
│   │   │   └── tools.test.ts        # Vitest security test suite
│   │   ├── rag/                     # Retrieval Augmented Generation
│   │   │   └── index.ts             # Vector embeddings, chunking & pgvector search
│   │   ├── app.ts                   # Express application setup
│   │   └── index.ts                 # Server bootstrap & entrypoint
│   ├── tsconfig.json                # Strict TypeScript configuration
│   └── package.json
│
└── README.md
```

---

<a id="api-reference-and-streaming"></a>
## REST API Reference & SSE Streaming

### Base URL: `http://localhost:5001/api`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Diagnostic probe verifying database connectivity and active model registry. |
| `GET` | `/conversations` | Lists the 25 most recent conversation threads. |
| `GET` | `/conversations/:id` | Returns complete message history for the specified thread. |
| `POST` | `/documents/upload` | Ingests base64 `.pdf`, `.docx`, or `.txt` content into pgvector chunks. |
| `POST` | `/chat` | Initiates supervisory routing, ReAct loop, and SSE streaming. |

### Streaming Format (`POST /api/chat`)

Responses are delivered via the Vercel AI Data Stream Protocol over Server-Sent Events (SSE):

- **Frame `0`**: Text token chunk generated by the model.
- **Frame `2`**: Telemetry metadata object (conversation ID, model used, latency in ms, tools executed, and token consumption).

---

<a id="getting-started"></a>
## Getting Started

<a id="prerequisites"></a>
### Prerequisites

- **Node.js**: `v20.x` or `v24.x` (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **Database**: [Neon Serverless PostgreSQL](https://neon.tech/) instance with `pgvector` enabled.
- **API Keys**:
  - [Groq Cloud Console](https://console.groq.com/) (Required)
  - [Tavily AI](https://tavily.com/) (Required for live web search)
  - [Google AI Studio](https://aistudio.google.com/) (Optional: for Gemini Research tier & embeddings)

---

<a id="environment-configuration"></a>
### Environment Configuration

Create a `.env` file inside the `server/` directory:

```env
# Server Port
PORT=5001

# LLM Providers
GROQ_API_KEY=gsk_your_groq_api_key_here
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy_your_google_key_here

# Live Search Tool
TAVILY_API_KEY=tvly-your_tavily_key_here

# Neon Serverless PostgreSQL with pgvector
DATABASE_URL=postgresql://user:password@ep-you
