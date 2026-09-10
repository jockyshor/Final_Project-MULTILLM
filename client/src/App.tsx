import { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TelemetryData {
  conversationId?: string;
  model: string;
  routingReason: string;
  latencyMs: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

function App() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationsList, setConversationsList] = useState<ConversationSummary[]>([]);

  const { messages, input, handleInputChange, handleSubmit, status, setMessages } = useChat({
    api: '/api/chat',
    body: {
      conversationId: activeConversationId,
    },
    onFinish: (message) => {
      const telemetry = message.annotations?.[0] as TelemetryData | undefined;
      if (telemetry?.conversationId && telemetry.conversationId !== activeConversationId) {
        setActiveConversationId(telemetry.conversationId);
      }
      fetchConversations();
    },
  });

  const isChatting = status === 'submitted' || status === 'streaming';

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversationsList(data);
      }
    } catch (err) {
      console.error('Failed to load sidebar:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSelectConversation = async (id: string) => {
    if (id === activeConversationId) return;
    try {
      setActiveConversationId(id);
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) throw new Error('Failed to fetch thread');
      
      const dbMessages = await res.json();
      const formatted = dbMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        annotations: msg.model ? [{
          model: msg.model,
          routingReason: msg.routingReason,
          latencyMs: msg.latencyMs,
          usage: {
            promptTokens: msg.promptTokens,
            completionTokens: msg.completionTokens,
            totalTokens: msg.totalTokens,
          },
        }] : undefined,
      }));

      setMessages(formatted);
    } catch (err) {
      console.error('Failed to load thread:', err);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between">
        <div className="p-4 flex flex-col h-full">
          {/* Brand */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div>
              <h1 className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse"></span>
                MULTI<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">LLM</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Adaptive Specialist Engine</p>
            </div>
          </div>

          {/* New Chat Button with vibrant gradient */}
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl transition shadow-lg shadow-blue-500/20 text-sm mb-5"
          >
            <span className="text-lg leading-none">+</span> New Conversation
          </button>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 px-2 mb-2">
              Recent Threads
            </p>
            {conversationsList.length === 0 ? (
              <p className="text-xs text-slate-400 px-2 py-4 italic">No past threads yet</p>
            ) : (
              conversationsList.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex flex-col gap-1 border ${
                      isActive
                        ? 'bg-blue-950/40 border-blue-500/60 text-white font-medium shadow-sm'
                        : 'border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <span className="truncate font-medium">{conv.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex flex-col gap-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span> Groq 120B / 20B
            </span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"></span> Neon Postgres
            </span>
            <span className="text-cyan-400 font-bold">CONNECTED</span>
          </div>
        </div>
      </aside>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 relative">
        {/* Top bar */}
        <header className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Current Session:</span>
            <span className="text-cyan-300 font-mono font-medium">
              {activeConversationId ? activeConversationId.slice(0, 8) + '...' : 'New Session'}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Auto-Semantic Router Active
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl w-full mx-auto">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-24">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-xl shadow-blue-500/20">
                ⚡
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                MULTI<span className="text-cyan-400">LLM</span> Specialist Network
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-6">
                Direct, concise answers powered by autonomous intent routing.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs max-w-md w-full">
                <button
                  onClick={() => handleInputChange({ target: { value: 'Write a TypeScript debounce function' } } as any)}
                  className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded-xl text-left text-slate-300 transition shadow-sm"
                >
                  💻 <span className="font-semibold text-cyan-400">Code:</span> TypeScript debounce
                </button>
                <button
                  onClick={() => handleInputChange({ target: { value: 'Explain idempotency in banking' } } as any)}
                  className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-left text-slate-300 transition shadow-sm"
                >
                  ⚡ <span className="font-semibold text-emerald-400">Fast:</span> Banking idempotency
                </button>
              </div>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.role === 'user';
            const telemetry = (m.annotations?.[0] as unknown) as TelemetryData | undefined;
            const isReasoning = telemetry?.model.includes('120b');

            return (
              <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                    isUser
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none shadow-black/40'
                  }`}
                >
                  {/* Markdown with syntax accents */}
                  <div className="text-sm leading-relaxed">
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            return inline ? (
                              <code
                                className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-700/50"
                                {...props}
                              >
                                {children}
                              </code>
                            ) : (
                              <div className="my-3 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg">
                                {/* Code window header with macOS-style dots */}
                                <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                                  <span className="ml-2 text-[10px] text-cyan-400 font-mono font-semibold">CODE BLOCK</span>
                                </div>
                                <pre className="p-4 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed">
                                  {children}
                                </pre>
                              </div>
                            );
                          },
                          p({ children }) {
                            return <p className="mb-2 last:mb-0">{children}</p>;
                          },
                          ul({ children }) {
                            return <ul className="list-disc pl-5 mb-2 space-y-1 text-slate-300">{children}</ul>;
                          },
                          strong({ children }) {
                            return <strong className="font-bold text-cyan-300">{children}</strong>;
                          },
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Colorful Telemetry Badge */}
                  {telemetry && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px] font-mono">
                      {/* Model tag */}
                      <span
                        className={`px-2 py-0.5 rounded-md font-semibold border ${
                          isReasoning
                            ? 'bg-purple-950/80 text-purple-300 border-purple-700/70'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/70'
                        }`}
                      >
                        {telemetry.model}
                      </span>

                      {/* Tokens tag */}
                      <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded-md border border-slate-700">
                        ⚡ {telemetry.usage.totalTokens} tokens
                      </span>

                      {/* Latency tag */}
                      <span className="bg-slate-800 text-cyan-300 px-2 py-0.5 rounded-md border border-slate-700">
                        ⏱️ {telemetry.latencyMs}ms
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isChatting && (
            <div className="flex items-center gap-2.5 text-xs text-cyan-400 animate-pulse bg-slate-900 border border-slate-800 w-fit px-3.5 py-2 rounded-full shadow-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Specialist generating concise response...
            </div>
          )}
        </main>

        {/* Input Bar */}
        <footer className="p-4 bg-slate-950 border-t border-slate-800/80">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
            <input
              className="flex-1 bg-slate-900 text-white placeholder-slate-400 border border-slate-800 rounded-full px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 transition shadow-inner"
              value={input}
              placeholder="Ask for concise code or knowledge..."
              onChange={handleInputChange}
            />
            <button
              type="submit"
              disabled={isChatting || !input.trim()}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold px-6 py-3 rounded-full transition disabled:opacity-40 text-sm shadow-lg shadow-cyan-500/20"
            >
              Send
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}

export default App;