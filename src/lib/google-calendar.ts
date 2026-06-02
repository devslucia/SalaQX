import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

export const calendar = google.calendar({ version: "v3", auth });

export async function createCalendarEvent(
  calendarId: string,
  summary: string,
  description: string,
  startTime: string,
  endTime: string
) {
  try {
    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description,
        start: { dateTime: startTime, timeZone: "America/Argentina/Buenos_Aires" },
        end: { dateTime: endTime, timeZone: "America/Argentina/Buenos_Aires" },
      },
    });
    return event.data.id || null;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return null;
  }
}

export async function updateCalendarEvent(
  calendarId: string,
  eventId: string,
  summary: string,
  description: string,
  startTime: string,
  endTime: string
) {
  try {
    await calendar.events.update({
      calendarId,
      eventId,
      requestBody: {
        summary,
        description,
        start: { dateTime: startTime, timeZone: "America/Argentina/Buenos_Aires" },
        end: { dateTime: endTime, timeZone: "America/Argentina/Buenos_Aires" },
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating calendar event:", error);
    return false;
  }
}

export async function deleteCalendarEvent(calendarId: string, eventId: string) {
  try {
    await calendar.events.delete({ calendarId, eventId });
    return true;
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    return false;
  }
}
