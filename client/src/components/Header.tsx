import React from 'react';

interface HeaderProps {
  isSidebarOpen: boolean;
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isSidebarOpen, onOpenSidebar }) => {
  return (
    <header className="h-12 border-b border-[#262522] flex items-center justify-between px-4 z-10 bg-[#181816]/90 backdrop-blur-md">
      <div className="flex items-center gap-2">
        {!isSidebarOpen && (
          <button
            onClick={onOpenSidebar}
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
  );
};
