import { CalendarEvent } from "../types";

/**
 * Fetch calendar events for today from the primary calendar
 * Filter events in client-side to meet requirements
 */
export async function fetchTodayEvents(accessToken: string): Promise<CalendarEvent[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const timeMin = startOfDay.toISOString();
  const timeMax = endOfDay.toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    let errorMsg = `Status ${res.status}`;
    try {
      const errData = await res.json();
      if (errData && errData.error && errData.error.message) {
        errorMsg += `: ${errData.error.message}`;
      }
    } catch {
      try {
        const text = await res.text();
        if (text) errorMsg += `: ${text}`;
      } catch {}
    }
    throw new Error(`Google Calendar request failed: ${errorMsg}`);
  }

  const data = await res.json();
  return (data.items || []) as CalendarEvent[];
}

/**
 * Filter today's meetings to find best matching events for "Sarah" at e.g., "10:00 AM" or general meetings
 */
// google.ts - REPLACE the existing findMatchingEvents function with this

export function findMatchingEvents(
  events: CalendarEvent[],
  contactName: string,
  timeIndicator?: string
): { matchedEvents: CalendarEvent[]; autoDraftToEmail: string } {
  const matchedEvents: CalendarEvent[] = [];
  let autoDraftToEmail = "";

  const cleanName = (contactName || "").toLowerCase().trim();
  
  console.log(`🔍 findMatchingEvents triggered:`);
  console.log(`  - Searching for contact name: "${contactName}" (normalized: "${cleanName}")`);
  console.log(`  - Target time indicator: "${timeIndicator || "none specified"}"`);
  console.log(`  - Number of events available today: ${events.length}`);
  events.forEach((e, idx) => {
    console.log(`    [Event ${idx}]: "${e.summary}" (Start: ${e.start?.dateTime || e.start?.date || "unknown"})`);
  });

  // Score each event and pick the best match
  for (const event of events) {
    const summary = (event.summary || "").toLowerCase();
    const description = (event.description || "").toLowerCase();
    
    let matchScore = 0;
    
    // 1. Check if contact name appears in summary (partial case-insensitive match)
    if (cleanName && summary.includes(cleanName)) {
      matchScore += 3;
      console.log(`  ✅ Match found! "${cleanName}" is contained in summary: "${event.summary}"`);
    }
    
    // 2. Check if contact name appears in description (partial case-insensitive match)
    if (cleanName && description.includes(cleanName)) {
      matchScore += 2;
      console.log(`  ✅ Match found! "${cleanName}" is contained in description of: "${event.summary}"`);
    }
    
    // 3. Check attendees
    if (event.attendees && cleanName) {
      for (const att of event.attendees) {
        const attName = (att.displayName || "").toLowerCase();
        const attEmail = (att.email || "").toLowerCase();
        
        // Check if attendee name contains the contact name
        if (attName.includes(cleanName) || attEmail.includes(cleanName)) {
          matchScore += 4;
          console.log(`  ✅ Match found! "${cleanName}" matches attendee: "${att.displayName || att.email}" for event "${event.summary}"`);
          // Store email for draft
          if (att.email && att.email !== "primary") {
            autoDraftToEmail = att.email;
          }
        }
      }
    }
    
    // 4. Check time correlation if timeIndicator is specified
    if (timeIndicator && event.start?.dateTime) {
      const eventDate = new Date(event.start.dateTime);
      const hours = eventDate.getHours();
      const minutes = eventDate.getMinutes();

      const cleanTimeInd = timeIndicator.toLowerCase();
      const match = cleanTimeInd.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
      if (match) {
        let targetHours = parseInt(match[1]);
        const targetMinutes = match[2] ? parseInt(match[2]) : 0;
        const ampm = match[3];

        if (ampm === "pm" && targetHours < 12) targetHours += 12;
        else if (ampm === "am" && targetHours === 12) targetHours = 0;

        // Allow wiggle room of 1.5 hours around meeting start
        const hourDiff = Math.abs(hours - targetHours);
        if (hourDiff <= 1.5) {
          matchScore += 2;
          console.log(`  ✅ Time correlation match: ${hours}:${minutes} vs target ${targetHours}:${targetMinutes} (diff: ${hourDiff}h)`);
        }
      }
    }

    // If event has a high enough score, include it
    if (matchScore >= 3) {
      matchedEvents.push(event);
      console.log(`  🎯 Event "${event.summary}" added to matched events list with score ${matchScore}`);
    }
  }

  // If we still couldn't find a match, try fuzzy matching
  if (matchedEvents.length === 0 && events.length > 0) {
    console.log(`⚠️ No exact or scored matches found. Attempting fuzzy keyword split matching...`);
    for (const event of events) {
      const summary = (event.summary || "").toLowerCase();
      const cleanNameLower = cleanName;
      
      // Check if any word in the summary matches any word in the name
      const summaryWords = summary.split(/[\s,]+/);
      const nameWords = cleanNameLower.split(/[\s,]+/);
      
      for (const word of nameWords) {
        if (word.length > 2) {
          for (const sumWord of summaryWords) {
            if (sumWord.includes(word) || word.includes(sumWord)) {
              matchedEvents.push(event);
              console.log(`  ✅ Fuzzy word match: "${word}" matches with word "${sumWord}" in event "${event.summary}"`);
              break;
            }
          }
        }
        if (matchedEvents.length > 0) break;
      }
      if (matchedEvents.length > 0) break;
    }
  }

  // Fallback: If absolutely no match can be resolved, use the first event of the day as a fallback
  if (matchedEvents.length === 0 && events.length > 0) {
    const fallbackEvent = events[0];
    console.log(`⚠️ No matches found for "${contactName}". Falling back to the first calendar event of the day: "${fallbackEvent.summary}"`);
    matchedEvents.push(fallbackEvent);
  }

  // If we couldn't resolve an email yet, look at the matched event attendees list
  if (!autoDraftToEmail && matchedEvents.length > 0) {
    const attendees = matchedEvents[0].attendees || [];
    const nonSelf = attendees.find(a => a.email && !a.email.includes('gmail.com'));
    if (nonSelf?.email) {
      autoDraftToEmail = nonSelf.email;
      console.log(`  📧 Extracted non-self email from attendees of matched event: "${autoDraftToEmail}"`);
    } else if (attendees.length > 0 && attendees[0].email) {
      autoDraftToEmail = attendees[0].email;
      console.log(`  📧 Extracted first attendee email from matched event: "${autoDraftToEmail}"`);
    }
  }

  // If still no email, use a fallback placeholder based on the contact name
  if (!autoDraftToEmail) {
    const cleanEmailName = cleanName ? cleanName.replace(/\s/g, '.') : "contact";
    autoDraftToEmail = `${cleanEmailName}@example.com`;
    console.log(`  📧 No attendee email found. Generated fallback placeholder email: "${autoDraftToEmail}"`);
  }

  console.log(`🎯 findMatchingEvents completed: Matched ${matchedEvents.length} event(s). Draft destination email: "${autoDraftToEmail}"`);
  return { matchedEvents, autoDraftToEmail };
}

