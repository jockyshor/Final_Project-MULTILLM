import { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TelemetryData {
  conversationId?: string;
  model: string;
  routingReason: string;
  latencyMs: number;
  tools?: Array<{ toolName: string; args: any }>;
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
      console.error('Failed to load conversations:', err);
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
      console.error('Failed to hydrate thread:', err);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans antialiased selection:bg-neutral-800">
      {/* SIDEBAR: Clean, Minimalist macOS-style panel */}
      <aside className="w-64 bg-neutral-900/40 border-r border-neutral-800/60 flex flex-col justify-between">
        <div className="p-4 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800/60">
            <span className="text-xs font-semibold tracking-tight text-neutral-300">
              MultiLLM
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">v1.0</span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-1.5 bg-neutral-100 hover:bg-white text-neutral-900 font-medium py-2 px-3 rounded-lg text-xs transition duration-150 mb-4 shadow-sm"
          >
            <span>+</span> New Conversation
          </button>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            <p className="text-[10px] font-medium tracking-wider uppercase text-neutral-400 px-2 mb-1.5">
              History
            </p>
            {conversationsList.length === 0 ? (
              <p className="text-xs text-neutral-400 px-2 py-3">No conversations</p>
            ) : (
              conversationsList.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition duration-150 flex flex-col gap-0.5 ${
                      isActive
                        ? 'bg-neutral-800 text-neutral-100 font-medium'
                        : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                    }`}
                  >
                    <span className="truncate">{conv.title}</span>
                    <span className="text-[10px] text-neutral-400">
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

        {/* Minimalist System Status */}
        <div className="p-3 border-t border-neutral-800/60 text-[10px] text-neutral-400 flex flex-col gap-1 font-mono">
          <div className="flex items-center justify-between">
            <span>Specialists</span>
            <span className="text-neutral-400 font-sans">Groq · 120B / 20B</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Memory</span>
            <span className="text-neutral-400 font-sans">Neon PostgreSQL</span>
          </div>
        </div>
      </aside>

      {/* CHAT CANVAS */}
      <div className="flex-1 flex flex-col bg-neutral-950 relative">
        {/* Apple-style Translucent Navbar */}
        <header className="h-12 border-b border-neutral-800/60 px-6 flex items-center justify-between bg-neutral-950/70 backdrop-blur-xl">
          <span className="text-xs text-neutral-400">
            {activeConversationId ? 'Conversation' : 'New Session'}
          </span>
          <div className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
            Adaptive Router
          </div>
        </header>

        {/* Message Thread */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl w-full mx-auto">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-28">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-200 mb-1">
                Specialist Network
              </h2>
              <p className="text-xs text-neutral-400 max-w-sm mb-6">
                Direct reasoning and tool execution for your local codebase.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-sm text-xs">
                <button
                  onClick={() => handleInputChange({ target: { value: 'What dependencies are in server/package.json?' } } as any)}
                  className="p-3 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 rounded-xl text-left text-neutral-300 transition duration-150"
                >
                  <span className="text-neutral-400 block text-[10px] uppercase font-mono mb-0.5">Tool Action</span>
                  Inspect dependencies in server/package.json
                </button>
                <button
                  onClick={() => handleInputChange({ target: { value: 'Explain idempotency in distributed systems' } } as any)}
                  className="p-3 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 rounded-xl text-left text-neutral-300 transition duration-150"
                >
                  <span className="text-neutral-400 block text-[10px] uppercase font-mono mb-0.5">Fast Assistant</span>
                  Explain idempotency in distributed systems
                </button>
              </div>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.role === 'user';
            const telemetry = (m.annotations?.[0] as unknown) as TelemetryData | undefined;

            return (
              <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${isUser ? '' : 'w-full'}`}>
                  {/* Message Content */}
                  <div
                    className={`text-sm leading-relaxed ${
                      isUser
                        ? 'bg-neutral-800 text-neutral-100 px-4 py-2.5 rounded-2xl rounded-br-sm inline-block shadow-sm'
                        : 'text-neutral-200 px-1 py-1'
                    }`}
                  >
                    {/* Tool Invocation Pill (Apple macOS Style) */}
                    {telemetry?.tools && telemetry.tools.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {telemetry.tools.map((tool, idx) => (
                          <div
                            key={idx}
                            className="bg-neutral-900 border border-neutral-800 text-neutral-300 px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 shadow-sm"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                            <span className="font-semibold text-neutral-200">{tool.toolName}</span>
                            <span className="text-neutral-400 text-[10px]">
                              {JSON.stringify(tool.args)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isUser ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Clean, Xcode-inspired dark code blocks
                          code({ node, inline, className, children, ...props }: any) {
                            return inline ? (
                              <code
                                className="bg-neutral-900 text-neutral-200 px-1.5 py-0.5 rounded font-mono text-xs border border-neutral-800"
                                {...props}
                              >
                                {children}
                              </code>
                            ) : (
                              <div className="my-3 rounded-lg bg-neutral-900/90 border border-neutral-800 overflow-hidden">
                                <div className="bg-neutral-900 px-3 py-1 border-b border-neutral-800/80 text-[10px] font-mono text-neutral-400">
                                  CODE
                                </div>
                                <pre className="p-3.5 text-xs font-mono text-neutral-200 overflow-x-auto leading-relaxed">
                                  {children}
                                </pre>
                              </div>
                            );
                          },
                          p({ children }) {
                            return <p className="mb-2.5 last:mb-0 text-neutral-300">{children}</p>;
                          },
                          ul({ children }) {
                            return <ul className="list-disc pl-5 mb-2.5 space-y-1 text-neutral-300">{children}</ul>;
                          },
                          strong({ children }) {
                            return <strong className="font-semibold text-neutral-100">{children}</strong>;
                          },
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Telemetry Footer: Restrained, Apple-style font */}
                  {telemetry && (
                    <div className="mt-2 pl-1 flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                      <span>{telemetry.model.split('/')[1] || telemetry.model}</span>
                      <span>·</span>
                      <span>{telemetry.usage.totalTokens} tokens</span>
                      <span>·</span>
                      <span>{telemetry.latencyMs}ms</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isChatting && (
            <div className="flex items-center gap-2 text-xs text-neutral-400 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse"></span>
              Specialist generating...
            </div>
          )}
        </main>

        {/* Apple-style Pill Input */}
        <footer className="p-4 bg-neutral-950">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
            <input
              className="flex-1 bg-neutral-900/80 text-neutral-100 placeholder-neutral-400 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-700 transition duration-150"
              value={input}
              placeholder="Ask a question or request a codebase inspection..."
              onChange={handleInputChange}
            />
            <button
              type="submit"
              disabled={isChatting || !input.trim()}
              className="bg-neutral-100 text-neutral-900 font-medium px-4 py-2.5 rounded-xl hover:bg-white transition duration-150 disabled:opacity-30 text-sm shadow-sm"
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
