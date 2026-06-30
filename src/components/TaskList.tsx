import { useState, FormEvent } from "react";
import { CheckCircle, Clock, Trash2, Plus, AlertCircle, CalendarDays, Filter } from "lucide-react";
import { Task } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface TaskListProps {
  tasks: Task[];
  onAddTask: (title: string, priority: 'urgent' | 'high' | 'medium' | 'low', dueTime: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

type FilterType = "all" | "pending" | "completed" | "urgent";

export default function TaskList({ tasks, onAddTask, onToggleTask, onDeleteTask }: TaskListProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>("medium");
  const [newDue, setNewDue] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask(newTitle.trim(), newPriority, newDue.trim());
    setNewTitle("");
    setNewDue("");
    setNewPriority("medium");
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "pending") return !t.completed;
    if (activeFilter === "completed") return t.completed;
    if (activeFilter === "urgent") return !t.completed && t.priority === "urgent";
    return true; // "all"
  });

  return (
    <div className="bg-[#14141C] border border-white/5 rounded-2xl p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-2 font-mono uppercase tracking-wider">
          <CalendarDays className="w-4 h-4 text-[#4ECDC4]" />
          Productivity Task Checklist
        </h3>
        <span className="text-[10px] font-mono bg-[#4ECDC4]/10 px-2 py-0.5 rounded text-[#4ECDC4] font-semibold">
          {tasks.filter(t => !t.completed).length} items remaining
        </span>
      </div>

      {/* Manual Task Creator */}
      <form onSubmit={handleSubmit} className="mt-3.5 space-y-2.5">
        <div className="flex gap-2">
          <input 
            type="text"
            placeholder="Add new task..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          <input 
            type="text"
            placeholder="Due (5 PM)"
            value={newDue}
            onChange={(e) => setNewDue(e.target.value)}
            className="w-20 bg-slate-950 border border-white/5 hover:border-white/10 rounded-xl px-2 py-2 text-xs text-center text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center justify-between gap-2 bg-slate-950/40 p-1.5 rounded-xl border border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-mono ml-1">Priority:</span>
            {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setNewPriority(p)}
                className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-lg font-mono border transition-all ${
                  newPriority === p 
                    ? p === 'urgent' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold'
                      : p === 'high' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold'
                      : p === 'medium' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 font-bold'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button 
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-semibold transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </form>

      {/* Task Filters */}
      <div className="flex items-center justify-between gap-1.5 mt-4 border-t border-b border-white/5 py-2">
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-slate-500" />
          <span className="text-[9px] uppercase font-mono text-slate-500 tracking-wider">Filters</span>
        </div>
        <div className="flex gap-1">
          {(["all", "pending", "completed", "urgent"] as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`text-[9px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all ${
                activeFilter === filter 
                  ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 font-bold" 
                  : "text-slate-500 hover:text-slate-300 bg-transparent"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Checklist list */}
      <div className="flex-1 overflow-y-auto mt-3.5 space-y-2 pr-1 max-h-[300px]">
        {filteredTasks.length === 0 ? (
          <div className="text-slate-500 text-center py-10 text-xs italic">
            Checklist is empty. Add a task above or ask LifeSaver AI to schedule items directly!
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredTasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="group bg-slate-950/70 hover:bg-slate-950 border border-white/5 hover:border-white/10 px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button 
                    onClick={() => onToggleTask(task.id)}
                    className={`w-4.5 h-4.5 shrink-0 rounded-lg border flex items-center justify-center transition-all ${
                      task.completed 
                        ? 'bg-[#4ECDC4]/10 border-[#4ECDC4]/30 text-[#4ECDC4]' 
                        : 'border-slate-800 hover:border-[#4ECDC4]'
                    }`}
                  >
                    {task.completed && <CheckCircle className="w-3.5 h-3.5" />}
                  </button>
                  <div className="min-w-0 pr-2">
                    <p className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[8px] font-bold font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        task.priority === "urgent" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        task.priority === "high" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        task.priority === "medium" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                        "bg-slate-800 text-slate-500"
                      }`}>
                        {task.priority}
                      </span>
                      {task.dueTime && (
                        <span className="text-[9px] text-[#FECA57] font-mono flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {task.dueTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onDeleteTask(task.id)}
                  className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-900 border border-transparent hover:border-white/10 rounded-lg"
                  title="Remove chore"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
