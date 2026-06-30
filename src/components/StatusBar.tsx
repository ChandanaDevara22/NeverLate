import { Sparkles, CheckCircle2, AlertCircle, Link } from "lucide-react";
import { Task } from "../types";

interface StatusBarProps {
  tasks: Task[];
  isAuthenticated: boolean;
  userName?: string;
}

export default function StatusBar({ tasks, isAuthenticated, userName }: StatusBarProps) {
  const activeTasks = tasks.filter((t) => !t.completed);
  const urgentTasks = activeTasks.filter((t) => t.priority === "urgent");

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 px-5 flex flex-wrap gap-4 items-center justify-between shadow-lg shadow-black/20">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
            ● AI Active
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800 hidden md:block" />

        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>{activeTasks.length} pending tasks</span>
        </div>

        {urgentTasks.length > 0 && (
          <>
            <div className="h-4 w-px bg-slate-800 hidden md:block" />
            <div className="flex items-center gap-1.5 text-xs text-rose-400 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{urgentTasks.length} urgent task{urgentTasks.length > 1 ? 's' : ''}</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider ${
          isAuthenticated 
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
        }`}>
          <Link className="w-3 h-3" />
          {isAuthenticated ? `Workspace Connected: ${userName || 'Active'}` : "Offline Mode"}
        </span>
      </div>
    </div>
  );
}
