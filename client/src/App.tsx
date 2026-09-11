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

  // Synchronous, durable localStorage state for hidden threads
  const getStoredHidden = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem('multillm_hidden_threads') || '[]');
    } catch {
      return [];
    }
  };

  const [hiddenThreadIds, setHiddenThreadIds] = useState<string[]>(getStoredHidden);

  // Responsive sidebar sizing & mobile detection
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isMobile, setIsMobile] = useState(false);
  const isResizingRef = useRef(false);

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

  // Synchronously hide a single thread from UI and persist to localStorage
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

  // Synchronously hide all threads from view
  const clearAllThreadsView = () => {
    const allIds = conversations.map((c) => c.id);
    const next = Array.from(new Set([...getStoredHidden(), ...allIds]));
    localStorage.setItem('multillm_hidden_threads', JSON.stringify(next));
    setHiddenThreadIds(next);
    startNewConversation();
  };

  // Unhide all threads if desired
  const restoreAllThreads = () => {
    localStorage.removeItem('multillm_hidden_threads');
    setHiddenThreadIds([]);
  };

  // Drag-to-resize handlers
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

  // Filter out hidden threads
  const visibleConversations = conversations.filter(
    (c) => !hiddenThreadIds.includes(c.id)
  );

  return (
    <div className="flex h-screen w-screen bg-[#0A0A0C] text-[#F5F5F7] font-sans antialiased overflow-hidden select-none">
      {/* =================================================================== */}
      {/* 1. COLLAPSIBLE, RESIZABLE, RESPONSIVE DARK SIDEBAR                  */}
      {/* =================================================================== */}
      {isSidebarOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
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
            } flex flex-col h-full bg-[#111114] border-r border-[#1E1E22] transition-[width] duration-75 flex-shrink-0 shadow-2xl md:shadow-none`}
          >
            {/* Top Sidebar Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-[#1E1E22]">
              <button
                onClick={startNewConversation}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#1C1C21] border border-[#28282E] hover:border-[#0071E3] hover:text-[#0071E3] transition-all shadow-sm"
              >
                <svg className="w-3.5 h-3.5 text-[#0071E3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Thread</span>
              </button>

              <div className="flex items-center gap-1">
                {visibleConversations.length > 0 && (
                  <button
                    onClick={clearAllThreadsView}
                    title="Hide all threads from view"
                    className="p-1.5 rounded-lg hover:bg-[#1C1C21] text-neutral-400 hover:text-neutral-200 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={() => setIsSidebarOpen(false)}
                  title="Collapse sidebar"
                  className="p-1.5 rounded-lg hover:bg-[#1C1C21] text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
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
                    className={`group relative flex items-center justify-between px-3 py-2 text-xs rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#0071E3] text-white font-medium shadow-md shadow-[#0071E3]/20'
                        : 'hover:bg-white/[0.04] text-neutral-300'
                    }`}
                  >
                    <span className="truncate pr-4 font-medium">{conv.title || 'Untitled Discussion'}</span>

                    {/* Discrete × button on hover (soft-deletes from view) */}
                    <button
                      onClick={(e) => hideThread(conv.id, e)}
                      title="Hide thread from view"
                      className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition-opacity ${
                        isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-white/10 text-neutral-400'
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
                  <p className="text-xs text-neutral-500">No active discussions in view.</p>
                  {hiddenThreadIds.length > 0 && (
                    <button
                      onClick={restoreAllThreads}
                      className="text-[11px] text-[#0071E3] hover:underline"
                    >
                      Restore hidden threads
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom: "ACTIVE SPECIALIST BRAINS" WIDGET */}
            <div className="p-3 border-t border-[#1E1E22] bg-[#0D0D10] space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-semibold px-1">
                Connected Specialist Brains
              </div>
              <div className="space-y-1.5 text-[11px]">
                {/* Brain 1: Groq Fast */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.02]">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
                    <span className="text-neutral-200 font-medium">Groq 20B</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">Fast Triage</span>
                </div>

                {/* Brain 2: Groq Reasoning */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.02]">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] shadow-sm shadow-[#0071E3]/50" />
                    <span className="text-neutral-200 font-medium">Groq 120B</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#0071E3]">Reasoning Agent</span>
                </div>

                {/* Brain 3: Google Gemini */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.02]">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                    <span className="text-neutral-200 font-medium">Gemini 1.5</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">1M Context</span>
                </div>
              </div>
            </div>

            {/* Draggable Resizer (Desktop Only) */}
            {!isMobile && (
              <div
                onMouseDown={startResizing}
                className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#0071E3]/60 transition-colors z-20"
              />
            )}
          </aside>
        </>
      )}

      {/* =================================================================== */}
      {/* 2. RESPONSIVE CHAT WORKSPACE (Mobile to 4K Ultrawide)                */}
      {/* =================================================================== */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#0A0A0C]">
        {/* Top Minimal Navigation Bar */}
        <header className="h-12 border-b border-[#1E1E22] flex items-center justify-between px-4 z-10 bg-[#0A0A0C]/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                title="Expand sidebar"
                className="p-1.5 rounded-lg border border-[#28282E] bg-[#16161A] hover:bg-[#1E1E24] transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0071E3] shadow-sm shadow-[#0071E3]/50" />
              <span className="text-xs font-semibold tracking-tight text-white">
                MULTILLM Orchestrator
              </span>
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-mono tracking-wider uppercase">
            Autonomous Multi-Provider Engine
          </div>
        </header>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 lg:px-20 py-6 space-y-6 select-text w-full max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3 my-auto pt-24 select-none">
              <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/15 border border-[#0071E3]/30 flex items-center justify-center text-[#0071E3] shadow-lg shadow-[#0071E3]/10">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-white">Autonomous Multi-Model Stack</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Triage router across Groq LPUs and Google Gemini, autonomous ReAct loops, Tavily live web grounding, and sandboxed codebase tools.
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
                  className={`w-fit max-w-[95%] sm:max-w-[85%] md:max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#0071E3] text-white shadow-md shadow-[#0071E3]/20 font-normal'
                      : 'bg-[#151518] text-neutral-200 border border-[#222226] shadow-sm'
                  }`}
                >
                  <div className="prose prose-invert prose-xs sm:prose-sm max-w-none break-words [&_pre]:bg-[#0D0D10] [&_pre]:border [&_pre]:border-[#25252A] [&_pre]:rounded-xl [&_pre]:p-3 [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_a]:text-[#0071E3] [&_a]:underline">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>

                {/* Understated Specialist & Routing Watermark */}
                {!isUser && (
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-neutral-500 font-mono tracking-tight select-none">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                      <span>{meta?.model || 'openai/gpt-oss-120b'}</span>
                    </span>

                    {meta?.tools && meta.tools.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-[#0071E3] font-medium">
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

          {/* Minimalist Apple Shimmer Loading Pulse */}
          {isLoading && (
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#151518] border border-[#222226] text-neutral-400 text-xs w-fit select-none animate-pulse">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] animate-bounce [animation-delay:0.4s]" />
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                Evaluating context & dispatching specialist tools...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Responsive Input Bar */}
        <div className="p-4 border-t border-[#1E1E22] bg-[#0A0A0C]/90 backdrop-blur-md">
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto flex items-center gap-2 bg-[#151518] border border-[#26262C] focus-within:border-[#0071E3] focus-within:ring-2 focus-within:ring-[#0071E3]/20 rounded-2xl px-3 py-1.5 transition-all shadow-lg"
          >
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask anything, inspect codebase files, or search live web..."
              className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 select-text py-1.5"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-8 h-8 rounded-xl bg-[#0071E3] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#0077ED] transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}