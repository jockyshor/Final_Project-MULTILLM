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

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [System Architecture & Flow](#-system-architecture--flow)
- [Key Engineering Pillars](#-key-engineering-pillars)
  - [1. 2-Tier Supervisory Pattern & Dynamic Model Tiers](#1-2-tier-supervisory-pattern--dynamic-model-tiers)
  - [2. High-Ceiling ReAct Loop & Deduplication Guard](#2-high-ceiling-react-loop--deduplication-guard)
  - [3. Model Context Protocol (MCP) Bridge](#3-model-context-protocol-mcp-bridge)
  - [4. Vector RAG Pipeline (Neon pgvector)](#4-vector-rag-pipeline-neon-pgvector)
  - [5. Temporal Freshness & Web Grounding Engine](#5-temporal-freshness--web-grounding-engine)
  - [6. System Prompt Safety & Anti-Leak Policy](#6-system-prompt-safety--anti-leak-policy)
  - [7. Token Economics & Groq TPM Shield](#7-token-economics--groq-tpm-shield)
- [Repository Structure](#-repository-structure)
- [REST API Reference & SSE Streaming](#-rest-api-reference--sse-streaming)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Installation & Execution](#installation--execution)
- [Production Build & Verification](#-production-build--verification)
- [License](#-license)

---

## 🏛️ Architectural Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                 REACT 18 + VITE CLIENT (WARM EDITORIAL UI)                  │
│  • Resizable & Collapsible Drawer (200px–450px)   • Drag & Drop Multi-RAG   │
│  • Shimmer Pulse Telemetry                        • SSE Vercel AI Stream    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / Server-Sent Events (SSE)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   EXPRESS 5 BACKEND (LAYERED ARCHITECTURE)                  │
│               Route  ───►  Controller  ───►  Service  ───►  Model           │
│                                                                             │
│  [Supervisor 20B]        [ReAct Loop 120B]       [Prompt Safety Shield]     │
│  Sub-50ms Model Triage   5-Cycle Autonomous Tool  Pre-execution Regex Guard  │
│  & Query Normalization   Deduplication In-Memory  & Constitutional Directives│
└──────────┬───────────────────────────┬───────────────────────────┬──────────┘
           │                           │                           │
           ▼                           ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌─────────────────────┐
│    MULTI-PROVIDER     │   │     NEON POSTGRES     │   │   STANDALONE MCP    │
│    SPECIALIST SUITE   │   │  • Conversations / Msg│   │   SERVER PROCESS    │
│ • Groq Fast (20B)     │   │  • Telemetry Metadata │   │  • Host OS/RAM Metr.│
│ • Groq Reason (120B)  │   │  • 768-dim pgvector   │   │  • Web Scraper      │
│ • Gemini Flash Lite   │   │  • Cosine Search (<=>)│   │  • Stdio JSON-RPC   │
└───────────────────────┘   └───────────────────────┘   └─────────────────────┘
