import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, X, Bot, User, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

interface AIChatAssistantProps {
  onClose: () => void;
  isOpen: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ onClose, isOpen }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', content: 'Hola. Soy el asistente IA del plano de obra. ¿En qué te puedo ayudar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // AI Params
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);

  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Mock API call retaining the Google AI Studio style
    try {
      // In a real implementation this would call fetch('/api/chat', { ... })
      await new Promise(resolve => setTimeout(resolve, 2000));
      const modelMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        content: `Aquí tienes la respuesta simulada generada con Temperatura: ${temperature} y Max Tokens: ${maxTokens}.\n\n\`\`\`javascript\n// Soporte para bloques de código con scroll\nconst plano = { estado: "optimizado", ui: "limpia" };\nconsole.log("¡Hola desde Google AI Studio!");\n\`\`\``
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      // Mantener el input enfocado si estamos en desktop, en móvil el teclado lo maneja el OS
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`fixed z-[999] flex flex-col bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden ${
          isFullscreen 
            ? 'inset-0' 
            : 'bottom-4 right-4 sm:bottom-20 sm:right-6 w-full max-w-[400px] h-[600px] max-h-[85vh] rounded-2xl sm:w-[400px]'
        }`}
      >
        {/* Header */}
        <div className="bg-slate-950 p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base">Asistente Gemini</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">Google AI Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 sm:p-2.5 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded-xl transition active:scale-95"
              aria-label="Ajustes de Modelo"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hidden sm:flex p-2 sm:p-2.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition active:scale-95"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 sm:p-2.5 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-xl transition active:scale-95"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6 bg-slate-900 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className="shrink-0 pt-1">
                  {msg.role === 'user' ? (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                      <User className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 border border-purple-500 flex items-center justify-center text-white shadow-[0_0_10px_rgba(147,51,234,0.3)]">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                </div>
                
                {/* Bubble */}
                <div 
                  className={`p-3 sm:p-4 rounded-2xl text-[13px] sm:text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-sky-600 text-white rounded-tr-sm' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="prose prose-invert max-w-none prose-sm prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-pre:overflow-x-auto overflow-x-hidden">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-[85%] gap-2 sm:gap-3 flex-row">
                <div className="shrink-0 pt-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600/50 border border-purple-500/50 flex items-center justify-center text-white/50">
                    <Bot className="w-4 h-4" />
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-slate-800 border border-slate-700 rounded-tl-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Sticky Input Area */}
        <div className="bg-slate-950 p-2 sm:p-4 border-t border-slate-800 shrink-0 sticky bottom-0">
          <div className="relative flex items-end gap-2 bg-slate-900 border border-slate-700 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-purple-500/50 transition">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Pregunta sobre el plano..."
              className="flex-1 max-h-32 min-h-[44px] sm:min-h-[50px] bg-transparent border-none focus:ring-0 text-[13px] sm:text-sm text-slate-100 placeholder:text-slate-500 resize-none py-3 px-3 custom-scrollbar"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="mb-1 mr-1 min-w-[40px] min-h-[40px] sm:w-10 sm:h-10 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white flex items-center justify-center transition active:scale-90 shrink-0 shadow-sm"
              aria-label="Enviar Mensaje"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Settings Bottom Sheet Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSettingsOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10"
              />
              {/* Bottom Sheet */}
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 rounded-t-3xl z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
              >
                <div className="p-4 sm:p-5">
                  <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4" />
                  
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold text-slate-100 flex items-center gap-2 text-sm sm:text-base">
                      <Settings className="w-5 h-5 text-sky-400" />
                      Parámetros del Modelo
                    </h4>
                    <button 
                      onClick={() => setIsSettingsOpen(false)}
                      className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-5 mb-4">
                    {/* Temperature */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <label className="text-slate-300 font-bold">Temperatura (Creatividad)</label>
                        <span className="font-mono text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">{temperature}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="2" step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Preciso</span>
                        <span>Creativo</span>
                      </div>
                    </div>

                    {/* Max Tokens */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <label className="text-slate-300 font-bold">Max Output Tokens</label>
                        <span className="font-mono text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">{maxTokens}</span>
                      </div>
                      <input 
                        type="range" 
                        min="256" max="8192" step="256"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>256</span>
                        <span>8192</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-full min-h-[44px] sm:min-h-[48px] bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition active:scale-95 text-sm"
                  >
                    Guardar y Cerrar
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