/**
 * Creates a Gmail draft email for user to review
 */
export async function createGmailDraft(
  accessToken: string,
  toEmail: string,
  subject: string,
  bodyText: string
): Promise<{ draftId: string; messageId: string }> {
  console.log("🚀 Starting createGmailDraft with params:", { toEmail, subject, bodyTextLength: bodyText?.length });
  
  if (!accessToken) {
    console.error("❌ Missing OAuth Access Token inside createGmailDraft!");
    throw new Error("Missing Google Access Token. Please sign in again.");
  }
  if (!toEmail) {
    console.warn("⚠️ Recipient email is missing, using placeholder contact@example.com");
    toEmail = "contact@example.com";
  }

  // Construct RFC 2822 formatted message
  const emailLines = [
    `To: ${toEmail}`,
    `Subject: ${subject || "Meeting Update"}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    bodyText || "",
  ];
  const rawMime = emailLines.join("\r\n");
  console.log("📝 Constructed RFC 2822 raw email MIME string:\n", rawMime);

  // Safeguard base64url encoding
  let base64Safe = "";
  try {
    base64Safe = btoa(unescape(encodeURIComponent(rawMime)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    console.log("🔒 Successfully encoded draft content into base64url format. Length:", base64Safe.length);
  } catch (encodeErr) {
    console.error("❌ Failed to base64url encode the draft email:", encodeErr);
    throw new Error(`Draft encoding failed: ${encodeErr instanceof Error ? encodeErr.message : encodeErr}`);
  }

  const url = "https://www.googleapis.com/gmail/v1/users/me/drafts";
  console.log(`🌐 POSTing to Gmail API endpoint: ${url}`);
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          raw: base64Safe,
        },
      }),
    });

    console.log(`📡 Gmail API Response received. Status: ${res.status} (${res.statusText})`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Gmail API error payload:`, errText);
      
      let friendlyError = `Gmail API error (status ${res.status}): ${res.statusText}`;
      try {
        const parsedErr = JSON.parse(errText);
        if (parsedErr.error?.message) {
          friendlyError = parsedErr.error.message;
        }
      } catch (e) {
        // use original error
      }
      throw new Error(`Gmail API draft creation failed: ${friendlyError}`);
    }

    const data = await res.json();
    console.log("✅ Gmail draft successfully created. Response data:", data);

    if (!data.id) {
      throw new Error("Gmail API response returned successfully but was missing the draft ID.");
    }

    return {
      draftId: data.id,
      messageId: data.message?.id || "",
    };
  } catch (fetchErr: any) {
    console.error("❌ Exception occurred during Gmail API fetch request:", fetchErr);
    throw fetchErr;
  }
}

