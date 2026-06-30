import { Lightbulb, ChevronRight, Mail, Calendar, HelpCircle } from "lucide-react";
import { Suggestion } from "../types";

interface SuggestionsProps {
  onSelectSuggestion: (query: string) => void;
}

export default function Suggestions({ onSelectSuggestion }: SuggestionsProps) {
  const customSuggestions: Suggestion[] = [
    {
      id: "s1",
      title: "Late Notice",
      description: "Running late? Prepare an instant draft update for your 10 am sync with Sarah.",
      actionLabel: "🚗 Try late update",
      type: "email",
      actionQuery: "I'm stuck in traffic and will be 15 minutes late for my 10 am meeting with Sarah"
    },
    {
      id: "s2",
      title: "Priority Scheduling",
      description: "Quickly schedule tomorrow's submit deadline for your progress report with high priority.",
      actionLabel: "📝 Remind to submit report",
      type: "task",
      actionQuery: "Remind me to submit the progress report by 5 PM today with high priority"
    },
    {
      id: "s3",
      title: "Delayed Update",
      description: "Let your team know a current workshop ran long and you will be 20 min late.",
      actionLabel: "⏳ meeting ran long",
      type: "prepare",
      actionQuery: "I'm delayed since my last meeting ran long, and I'll be 20 minutes late for thesync with Bob"
    }
  ];

  return (
    <div className="bg-[#14141C] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 hover:scale-[1.01] transition-all duration-300 shadow-lg h-full">
      <div>
        <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
            AI Smart Suggestions
          </span>
          <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-mono px-2 py-0.5 rounded">
            Proactive recommendations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3.5">
          {customSuggestions.map((s) => (
            <div 
              key={s.id} 
              className="bg-slate-950/40 hover:bg-slate-900 border border-white/5 hover:border-white/10 p-3.5 rounded-xl flex flex-col justify-between group transition-all duration-300 text-left cursor-pointer"
              onClick={() => s.actionQuery && onSelectSuggestion(s.actionQuery)}
            >
              <div>
                <div className="flex items-center gap-2">
                  {s.type === 'email' && <Mail className="w-3.5 h-3.5 text-cyan-400" />}
                  {s.type === 'task' && <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />}
                  {s.type === 'prepare' && <Calendar className="w-3.5 h-3.5 text-indigo-400" />}
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">{s.title}</h4>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  {s.description}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-medium text-indigo-400 font-mono group-hover:text-indigo-300">
                  {s.actionLabel}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
