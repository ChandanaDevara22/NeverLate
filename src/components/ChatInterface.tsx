import { useRef, useEffect } from "react";
import { Send, Sparkles, Mail, User } from "lucide-react";
import { Message, GoogleUser } from "../types";
import { motion } from "motion/react";

interface ChatInterfaceProps {
  messages: Message[];
  isTyping: boolean;
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: (textToSend?: string) => void;
  onDeployGmailDraft: (draftContext: any) => void;
  token: string | null;
  user: GoogleUser | null;
}

export default function ChatInterface({
  messages,
  isTyping,
  inputText,
  setInputText,
  onSendMessage,
  onDeployGmailDraft,
  token,
  user
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message or typing state change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div id="proactive-agent-chat" className="bg-[#111119]/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden h-[540px] shadow-2xl hover:shadow-[0_0_30px_rgba(108,92,231,0.1)] transition-all duration-500">
      {/* Active AI Status Bar */}
      <div className="bg-slate-950/60 px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-200 tracking-wider font-mono uppercase">
            Proactive Agent Engine
          </span>
        </div>
        <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/5 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-bold">
          Gemini 3.5 Flash
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              {isUser ? (
                user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt={user.name} 
                    referrerPolicy="no-referrer" 
                    className="w-8 h-8 rounded-full border border-indigo-500/30 object-cover shadow-sm shrink-0" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-tr from-[#6C5CE7] to-[#8E2DE2] text-white shadow-md">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )
              ) : (
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-tr from-[#6C5CE7] to-[#4ECDC4] text-white shadow-md shadow-indigo-500/10">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}

              <div className="space-y-1.5">
                <div className={`rounded-2xl px-4 py-2.5 text-xs inline-block leading-relaxed whitespace-pre-wrap shadow-sm ${
                  isUser 
                    ? "bg-[#6C5CE7]/15 text-slate-100 border border-[#6C5CE7]/30" 
                    : "bg-slate-900/80 text-slate-200 border border-white/5"
                }`}>
                  {msg.text}
                </div>

                {/* Direct Integrated late incident response card */}
                {msg.sender === "agent" && msg.actionType === "late_incident" && msg.lateContext && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="mt-2.5 bg-slate-950/60 rounded-xl p-4 border border-indigo-500/20 space-y-3.5 max-w-sm shadow-xl"
                  >
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono">
                        Workspace Draft Prepared
                      </h4>
                    </div>

                    <div className="space-y-1 text-[10px] leading-relaxed">
                      <p className="text-slate-400">To Recipient: <span className="text-slate-200 font-mono font-semibold">{msg.lateContext.draftPrepared?.to}</span></p>
                      <p className="text-slate-400">Subject: <span className="text-slate-200 font-semibold">{msg.lateContext.draftPrepared?.subject}</span></p>
                      <p className="text-slate-400">Suggested Adjustment: <span className="text-[#FECA57] font-semibold">{msg.lateContext.suggestedNewTime}</span></p>
                    </div>

                    <div className="bg-slate-900/90 rounded-lg p-3 border border-white/5 text-[10px] text-slate-300 font-sans italic leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {msg.lateContext.draftPrepared?.body}
                    </div>

                    {token ? (
                      <button
                        onClick={() => onDeployGmailDraft(msg.lateContext)}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl hover:shadow-[0_0_15px_rgba(108,92,231,0.3)] shadow-lg active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Push Draft to Gmail Account
                      </button>
                    ) : (
                      <div className="text-[9px] text-center text-amber-400 p-2.5 bg-amber-400/5 rounded-lg border border-amber-400/10 font-mono leading-normal">
                        Authorize Google workspace to write drafts directly
                      </div>
                    )}
                  </motion.div>
                )}

                {msg.sender === "agent" && msg.actionType === "create_task" && msg.taskDetails && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5 flex items-center justify-between text-xs max-w-xs shadow-md"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">{msg.taskDetails.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {msg.taskDetails.dueTime ? `Due at ${msg.taskDetails.dueTime}` : "No time specified"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono bg-emerald-400/10 text-emerald-400 px-2.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider font-bold">
                      {msg.taskDetails.priority || 'medium'}
                    </span>
                  </motion.div>
                )}

                <span className="text-[9px] text-slate-500 block font-mono pl-1">
                  {msg.timestamp}
                </span>
              </div>
            </motion.div>
          );
        })}

        {isTyping && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-tr from-[#6C5CE7] to-[#4ECDC4] text-white shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl px-4 py-3 text-xs flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input container with luxury focusing shadows */}
      <div className="p-4 bg-slate-950/80 border-t border-white/5">
        <div className="flex gap-2 bg-slate-900 border border-white/5 hover:border-white/10 rounded-xl p-1.5 focus-within:ring-1 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50 focus-within:shadow-[0_0_20px_rgba(108,92,231,0.15)] transition-all duration-300">
          <input 
            type="text"
            placeholder="I'm stuck in traffic and will be 15 mins late..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
            className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
          />
          <button 
            onClick={() => onSendMessage()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/20 p-2 rounded-lg hover:shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
