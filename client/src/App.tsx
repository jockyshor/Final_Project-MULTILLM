import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageMetadata {
  model?: string;
  routingReason?: string;
  latencyMs?: number;
  tools?: Array<{ toolName: string; args: any }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Durable localStorage state for hidden threads
  const getStoredHidden = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem('multillm_hidden_threads') || '[]');
    } catch {
      return [];
    }
  };

  const [hiddenThreadIds, setHiddenThreadIds] = useState<string[]>(getStoredHidden);

  // Sidebar sizing & mobile detection
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isMobile, setIsMobile] = useState(false);
  const isResizingRef = useRef(false);

  // Multi-Format RAG Document Upload States
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadedDocNotice, setUploadedDocNotice] = useState<{ filename: string; chunks: number; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metadata cache for routing badges
  const [metadataMap, setMetadataMap] = useState<Record<string, MessageMetadata>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect screen size for responsive drawer
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    isLoading,
    data,
  } = useChat({
    api: 'http://localhost:5001/api/chat',
    body: {
      conversationId: activeConversationId,
    },
    onFinish: () => {
      loadConversations();
    },
  });

  // Load conversations from server
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5001/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Failed to load conversation history:', err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Extract streamed metadata frames (2:[...])
  useEffect(() => {
    if (data && data.length > 0) {
      const latestData = data[data.length - 1] as any;
      if (latestData && typeof latestData === 'object') {
        const meta = Array.isArray(latestData) ? latestData[0] : latestData;
        if (meta?.conversationId) {
          setActiveConversationId(meta.conversationId);
        }
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          if (lastMsg) {
            setMetadataMap((prev) => ({
              ...prev,
              [lastMsg.id]: meta,
            }));
          }
        }
      }
    }
  }, [data, messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Switch conversation thread
  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    if (isMobile) setIsSidebarOpen(false);

    try {
      const res = await fetch(`http://localhost:5001/api/conversations/${id}`);
      if (res.ok) {
        const history = await res.json();
        setMessages(
          history.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to hydrate thread:', err);
    }
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    if (isMobile) setIsSidebarOpen(false);
  };

  // Hide single thread from view
  const hideThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = getStoredHidden();
    const next = Array.from(new Set([...current, id]));
    localStorage.setItem('multillm_hidden_threads', JSON.stringify(next));
    setHiddenThreadIds(next);

    if (activeConversationId === id) {
      startNewConversation();
    }
  };

  // Hide all threads from view
  const clearAllThreadsView = () => {
    const allIds = conversations.map((c) => c.id);
    const next = Array.from(new Set([...getStoredHidden(), ...allIds]));
    localStorage.setItem('multillm_hidden_threads', JSON.stringify(next));
    setHiddenThreadIds(next);
    startNewConversation();
  };

  const restoreAllThreads = () => {
    localStorage.removeItem('multillm_hidden_threads');
    setHiddenThreadIds([]);
  };

  // Drag-to-resize sidebar handlers
  const startResizing = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const newWidth = Math.min(Math.max(e.clientX, 200), 450);
    setSidebarWidth(newWidth);
  };

  const stopResizing = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.userSelect = 'auto';
  };

  // Reusable File Upload Handler
  const uploadDocument = (file: File) => {
    if (!file) return;

    setIsUploadingDoc(true);
    setUploadedDocNotice(null);

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const rawResult = reader.result as string;
        const base64Data = rawResult.includes(',') ? rawResult.split(',')[1] : rawResult;

        const res = await fetch('http://localhost:5001/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64Content: base64Data,
            fileType: file.type || 'application/octet-stream',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setUploadedDocNotice({
            filename: file.name,
            chunks: data.details?.chunksCount || 1,
          });
        } else {
          const errData = await res.json().catch(() => ({ error: 'Upload failed' }));
          setUploadedDocNotice({
            filename: `Failed: ${errData.error || 'Check server logs'}`,
            chunks: 0,
            isError: true,
          });
        }
      } catch (err: any) {
        setUploadedDocNotice({
          filename: `Error: ${err.message}`,
          chunks: 0,
          isError: true,
        });
      } finally {
        setIsUploadingDoc(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setUploadedDocNotice({
        filename: 'Could not read file locally.',
        chunks: 0,
        isError: true,
      });
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsDataURL(file);
  };

  const visibleConversations = conversations.filter(
    (c) => !hiddenThreadIds.includes(c.id)
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingFile(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
          uploadDocument(file);
        }
      }}
      className="flex h-screen w-screen bg-[#181816] text-[#F4F3EF] font-sans antialiased overflow-hidden select-none relative"
    >
      {/* =================================================================== */}
      {/* DRAG & DROP OVERLAY (Warm Editorial Style)                          */}
      {/* =================================================================== */}
      {isDraggingFile && (
        <div className="absolute inset-0 bg-[#181816]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center border-2 border-dashed border-[#D97706]/70 rounded-3xl m-4 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center text-[#D97706] mb-3 animate-bounce">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h2 className="text-sm font-medium tracking-tight text-[#F4F3EF]">Drop document to index into Neon pgvector</h2>
          <p className="text-xs text-[#9E9D96] mt-1">Supports PDF, DOCX, Markdown, and TXT</p>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. WARM CLAUDE + APPLE TITANIUM SIDEBAR                             */}
      {/* =================================================================== */}
      {isSidebarOpen && (
        <>
          {isMobile && (
            <div
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            />
          )}

          <aside
            style={{ width: isMobile ? '280px' : `${sidebarWidth}px` }}
            className={`${
              isMobile ? 'fixed inset-y-0 left-0 z-40' : 'relative'
            } flex flex-col h-full bg-[#131311] border-r border-[#262522] transition-[width] duration-75 flex-shrink-0 shadow-2xl md:shadow-none`}
          >
            {/* Top Sidebar Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-[#262522]">
              <button
                onClick={startNewConversation}
                className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#201F1C] border border-[#2E2D28] hover:border-[#D97706]/60 hover:text-[#F4F3EF] text-[#DEDCD5] transition-all shadow-sm"
              >
                <svg className="w-3.5 h-3.5 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Thread</span>
              </button>

              <div className="flex items-center gap-1">
                {visibleConversations.length > 0 && (
                  <button
                    onClick={clearAllThreadsView}
                    title="Hide all threads from view"
                    className="p-1.5 rounded-md hover:bg-[#201F1C] text-[#85837B] hover:text-[#DEDCD5] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={() => setIsSidebarOpen(false)}
                  title="Collapse sidebar"
                  className="p-1.5 rounded-md hover:bg-[#201F1C] text-[#85837B] hover:text-[#DEDCD5] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Middle: Conversation Threads */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
              {visibleConversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`group relative flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#262521] text-[#F4F3EF] font-medium border border-[#3D3A33] shadow-sm'
                        : 'hover:bg-[#1B1A17] text-[#A8A69E]'
                    }`}
                  >
                    <span className="truncate pr-4">{conv.title || 'Untitled Thread'}</span>

                    <button
                      onClick={(e) => hideThread(conv.id, e)}
                      title="Hide from view"
                      className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${
                        isActive ? 'hover:bg-white/10 text-[#C2C0B6]' : 'hover:bg-white/10 text-[#85837B]'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}

              {visibleConversations.length === 0 && (
                <div className="text-center py-10 px-4 space-y-2">
                  <p className="text-xs text-[#6E6C64]">No threads in view.</p>
                  {hiddenThreadIds.length > 0 && (
                    <button
                      onClick={restoreAllThreads}
                      className="text-[11px] text-[#D97706] hover:underline"
                    >
                      Restore hidden
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom: "ACTIVE SPECIALIST BRAINS" (Claude + Apple Warm Widget) */}
            <div className="p-3 border-t border-[#262522] bg-[#0F0F0D] space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#6E6C64] font-medium px-1">
                Active Orchestrator Tiers
              </div>
              <div className="space-y-1 text-[11px]">
                {/* Brain 1: Groq Fast */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#181815] border border-[#24231F]">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/90 shadow-sm animate-pulse" />
                    <span className="text-[#DEDCD5] font-medium">Groq 20B</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#85837B]">Triage &lt;80ms</span>
                </div>

                {/* Brain 2: Groq Reasoning */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#181815] border border-[#24231F]">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                    <span className="text-[#DEDCD5] font-medium">Groq 120B</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#D97706]">Reasoning Agent</span>
                </div>

                {/* Brain 3: Google Gemini */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#181815] border border-[#24231F]">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span className="text-[#DEDCD5] font-medium">Gemini 1.5</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#85837B]">1M Context</span>
                </div>
              </div>
            </div>

            {/* Draggable Resizer Line */}
            {!isMobile && (
              <div
                onMouseDown={startResizing}
                className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#D97706]/50 transition-colors z-20"
              />
            )}
          </aside>
        </>
      )}

      {/* =================================================================== */}
      {/* 2. CLAUDE + APPLE WARM EDITORIAL MAIN WORKSPACE                     */}
      {/* =================================================================== */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#181816]">
        {/* Top Minimal Navigation Bar */}
        <header className="h-12 border-b border-[#262522] flex items-center justify-between px-4 z-10 bg-[#181816]/90 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                title="Expand sidebar"
                className="p-1.5 rounded-lg border border-[#2E2D28] bg-[#201F1C] hover:bg-[#262521] transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-[#DEDCD5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              <span className="text-xs font-semibold tracking-tight text-[#F4F3EF]">
                MULTILLM Orchestrator
              </span>
            </div>
          </div>

          <div className="text-[10px] text-[#85837B] font-mono tracking-wider uppercase">
            Autonomous Multi-Provider Engine
          </div>
        </header>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 lg:px-20 py-8 space-y-6 select-text w-full max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3 my-auto pt-24 select-none">
              <div className="w-12 h-12 rounded-2xl bg-[#D97706]/10 border border-[#D97706]/20 flex items-center justify-center text-[#D97706]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-[#F4F3EF]">Autonomous Multi-Model Workspace</h2>
              <p className="text-xs text-[#9E9D96] leading-relaxed">
                Triage router across Groq LPUs and Google Gemini, autonomous ReAct loops, Tavily live web grounding, MCP host tools, and Semantic pgvector RAG.
              </p>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.role === 'user';
            const meta = metadataMap[m.id];

            return (
              <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
                {/* Chat Bubble */}
                <div
                  className={`w-fit max-w-[95%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#2E2D28] text-[#F4F3EF] border border-[#3D3A33] shadow-sm font-normal'
                      : 'bg-[#201F1C] text-[#DEDCD5] border border-[#2E2D28] shadow-sm'
                  }`}
                >
                  {/* 🛡️ THE FIX: Explicit styling guarantees headings (h1, h2, h3), bold words, and links are never black */}
                  <div className="prose prose-invert prose-xs sm:prose-sm max-w-none break-words text-[#DEDCD5] [&_h1]:text-[#F4F3EF] [&_h1]:font-semibold [&_h1]:text-base [&_h2]:text-[#F4F3EF] [&_h2]:font-semibold [&_h2]:text-sm [&_h3]:text-[#F4F3EF] [&_h3]:font-medium [&_strong]:text-[#F4F3EF] [&_strong]:font-semibold [&_p]:text-[#DEDCD5] [&_li]:text-[#DEDCD5] [&_table]:border-[#2E2D28] [&_th]:text-[#F4F3EF] [&_th]:border-[#2E2D28] [&_td]:border-[#2E2D28] [&_pre]:bg-[#121210] [&_pre]:border [&_pre]:border-[#2E2D28] [&_pre]:rounded-xl [&_pre]:p-3 [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_a]:text-[#D97706] [&_a]:underline">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>

                {/* Understated Specialist & Routing Watermark */}
                {!isUser && (
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#6E6C64] font-mono tracking-tight select-none">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#525048]" />
                      <span>{meta?.model || 'openai/gpt-oss-120b'}</span>
                    </span>

                    {meta?.tools && meta.tools.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-[#D97706] font-medium">
                          {meta.tools.length} {meta.tools.length === 1 ? 'tool' : 'tools'} executed
                        </span>
                      </>
                    )}

                    {meta?.latencyMs && (
                      <>
                        <span>·</span>
                        <span>{(meta.latencyMs / 1000).toFixed(1)}s</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Minimalist Claude-Style Shimmer Loading Pulse */}
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#201F1C] border border-[#2E2D28] text-[#9E9D96] text-xs w-fit select-none animate-pulse">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-bounce [animation-delay:0.4s]" />
              </span>
              <span className="text-[11px] font-mono text-[#85837B]">
                Synthesizing findings...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Responsive Input Bar */}
        <div className="p-4 border-t border-[#262522] bg-[#181816]/90 backdrop-blur-md">
          {/* RAG Upload Notice Pill */}
          {uploadedDocNotice && (
            <div
              className={`max-w-3xl mx-auto mb-2 flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs animate-fadeIn ${
                uploadedDocNotice.isError
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-[#D97706]/10 border-[#D97706]/30 text-[#D97706]'
              }`}
            >
              <span className="flex items-center gap-1.5 font-medium truncate">
                <span>{uploadedDocNotice.isError ? '⚠️' : '📄'}</span>
                <span>
                  {uploadedDocNotice.isError
                    ? uploadedDocNotice.filename
                    : `Indexed "${uploadedDocNotice.filename}" into Neon pgvector (${uploadedDocNotice.chunks} chunks)`}
                </span>
              </span>
              <button
                onClick={() => setUploadedDocNotice(null)}
                className="p-0.5 hover:bg-white/10 rounded text-[#85837B] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto flex items-center gap-2 bg-[#201F1C] border border-[#2E2D28] focus-within:border-[#D97706]/70 focus-within:ring-2 focus-within:ring-[#D97706]/15 rounded-2xl px-3 py-1.5 transition-all shadow-md"
          >
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadDocument(file);
              }}
              accept=".txt,.md,.markdown,.json,.pdf,.docx"
              className="hidden"
            />

            {/* Paperclip Button */}
            <button
              type="button"
              disabled={isUploadingDoc}
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
              title="Attach document (.pdf, .docx, .txt, .md, .json) or drag & drop anywhere"
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[#85837B] hover:text-[#F4F3EF] hover:bg-white/[0.04] transition-colors ${
                isUploadingDoc ? 'animate-pulse text-[#D97706]' : ''
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <input
              value={input}
              onChange={handleInputChange}
              placeholder={isUploadingDoc ? "Indexing document into pgvector..." : "Ask anything, query uploaded documents, or inspect code..."}
              className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-[#F4F3EF] placeholder-[#6E6C64] select-text py-1.5"
            />

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-7 h-7 rounded-xl bg-[#D97706] text-[#131311] flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed hover:bg-[#E08A1E] transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}