import { Clock, AlertCircle } from "lucide-react";
import { Task } from "../types";

interface DeadlinesProps {
  tasks: Task[];
}

export default function Deadlines({ tasks }: DeadlinesProps) {
  // Filter pending tasks that have due times
  const deadlineTasks = tasks
    .filter((t) => !t.completed && t.dueTime)
    .slice(0, 3); // Get top 3

  return (
    <div className="bg-[#14141C] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 hover:scale-[1.02] transition-all duration-300 shadow-lg min-h-[160px]">
      <div>
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#FECA57]" />
            Upcoming Deadlines
          </span>
          <span className="text-[9px] bg-[#FECA57]/10 text-[#FECA57] font-mono px-1.5 py-0.5 rounded">
            Next 3
          </span>
        </div>

        <div className="mt-3.5 space-y-2.5">
          {deadlineTasks.length === 0 ? (
            <div className="text-slate-500 text-center py-4 text-[11px] leading-relaxed italic">
              No tasks with specified times in the backlog. Ask LifeSaver AI to add due times!
            </div>
          ) : (
            deadlineTasks.map((task) => (
              <div 
                key={task.id} 
                className="bg-slate-950/50 hover:bg-slate-900 border border-white/5 hover:border-white/10 rounded-xl p-2.5 px-3 flex items-center justify-between text-xs transition-colors"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-medium text-slate-200 truncate">{task.title}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      task.priority === "urgent" ? "bg-rose-500" :
                      task.priority === "high" ? "bg-amber-400" : "bg-cyan-500"
                    }`} />
                    Priority: {task.priority}
                  </p>
                </div>
                
                <div className="shrink-0 text-right">
                  <span className="text-[11px] text-[#FECA57] font-mono font-semibold bg-[#FECA57]/10 px-2 py-1 rounded-lg">
                    {task.dueTime}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
