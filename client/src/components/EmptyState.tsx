import React from 'react';

export const EmptyState: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3 my-auto pt-24 select-none">
      <div className="w-12 h-12 rounded-2xl bg-[#D97706]/10 border border-[#D97706]/20 flex items-center justify-center text-[#D97706]">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h2 className="text-sm font-semibold tracking-tight text-[#F4F3EF]">
        Autonomous Multi-Model Workspace
      </h2>
      <p className="text-xs text-[#9E9D96] leading-relaxed">
        Triage router across Groq LPUs and Google Gemini, autonomous ReAct loops, Tavily live web grounding, MCP host tools, and Semantic pgvector RAG.
      </p>
    </div>
  );
};