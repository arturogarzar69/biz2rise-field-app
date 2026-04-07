import { addMinutes, isValid, parse } from "date-fns";

export function parseServiceOrderStart(serviceDate, serviceTime) {
  const dateTimeValue = `${serviceDate} ${serviceTime}`;
  const twelveHourDate = parse(dateTimeValue, "yyyy-MM-dd h:mm a", new Date());

  if (isValid(twelveHourDate)) {
    return twelveHourDate;
  }

  const twentyFourHourDate = parse(dateTimeValue, "yyyy-MM-dd HH:mm", new Date());

  if (isValid(twentyFourHourDate)) {
    return twentyFourHourDate;
  }

  return parse(serviceDate, "yyyy-MM-dd", new Date());
}

export function resolveDurationMinutes(durationMinutes) {
  const parsedDuration = Number(durationMinutes);

  if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
    return 60;
  }

  return parsedDuration;
}

export function isCompletedStatus(status) {
  return String(status || "").trim().toLowerCase() === "completed";
}

export function isOverdueServiceOrder(serviceDate, serviceTime, status, durationMinutes) {
  const start = parseServiceOrderStart(serviceDate, serviceTime);

  if (!isValid(start) || isCompletedStatus(status)) {
    return false;
  }

  const end = addMinutes(start, resolveDurationMinutes(durationMinutes));

  return end.getTime() < Date.now();
}
