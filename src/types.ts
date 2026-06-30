export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueTime: string | null;
  deadlineDate?: string;
  completed: boolean;
  createdAt: string;
  calendarEventId?: string;
}

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

export interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  // Metadata for advanced actions
  actionType?: 'late_incident' | 'create_task' | 'general_chat';
  lateContext?: {
    name: string;
    offsetMinutes: number;
    reason: string;
    timeIndicator: string;
    matchingEvents?: CalendarEvent[];
    draftPrepared?: {
      to: string;
      subject: string;
      body: string;
    };
    suggestedNewTime?: string;
  };
  taskDetails?: {
    title: string;
    description?: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    dueTime: string | null;
  };
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  type: 'calendar' | 'task' | 'email' | 'prepare';
  actionQuery?: string;
}
