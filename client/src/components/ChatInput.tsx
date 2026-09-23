import React, { useRef } from 'react';
import type { UploadedDocNotice } from '../types/chat';

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  isUploadingDoc: boolean;
  uploadedDocNotice: UploadedDocNotice | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onUploadFile: (file: File) => void;
  onDismissNotice: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  isLoading,
  isUploadingDoc,
  uploadedDocNotice,
  onInputChange,
  onSubmit,
  onUploadFile,
  onDismissNotice,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
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
            onClick={onDismissNotice}
            className="p-0.5 hover:bg-white/10 rounded text-[#85837B] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="max-w-3xl mx-auto flex items-center gap-2 bg-[#201F1C] border border-[#2E2D28] focus-within:border-[#D97706]/70 focus-within:ring-2 focus-within:ring-[#D97706]/15 rounded-2xl px-3 py-1.5 transition-all shadow-md"
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".txt,.md,.markdown,.json,.pdf,.docx"
          className="hidden"
        />

        {/* Paperclip Button */}
        <button
          type="button"
          disabled={isUploadingDoc}
          onClick={handleTriggerFileInput}
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
          onChange={onInputChange}
          placeholder={
            isUploadingDoc
              ? 'Indexing document into pgvector...'
              : 'Ask anything, query uploaded documents, or inspect code...'
          }
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
  );
};