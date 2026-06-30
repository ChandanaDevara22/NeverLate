import { CheckCircle2, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import { Task, CalendarEvent } from "../types";

interface QuickStatsProps {
  tasks: Task[];
  events: CalendarEvent[];
}

export default function QuickStats({ tasks, events }: QuickStatsProps) {
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const urgentTasksCount = tasks.filter((t) => !t.completed && t.priority === "urgent").length;
  const todayMeetingsCount = events.length;

  const taskCompletionRate = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3 shrink-0">
      {/* Stat 1: Tasks Check */}
      <div className="bg-[#14141C] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between hover:border-white/10 hover:scale-[1.02] transition-all duration-300 group shadow-lg">
        <div className="flex justify-between items-start">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Checklist</span>
          <div className="bg-indigo-500/10 p-2 rounded-xl group-hover:bg-indigo-500/20 transition-colors">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tracking-tight">{completedTasksCount}</span>
            <span className="text-xs text-slate-500">/ {totalTasksCount} done</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${taskCompletionRate}%` }}
            />
          </div>
          <p className="text-[10px] text-indigo-300 mt-1.5 font-mono">{taskCompletionRate}% completed</p>
        </div>
      </div>

      {/* Stat 2: Calendar Meetings */}
      <div className="bg-[#14141C] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between hover:border-white/10 hover:scale-[1.02] transition-all duration-300 group shadow-lg">
        <div className="flex justify-between items-start">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Today's Syncs</span>
          <div className="bg-emerald-500/10 p-2 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
            <Calendar className="w-4 h-4 text-[#4ECDC4]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tracking-tight">{todayMeetingsCount}</span>
            <span className="text-xs text-slate-500">meetings</span>
          </div>
          <p className="text-[10px] text-emerald-400 mt-3 font-mono">
            {todayMeetingsCount > 0 ? "⚡ Events loaded" : "No conflicts yet"}
          </p>
        </div>
      </div>

      {/* Stat 3: Urgent Items */}
      <div className="bg-[#14141C] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between hover:border-white/10 hover:scale-[1.02] transition-all duration-300 group shadow-lg col-span-2">
        <div className="flex justify-between items-start">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">High Priority Alert</span>
          <div className="bg-rose-500/10 p-2 rounded-xl group-hover:bg-rose-500/20 transition-colors">
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-white tracking-tight">{urgentTasksCount}</span>
            <span className="text-xs text-slate-400 ml-1.5">unresolved urgent items</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${
            urgentTasksCount > 0 
              ? "bg-rose-500/10 text-rose-400 animate-bounce" 
              : "bg-slate-800 text-slate-400"
          }`}>
            {urgentTasksCount > 0 ? "Needs Review" : "Secure"}
          </span>
        </div>
      </div>
    </div>
  );
}
