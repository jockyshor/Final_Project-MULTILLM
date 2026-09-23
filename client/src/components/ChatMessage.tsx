import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MessageMetadata } from '../types/chat';

interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
  metadata?: MessageMetadata;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  metadata,
}) => {
  const isUser = role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
      {/* Chat Bubble */}
      <div
        className={`w-fit max-w-[95%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
          isUser
            ? 'bg-[#2E2D28] text-[#F4F3EF] border border-[#3D3A33] shadow-sm font-normal'
            : 'bg-[#201F1C] text-[#DEDCD5] border border-[#2E2D28] shadow-sm'
        }`}
      >
        <div className="prose prose-invert prose-xs sm:prose-sm max-w-none break-words text-[#DEDCD5] [&_h1]:text-[#F4F3EF] [&_h1]:font-semibold [&_h1]:text-base [&_h2]:text-[#F4F3EF] [&_h2]:font-semibold [&_h2]:text-sm [&_h3]:text-[#F4F3EF] [&_h3]:font-medium [&_strong]:text-[#F4F3EF] [&_strong]:font-semibold [&_p]:text-[#DEDCD5] [&_li]:text-[#DEDCD5] [&_table]:border-[#2E2D28] [&_th]:text-[#F4F3EF] [&_th]:border-[#2E2D28] [&_td]:border-[#2E2D28] [&_pre]:bg-[#121210] [&_pre]:border [&_pre]:border-[#2E2D28] [&_pre]:rounded-xl [&_pre]:p-3 [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_a]:text-[#D97706] [&_a]:underline">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>

      {/* Specialist & Routing Watermark */}
      {!isUser && (
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#6E6C64] font-mono tracking-tight select-none">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#525048]" />
            <span>{metadata?.model || 'openai/gpt-oss-120b'}</span>
          </span>

          {metadata?.tools && metadata.tools.length > 0 && (
            <>
              <span>·</span>
              <span className="text-[#D97706] font-medium">
                {metadata.tools.length} {metadata.tools.length === 1 ? 'tool' : 'tools'} executed
              </span>
            </>
          )}

          {metadata?.latencyMs && (
            <>
              <span>·</span>
              <span>{(metadata.latencyMs / 1000).toFixed(1)}s</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};