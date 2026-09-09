import { useChat } from '@ai-sdk/react';

// Strict type for our backend telemetry payload
interface TelemetryData {
  model: string;
  routingReason: string;
  latencyMs: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

function App() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: '/api/chat',
  });

  const isChatting = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="p-4 border-b bg-white flex justify-between items-center shadow-sm">
        <div>
          <h1 className="font-bold text-xl tracking-tight">
            MULTI<span className="text-blue-600">LLM</span>
          </h1>
          <p className="text-xs text-gray-400">Intelligent Model Orchestration Engine</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
            ● Groq LPUs Active
          </span>
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
            ● Gemini Flash Active
          </span>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="text-center my-auto py-24 text-gray-400">
            <p className="text-lg font-medium text-gray-600">No messages yet</p>
            <p className="text-sm">Try asking a coding question or a general question to test routing.</p>
          </div>
        )}

        {messages.map((m) => {
          // Extract backend telemetry if available
          const telemetry = (m.annotations?.[0] as unknown) as TelemetryData | undefined;

          return (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white border border-gray-200 text-slate-800 rounded-bl-none'
                }`}
              >
                {/* whitespace-pre-wrap ensures code and newlines format properly */}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </div>

                {/* Observability Badge for Assistant Responses */}
                {telemetry && (
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-mono">
                    <span className="bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">
                      {telemetry.model}
                    </span>
                    <span>•</span>
                    <span className="text-gray-600 font-medium">{telemetry.routingReason}</span>
                    <span>•</span>
                    <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                      {telemetry.usage.totalTokens} tokens
                    </span>
                    <span>•</span>
                    <span className="text-gray-400">{telemetry.latencyMs}ms</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isChatting && (
          <div className="flex items-center gap-2 text-xs text-blue-600 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Router is selecting specialist and generating response...
          </div>
        )}
      </main>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            className="flex-1 border border-gray-300 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={input}
            placeholder="Ask for code, architecture advice, or general knowledge..."
            onChange={handleInputChange}
          />
          <button
            type="submit"
            disabled={isChatting}
            className="bg-slate-900 text-white px-6 py-3 rounded-full hover:bg-slate-800 transition disabled:opacity-50 text-sm font-medium"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;