import { useChat } from '@ai-sdk/react';


function App() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
  // Vite sees this "/api" and redirects it to "http://localhost:5001/api"
  api: '/api/chat', 
});

const isChatting = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="p-4 border-b bg-white flex justify-between items-center">
        <h1 className="font-bold text-xl tracking-tight">MULTI<span className="text-blue-600">LLM</span></h1>
        <div className="flex gap-2">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Groq Online</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Gemini Online</span>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
              m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-800'
            }`}>
              <p className="text-sm">{m.content}</p>
            </div>
          </div>
        ))}
        {isChatting && <div className="text-xs text-gray-400 animate-pulse">Nexus Router is selecting specialist...</div>}
      </main>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            className="flex-1 border border-gray-300 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            placeholder="Ask for code, image analysis, or general help..."
            onChange={handleInputChange}
          />
          <button 
            type="submit" 
            disabled={isChatting}
            className="bg-slate-900 text-white px-6 py-3 rounded-full hover:bg-slate-800 transition disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;

