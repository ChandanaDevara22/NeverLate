import { CalendarDays, CheckCircle, Sparkles } from "lucide-react";
import { CalendarEvent } from "../types";
import { formatTime } from "../services/google";

interface MiniCalendarProps {
  events: CalendarEvent[];
  isAuthenticated: boolean;
}

export default function MiniCalendar({ events, isAuthenticated }: MiniCalendarProps) {
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Get today's local day index (Monday = 0, Sunday = 6)
  const todayDate = new Date();
  let todayDayIndex = todayDate.getDay() - 1; // 0 for Monday, etc.
  if (todayDayIndex < 0) todayDayIndex = 6; // Sunday

  const currentMonthName = todayDate.toLocaleString('default', { month: 'long' });

  // Generate week's day numbers around today
  const startOfWeek = new Date(todayDate);
  startOfWeek.setDate(todayDate.getDate() - todayDayIndex);

  const weekDates = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + idx);
    return {
      dayName: daysOfWeek[idx],
      dayNum: d.getDate(),
      isToday: d.toDateString() === todayDate.toDateString(),
    };
  });

  return (
    <div className="bg-[#14141C] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 hover:scale-[1.02] transition-all duration-300 shadow-lg h-full min-h-[360px]">
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 font-bold">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
            Weekly Planner & Syncs
          </span>
          <span className="text-[10px] text-indigo-300 font-mono font-semibold">
            {currentMonthName} {todayDate.getFullYear()}
          </span>
        </div>

        {/* Calendar Week view */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekDates.map((day, idx) => (
            <div 
              key={idx} 
              className={`p-1.5 py-2.5 rounded-xl flex flex-col justify-between items-center ${
                day.isToday 
                  ? "bg-gradient-to-tr from-indigo-600/35 to-cyan-500/10 border border-indigo-500/40 text-white font-bold" 
                  : "bg-slate-950/20 text-slate-400 hover:bg-slate-900 border border-transparent transition-colors"
              }`}
            >
              <span className="text-[8px] uppercase tracking-tight text-slate-500 font-mono">{day.dayName.substring(0, 3)}</span>
              <span className={`text-xs mt-1 block font-mono ${day.isToday ? 'text-indigo-400 scale-105' : 'text-slate-300'}`}>
                {day.dayNum}
              </span>
              {day.isToday && (
                <span className="w-1 h-1 bg-indigo-400 rounded-full mt-1 animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Schedule List */}
        <div className="space-y-2 pt-2.5 border-t border-white/5">
          <div className="flex items-center justify-between">
            <h4 className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">Today's Schedule</h4>
            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
              isAuthenticated 
                ? "bg-emerald-500/10 text-emerald-400" 
                : "bg-indigo-500/10 text-indigo-400 font-bold animate-pulse"
            }`}>
              {isAuthenticated ? "Live Google Calendar" : "Sandbox Demo Active"}
            </span>
          </div>

          <div className="space-y-2 max-h-[170px] overflow-y-auto pr-0.5 scrollbar-thin">
            {events.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic text-center py-4">
                No meetings scheduled for today.
              </p>
            ) : (
              events.map((evt) => {
                return (
                  <div 
                    key={evt.id} 
                    className="bg-slate-950/50 border border-white/5 hover:border-white/10 p-2 rounded-xl transition-all hover:bg-slate-950 flex flex-col gap-1 text-left"
                  >
                    <div className="flex justify-between items-start gap-1.5">
                      <span className="font-semibold text-slate-200 text-xs truncate max-w-[130px]" title={evt.summary}>
                        {evt.summary}
                      </span>
                      <span className="text-[9px] text-[#FECA57] font-mono shrink-0 bg-[#FECA57]/10 px-1.5 py-0.5 rounded-md font-semibold">
                        {evt.start?.dateTime ? formatTime(evt.start.dateTime) : "All Day"}
                      </span>
                    </div>
                    {evt.description && (
                      <p className="text-[10px] text-slate-500 truncate" title={evt.description}>
                        {evt.description}
                      </p>
                    )}
                    {evt.attendees && evt.attendees.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center mt-0.5">
                        <span className="text-[8px] text-slate-600 font-mono">With:</span>
                        {evt.attendees.map((att, idx) => (
                          <span 
                            key={idx} 
                            className="text-[8px] px-1 bg-white/5 rounded text-slate-400 font-medium font-mono"
                          >
                            {att.displayName || att.email?.split('@')[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
