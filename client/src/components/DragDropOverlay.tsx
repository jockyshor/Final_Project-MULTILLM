import React from 'react';

interface DragDropOverlayProps {
  isVisible: boolean;
}

export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-[#181816]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center border-2 border-dashed border-[#D97706]/70 rounded-3xl m-4 pointer-events-none">
      <div className="w-14 h-14 rounded-2xl bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center text-[#D97706] mb-3 animate-bounce">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <h2 className="text-sm font-medium tracking-tight text-[#F4F3EF]">
        Drop document to index into Neon pgvector
      </h2>
      <p className="text-xs text-[#9E9D96] mt-1">Supports PDF, DOCX, Markdown, and TXT</p>
    </div>
  );
};