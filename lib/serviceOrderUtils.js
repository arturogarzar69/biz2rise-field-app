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

function normalizeLocationText(value) {
  const normalizedValue = String(value || "").trim();

  return normalizedValue || "";
}

export function hasServiceLocationOverride(serviceOrder) {
  if (!serviceOrder) {
    return false;
  }

  return Boolean(
    serviceOrder.is_one_off_location ||
      normalizeLocationText(serviceOrder.service_location_name) ||
      normalizeLocationText(serviceOrder.service_location_address) ||
      normalizeLocationText(serviceOrder.service_location_phone) ||
      normalizeLocationText(serviceOrder.service_location_contact)
  );
}

export function resolveEffectiveServiceLocation(serviceOrder) {
  const branch = serviceOrder?.branches || null;
  const hasOverride = hasServiceLocationOverride(serviceOrder);

  if (hasOverride) {
    return {
      isOneOff: true,
      hasOverride: true,
      name:
        normalizeLocationText(serviceOrder?.service_location_name) ||
        normalizeLocationText(branch?.name),
      address:
        normalizeLocationText(serviceOrder?.service_location_address) ||
        normalizeLocationText(branch?.address),
      phone:
        normalizeLocationText(serviceOrder?.service_location_phone) ||
        normalizeLocationText(branch?.phone),
      contact:
        normalizeLocationText(serviceOrder?.service_location_contact) ||
        normalizeLocationText(branch?.contact)
    };
  }

  return {
    isOneOff: false,
    hasOverride: false,
    name: normalizeLocationText(branch?.name),
    address: normalizeLocationText(branch?.address),
    phone: normalizeLocationText(branch?.phone),
    contact: normalizeLocationText(branch?.contact)
  };
}
