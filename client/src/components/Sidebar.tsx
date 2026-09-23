import React from 'react';
import type { Conversation } from '../types/chat';

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  sidebarWidth: number;
  conversations: Conversation[];
  hiddenThreadIds: string[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onHideThread: (id: string, e: React.MouseEvent) => void;
  onClearAllThreads: () => void;
  onRestoreAllThreads: () => void;
  onClose: () => void;
  onStartResizing: (e: React.MouseEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isMobile,
  sidebarWidth,
  conversations,
  hiddenThreadIds,
  activeConversationId,
  onSelectConversation,
  onStartNewConversation,
  onHideThread,
  onClearAllThreads,
  onRestoreAllThreads,
  onClose,
  onStartResizing,
}) => {
  if (!isOpen) return null;

  const visibleConversations = conversations.filter(
    (c) => !hiddenThreadIds.includes(c.id)
  );

  return (
    <>
      {isMobile && (
        <div
          onClick={onClose}
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
            onClick={onStartNewConversation}
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
                onClick={onClearAllThreads}
                title="Hide all threads from view"
                className="p-1.5 rounded-md hover:bg-[#201F1C] text-[#85837B] hover:text-[#DEDCD5] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}

            <button
              onClick={onClose}
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
                onClick={() => onSelectConversation(conv.id)}
                className={`group relative flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#262521] text-[#F4F3EF] font-medium border border-[#3D3A33] shadow-sm'
                    : 'hover:bg-[#1B1A17] text-[#A8A69E]'
                }`}
              >
                <span className="truncate pr-4">{conv.title || 'Untitled Thread'}</span>

                <button
                  onClick={(e) => onHideThread(conv.id, e)}
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
                  onClick={onRestoreAllThreads}
                  className="text-[11px] text-[#D97706] hover:underline"
                >
                  Restore hidden
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom: Specialist Tiers */}
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
              <span className="text-[10px] font-mono text-[#85837B]">Quick and Light Triage</span>
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
                <span className="text-[#DEDCD5] font-medium">Gemini </span>
              </span>
              <span className="text-[10px] font-mono text-[#85837B]">Research</span>
            </div>
          </div>
        </div>

        {/* Draggable Resizer Line */}
        {!isMobile && (
          <div
            onMouseDown={onStartResizing}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#D97706]/50 transition-colors z-20"
          />
        )}
      </aside>
    </>
  );
};