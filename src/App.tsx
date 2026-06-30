import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Settings, 
  LogOut, 
  User as UserIcon, 
  AlertCircle,
  HelpCircle,
  Bell,
  ChevronDown,
  Zap,
  Calendar,
  Mail,
  CheckSquare,
  Lock,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Task, Message, CalendarEvent, GoogleUser } from "./types";
import { 
  fetchTodayEvents, 
  findMatchingEvents, 
  createGmailDraft, 
  suggestNewMeetingTime,
  getMockTodayEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  parseDueTimeToDate
} from "./services/google";

import StatusBar from "./components/StatusBar";
import QuickStats from "./components/QuickStats";
import Deadlines from "./components/Deadlines";
import MiniCalendar from "./components/MiniCalendar";
import Suggestions from "./components/Suggestions";
import TaskList from "./components/TaskList";
import ChatInterface from "./components/ChatInterface";

const isTokenExpired = (token: string): boolean => {
  try {
    // 1. Try to check if it is a standard JWT
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        return Date.now() >= payload.exp * 1000;
      }
    }
  } catch (e) {
    // Fail-safe, continue to fallback check
  }

  // 2. Fall back to checking localStorage token timestamp (for Google implicit access token)
  const tokenTimeStr = localStorage.getItem("googleTokenTime");
  if (tokenTimeStr) {
    const tokenTime = parseInt(tokenTimeStr, 10);
    if (!isNaN(tokenTime)) {
      const elapsedTime = Date.now() - tokenTime;
      // Google access tokens expire in 1 hour (3600000 ms)
      return elapsedTime >= 3600000;
    }
  }
  return false;
};

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("googleToken") || null;
  });
  const [user, setUser] = useState<GoogleUser | null>(() => {
    const saved = localStorage.getItem("googleUser");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  
  // Demo Mode states
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return localStorage.getItem("lifesaver_demo_mode") === "true";
  });
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Custom temporary Client ID for playing around
  const [customClientId, setCustomClientId] = useState(() => {
    return localStorage.getItem("lifesaver_custom_client_id") || "";
  });
  const [showSettings, setShowSettings] = useState(false);

  // Diagnostic states for connection testing
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const [gmailTestResult, setGmailTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Core application states
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "agent",
      text: "Hello! I'm LifeSaver AI, your proactive productivity partner. I assist you in planning, prioritizing, and completing tasks before deadlines are missed. I can automatically detect when you are delayed, find corresponding Google Calendar events, and prepare draft emails in Gmail, as well as prioritize your personal checklist items.\n\nTry telling me: 'I'm stuck in traffic and will be 15 minutes late for my 10 am meeting with Sarah' or 'Remind me to submit the progress report by 5 PM today with high priority'.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Local Task tracker (isolated by Google/Demo account email)
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedUser = localStorage.getItem("googleUser");
    let email = "";
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        email = parsed?.email || "";
      } catch {}
    }
    const storageKey = email ? `lifesaver_tasks_${email}` : "lifesaver_tasks";
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [
      { id: "1", title: "Review quarterly marketing brief", priority: "high", dueTime: "2:00 PM", completed: false, createdAt: new Date().toISOString() },
      { id: "2", title: "Finalize team presentation slides", priority: "urgent", dueTime: "5:00 PM", completed: false, createdAt: new Date().toISOString() },
      { id: "3", title: "Schedule follow-up discussion with John", priority: "medium", dueTime: "11:00 AM", completed: true, createdAt: new Date().toISOString() },
    ];
  });

  // Calendar Events (initialized with high-quality relative mock events for sandboxed demo)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(getMockTodayEvents());
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Check token expiration before making API calls
  const checkToken = () => {
    const currentToken = localStorage.getItem("googleToken") || token;
    if (!currentToken) return false;
    if (isTokenExpired(currentToken)) {
      localStorage.removeItem("googleToken");
      localStorage.removeItem("googleUser");
      localStorage.removeItem("googleTokenTime");
      setToken(null);
      setUser(null);
      setCalendarEvents(getMockTodayEvents());
      setTasks([
        { id: "1", title: "Review quarterly marketing brief", priority: "high", dueTime: "2:00 PM", completed: false, createdAt: new Date().toISOString() },
        { id: "2", title: "Finalize team presentation slides", priority: "urgent", dueTime: "5:00 PM", completed: false, createdAt: new Date().toISOString() },
        { id: "3", title: "Schedule follow-up discussion with John", priority: "medium", dueTime: "11:00 AM", completed: true, createdAt: new Date().toISOString() },
      ]);
      alert("Your session has expired. Please login again.");
      return false;
    }
    return true;
  };

  // Save tasks to local storage
  useEffect(() => {
    if (user?.email) {
      localStorage.setItem(`lifesaver_tasks_${user.email}`, JSON.stringify(tasks));
    } else {
      localStorage.setItem("lifesaver_tasks", JSON.stringify(tasks));
    }
  }, [tasks, user]);

  // Handle Google OAuth implicit hash redirects
  useEffect(() => {
    const parseUrlHash = () => {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        if (accessToken) {
          localStorage.setItem("googleTokenTime", Date.now().toString());
          if (window.opener) {
            window.opener.postMessage({ type: "oauth_token", accessToken }, window.location.origin);
            window.close();
          } else {
            setToken(accessToken);
            fetchUserProfile(accessToken);
            window.history.replaceState(null, "", "/");
          }
        }
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "oauth_token") {
        const { accessToken } = event.data;
        if (accessToken) {
          localStorage.setItem("googleTokenTime", Date.now().toString());
          setToken(accessToken);
          fetchUserProfile(accessToken);
        }
      }
    };

    parseUrlHash();
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Synchronize Google OAuth Token and Session with localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem("googleToken", token);
    } else {
      localStorage.removeItem("googleToken");
      localStorage.removeItem("googleUser");
      localStorage.removeItem("googleTokenTime");
    }
  }, [token]);

  // Fetch calendar events automatically on auth change
  useEffect(() => {
    if (token) {
      loadCalendarEvents();
    }
  }, [token]);

  const loadCalendarEvents = async () => {
    if (!checkToken()) return;
    setIsLoadingEvents(true);
    try {
      const events = await fetchTodayEvents(token!);
      setCalendarEvents(events || []);
    } catch (err: any) {
      console.error("Failed to load today's calendar events from Google:", err);
      if (err?.status === 401 || err?.message?.includes("401") || err?.message?.includes("expired")) {
        localStorage.removeItem("googleToken");
        localStorage.removeItem("googleUser");
        localStorage.removeItem("googleTokenTime");
        setToken(null);
        setUser(null);
        setCalendarEvents(getMockTodayEvents());
        setTasks([
          { id: "1", title: "Review quarterly marketing brief", priority: "high", dueTime: "2:00 PM", completed: false, createdAt: new Date().toISOString() },
          { id: "2", title: "Finalize team presentation slides", priority: "urgent", dueTime: "5:00 PM", completed: false, createdAt: new Date().toISOString() },
          { id: "3", title: "Schedule follow-up discussion with John", priority: "medium", dueTime: "11:00 AM", completed: true, createdAt: new Date().toISOString() },
        ]);
        alert("Your session has expired. Please login again.");
      } else {
        setCalendarEvents([]);
      }
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const fetchUserProfile = async (accessToken: string) => {
    setIsLoadingUser(true);
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const userObj = {
          name: data.name,
          email: data.email,
          picture: data.picture
        };
        setUser(userObj);
        localStorage.setItem("googleUser", JSON.stringify(userObj));

        // Load tasks for this specific user
        const userEmail = data.email;
        const savedTasks = localStorage.getItem(`lifesaver_tasks_${userEmail}`);
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        } else {
          setTasks([]);
        }
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleOAuthLogin = () => {
    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || customClientId;
    if (!clientId) {
      setShowSettings(true);
      alert("Please provide a valid Google Client ID first! Add it in the top settings panel.");
      return;
    }

    const authUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email"
    ];
    const redirectUri = (import.meta as any).env.VITE_REDIRECT_URI || "https://lifesaver-ai-668871225970.asia-southeast1.run.app/oauth2callback";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: scopes.join(" "),
      prompt: "select_account"
    });

    const width = 500;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      `${authUrl}?${params.toString()}`,
      "GoogleLogin",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      window.location.href = `${authUrl}?${params.toString()}`;
    }
  };

  const handleLogout = () => {
    // Save tasks for current user before logout
    if (user?.email && tasks.length > 0) {
      localStorage.setItem(`lifesaver_tasks_${user.email}`, JSON.stringify(tasks));
    }
    setToken(null);
    setUser(null);
    setCalendarEvents(getMockTodayEvents()); // Reset to default mock events
    setTasks([
      { id: "1", title: "Review quarterly marketing brief", priority: "high", dueTime: "2:00 PM", completed: false, createdAt: new Date().toISOString() },
      { id: "2", title: "Finalize team presentation slides", priority: "urgent", dueTime: "5:00 PM", completed: false, createdAt: new Date().toISOString() },
      { id: "3", title: "Schedule follow-up discussion with John", priority: "medium", dueTime: "11:00 AM", completed: true, createdAt: new Date().toISOString() },
    ]);
    localStorage.removeItem("googleToken");
    localStorage.removeItem("googleUser");
    localStorage.removeItem("googleTokenTime");
    setIsDemo(false);
    localStorage.removeItem("lifesaver_demo_mode");
  };

  const handleTryDemoMode = () => {
    setIsDemo(true);
    localStorage.setItem("lifesaver_demo_mode", "true");
    
    const guestUser = {
      name: "Demo Guest",
      email: "guest@lifesaver.ai",
      picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
    };
    setUser(guestUser);
    localStorage.setItem("googleUser", JSON.stringify(guestUser));

    // Load tasks for guest
    const savedTasks = localStorage.getItem(`lifesaver_tasks_guest@lifesaver.ai`);
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    } else {
      setTasks([
        { id: "1", title: "Review quarterly marketing brief", priority: "high", dueTime: "2:00 PM", completed: false, createdAt: new Date().toISOString() },
        { id: "2", title: "Finalize team presentation slides", priority: "urgent", dueTime: "5:00 PM", completed: false, createdAt: new Date().toISOString() },
        { id: "3", title: "Schedule follow-up discussion with John", priority: "medium", dueTime: "11:00 AM", completed: true, createdAt: new Date().toISOString() },
      ]);
    }

    // Clear any previous messages to keep it fresh
    setMessages([
      {
        id: "welcome-demo",
        sender: "agent",
        text: "⚡ Welcome to **Demo Mode Sandbox**! I have initialized your dashboard with high-quality mock calendar events and a guest profile.\n\nYou can ask me tasks or simulate delayed updates like: *'I am running 15 minutes late for my Sarah sync'* or *'Set a high priority deadline to review marketing brief by 4 PM'*.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  const handleSaveCustomClientId = (val: string) => {
    setCustomClientId(val);
    localStorage.setItem("lifesaver_custom_client_id", val);
  };

  // Submit chat queries to Express server & run workspace intelligence checks
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    if (!textToSend) setInputText("");

    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          localTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        })
      });

      if (!res.ok) {
        throw new Error("Chat service did not respond correctly");
      }

      const parsedResponse = await res.json();
      const agentMsgId = `agent-${Date.now()}`;

      if (parsedResponse.type === "create_task") {
        const { title, description, priority, dueTime } = parsedResponse.taskDetails || { 
          title: "New Task", 
          description: "", 
          priority: "medium", 
          dueTime: null 
        };
        
        let calendarEventId: string | undefined = undefined;
        if (token && checkToken() && dueTime) {
          try {
            const result = await createCalendarEvent(token, title, dueTime, description);
            calendarEventId = result.id;
            loadCalendarEvents();
          } catch (err: any) {
            console.error("Google Calendar Event creation failed from chat:", err);
          }
        }

        const createdTask: Task = {
          id: `task-${Date.now()}`,
          title,
          description,
          priority: priority || "medium",
          dueTime,
          completed: false,
          createdAt: new Date().toISOString(),
          calendarEventId
        };
        setTasks(prev => [createdTask, ...prev]);

        setMessages(prev => [...prev, {
          id: agentMsgId,
          sender: "agent",
          text: parsedResponse.response,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionType: "create_task",
          taskDetails: { title, description, priority, dueTime }
        }]);

      } else if (parsedResponse.type === "late_incident") {
        const { name, offsetMinutes, reason, timeIndicator } = parsedResponse.lateDetails || {
          name: "Organizer", offsetMinutes: 15, reason: "delay", timeIndicator: null
        };

        let messageText = parsedResponse.response;
        let matchedEvents: CalendarEvent[] = [];
        let draftEmailTo = "contact@example.com";
        let resolvedClientMessage = "";
        let proposedStart = `${offsetMinutes} mins shift`;
        let draftSubject = `Running late for our meeting`;
        let draftBody = `Hi ${name || "there"},\n\nI wanted to let you know that I am running about ${offsetMinutes} minutes late for our sync today due to ${reason || "some unexpected delays"}.\n\nApologies for the delay! Let me know if we should reschedule to a bit later today.`;

        // FIXED: Better error handling and real calendar search
if (token && checkToken()) {
  try {
    console.log("🔍 Fetching real calendar events for 'I'm late'...");
    const freshEvents = await fetchTodayEvents(token);
    console.log(`✅ Found ${freshEvents.length} calendar events today`);
    setCalendarEvents(freshEvents || []);

    // Search for matching events
    const matchRes = findMatchingEvents(freshEvents || [], name, timeIndicator);
    matchedEvents = matchRes.matchedEvents;
    draftEmailTo = matchRes.autoDraftToEmail || draftEmailTo;

    if (matchedEvents.length > 0) {
      console.log(`✅ Found ${matchedEvents.length} matching events for "${name}"`);
      const targetEvent = matchedEvents[0];
      const times = suggestNewMeetingTime(targetEvent, offsetMinutes);
      proposedStart = times.proposedStart;
      resolvedClientMessage = `✅ Found meeting "${targetEvent.summary}" scheduled for today starting at ${times.originalStart}. Preparing an email notification for ${name}...`;
      
      draftSubject = `Running ${offsetMinutes} mins late for our meeting: ${targetEvent.summary}`;
      draftBody = `Hi ${name || "there"},\n\nI am running about ${offsetMinutes} minutes late for our meeting "${targetEvent.summary}" scheduled for ${times.originalStart} due to ${reason || "some unexpected delays"}.\n\nApologies for the inconvenience. Would you be open to adjusting our starting time to ${proposedStart} instead?\n\nBest,`;
    } else {
      console.warn(`⚠️ No matching meeting found for "${name}" at "${timeIndicator}"`);
      resolvedClientMessage = `🔍 No matching meeting with "${name || 'Sarah'}" starting around ${timeIndicator || 'today'} was found in your Google Calendar. You can still create a manual notification draft below:`;
    }

  } catch (calError: any) {
  console.error("❌ Live calendar fetch failed:", calError);
  
  // Instead of showing an error, try to create a manual notification
  const manualName = name || "there";
  resolvedClientMessage = `📧 I couldn't find a specific meeting with "${manualName}" in your calendar. However, I've prepared a draft email you can review and send manually.`;
  
  // Update draft details for manual notification
  draftSubject = `Running ${offsetMinutes} mins late`;
  draftBody = `Hi ${manualName},\n\nI am running about ${offsetMinutes} minutes late today due to ${reason || "some unexpected delays"}.\n\nApologies for the inconvenience. I'll be there as soon as possible.\n\nBest,`;
}
}else {
          // No Google token, use mock sandbox events for demonstration!
          const eventsToUse = calendarEvents.length > 0 ? calendarEvents : getMockTodayEvents();
          const matchRes = findMatchingEvents(eventsToUse, name, timeIndicator);
          matchedEvents = matchRes.matchedEvents;
          draftEmailTo = matchRes.autoDraftToEmail || draftEmailTo;

          if (matchedEvents.length > 0) {
            const targetEvent = matchedEvents[0];
            const times = suggestNewMeetingTime(targetEvent, offsetMinutes);
            proposedStart = times.proposedStart;
            resolvedClientMessage = `✨ [Sandbox Active] Matched meeting "${targetEvent.summary}" at ${times.originalStart} in your sandbox calendar. You can connect your Google account above to sync real-time calendar meetings. Draft prepared for ${name}:`;
            
            draftSubject = `Running ${offsetMinutes} mins late for our meeting: ${targetEvent.summary}`;
            draftBody = `Hi ${name || "there"},\n\nI am running about ${offsetMinutes} minutes late for our meeting "${targetEvent.summary}" scheduled for ${times.originalStart} due to ${reason || "some unexpected delays"}.\n\nApologies for the inconvenience. Would you be open to adjusting our starting time to ${proposedStart} instead?\n\nBest,`;
          } else {
            resolvedClientMessage = `⚠️ [Sandbox Active] No active meeting with "${name}" was found in your sandbox calendar today. Connect your Google account or check details. Preparing manual update notification:`;
          }
        }

        setMessages(prev => [...prev, {
          id: agentMsgId,
          sender: "agent",
          text: `${messageText}\n\n${resolvedClientMessage}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actionType: "late_incident",
          lateContext: {
            name,
            offsetMinutes,
            reason,
            timeIndicator,
            matchingEvents: matchedEvents,
            draftPrepared: {
              to: draftEmailTo,
              subject: draftSubject,
              body: draftBody
            },
            suggestedNewTime: proposedStart
          }
        }]);

      } else {
        setMessages(prev => [...prev, {
          id: agentMsgId,
          sender: "agent",
          text: parsedResponse.response,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }]);
      }

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: `agent-error-${Date.now()}`,
        sender: "agent",
        text: `Error: Unable to connect to the LifeSaver AI agent backend. Please check if your dev server has compiled successfully. (${err.message})`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAddTask = async (title: string, priority: 'urgent' | 'high' | 'medium' | 'low', dueTime: string) => {
    let calendarEventId: string | undefined = undefined;

    // FIXED: Better date parsing and error handling
if (token && checkToken() && dueTime) {
  try {
    console.log(`📅 Creating calendar event: "${title}" at "${dueTime}"`);
    
    // Parse the due time properly
    const parsedDate = parseDueTimeToDate(dueTime);
    if (!parsedDate) {
      console.warn(`⚠️ Could not parse dueTime: "${dueTime}", skipping calendar creation`);
    } else {
      const result = await createCalendarEvent(token, title, dueTime);
      calendarEventId = result.id;
      console.log(`✅ Calendar event created! ID: ${calendarEventId}`);
      
      // Reload calendar events to show the new event
      await loadCalendarEvents();
      
      // Add a success message
      setMessages(prev => [...prev, {
        id: `calendar-success-${Date.now()}`,
        sender: "agent",
        text: `📅 I've also added this task to your Google Calendar for ${dueTime}!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }]);
    }
  } catch (err: any) {
    console.error("❌ Google Calendar Event creation failed:", err);
    // Don't show error to user - just log it
  }
}

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      priority,
      dueTime: dueTime || null,
      completed: false,
      createdAt: new Date().toISOString(),
      calendarEventId
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = async (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (token && checkToken() && taskToDelete?.calendarEventId) {
      try {
        await deleteCalendarEvent(token, taskToDelete.calendarEventId);
        loadCalendarEvents();
      } catch (err) {
        console.error("Failed to delete Google Calendar Event:", err);
      }
    }
    setTasks(prev => prev.filter(t => t.id !== id));
  };

 // App.tsx - Update handleDeployGmailDraft

const handleDeployGmailDraft = async (draftContext: any) => {
  // Check if we have a token
  if (!token || !checkToken()) {
    alert("⚠️ Please sign in with Google first to create Gmail drafts.");
    return;
  }
  
  if (!draftContext) {
    alert("⚠️ No draft content to send.");
    return;
  }

  const to = draftContext.draftPrepared?.to || "recipient@example.com";
  const subject = draftContext.draftPrepared?.subject || "Running late";
  const body = draftContext.draftPrepared?.body || "I'm running late. Apologies!";

  // Check if we're using a placeholder email
  const isPlaceholder = to.includes('example.com') || to === 'contact@example.com';
  
  let recipientDisplay = to;
  if (isPlaceholder) {
    recipientDisplay = `⚠️ ${to} (This is a placeholder - add real email in settings)`;
  }

  // Confirmation dialog
  const userConfirmed = window.confirm(
    `📧 SEND DRAFT TO GMAIL:\n\n` +
    `Recipient: ${recipientDisplay}\n` +
    `Subject: ${subject}\n\n` +
    `${isPlaceholder ? '⚠️ You are using a placeholder email address. The draft will still be saved to Gmail.\n\n' : ''}` +
    `Would you like to save this as a draft in your Gmail account?`
  );
  
  if (!userConfirmed) return;

  try {
    const result = await createGmailDraft(token, to, subject, body);
    
    setMessages(prev => [...prev, {
      id: `agent-draft-success-${Date.now()}`,
      sender: "agent",
      text: `✅ Gmail draft created successfully!\n\n📧 To: **${to}**\n📝 Subject: **${subject}**\n📎 Draft ID: **${result.draftId}**\n\nYou can find it in your Gmail drafts folder.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }]);

    alert(`✅ Gmail draft saved successfully!\n\nYou can find it in your Gmail drafts folder.`);
  } catch (err: any) {
    console.error("❌ Gmail draft creation failed:", err);
    
    // Show more helpful error
    let errorMsg = err.message || "Unknown error";
    if (errorMsg.includes('403')) {
      errorMsg = "Permission denied. Please check your Gmail API scopes.";
    } else if (errorMsg.includes('401')) {
      errorMsg = "Authentication expired. Please re-login to Google.";
    }
    
    alert(`❌ Failed to create Gmail draft: ${errorMsg}`);
  }
};

  const handleTestGmailConnection = async () => {
    if (!token) {
      alert("⚠️ Please connect your Google account first!");
      return;
    }
    setIsTestingGmail(true);
    setGmailTestResult(null);
    try {
      console.log("🧪 Diagnosing Gmail API integration...");
      const testEmail = user?.email || "recipient@example.com";
      const subject = `Test Draft from LifeSaver AI (${new Date().toLocaleTimeString()})`;
      const body = "This is an automated test draft generated from the LifeSaver AI diagnostics console to verify Gmail API integration and OAuth scopes.";
      
      const result = await createGmailDraft(token, testEmail, subject, body);
      console.log("✅ Gmail API integration verified! Created test draft:", result);
      setGmailTestResult({
        success: true,
        message: `✅ Gmail API connection verified!\n\nCreated draft successfully.\n📧 Recipient: ${testEmail}\n📎 Draft ID: ${result.draftId}`
      });
    } catch (err: any) {
      console.error("❌ Gmail API connection test failed:", err);
      setGmailTestResult({
        success: false,
        message: `❌ Gmail API error: ${err.message || err}`
      });
    } finally {
      setIsTestingGmail(false);
    }
  };

  // Expose diagnostic functions on window for easy browser console debugging as requested
  useEffect(() => {
    (window as any).testGmailDirect = async () => {
      console.log("🚀 Testing Gmail API directly...");
      const savedToken = localStorage.getItem('googleToken') || token;
      if (!savedToken) {
        console.error("❌ No token found. Please sign in first.");
        return { success: false, error: "No token found" };
      }
      try {
        const testEmail = user?.email || "test@example.com";
        const res = await createGmailDraft(
          savedToken,
          testEmail,
          "Test Draft from Console",
          "This is a test draft created from the browser console via testGmailDirect."
        );
        console.log("✅ Success! Created Gmail draft successfully:", res);
        return { success: true, ...res };
      } catch (err: any) {
        console.error("❌ Gmail API direct test failed:", err);
        return { success: false, error: err.message || err };
      }
    };
  }, [token, user]);

  const handleSelectSuggestion = (query: string) => {
    handleSendMessage(query);
  };

  if (!token && !isDemo) {
    return (
      <div className="min-h-screen bg-[#07070C] flex flex-col items-center justify-between relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
        
        {/* Absolute Glow effects behind landing page content */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#6C5CE7]/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-[#4ECDC4]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none rotate-45" />

        {/* Landing Top Logo Header */}
        <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-[#6C5CE7] to-[#4ECDC4] rounded-xl p-2 shadow-lg shadow-indigo-500/15 animate-pulse">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">LifeSaver AI</span>
              <span className="text-[9px] font-mono block text-indigo-400 font-bold tracking-wider leading-none">v1.2 SaaS Edition</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleTryDemoMode}
              className="text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 px-3.5 py-1.5 rounded-lg border border-white/5 hover:border-white/10 transition-all cursor-pointer font-medium"
            >
              Quick Demo
            </button>
          </div>
        </header>

        {/* Main Hero & Auth Split Grid */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 z-10 py-10 lg:py-0">
          
          {/* Left Column: Brand, Pitch & Tagline */}
          <div className="flex-1 text-center lg:text-left space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              Autopilot Workspace Agent
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-white">
              Your proactive productivity{" "}
              <span className="bg-gradient-to-r from-[#6C5CE7] via-[#A29BFE] to-[#4ECDC4] bg-clip-text text-transparent">
                guardian
              </span>
            </h1>
            
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Sync Google Workspace, auto-draft delayed notices, and never miss a critical meeting or checklist deadline again. Powered by Gemini.
            </p>

            {/* Inline SaaS stats / badges */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5 text-left">
              <div>
                <p className="text-xl font-bold text-white">Instant</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-medium">Draft Generation</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">Full Sync</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-medium">Calendar & Gmail</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">100%</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-medium">Client Secure</p>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Auth Card */}
          <div className="w-full max-w-md shrink-0">
            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_-12px_rgba(108,92,231,0.15)] text-center relative overflow-hidden">
              
              {/* Subtle decorative glowing corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#6C5CE7]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-white">Welcome to LifeSaver AI</h2>
                  <p className="text-xs text-slate-400">
                    Sign in with your Google account to authorize secure workspace automation.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Real SaaS styled Sign-in Button */}
                  <button
                    onClick={handleOAuthLogin}
                    className="w-full bg-white hover:bg-slate-100 text-slate-950 font-semibold py-3.5 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-white/5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-sm"
                  >
                    {/* Colorful Google vector icon */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 15.02 1 12 1 7.24 1 3.2 3.74 1.25 7.74l3.8 2.95c.9-2.7 3.42-4.65 6.95-4.65z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.46c-.28 1.48-1.12 2.74-2.38 3.59l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.56z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.05 10.69c-.23-.69-.36-1.43-.36-2.19s.13-1.5.36-2.19l-3.8-2.95C.45 5.07 0 6.74 0 8.5s.45 3.43 1.25 5.14l3.8-2.95z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.34 1.1-4.26 1.1-3.53 0-6.05-1.95-6.95-4.65l-3.8 2.95C3.2 20.26 7.24 23 12 23z"
                      />
                    </svg>
                    <span>Sign in with Google Workspace</span>
                  </button>

                  {/* Trial Sandbox Mode trigger */}
                  <button
                    onClick={handleTryDemoMode}
                    className="w-full bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold py-3 px-6 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Explore sandbox in Guest Demo Mode</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-mono">
                  <Lock className="w-3.5 h-3.5" />
                  Your data is stored locally and never sold
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Landing Page Features Grid (3-4 icons with labels) */}
        <section className="w-full max-w-6xl mx-auto px-6 py-10 z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-slate-950/40 border border-white/5 hover:border-white/10 p-5 rounded-2xl space-y-2.5 transition-all duration-300 hover:scale-[1.02]">
              <div className="bg-indigo-500/10 p-2.5 rounded-xl w-10 h-10 flex items-center justify-center text-indigo-400">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Proactive Calendar Sync</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Instantly reads your today's schedule at runtime to stay ahead of conflicts or delays.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-950/40 border border-white/5 hover:border-white/10 p-5 rounded-2xl space-y-2.5 transition-all duration-300 hover:scale-[1.02]">
              <div className="bg-cyan-500/10 p-2.5 rounded-xl w-10 h-10 flex items-center justify-center text-cyan-400">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Smart Delay Alerts</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Stuck in traffic? Auto-detects corresponding event details and generates notification drafts.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-950/40 border border-white/5 hover:border-white/10 p-5 rounded-2xl space-y-2.5 transition-all duration-300 hover:scale-[1.02]">
              <div className="bg-purple-500/10 p-2.5 rounded-xl w-10 h-10 flex items-center justify-center text-purple-400">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Checklist Priorities</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                A sleek, high-end list to track personal priorities alongside calendar-linked deadlines.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#FECA57]/10 p-2.5 rounded-xl w-10 h-10 flex items-center justify-center text-[#FECA57]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Direct Workspace Integration</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Securely pushes prepared responses straight into your official Google Gmail Drafts directory.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full text-center py-4 text-[10px] text-slate-600 border-t border-white/5 bg-slate-950/40 z-10">
          LifeSaver AI Platform &copy; 2026 &middot; Autopilot Productivity System
        </footer>

      </div>
    );
  }

  return (
    <div id="lifesaver-root" className="min-h-screen bg-[#07070C] text-slate-100 font-sans antialiased overflow-x-hidden flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Top Client ID warning banner */}
      {!((import.meta as any).env.VITE_GOOGLE_CLIENT_ID || customClientId) && (
        <div className="bg-[#FECA57]/10 border-b border-[#FECA57]/20 text-[#FECA57] py-2.5 px-4 text-xs flex items-center justify-between text-center gap-4">
          <div className="flex items-center gap-2 text-left max-w-3xl mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#FECA57]" />
            <p>
              <strong>Google Integrations Pending:</strong> Please supply your Google OAuth Client ID to search your calendar and draft live emails. You can configure this easily in the top settings panel.
            </p>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="text-[#FECA57] border border-[#FECA57]/30 hover:bg-[#FECA57] hover:text-black transition-all rounded px-2.5 py-1 text-[10px] whitespace-nowrap font-medium font-mono uppercase tracking-wider cursor-pointer"
          >
            Configure
          </button>
        </div>
      )}

      {/* Main App Header */}
      <header className="border-b border-white/5 bg-[#0D0D14]/85 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-[#6C5CE7] to-[#4ECDC4] rounded-xl p-2.5 shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">
                LifeSaver AI
              </span>
              <span className="text-[9px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                SaaS
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#4ECDC4] block font-mono font-bold leading-tight">
              Productivity Agent
            </span>
          </div>
        </div>

        {/* Authenticated user, status indicator, and connect CTA */}
        <div className="flex items-center gap-4">
          
          {/* Connection Status Badge */}
          <div className="hidden sm:flex items-center">
            {token ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connected to Google
                </span>
                <button
                  onClick={() => {
                    if (isTokenExpired(token)) {
                      alert('Token expired. Please login again.');
                      handleLogout();
                    } else {
                      alert('Token is valid. Connected to Google!');
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer border border-white/5 bg-white/5 px-2.5 py-1 rounded-lg"
                >
                  {isTokenExpired(token) ? '⚠️ Reconnect' : '✅ Connected'}
                </button>
              </div>
            ) : isDemo ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Sandbox Demo Active
              </span>
            ) : null}
          </div>

          {/* Notification Bell */}
          <div className="relative p-2 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0D0D14] animate-pulse" />
          </div>

          {/* Settings toggle */}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${showSettings ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' : 'bg-slate-900 border-white/5 text-slate-400 hover:text-slate-100'}`}
            title="Configure System ID"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 bg-slate-900/80 border border-white/10 hover:border-white/20 p-1.5 pr-3 rounded-xl transition-all cursor-pointer focus:outline-none"
            >
              {user?.picture ? (
                <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full border border-indigo-500/30 object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                  G
                </div>
              )}
              <div className="text-left hidden md:block">
                <p className="text-[11px] font-medium text-slate-200 leading-tight truncate max-w-[80px]">{user?.name || "Guest"}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
            </button>

            {showUserDropdown && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowUserDropdown(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2.5 z-50 text-left animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="p-2 border-b border-white/5 mb-1.5">
                    <p className="text-xs font-semibold text-slate-100">{user?.name || "Guest"}</p>
                    <p className="text-[10px] text-slate-400 truncate font-mono">{user?.email || "sandbox@lifesaver.ai"}</p>
                  </div>
                  
                  {!token && (
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleOAuthLogin();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#4ECDC4] hover:bg-[#4ECDC4]/5 rounded-xl transition-all cursor-pointer font-medium text-left"
                    >
                      <UserIcon className="w-4 h-4 text-[#4ECDC4]" />
                      Connect Google Workspace
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowSettings(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 rounded-xl transition-all cursor-pointer text-left"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    API Client Settings
                  </button>

                  <div className="border-t border-white/5 my-1.5" />

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer font-medium text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    {token ? "Disconnect Google" : "Exit Sandbox Demo"}
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Main Grid Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-5 overflow-hidden">
        
        {/* Dynamic Interactive Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#14141C] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    Google API Client Configuration Guide
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Complete the configuration steps below to authorize Calendar and Gmail APIs securely at runtime:
                  </p>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs py-1 px-2.5 rounded bg-slate-800 transition-colors cursor-pointer"
                >
                  Close Settings
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[9px] bg-indigo-500/10 text-indigo-400 font-bold tracking-wider uppercase rounded">Step 1: Set up Client ID</span>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">
                      1. Navigate to <strong>Google Cloud Console Credentials</strong> page.<br />
                      2. Select / create your app project.<br />
                      3. Click <strong>+ Create Credentials</strong> &gt; <strong>OAuth client ID</strong>.<br />
                      4. Select <strong>Web Application</strong> as Application type.<br />
                      5. Add Authorized Javascript Origin: <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-400 font-mono text-[10px] break-all">{window.location.origin}</code><br />
                      6. Add OAuth Authorized Redirect URI: <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-400 font-mono text-[10px] break-all">{window.location.origin}</code>
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[9px] bg-cyan-500/10 text-[#4ECDC4] font-bold tracking-wider uppercase rounded">Step 2: Enter Credentials Below</span>
                    <p className="text-xs text-slate-400 mt-1">
                      Enter your created Client ID to save locally and run active testing queries safely:
                    </p>
                    <input 
                      type="text" 
                      placeholder="Paste 12345-abcde.apps.googleusercontent.com"
                      value={customClientId}
                      onChange={(e) => handleSaveCustomClientId(e.target.value)}
                      className="w-full mt-3 bg-[#0A0A0F] border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-100 font-mono placeholder-slate-600"
                    />
                    {customClientId && (
                      <p className="text-[10px] text-[#4ECDC4] mt-1.5 flex items-center gap-1 font-mono">
                        ✓ Client ID saved successfully.
                      </p>
                    )}
                  </div>
                  
                  <div className="text-[10px] text-slate-500 border-t border-white/5 pt-2">
                    *Note: For production, we recommend defining <code className="bg-slate-900 px-1 font-mono text-[10px]">VITE_GOOGLE_CLIENT_ID</code> inside your <code className="bg-slate-900 px-1 font-mono text-[10px]">.env.example</code> file.
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[9px] bg-indigo-500/10 text-indigo-400 font-bold tracking-wider uppercase rounded">Step 3: Diagnostics Console</span>
                    <p className="text-xs text-slate-400 mt-1">
                      Verify that your Google OAuth scopes are configured and the Gmail draft creation works correctly:
                    </p>
                    
                    {token ? (
                      <div className="mt-3 space-y-2.5">
                        <button
                          onClick={handleTestGmailConnection}
                          disabled={isTestingGmail}
                          className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-indigo-800 disabled:to-indigo-900 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg hover:shadow-indigo-500/10 shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isTestingGmail ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Testing Connection...
                            </>
                          ) : (
                            <>
                              Test Gmail API Connection
                            </>
                          )}
                        </button>
                        
                        {gmailTestResult && (
                          <div className={`p-2.5 rounded-lg border text-[10px] leading-normal font-mono whitespace-pre-wrap max-h-32 overflow-y-auto ${
                            gmailTestResult.success 
                              ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400" 
                              : "bg-rose-950/20 border-rose-500/20 text-rose-400"
                          }`}>
                            {gmailTestResult.message}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 p-3 bg-[#0A0A0F] rounded-xl border border-white/5 text-[11px] text-slate-400 text-center">
                        Please connect your Google Workspace account first to run active diagnostics.
                      </div>
                    )}
                  </div>
                  
                  <div className="text-[10px] text-slate-500 border-t border-white/5 pt-2">
                    Active Scopes check: <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-[9px] text-[#4ECDC4]">gmail.compose</code>, <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-[9px] text-[#4ECDC4]">gmail.send</code>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Status Header Widget */}
        <StatusBar 
          tasks={tasks} 
          isAuthenticated={!!token} 
          userName={user?.name} 
        />

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          
          {/* Main Chat Interface: Spans 2 columns on large screen */}
          <div className="lg:col-span-2 lg:row-span-2">
            <ChatInterface 
              messages={messages} 
              isTyping={isTyping} 
              inputText={inputText}
              setInputText={setInputText}
              onSendMessage={handleSendMessage}
              onDeployGmailDraft={handleDeployGmailDraft}
              token={token}
              user={user}
            />
          </div>

          {/* Quick Stats: Spans 1 column */}
          <div className="lg:col-span-1">
            <QuickStats 
              tasks={tasks} 
              events={calendarEvents} 
            />
          </div>

          {/* Deadlines: Spans 1 column */}
          <div className="lg:col-span-1">
            <Deadlines 
              tasks={tasks} 
            />
          </div>

          {/* Mini Calendar: Spans 1 column */}
          <div className="lg:col-span-1">
            <MiniCalendar events={calendarEvents} isAuthenticated={!!token} />
          </div>

          {/* Task checklist list: Spans 1 column */}
          <div className="lg:col-span-1">
            <TaskList 
              tasks={tasks}
              onAddTask={handleAddTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
            />
          </div>

          {/* Smart Suggestions Panel: Spans 4 columns under Chat / Stats */}
          <div className="lg:col-span-4 mt-1">
            <Suggestions 
              onSelectSuggestion={handleSelectSuggestion} 
            />
          </div>

        </div>

      </main>

      {/* Modern Compact Footer */}
      <footer className="border-t border-white/5 py-4 text-center text-[10px] text-slate-500 bg-[#07070C]">
        LifeSaver AI Platform &copy; 2026 &middot; Designed with Sophisticated Dark styling &middot; Built inside AI Coding Environment.
      </footer>

    </div>
  );
}
