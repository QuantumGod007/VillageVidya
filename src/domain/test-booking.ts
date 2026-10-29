export function istSchedule(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error("Choose a date and time in Asia/Kolkata.");
  const value = new Date(`${date}T${time}:00+05:30`);
  if (!Number.isFinite(value.getTime()))
    throw new Error("Choose a valid date and time.");
  const local = new Date(value.getTime() + 330 * 60_000).toISOString();
  if (local.slice(0, 10) !== date || local.slice(11, 16) !== time)
    throw new Error("Choose a valid calendar date and time.");
  return value.toISOString();
}
export const bookingTime = (value: string, seconds = false) =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: seconds ? "medium" : "short",
  });
