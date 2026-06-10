import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ChatInterface({ onOpenDoc }) {
  const { id } = useParams();
  const isValidUuid = id && UUID_REGEX.test(id);

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      text: "Hello there. I'm connected to your secure pgvector RAG index. Ask me anything about your uploaded documents!"
    }
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [nerdMode, setNerdMode] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/v1/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: userMessage,
          document_uuid: isValidUuid ? id : null
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Network response was not ok');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: 'ai', 
        text: data.response,
        citations: data.citations && data.citations.length > 0 ? data.citations : null,
        debug_info: data.debug_info || null
      }]);
    } catch (error) {
      console.error('Error fetching chat response:', error);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: 'ai', 
        text: `<span class="text-red-400 font-medium">Error: ${error.message}</span>` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <section className="flex-1 flex flex-col h-full border-r border-white/5 bg-slate-950/20 backdrop-blur-md relative">
      <div className="px-6 py-4 border-b border-white/5 bg-slate-950/45 backdrop-blur-lg flex justify-between items-center h-16 shrink-0 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-white/90 hover:text-primary transition-colors cursor-default">Knowledge Hub Session</h2>
          <p className="text-[10px] font-mono text-primary tracking-wider uppercase">Live RAG Backend</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setNerdMode(!nerdMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-mono tracking-wide transition-all ${nerdMode ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(var(--color-primary),0.3)]' : 'bg-transparent border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'}`}
          >
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            NERD MODE
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : ''}`}>
            {msg.role === 'ai' ? (
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex-shrink-0 flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-primary text-[16px]">temp_preferences_custom</span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-900 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/5 shadow-sm">
                <img alt="User Avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDuHZUceW295uorNbKQMUS87GEci4uXnS_WXVedMETyTnQzHfmw6WDKly2IhqSa8D9TCW3s1g8wRHqtgAYwV5L2AxGpIAFp-4dsuZxlJpkuY9EgfMHgzsfUdj5IY4FfDcZrCGQco_W4lu9rkp7j0X72Lmj4_AB1ZancDIkCeHBLUuK_-SgDJsju7NhjkXLgXfkG_lspres15bMurtFYaHPFOQPKQsjX6rMjf3WPlaJuQLSpQAJSMa9HqL4PbVGk9gwsv4AJ2NbG4E2" />
              </div>
            )}
            
            <div className={`flex flex-col gap-2 ${msg.role === 'ai' ? 'w-full' : ''}`}>
              <div className={`border rounded-2xl p-4 text-[13px] shadow-sm leading-relaxed tracking-tight ${msg.role === 'ai' ? 'bg-slate-950/20 border-white/5 rounded-tl-sm text-slate-300 font-extralight' : 'bg-primary/10 border border-primary/20 text-white rounded-tr-sm font-extralight'}`}>
                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
              </div>
              
              {msg.citations && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {msg.citations.map((cite, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => onOpenDoc && onOpenDoc(cite.uuid)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/60 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-white/20 transition-all text-[11px] font-extralight group shadow-sm hover:shadow-md active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[14px] text-primary group-hover:scale-110 transition-transform">picture_as_pdf</span>
                      {cite.name}
                    </button>
                  ))}
                </div>
              )}
              
              {nerdMode && msg.debug_info && (
                <div className="mt-4 p-4 rounded-xl bg-black/80 border border-primary/30 font-mono text-[10px] text-green-400/80 shadow-inner w-full">
                  <div className="flex justify-between items-center border-b border-green-500/20 pb-2 mb-3">
                    <span className="flex items-center gap-2 text-green-500 font-bold uppercase tracking-widest"><span className="material-symbols-outlined text-[14px]">memory</span> RAG Backend Processing</span>
                    <span className="text-green-500/60 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">timer</span> LLM Time: {msg.debug_info.generation_time_ms}ms</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-white/60 mb-1 block uppercase">Vector Database Configuration</span>
                      <span>ALGORITHM = {msg.debug_info.algorithm || 'pgvector Cosine'}</span>
                    </div>

                    <div>
                      <span className="text-white/60 mb-2 block uppercase">Retrieved Vectors ({msg.debug_info.retrieved_chunks.length})</span>
                      {msg.debug_info.retrieved_chunks.map((chunk, idx) => (
                        <div key={idx} className="mb-2 pl-3 border-l border-green-500/30">
                          <div className="flex justify-between">
                            <span className="text-blue-400">File: {chunk.document_name} <span className="text-white/40 text-[9px] uppercase ml-2 bg-white/10 px-1 rounded">{chunk.source}</span></span>
                            <div className="flex gap-4">
                              <span className="text-slate-500">Dist: {chunk.raw_distance}</span>
                              <span className="text-green-400">RRF Score: {chunk.rrf_score}</span>
                            </div>
                          </div>
                          <div className="text-slate-400 mt-1 italic">"{chunk.text_preview}"</div>
                        </div>
                      ))}
                      {msg.debug_info.retrieved_chunks.length === 0 && (
                        <div className="text-red-400 italic block mt-2">No vectors met the semantic threshold requirement. The LLM was intentionally provided an empty context.</div>
                      )}
                    </div>

                    <div>
                      <span className="text-white/60 mb-1 block uppercase">Compiled System Prompt Preview</span>
                      <div className="whitespace-pre-wrap text-slate-500 pl-3 border-l border-slate-700 max-h-32 overflow-y-auto">
                        {msg.debug_info.system_prompt}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 max-w-[85%] opacity-60">
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex-shrink-0 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-primary text-[16px] animate-pulse">temp_preferences_custom</span>
            </div>
            <div className="bg-slate-950/50 border border-white/5 rounded-2xl rounded-tl-sm p-4 flex items-center gap-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{animationDelay: "0ms"}}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{animationDelay: "150ms"}}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{animationDelay: "300ms"}}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 pb-32 border-t border-white/5 bg-gradient-to-t from-slate-950/80 to-transparent relative z-10">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-2 focus-within:border-white/30 focus-within:bg-black/60 transition-all shadow-2xl">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm text-slate-200 placeholder:text-slate-500 min-h-[44px] max-h-[120px] py-3 px-2 font-extralight" 
              placeholder="Ask me anything about the document..." 
              rows="1"
            />
            <button type="submit" className="w-11 h-11 rounded-xl bg-white text-slate-950 flex items-center justify-center hover:bg-slate-200 transition-all flex-shrink-0 shadow-md active:scale-95 mb-0.5 icon-hover group">
              <span className="material-symbols-outlined text-[20px] group-hover:-translate-y-0.5 transition-transform" style={{fontVariationSettings: "'FILL' 1"}}>arrow_upward</span>
            </button>
          </form>
          <div className="flex justify-center gap-6 mt-4 text-slate-500">
            <span className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 opacity-60"><span className="material-symbols-outlined text-[13px]">lock</span> Private Session</span>
            <span className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 opacity-60"><span className="material-symbols-outlined text-[13px]">memory</span> Using Salt & Pepper v4.2</span>
          </div>
        </div>
      </div>
    </section>
  );
}