/**
 * Send the generated Gmail draft directly if requested
 */
export async function sendGmailDraft(
  accessToken: string,
  draftId: string
): Promise<boolean> {
  const url = "https://www.googleapis.com/gmail/v1/users/me/drafts/send";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: draftId,
    }),
  });

  return res.ok;
}

/**
 * Update a Google Calendar Event start and end time by adding offsetMinutes
 */
export async function updateCalendarEventTime(
  accessToken: string,
  eventId: string,
  originalEvent: CalendarEvent,
  offsetMinutes: number
): Promise<CalendarEvent> {
  if (!originalEvent.start?.dateTime || !originalEvent.end?.dateTime) {
    throw new Error("Cannot reschedule an all-day or unscheduled event");
  }

  const newStart = new Date(new Date(originalEvent.start.dateTime).getTime() + offsetMinutes * 60 * 1000).toISOString();
  const newEnd = new Date(new Date(originalEvent.end.dateTime).getTime() + offsetMinutes * 60 * 1000).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start: { dateTime: newStart },
      end: { dateTime: newEnd }
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to update calendar event: ${txt || res.statusText}`);
  }

  return (await res.json()) as CalendarEvent;
}

/**
 * Format date values to relative user time
 */
export function formatTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return "";
  const d = new Date(dateTimeStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Calculate proposed suggestions
 */
export function suggestNewMeetingTime(event: CalendarEvent, offsetMinutes: number): {
  originalStart: string;
  proposedStart: string;
} {
  if (!event?.start?.dateTime) {
    return { originalStart: "10:00 AM", proposedStart: "10:15 AM" };
  }

  const originalDate = new Date(event.start.dateTime);
  const originalFmt = originalDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const proposedDate = new Date(originalDate.getTime() + offsetMinutes * 60 * 1000);
  const proposedFmt = proposedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return {
    originalStart: originalFmt,
    proposedStart: proposedFmt,
  };
}

/**
 * Generate highly realistic mock calendar events for today's date
 */
export function getMockTodayEvents(): CalendarEvent[] {
  const today = new Date();
  
  const event1Start = new Date(today);
  event1Start.setHours(10, 0, 0, 0);
  const event1End = new Date(today);
  event1End.setHours(11, 0, 0, 0);

  const event2Start = new Date(today);
  event2Start.setHours(13, 30, 0, 0);
  const event2End = new Date(today);
  event2End.setHours(14, 15, 0, 0);

  const event3Start = new Date(today);
  event3Start.setHours(15, 0, 0, 0);
  const event3End = new Date(today);
  event3End.setHours(15, 45, 0, 0);

  return [
    {
      id: "mock-1",
      summary: "Sync with Sarah",
      description: "Discussing quarterly highlights and the new workspace draft features.",
      start: { dateTime: event1Start.toISOString() },
      end: { dateTime: event1End.toISOString() },
      attendees: [
        { displayName: "Sarah Jenkins", email: "sarah.jenkins@example.com", responseStatus: "accepted" }
      ]
    },
    {
      id: "mock-2",
      summary: "Project Alpha Status Review",
      description: "Progress update on major milestones.",
      start: { dateTime: event2Start.toISOString() },
      end: { dateTime: event2End.toISOString() },
      attendees: [
        { displayName: "Bob Carter", email: "bob.carter@example.com", responseStatus: "accepted" },
        { displayName: "Alice Vance", email: "alice.vance@example.com", responseStatus: "needsAction" }
      ]
    },
    {
      id: "mock-3",
      summary: "Sync with Bob",
      description: "Checking in on development server restart procedures and test suite.",
      start: { dateTime: event3Start.toISOString() },
      end: { dateTime: event3End.toISOString() },
      attendees: [
        { displayName: "Bob Carter", email: "bob.carter@example.com", responseStatus: "accepted" }
      ]
    }
  ];
}

/**
 * Parse a conversational or short time string into a valid Date object for today/tomorrow
 */
/**
 * Parse a conversational or short time string into a valid Date object for today/tomorrow
 * FIXED: Better parsing for various time formats
 */
export function parseDueTimeToDate(dueTime: string): Date | null {
  if (!dueTime) return null;
  const clean = dueTime.trim().toLowerCase();
  
  // Try parsing directly first
  const direct = new Date(dueTime);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  // Parse strings like "5 PM", "10:30 AM", "17:00"
  const match = clean.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
  if (match) {
    const d = new Date();
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3];

    if (ampm === "pm" && hours < 12) {
      hours += 12;
    } else if (ampm === "am" && hours === 12) {
      hours = 0;
    }

    d.setHours(hours, minutes, 0, 0);
    
    // If the time is in the past, add a day
    if (d < new Date()) {
      d.setDate(d.getDate() + 1);
    }
    
    return d;
  }

  // Try "today" or "tomorrow" keywords
  if (clean.includes("today")) {
    const d = new Date();
    const timeMatch = clean.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3];
      if (ampm === "pm" && hours < 12) hours += 12;
      else if (ampm === "am" && hours === 12) hours = 0;
      d.setHours(hours, minutes, 0, 0);
      return d;
    }
  }

  if (clean.includes("tomorrow")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const timeMatch = clean.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3];
      if (ampm === "pm" && hours < 12) hours += 12;
      else if (ampm === "am" && hours === 12) hours = 0;
      d.setHours(hours, minutes, 0, 0);
      return d;
    }
  }

  return null;
}


/**
 * Create a task as an event in Google Calendar with a 15-minute reminder
 */
export async function createCalendarEvent(
  accessToken: string,
  title: string,
  dueDateTime: string,
  description?: string
): Promise<{ id: string }> {
  const start = parseDueTimeToDate(dueDateTime) || new Date(dueDateTime);
  if (isNaN(start.getTime())) {
    throw new Error(`Invalid event date/time: "${dueDateTime}"`);
  }

  // Set event end to 30 minutes after start
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: title,
      description: description || "Task scheduled from LifeSaver AI app",
      start: {
        dateTime: start.toISOString(),
      },
      end: {
        dateTime: end.toISOString(),
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 15 },
        ],
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to create calendar event: ${txt || res.statusText}`);
  }

  const data = await res.json();
  return { id: data.id };
}

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const txt = await res.text();
    throw new Error(`Failed to delete calendar event: ${txt || res.statusText}`);
  }
}


