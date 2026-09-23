import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import type { Conversation, MessageMetadata, UploadedDocNotice } from './types/chat';
import { DragDropOverlay } from './components/DragDropOverlay';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EmptyState } from './components/EmptyState';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';

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
  const [uploadedDocNotice, setUploadedDocNotice] = useState<UploadedDocNotice | null>(null);

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
        const dataRes = await res.json();
        setConversations(dataRes);
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
  const startResizing = (_e: React.MouseEvent) => {
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
          const resData = await res.json();
          setUploadedDocNotice({
            filename: file.name,
            chunks: resData.details?.chunksCount || 1,
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
      }
    };

    reader.onerror = () => {
      setUploadedDocNotice({
        filename: 'Could not read file locally.',
        chunks: 0,
        isError: true,
      });
      setIsUploadingDoc(false);
    };

    reader.readAsDataURL(file);
  };

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
      <DragDropOverlay isVisible={isDraggingFile} />

      <Sidebar
        isOpen={isSidebarOpen}
        isMobile={isMobile}
        sidebarWidth={sidebarWidth}
        conversations={conversations}
        hiddenThreadIds={hiddenThreadIds}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onStartNewConversation={startNewConversation}
        onHideThread={hideThread}
        onClearAllThreads={clearAllThreadsView}
        onRestoreAllThreads={restoreAllThreads}
        onClose={() => setIsSidebarOpen(false)}
        onStartResizing={startResizing}
      />

      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#181816]">
        <Header
          isSidebarOpen={isSidebarOpen}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 lg:px-20 py-8 space-y-6 select-text w-full max-w-3xl mx-auto">
          {messages.length === 0 && <EmptyState />}

          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              id={m.id}
              role={m.role}
              content={m.content}
              metadata={metadataMap[m.id]}
            />
          ))}

          {/* Minimalist Shimmer Loading Pulse */}
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

        <ChatInput
          input={input}
          isLoading={isLoading}
          isUploadingDoc={isUploadingDoc}
          uploadedDocNotice={uploadedDocNotice}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onUploadFile={uploadDocument}
          onDismissNotice={() => setUploadedDocNotice(null)}
        />
      </main>
    </div>
  );
}