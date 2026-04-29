"use client";

import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Settings, User, Users } from "lucide-react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import TimeGrid from "react-big-calendar/lib/TimeGrid";
import SegmentedControl from "../../components/SegmentedControl";
import {
  addDays,
  format,
  isValid,
  parse,
  startOfWeek,
  startOfDay,
  getDay,
  addHours,
  addMinutes,
  addMonths,
  differenceInCalendarDays,
  differenceInMinutes
} from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import ServiceListView from "../../components/ServiceListView";
import {
  hasServiceLocationOverride,
  isCompletedStatus,
  isOverdueServiceOrder,
  parseServiceOrderStart,
  resolveEffectiveServiceLocation,
  resolveDurationMinutes
} from "../../lib/serviceOrderUtils";
import {
  fetchContactsForClient,
  saveContactRecord,
  updateContactRecord
} from "../../lib/contactRecords";
import { getSupabaseClient } from "../../lib/supabaseClient";
import {
  formatDisplayTime,
  getExecutionStatusLabel,
  getStatusLabel,
  uiText
} from "../../lib/uiText";

const locales = {
  es
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

const DragAndDropCalendar = withDragAndDrop(Calendar);
const DEBUG = process.env.NODE_ENV === "development";
const debugLog = (...args) => {
  if (DEBUG) {
    console.log(...args);
  }
};

const defaultClientSubTab = uiText.clients.subTabs.list;
const defaultClientsModuleTab = "summary";
const defaultTechnicianSubTab = uiText.technicians.subTabs.list;

const initialFormState = {
  clientId: "",
  branchId: "",
  isOneOffLocation: false,
  serviceLocationName: "",
  serviceLocationAddress: "",
  serviceLocationPhone: "",
  serviceLocationContact: "",
  technicianName: "",
  serviceDate: "",
  serviceTime: "9:00 AM",
  durationMinutes: 60,
  isRecurring: false,
  recurrenceType: "weekly",
  recurrenceInterval: 1,
  recurrenceDays: [],
  recurrenceEndDate: "",
  status: "scheduled",
  serviceInstructions: "",
  notes: ""
};

const initialTechnicianFormState = {
  fullName: "",
  phone: "",
  address: "",
  notes: "",
  isActive: true
};

const initialClientFormState = {
  clientType: "commercial",
  businessName: "",
  tradeName: "",
  taxId: "",
  mainAddress: "",
  mainPhone: "",
  mainContact: "",
  mainEmail: ""
};

const initialDetailFormState = {
  clientId: "",
  branchId: "",
  isOneOffLocation: false,
  serviceLocationName: "",
  serviceLocationAddress: "",
  serviceLocationPhone: "",
  serviceLocationContact: "",
  technicianName: "",
  serviceDate: "",
  serviceTime: "9:00 AM",
  durationMinutes: 60,
  isRecurring: false,
  recurrenceType: "weekly",
  recurrenceEndDate: "",
  status: "scheduled",
  serviceInstructions: "",
  serviceReport: "",
  serviceSummary: "",
  findings: "",
  recommendations: "",
  materialsUsed: "",
  actualStartAt: "",
  actualEndAt: "",
  completionNotes: ""
};

const initialAppointmentConversionForm = {
  technicianName: "",
  serviceDate: "",
  serviceTime: "9:00 AM",
  durationMinutes: 60,
  serviceInstructions: ""
};

const initialBranchFormState = {
  name: "",
  address: "",
  phone: "",
  contact: "",
  notes: ""
};

const initialQuickClientState = {
  name: "",
  phone: "",
  clientType: "commercial",
  businessName: "",
  tradeName: "",
  taxId: "",
  street: "",
  streetNumber: "",
  city: "",
  state: "",
  postalCode: "",
  reference: ""
};

const initialQuickBranchState = {
  name: "",
  address: "",
  phone: "",
  contact: ""
};

const clientDrawerTabs = {
  summary: "summary",
  client: "client",
  contacts: "contacts",
  branches: "branches",
  services: "services"
};

const initialClientDrawerForm = {
  name: "",
  clientType: "commercial",
  mainPhone: "",
  mainEmail: "",
  mainContact: "",
  businessName: "",
  tradeName: "",
  taxId: ""
};

const initialContactDrawerForm = {
  fullName: "",
  phone: "",
  email: "",
  role: "",
  notes: "",
  isPrimary: false
};

const initialCompanySettingsForm = {
  name: "",
  businessName: "",
  taxId: "",
  mainPhone: "",
  mainEmail: "",
  mainContact: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  logoUrl: ""
};


const technicianColorPalette = [
  { background: "#e9f2ff", border: "#bfd6ff", accent: "#1d4ed8", text: "#163b75" },
  { background: "#eaf7ef", border: "#bfe3cb", accent: "#15803d", text: "#166534" },
  { background: "#fff3e8", border: "#f4d1af", accent: "#c2410c", text: "#9a3412" },
  { background: "#f5efff", border: "#d8c7ff", accent: "#7c3aed", text: "#5b21b6" },
  { background: "#eef7f7", border: "#bfe1df", accent: "#0f766e", text: "#115e59" },
  { background: "#fff1f3", border: "#f4c6d1", accent: "#db2777", text: "#9d174d" }
];

const serviceDurationOptions = [30, 60, 90, 120, 180];
const minimumServiceDurationMinutes = 30;
const defaultRecurrenceType = "weekly";
const serviceOrderStatusOptions = ["scheduled", "completed", "cancelled"].map((status) => ({
  value: status,
  label: getStatusLabel(status)
}));
const adminViewTabs = {
  calendar: "calendar",
  list: "list"
};
const clientsModuleTabs = {
  summary: "summary",
  list: "list"
};
const dashboardTabs = {
  calendar: "calendar",
  clients: "clients",
  technicians: "technicians",
  settings: "settings"
};
const sidebarNavigationGroups = [
  {
    label: "OPERACION",
    items: [{ key: "calendar", value: dashboardTabs.calendar, icon: CalendarDays }]
  },
  {
    label: "GESTION",
    items: [
      { key: "clients", value: dashboardTabs.clients, icon: Users },
      { key: "technicians", value: dashboardTabs.technicians, icon: User }
    ]
  },
  {
    label: "SISTEMA",
    items: [{ key: "settings", value: dashboardTabs.settings, icon: Settings }]
  }
];
const operationalCalendarView = "operational";
const calendarScrollToTime = addHours(startOfDay(new Date()), 6);
const rightPanelModes = {
  empty: "empty",
  detail: "detail",
  edit: "edit",
  create: "create"
};

const serviceOrderSelectQuery = `
  id,
  technician_name,
  service_date,
  service_time,
  status,
  execution_status,
  duration_minutes,
  is_recurring,
  recurrence_type,
  recurrence_interval,
  recurrence_end_date,
  recurrence_group_id,
  parent_service_order_id,
  appointment_id,
  created_at,
  service_instructions,
  service_report,
  service_summary,
  findings,
  recommendations,
  materials_used,
  started_at,
  completed_at,
  actual_start_at,
  actual_end_at,
  completed_by,
  completion_notes,
  client_id,
  branch_id,
  service_location_name,
  service_location_address,
  service_location_phone,
  service_location_contact,
  is_one_off_location,
  clients (
    name,
    client_type,
    business_name,
    trade_name
  ),
  branches (
    name,
    address,
    phone,
    contact,
    notes
  )
`;

const appointmentSelectQuery = `
  id,
  company_id,
  series_id,
  client_id,
  branch_id,
  technician_name,
  title,
  notes,
  appointment_date,
  appointment_time,
  duration_minutes,
  status,
  confirmed_at,
  cancelled_at,
  converted_at,
  service_order_id,
  service_location_name,
  service_location_address,
  service_location_phone,
  service_location_contact,
  is_one_off_location,
  created_at,
  updated_at,
  clients (
    id,
    name,
    business_name,
    trade_name
  ),
  branches (
    id,
    name,
    address,
    phone,
    contact
  )
`;

const appointmentSeriesSelectQuery = `
  id,
  company_id,
  client_id,
  branch_id,
  technician_name,
  title,
  notes,
  start_date,
  start_time,
  duration_minutes,
  is_recurring,
  recurrence_type,
  recurrence_interval,
  recurrence_days,
  recurrence_end_date,
  generated_through_date,
  service_location_name,
  service_location_address,
  service_location_phone,
  service_location_contact,
  is_one_off_location,
  status,
  clients (
    id,
    name,
    business_name,
    trade_name
  ),
  branches (
    id,
    name,
    address,
    phone,
    contact
  )
`;

const appointmentSeriesExceptionSelectQuery = `
  id,
  company_id,
  series_id,
  occurrence_date,
  occurrence_time,
  exception_type,
  replacement_appointment_id
`;

const defaultExecutionStatus = "pending";
const appointmentGenerationWindowDays = 45;
const recurrenceWeekdayOptions = [
  { value: "sunday", label: "Dom" },
  { value: "monday", label: "Lun" },
  { value: "tuesday", label: "Mar" },
  { value: "wednesday", label: "Mie" },
  { value: "thursday", label: "Jue" },
  { value: "friday", label: "Vie" },
  { value: "saturday", label: "Sab" }
];
const recurrenceWeekdayValues = recurrenceWeekdayOptions.map((dayOption) => dayOption.value);
const weekdayOnlyValues = ["monday", "tuesday", "wednesday", "thursday", "friday"];

function getOperationalRange(anchorDate) {
  const normalizedAnchorDate = startOfDay(anchorDate || new Date());

  return [0, 1, 2, 3, 4].map((offset) => startOfDay(addDays(normalizedAnchorDate, offset)));
}

function OperationalCalendarView({
  date,
  localizer,
  min = localizer.startOf(new Date(), "day"),
  max = localizer.endOf(new Date(), "day"),
  scrollToTime = localizer.startOf(new Date(), "day"),
  enableAutoScroll = true,
  ...props
}) {
  return (
    <TimeGrid
      {...props}
      range={getOperationalRange(date)}
      eventOffset={15}
      localizer={localizer}
      min={min}
      max={max}
      scrollToTime={scrollToTime}
      enableAutoScroll={enableAutoScroll}
    />
  );
}

OperationalCalendarView.range = (date) => getOperationalRange(date);
OperationalCalendarView.defaultProps = TimeGrid.defaultProps;

OperationalCalendarView.navigate = (date, action) => {
  const normalizedAnchorDate = startOfDay(date || new Date());

  switch (action) {
    case "PREV":
      return addDays(normalizedAnchorDate, -1);
    case "NEXT":
      return addDays(normalizedAnchorDate, 1);
    case "TODAY":
      return startOfDay(new Date());
    default:
      return normalizedAnchorDate;
  }
};

OperationalCalendarView.title = (date, { localizer }) => {
  const operationalRange = getOperationalRange(date);
  const rangeStart = operationalRange[0];
  const rangeEnd = operationalRange[operationalRange.length - 1];

  return localizer.format(
    {
      start: rangeStart,
      end: rangeEnd
    },
    "dayRangeHeaderFormat"
  );
};

function formatTimeSlot(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  const paddedMinutes = String(minutes).padStart(2, "0");
  const value = `${hours12}:${paddedMinutes} ${meridiem}`;

  return {
    value,
    label: formatDisplayTime(value)
  };
}

function parseTimeOptionToMinutes(timeValue) {
  if (!timeValue) {
    return null;
  }

  const normalizedTimeValue = String(timeValue).trim();
  const twentyFourHourMatch = normalizedTimeValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }

  const match = normalizedTimeValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  const normalizedHours = hours % 12 + (meridiem === "PM" ? 12 : 0);

  return normalizedHours * 60 + minutes;
}

function normalizeAppointmentOccurrenceTimeKey(timeValue) {
  const totalMinutes = parseTimeOptionToMinutes(timeValue);

  if (totalMinutes === null) {
    return String(timeValue || "").trim();
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeAppointmentOccurrenceDateKey(dateValue) {
  if (!dateValue) {
    return "";
  }

  if (dateValue instanceof Date && isValid(dateValue)) {
    return format(dateValue, "yyyy-MM-dd");
  }

  return String(dateValue).trim().slice(0, 10);
}

function getAppointmentOccurrenceKey(seriesId, appointmentDate, appointmentTime) {
  return [
    seriesId || "",
    normalizeAppointmentOccurrenceDateKey(appointmentDate),
    normalizeAppointmentOccurrenceTimeKey(appointmentTime)
  ].join("::");
}

function getSuppressedAppointmentOccurrenceKeys(appointmentSeriesExceptions = []) {
  return new Set(
    (appointmentSeriesExceptions || [])
      .filter(
        (appointmentSeriesException) =>
          appointmentSeriesException?.series_id &&
          ["deleted", "moved"].includes(appointmentSeriesException?.exception_type)
      )
      .map((appointmentSeriesException) =>
        getAppointmentOccurrenceKey(
          appointmentSeriesException.series_id,
          appointmentSeriesException.occurrence_date,
          appointmentSeriesException.occurrence_time
        )
      )
  );
}

function isConvertedAppointmentRecord(appointment) {
  const normalizedStatus = String(appointment?.status || "").trim().toLowerCase();

  return Boolean(
    appointment?.service_order_id ||
      appointment?.converted_at ||
      normalizedStatus === "converted"
  );
}

function getAppointmentStatusLabel(status) {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (normalizedStatus === "tentative") {
    return "Tentativa";
  }

  if (normalizedStatus === "cancelled") {
    return "Cancelada";
  }

  if (normalizedStatus === "converted") {
    return "Convertida";
  }

  if (normalizedStatus === "pending") {
    return "Pendiente";
  }

  return status || "Pendiente";
}

function generateTimeSlots(startHour, endHour, intervalMinutes) {
  const slots = [];
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  for (
    let currentMinutes = startMinutes;
    currentMinutes <= endMinutes;
    currentMinutes += intervalMinutes
  ) {
    slots.push(formatTimeSlot(currentMinutes));
  }

  return slots;
}

function resolveResizedDurationMinutes(start, end) {
  if (!start || !end || !isValid(start) || !isValid(end)) {
    return null;
  }

  const difference = differenceInMinutes(end, start);

  if (!Number.isFinite(difference)) {
    return null;
  }

  return Math.max(minimumServiceDurationMinutes, difference);
}

function generateSafeUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `rec-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeRecurrenceType(recurrenceType) {
  const normalizedType = String(recurrenceType || "").trim().toLowerCase();

  if (["daily", "weekly", "biweekly", "monthly", "weekdays", "custom"].includes(normalizedType)) {
    return normalizedType;
  }

  return defaultRecurrenceType;
}

function normalizeRecurrenceInterval(recurrenceInterval) {
  const parsedInterval = Number(recurrenceInterval);

  if (!Number.isFinite(parsedInterval) || parsedInterval <= 0) {
    return 1;
  }

  return Math.max(1, Math.floor(parsedInterval));
}

function normalizeRecurrenceDays(recurrenceDays) {
  if (!Array.isArray(recurrenceDays)) {
    return [];
  }

  return recurrenceDays
    .map((recurrenceDay) => String(recurrenceDay || "").trim().toLowerCase())
    .filter((recurrenceDay) => recurrenceWeekdayValues.includes(recurrenceDay));
}

function getWeekdayNameFromDate(date) {
  if (!date || !isValid(date)) {
    return "";
  }

  return recurrenceWeekdayValues[getDay(date)];
}

function parseDateOnly(dateValue) {
  return parse(dateValue, "yyyy-MM-dd", new Date());
}

function formatDateOnly(dateValue) {
  return format(dateValue, "yyyy-MM-dd");
}

function isSameOrBeforeDate(leftDate, rightDate) {
  return startOfDay(leftDate).getTime() <= startOfDay(rightDate).getTime();
}

function getAppointmentGenerationEndDate(startDateValue, recurrenceEndDateValue = "") {
  const todayWindowEnd = addDays(startOfDay(new Date()), appointmentGenerationWindowDays);
  const startDate = parseDateOnly(startDateValue);
  const windowEnd = todayWindowEnd.getTime() > startDate.getTime() ? todayWindowEnd : startDate;
  const recurrenceEndDate = recurrenceEndDateValue ? parseDateOnly(recurrenceEndDateValue) : null;

  if (recurrenceEndDate && isValid(recurrenceEndDate) && recurrenceEndDate.getTime() < windowEnd.getTime()) {
    return recurrenceEndDate;
  }

  return windowEnd;
}

function expandRecurringAppointmentDates({
  startDateValue,
  recurrenceType,
  recurrenceInterval,
  recurrenceDays,
  recurrenceEndDateValue = "",
  rangeStartValue = null,
  rangeEndValue
}) {
  const startDate = parseDateOnly(startDateValue);

  if (!isValid(startDate)) {
    return [];
  }

  const normalizedRecurrenceType = normalizeRecurrenceType(recurrenceType);
  const normalizedRecurrenceInterval = normalizeRecurrenceInterval(recurrenceInterval);
  const rangeStart = rangeStartValue ? parseDateOnly(rangeStartValue) : startDate;
  const rangeEnd = parseDateOnly(rangeEndValue);
  const recurrenceEndDate = recurrenceEndDateValue ? parseDateOnly(recurrenceEndDateValue) : null;
  const endDate =
    recurrenceEndDate && isValid(recurrenceEndDate) && recurrenceEndDate.getTime() < rangeEnd.getTime()
      ? recurrenceEndDate
      : rangeEnd;
  const occurrenceDates = [];
  const pushDateIfInWindow = (dateValue) => {
    if (
      isValid(dateValue) &&
      isSameOrBeforeDate(startDate, dateValue) &&
      isSameOrBeforeDate(rangeStart, dateValue) &&
      isSameOrBeforeDate(dateValue, endDate)
    ) {
      occurrenceDates.push(formatDateOnly(dateValue));
    }
  };

  if (!isValid(rangeStart) || !isValid(rangeEnd) || rangeEnd.getTime() < startDate.getTime()) {
    return [];
  }

  if (normalizedRecurrenceType === "monthly") {
    let cursor = startDate;

    while (isSameOrBeforeDate(cursor, endDate)) {
      pushDateIfInWindow(cursor);
      cursor = addMonths(cursor, normalizedRecurrenceInterval);
    }

    return [...new Set(occurrenceDates)];
  }

  const selectedDays =
    normalizedRecurrenceType === "weekdays"
      ? weekdayOnlyValues
      : normalizeRecurrenceDays(recurrenceDays);
  const weeklyDays =
    selectedDays.length > 0 ? selectedDays : [getWeekdayNameFromDate(startDate)];
  let cursor = startDate;

  while (isSameOrBeforeDate(cursor, endDate)) {
    const daysSinceStart = differenceInCalendarDays(cursor, startDate);
    const fullWeeksSinceStart = Math.floor(daysSinceStart / 7);
    const isMatchingDailyInterval =
      normalizedRecurrenceType === "daily" && daysSinceStart % normalizedRecurrenceInterval === 0;
    const isMatchingWeekday = normalizedRecurrenceType === "weekdays" && weekdayOnlyValues.includes(getWeekdayNameFromDate(cursor));
    const isMatchingWeeklyInterval =
      ["weekly", "biweekly", "custom"].includes(normalizedRecurrenceType) &&
      fullWeeksSinceStart % (normalizedRecurrenceType === "biweekly" ? 2 : normalizedRecurrenceInterval) === 0 &&
      weeklyDays.includes(getWeekdayNameFromDate(cursor));

    if (isMatchingDailyInterval || isMatchingWeekday || isMatchingWeeklyInterval) {
      pushDateIfInWindow(cursor);
    }

    cursor = addDays(cursor, 1);
  }

  return [...new Set(occurrenceDates)];
}

function expandRecurringAppointments(orderState) {
  const endDate = getAppointmentGenerationEndDate(
    orderState.serviceDate,
    orderState.recurrenceEndDate
  );

  return expandRecurringAppointmentDates({
    startDateValue: orderState.serviceDate,
    recurrenceType: orderState.recurrenceType,
    recurrenceInterval: orderState.recurrenceInterval,
    recurrenceDays: orderState.recurrenceDays,
    recurrenceEndDateValue: orderState.recurrenceEndDate,
    rangeStartValue: orderState.serviceDate,
    rangeEndValue: formatDateOnly(endDate)
  });
}

function buildAppointmentBasePayload({
  activeCompanyId,
  orderState,
  selectedClient,
  resolvedBranchId,
  recurrenceSeriesId = null,
  appointmentDate
}) {
  return {
    company_id: activeCompanyId,
    series_id: recurrenceSeriesId,
    client_id: orderState.clientId,
    branch_id: resolvedBranchId,
    technician_name: null,
    title: getClientDisplayName(selectedClient),
    notes: orderState.serviceInstructions || orderState.notes || null,
    appointment_date: appointmentDate || orderState.serviceDate,
    appointment_time: orderState.serviceTime.trim(),
    duration_minutes: resolveDurationMinutes(orderState.durationMinutes),
    status: "tentative",
    ...buildServiceLocationOverridePayload(orderState)
  };
}

function buildAppointmentSeriesPayload({
  activeCompanyId,
  orderState,
  selectedClient,
  resolvedBranchId,
  generatedThroughDate
}) {
  const recurrenceType = normalizeRecurrenceType(orderState.recurrenceType);
  const recurrenceDays =
    recurrenceType === "weekdays"
      ? weekdayOnlyValues
      : normalizeRecurrenceDays(orderState.recurrenceDays);

  return {
    company_id: activeCompanyId,
    client_id: orderState.clientId,
    branch_id: resolvedBranchId,
    technician_name: null,
    title: getClientDisplayName(selectedClient),
    notes: orderState.serviceInstructions || orderState.notes || null,
    start_date: orderState.serviceDate,
    start_time: orderState.serviceTime.trim(),
    duration_minutes: resolveDurationMinutes(orderState.durationMinutes),
    is_recurring: true,
    recurrence_type: recurrenceType,
    recurrence_interval: normalizeRecurrenceInterval(orderState.recurrenceInterval),
    recurrence_days: recurrenceDays,
    recurrence_end_date: orderState.recurrenceEndDate || null,
    generated_through_date: generatedThroughDate || orderState.serviceDate,
    status: "active",
    ...buildServiceLocationOverridePayload(orderState)
  };
}

function buildAppointmentPayloadFromSeries({ activeCompanyId, series, appointmentDate }) {
  return {
    company_id: activeCompanyId,
    series_id: series.id,
    client_id: series.client_id,
    branch_id: series.branch_id || null,
    technician_name: series.technician_name || null,
    title: series.title || getClientDisplayName(series.clients),
    notes: series.notes || null,
    appointment_date: appointmentDate,
    appointment_time: series.start_time,
    duration_minutes: resolveDurationMinutes(series.duration_minutes),
    status: "tentative",
    is_one_off_location: Boolean(series.is_one_off_location),
    service_location_name: series.service_location_name || null,
    service_location_address: series.service_location_address || null,
    service_location_phone: series.service_location_phone || null,
    service_location_contact: series.service_location_contact || null
  };
}

function getSeriesMaterializationTargetDate(series) {
  const targetHorizon = addDays(startOfDay(new Date()), appointmentGenerationWindowDays);
  const recurrenceEndDate = series?.recurrence_end_date
    ? parseDateOnly(series.recurrence_end_date)
    : null;

  if (
    recurrenceEndDate &&
    isValid(recurrenceEndDate) &&
    recurrenceEndDate.getTime() < targetHorizon.getTime()
  ) {
    return recurrenceEndDate;
  }

  return targetHorizon;
}

function shouldExtendAppointmentSeries(series) {
  if (!series?.id || series.status !== "active" || !series.is_recurring) {
    return false;
  }

  const targetDate = getSeriesMaterializationTargetDate(series);
  const generatedThroughDate = series.generated_through_date
    ? parseDateOnly(series.generated_through_date)
    : null;

  if (!isValid(targetDate)) {
    return false;
  }

  if (!generatedThroughDate || !isValid(generatedThroughDate)) {
    return true;
  }

  return generatedThroughDate.getTime() < targetDate.getTime();
}

function getSeriesExtensionRange(series) {
  const targetDate = getSeriesMaterializationTargetDate(series);
  const generatedThroughDate = series.generated_through_date
    ? parseDateOnly(series.generated_through_date)
    : null;
  const startDate = series.generated_through_date && generatedThroughDate && isValid(generatedThroughDate)
    ? addDays(generatedThroughDate, 1)
    : parseDateOnly(series.start_date);

  return {
    startDate,
    targetDate
  };
}

function getRecurrenceFormState(serviceOrder) {
  const isRecurring = Boolean(serviceOrder?.is_recurring);

  return {
    isRecurring,
    recurrenceType: isRecurring
      ? normalizeRecurrenceType(serviceOrder?.recurrence_type)
      : defaultRecurrenceType,
    recurrenceEndDate: serviceOrder?.recurrence_end_date || ""
  };
}

function buildRecurrencePayload(orderState, existingOrder = null) {
  if (!orderState?.isRecurring) {
    return {
      is_recurring: false,
      recurrence_type: null,
      recurrence_interval: 1,
      recurrence_end_date: null,
      recurrence_group_id: null,
      parent_service_order_id: null
    };
  }

  return {
    is_recurring: true,
    recurrence_type: normalizeRecurrenceType(orderState.recurrenceType),
    recurrence_interval: 1,
    recurrence_end_date: orderState.recurrenceEndDate || null,
    recurrence_group_id:
      existingOrder?.recurrence_group_id || generateSafeUuid(),
    parent_service_order_id: existingOrder?.parent_service_order_id || null
  };
}

function transformServiceOrdersToEvents(serviceOrders) {
  // Map Supabase rows into the calendar shape expected by react-big-calendar.
  return serviceOrders.map((serviceOrder) => {
    const start = parseServiceOrderStart(
      serviceOrder.service_date,
      serviceOrder.service_time
    );
    const durationMinutes = resolveDurationMinutes(serviceOrder.duration_minutes);
    const end = addMinutes(start, durationMinutes);
    const technicianColor = getTechnicianColorToken(serviceOrder.technician_name);
    const clientName = getClientDisplayName(serviceOrder.clients);
    const effectiveLocation = resolveEffectiveServiceLocation(serviceOrder);
    const branchName = effectiveLocation.name || uiText.dashboard.branchEmpty;
    const isOverdue = isOverdueServiceOrder(
      serviceOrder.service_date,
      serviceOrder.service_time,
      serviceOrder.status,
      serviceOrder.duration_minutes
    );

    return {
      id: serviceOrder.id,
      type: "service_order",
      resource: serviceOrder,
      serviceOrder,
      title: clientName,
      clientName,
      branchName,
      locationAddress: effectiveLocation.address,
      locationPhone: effectiveLocation.phone,
      locationContact: effectiveLocation.contact,
      isOneOffLocation: effectiveLocation.isOneOff,
      technician: serviceOrder.technician_name,
      technicianDisplayName: getTechnicianDisplayName(serviceOrder.technician_name),
      status: serviceOrder.status,
      isOverdue,
      serviceDate: serviceOrder.service_date,
      serviceTime: serviceOrder.service_time,
      durationMinutes,
      createdAt: serviceOrder.created_at,
      technicianColor,
      tooltipText: [
        ...(isOverdue ? [uiText.dashboard.overdueLabel] : []),
        `Cliente: ${clientName || "-"}`,
        `Ubicacion: ${branchName || uiText.dashboard.branchEmpty}`,
        `Tecnico: ${getTechnicianDisplayName(serviceOrder.technician_name)}`,
        `Hora: ${formatDisplayTime(serviceOrder.service_time) || "-"} - ${
          formatDisplayTime(format(end, "h:mm a").toUpperCase()) || "-"
        }`,
        `Duracion: ${durationMinutes} min`
      ].join("\n"),
      start,
      end
    };
  });
}

function transformAppointmentsToEvents(appointments) {
  return appointments
    .filter((appointment) => !isConvertedAppointmentRecord(appointment))
    .map((appointment) => {
      const start = parseServiceOrderStart(
        appointment.appointment_date,
        appointment.appointment_time
      );
      const durationMinutes = resolveDurationMinutes(appointment.duration_minutes);
      const end = addMinutes(start, durationMinutes);
      const technicianColor = getTechnicianColorToken(appointment.technician_name);
      const clientName = getClientDisplayName(appointment.clients);
      const effectiveLocation = resolveEffectiveServiceLocation(appointment);
      const branchName = effectiveLocation.name || uiText.dashboard.branchEmpty;
      const title = appointment.title || clientName;
      const status = appointment.status || "pending";
      const isConvertedAppointment = isConvertedAppointmentRecord(appointment);

      return {
        id: `appointment-${appointment.id}`,
        type: "appointment",
        appointmentId: appointment.id,
        resource: appointment,
        appointment,
        title,
        clientName: title,
        branchName,
        locationAddress: effectiveLocation.address,
        locationPhone: effectiveLocation.phone,
        locationContact: effectiveLocation.contact,
        isOneOffLocation: effectiveLocation.isOneOff,
        technician: appointment.technician_name,
        technicianDisplayName: getTechnicianDisplayName(appointment.technician_name),
        status,
        appointmentStatus: status,
        serviceOrderId: appointment.service_order_id,
        isConvertedAppointment,
        isOverdue: false,
        serviceDate: appointment.appointment_date,
        serviceTime: appointment.appointment_time,
        durationMinutes,
        createdAt: appointment.created_at,
        technicianColor,
        tooltipText: [
          "Cita",
          appointment.service_order_id || appointment.converted_at ? "Convertida a orden" : null,
          `Titulo: ${title || "-"}`,
          `Cliente: ${clientName || "-"}`,
          `Ubicacion: ${branchName || uiText.dashboard.branchEmpty}`,
          `Tecnico: ${getTechnicianDisplayName(appointment.technician_name)}`,
          `Hora: ${formatDisplayTime(appointment.appointment_time) || "-"} - ${
            formatDisplayTime(format(end, "h:mm a").toUpperCase()) || "-"
          }`,
          `Duracion: ${durationMinutes} min`
        ]
          .filter(Boolean)
          .join("\n"),
        start,
        end
      };
    });
}

function transformProjectedAppointmentSeriesToEvents({
  appointmentSeries,
  appointments,
  appointmentSeriesExceptions,
  visibleRangeStart,
  visibleRangeEnd
}) {
  const materializedAppointmentKeys = new Set(
    (appointments || [])
      .filter((appointment) => appointment.series_id)
      .map(
        (appointment) =>
          getAppointmentOccurrenceKey(
            appointment.series_id,
            appointment.appointment_date,
            appointment.appointment_time
          )
      )
  );
  const deletedOccurrenceKeys = getSuppressedAppointmentOccurrenceKeys(appointmentSeriesExceptions);

  return (appointmentSeries || []).flatMap((series) => {
    if (series.status && series.status !== "active") {
      return [];
    }

    const occurrenceDates = expandRecurringAppointmentDates({
      startDateValue: series.start_date,
      recurrenceType: series.recurrence_type,
      recurrenceInterval: series.recurrence_interval,
      recurrenceDays: series.recurrence_days,
      recurrenceEndDateValue: series.recurrence_end_date,
      rangeStartValue: formatDateOnly(visibleRangeStart),
      rangeEndValue: formatDateOnly(visibleRangeEnd)
    });

    return occurrenceDates
      .filter(
        (appointmentDate) => {
          const occurrenceKey = getAppointmentOccurrenceKey(
            series.id,
            appointmentDate,
            series.start_time
          );

          return (
            !materializedAppointmentKeys.has(occurrenceKey) &&
            !deletedOccurrenceKeys.has(occurrenceKey)
          );
        }
      )
      .map((appointmentDate) => {
        const start = parseServiceOrderStart(appointmentDate, series.start_time);
        const durationMinutes = resolveDurationMinutes(series.duration_minutes);
        const end = addMinutes(start, durationMinutes);
        const clientName = getClientDisplayName(series.clients);
        const effectiveLocation = resolveEffectiveServiceLocation(series);
        const branchName = effectiveLocation.name || uiText.dashboard.branchEmpty;
        const title = series.title || clientName;

        return {
          id: `projected-${series.id}-${appointmentDate}-${String(series.start_time || "").replace(/\s+/g, "")}`,
          type: "projected_appointment",
          seriesId: series.id,
          resource: series,
          appointmentSeries: series,
          title,
          clientName: title,
          branchName,
          locationAddress: effectiveLocation.address,
          locationPhone: effectiveLocation.phone,
          locationContact: effectiveLocation.contact,
          isOneOffLocation: effectiveLocation.isOneOff,
          technician: series.technician_name,
          technicianDisplayName: getTechnicianDisplayName(series.technician_name),
          status: "projected",
          appointmentStatus: "projected",
          isProjectedAppointment: true,
          isOverdue: false,
          serviceDate: appointmentDate,
          serviceTime: series.start_time,
          durationMinutes,
          createdAt: null,
          technicianColor: getTechnicianColorToken(series.technician_name),
          tooltipText: [
            "Cita recurrente proyectada",
            `Titulo: ${title || "-"}`,
            `Cliente: ${clientName || "-"}`,
            `Ubicacion: ${branchName || uiText.dashboard.branchEmpty}`,
            `Tecnico: ${getTechnicianDisplayName(series.technician_name)}`,
            `Hora: ${formatDisplayTime(series.start_time) || "-"} - ${
              formatDisplayTime(format(end, "h:mm a").toUpperCase()) || "-"
            }`,
            `Duracion: ${durationMinutes} min`
          ].join("\n"),
          start,
          end
        };
      });
  });
}

function mergeCalendarEvents(
  serviceOrders,
  appointments,
  projectedAppointmentEvents = [],
  appointmentSeriesExceptions = []
) {
  const realAppointmentOccurrenceKeys = new Set(
    (appointments || [])
      .filter((appointment) => appointment.series_id)
      .map((appointment) =>
        getAppointmentOccurrenceKey(
          appointment.series_id,
          appointment.appointment_date,
          appointment.appointment_time
        )
      )
  );
  const deletedOccurrenceKeys = getSuppressedAppointmentOccurrenceKeys(appointmentSeriesExceptions);
  const visibleProjectedAppointmentEvents = (projectedAppointmentEvents || []).filter(
    (projectedEvent) => {
      const occurrenceKey = getAppointmentOccurrenceKey(
        projectedEvent.seriesId,
        projectedEvent.serviceDate,
        projectedEvent.serviceTime
      );

      return (
        !realAppointmentOccurrenceKeys.has(occurrenceKey) &&
        !deletedOccurrenceKeys.has(occurrenceKey)
      );
    }
  );

  return [
    ...transformServiceOrdersToEvents(serviceOrders || []),
    ...transformAppointmentsToEvents(appointments || []),
    ...visibleProjectedAppointmentEvents
  ];
}

function getClientDisplayName(client) {
  if (!client) {
    return uiText.dashboard.detailFields.clientName;
  }

  return (
    client.displayName ||
    client.trade_name ||
    client.business_name ||
    client.name ||
    uiText.dashboard.detailFields.clientName
  );
}

function normalizeClientRecord(client) {
  return {
    ...client,
    displayName: getClientDisplayName(client)
  };
}

function getClientTypeLabel(clientType) {
  return uiText.clients.typeOptions[clientType] || uiText.clients.typeOptions.undefined;
}

function getTechnicianDisplayName(technicianName) {
  return technicianName || uiText.dashboard.calendarTechnicianFallback;
}

function getAppointmentRecurrenceTypeLabel(recurrenceType) {
  const normalizedType = normalizeRecurrenceType(recurrenceType);

  if (normalizedType === "weekdays") {
    return "Días hábiles";
  }

  if (normalizedType === "custom") {
    return "Personalizada";
  }

  return uiText.serviceOrder.recurrenceOptions[normalizedType] || "Recurrente";
}

function getTechnicianColorToken(technicianName) {
  const normalizedName = String(technicianName || "").trim().toLowerCase();

  if (!normalizedName) {
    return {
      background: "#edf2f7",
      border: "#d7e0ea",
      accent: "#64748b",
      text: "#334155"
    };
  }

  let hash = 0;

  for (let index = 0; index < normalizedName.length; index += 1) {
    hash = (hash * 31 + normalizedName.charCodeAt(index)) >>> 0;
  }

  return technicianColorPalette[hash % technicianColorPalette.length];
}

function isResidentialClient(clientType) {
  return clientType === "residential";
}

function resolvePreferredBranch(branches) {
  if (!branches || branches.length === 0) {
    return null;
  }

  const principalBranch = branches.find(
    (branch) => String(branch.name || "").trim().toLowerCase() === "principal"
  );

  if (principalBranch) {
    return principalBranch;
  }

  if (branches.length === 1) {
    return branches[0];
  }

  return branches[0];
}

function getServiceTimeFromCalendarSlot(slotDate, calendarView, serviceTimeOptions) {
  if (!slotDate || !isValid(slotDate) || calendarView === "month") {
    return initialFormState.serviceTime;
  }

  const rawValue = format(slotDate, "h:mm a").toUpperCase();
  const matchingOption = serviceTimeOptions.find(
    (timeOption) => timeOption.value === rawValue
  );

  if (matchingOption?.value) {
    return matchingOption.value;
  }

  const slotMinutes = slotDate.getHours() * 60 + slotDate.getMinutes();
  const nearestTimeOption = serviceTimeOptions.reduce((closestOption, timeOption) => {
    const optionMinutes = parseTimeOptionToMinutes(timeOption.value);

    if (optionMinutes === null) {
      return closestOption;
    }

    if (!closestOption) {
      return {
        value: timeOption.value,
        distance: Math.abs(optionMinutes - slotMinutes)
      };
    }

    const optionDistance = Math.abs(optionMinutes - slotMinutes);

    return optionDistance < closestOption.distance
      ? {
          value: timeOption.value,
          distance: optionDistance
        }
      : closestOption;
  }, null);

  debugLog("[Backlog DnD Debug] normalized slot to nearest service time option:", {
    rawValue,
    slotMinutes,
    nearestTimeOption: nearestTimeOption?.value || null
  });

  return nearestTimeOption?.value || initialFormState.serviceTime;
}

function getServiceDateFromCalendarSlot(slotDate) {
  if (!slotDate || !isValid(slotDate)) {
    return getTodayDateString();
  }

  return format(slotDate, "yyyy-MM-dd");
}

function getServiceTimeFromDropTarget(dropStart, currentServiceTime, currentView, serviceTimeOptions) {
  if (!dropStart || !isValid(dropStart)) {
    return currentServiceTime || initialFormState.serviceTime;
  }

  if (currentView === "month") {
    return currentServiceTime || initialFormState.serviceTime;
  }

  return getServiceTimeFromCalendarSlot(dropStart, currentView, serviceTimeOptions);
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function buildExternalDragPreview(serviceOrder) {
  if (!serviceOrder?.service_date || !serviceOrder?.service_time) {
    return null;
  }

  const start = parseServiceOrderStart(serviceOrder.service_date, serviceOrder.service_time);

  if (!isValid(start)) {
    return null;
  }

  const durationMinutes = resolveDurationMinutes(serviceOrder.duration_minutes);

  return {
    id: serviceOrder.id,
    title: getClientDisplayName(serviceOrder.clients),
    start,
    end: addMinutes(start, durationMinutes),
    allDay: false
  };
}

function getBranchDisplayName(branch) {
  return branch?.name || uiText.dashboard.branchEmpty;
}

function getBranchSummary(branch) {
  if (!branch) {
    return uiText.dashboard.branchEmpty;
  }

  return [branch.address, branch.contact, branch.phone].filter(Boolean).join(" | ");
}

function buildServiceLocationOverridePayload(orderState) {
  if (!orderState?.isOneOffLocation) {
    return {
      is_one_off_location: false,
      service_location_name: null,
      service_location_address: null,
      service_location_phone: null,
      service_location_contact: null
    };
  }

  return {
    is_one_off_location: true,
    service_location_name: (orderState.serviceLocationName || "").trim() || null,
    service_location_address: (orderState.serviceLocationAddress || "").trim() || null,
    service_location_phone: (orderState.serviceLocationPhone || "").trim() || null,
    service_location_contact: (orderState.serviceLocationContact || "").trim() || null
  };
}

function getServiceLocationSummary(serviceOrder) {
  const effectiveLocation = resolveEffectiveServiceLocation(serviceOrder);

  return (
    [effectiveLocation.address, effectiveLocation.contact, effectiveLocation.phone]
      .filter(Boolean)
      .join(" | ") || uiText.dashboard.branchEmpty
  );
}

function formatCreatedAt(createdAt) {
  if (!createdAt) {
    return "N/A";
  }

  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return format(parsedDate, "d MMM yyyy", { locale: es });
}

function formatCompletedAt(completedAt) {
  if (!completedAt) {
    return "N/A";
  }

  const parsedDate = new Date(completedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return format(parsedDate, "d MMM yyyy, h:mm a", { locale: es });
}

function formatDateTimeLocalValue(dateTimeValue) {
  if (!dateTimeValue) {
    return "";
  }

  const parsedDate = new Date(dateTimeValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return format(parsedDate, "yyyy-MM-dd'T'HH:mm");
}

function parseDateTimeLocalValue(dateTimeValue) {
  if (!dateTimeValue) {
    return null;
  }

  const parsedDate = new Date(dateTimeValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

function getTodayDateString() {
  return format(new Date(), "yyyy-MM-dd");
}

function formatServiceDate(serviceDate) {
  if (!serviceDate) {
    return "N/A";
  }

  const parsedDate = parse(serviceDate, "yyyy-MM-dd", new Date());

  if (!isValid(parsedDate)) {
    return serviceDate;
  }

  return format(parsedDate, "d MMM yyyy", { locale: es });
}

function formatServiceDateTimeSummary(serviceDate, serviceTime) {
  if (!serviceDate) {
    return "-";
  }

  const formattedDate = formatServiceDate(serviceDate);
  const formattedTime = formatDisplayTime(serviceTime);

  return formattedTime ? `${formattedDate} · ${formattedTime}` : formattedDate;
}

function buildDefaultBranchPayload(client, companyId) {
  return {
    company_id: companyId,
    client_id: client.id,
    name: "Principal",
    address: client.main_address || "",
    phone: client.main_phone || "",
    contact: client.main_contact || "",
    notes: ""
  };
}

function buildStructuredAddress({
  street,
  streetNumber,
  city,
  state,
  postalCode,
  reference
}) {
  const primaryLine = [street, streetNumber].filter(Boolean).join(" ");
  const localityLine = [city, state, postalCode].filter(Boolean).join(", ");

  return [primaryLine, localityLine, reference].filter(Boolean).join(" | ");
}

function buildCompanySettingsFormState(company) {
  return {
    name: company?.name || "",
    businessName: company?.business_name || "",
    taxId: company?.tax_id || "",
    mainPhone: company?.main_phone || "",
    mainEmail: company?.main_email || "",
    mainContact: company?.main_contact || "",
    addressLine1: company?.address_line_1 || "",
    addressLine2: company?.address_line_2 || "",
    city: company?.city || "",
    state: company?.state || "",
    postalCode: company?.postal_code || "",
    country: company?.country || "",
    logoUrl: company?.logo_url || ""
  };
}

function EventCard({
  event,
  view,
  onSelect,
  isSelected,
  onComplete
}) {
  const isCompleted = event.status === "completed";
  const isAppointment = event.type === "appointment";
  const isProjectedAppointment = event.type === "projected_appointment";
  const isCalendarAppointment = isAppointment || isProjectedAppointment;

  if (view === "month") {
    return (
      <div
        className={`calendar-event calendar-event-month${
          isSelected ? " calendar-event-selected" : ""
        }${isCalendarAppointment ? " calendar-event-appointment" : ""}${
          isProjectedAppointment ? " calendar-event-appointment-projected" : ""
        }${event.isConvertedAppointment ? " calendar-event-appointment-converted" : ""}`}
        title={event.tooltipText}
        data-calendar-event-id={event.id}
        data-service-order-id={event.type === "service_order" ? event.id : undefined}
        data-appointment-id={event.type === "appointment" ? event.appointmentId : undefined}
        data-appointment-series-id={isProjectedAppointment ? event.seriesId : undefined}
        onClick={() => {
          debugLog("[Calendar Event Debug] EventCard onClick:", event);
          onSelect?.(event);
        }}
      >
        <span
          className="calendar-event-dot"
          style={{
            backgroundColor: isCalendarAppointment
              ? event.isConvertedAppointment
                ? "#64748b"
                : isProjectedAppointment
                  ? "#cbd5e1"
                  : "#94a3b8"
              : event.technicianColor.accent
          }}
        />
        {event.isOverdue ? <span className="calendar-event-overdue-dot" /> : null}
      </div>
    );
  }

  return (
    <div
      className={`calendar-event calendar-event-week${
        isSelected ? " calendar-event-selected" : ""
      }${isCompleted ? " calendar-event-completed" : ""}${
        isCalendarAppointment ? " calendar-event-appointment" : ""
      }${
        isProjectedAppointment ? " calendar-event-appointment-projected" : ""
      }${event.isConvertedAppointment ? " calendar-event-appointment-converted" : ""}`}
      title={event.tooltipText}
      data-calendar-event-id={event.id}
      data-service-order-id={event.type === "service_order" ? event.id : undefined}
      data-appointment-id={event.type === "appointment" ? event.appointmentId : undefined}
      data-appointment-series-id={isProjectedAppointment ? event.seriesId : undefined}
      onClick={() => {
        debugLog("[Calendar Event Debug] EventCard onClick:", event);
        onSelect?.(event);
      }}
      >
      {!isCalendarAppointment ? (
      <div className="calendar-event-quick-actions" aria-hidden={!isSelected}>
        <button
          type="button"
          className={
            isCompleted
              ? "calendar-event-quick-action calendar-event-quick-action-completed"
              : "calendar-event-quick-action"
          }
          aria-label={isCompleted ? "Marcar como programado" : "Completar servicio"}
          title={isCompleted ? "Marcar como programado" : "Completar servicio"}
          onMouseDown={(nativeEvent) => {
            nativeEvent.stopPropagation();
          }}
          onClick={(nativeEvent) => {
            nativeEvent.preventDefault();
            nativeEvent.stopPropagation();
            debugLog("[Service Order Status Debug] event quick icon clicked:", {
              serviceOrderId: event.id,
              eventStatus: event.status
            });
            onComplete?.(event);
          }}
        >
          <span aria-hidden="true">✓</span>
        </button>
      </div>
      ) : null}
      <div className="calendar-event-week-accent" />
      <div className="calendar-event-week-copy">
        <strong className="calendar-event-week-line-primary">
          {isProjectedAppointment ? "Proyectada: " : isAppointment ? "Cita: " : ""}
          {event.clientName} - {event.branchName || uiText.dashboard.branchEmpty}
        </strong>
        <span className="calendar-event-week-line-secondary">
          {event.technicianDisplayName || uiText.dashboard.calendarTechnicianFallback} -{" "}
          {event.durationMinutes} min
        </span>
      </div>
      {event.isOverdue ? (
        <span className="calendar-event-overdue-badge">
          {uiText.dashboard.overdueLabel}
        </span>
      ) : null}
    </div>
  );
}

function CalendarEventWrapper({ children, event, onSelect }) {
  const pointerStateRef = useRef({
    x: 0,
    y: 0,
    isResizeHandle: false
  });

  if (!isValidElement(children)) {
    return children;
  }

  const handleMouseDownCapture = (nativeEvent) => {
    const targetClassName = String(nativeEvent.target?.className || "");
    const isResizeHandle = targetClassName.includes("rbc-addons-dnd-resize");

    pointerStateRef.current = {
      x: nativeEvent.clientX,
      y: nativeEvent.clientY,
      isResizeHandle
    };

    debugLog("[Service Order Debug] CalendarEventWrapper onMouseDownCapture:", {
      event,
      isResizeHandle,
      targetClassName
    });
  };

  const handleMouseUpCapture = (nativeEvent) => {
    const targetClassName = String(nativeEvent.target?.className || "");
    const currentPointerState = pointerStateRef.current;
    const movedDistance =
      Math.abs(nativeEvent.clientX - currentPointerState.x) +
      Math.abs(nativeEvent.clientY - currentPointerState.y);
    const isResizeHandle =
      currentPointerState.isResizeHandle ||
      targetClassName.includes("rbc-addons-dnd-resize");

    debugLog("[Service Order Debug] CalendarEventWrapper onMouseUpCapture:", {
      event,
      movedDistance,
      isResizeHandle,
      targetClassName
    });

    if (isResizeHandle || movedDistance > 6) {
      return;
    }

    debugLog("[Service Order Debug] CalendarEventWrapper selecting event:", event);
    onSelect?.(event);
  };

  const handleClickCapture = (nativeEvent) => {
    debugLog("[Service Order Debug] CalendarEventWrapper onClickCapture:", {
      event,
      targetClassName: String(nativeEvent.target?.className || "")
    });
  };

  // Keep the custom event renderer output intact and only attach the tooltip
  // metadata at the wrapper level so Month and Week can render differently.
  return cloneElement(children, {
    title: event.tooltipText,
    "data-calendar-event-id": event.id,
    "data-service-order-id": event.type === "service_order" ? event.id : undefined,
    "data-appointment-id": event.type === "appointment" ? event.appointmentId : undefined,
    "data-appointment-series-id":
      event.type === "projected_appointment" ? event.seriesId : undefined,
    onMouseDownCapture: (nativeEvent) => {
      children.props.onMouseDownCapture?.(nativeEvent);
      handleMouseDownCapture(nativeEvent);
    },
    onMouseUpCapture: (nativeEvent) => {
      children.props.onMouseUpCapture?.(nativeEvent);
      handleMouseUpCapture(nativeEvent);
    },
    onClickCapture: (nativeEvent) => {
      children.props.onClickCapture?.(nativeEvent);
      handleClickCapture(nativeEvent);
    }
  });
}

function CalendarToolbar({ date, label, localizer, onNavigate, onView, view, views }) {
  const viewNames = Array.isArray(views) ? views : Object.keys(views || {});
  const messages = localizer.messages;
  const normalizedDate = startOfDay(date || new Date());
  const today = startOfDay(new Date());

  let visibleRangeStart = normalizedDate;
  let visibleRangeEnd = normalizedDate;

  if (view === "month") {
    visibleRangeStart = startOfWeek(normalizedDate, { weekStartsOn: 0 });
    visibleRangeEnd = addDays(visibleRangeStart, 41);
  } else if (view === operationalCalendarView) {
    const operationalRange = getOperationalRange(normalizedDate);
    visibleRangeStart = operationalRange[0];
    visibleRangeEnd = operationalRange[operationalRange.length - 1];
  } else {
    visibleRangeStart = startOfWeek(normalizedDate, { weekStartsOn: 0 });
    visibleRangeEnd = addDays(visibleRangeStart, 6);
  }

  const isTodayVisible =
    today.getTime() >= visibleRangeStart.getTime() &&
    today.getTime() <= visibleRangeEnd.getTime();

  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-zone calendar-toolbar-zone-left">
        <div className="calendar-toolbar-group segmented-control calendar-segmented-control">
          <button
            type="button"
            className="segmented-control-option calendar-segmented-control-option calendar-segmented-control-option-icon"
            onClick={() => onNavigate("PREV")}
            aria-label={messages.previous}
          >
            ‹
          </button>
          <button
            type="button"
            className={
              isTodayVisible
                ? "segmented-control-option calendar-segmented-control-option segmented-control-option-active"
                : "segmented-control-option calendar-segmented-control-option"
            }
            onClick={() => onNavigate("TODAY")}
          >
            {messages.today}
          </button>
          <button
            type="button"
            className="segmented-control-option calendar-segmented-control-option calendar-segmented-control-option-icon"
            onClick={() => onNavigate("NEXT")}
            aria-label={messages.next}
          >
            ›
          </button>
        </div>
      </div>

      <div className="calendar-toolbar-zone calendar-toolbar-zone-center">
        <span className="calendar-toolbar-label">{label}</span>
      </div>

      <div className="calendar-toolbar-zone calendar-toolbar-zone-right">
        <div className="calendar-toolbar-group segmented-control calendar-segmented-control">
          {viewNames.map((viewName) => (
            <button
              key={viewName}
              type="button"
              className={
                view === viewName
                  ? "segmented-control-option calendar-segmented-control-option segmented-control-option-active"
                  : "segmented-control-option calendar-segmented-control-option"
              }
              onClick={() => onView(viewName)}
            >
              {messages[viewName]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkspacePanel({
  activeTab,
  clients,
  clientsError,
  isClientsLoading,
  clientForm,
  selectedClientId,
  selectedBranchClientId,
  clientSubTab,
  clientFormError,
  clientFormMessage,
  isSavingClient,
  branchForm,
  branches,
  selectedBranch,
  selectedBranchId,
  branchesError,
  branchFormError,
  branchFormMessage,
  isBranchesLoading,
  isSavingBranch,
  activeTechnicians,
  technicians,
  techniciansError,
  isTechniciansLoading,
  supportsExtendedTechnicianFields,
  technicianSubTab,
  selectedTechnicianId,
  technicianForm,
  technicianFormError,
  technicianFormMessage,
  isSavingTechnician,
  serviceTimeOptions,
  serviceDurationOptions,
  formState,
  selectedFormClient,
  isResidentialFormClient,
  preferredResidentialBranch,
  availableBranches,
  formMessage,
  formError,
  isSavingOrder,
  onFormChange,
  onSubmit,
  onClientFormChange,
  onClientSubmit,
  onClientEdit,
  onClientNew,
  onClientSubTabChange,
  onSelectClientBranches,
  onBranchEdit,
  onBranchNew,
  onBranchFormChange,
  onBranchSubmit,
  onTechnicianEdit,
  onTechnicianNew,
  onTechnicianSubTabChange,
  onTechnicianFormChange,
  onTechnicianSubmit,
  isQuickCreate = false,
  clientSelectRef = null,
  onCancelOrder = null
}) {
  if (activeTab === uiText.tabs.newServiceOrder) {
    const isFormStarted = Boolean(
      formState.clientId ||
        formState.branchId ||
        formState.isOneOffLocation ||
        formState.serviceLocationName.trim() ||
        formState.serviceLocationAddress.trim() ||
        formState.serviceLocationPhone.trim() ||
        formState.serviceLocationContact.trim() ||
        formState.serviceDate ||
        formState.serviceInstructions.trim() ||
        formState.notes.trim() ||
        formState.isRecurring
    );
    const requiredPendingFields = {
      clientId: !formState.clientId,
      branchId:
        !formState.isOneOffLocation &&
        !isResidentialFormClient &&
        Boolean(formState.clientId) &&
        !formState.branchId,
      residentialBranch:
        !formState.isOneOffLocation &&
        isResidentialFormClient &&
        Boolean(formState.clientId) &&
        !preferredResidentialBranch,
      serviceLocationAddress:
        formState.isOneOffLocation && !formState.serviceLocationAddress.trim(),
      serviceDate: !formState.serviceDate,
      serviceTime: !formState.serviceTime,
      durationMinutes: !formState.durationMinutes,
      recurrenceType: formState.isRecurring && !formState.recurrenceType,
      recurrenceInterval:
        formState.isRecurring &&
        formState.recurrenceType !== "weekdays" &&
        !formState.recurrenceInterval
    };
    const isRequiredFieldPending = (fieldName) =>
      Boolean(isFormStarted && requiredPendingFields[fieldName]);
    const getRequiredFieldClassName = (fieldName, baseClassName = "workspace-input-group") =>
      isRequiredFieldPending(fieldName)
        ? `${baseClassName} field-required-pending`
        : baseClassName;
    const renderRequiredHint = (fieldName) =>
      isRequiredFieldPending(fieldName) ? (
        <small className="field-required-pending-copy">Campo requerido</small>
      ) : null;

    return (
      <div className="workspace-section">
        <div className={isQuickCreate ? "workspace-copy workspace-copy-compact" : "workspace-copy"}>
          <h3>{isQuickCreate ? "Nueva cita" : uiText.serviceOrder.title}</h3>
          <p>
            {isQuickCreate
              ? "Completa lo esencial y programa la cita rapidamente. Si aplica, marca la recurrencia desde esta vista."
              : uiText.serviceOrder.description}
          </p>
        </div>

        <form className="workspace-form" onSubmit={onSubmit}>
          <div className={isQuickCreate ? "workspace-section workspace-section-tight" : undefined}>
            <div className="drawer-section detail-section-card workspace-quick-create-card">
              <div className="entity-drawer-section-header">
                <h4 className="drawer-section-title">Programacion</h4>
              </div>

              <div className="workspace-grid service-order-grid">
                <label className={getRequiredFieldClassName("clientId")}>
              <span>{uiText.serviceOrder.fields.client}</span>
              <select
                ref={clientSelectRef}
                name="clientId"
                value={formState.clientId}
                onChange={onFormChange}
                disabled={isSavingOrder || isClientsLoading}
                required
              >
                <option value="">
                  {isClientsLoading
                    ? uiText.serviceOrder.placeholders.clientLoading
                    : uiText.serviceOrder.placeholders.client}
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.displayName}
                  </option>
                ))}
              </select>
              {renderRequiredHint("clientId")}
            </label>

                <div className="workspace-field-wide service-order-location-type">
                  <span>{uiText.serviceOrder.fields.locationType}</span>
                  <div className="service-order-location-options">
                    <label className="service-order-location-option">
                      <input
                        name="locationType"
                        type="radio"
                        value="saved"
                        checked={!formState.isOneOffLocation}
                        onChange={onFormChange}
                        disabled={isSavingOrder}
                      />
                      <span>{uiText.serviceOrder.fields.savedLocation}</span>
                    </label>
                    <label className="service-order-location-option">
                      <input
                        name="locationType"
                        type="radio"
                        value="one_off"
                        checked={formState.isOneOffLocation}
                        onChange={onFormChange}
                        disabled={isSavingOrder}
                      />
                      <span>{uiText.serviceOrder.fields.oneOffLocation}</span>
                    </label>
                  </div>
                </div>

                {!formState.isOneOffLocation && isResidentialFormClient ? (
                  <div
                    className={getRequiredFieldClassName(
                      "residentialBranch",
                      "detail-row workspace-quick-static-field"
                    )}
                  >
                <span>{uiText.serviceOrder.fields.branch}</span>
                <strong>
                  {preferredResidentialBranch
                    ? getBranchDisplayName(preferredResidentialBranch)
                    : uiText.dashboard.branchEmpty}
                </strong>
                <small className="detail-subcopy">
                  {isBranchesLoading
                    ? uiText.serviceOrder.placeholders.branchLoading
                    : preferredResidentialBranch
                    ? uiText.serviceOrder.residentialBranchAuto
                    : uiText.serviceOrder.residentialBranchMissing}
                </small>
                {renderRequiredHint("residentialBranch")}
              </div>
            ) : !formState.isOneOffLocation ? (
                  <label className={getRequiredFieldClassName("branchId")}>
                <span>{uiText.serviceOrder.fields.branch}</span>
                <select
                  name="branchId"
                  value={formState.branchId}
                  onChange={onFormChange}
                  disabled={isSavingOrder || isClientsLoading || !formState.clientId}
                  required={!formState.isOneOffLocation}
                >
                  <option value="">
                    {!formState.clientId
                      ? uiText.serviceOrder.placeholders.branchDisabled
                      : isBranchesLoading
                        ? uiText.serviceOrder.placeholders.branchLoading
                        : uiText.serviceOrder.placeholders.branch}
                  </option>
                  {availableBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {getBranchDisplayName(branch)}
                    </option>
                  ))}
                </select>
                {renderRequiredHint("branchId")}
              </label>
            ) : null}

                <label className={getRequiredFieldClassName("serviceDate")}>
              <span>{uiText.serviceOrder.fields.serviceDate}</span>
              <input
                name="serviceDate"
                type="date"
                value={formState.serviceDate}
                onChange={onFormChange}
                disabled={isSavingOrder}
                required
              />
              {renderRequiredHint("serviceDate")}
            </label>

                <label className={getRequiredFieldClassName("serviceTime")}>
              <span>{uiText.serviceOrder.fields.serviceTime}</span>
              <select
                name="serviceTime"
                value={formState.serviceTime}
                onChange={onFormChange}
                disabled={isSavingOrder}
                required
              >
                <option value="" disabled>
                  {uiText.serviceOrder.placeholders.serviceTime}
                </option>
                {serviceTimeOptions.map((timeOption) => (
                  <option key={timeOption.value} value={timeOption.value}>
                    {timeOption.label}
                  </option>
                ))}
              </select>
              {renderRequiredHint("serviceTime")}
            </label>

                <label className={getRequiredFieldClassName("durationMinutes")}>
              <span>{uiText.serviceOrder.fields.duration}</span>
              <select
                name="durationMinutes"
                value={formState.durationMinutes}
                onChange={onFormChange}
                disabled={isSavingOrder}
                required
              >
                <option value="" disabled>
                  {uiText.serviceOrder.placeholders.duration}
                </option>
                {serviceDurationOptions.map((durationOption) => (
                  <option key={durationOption} value={durationOption}>
                    {durationOption} min
                  </option>
                ))}
              </select>
              {renderRequiredHint("durationMinutes")}
            </label>

                {formState.isOneOffLocation ? (
                  <>
                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.fields.oneOffLocationName}</span>
                      <input
                        name="serviceLocationName"
                        type="text"
                        value={formState.serviceLocationName}
                        onChange={onFormChange}
                        placeholder={uiText.serviceOrder.placeholders.oneOffLocationName}
                        disabled={isSavingOrder}
                      />
                    </label>

                    <label
                      className={getRequiredFieldClassName(
                        "serviceLocationAddress",
                        "workspace-input-group workspace-field-wide"
                      )}
                    >
                      <span>{uiText.serviceOrder.fields.oneOffLocationAddress}</span>
                      <textarea
                        name="serviceLocationAddress"
                        value={formState.serviceLocationAddress}
                        onChange={onFormChange}
                        placeholder={uiText.serviceOrder.placeholders.oneOffLocationAddress}
                        disabled={isSavingOrder}
                        rows={3}
                      />
                      {renderRequiredHint("serviceLocationAddress")}
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.fields.oneOffLocationPhone}</span>
                      <input
                        name="serviceLocationPhone"
                        type="text"
                        value={formState.serviceLocationPhone}
                        onChange={onFormChange}
                        placeholder={uiText.serviceOrder.placeholders.oneOffLocationPhone}
                        disabled={isSavingOrder}
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.fields.oneOffLocationContact}</span>
                      <input
                        name="serviceLocationContact"
                        type="text"
                        value={formState.serviceLocationContact}
                        onChange={onFormChange}
                        placeholder={uiText.serviceOrder.placeholders.oneOffLocationContact}
                        disabled={isSavingOrder}
                      />
                    </label>

                    <p className="detail-subcopy workspace-field-wide">
                      {uiText.serviceOrder.oneOffLocationHint}
                    </p>
                  </>
                ) : null}

                <div className="workspace-field-wide service-order-inline-row">
                  <label className="workspace-checkbox workspace-checkbox-compact service-order-inline-checkbox">
                    <input
                      name="isRecurring"
                      type="checkbox"
                      checked={formState.isRecurring}
                      onChange={onFormChange}
                      disabled={isSavingOrder}
                    />
                    <span>{uiText.serviceOrder.fields.isRecurring}</span>
                  </label>
                  <div className="service-order-inline-meta">
                    <strong>
                      {formState.isRecurring
                        ? uiText.serviceOrder.recurrenceOptions[formState.recurrenceType] ||
                          uiText.serviceOrder.fields.isRecurring
                        : "Visita unica"}
                    </strong>
                    <small className="detail-subcopy">
                      {formState.isRecurring
                        ? "Se crearan citas visibles para los proximos 45 dias, respetando la fecha final si la defines."
                        : "Crea una sola cita en el horario seleccionado."}
                    </small>
                  </div>
                </div>

                {formState.isRecurring ? (
                  <>
                    <label className={getRequiredFieldClassName("recurrenceType")}>
                      <span>{uiText.serviceOrder.fields.recurrenceType}</span>
                      <select
                        name="recurrenceType"
                        value={formState.recurrenceType}
                        onChange={onFormChange}
                        disabled={isSavingOrder}
                        required
                      >
                        <option value="" disabled>
                          {uiText.serviceOrder.placeholders.recurrenceType}
                        </option>
                        <option value="daily">
                          {uiText.serviceOrder.recurrenceOptions.daily}
                        </option>
                        <option value="weekly">
                          {uiText.serviceOrder.recurrenceOptions.weekly}
                        </option>
                        <option value="weekdays">
                          Dias laborales
                        </option>
                        <option value="monthly">
                          {uiText.serviceOrder.recurrenceOptions.monthly}
                        </option>
                        <option value="custom">
                          Personalizado
                        </option>
                      </select>
                      {renderRequiredHint("recurrenceType")}
                    </label>

                    <label className={getRequiredFieldClassName("recurrenceInterval")}>
                      <span>Intervalo</span>
                      <input
                        name="recurrenceInterval"
                        type="number"
                        min="1"
                        value={formState.recurrenceInterval}
                        onChange={onFormChange}
                        disabled={isSavingOrder || formState.recurrenceType === "weekdays"}
                      />
                      {renderRequiredHint("recurrenceInterval")}
                    </label>

                    {["weekly", "custom"].includes(formState.recurrenceType) ? (
                      <div className="workspace-field-wide service-order-location-type">
                        <span>Dias</span>
                        <div className="service-order-location-options">
                          {recurrenceWeekdayOptions.map((dayOption) => (
                            <label
                              key={dayOption.value}
                              className="service-order-location-option"
                            >
                              <input
                                name="recurrenceDays"
                                type="checkbox"
                                value={dayOption.value}
                                checked={formState.recurrenceDays.includes(dayOption.value)}
                                onChange={onFormChange}
                                disabled={isSavingOrder}
                              />
                              <span>{dayOption.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.fields.recurrenceEndDate}</span>
                      <input
                        name="recurrenceEndDate"
                        type="date"
                        value={formState.recurrenceEndDate}
                        onChange={onFormChange}
                        disabled={isSavingOrder}
                      />
                    </label>
                  </>
                ) : null}
              </div>
            </div>

            <div className="drawer-section detail-section-card workspace-quick-create-card">
              <div className="entity-drawer-section-header">
                <h4 className="drawer-section-title">Contexto del servicio</h4>
              </div>

              <div className="workspace-grid">
                <label className="workspace-input-group workspace-field-wide">
                  <span>{uiText.serviceOrder.fields.serviceInstructions}</span>
                  <textarea
                    name="serviceInstructions"
                    value={formState.serviceInstructions}
                    onChange={onFormChange}
                    placeholder={uiText.serviceOrder.placeholders.serviceInstructions}
                    disabled={isSavingOrder}
                    rows={4}
                  />
                </label>

                <label className="workspace-input-group workspace-field-wide service-order-secondary-textarea">
                  <span>{uiText.serviceOrder.fields.notes}</span>
                  <textarea
                    name="notes"
                    value={formState.notes}
                    onChange={onFormChange}
                    placeholder={uiText.serviceOrder.placeholders.notes}
                    disabled={isSavingOrder}
                    rows={3}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="workspace-form-footer">
            <div className="workspace-form-messages">
              {!isClientsLoading && !clientsError && clients.length === 0 ? (
                <p className="empty-hint">{uiText.serviceOrder.clientEmpty}</p>
              ) : null}
              {formState.clientId &&
              !formState.isOneOffLocation &&
              isResidentialFormClient &&
              !isBranchesLoading &&
              !preferredResidentialBranch ? (
                <p className="empty-hint">{uiText.serviceOrder.residentialBranchMissing}</p>
              ) : null}
              {formState.clientId &&
              !formState.isOneOffLocation &&
              !isResidentialFormClient &&
              !isBranchesLoading &&
              availableBranches.length === 0 ? (
                <p className="empty-hint">{uiText.serviceOrder.branchEmpty}</p>
              ) : null}
              {clientsError ? <p className="error">{clientsError}</p> : null}
              {branchesError ? <p className="error">{branchesError}</p> : null}
              {formError ? <p className="error">{formError}</p> : null}
              {formMessage ? <p className="success-message">{formMessage}</p> : null}
            </div>
            <div className={isQuickCreate ? "workspace-actions workspace-actions-split" : "workspace-actions"}>
              {isQuickCreate && onCancelOrder ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={onCancelOrder}
                  disabled={isSavingOrder}
                >
                  {uiText.common.cancel}
                </button>
              ) : null}

              <button
                className={isSavingOrder ? "button is-loading" : "button"}
                type="submit"
                disabled={
                  isSavingOrder ||
                  isClientsLoading ||
                  clients.length === 0 ||
                  (!formState.isOneOffLocation &&
                    ((!isResidentialFormClient && !formState.branchId) ||
                      (isResidentialFormClient && !preferredResidentialBranch))) ||
                  (formState.isOneOffLocation &&
                    !formState.serviceLocationAddress.trim())
                }
              >
                {isSavingOrder ? "Guardando cita..." : "Crear cita"}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (activeTab === uiText.tabs.clients) {
    const clientModuleTabOptions = [
      { value: clientsModuleTabs.summary, label: uiText.clients.moduleTabs.summary },
      { value: clientsModuleTabs.list, label: uiText.clients.moduleTabs.list }
    ];
    const clientSubTabs = [
      uiText.clients.subTabs.list,
      uiText.clients.subTabs.form,
      uiText.clients.subTabs.branches
    ];

    return (
      <div className="workspace-section">
        <div className="workspace-copy">
          <h3>{uiText.clients.title}</h3>
          <p>{uiText.clients.description}</p>
        </div>

        <div className="workspace-subtabs" role="tablist" aria-label={uiText.clients.title}>
          {clientModuleTabOptions.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={clientsModuleTab === tab.value}
              className={
                clientsModuleTab === tab.value
                  ? "workspace-subtab workspace-subtab-active"
                  : "workspace-subtab"
              }
              onClick={() => setClientsModuleTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {clientsModuleTab === clientsModuleTabs.summary ? (
          <div className="workspace-list clients-module-summary">
            <div className="workspace-list-header">
              <h4>Resumen de clientes</h4>
            </div>

            <div className="clients-module-summary-body">
              <div className="client-summary-kpis">
                <div className="detail-static-field">
                  <span>Total clientes</span>
                  <strong>{clientsModuleSummary.totalClients}</strong>
                </div>
                <div className="detail-static-field">
                  <span>Clientes comerciales</span>
                  <strong>{clientsModuleSummary.commercialClients}</strong>
                </div>
                <div className="detail-static-field">
                  <span>Clientes residenciales</span>
                  <strong>{clientsModuleSummary.residentialClients}</strong>
                </div>
                <div className="detail-static-field">
                  <span>Sucursales totales</span>
                  <strong>{clientsModuleSummary.totalBranches}</strong>
                </div>
                <div className="detail-static-field">
                  <span>Citas activas del mes</span>
                  <strong>{clientsModuleSummary.activeAppointmentsThisMonth}</strong>
                </div>
                <div className="detail-static-field">
                  <span>Órdenes del mes</span>
                  <strong>{clientsModuleSummary.serviceOrdersThisMonth}</strong>
                </div>
                <div className="detail-static-field">
                  <span>Órdenes completadas</span>
                  <strong>{clientsModuleSummary.completedOrders}</strong>
                </div>
                <div className="detail-static-field">
                  <span>Órdenes pendientes</span>
                  <strong>{clientsModuleSummary.pendingOrders}</strong>
                </div>
                <div className="detail-static-field">
                  <span>Órdenes vencidas</span>
                  <strong>{clientsModuleSummary.overdueOrders}</strong>
                </div>
                <div className="detail-static-field">
                  <span>Sucursales con actividad</span>
                  <strong>{clientsModuleSummary.branchesWithActivity}</strong>
                </div>
              </div>

              <div className="workspace-grid clients-module-summary-grid">
                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <h4 className="drawer-section-title">Operacion</h4>
                  </div>
                  <div className="detail-section-grid">
                    <div className="detail-row">
                      <span>Clientes con ordenes vencidas</span>
                      <strong>{clientsModuleSummary.clientsWithOverdueOrders}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Clientes con actividad este mes</span>
                      <strong>{clientsModuleSummary.clientsWithActivityThisMonth}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Sucursales con actividad del mes</span>
                      <strong>{clientsModuleSummary.branchesWithActivity}</strong>
                    </div>
                  </div>
                </section>

                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <h4 className="drawer-section-title">Contexto</h4>
                  </div>
                  <p className="detail-subcopy">
                    Este resumen muestra el estado global del modulo de clientes. El
                    resumen del drawer sigue siendo el contexto detallado de un cliente
                    seleccionado.
                  </p>
                </section>
              </div>
            </div>
          </div>
        ) : null}

        {clientsModuleTab === clientsModuleTabs.list ? (
          <>
        <div className="workspace-subtabs" role="tablist" aria-label={uiText.clients.title}>
          {clientSubTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={clientSubTab === tab}
              className={
                clientSubTab === tab
                  ? "workspace-subtab workspace-subtab-active"
                  : "workspace-subtab"
              }
              onClick={() => onClientSubTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {clientSubTab === uiText.clients.subTabs.list ? (
          <div className="workspace-list">
            <div className="workspace-list-header">
              <h4>{uiText.clients.listTitle}</h4>
            </div>

            {isClientsLoading ? (
              <p className="workspace-list-message">{uiText.clients.loading}</p>
            ) : null}

            {!isClientsLoading && clients.length === 0 ? (
              <p className="workspace-list-message">{uiText.clients.empty}</p>
            ) : null}

            {!isClientsLoading && clients.length > 0 ? (
              <div className="workspace-table-wrapper">
                <table className="workspace-table">
                  <thead>
                    <tr>
                      <th>{uiText.clients.headers.name}</th>
                      <th>{uiText.clients.headers.type}</th>
                      <th>{uiText.clients.headers.phone}</th>
                      <th>{uiText.clients.headers.contact}</th>
                      <th>{uiText.clients.headers.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id}>
                        <td>{client.displayName}</td>
                        <td>{getClientTypeLabel(client.client_type)}</td>
                        <td>{client.main_phone || "-"}</td>
                        <td>{client.main_contact || "-"}</td>
                        <td>
                          <div className="workspace-inline-actions">
                            <button
                              className="button button-secondary workspace-table-button"
                              type="button"
                              onClick={() => onClientEdit(client)}
                            >
                              {uiText.clients.edit}
                            </button>
                            <button
                              className="button button-secondary workspace-table-button"
                              type="button"
                              onClick={() => onSelectClientBranches(client)}
                            >
                              {uiText.clients.manageBranches}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}

        {clientSubTab === uiText.clients.subTabs.form ? (
          <>
            <div className="workspace-copy">
              <h3>
                {selectedClientId ? uiText.clients.formEditTitle : uiText.clients.formCreateTitle}
              </h3>
              <p>
                {selectedClientId ? uiText.clients.formEditBody : uiText.clients.formCreateBody}
              </p>
            </div>

            <form className="workspace-form" onSubmit={onClientSubmit}>
              <div className="workspace-grid">
                <label className="workspace-input-group">
                  <span>{uiText.clients.fields.clientType}</span>
                  <select
                    name="clientType"
                    value={clientForm.clientType}
                    onChange={onClientFormChange}
                    disabled={isSavingClient}
                    required
                  >
                    <option value="" disabled>
                      {uiText.clients.placeholders.clientType}
                    </option>
                    <option value="residential">
                      {uiText.clients.typeOptions.residential}
                    </option>
                    <option value="commercial">
                      {uiText.clients.typeOptions.commercial}
                    </option>
                  </select>
                </label>

                <label className="workspace-input-group">
                  <span>{uiText.clients.fields.businessName}</span>
                  <input
                    name="businessName"
                    type="text"
                    value={clientForm.businessName}
                    onChange={onClientFormChange}
                    placeholder={uiText.clients.placeholders.businessName}
                    disabled={isSavingClient}
                    required
                  />
                </label>

                <label className="workspace-input-group">
                  <span>{uiText.clients.fields.tradeName}</span>
                  <input
                    name="tradeName"
                    type="text"
                    value={clientForm.tradeName}
                    onChange={onClientFormChange}
                    placeholder={uiText.clients.placeholders.tradeName}
                    disabled={isSavingClient}
                  />
                </label>

                <label className="workspace-input-group">
                  <span>{uiText.clients.fields.taxId}</span>
                  <input
                    name="taxId"
                    type="text"
                    value={clientForm.taxId}
                    onChange={onClientFormChange}
                    placeholder={uiText.clients.placeholders.taxId}
                    disabled={isSavingClient}
                  />
                </label>

                <label className="workspace-input-group">
                  <span>{uiText.clients.fields.mainPhone}</span>
                  <input
                    name="mainPhone"
                    type="tel"
                    value={clientForm.mainPhone}
                    onChange={onClientFormChange}
                    placeholder={uiText.clients.placeholders.mainPhone}
                    disabled={isSavingClient}
                  />
                </label>

                <label className="workspace-input-group">
                  <span>{uiText.clients.fields.mainContact}</span>
                  <input
                    name="mainContact"
                    type="text"
                    value={clientForm.mainContact}
                    onChange={onClientFormChange}
                    placeholder={uiText.clients.placeholders.mainContact}
                    disabled={isSavingClient}
                  />
                </label>

                <label className="workspace-input-group">
                  <span>{uiText.clients.fields.mainEmail}</span>
                  <input
                    name="mainEmail"
                    type="email"
                    value={clientForm.mainEmail}
                    onChange={onClientFormChange}
                    placeholder={uiText.clients.placeholders.mainEmail}
                    disabled={isSavingClient}
                  />
                </label>

                <label className="workspace-input-group workspace-field-wide">
                  <span>{uiText.clients.fields.mainAddress}</span>
                  <textarea
                    name="mainAddress"
                    value={clientForm.mainAddress}
                    onChange={onClientFormChange}
                    placeholder={uiText.clients.placeholders.mainAddress}
                    disabled={isSavingClient}
                    rows={4}
                  />
                </label>
              </div>

              <div className="workspace-form-footer">
                <div className="workspace-form-messages">
                  {clientsError ? <p className="error">{clientsError}</p> : null}
                  {clientFormError ? <p className="error">{clientFormError}</p> : null}
                  {clientFormMessage ? (
                    <p className="success-message">{clientFormMessage}</p>
                  ) : null}
                </div>

                <div className="workspace-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={onClientNew}
                    disabled={isSavingClient}
                  >
                    {uiText.clients.newClient}
                  </button>

                  <button className="button" type="submit" disabled={isSavingClient}>
                    {isSavingClient
                      ? uiText.clients.saving
                      : selectedClientId
                        ? uiText.clients.update
                        : uiText.clients.save}
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : null}

        {clientSubTab === uiText.clients.subTabs.branches ? (
          <div className="workspace-list">
            <div className="workspace-list-header">
              <h4>{uiText.clients.branchesPanelTitle}</h4>
            </div>

            {!selectedBranchClientId ? (
              <p className="workspace-list-message">{uiText.clients.branchesSelectClient}</p>
            ) : (
              <div className="branch-panel">
                <p className="branch-panel-description">
                  {uiText.clients.branchesPanelBody}
                </p>
                <div className="branch-client-context">
                  <span>{uiText.clients.branchesSelectedClientLabel}</span>
                  <strong>
                    {
                      clients.find((client) => client.id === selectedBranchClientId)
                        ?.displayName
                    }
                  </strong>
                </div>

                {selectedBranch ? (
                  <div className="branch-summary-card">
                    <span>{uiText.clients.branchSelectedSummary}</span>
                    <strong>{getBranchDisplayName(selectedBranch)}</strong>
                    <p>
                      {selectedBranch.address || uiText.clients.branchSummaryFallback}
                    </p>
                    <p>
                      {[selectedBranch.contact, selectedBranch.phone]
                        .filter(Boolean)
                        .join(" | ") || uiText.clients.branchSummaryFallback}
                    </p>
                  </div>
                ) : null}

                <div className="workspace-copy">
                  <h3>
                    {selectedBranchId
                      ? uiText.clients.branchesFormEditTitle
                      : uiText.clients.branchesFormCreateTitle}
                  </h3>
                  <p>
                    {selectedBranchId
                      ? uiText.clients.branchesFormEditBody
                      : uiText.clients.branchesFormCreateBody}
                  </p>
                </div>

                <form className="workspace-form" onSubmit={onBranchSubmit}>
                  <div className="workspace-grid">
                    <label className="workspace-input-group">
                      <span>{uiText.clients.branchFields.name}</span>
                      <input
                        name="name"
                        type="text"
                        value={branchForm.name}
                        onChange={onBranchFormChange}
                        placeholder={uiText.clients.branchPlaceholders.name}
                        disabled={isSavingBranch}
                        required
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.clients.branchFields.phone}</span>
                      <input
                        name="phone"
                        type="text"
                        value={branchForm.phone}
                        onChange={onBranchFormChange}
                        placeholder={uiText.clients.branchPlaceholders.phone}
                        disabled={isSavingBranch}
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.clients.branchFields.contact}</span>
                      <input
                        name="contact"
                        type="text"
                        value={branchForm.contact}
                        onChange={onBranchFormChange}
                        placeholder={uiText.clients.branchPlaceholders.contact}
                        disabled={isSavingBranch}
                      />
                    </label>

                    <label className="workspace-input-group workspace-field-wide">
                      <span>{uiText.clients.branchFields.address}</span>
                      <textarea
                        name="address"
                        value={branchForm.address}
                        onChange={onBranchFormChange}
                        placeholder={uiText.clients.branchPlaceholders.address}
                        disabled={isSavingBranch}
                        rows={3}
                      />
                    </label>

                    <label className="workspace-input-group workspace-field-wide">
                      <span>{uiText.clients.branchFields.notes}</span>
                      <textarea
                        name="notes"
                        value={branchForm.notes}
                        onChange={onBranchFormChange}
                        placeholder={uiText.clients.branchPlaceholders.notes}
                        disabled={isSavingBranch}
                        rows={4}
                      />
                    </label>
                  </div>

                  <div className="workspace-form-footer">
                    <div className="workspace-form-messages">
                      {branchesError ? <p className="error">{branchesError}</p> : null}
                      {branchFormError ? <p className="error">{branchFormError}</p> : null}
                      {branchFormMessage ? (
                        <p className="success-message">{branchFormMessage}</p>
                      ) : null}
                    </div>

                    <div className="workspace-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={onBranchNew}
                        disabled={isSavingBranch}
                      >
                        {uiText.clients.branchNew}
                      </button>

                      <button className="button" type="submit" disabled={isSavingBranch}>
                        {isSavingBranch
                          ? uiText.clients.branchSaving
                          : selectedBranchId
                            ? uiText.clients.branchUpdate
                            : uiText.clients.branchSave}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="workspace-list branch-list">
                  <div className="workspace-list-header">
                    <h4>{uiText.clients.branchListTitle}</h4>
                  </div>

                  {isBranchesLoading ? (
                    <p className="workspace-list-message">{uiText.clients.branchesLoading}</p>
                  ) : null}

                  {!isBranchesLoading && branches.length === 0 ? (
                    <p className="workspace-list-message">{uiText.clients.branchesEmptyState}</p>
                  ) : null}

                  {!isBranchesLoading && branches.length > 0 ? (
                    <div className="workspace-table-wrapper">
                      <table className="workspace-table">
                        <thead>
                          <tr>
                            <th>{uiText.clients.branchHeaders.name}</th>
                            <th>{uiText.clients.branchHeaders.address}</th>
                            <th>{uiText.clients.branchHeaders.phone}</th>
                            <th>{uiText.clients.branchHeaders.contact}</th>
                            <th>{uiText.clients.branchHeaders.actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branches.map((branch) => (
                            <tr
                              key={branch.id}
                              className={
                                branch.id === selectedBranchId
                                  ? "workspace-table-row-action workspace-table-row-selected"
                                  : "workspace-table-row-action"
                              }
                              onClick={() => onBranchEdit(branch)}
                            >
                              <td>{getBranchDisplayName(branch)}</td>
                              <td>{branch.address || "-"}</td>
                              <td>{branch.phone || "-"}</td>
                              <td>
                                {branch.contact || "-"}
                              </td>
                              <td>
                                <button
                                  className="button button-secondary workspace-table-button"
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onBranchEdit(branch);
                                  }}
                                >
                                  {uiText.clients.branchEdit}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : null}
          </>
        ) : null}
      </div>
    );
  }

  if (activeTab === uiText.tabs.technicians) {
    const technicianSubTabs = [
      uiText.technicians.subTabs.list,
      uiText.technicians.subTabs.form
    ];

    return (
      <div className="workspace-section">
        <div className="workspace-copy">
          <h3>{uiText.technicians.title}</h3>
          <p>{uiText.technicians.description}</p>
        </div>

        <div className="workspace-subtabs" role="tablist" aria-label={uiText.technicians.title}>
          {technicianSubTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={technicianSubTab === tab}
              className={
                technicianSubTab === tab
                  ? "workspace-subtab workspace-subtab-active"
                  : "workspace-subtab"
              }
              onClick={() => onTechnicianSubTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {technicianSubTab === uiText.technicians.subTabs.list ? (
          <div className="workspace-list">
            <div className="workspace-list-header">
              <h4>{uiText.technicians.listTitle}</h4>
            </div>

            {isTechniciansLoading ? (
              <p className="workspace-list-message">{uiText.technicians.loading}</p>
            ) : null}

            {!isTechniciansLoading && technicians.length === 0 ? (
              <p className="workspace-list-message">{uiText.technicians.empty}</p>
            ) : null}

            {!isTechniciansLoading && technicians.length > 0 ? (
              <div className="workspace-table-wrapper">
                <table className="workspace-table">
                  <thead>
                    <tr>
                      <th>{uiText.technicians.headers.fullName}</th>
                      <th>{uiText.technicians.headers.phone}</th>
                      <th>{uiText.technicians.headers.status}</th>
                      <th>{uiText.clients.headers.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {technicians.map((technician) => (
                      <tr
                        key={technician.id}
                        className="workspace-table-row-action"
                        onClick={() => onTechnicianEdit(technician)}
                      >
                        <td>{technician.full_name}</td>
                        <td>{technician.phone || "-"}</td>
                        <td>
                          {technician.is_active
                            ? uiText.technicians.active
                            : uiText.technicians.inactive}
                        </td>
                        <td>
                          <button
                            className="button button-secondary workspace-table-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onTechnicianEdit(technician);
                            }}
                          >
                            {uiText.technicians.edit}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="workspace-copy">
              <h3>
                {selectedTechnicianId
                  ? uiText.technicians.formEditTitle
                  : uiText.technicians.formCreateTitle}
              </h3>
              <p>
                {selectedTechnicianId
                  ? uiText.technicians.formEditBody
                  : uiText.technicians.formCreateBody}
              </p>
            </div>

            <form className="workspace-form" onSubmit={onTechnicianSubmit}>
              <div className="workspace-grid">
                <label className="workspace-input-group">
                  <span>{uiText.technicians.fields.fullName}</span>
                  <input
                    name="fullName"
                    type="text"
                    value={technicianForm.fullName}
                    onChange={onTechnicianFormChange}
                    placeholder={uiText.technicians.placeholders.fullName}
                    disabled={isSavingTechnician}
                    required
                  />
                </label>

                <label className="workspace-input-group">
                  <span>{uiText.technicians.fields.phone}</span>
                  <input
                    name="phone"
                    type="text"
                    value={technicianForm.phone}
                    onChange={onTechnicianFormChange}
                    placeholder={uiText.technicians.placeholders.phone}
                    disabled={isSavingTechnician || !supportsExtendedTechnicianFields}
                  />
                </label>

                <label className="workspace-input-group workspace-field-wide">
                  <span>{uiText.technicians.fields.address}</span>
                  <textarea
                    name="address"
                    value={technicianForm.address}
                    onChange={onTechnicianFormChange}
                    placeholder={uiText.technicians.placeholders.address}
                    disabled={isSavingTechnician || !supportsExtendedTechnicianFields}
                    rows={3}
                  />
                </label>

                <label className="workspace-input-group workspace-field-wide">
                  <span>{uiText.technicians.fields.notes}</span>
                  <textarea
                    name="notes"
                    value={technicianForm.notes}
                    onChange={onTechnicianFormChange}
                    placeholder={uiText.technicians.placeholders.notes}
                    disabled={isSavingTechnician || !supportsExtendedTechnicianFields}
                    rows={4}
                  />
                </label>

                <label className="workspace-checkbox">
                  <input
                    name="isActive"
                    type="checkbox"
                    checked={technicianForm.isActive}
                    onChange={onTechnicianFormChange}
                    disabled={isSavingTechnician}
                  />
                  <span>{uiText.technicians.fields.isActive}</span>
                </label>
              </div>

              <div className="workspace-form-footer">
                <div className="workspace-form-messages">
                  {techniciansError ? <p className="error">{techniciansError}</p> : null}
                  {!supportsExtendedTechnicianFields ? (
                    <p className="empty-hint">{uiText.technicians.schemaWarning}</p>
                  ) : null}
                  {technicianFormError ? <p className="error">{technicianFormError}</p> : null}
                  {technicianFormMessage ? (
                    <p className="success-message">{technicianFormMessage}</p>
                  ) : null}
                </div>

                <div className="workspace-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={onTechnicianNew}
                    disabled={isSavingTechnician}
                  >
                    {uiText.technicians.newTechnician}
                  </button>

                  <button className="button" type="submit" disabled={isSavingTechnician}>
                    {isSavingTechnician
                      ? uiText.technicians.saving
                      : selectedTechnicianId
                        ? uiText.technicians.update
                        : uiText.technicians.save}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="workspace-section">
      <div className="workspace-copy">
        <h3>{uiText.reports.title}</h3>
        <p>{uiText.reports.description}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  // These fixed values can later come from settings in Supabase or another admin source.
  const serviceTimeOptions = generateTimeSlots(3, 22, 60);
  const durationOptions = serviceDurationOptions;
  const [authUserId, setAuthUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileResolved, setIsProfileResolved] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentSeries, setAppointmentSeries] = useState([]);
  const [appointmentSeriesExceptions, setAppointmentSeriesExceptions] = useState([]);
  const [calendarError, setCalendarError] = useState("");
  const [calendarActionMessage, setCalendarActionMessage] = useState("");
  const [calendarActionError, setCalendarActionError] = useState("");
  const [pastDateAlertMessage, setPastDateAlertMessage] = useState("");
  const [isServiceOrdersLoading, setIsServiceOrdersLoading] = useState(false);
  const [calendarView, setCalendarView] = useState(operationalCalendarView);
  const [calendarDate, setCalendarDate] = useState(() => startOfDay(new Date()));
  const [activeTopLevelTab, setActiveTopLevelTab] = useState(dashboardTabs.calendar);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeAdminView, setActiveAdminView] = useState(adminViewTabs.calendar);
  const [selectedCalendarTechnicians, setSelectedCalendarTechnicians] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [companySettingsForm, setCompanySettingsForm] = useState(initialCompanySettingsForm);
  const [companySettingsError, setCompanySettingsError] = useState("");
  const [companySettingsMessage, setCompanySettingsMessage] = useState("");
  const [isSavingCompanySettings, setIsSavingCompanySettings] = useState(false);
  const [draggedBacklogServiceOrder, setDraggedBacklogServiceOrder] = useState(null);
  const [serviceListClientSearch, setServiceListClientSearch] = useState("");
  const [serviceListRecurring, setServiceListRecurring] = useState("all");
  const [clientSidebarSearch, setClientSidebarSearch] = useState("");
  const [clientSidebarType, setClientSidebarType] = useState("all");
  const [technicianSidebarStatus, setTechnicianSidebarStatus] = useState("all");
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [selectedServiceOrderId, setSelectedServiceOrderId] = useState(null);
  const [selectedServiceOrderSnapshot, setSelectedServiceOrderSnapshot] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rightPanelMode, setRightPanelMode] = useState(rightPanelModes.empty);
  const [activeTab] = useState(uiText.tabs.newServiceOrder);
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState("");
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [clientsModuleTab, setClientsModuleTab] = useState(defaultClientsModuleTab);
  const [clientSubTab, setClientSubTab] = useState(defaultClientSubTab);
  const [clientForm, setClientForm] = useState(initialClientFormState);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [expandedClientIds, setExpandedClientIds] = useState({});
  const [activeEntityType, setActiveEntityType] = useState(null);
  const [activeEntityId, setActiveEntityId] = useState(null);
  const [activeParentClientId, setActiveParentClientId] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [activeClientDrawerTab, setActiveClientDrawerTab] = useState(clientDrawerTabs.client);
  const [clientDrawerForm, setClientDrawerForm] = useState(initialClientDrawerForm);
  const [clientDrawerError, setClientDrawerError] = useState("");
  const [clientDrawerMessage, setClientDrawerMessage] = useState("");
  const [isSavingClientDrawer, setIsSavingClientDrawer] = useState(false);
  const [isConfirmingDeleteClient, setIsConfirmingDeleteClient] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [clientDeleteImpact, setClientDeleteImpact] = useState({
    branches: 0,
    contacts: 0
  });
  const [contactsByClientId, setContactsByClientId] = useState({});
  const [contactsError, setContactsError] = useState("");
  const [contactsMessage, setContactsMessage] = useState("");
  const [isContactsLoading, setIsContactsLoading] = useState(false);
  const [activeContactId, setActiveContactId] = useState(null);
  const [contactDrawerForm, setContactDrawerForm] = useState(initialContactDrawerForm);
  const [contactDrawerError, setContactDrawerError] = useState("");
  const [isSavingContactDrawer, setIsSavingContactDrawer] = useState(false);
  const [activeBranchFormId, setActiveBranchFormId] = useState(null);
  const [drawerBranchForm, setDrawerBranchForm] = useState(initialBranchFormState);
  const [drawerBranchError, setDrawerBranchError] = useState("");
  const [drawerBranchMessage, setDrawerBranchMessage] = useState("");
  const [isSavingDrawerBranch, setIsSavingDrawerBranch] = useState(false);
  const [isConfirmingDeleteBranch, setIsConfirmingDeleteBranch] = useState(false);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);
  const [selectedBranchClientId, setSelectedBranchClientId] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [clientFormMessage, setClientFormMessage] = useState("");
  const [clientFormError, setClientFormError] = useState("");
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientModalState, setClientModalState] = useState(initialQuickClientState);
  const [clientModalError, setClientModalError] = useState("");
  const [isSavingClientModal, setIsSavingClientModal] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchModalState, setBranchModalState] = useState(initialQuickBranchState);
  const [branchModalError, setBranchModalError] = useState("");
  const [isSavingBranchModal, setIsSavingBranchModal] = useState(false);
  const [pendingBranchClient, setPendingBranchClient] = useState(null);
  const [branchForm, setBranchForm] = useState(initialBranchFormState);
  const [branchesByClientId, setBranchesByClientId] = useState({});
  const [allClientBranches, setAllClientBranches] = useState([]);
  const [branchesError, setBranchesError] = useState("");
  const [branchFormMessage, setBranchFormMessage] = useState("");
  const [branchFormError, setBranchFormError] = useState("");
  const [isBranchesLoading, setIsBranchesLoading] = useState(false);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [techniciansError, setTechniciansError] = useState("");
  const [isTechniciansLoading, setIsTechniciansLoading] = useState(false);
  const [technicianSubTab, setTechnicianSubTab] = useState(defaultTechnicianSubTab);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(null);
  const [technicianDrawerMode, setTechnicianDrawerMode] = useState(null);
  const [technicianForm, setTechnicianForm] = useState(initialTechnicianFormState);
  const [technicianFormMessage, setTechnicianFormMessage] = useState("");
  const [technicianFormError, setTechnicianFormError] = useState("");
  const [isSavingTechnician, setIsSavingTechnician] = useState(false);
  const [isConfirmingDeleteTechnician, setIsConfirmingDeleteTechnician] = useState(false);
  const [isDeletingTechnician, setIsDeletingTechnician] = useState(false);
  const [supportsExtendedTechnicianFields, setSupportsExtendedTechnicianFields] =
    useState(true);
  const [detailFormState, setDetailFormState] = useState(initialDetailFormState);
  const [detailFormMessage, setDetailFormMessage] = useState("");
  const [detailFormError, setDetailFormError] = useState("");
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [isConfirmingAppointment, setIsConfirmingAppointment] = useState(false);
  const [isPreparingAppointmentConversion, setIsPreparingAppointmentConversion] = useState(false);
  const [appointmentConversionForm, setAppointmentConversionForm] = useState(
    initialAppointmentConversionForm
  );
  const [isDeletingAppointment, setIsDeletingAppointment] = useState(false);
  const [isChoosingRecurringAppointmentDelete, setIsChoosingRecurringAppointmentDelete] =
    useState(false);
  const [isConfirmingDeleteServiceOrder, setIsConfirmingDeleteServiceOrder] = useState(false);
  const [isDeletingServiceOrder, setIsDeletingServiceOrder] = useState(false);
  const detailDateInputRef = useRef(null);
  const createServiceOrderClientSelectRef = useRef(null);
  const draggedBacklogServiceOrderRef = useRef(null);
  const externalDragCleanupTimeoutRef = useRef(null);
  const extendedAppointmentSeriesRef = useRef(new Set());
  const authUserIdRef = useRef("");
  const lastLoadedCompanyIdRef = useRef(null);
  const lastLoadedActiveCompanyIdRef = useRef(null);
  const lastLoadedClientBranchesCompanyIdRef = useRef(null);
  const calendarPointerStateRef = useRef({
    calendarEventId: null,
    x: 0,
    y: 0,
    isResizeHandle: false
  });
  const [technicianOrders, setTechnicianOrders] = useState([]);
  const [selectedTechnicianOrderId, setSelectedTechnicianOrderId] = useState(null);
  const [isTechnicianOrdersLoading, setIsTechnicianOrdersLoading] = useState(false);
  const [technicianOrdersError, setTechnicianOrdersError] = useState("");
  const [technicianActionMessage, setTechnicianActionMessage] = useState("");
  const [technicianActionError, setTechnicianActionError] = useState("");
  const [technicianReportDraft, setTechnicianReportDraft] = useState("");
  const [isStartingTechnicianOrder, setIsStartingTechnicianOrder] = useState(false);
  const [isCompletingTechnicianOrder, setIsCompletingTechnicianOrder] = useState(false);
  const activeTechnicians = technicians.filter((technician) => technician.is_active);
  const availableBranches = branchesByClientId[formState.clientId] || [];
  const branches = branchesByClientId[selectedBranchClientId] || [];
  const selectedBranch =
    branches.find((branch) => branch.id === selectedBranchId) || null;
  const selectedServiceOrder =
    serviceOrders.find((serviceOrder) => serviceOrder.id === selectedServiceOrderId) ||
    selectedServiceOrderSnapshot ||
    null;
  const selectedServiceLocation = selectedServiceOrder
    ? resolveEffectiveServiceLocation(selectedServiceOrder)
    : null;
  const selectedAppointmentLocation = selectedAppointment
    ? resolveEffectiveServiceLocation(selectedAppointment)
    : null;
  const selectedAppointmentLinkedServiceOrder = selectedAppointment?.service_order_id
    ? serviceOrders.find(
        (serviceOrder) => serviceOrder.id === selectedAppointment.service_order_id
      ) || null
    : null;
  const selectedAppointmentSeries = selectedAppointment?.series_id
    ? appointmentSeries.find((series) => series.id === selectedAppointment.series_id) || null
    : null;
  const isSelectedAppointmentConverted = isConvertedAppointmentRecord(selectedAppointment);
  const isSelectedAppointmentRecurring = Boolean(selectedAppointment?.series_id);
  const selectedAppointmentHasTechnician = Boolean(
    String(selectedAppointment?.technician_name || "").trim()
  );
  const selectedAppointmentStatusLabel = getAppointmentStatusLabel(selectedAppointment?.status);
  const selectedAppointmentRecurrenceLabel = isSelectedAppointmentRecurring
    ? getAppointmentRecurrenceTypeLabel(
        selectedAppointmentSeries?.recurrence_type || selectedAppointment?.recurrence_type
      )
    : "Cita única";
  const selectedAppointmentRecurrenceDescription = isSelectedAppointmentRecurring
    ? selectedAppointmentSeries?.recurrence_end_date
      ? `${selectedAppointmentRecurrenceLabel} hasta ${formatServiceDate(
          selectedAppointmentSeries.recurrence_end_date
        )}. Las ocurrencias futuras pueden proyectarse automaticamente.`
      : `${selectedAppointmentRecurrenceLabel}. Las ocurrencias futuras pueden proyectarse automaticamente.`
    : "Esta visita no pertenece a una serie recurrente activa.";
  const isEditingServiceOrder =
    activeTopLevelTab === dashboardTabs.calendar && rightPanelMode === rightPanelModes.edit;
  const isCreateServiceOrderMode =
    activeTopLevelTab === dashboardTabs.calendar && rightPanelMode === rightPanelModes.create;
  const isServiceOrderDetailMode =
    activeTopLevelTab === dashboardTabs.calendar &&
    rightPanelMode === rightPanelModes.detail &&
    Boolean(selectedServiceOrder);
  const isAppointmentDetailMode =
    activeTopLevelTab === dashboardTabs.calendar &&
    rightPanelMode === rightPanelModes.detail &&
    Boolean(selectedAppointment);
  const isFocusedServiceOrderPanel = isCreateServiceOrderMode || isEditingServiceOrder;
  const serviceOrderPanelStage = isFocusedServiceOrderPanel
    ? "operational"
    : isServiceOrderDetailMode || isAppointmentDetailMode
      ? "detail"
      : "idle";
  const createServiceOrderContext =
    isCreateServiceOrderMode && formState.serviceDate
      ? `${formatServiceDate(formState.serviceDate)} · ${formatDisplayTime(
          formState.serviceTime || "9:00 AM"
        )}`
      : "";
  const activeCompanyId = userProfile?.company_id || null;
  const normalizedProfileRole = String(userProfile?.role || "")
    .trim()
    .toLowerCase();
  const isTechnicianUser = normalizedProfileRole === "technician";
  const selectedTechnicianOrder =
    technicianOrders.find((serviceOrder) => serviceOrder.id === selectedTechnicianOrderId) ||
    null;
  const viewMode = calendarView === "month" ? "month" : "week";
  const focusedDate = calendarDate;
  const visibleCalendarRange = useMemo(() => {
    if (calendarView === "month") {
      return {
        start: startOfWeek(startOfDay(focusedDate), { weekStartsOn: 0 }),
        end: addDays(startOfWeek(startOfDay(focusedDate), { weekStartsOn: 0 }), 41)
      };
    }

    if (calendarView === operationalCalendarView) {
      const operationalRange = getOperationalRange(focusedDate);

      return {
        start: operationalRange[0],
        end: operationalRange[operationalRange.length - 1]
      };
    }

    return {
      start: startOfWeek(startOfDay(focusedDate), { weekStartsOn: 0 }),
      end: addDays(startOfWeek(startOfDay(focusedDate), { weekStartsOn: 0 }), 6)
    };
  }, [calendarView, focusedDate]);
  const projectedAppointmentEvents = useMemo(
    () =>
      transformProjectedAppointmentSeriesToEvents({
        appointmentSeries,
        appointments,
        appointmentSeriesExceptions,
        visibleRangeStart: visibleCalendarRange.start,
        visibleRangeEnd: visibleCalendarRange.end
      }),
    [appointmentSeries, appointments, appointmentSeriesExceptions, visibleCalendarRange]
  );
  const calendarEvents = useMemo(
    () =>
      mergeCalendarEvents(
        serviceOrders,
        appointments,
        projectedAppointmentEvents,
        appointmentSeriesExceptions
      ),
    [appointments, appointmentSeriesExceptions, projectedAppointmentEvents, serviceOrders]
  );
  const technicianLegendItems = Array.from(
    new Map(
      [
        ...technicians.map((technician) => technician.full_name),
        ...calendarEvents.map((event) => event.technician)
      ].map((technicianName) => {
        const displayName = getTechnicianDisplayName(technicianName);

        return [
          displayName,
          {
            key: technicianName || "__missing__",
            technicianName: technicianName || "",
            displayName,
            color: getTechnicianColorToken(technicianName)
          }
        ];
      })
    ).values()
  );
  const selectedCalendarTechnicianSet = useMemo(
    () => new Set(selectedCalendarTechnicians.filter(Boolean)),
    [selectedCalendarTechnicians]
  );
  const hasActiveTechnicianFilter = selectedCalendarTechnicianSet.size > 0;
  const overdueCount = useMemo(
    () => calendarEvents.filter((event) => Boolean(event.isOverdue)).length,
    [calendarEvents]
  );
  const toggleOverdueFilter = () => {
    setShowOnlyOverdue((currentState) => !currentState);
  };
  const toggleCalendarTechnicianFilter = (technicianName) => {
    if (!technicianName) {
      return;
    }

    setSelectedCalendarTechnicians((currentState) =>
      currentState.includes(technicianName)
        ? currentState.filter((currentTechnicianName) => currentTechnicianName !== technicianName)
        : [...currentState, technicianName]
    );
  };
  const filteredCalendarEvents = useMemo(
    () => {
      const realAppointmentOccurrenceKeys = new Set(
        appointments
          .filter((appointment) => appointment.series_id)
          .map((appointment) =>
            getAppointmentOccurrenceKey(
              appointment.series_id,
              appointment.appointment_date,
              appointment.appointment_time
            )
          )
      );
      const deletedOccurrenceKeys = getSuppressedAppointmentOccurrenceKeys(
        appointmentSeriesExceptions
      );

      return calendarEvents.filter((event) => {
        const isOverriddenProjectedAppointment =
          event.type === "projected_appointment" &&
          (
            realAppointmentOccurrenceKeys.has(
              getAppointmentOccurrenceKey(event.seriesId, event.serviceDate, event.serviceTime)
            ) ||
            deletedOccurrenceKeys.has(
              getAppointmentOccurrenceKey(event.seriesId, event.serviceDate, event.serviceTime)
            )
          );

        if (isOverriddenProjectedAppointment) {
          return false;
        }

        const matchesTechnician = hasActiveTechnicianFilter
          ? selectedCalendarTechnicianSet.has(event.technician)
          : true;
        const matchesOverdue = showOnlyOverdue ? Boolean(event.isOverdue) : true;

        return matchesTechnician && matchesOverdue;
      });
    },
    [
      appointments,
      appointmentSeriesExceptions,
      calendarEvents,
      hasActiveTechnicianFilter,
      selectedCalendarTechnicianSet,
      showOnlyOverdue
    ]
  );
  const backlogServiceOrders = useMemo(
    () =>
      serviceOrders
        .filter((serviceOrder) => {
          const matchesTechnician = hasActiveTechnicianFilter
            ? selectedCalendarTechnicianSet.has(serviceOrder.technician_name)
            : true;
          const isCancelled =
            String(serviceOrder.status || "").trim().toLowerCase() === "cancelled";

          return (
            matchesTechnician &&
            !isCancelled &&
            isOverdueServiceOrder(
              serviceOrder.service_date,
              serviceOrder.service_time,
              serviceOrder.status,
              serviceOrder.duration_minutes
            )
          );
        })
        .sort((serviceOrderA, serviceOrderB) => {
          const startA = parseServiceOrderStart(
            serviceOrderA.service_date,
            serviceOrderA.service_time
          );
          const startB = parseServiceOrderStart(
            serviceOrderB.service_date,
            serviceOrderB.service_time
          );

          return startA.getTime() - startB.getTime();
        }),
    [hasActiveTechnicianFilter, selectedCalendarTechnicianSet, serviceOrders]
  );
  const hasExistingServiceOrderData =
    serviceOrders.length > 0 || appointments.length > 0 || calendarEvents.length > 0;
  const shouldKeepCalendarVisibleDuringRefresh =
    isServiceOrdersLoading && hasExistingServiceOrderData;
  const shouldRenderCalendarContent =
    !calendarError &&
    (shouldKeepCalendarVisibleDuringRefresh || !isServiceOrdersLoading);
  const filteredServiceOrders = useMemo(() => {
    const normalizedClientSearch = serviceListClientSearch.trim().toLowerCase();

    return serviceOrders.filter((serviceOrder) => {
      const clientName = getClientDisplayName(serviceOrder.clients);
      const matchesClient = normalizedClientSearch
        ? clientName.toLowerCase().includes(normalizedClientSearch)
        : true;
      const matchesTechnician = hasActiveTechnicianFilter
        ? selectedCalendarTechnicianSet.has(serviceOrder.technician_name)
        : true;
      const matchesRecurring =
        serviceListRecurring === "all"
          ? true
          : serviceListRecurring === "yes"
            ? Boolean(serviceOrder.is_recurring)
            : !serviceOrder.is_recurring;

      return matchesClient && matchesTechnician && matchesRecurring;
    });
  }, [
    hasActiveTechnicianFilter,
    selectedCalendarTechnicianSet,
    serviceListClientSearch,
    serviceListRecurring,
    serviceOrders
  ]);
  const filteredClients = useMemo(() => {
    const normalizedSearch = clientSidebarSearch.trim().toLowerCase();

    return clients.filter((client) => {
      const displayName = client.displayName || getClientDisplayName(client);
      const matchesSearch = normalizedSearch
        ? displayName.toLowerCase().includes(normalizedSearch)
        : true;
      const matchesType =
        clientSidebarType === "all" ? true : client.client_type === clientSidebarType;

      return matchesSearch && matchesType;
    });
  }, [clientSidebarSearch, clientSidebarType, clients]);
  const activeClientHierarchyMessage = useMemo(() => {
    if (activeEntityType === "client" && activeMode === "edit" && activeEntityId) {
      const activeClient = clients.find((client) => client.id === activeEntityId);

      return activeClient ? `Modo edicion cliente: ${activeClient.displayName}` : "";
    }

    if (activeEntityType === "branch" && activeMode === "create" && activeParentClientId) {
      const parentClient = clients.find((client) => client.id === activeParentClientId);

      return parentClient ? `Creando sucursal para: ${parentClient.displayName}` : "";
    }

    if (activeEntityType === "branch" && activeMode === "edit" && activeEntityId) {
      const activeBranch = Object.values(branchesByClientId)
        .flat()
        .find((branch) => branch.id === activeEntityId);

      return activeBranch ? `Modo edicion sucursal: ${activeBranch.name}` : "";
    }

    return "";
  }, [activeEntityId, activeEntityType, activeMode, activeParentClientId, branchesByClientId, clients]);
  const filteredTechnicians = useMemo(
    () =>
      technicians.filter((technician) => {
        if (technicianSidebarStatus === "active") {
          return Boolean(technician.is_active);
        }

        if (technicianSidebarStatus === "inactive") {
          return !technician.is_active;
        }

        return true;
      }),
    [technicianSidebarStatus, technicians]
  );
  const technicianWorkloadByName = useMemo(() => {
    const workloadMap = new Map();
    const todayDateString = getTodayDateString();

    serviceOrders.forEach((serviceOrder) => {
      const technicianName = String(serviceOrder.technician_name || "").trim();

      if (!technicianName) {
        return;
      }

      const currentStats = workloadMap.get(technicianName) || {
        scheduledToday: 0,
        overdueAssigned: 0
      };

      if (
        serviceOrder.service_date === todayDateString &&
        serviceOrder.status === "scheduled"
      ) {
        currentStats.scheduledToday += 1;
      }

      if (
        serviceOrder.status !== "cancelled" &&
        isOverdueServiceOrder(
          serviceOrder.service_date,
          serviceOrder.service_time,
          serviceOrder.status,
          serviceOrder.duration_minutes
        )
      ) {
        currentStats.overdueAssigned += 1;
      }

      workloadMap.set(technicianName, currentStats);
    });

    return workloadMap;
  }, [serviceOrders]);
  const activeTechnician =
    technicians.find((technician) => technician.id === selectedTechnicianId) || null;
  const activeTechniciansCount = technicians.filter((technician) => technician.is_active).length;
  const inactiveTechniciansCount = technicians.filter((technician) => !technician.is_active).length;
  const selectedClient =
    clients.find((client) => client.id === selectedClientId) || null;
  const selectedClientBranches = branchesByClientId[selectedClientId] || [];
  const activeBranch = Object.values(branchesByClientId)
    .flat()
    .find((branch) => branch.id === activeEntityId) || null;
  const activeClient =
    (activeEntityType === "client" && activeEntityId
      ? clients.find((client) => client.id === activeEntityId)
      : null) ||
    (activeEntityType === "branch" && activeMode === "create" && activeParentClientId
      ? clients.find((client) => client.id === activeParentClientId)
      : null) ||
    (activeEntityType === "branch" && activeBranch?.client_id
      ? clients.find((client) => client.id === activeBranch.client_id)
      : null) ||
    null;
  const activeDrawerClientId = activeClient?.id || null;
  const activeClientAppointments = useMemo(
    () =>
      appointments.filter((appointment) => appointment.client_id === activeDrawerClientId),
    [activeDrawerClientId, appointments]
  );
  const activeClientServiceOrders = useMemo(
    () =>
      serviceOrders.filter((serviceOrder) => serviceOrder.client_id === activeDrawerClientId),
    [activeDrawerClientId, serviceOrders]
  );
  const isClientSummaryActiveAppointment = (appointment) =>
    Boolean(appointment) && !isConvertedAppointmentRecord(appointment);
  const isClientSummaryCancelledServiceOrder = (serviceOrder) =>
    String(serviceOrder?.status || "").trim().toLowerCase() === "cancelled";
  const isClientSummaryCompletedServiceOrder = (serviceOrder) =>
    isCompletedStatus(serviceOrder?.status);
  const isClientSummaryInProgressServiceOrder = (serviceOrder) =>
    String(serviceOrder?.execution_status || "").trim().toLowerCase() === "in_progress";
  const isClientSummaryActiveServiceOrder = (serviceOrder) =>
    Boolean(serviceOrder) &&
    !isClientSummaryCancelledServiceOrder(serviceOrder) &&
    !isClientSummaryCompletedServiceOrder(serviceOrder);
  const getBranchProgressState = ({ branchAppointments, branchServiceOrders }) => {
    const now = Date.now();
    const activeAppointments = branchAppointments.filter(isClientSummaryActiveAppointment);
    const activeServiceOrders = branchServiceOrders.filter(isClientSummaryActiveServiceOrder);
    const overdueServiceOrder = activeServiceOrders.find((serviceOrder) =>
      isOverdueServiceOrder(
        serviceOrder.service_date,
        serviceOrder.service_time,
        serviceOrder.status,
        serviceOrder.duration_minutes
      )
    );

    if (overdueServiceOrder) {
      return {
        key: "overdue",
        label: "Vencido",
        technicianName:
          overdueServiceOrder.technician_name || uiText.dashboard.calendarTechnicianFallback
      };
    }

    const inProgressServiceOrder = activeServiceOrders.find((serviceOrder) =>
      isClientSummaryInProgressServiceOrder(serviceOrder)
    );

    if (inProgressServiceOrder) {
      return {
        key: "in_progress",
        label: "En progreso",
        technicianName:
          inProgressServiceOrder.technician_name || uiText.dashboard.calendarTechnicianFallback
      };
    }

    const pendingOrder = activeServiceOrders
      .filter((serviceOrder) => {
        const orderStart = parseServiceOrderStart(
          serviceOrder.service_date,
          serviceOrder.service_time
        );

        return orderStart.getTime() >= now;
      })
      .sort(
        (leftOrder, rightOrder) =>
          parseServiceOrderStart(leftOrder.service_date, leftOrder.service_time).getTime() -
          parseServiceOrderStart(rightOrder.service_date, rightOrder.service_time).getTime()
      )[0];

    if (pendingOrder) {
      return {
        key: "pending_order",
        label: "Orden pendiente",
        technicianName: pendingOrder.technician_name || uiText.dashboard.calendarTechnicianFallback
      };
    }

    const plannedAppointment = activeAppointments
      .filter((appointment) => {
        const appointmentStart = parseServiceOrderStart(
          appointment.appointment_date,
          appointment.appointment_time
        );

        return appointmentStart.getTime() >= now;
      })
      .sort(
        (leftAppointment, rightAppointment) =>
          parseServiceOrderStart(
            leftAppointment.appointment_date,
            leftAppointment.appointment_time
          ).getTime() -
          parseServiceOrderStart(
            rightAppointment.appointment_date,
            rightAppointment.appointment_time
          ).getTime()
      )[0];

    if (plannedAppointment) {
      return {
        key: "planned",
        label: "Cita planificada",
        technicianName:
          plannedAppointment.technician_name || uiText.dashboard.calendarTechnicianFallback
      };
    }

    const currentMonthKey = format(new Date(), "yyyy-MM");
    const completedThisMonth = branchServiceOrders
      .filter(
        (serviceOrder) =>
          isClientSummaryCompletedServiceOrder(serviceOrder) &&
          String(serviceOrder.service_date || "").slice(0, 7) === currentMonthKey
      )
      .sort(
        (leftOrder, rightOrder) =>
          parseServiceOrderStart(rightOrder.service_date, rightOrder.service_time).getTime() -
          parseServiceOrderStart(leftOrder.service_date, leftOrder.service_time).getTime()
      )[0];

    if (completedThisMonth) {
      return {
        key: "completed_recently",
        label: "Completado",
        technicianName:
          completedThisMonth.technician_name || uiText.dashboard.calendarTechnicianFallback
      };
    }

    return {
      key: "no_activity",
      label: "Sin actividad",
      technicianName: uiText.dashboard.calendarTechnicianFallback
    };
  };
  const activeClientProgressOverview = useMemo(() => {
    if (!activeDrawerClientId) {
      return {
        appointmentCount: 0,
        serviceOrderCount: 0,
        completedOrderCount: 0,
        pendingOrderCount: 0,
        overdueOrderCount: 0,
        branchesWithActivity: 0,
        progressPercent: 0
      };
    }

    const currentMonthKey = format(new Date(), "yyyy-MM");
    // Converted appointments stay in the database for traceability, but they should
    // never count as active planning work once an order exists.
    const currentMonthAppointments = activeClientAppointments.filter(
      (appointment) =>
        isClientSummaryActiveAppointment(appointment) &&
        String(appointment.appointment_date || "").slice(0, 7) === currentMonthKey
    );
    const currentMonthServiceOrders = activeClientServiceOrders.filter(
      (serviceOrder) =>
        !isClientSummaryCancelledServiceOrder(serviceOrder) &&
        String(serviceOrder.service_date || "").slice(0, 7) === currentMonthKey
    );
    const completedOrderCount = currentMonthServiceOrders.filter(
      isClientSummaryCompletedServiceOrder
    ).length;
    const overdueOrderCount = currentMonthServiceOrders.filter((serviceOrder) =>
      isOverdueServiceOrder(
        serviceOrder.service_date,
        serviceOrder.service_time,
        serviceOrder.status,
        serviceOrder.duration_minutes
      )
    ).length;
    const pendingOrderCount = currentMonthServiceOrders.filter(
      (serviceOrder) =>
        isClientSummaryActiveServiceOrder(serviceOrder) &&
        !isOverdueServiceOrder(
          serviceOrder.service_date,
          serviceOrder.service_time,
          serviceOrder.status,
          serviceOrder.duration_minutes
        )
    ).length;
    const branchesWithActivity = (branchesByClientId[activeDrawerClientId] || []).filter(
      (branch) => {
        const hasAppointments = currentMonthAppointments.some(
          (appointment) => appointment.branch_id === branch.id
        );
        const hasOrders = currentMonthServiceOrders.some(
          (serviceOrder) => serviceOrder.branch_id === branch.id
        );

        return hasAppointments || hasOrders;
      }
    ).length;
    const scheduledWorkCount = currentMonthAppointments.length + currentMonthServiceOrders.length;

    return {
      appointmentCount: currentMonthAppointments.length,
      serviceOrderCount: currentMonthServiceOrders.length,
      completedOrderCount,
      pendingOrderCount,
      overdueOrderCount,
      branchesWithActivity,
      progressPercent:
        scheduledWorkCount > 0 ? Math.round((completedOrderCount / scheduledWorkCount) * 100) : 0
    };
  }, [
    activeClientAppointments,
    activeClientServiceOrders,
    activeDrawerClientId,
    branchesByClientId
  ]);
  const clientsModuleSummary = useMemo(() => {
    const currentMonthKey = format(new Date(), "yyyy-MM");
    const currentMonthAppointments = appointments.filter(
      (appointment) =>
        isClientSummaryActiveAppointment(appointment) &&
        String(appointment.appointment_date || "").slice(0, 7) === currentMonthKey
    );
    const currentMonthServiceOrders = serviceOrders.filter(
      (serviceOrder) =>
        !isClientSummaryCancelledServiceOrder(serviceOrder) &&
        String(serviceOrder.service_date || "").slice(0, 7) === currentMonthKey
    );
    const completedOrders = currentMonthServiceOrders.filter(isClientSummaryCompletedServiceOrder);
    const overdueOrders = currentMonthServiceOrders.filter((serviceOrder) =>
      isOverdueServiceOrder(
        serviceOrder.service_date,
        serviceOrder.service_time,
        serviceOrder.status,
        serviceOrder.duration_minutes
      )
    );
    const pendingOrders = currentMonthServiceOrders.filter(
      (serviceOrder) =>
        isClientSummaryActiveServiceOrder(serviceOrder) &&
        !isOverdueServiceOrder(
          serviceOrder.service_date,
          serviceOrder.service_time,
          serviceOrder.status,
          serviceOrder.duration_minutes
        )
    );
    const branchesWithActivity = new Set(
      [
        ...currentMonthAppointments.map((appointment) => appointment.branch_id).filter(Boolean),
        ...currentMonthServiceOrders.map((serviceOrder) => serviceOrder.branch_id).filter(Boolean)
      ]
    );
    const clientsWithOverdueOrders = new Set(
      overdueOrders.map((serviceOrder) => serviceOrder.client_id).filter(Boolean)
    );
    const clientsWithActivityThisMonth = new Set(
      [
        ...currentMonthAppointments.map((appointment) => appointment.client_id).filter(Boolean),
        ...currentMonthServiceOrders.map((serviceOrder) => serviceOrder.client_id).filter(Boolean)
      ]
    );

    return {
      totalClients: clients.length,
      commercialClients: clients.filter((client) => client.client_type === "commercial").length,
      residentialClients: clients.filter((client) => client.client_type === "residential").length,
      totalBranches: allClientBranches.length,
      activeAppointmentsThisMonth: currentMonthAppointments.length,
      serviceOrdersThisMonth: currentMonthServiceOrders.length,
      completedOrders: completedOrders.length,
      pendingOrders: pendingOrders.length,
      overdueOrders: overdueOrders.length,
      branchesWithActivity: branchesWithActivity.size,
      clientsWithOverdueOrders: clientsWithOverdueOrders.size,
      clientsWithActivityThisMonth: clientsWithActivityThisMonth.size
    };
  }, [allClientBranches, appointments, clients, serviceOrders]);
  const activeClientBranchProgress = useMemo(() => {
    const clientBranches = branchesByClientId[activeDrawerClientId] || [];
    const currentTime = Date.now();

    return clientBranches.map((branch) => {
      const branchAppointments = activeClientAppointments.filter(
        (appointment) =>
          appointment.branch_id === branch.id && isClientSummaryActiveAppointment(appointment)
      );
      const branchServiceOrders = activeClientServiceOrders.filter(
        (serviceOrder) => serviceOrder.branch_id === branch.id
      );
      const completedServiceOrders = branchServiceOrders
        .filter((serviceOrder) => isClientSummaryCompletedServiceOrder(serviceOrder))
        .sort(
          (leftOrder, rightOrder) =>
            parseServiceOrderStart(rightOrder.service_date, rightOrder.service_time).getTime() -
            parseServiceOrderStart(leftOrder.service_date, leftOrder.service_time).getTime()
        );
      const latestCompletedServiceOrder = completedServiceOrders[0] || null;
      const upcomingItems = [
        ...branchServiceOrders
          .filter((serviceOrder) => isClientSummaryActiveServiceOrder(serviceOrder))
          .map((serviceOrder) => ({
            type: "service_order",
            item: serviceOrder,
            start: parseServiceOrderStart(serviceOrder.service_date, serviceOrder.service_time)
          })),
        ...branchAppointments.map((appointment) => ({
          type: "appointment",
          item: appointment,
          start: parseServiceOrderStart(
            appointment.appointment_date,
            appointment.appointment_time
          )
        }))
      ]
        .filter((entry) => entry.start.getTime() >= currentTime)
        .sort((leftEntry, rightEntry) => leftEntry.start.getTime() - rightEntry.start.getTime());
      const nextServiceEntry = upcomingItems[0] || null;
      const progressState = getBranchProgressState({
        branchAppointments,
        branchServiceOrders
      });

      return {
        id: branch.id,
        name: getBranchDisplayName(branch),
        lastService: latestCompletedServiceOrder
          ? formatServiceDateTimeSummary(
              latestCompletedServiceOrder.service_date,
              latestCompletedServiceOrder.service_time
            )
          : "-",
        nextService: nextServiceEntry
          ? formatServiceDateTimeSummary(
              nextServiceEntry.type === "appointment"
                ? nextServiceEntry.item.appointment_date
                : nextServiceEntry.item.service_date,
              nextServiceEntry.type === "appointment"
                ? nextServiceEntry.item.appointment_time
                : nextServiceEntry.item.service_time
            )
          : "-",
        stateKey: progressState.key,
        stateLabel: progressState.label,
        technicianName:
          nextServiceEntry?.item?.technician_name ||
          progressState.technicianName ||
          latestCompletedServiceOrder?.technician_name ||
          uiText.dashboard.calendarTechnicianFallback
      };
    });
  }, [activeClientAppointments, activeClientServiceOrders, activeDrawerClientId, branchesByClientId]);
  const activeClientTimelineRows = useMemo(() => {
    const appointmentRows = activeClientAppointments
      .filter((appointment) => !isConvertedAppointmentRecord(appointment))
      .map((appointment) => ({
        id: `appointment-${appointment.id}`,
        typeLabel: "Cita",
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        status:
          parseServiceOrderStart(appointment.appointment_date, appointment.appointment_time).getTime() <
          Date.now()
            ? "Vencido"
            : "Pendiente",
        location:
          resolveEffectiveServiceLocation(appointment).name || uiText.dashboard.branchEmpty,
        technicianName:
          appointment.technician_name || uiText.dashboard.calendarTechnicianFallback
      }));
    const serviceOrderRows = activeClientServiceOrders.map((serviceOrder) => ({
      id: `service-order-${serviceOrder.id}`,
      typeLabel: "Orden",
      date: serviceOrder.service_date,
      time: serviceOrder.service_time,
      status: isCompletedStatus(serviceOrder.status)
        ? "Completado"
        : isOverdueServiceOrder(
            serviceOrder.service_date,
            serviceOrder.service_time,
            serviceOrder.status,
            serviceOrder.duration_minutes
          )
          ? "Vencido"
          : "Pendiente",
      location:
        resolveEffectiveServiceLocation(serviceOrder).name || uiText.dashboard.branchEmpty,
      technicianName:
        serviceOrder.technician_name || uiText.dashboard.calendarTechnicianFallback
    }));

    return [...appointmentRows, ...serviceOrderRows]
      .sort(
        (leftRow, rightRow) =>
          parseServiceOrderStart(rightRow.date, rightRow.time).getTime() -
          parseServiceOrderStart(leftRow.date, leftRow.time).getTime()
      )
      .slice(0, 12);
  }, [activeClientAppointments, activeClientServiceOrders]);
  const activeClientContacts = activeDrawerClientId
    ? contactsByClientId[activeDrawerClientId] || []
    : [];
  const activeEditingContact =
    activeContactId && activeDrawerClientId
      ? (contactsByClientId[activeDrawerClientId] || []).find(
          (contact) => contact.id === activeContactId
        ) || null
      : null;
  const activeEditingBranch =
    activeBranchFormId && activeDrawerClientId
      ? (branchesByClientId[activeDrawerClientId] || []).find(
          (branch) => branch.id === activeBranchFormId
        ) || null
      : null;
  const activeDrawerTitle =
    activeEntityType === "client" && activeMode === "edit"
      ? "Editar cliente"
      : activeEntityType === "client" && activeMode === "create"
        ? "Nuevo cliente"
        : activeEntityType === "client" && activeMode === "detail"
          ? activeClient?.displayName || activeClient?.name || "Detalle del cliente"
        : activeEntityType === "branch" && activeMode === "create"
          ? "Nueva sucursal"
        : activeEntityType === "branch" && activeMode === "edit"
            ? "Editar sucursal"
            : "";
  const activeDrawerSubtitle =
    activeEntityType === "client" && activeMode === "edit"
      ? "Actualiza la informacion comercial y operativa del cliente sin salir del modulo."
      : activeEntityType === "client" && activeMode === "create"
        ? "Crea el cliente primero y despues agrega contactos o sucursales en el mismo panel."
        : activeEntityType === "client" && activeMode === "detail"
          ? "Consulta el resumen del cliente y entra a edicion solo cuando realmente necesites trabajar."
        : activeEntityType === "branch" && activeMode === "create"
          ? "Registra una nueva sucursal para dejar lista la ubicacion operativa del cliente."
          : activeEntityType === "branch" && activeMode === "edit"
            ? "Ajusta la informacion operativa de esta sucursal sin perder el contexto del cliente."
            : "";
  const serviceOrderPanelKicker =
    rightPanelMode === rightPanelModes.create
      ? "Cita"
      : rightPanelMode === rightPanelModes.edit
        ? "Orden de servicio"
        : selectedAppointment
          ? "Cita"
        : selectedServiceOrder
          ? "Orden de servicio"
          : uiText.dashboard.detailTitle;
  const serviceOrderPanelTitle =
    rightPanelMode === rightPanelModes.create
      ? "Cita"
      : rightPanelMode === rightPanelModes.edit
        ? "Orden de servicio"
        : selectedAppointment
          ? "Cita"
        : selectedServiceOrder
          ? "Orden de servicio"
          : uiText.dashboard.detailTitle;
  const serviceOrderPanelSubtitle =
    rightPanelMode === rightPanelModes.create
      ? "Completa los datos para programar una cita."
      : rightPanelMode === rightPanelModes.edit
        ? selectedServiceOrder
          ? `${getClientDisplayName(selectedServiceOrder.clients)} · ${formatServiceDate(
              selectedServiceOrder.service_date
            )} · ${formatDisplayTime(selectedServiceOrder.service_time)}`
          : "Ajusta programacion, estado y ejecucion de la orden."
        : selectedAppointment
          ? `${formatServiceDate(
              selectedAppointment.appointment_date
            )} · ${formatDisplayTime(selectedAppointment.appointment_time)} · ${getTechnicianDisplayName(
              selectedAppointment.technician_name
            )}`
        : selectedServiceOrder
          ? `${getClientDisplayName(selectedServiceOrder.clients)} · ${formatServiceDate(
              selectedServiceOrder.service_date
            )} · ${formatDisplayTime(selectedServiceOrder.service_time)}`
          : uiText.dashboard.detailDescription;
  const sidebarUserName = userProfile?.full_name || userEmail || "Usuario";
  const sidebarCompanyName = activeCompany?.name || uiText.common.appName;
  const renderSidebarNavigation = () => (
    <div className="workspace-sidebar-shell">
      <div className="workspace-sidebar-header">
        <button
          type="button"
          className="workspace-sidebar-toggle"
          onClick={() => setIsSidebarCollapsed((currentState) => !currentState)}
          aria-label={isSidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          title={isSidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {isSidebarCollapsed ? "→" : "←"}
        </button>
      </div>

      <nav className="workspace-sidebar-nav" aria-label="Navegacion principal">
        {sidebarNavigationGroups.map((group) => (
          <div key={group.label} className="workspace-sidebar-group">
            {!isSidebarCollapsed ? (
              <span className="workspace-sidebar-group-label">{group.label}</span>
            ) : null}
            <div className="workspace-sidebar-group-items">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                <button
                  key={item.value}
                  type="button"
                  className={
                    activeTopLevelTab === item.value
                      ? "workspace-sidebar-nav-item workspace-sidebar-nav-item-active"
                      : "workspace-sidebar-nav-item"
                  }
                  onClick={() => setActiveTopLevelTab(item.value)}
                  title={uiText.dashboard.topTabs[item.key]}
                  aria-current={activeTopLevelTab === item.value ? "page" : undefined}
                >
                  <span className="workspace-sidebar-nav-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  {!isSidebarCollapsed ? (
                    <span className="workspace-sidebar-nav-label">
                      {uiText.dashboard.topTabs[item.key]}
                    </span>
                  ) : null}
                </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
  const renderSidebarFooter = () => (
    <div className="workspace-sidebar-footer">
      <div className="workspace-sidebar-footer-copy">
        <strong>{isSidebarCollapsed ? sidebarCompanyName.slice(0, 2).toUpperCase() : sidebarCompanyName}</strong>
        {!isSidebarCollapsed ? <span>{sidebarUserName}</span> : null}
      </div>
      <div className="workspace-sidebar-footer-brand">
        <span>B2R</span>
        {!isSidebarCollapsed ? <strong>Biz2Rise</strong> : null}
      </div>
    </div>
  );
  const isClientDrawerDirty =
    activeMode === "create"
      ? Boolean(clientDrawerForm.name.trim())
      : Boolean(activeClient) &&
        JSON.stringify({
          name: clientDrawerForm.name.trim(),
          clientType: clientDrawerForm.clientType,
          mainPhone: clientDrawerForm.mainPhone.trim(),
          mainEmail: clientDrawerForm.mainEmail.trim(),
          mainContact: clientDrawerForm.mainContact.trim(),
          businessName: clientDrawerForm.businessName.trim(),
          tradeName: clientDrawerForm.tradeName.trim(),
          taxId: clientDrawerForm.taxId.trim()
        }) !==
          JSON.stringify({
            name: activeClient?.name || activeClient?.displayName || "",
            clientType: activeClient?.client_type || "commercial",
            mainPhone: activeClient?.main_phone || "",
            mainEmail: activeClient?.main_email || "",
            mainContact: activeClient?.main_contact || "",
            businessName: activeClient?.business_name || "",
            tradeName: activeClient?.trade_name || "",
            taxId: activeClient?.tax_id || ""
          });
  const isBranchDrawerDirty =
    activeEntityType === "branch" && activeMode === "edit"
      ? Boolean(activeBranch) &&
        JSON.stringify({
          name: drawerBranchForm.name.trim(),
          address: drawerBranchForm.address.trim(),
          phone: drawerBranchForm.phone.trim(),
          contact: drawerBranchForm.contact.trim(),
          notes: drawerBranchForm.notes.trim()
        }) !==
          JSON.stringify({
            name: activeBranch?.name || "",
            address: activeBranch?.address || "",
            phone: activeBranch?.phone || "",
            contact: activeBranch?.contact || "",
            notes: activeBranch?.notes || ""
          })
      : Boolean(drawerBranchForm.name.trim() || drawerBranchForm.address.trim());
  const isContactDrawerDirty = Boolean(contactDrawerForm.fullName.trim());
  const selectedFormClient =
    clients.find((client) => client.id === formState.clientId) || null;
  const isResidentialFormClient = isResidentialClient(selectedFormClient?.client_type);
  const preferredResidentialBranch = resolvePreferredBranch(availableBranches);
  const selectedDetailClient =
    clients.find((client) => client.id === detailFormState.clientId) ||
    selectedServiceOrder?.clients ||
    null;
  const isResidentialDetailClient = isResidentialClient(selectedDetailClient?.client_type);
  const detailAvailableBranches = branchesByClientId[detailFormState.clientId] || [];
  const preferredDetailResidentialBranch = resolvePreferredBranch(detailAvailableBranches);
  const isSelectedServiceOrderOverdue = selectedServiceOrder
    ? isOverdueServiceOrder(
        selectedServiceOrder.service_date,
        selectedServiceOrder.service_time,
        selectedServiceOrder.status,
        selectedServiceOrder.duration_minutes
      )
    : false;
  const selectedOrder = selectedServiceOrder;
  const pendingOrders = backlogServiceOrders;
  const todayOrdersCount = useMemo(
    () =>
      serviceOrders.filter(
        (serviceOrder) =>
          serviceOrder.service_date === getTodayDateString() && serviceOrder.status !== "cancelled"
      ).length,
    [serviceOrders]
  );
  const completedTodayCount = useMemo(
    () =>
      serviceOrders.filter(
        (serviceOrder) =>
          serviceOrder.service_date === getTodayDateString() && serviceOrder.status === "completed"
      ).length,
    [serviceOrders]
  );
  const activeCompanyLogoUrl = activeCompany?.logo_url?.trim() || "/logo.svg";
  const isCompanySettingsDirty =
    JSON.stringify({
      name: companySettingsForm.name.trim(),
      businessName: companySettingsForm.businessName.trim(),
      taxId: companySettingsForm.taxId.trim(),
      mainPhone: companySettingsForm.mainPhone.trim(),
      mainEmail: companySettingsForm.mainEmail.trim(),
      mainContact: companySettingsForm.mainContact.trim(),
      addressLine1: companySettingsForm.addressLine1.trim(),
      addressLine2: companySettingsForm.addressLine2.trim(),
      city: companySettingsForm.city.trim(),
      state: companySettingsForm.state.trim(),
      postalCode: companySettingsForm.postalCode.trim(),
      country: companySettingsForm.country.trim(),
          logoUrl: companySettingsForm.logoUrl.trim()
    }) !== JSON.stringify(buildCompanySettingsFormState(activeCompany));

  authUserIdRef.current = authUserId;

  const fetchUserProfile = async (supabase, userId, reason = "unknown") => {
    debugLog("[Dashboard Refresh Debug] fetchUserProfile:", {
      userId,
      reason,
      timestamp: new Date().toISOString()
    });
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, company_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      setUserProfile(null);
      setProfileError(uiText.dashboard.profileMissing);
      setIsProfileResolved(true);
      return null;
    }

    setUserProfile(data);
    setProfileError("");
    setIsProfileResolved(true);
    return data;
  };

  const fetchActiveCompany = async (supabase, companyId, reason = "unknown") => {
    if (!companyId) {
      setActiveCompany(null);
      setCompanySettingsForm(initialCompanySettingsForm);
      setCompanySettingsError("");
      setCompanySettingsMessage("");
      return null;
    }

    debugLog("[Dashboard Refresh Debug] fetchActiveCompany:", {
      companyId,
      reason,
      timestamp: new Date().toISOString()
    });

    const { data, error } = await supabase
      .from("companies")
      .select(
        [
          "id",
          "name",
          "business_name",
          "tax_id",
          "main_phone",
          "main_email",
          "main_contact",
          "address_line_1",
          "address_line_2",
          "city",
          "state",
          "postal_code",
          "country",
          "logo_url"
        ].join(", ")
      )
      .eq("id", companyId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    setActiveCompany(data || null);
    setCompanySettingsForm(buildCompanySettingsFormState(data));
    setCompanySettingsError("");
    return data;
  };

  const extendAppointmentSeriesWindow = async ({
    supabase,
    companyId,
    series,
    appointmentSeriesExceptions = []
  }) => {
    if (!supabase || !companyId || !shouldExtendAppointmentSeries(series)) {
      return {
        series,
        appointments: []
      };
    }

    const { startDate, targetDate } = getSeriesExtensionRange(series);

    if (!isValid(startDate) || !isValid(targetDate) || targetDate.getTime() < startDate.getTime()) {
      return {
        series,
        appointments: []
      };
    }

    const occurrenceDates = expandRecurringAppointmentDates({
      startDateValue: series.start_date,
      recurrenceType: series.recurrence_type,
      recurrenceInterval: series.recurrence_interval,
      recurrenceDays: series.recurrence_days,
      recurrenceEndDateValue: series.recurrence_end_date,
      rangeStartValue: formatDateOnly(startDate),
      rangeEndValue: formatDateOnly(targetDate)
    });

    if (occurrenceDates.length === 0) {
      return {
        series,
        appointments: []
      };
    }

    const { data: existingOccurrences, error: existingOccurrencesError } = await supabase
      .from("appointments")
      .select("appointment_date, appointment_time")
      .eq("company_id", companyId)
      .eq("series_id", series.id)
      .gte("appointment_date", formatDateOnly(startDate))
      .lte("appointment_date", formatDateOnly(targetDate));

    if (existingOccurrencesError) {
      throw existingOccurrencesError;
    }

    const existingOccurrenceKeys = new Set(
      (existingOccurrences || []).map(
        (appointment) =>
          getAppointmentOccurrenceKey(
            series.id,
            appointment.appointment_date,
            appointment.appointment_time
          )
      )
    );
    const deletedOccurrenceKeys = getSuppressedAppointmentOccurrenceKeys(
      appointmentSeriesExceptions
    );
    const occurrencePayloads = occurrenceDates
      .map((appointmentDate) =>
        buildAppointmentPayloadFromSeries({
          activeCompanyId: companyId,
          series,
          appointmentDate
        })
      )
      .filter(
        (appointmentPayload) => {
          const occurrenceKey = getAppointmentOccurrenceKey(
            series.id,
            appointmentPayload.appointment_date,
            appointmentPayload.appointment_time
          );

          return (
            !existingOccurrenceKeys.has(occurrenceKey) &&
            !deletedOccurrenceKeys.has(occurrenceKey)
          );
        }
      );

    const { data: createdAppointments, error: createdAppointmentsError } = occurrencePayloads.length
      ? await supabase
          .from("appointments")
          .insert(occurrencePayloads)
          .select(appointmentSelectQuery)
      : { data: [], error: null };

    if (createdAppointmentsError) {
      throw createdAppointmentsError;
    }

    const generatedThroughDate =
      occurrenceDates[occurrenceDates.length - 1] || series.generated_through_date;
    const { data: updatedSeries, error: updatedSeriesError } = await supabase
      .from("appointment_series")
      .update({ generated_through_date: generatedThroughDate })
      .select(appointmentSeriesSelectQuery)
      .eq("id", series.id)
      .eq("company_id", companyId)
      .single();

    if (updatedSeriesError) {
      throw updatedSeriesError;
    }

    return {
      series: updatedSeries || {
        ...series,
        generated_through_date: generatedThroughDate
      },
      appointments: createdAppointments || []
    };
  };

  const ensureAppointmentSeriesMaterializedThrough = async ({
    supabase,
    companyId,
    appointmentSeries,
    appointmentSeriesExceptions = []
  }) => {
    const targetDate = formatDateOnly(addDays(startOfDay(new Date()), appointmentGenerationWindowDays));
    const nextSeries = [];
    const createdAppointments = [];

    for (const series of appointmentSeries || []) {
      const extensionKey = `${series.id}:${targetDate}`;

      if (!shouldExtendAppointmentSeries(series) || extendedAppointmentSeriesRef.current.has(extensionKey)) {
        nextSeries.push(series);
        continue;
      }

      try {
        extendedAppointmentSeriesRef.current.add(extensionKey);
        const extensionResult = await extendAppointmentSeriesWindow({
          supabase,
          companyId,
          series,
          appointmentSeriesExceptions
        });

        nextSeries.push(extensionResult.series || series);
        createdAppointments.push(...(extensionResult.appointments || []));
      } catch (error) {
        extendedAppointmentSeriesRef.current.delete(extensionKey);
        console.error("[Appointments Debug] appointment series extension error:", {
          seriesId: series.id,
          error
        });
        nextSeries.push(series);
      }
    }

    return {
      appointmentSeries: nextSeries,
      appointments: createdAppointments
    };
  };

  const fetchServiceOrders = async (supabase, companyId, reason = "unknown") => {
    if (!companyId) {
      setServiceOrders([]);
      setAppointments([]);
      setAppointmentSeries([]);
      setAppointmentSeriesExceptions([]);
      setCalendarError("");
      setSelectedServiceOrderId(null);
      setSelectedServiceOrderSnapshot(null);
      setSelectedAppointment(null);
      setIsServiceOrdersLoading(false);
      return;
    }

    setIsServiceOrdersLoading(true);
    debugLog("[Dashboard Refresh Debug] fetchServiceOrders:", {
      companyId,
      reason,
      timestamp: new Date().toISOString()
    });

    // Read service orders together with the related client record so each
    // calendar event can show the customer's name without extra requests.
    const { data: serviceOrders, error } = await supabase
      .from("service_orders")
      .select(serviceOrderSelectQuery)
      .eq("company_id", companyId)
      .order("service_date", { ascending: true })
      .order("service_time", { ascending: true });

    if (error) {
      setIsServiceOrdersLoading(false);
      console.error("[Backlog DnD Debug] fetchServiceOrders error:", error);
      throw error;
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(appointmentSelectQuery)
      .eq("company_id", companyId)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (appointmentsError) {
      setIsServiceOrdersLoading(false);
      console.error("[Appointments Debug] fetch appointments error:", appointmentsError);
      throw appointmentsError;
    }

    const { data: appointmentSeries, error: appointmentSeriesError } = await supabase
      .from("appointment_series")
      .select(appointmentSeriesSelectQuery)
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (appointmentSeriesError) {
      setIsServiceOrdersLoading(false);
      console.error("[Appointments Debug] fetch appointment series error:", appointmentSeriesError);
      throw appointmentSeriesError;
    }

    const {
      data: appointmentSeriesExceptions,
      error: appointmentSeriesExceptionsError
    } = await supabase
      .from("appointment_series_exceptions")
      .select(appointmentSeriesExceptionSelectQuery)
      .eq("company_id", companyId);

    if (appointmentSeriesExceptionsError) {
      setIsServiceOrdersLoading(false);
      console.error(
        "[Appointments Debug] fetch appointment series exceptions error:",
        appointmentSeriesExceptionsError
      );
      throw appointmentSeriesExceptionsError;
    }

    const extensionResult = await ensureAppointmentSeriesMaterializedThrough({
      supabase,
      companyId,
      appointmentSeries: appointmentSeries || [],
      appointmentSeriesExceptions: appointmentSeriesExceptions || []
    });
    const nextAppointments = [
      ...(appointments || []),
      ...(extensionResult.appointments || [])
    ].sort((left, right) => {
      const leftStart = parseServiceOrderStart(left.appointment_date, left.appointment_time);
      const rightStart = parseServiceOrderStart(right.appointment_date, right.appointment_time);

      return leftStart.getTime() - rightStart.getTime();
    });

    setServiceOrders(serviceOrders || []);
    setAppointments(nextAppointments);
    setAppointmentSeries(extensionResult.appointmentSeries || appointmentSeries || []);
    setAppointmentSeriesExceptions(appointmentSeriesExceptions || []);
    setCalendarError("");
    setSelectedServiceOrderSnapshot((currentSnapshot) => {
      if (!currentSnapshot?.id) {
        return null;
      }

      return (
        (serviceOrders || []).find((serviceOrder) => serviceOrder.id === currentSnapshot.id) ||
        currentSnapshot
      );
    });
    setSelectedServiceOrderId((currentSelectionId) => {
      if (!currentSelectionId) {
        return null;
      }

      const nextSelectionExists = (serviceOrders || []).some(
        (serviceOrder) => serviceOrder.id === currentSelectionId
      )
        ? currentSelectionId
        : null;

      if (!nextSelectionExists) {
        debugLog(
          "[Service Order Debug] fetchServiceOrders cleared selectedServiceOrderId:",
          currentSelectionId
        );
      }

      return nextSelectionExists;
    });
    setIsServiceOrdersLoading(false);
    debugLog("[Backlog DnD Debug] fetchServiceOrders complete:", {
      count: (serviceOrders || []).length
    });
  };

  const fetchTechnicianOrders = async (
    supabase,
    companyId,
    technicianName,
    reason = "unknown"
  ) => {
    if (!companyId || !technicianName) {
      setTechnicianOrders([]);
      setTechnicianOrdersError("");
      setIsTechnicianOrdersLoading(false);
      return;
    }

    setIsTechnicianOrdersLoading(true);
    debugLog("[Dashboard Refresh Debug] fetchTechnicianOrders:", {
      companyId,
      technicianName,
      reason,
      timestamp: new Date().toISOString()
    });

    let query = supabase
      .from("service_orders")
      .select(serviceOrderSelectQuery)
      .eq("company_id", companyId)
      .eq("service_date", getTodayDateString())
      .eq("technician_name", technicianName)
      .order("service_time", { ascending: true });

    let { data, error } = await query;

    if (error) {
      const fallbackQuery = await supabase
        .from("service_orders")
        .select(serviceOrderSelectQuery)
        .eq("company_id", companyId)
        .eq("service_date", getTodayDateString())
        .eq("technician_name", technicianName)
        .order("service_time", { ascending: true });

      data = fallbackQuery.data;
      error = fallbackQuery.error;
    }

    if (error) {
      setTechnicianOrders([]);
      setTechnicianOrdersError(uiText.technicianDashboard.loadError);
      setIsTechnicianOrdersLoading(false);
      return;
    }

    setTechnicianOrders(data || []);
    setTechnicianOrdersError("");
    setSelectedTechnicianOrderId((currentSelectionId) => {
      if (!currentSelectionId) {
        return null;
      }

      return (data || []).some((serviceOrder) => serviceOrder.id === currentSelectionId)
        ? currentSelectionId
        : null;
    });
    setIsTechnicianOrdersLoading(false);
  };

  const fetchClients = async (supabase, companyId, reason = "unknown") => {
    if (!companyId) {
      console.warn("[Multi-tenant] No hay company_id activo para cargar clientes.");
      setClients([]);
      setClientsError("");
      setIsClientsLoading(false);
      return;
    }

    setIsClientsLoading(true);
    debugLog("[Dashboard Refresh Debug] fetchClients:", {
      companyId,
      reason,
      timestamp: new Date().toISOString()
    });

    const scopedQuery = await supabase
      .from("clients")
      .select(
        `
          id,
          name,
          client_type,
          business_name,
          trade_name,
          tax_id,
          main_address,
          main_phone,
          main_contact,
          main_email,
          created_at
        `
      )
      .eq("company_id", companyId);

    const scopedData = scopedQuery.data;
    const scopedError = scopedQuery.error;

    if (scopedError) {
      setClients([]);
      setClientsError(uiText.clients.loadError);
      setIsClientsLoading(false);
      return;
    }

    const sortedClients = (scopedData || [])
      .map(normalizeClientRecord)
      .sort((leftClient, rightClient) =>
        leftClient.displayName.localeCompare(rightClient.displayName, "es", {
          sensitivity: "base"
        })
      );

    setClients(sortedClients);
    setClientsError("");
    setIsClientsLoading(false);
  };

  const fetchBranchesForClient = async (supabase, clientId, companyId) => {
    if (!clientId) {
      return [];
    }

    if (!companyId) {
      console.warn("[Multi-tenant] No hay company_id activo para cargar sucursales.");
      setBranchesByClientId((currentState) => ({
        ...currentState,
        [clientId]: []
      }));
      setBranchesError("");
      setIsBranchesLoading(false);
      return [];
    }

    setIsBranchesLoading(true);

    const { data, error } = await supabase
      .from("branches")
      .select("id, client_id, name, address, phone, contact, notes, created_at")
      .eq("client_id", clientId)
      .eq("company_id", companyId)
      .order("name", { ascending: true });

    if (error) {
      setBranchesError(uiText.clients.branchesLoadError);
      setIsBranchesLoading(false);
      return [];
    }

    let branchRecords = data || [];

    // Keep client flows stable by ensuring every client can expose a usable
    // default "Principal" branch based on its main office data when needed.
    if (branchRecords.length === 0) {
      const clientRecord = clients.find((client) => client.id === clientId);

      if (clientRecord) {
        const { data: createdBranch, error: createError } = await supabase
          .from("branches")
          .insert(buildDefaultBranchPayload(clientRecord, companyId))
          .select("id, client_id, name, address, phone, contact, notes, created_at")
          .single();

        if (!createError && createdBranch) {
          branchRecords = [createdBranch];
        }
      }
    }

    setBranchesByClientId((currentState) => ({
      ...currentState,
      [clientId]: branchRecords
    }));
    setBranchesError("");
    setIsBranchesLoading(false);
    return branchRecords;
  };

  const fetchAllClientBranches = async (supabase, companyId) => {
    if (!companyId) {
      setAllClientBranches([]);
      return [];
    }

    const { data, error } = await supabase
      .from("branches")
      .select("id, client_id, name, address, phone, contact, notes, created_at")
      .eq("company_id", companyId)
      .order("name", { ascending: true });

    if (error) {
      console.error("[Clients Summary Debug] fetch all branches error:", error);
      return [];
    }

    const branchRecords = data || [];
    setAllClientBranches(branchRecords);

    return branchRecords;
  };

  const fetchTechnicians = async (supabase, companyId, reason = "unknown") => {
    if (!companyId) {
      console.warn("[Multi-tenant] No hay company_id activo para cargar tecnicos.");
      setTechnicians([]);
      setTechniciansError("");
      setIsTechniciansLoading(false);
      return;
    }

    setIsTechniciansLoading(true);
    debugLog("[Dashboard Refresh Debug] fetchTechnicians:", {
      companyId,
      reason,
      timestamp: new Date().toISOString()
    });

    let supportsExtendedFields = true;
    let { data, error } = await supabase
      .from("technicians")
      .select("id, full_name, phone, address, notes, is_active, created_at")
      .eq("company_id", companyId)
      .order("full_name", { ascending: true });

    if (error) {
      supportsExtendedFields = false;

      const fallbackResult = await supabase
        .from("technicians")
        .select("id, full_name, is_active, created_at")
        .eq("company_id", companyId)
        .order("full_name", { ascending: true });

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      setTechnicians([]);
      setTechniciansError(uiText.technicians.loadError);
      setIsTechniciansLoading(false);
      return;
    }

    setSupportsExtendedTechnicianFields(supportsExtendedFields);
    setTechnicians(
      (data || []).map((technician) => ({
        phone: "",
        address: "",
        notes: "",
        ...technician
      }))
    );
    setTechniciansError("");
    setIsTechniciansLoading(false);
  };

  const syncTechnicianOrders = (updater) => {
    setTechnicianOrders((currentTechnicianOrders) => {
      const nextTechnicianOrders = updater(currentTechnicianOrders);

      if (nextTechnicianOrders === currentTechnicianOrders) {
        return currentTechnicianOrders;
      }

      return [...nextTechnicianOrders].sort((left, right) => {
        const leftStart = parseServiceOrderStart(left.service_date, left.service_time);
        const rightStart = parseServiceOrderStart(right.service_date, right.service_time);

        return leftStart.getTime() - rightStart.getTime();
      });
    });
  };

  const applyOptimisticServiceOrderPatch = (serviceOrderId, patch) => {
    if (!serviceOrderId) {
      return;
    }

    setServiceOrders((currentServiceOrders) => {
      let didUpdate = false;
      const nextServiceOrders = currentServiceOrders.map((serviceOrder) => {
        if (serviceOrder.id !== serviceOrderId) {
          return serviceOrder;
        }

        didUpdate = true;
        return {
          ...serviceOrder,
          ...patch
        };
      });

      if (!didUpdate) {
        return currentServiceOrders;
      }

      setSelectedServiceOrderSnapshot((currentSnapshot) =>
        currentSnapshot?.id === serviceOrderId
          ? {
              ...currentSnapshot,
              ...patch
            }
          : currentSnapshot
      );
      syncTechnicianOrders((currentTechnicianOrders) => {
        let didUpdate = false;
        const nextTechnicianOrders = currentTechnicianOrders.map((serviceOrder) => {
          if (serviceOrder.id !== serviceOrderId) {
            return serviceOrder;
          }

          didUpdate = true;
          return {
            ...serviceOrder,
            ...patch
          };
        });

        return didUpdate ? nextTechnicianOrders : currentTechnicianOrders;
      });

      return nextServiceOrders;
    });
  };

  const replaceServiceOrderRecord = (nextServiceOrder) => {
    if (!nextServiceOrder?.id) {
      return;
    }

    setServiceOrders((currentServiceOrders) => {
      let didReplace = false;
      const replacedServiceOrders = currentServiceOrders.map((serviceOrder) => {
        if (serviceOrder.id !== nextServiceOrder.id) {
          return serviceOrder;
        }

        didReplace = true;
        return {
          ...serviceOrder,
          ...nextServiceOrder
        };
      });

      const nextServiceOrders = (
        didReplace
          ? replacedServiceOrders
          : [...currentServiceOrders, nextServiceOrder]
      ).sort((left, right) => {
        const leftStart = parseServiceOrderStart(left.service_date, left.service_time);
        const rightStart = parseServiceOrderStart(right.service_date, right.service_time);

        return leftStart.getTime() - rightStart.getTime();
      });

      setSelectedServiceOrderSnapshot((currentSnapshot) =>
        currentSnapshot?.id === nextServiceOrder.id
          ? {
              ...currentSnapshot,
              ...nextServiceOrder
            }
          : currentSnapshot
            ? currentSnapshot
            : null
      );
      syncTechnicianOrders((currentTechnicianOrders) => {
        let didReplace = false;
        const replacedTechnicianOrders = currentTechnicianOrders.map((serviceOrder) => {
          if (serviceOrder.id !== nextServiceOrder.id) {
            return serviceOrder;
          }

          didReplace = true;
          return {
            ...serviceOrder,
            ...nextServiceOrder
          };
        });

        if (didReplace) {
          return replacedTechnicianOrders;
        }

        return nextServiceOrder.service_date === getTodayDateString() &&
          nextServiceOrder.technician_name === userProfile?.full_name
          ? [...currentTechnicianOrders, nextServiceOrder]
          : currentTechnicianOrders;
      });

      debugLog("[Service Order Status Debug] replaceServiceOrderRecord:", {
        serviceOrderId: nextServiceOrder.id,
        status: nextServiceOrder.status,
        didReplace
      });

      return nextServiceOrders;
    });
  };

  const selectServiceOrderRecord = (serviceOrder) => {
    if (!serviceOrder?.id) {
      return;
    }

    setSelectedServiceOrderId(serviceOrder.id);
    setSelectedServiceOrderSnapshot(serviceOrder);
  };

  const resolveServiceOrderBranchId = (selectedClient, selectedBranchId, branchesForClient) => {
    if (isResidentialClient(selectedClient?.client_type)) {
      return resolvePreferredBranch(branchesForClient)?.id || null;
    }

    return selectedBranchId || null;
  };

  const createServiceOrderWithState = async ({
    orderState,
    selectedClient,
    branchesForClient,
    setError,
    setSuccess,
    setSaving,
    resetState,
    onSuccess
  }) => {
    setError("");
    setSuccess("");

    if (!activeCompanyId) {
      setError(uiText.dashboard.profileLoadError);
      return;
    }

    const resolvedBranchId = resolveServiceOrderBranchId(
      selectedClient,
      orderState.branchId,
      branchesForClient
    );

    if (
      orderState.isOneOffLocation &&
      !(orderState.serviceLocationAddress || "").trim()
    ) {
      setError(uiText.serviceOrder.oneOffLocationRequired);
      return;
    }

    if (!resolvedBranchId && !orderState.isOneOffLocation) {
      setError(
        isResidentialClient(selectedClient?.client_type)
          ? uiText.serviceOrder.residentialBranchMissing
          : uiText.serviceOrder.branchEmpty
      );
      return;
    }

    const hasConflict = await checkTechnicianScheduleConflict({
      companyId: activeCompanyId,
      technicianName: orderState.technicianName.trim(),
      serviceDate: orderState.serviceDate,
      serviceTime: orderState.serviceTime.trim(),
      durationMinutes: orderState.durationMinutes
    });

    if (hasConflict) {
      setError(uiText.serviceOrder.technicianConflict);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setError(uiText.serviceOrder.configError);
      return;
    }

    setSaving(true);

    const payload = {
      company_id: activeCompanyId,
      client_id: orderState.clientId,
      branch_id: resolvedBranchId,
      technician_name: orderState.technicianName.trim(),
      service_date: orderState.serviceDate,
      service_time: orderState.serviceTime.trim(),
      duration_minutes: resolveDurationMinutes(orderState.durationMinutes),
      status: orderState.status || "scheduled",
      execution_status: defaultExecutionStatus,
      service_instructions: orderState.serviceInstructions || "",
      ...buildServiceLocationOverridePayload(orderState),
      ...buildRecurrencePayload(orderState)
    };

    try {
      const { data: createdServiceOrder, error: insertError } = await supabase
        .from("service_orders")
        .insert(payload)
        .select(serviceOrderSelectQuery)
        .single();

      if (insertError) {
        console.error("[Service Order Create Error] Failed to insert service order:", {
          payload,
          error: insertError
        });
        throw new Error(insertError.message || uiText.serviceOrder.createError);
      }

      replaceServiceOrderRecord(createdServiceOrder);
      selectServiceOrderRecord(createdServiceOrder);
      setSuccess(uiText.serviceOrder.success);
      resetState();
      onSuccess?.(createdServiceOrder);
    } catch (error) {
      setError(error.message || uiText.serviceOrder.createError);
    } finally {
      setSaving(false);
    }
  };

  const createAppointmentWithState = async ({
    orderState,
    selectedClient,
    branchesForClient,
    setError,
    setSuccess,
    setSaving,
    resetState,
    onSuccess
  }) => {
    setError("");
    setSuccess("");

    if (!activeCompanyId) {
      setError(uiText.dashboard.profileLoadError);
      return;
    }

    const resolvedBranchId = resolveServiceOrderBranchId(
      selectedClient,
      orderState.branchId,
      branchesForClient
    );

    if (orderState.isOneOffLocation && !(orderState.serviceLocationAddress || "").trim()) {
      setError(uiText.serviceOrder.oneOffLocationRequired);
      return;
    }

    if (!resolvedBranchId && !orderState.isOneOffLocation) {
      setError(
        isResidentialClient(selectedClient?.client_type)
          ? uiText.serviceOrder.residentialBranchMissing
          : uiText.serviceOrder.branchEmpty
      );
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setError(uiText.serviceOrder.configError);
      return;
    }

    setSaving(true);

    try {
      if (!orderState.isRecurring) {
        const appointmentPayload = buildAppointmentBasePayload({
          activeCompanyId,
          orderState,
          selectedClient,
          resolvedBranchId
        });

        const { data: createdAppointment, error: appointmentError } = await supabase
          .from("appointments")
          .insert(appointmentPayload)
          .select(appointmentSelectQuery)
          .single();

        if (appointmentError) {
          console.error("[Appointment Create Error] Failed to insert appointment:", {
            payload: appointmentPayload,
            error: appointmentError
          });
          throw new Error(appointmentError.message || "No fue posible crear la cita.");
        }

        await fetchServiceOrders(supabase, activeCompanyId);
        setSelectedServiceOrderId(null);
        setSelectedServiceOrderSnapshot(null);
        setSelectedAppointment(createdAppointment);
        setRightPanelMode(rightPanelModes.detail);
        setSuccess("Cita creada correctamente.");
        resetState();
        onSuccess?.(createdAppointment);
        return;
      }

      const occurrenceDates = expandRecurringAppointments(orderState);
      const generatedThroughDate = occurrenceDates[occurrenceDates.length - 1] || orderState.serviceDate;
      const seriesPayload = buildAppointmentSeriesPayload({
        activeCompanyId,
        orderState,
        selectedClient,
        resolvedBranchId,
        generatedThroughDate
      });

      const { data: createdSeries, error: seriesError } = await supabase
        .from("appointment_series")
        .insert(seriesPayload)
        .select("*")
        .single();

      if (seriesError) {
        console.error("[Appointment Series Create Error] Failed to insert series:", {
          payload: seriesPayload,
          error: seriesError
        });
        throw new Error(seriesError.message || "No fue posible crear la serie de citas.");
      }

      const { data: existingOccurrences, error: existingOccurrencesError } = await supabase
        .from("appointments")
        .select("appointment_date, appointment_time")
        .eq("company_id", activeCompanyId)
        .eq("series_id", createdSeries.id)
        .gte("appointment_date", orderState.serviceDate)
        .lte("appointment_date", generatedThroughDate);

      if (existingOccurrencesError) {
        throw existingOccurrencesError;
      }

      const existingOccurrenceKeys = new Set(
        (existingOccurrences || []).map(
          (appointment) =>
            getAppointmentOccurrenceKey(
              createdSeries.id,
              appointment.appointment_date,
              appointment.appointment_time
            )
        )
      );
      const occurrencePayloads = occurrenceDates
        .map((appointmentDate) =>
          buildAppointmentBasePayload({
            activeCompanyId,
            orderState,
            selectedClient,
            resolvedBranchId,
            recurrenceSeriesId: createdSeries.id,
            appointmentDate
          })
        )
        .filter(
          (appointmentPayload) =>
            !existingOccurrenceKeys.has(
              getAppointmentOccurrenceKey(
                createdSeries.id,
                appointmentPayload.appointment_date,
                appointmentPayload.appointment_time
              )
            )
        );

      const { data: createdAppointments, error: occurrencesError } = occurrencePayloads.length
        ? await supabase
            .from("appointments")
            .insert(occurrencePayloads)
            .select(appointmentSelectQuery)
        : { data: [], error: null };

      if (occurrencesError) {
        console.error("[Appointment Occurrences Create Error] Failed to insert occurrences:", {
          count: occurrencePayloads.length,
          error: occurrencesError
        });
        throw new Error(occurrencesError.message || "No fue posible generar las citas.");
      }

      await fetchServiceOrders(supabase, activeCompanyId);
      setAppointmentSeries((currentSeries) => [createdSeries, ...currentSeries]);
      setSelectedServiceOrderId(null);
      setSelectedServiceOrderSnapshot(null);
      setSelectedAppointment(createdAppointments?.[0] || null);
      setRightPanelMode(rightPanelModes.detail);
      setSuccess(`Serie creada con ${createdAppointments?.length || 0} citas.`);
      resetState();
      onSuccess?.(createdAppointments?.[0] || createdSeries);
    } catch (error) {
      setError(error.message || "No fue posible crear la cita.");
    } finally {
      setSaving(false);
    }
  };

  const checkTechnicianScheduleConflict = async ({
    companyId,
    technicianName,
    serviceDate,
    serviceTime,
    durationMinutes,
    excludeOrderId = null
  }) => {
    if (!companyId || !technicianName || !serviceDate || !serviceTime) {
      debugLog("[Backlog DnD Debug] conflict check skipped:", {
        companyId,
        technicianName,
        serviceDate,
        serviceTime
      });
      return false;
    }

    const candidateStart = parseServiceOrderStart(serviceDate, serviceTime);

    if (!isValid(candidateStart)) {
      console.warn("[Backlog DnD Debug] conflict check skipped: invalid candidate start", {
        serviceDate,
        serviceTime
      });
      return false;
    }

    const candidateEnd = addMinutes(
      candidateStart,
      resolveDurationMinutes(durationMinutes)
    );

    const hasConflict = serviceOrders.some((serviceOrder) => {
      if (serviceOrder.company_id !== companyId) {
        return false;
      }

      if (serviceOrder.technician_name !== technicianName) {
        return false;
      }

      if (serviceOrder.service_date !== serviceDate) {
        return false;
      }

      if (serviceOrder.status !== "scheduled") {
        return false;
      }

      if (excludeOrderId && serviceOrder.id === excludeOrderId) {
        return false;
      }

      if (!serviceOrder.service_date || !serviceOrder.service_time) {
        return false;
      }

      const existingStart = parseServiceOrderStart(
        serviceOrder.service_date,
        serviceOrder.service_time
      );

      if (!isValid(existingStart)) {
        return false;
      }

      const existingEnd = addMinutes(
        existingStart,
        resolveDurationMinutes(serviceOrder.duration_minutes)
      );

      return rangesOverlap(candidateStart, candidateEnd, existingStart, existingEnd);
    });

    debugLog("[Backlog DnD Debug] conflict check result:", {
      technicianName,
      serviceDate,
      serviceTime,
      durationMinutes: resolveDurationMinutes(durationMinutes),
      excludeOrderId,
      hasConflict
    });

    return hasConflict;
  };

  const updateServiceOrderSchedule = async ({
    serviceOrderId,
    technicianName,
    serviceDate,
    serviceTime,
    durationMinutes,
    status,
    serviceInstructions = undefined,
    serviceReport = undefined,
    serviceSummary = undefined,
    findings = undefined,
    recommendations = undefined,
    materialsUsed = undefined,
    executionStatus = undefined,
    startedAt = undefined,
    completedAt = undefined,
    actualStartAt = undefined,
    actualEndAt = undefined,
    completedBy = undefined,
    completionNotes = undefined,
    isOneOffLocation = undefined,
    serviceLocationName = undefined,
    serviceLocationAddress = undefined,
    serviceLocationPhone = undefined,
    serviceLocationContact = undefined,
    clientId = undefined,
    recurrenceState = null,
    existingOrder = null,
    branchId = undefined,
    excludeOrderId = null,
    skipConflictCheck = false
  }) => {
    if (!serviceOrderId) {
      throw new Error(uiText.dashboard.detailError);
    }

    if (!activeCompanyId) {
      throw new Error(uiText.dashboard.profileLoadError);
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error(uiText.serviceOrder.configError);
    }

    if (!skipConflictCheck) {
      const hasConflict = await checkTechnicianScheduleConflict({
        companyId: activeCompanyId,
        technicianName,
        serviceDate,
        serviceTime,
        durationMinutes,
        excludeOrderId
      });

      if (hasConflict) {
        throw new Error(uiText.serviceOrder.technicianConflict);
      }
    }

    debugLog("[Backlog DnD Debug] updateServiceOrderSchedule normalized input:", {
      serviceOrderId,
      currentStatus:
        existingOrder?.status ||
        serviceOrders.find((serviceOrder) => serviceOrder.id === serviceOrderId)?.status ||
        null,
      nextStatus: status,
      technicianBefore: existingOrder?.technician_name || technicianName,
      technicianAfter: technicianName,
      serviceDate,
      serviceTime,
      durationMinutes: resolveDurationMinutes(durationMinutes),
      branchId,
      clientId,
      recurrenceGroupId: existingOrder?.recurrence_group_id || null
    });

    const currentOrder =
      existingOrder || serviceOrders.find((serviceOrder) => serviceOrder.id === serviceOrderId) || null;

    const persistencePayload = {
      technician_name: technicianName,
      service_date: serviceDate,
      service_time: serviceTime,
      duration_minutes: resolveDurationMinutes(durationMinutes),
      status
    };

    if (serviceInstructions !== undefined) {
      persistencePayload.service_instructions = serviceInstructions;
    }

    if (serviceReport !== undefined) {
      persistencePayload.service_report = serviceReport;
    }

    if (serviceSummary !== undefined) {
      persistencePayload.service_summary = serviceSummary;
    }

    if (findings !== undefined) {
      persistencePayload.findings = findings;
    }

    if (recommendations !== undefined) {
      persistencePayload.recommendations = recommendations;
    }

    if (materialsUsed !== undefined) {
      persistencePayload.materials_used = materialsUsed;
    }

    if (executionStatus !== undefined) {
      persistencePayload.execution_status = executionStatus;
    } else if (status === "completed") {
      persistencePayload.execution_status = "completed";
    } else if (currentOrder?.status === "completed" && status !== "completed") {
      persistencePayload.execution_status = defaultExecutionStatus;
    }

    if (startedAt !== undefined) {
      persistencePayload.started_at = startedAt;
    } else if (status === "completed" && currentOrder?.started_at) {
      persistencePayload.started_at = currentOrder.started_at;
    } else if (currentOrder?.status === "completed" && status !== "completed") {
      persistencePayload.started_at = null;
    }

    if (completedAt !== undefined) {
      persistencePayload.completed_at = completedAt;
    } else if (status === "completed") {
      persistencePayload.completed_at = currentOrder?.completed_at || new Date().toISOString();
    } else if (currentOrder?.status === "completed" && status !== "completed") {
      persistencePayload.completed_at = null;
    }

    if (actualStartAt !== undefined) {
      persistencePayload.actual_start_at = actualStartAt;
    }

    if (actualEndAt !== undefined) {
      persistencePayload.actual_end_at = actualEndAt;
    }

    if (completedBy !== undefined) {
      persistencePayload.completed_by = completedBy;
    }

    if (completionNotes !== undefined) {
      persistencePayload.completion_notes = completionNotes;
    }

    if (recurrenceState) {
      Object.assign(persistencePayload, buildRecurrencePayload(recurrenceState, existingOrder));
    }

    if (isOneOffLocation !== undefined) {
      Object.assign(persistencePayload, {
        is_one_off_location: Boolean(isOneOffLocation),
        service_location_name: Boolean(isOneOffLocation)
          ? (serviceLocationName || "").trim() || null
          : null,
        service_location_address: Boolean(isOneOffLocation)
          ? (serviceLocationAddress || "").trim() || null
          : null,
        service_location_phone: Boolean(isOneOffLocation)
          ? (serviceLocationPhone || "").trim() || null
          : null,
        service_location_contact: Boolean(isOneOffLocation)
          ? (serviceLocationContact || "").trim() || null
          : null
      });
    }

    if (branchId !== undefined) {
      persistencePayload.branch_id = branchId;
    }

    if (clientId !== undefined) {
      persistencePayload.client_id = clientId;
    }

    const optimisticPatch = {
      ...persistencePayload
    };

    if (branchId !== undefined) {
      const availableClientBranches = branchesByClientId[clientId || currentOrder?.client_id] || [];
      optimisticPatch.branches =
        availableClientBranches.find((branch) => branch.id === branchId) ||
        currentOrder?.branches ||
        null;
    }

    if (clientId !== undefined) {
      optimisticPatch.clients = clients.find((client) => client.id === clientId) || null;
    }

    applyOptimisticServiceOrderPatch(serviceOrderId, optimisticPatch);
    debugLog("[Backlog DnD Debug] updateServiceOrderSchedule optimistic patch applied:", {
      serviceOrderId,
      payload: optimisticPatch
    });

    debugLog("[Backlog DnD Debug] updateServiceOrderSchedule Supabase payload:", {
      serviceOrderId,
      payload: persistencePayload
    });

    const { data: updatedServiceOrder, error: updateError } = await supabase
      .from("service_orders")
      .update(persistencePayload)
      .select(serviceOrderSelectQuery)
      .eq("id", serviceOrderId)
      .eq("company_id", activeCompanyId)
      .single();

    if (updateError) {
      if (currentOrder) {
        applyOptimisticServiceOrderPatch(serviceOrderId, {
          technician_name: currentOrder.technician_name,
          service_date: currentOrder.service_date,
          service_time: currentOrder.service_time,
          duration_minutes: currentOrder.duration_minutes,
          status: currentOrder.status,
          execution_status: currentOrder.execution_status || defaultExecutionStatus,
          service_instructions: currentOrder.service_instructions || "",
          service_report: currentOrder.service_report || "",
          started_at: currentOrder.started_at || null,
          completed_at: currentOrder.completed_at || null,
          is_one_off_location: Boolean(currentOrder.is_one_off_location),
          service_location_name: currentOrder.service_location_name || null,
          service_location_address: currentOrder.service_location_address || null,
          service_location_phone: currentOrder.service_location_phone || null,
          service_location_contact: currentOrder.service_location_contact || null,
          branch_id: currentOrder.branch_id ?? null,
          client_id: currentOrder.client_id ?? null,
          clients: currentOrder.clients || null,
          branches: currentOrder.branches || null,
          ...buildRecurrencePayload(getRecurrenceFormState(currentOrder), currentOrder)
        });
      }

      console.error("[Backlog DnD Debug] updateServiceOrderSchedule Supabase failure:", {
        serviceOrderId,
        error: updateError
      });
      throw new Error(updateError.message || uiText.dashboard.detailError);
    }

    debugLog("[Backlog DnD Debug] updateServiceOrderSchedule Supabase success:", {
      serviceOrderId,
      returnedStatus: updatedServiceOrder?.status || null
    });

    if (updatedServiceOrder) {
      replaceServiceOrderRecord(updatedServiceOrder);
    }

    debugLog("[Service Order Status Debug] updateServiceOrderSchedule success:", {
      serviceOrderId,
      optimisticStatus: optimisticPatch.status,
      snapshotStatus:
        selectedServiceOrderSnapshot?.id === serviceOrderId
          ? selectedServiceOrderSnapshot?.status || null
          : null,
      persistedStatus: updatedServiceOrder?.status || null
    });

    return updatedServiceOrder || null;
  };

  const getCalendarEventStyle = (event) => {
    if (event?.type === "projected_appointment") {
      return {
        style: {
          background: "color-mix(in srgb, #cbd5e1 16%, #f8fafc 84%)",
          borderColor: "transparent",
          color: "#64748b",
          boxShadow: "none",
          borderWidth: 0
        },
        className: "calendar-event-shell-appointment calendar-event-shell-appointment-projected"
      };
    }

    if (event?.type === "appointment") {
      return {
        style: {
          background: event?.isConvertedAppointment
            ? "color-mix(in srgb, #64748b 30%, #f8fafc 70%)"
            : "color-mix(in srgb, #94a3b8 18%, #f8fafc 82%)",
          borderColor: "transparent",
          color: event?.isConvertedAppointment ? "#334155" : "#475569",
          boxShadow: event?.isConvertedAppointment
            ? "0 1px 4px rgba(15, 23, 42, 0.04)"
            : "none",
          borderWidth: 0
        },
        className: [
          "calendar-event-shell-appointment",
          event?.isConvertedAppointment ? "calendar-event-shell-appointment-converted" : ""
        ]
          .filter(Boolean)
          .join(" ")
      };
    }

    return {
      style: {
        background: event?.isOverdue
          ? "color-mix(in srgb, #c2410c " +
            (showOnlyOverdue ? "76%" : "68%") +
            ", #fff2ef " +
            (showOnlyOverdue ? "24%" : "32%") +
            ")"
          : "color-mix(in srgb, " +
            (event?.technicianColor?.accent || "#64748b") +
            " 64%, #f8fbff 36%)",
        borderColor: "transparent",
        color: event?.isOverdue ? "#fffaf7" : "#f8fbff",
        boxShadow: `0 2px 5px ${
          (event?.isOverdue
            ? showOnlyOverdue
              ? "#c2410c20"
              : "#c2410c18"
            : (event?.technicianColor?.accent || "#64748b") + "14")
        }`,
        borderWidth: 0
      },
      className: [
        "calendar-event-shell-service-order",
        event?.isOverdue ? "calendar-event-overdue" : "",
        event?.isOverdue && showOnlyOverdue ? "calendar-event-overdue-filtered" : "",
        event?.id === selectedServiceOrderId ? "calendar-event-shell-selected" : ""
      ]
        .filter(Boolean)
        .join(" ")
    };
  };

  const getCalendarDayStyle = (date) => {
    if (!(date instanceof Date) || !isValid(date)) {
      return {};
    }

    if (calendarView !== "week" && calendarView !== "month") {
      return {};
    }

    return startOfDay(date).getTime() < startOfDay(new Date()).getTime()
      ? {
          className: "calendar-day-past",
          style: {
            backgroundColor: "#f7f8fa",
            color: "#94a3b8"
          }
        }
      : {};
  };

  const getCalendarSlotStyle = (date) => {
    if (!(date instanceof Date) || !isValid(date) || calendarView !== "week") {
      return {};
    }

    const now = new Date();
    const isTodaySlot = startOfDay(date).getTime() === startOfDay(now).getTime();

    if (!isTodaySlot || date.getTime() >= now.getTime()) {
      return {};
    }

    return {
      className: "calendar-slot-past",
      style: {
        backgroundColor: "#fafafa",
        opacity: 0.62
      }
    };
  };

  const handleCalendarViewChange = (nextView) => {
    setCalendarView(nextView);

    if (nextView === operationalCalendarView) {
      setCalendarDate(startOfDay(new Date()));
    }
  };

  const handleCalendarNavigate = (nextDate) => {
    if (!nextDate || !isValid(nextDate)) {
      return;
    }

    if (calendarView === operationalCalendarView) {
      setCalendarDate(startOfDay(nextDate));
      return;
    }

    setCalendarDate(nextDate);
  };

  const saveClientRecord = async ({
    clientState,
    clientId = null,
    autoCreateDefaultBranch = true,
    defaultBranchPayload = null
  }) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error(uiText.clients.configError);
    }

    if (!activeCompanyId) {
      throw new Error(uiText.dashboard.profileLoadError);
    }

    const businessName = clientState.businessName.trim();
    const tradeName = clientState.tradeName.trim();
    const explicitName = (clientState.name || "").trim();
    const payload = {
      company_id: activeCompanyId,
      name: explicitName || tradeName || businessName,
      client_type: clientState.clientType,
      business_name: businessName,
      trade_name: tradeName,
      tax_id: clientState.taxId.trim(),
      main_address: clientState.mainAddress.trim(),
      main_phone: clientState.mainPhone.trim(),
      main_contact: clientState.mainContact.trim(),
      main_email: clientState.mainEmail.trim()
    };

    const clientQuery = clientId
      ? supabase
          .from("clients")
          .update(payload)
          .eq("id", clientId)
          .eq("company_id", activeCompanyId)
          .select(
            `
              id,
              name,
              client_type,
              business_name,
              trade_name,
              tax_id,
              main_address,
              main_phone,
              main_contact,
              main_email,
              created_at
            `
          )
          .single()
      : supabase
          .from("clients")
          .insert(payload)
          .select(
            `
              id,
              name,
              client_type,
              business_name,
              trade_name,
              tax_id,
              main_address,
              main_phone,
              main_contact,
              main_email,
              created_at
            `
          )
          .single();

    const { data: savedClient, error } = await clientQuery;

    if (error) {
      throw new Error(error.message || uiText.clients.createError);
    }

    if (savedClient?.id && autoCreateDefaultBranch) {
      const { count, error: branchCountError } = await supabase
        .from("branches")
        .select("id", { count: "exact", head: true })
        .eq("client_id", savedClient.id)
        .eq("company_id", activeCompanyId);

      if (!branchCountError && count === 0) {
        const resolvedDefaultBranchPayload = defaultBranchPayload
          ? {
              ...defaultBranchPayload,
              company_id: activeCompanyId,
              client_id: savedClient.id
            }
          : buildDefaultBranchPayload(normalizeClientRecord(savedClient), activeCompanyId);

        await supabase
          .from("branches")
          .insert(resolvedDefaultBranchPayload);
      }
    }

    await fetchClients(supabase, activeCompanyId);
    return normalizeClientRecord(savedClient);
  };

  const saveBranchRecord = async ({
    branchState,
    clientId,
    branchId = null,
    preserveOrderClient = false
  }) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error(uiText.clients.configError);
    }

    if (!activeCompanyId) {
      throw new Error(uiText.dashboard.profileLoadError);
    }

    if (!clientId) {
      throw new Error(uiText.clients.branchesSelectClient);
    }

    const payload = {
      company_id: activeCompanyId,
      client_id: clientId,
      name: branchState.name.trim(),
      address: branchState.address.trim(),
      phone: (branchState.phone || "").trim(),
      contact: (branchState.contact || "").trim(),
      notes: (branchState.notes || "").trim()
    };

    const branchQuery = branchId
      ? supabase
          .from("branches")
          .update(payload)
          .eq("id", branchId)
          .eq("company_id", activeCompanyId)
          .select("id, client_id, name, address, phone, contact, notes, created_at")
          .single()
      : supabase
          .from("branches")
          .insert(payload)
          .select("id, client_id, name, address, phone, contact, notes, created_at")
          .single();

    const { data: savedBranch, error } = await branchQuery;

    if (error) {
      throw new Error(error.message || uiText.clients.branchCreateError);
    }

    await fetchBranchesForClient(supabase, clientId, activeCompanyId);

    if (!preserveOrderClient && formState.clientId === clientId) {
      await fetchBranchesForClient(supabase, formState.clientId, activeCompanyId);
    }

    return savedBranch;
  };

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      router.replace("/");
      router.refresh();
      return;
    }

    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setIsProfileResolved(false);
      setUserProfile(null);

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session?.user) {
        router.replace("/");
        router.refresh();
        return;
      }

      setAuthUserId(session.user.id || "");
      setUserEmail(session.user.email || "");
      setProfileError("");

      try {
        await fetchUserProfile(supabase, session.user.id, "initial-mount");
      } catch (_profileError) {
        setUserProfile(null);
        setProfileError(uiText.dashboard.profileLoadError);
        setIsProfileResolved(true);
      }

      setIsLoading(false);
    }

    loadDashboard();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      debugLog("[Dashboard Refresh Debug] auth state change:", {
        event,
        hasUser: Boolean(session?.user),
        nextUserId: session?.user?.id || null,
        currentUserId: authUserIdRef.current || null,
        timestamp: new Date().toISOString()
      });

      if (!session?.user) {
        router.replace("/");
        router.refresh();
        return;
      }

      const nextUserId = session.user.id || "";
      const isSameUser = Boolean(nextUserId) && nextUserId === authUserIdRef.current;
      const shouldRefreshProfileInPlace =
        isSameUser &&
        ["TOKEN_REFRESHED", "SIGNED_IN", "USER_UPDATED", "INITIAL_SESSION"].includes(event);

      setAuthUserId(nextUserId);
      setUserEmail(session.user.email || "");

      if (!shouldRefreshProfileInPlace) {
        setIsLoading(true);
        setIsProfileResolved(false);
        setUserProfile(null);
      }

      fetchUserProfile(
        supabase,
        session.user.id,
        shouldRefreshProfileInPlace ? `auth-${event}-in-place` : `auth-${event}`
      )
        .catch(() => {
          setUserProfile(null);
          setProfileError(uiText.dashboard.profileLoadError);
          setIsProfileResolved(true);
        })
        .finally(() => {
          if (!shouldRefreshProfileInPlace) {
            setIsLoading(false);
          }
        });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !activeCompanyId) {
      lastLoadedActiveCompanyIdRef.current = null;
      setActiveCompany(null);
      setCompanySettingsForm(initialCompanySettingsForm);
      setCompanySettingsError("");
      setCompanySettingsMessage("");
      return;
    }

    if (lastLoadedActiveCompanyIdRef.current === activeCompanyId) {
      debugLog("[Dashboard Refresh Debug] skip fetchActiveCompany same company:", {
        companyId: activeCompanyId,
        timestamp: new Date().toISOString()
      });
      return;
    }

    lastLoadedActiveCompanyIdRef.current = activeCompanyId;

    fetchActiveCompany(supabase, activeCompanyId, "active-company-effect").catch(() => {
      lastLoadedActiveCompanyIdRef.current = null;
      setActiveCompany(null);
      setCompanySettingsError(uiText.dashboard.companySettingsLoadError);
    });
  }, [activeCompanyId]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !activeCompanyId || isTechnicianUser) {
      lastLoadedCompanyIdRef.current = null;
      setServiceOrders([]);
      setAppointments([]);
      setAppointmentSeries([]);
      setAppointmentSeriesExceptions([]);
      setCalendarError("");
      setSelectedAppointment(null);
      setIsServiceOrdersLoading(false);
      return;
    }

    if (lastLoadedCompanyIdRef.current === activeCompanyId) {
      debugLog("[Dashboard Refresh Debug] skip fetchServiceOrders same company:", {
        companyId: activeCompanyId,
        timestamp: new Date().toISOString()
      });
      return;
    }

    lastLoadedCompanyIdRef.current = activeCompanyId;

    fetchServiceOrders(supabase, activeCompanyId, "calendar-company-effect").catch(() => {
      lastLoadedCompanyIdRef.current = null;
      setCalendarError(uiText.dashboard.calendarErrorBody);
      setAppointments([]);
      setAppointmentSeries([]);
      setSelectedAppointment(null);
      setIsServiceOrdersLoading(false);
    });
  }, [activeCompanyId, isTechnicianUser]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (
      !supabase ||
      !activeCompanyId ||
      isTechnicianUser ||
      (rightPanelMode !== rightPanelModes.create &&
        activeTab !== uiText.tabs.newServiceOrder &&
        activeTab !== uiText.tabs.clients) ||
      clients.length > 0
    ) {
      return;
    }

    fetchClients(supabase, activeCompanyId, "create-drawer-prefetch");
  }, [activeCompanyId, activeTab, clients.length, isTechnicianUser, rightPanelMode]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (
      !supabase ||
      !activeCompanyId ||
      isTechnicianUser ||
      (rightPanelMode !== rightPanelModes.create &&
        activeTab !== uiText.tabs.technicians &&
        activeTab !== uiText.tabs.newServiceOrder) ||
      technicians.length > 0
    ) {
      return;
    }

    fetchTechnicians(supabase, activeCompanyId, "create-drawer-prefetch");
  }, [
    activeCompanyId,
    activeTab,
    technicians.length,
    isTechnicianUser,
    rightPanelMode
  ]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !activeCompanyId || !formState.clientId) {
      return;
    }

    fetchBranchesForClient(supabase, formState.clientId, activeCompanyId);
  }, [activeCompanyId, clients, formState.clientId]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !activeCompanyId || !selectedBranchClientId) {
      return;
    }

    fetchBranchesForClient(supabase, selectedBranchClientId, activeCompanyId);
  }, [activeCompanyId, clients, selectedBranchClientId]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (
      !supabase ||
      !activeCompanyId ||
      activeTopLevelTab !== dashboardTabs.clients ||
      !selectedClientId
    ) {
      return;
    }

    fetchBranchesForClient(supabase, selectedClientId, activeCompanyId);
  }, [activeCompanyId, activeTopLevelTab, selectedClientId]);

  useEffect(() => {
    if (activeTopLevelTab === dashboardTabs.clients) {
      setClientsModuleTab(defaultClientsModuleTab);
    }
  }, [activeTopLevelTab]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !activeCompanyId || activeTopLevelTab !== dashboardTabs.clients) {
      if (!activeCompanyId) {
        lastLoadedClientBranchesCompanyIdRef.current = null;
        setAllClientBranches([]);
      }
      return;
    }

    if (lastLoadedClientBranchesCompanyIdRef.current === activeCompanyId) {
      return;
    }

    lastLoadedClientBranchesCompanyIdRef.current = activeCompanyId;
    fetchAllClientBranches(supabase, activeCompanyId).catch(() => {
      lastLoadedClientBranchesCompanyIdRef.current = null;
      setAllClientBranches([]);
    });
  }, [activeCompanyId, activeTopLevelTab]);

  useEffect(() => {
    if (!activeEntityType) {
      setClientDrawerForm(initialClientDrawerForm);
      setContactDrawerForm(initialContactDrawerForm);
      setDrawerBranchForm(initialBranchFormState);
      return;
    }

    if (activeEntityType === "client") {
      setActiveClientDrawerTab((currentTab) => {
        if (activeMode === "detail") {
          return clientDrawerTabs.summary;
        }

        return currentTab === clientDrawerTabs.summary
          ? clientDrawerTabs.client
          : currentTab;
      });
      setActiveContactId(null);
      setActiveBranchFormId(null);
      setClientDrawerForm(
        activeClient
          ? {
              name: activeClient.name || activeClient.displayName || "",
              clientType: activeClient.client_type || "commercial",
              mainPhone: activeClient.main_phone || "",
              mainEmail: activeClient.main_email || "",
              mainContact: activeClient.main_contact || "",
              businessName: activeClient.business_name || "",
              tradeName: activeClient.trade_name || "",
              taxId: activeClient.tax_id || ""
            }
          : initialClientDrawerForm
      );
      setContactDrawerForm(initialContactDrawerForm);
      setDrawerBranchForm(initialBranchFormState);
      setClientDrawerError("");
      setClientDrawerMessage("");
      setContactDrawerError("");
      setDrawerBranchError("");
      setDrawerBranchMessage("");
      return;
    }

    setActiveContactId(null);
    setDrawerBranchForm(
      activeBranch
        ? {
            name: activeBranch.name || "",
            address: activeBranch.address || "",
            phone: activeBranch.phone || "",
            contact: activeBranch.contact || "",
            notes: activeBranch.notes || ""
          }
        : {
            ...initialBranchFormState,
            name: "Principal"
          }
    );
    setActiveBranchFormId(activeBranch?.id || null);
    setContactDrawerForm(initialContactDrawerForm);
    setClientDrawerError("");
    setClientDrawerMessage("");
    setContactDrawerError("");
    setDrawerBranchError("");
    setDrawerBranchMessage("");
  }, [activeBranch, activeClient, activeEntityType, activeMode]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (
      !supabase ||
      !activeCompanyId ||
      activeTopLevelTab !== dashboardTabs.clients ||
      !activeDrawerClientId
    ) {
      return;
    }

    if (!branchesByClientId[activeDrawerClientId]) {
      fetchBranchesForClient(supabase, activeDrawerClientId, activeCompanyId);
    }

    if (contactsByClientId[activeDrawerClientId]) {
      return;
    }

    let isMounted = true;
    setIsContactsLoading(true);
    setContactsError("");

    fetchContactsForClient(supabase, activeDrawerClientId, activeCompanyId)
      .then((contacts) => {
        if (!isMounted) {
          return;
        }

        setContactsByClientId((currentState) => ({
          ...currentState,
          [activeDrawerClientId]: contacts
        }));
        setContactsError("");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setContactsError(error.message || "No fue posible cargar los contactos.");
      })
      .finally(() => {
        if (isMounted) {
          setIsContactsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCompanyId, activeDrawerClientId, activeTopLevelTab, branchesByClientId, contactsByClientId]);

  useEffect(() => {
    if (!selectedServiceOrder) {
      setDetailFormState(initialDetailFormState);
      setDetailFormMessage("");
      setDetailFormError("");
      setIsConfirmingDeleteServiceOrder(false);
      setIsDeletingServiceOrder(false);
      setRightPanelMode((currentMode) =>
        currentMode === rightPanelModes.create || selectedAppointment
          ? currentMode
          : rightPanelModes.empty
      );
      return;
    }

    // Mirror the selected order into local form state so the side panel can edit it.
    setDetailFormState({
      clientId: selectedServiceOrder.client_id || "",
      branchId: selectedServiceOrder.branch_id || "",
      isOneOffLocation: hasServiceLocationOverride(selectedServiceOrder),
      serviceLocationName: selectedServiceOrder.service_location_name || "",
      serviceLocationAddress: selectedServiceOrder.service_location_address || "",
      serviceLocationPhone: selectedServiceOrder.service_location_phone || "",
      serviceLocationContact: selectedServiceOrder.service_location_contact || "",
      technicianName: selectedServiceOrder.technician_name || "",
      serviceDate: selectedServiceOrder.service_date || "",
      serviceTime: selectedServiceOrder.service_time || "9:00 AM",
      durationMinutes: resolveDurationMinutes(selectedServiceOrder.duration_minutes),
      serviceInstructions: selectedServiceOrder.service_instructions || "",
      serviceReport: selectedServiceOrder.service_report || "",
      serviceSummary: selectedServiceOrder.service_summary || "",
      findings: selectedServiceOrder.findings || "",
      recommendations: selectedServiceOrder.recommendations || "",
      materialsUsed: selectedServiceOrder.materials_used || "",
      actualStartAt: formatDateTimeLocalValue(
        selectedServiceOrder.actual_start_at || selectedServiceOrder.started_at
      ),
      actualEndAt: formatDateTimeLocalValue(
        selectedServiceOrder.actual_end_at || selectedServiceOrder.completed_at
      ),
      completionNotes: selectedServiceOrder.completion_notes || "",
      ...getRecurrenceFormState(selectedServiceOrder),
      status: selectedServiceOrder.status || "scheduled"
    });
    setDetailFormMessage("");
    setDetailFormError("");
    setIsConfirmingDeleteServiceOrder(false);
    setSelectedAppointment(null);
    setRightPanelMode(rightPanelModes.detail);
  }, [selectedAppointment, selectedServiceOrder]);

  useEffect(() => {
    debugLog("[Service Order Debug] Selection state:", {
      selectedServiceOrderId,
      selectedServiceOrderSnapshot,
      selectedServiceOrder
    });
  }, [selectedServiceOrderId, selectedServiceOrderSnapshot, selectedServiceOrder]);

  useEffect(() => {
    debugLog("[Service Order Debug] Detail panel render gate:", {
      hasSelectedServiceOrder: Boolean(selectedServiceOrder),
      selectedServiceOrderId,
      selectedServiceOrderSnapshot,
      selectedServiceOrder
    });
  }, [
    selectedServiceOrder,
    selectedServiceOrderId,
    selectedServiceOrderSnapshot
  ]);

  useEffect(() => {
    setIsChoosingRecurringAppointmentDelete(false);
  }, [selectedAppointment?.id, rightPanelMode]);

  useEffect(() => {
    if (!selectedAppointment) {
      setIsPreparingAppointmentConversion(false);
      setAppointmentConversionForm(initialAppointmentConversionForm);
      return;
    }

    setIsPreparingAppointmentConversion(false);
    setAppointmentConversionForm({
      technicianName: "",
      serviceDate: selectedAppointment.appointment_date || "",
      serviceTime: selectedAppointment.appointment_time || "9:00 AM",
      durationMinutes: resolveDurationMinutes(selectedAppointment.duration_minutes),
      serviceInstructions: selectedAppointment.notes || ""
    });
  }, [selectedAppointment?.id]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (
      !supabase ||
      !activeCompanyId ||
      isTechnicianUser ||
      !selectedServiceOrderId ||
      technicians.length > 0
    ) {
      return;
    }

    fetchTechnicians(supabase, activeCompanyId, "service-order-selection-prefetch");
  }, [activeCompanyId, selectedServiceOrderId, technicians.length, isTechnicianUser]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !activeCompanyId || !detailFormState.clientId) {
      return;
    }

    fetchBranchesForClient(supabase, detailFormState.clientId, activeCompanyId);
  }, [activeCompanyId, detailFormState.clientId]);

  useEffect(() => {
    if (!selectedServiceOrder) {
      return;
    }

    if (!isResidentialDetailClient) {
      return;
    }

    const resolvedBranch = preferredDetailResidentialBranch;

    if (!resolvedBranch) {
      return;
    }

    setDetailFormState((currentState) => ({
      ...currentState,
      branchId: resolvedBranch.id
    }));
  }, [
    isResidentialDetailClient,
    preferredDetailResidentialBranch,
    selectedServiceOrder
  ]);

  useEffect(() => {
    if (!selectedFormClient) {
      return;
    }

    if (!isResidentialFormClient) {
      return;
    }

    const resolvedBranch = preferredResidentialBranch;

    if (!resolvedBranch) {
      return;
    }

    setFormState((currentState) => ({
      ...currentState,
      branchId: resolvedBranch.id
    }));
  }, [isResidentialFormClient, preferredResidentialBranch, selectedFormClient]);

  useEffect(() => {
    if (
      !formState.clientId ||
      isResidentialFormClient ||
      isBranchesLoading ||
      formState.branchId ||
      availableBranches.length !== 1
    ) {
      return;
    }

    setFormState((currentState) => ({
      ...currentState,
      branchId: availableBranches[0].id
    }));
  }, [
    availableBranches,
    formState.branchId,
    formState.clientId,
    isBranchesLoading,
    isResidentialFormClient
  ]);

  useEffect(() => {
    if (!isCreateServiceOrderMode) {
      return;
    }

    const clientSelect = createServiceOrderClientSelectRef.current;

    if (clientSelect && !formState.clientId) {
      requestAnimationFrame(() => {
        clientSelect.focus();
      });
    }
  }, [formState.clientId, isCreateServiceOrderMode]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !isTechnicianUser) {
      setTechnicianOrders([]);
      setSelectedTechnicianOrderId(null);
      setTechnicianOrdersError("");
      setTechnicianActionMessage("");
      setTechnicianActionError("");
      setIsTechnicianOrdersLoading(false);
      return;
    }

    if (!activeCompanyId || !userProfile?.full_name) {
      console.warn(
        "[Multi-tenant] No hay company_id o nombre de tecnico disponibles para cargar servicios."
      );
      setTechnicianOrders([]);
      setSelectedTechnicianOrderId(null);
      setTechnicianOrdersError("");
      setIsTechnicianOrdersLoading(false);
      return;
    }

    fetchTechnicianOrders(
      supabase,
      activeCompanyId,
      userProfile.full_name,
      "technician-dashboard-effect"
    );
  }, [activeCompanyId, isTechnicianUser, userProfile?.full_name]);

  useEffect(() => {
    if (supportsExtendedTechnicianFields) {
      return;
    }

    setTechnicianForm((currentState) => ({
      ...currentState,
      phone: "",
      address: "",
      notes: ""
    }));
  }, [supportsExtendedTechnicianFields]);

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormError("");
    setFormMessage("");

    setFormState((currentState) => ({
      ...currentState,
      recurrenceDays:
        name === "recurrenceDays"
          ? checked
            ? [...new Set([...currentState.recurrenceDays, value])]
            : currentState.recurrenceDays.filter((recurrenceDay) => recurrenceDay !== value)
          : name === "isRecurring" && checked === false
            ? []
          : name === "recurrenceType" && !["weekly", "custom"].includes(value)
            ? []
            : currentState.recurrenceDays,
      isOneOffLocation:
        name === "locationType" ? value === "one_off" : currentState.isOneOffLocation,
      branchId: name === "clientId" ? "" : currentState.branchId,
      serviceLocationName:
        name === "locationType" && value === "saved"
          ? ""
          : currentState.serviceLocationName,
      serviceLocationAddress:
        name === "locationType" && value === "saved"
          ? ""
          : currentState.serviceLocationAddress,
      serviceLocationPhone:
        name === "locationType" && value === "saved"
          ? ""
          : currentState.serviceLocationPhone,
      serviceLocationContact:
        name === "locationType" && value === "saved"
          ? ""
          : currentState.serviceLocationContact,
      recurrenceType:
        name === "isRecurring" && checked === false
          ? defaultRecurrenceType
          : currentState.recurrenceType,
      recurrenceInterval:
        name === "isRecurring" && checked === false
          ? 1
          : name === "recurrenceType" && value === "weekdays"
            ? 1
            : currentState.recurrenceInterval,
      recurrenceEndDate:
        name === "isRecurring" && checked === false ? "" : currentState.recurrenceEndDate,
      ...(name === "locationType" || name === "recurrenceDays"
        ? {}
        : { [name]: type === "checkbox" ? checked : value })
    }));
  };

  const handleClientFormChange = (event) => {
    const { name, value } = event.target;
    setClientFormError("");
    setClientFormMessage("");

    setClientForm((currentState) => ({
      ...currentState,
      [name]: value
    }));
  };

  const handleClientModalChange = (event) => {
    const { name, value } = event.target;
    setClientModalError("");
    setClientModalState((currentState) => ({
      ...currentState,
      [name]: value
    }));
  };

  const toggleExpandedClient = async (clientId) => {
    const isExpanding = !expandedClientIds[clientId];

    setExpandedClientIds((currentState) => ({
      ...currentState,
      [clientId]: !currentState[clientId]
    }));

    if (!isExpanding || branchesByClientId[clientId]) {
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase || !activeCompanyId) {
      return;
    }

    await fetchBranchesForClient(supabase, clientId, activeCompanyId);
  };

  const handleClientHierarchyEdit = (client) => {
    setActiveEntityType("client");
    setActiveEntityId(client.id);
    setActiveParentClientId(null);
    setActiveMode("edit");
    setActiveClientDrawerTab(clientDrawerTabs.client);
    debugLog("Edit client", client);
  };

  const handleOpenClientDrawerDetail = (client) => {
    setSelectedClientId(client.id);
    setActiveEntityType("client");
    setActiveEntityId(client.id);
    setActiveParentClientId(null);
    setActiveMode("detail");
    setActiveClientDrawerTab(clientDrawerTabs.summary);
  };

  const handleClientHierarchyCreateBranch = (client) => {
    setActiveEntityType("branch");
    setActiveEntityId(null);
    setActiveParentClientId(client.id);
    setActiveMode("create");
    setActiveClientDrawerTab(clientDrawerTabs.branches);
    debugLog("Create branch for client", client);
  };

  const handleClientHierarchyEditBranch = (branch) => {
    setActiveEntityType("branch");
    setActiveEntityId(branch.id);
    setActiveParentClientId(branch.client_id || null);
    setActiveMode("edit");
    setActiveClientDrawerTab(clientDrawerTabs.branches);
    debugLog("Edit branch", branch);
  };

  const handleCloseClientsDrawer = () => {
    setActiveEntityType(null);
    setActiveEntityId(null);
    setActiveParentClientId(null);
    setActiveMode(null);
    setActiveClientDrawerTab(clientDrawerTabs.client);
    setClientDrawerError("");
    setClientDrawerMessage("");
    setIsConfirmingDeleteClient(false);
    setIsDeletingClient(false);
    setClientDeleteImpact({ branches: 0, contacts: 0 });
    setContactsError("");
    setContactsMessage("");
    setActiveContactId(null);
    setContactDrawerError("");
    setActiveBranchFormId(null);
    setIsConfirmingDeleteBranch(false);
    setIsDeletingBranch(false);
    setDrawerBranchError("");
    setDrawerBranchMessage("");
  };

  const handleReturnClientDrawerToDetail = () => {
    if (activeEntityType === "client" && activeEntityId) {
      setActiveMode("detail");
      setActiveClientDrawerTab(clientDrawerTabs.summary);
      setClientDrawerError("");
      setIsConfirmingDeleteClient(false);
      setClientDeleteImpact({ branches: 0, contacts: 0 });
      return;
    }

    handleCloseClientsDrawer();
  };

  const handleOpenClientDrawerCreate = () => {
    setActiveEntityType("client");
    setActiveEntityId(null);
    setActiveParentClientId(null);
    setActiveMode("create");
    setActiveClientDrawerTab(clientDrawerTabs.client);
    setIsConfirmingDeleteClient(false);
  };

  const resetContactDrawerEditor = () => {
    setActiveContactId(null);
    setContactDrawerForm(initialContactDrawerForm);
    setContactDrawerError("");
    setContactsMessage("");
  };

  const handleEditContactFromDrawer = (contact) => {
    setActiveContactId(contact.id);
    setContactDrawerError("");
    setContactsMessage("");
    setContactDrawerForm({
      fullName: contact.full_name || "",
      phone: contact.phone || "",
      email: contact.email || "",
      role: contact.role || "",
      notes: contact.notes || "",
      isPrimary: Boolean(contact.is_primary)
    });
  };

  const resetBranchDrawerEditor = () => {
    setActiveBranchFormId(null);
    setIsConfirmingDeleteBranch(false);
    setIsDeletingBranch(false);
    setDrawerBranchForm(initialBranchFormState);
    setDrawerBranchError("");
    setDrawerBranchMessage("");
  };

  const handleEditBranchFromDrawer = (branch) => {
    setActiveBranchFormId(branch.id);
    setDrawerBranchError("");
    setDrawerBranchMessage("");
    setDrawerBranchForm({
      name: branch.name || "",
      address: branch.address || "",
      phone: branch.phone || "",
      contact: branch.contact || "",
      notes: branch.notes || ""
    });
  };

  const handleBranchModalChange = (event) => {
    const { name, value } = event.target;
    setBranchModalError("");
    setBranchModalState((currentState) => ({
      ...currentState,
      [name]: value
    }));
  };

  const handleBranchFormChange = (event) => {
    const { name, value } = event.target;
    setBranchFormError("");
    setBranchFormMessage("");

    setBranchForm((currentState) => ({
      ...currentState,
      [name]: value
    }));
  };

  const handleEditClient = (client) => {
    setSelectedClientId(client.id);
    setClientSubTab(uiText.clients.subTabs.form);
    setClientFormError("");
    setClientFormMessage("");
    setClientForm({
      clientType: client.client_type || "commercial",
      businessName: client.business_name || client.name || "",
      tradeName: client.trade_name || "",
      taxId: client.tax_id || "",
      mainAddress: client.main_address || "",
      mainPhone: client.main_phone || "",
      mainContact: client.main_contact || "",
      mainEmail: client.main_email || ""
    });
  };

  const handleNewClient = () => {
    setSelectedClientId(null);
    setClientSubTab(uiText.clients.subTabs.form);
    setClientForm(initialClientFormState);
    setClientFormError("");
    setClientFormMessage("");
  };

  const handleSelectClientBranches = (client) => {
    setSelectedBranchClientId(client.id);
    setSelectedBranchId(null);
    setClientSubTab(uiText.clients.subTabs.branches);
    setBranchForm(initialBranchFormState);
    setBranchFormError("");
    setBranchFormMessage("");
  };

  const handleBranchEdit = (branch) => {
    setSelectedBranchId(branch.id);
    setBranchFormError("");
    setBranchFormMessage("");
    setBranchForm({
      name: branch.name || "",
      address: branch.address || "",
      phone: branch.phone || "",
      contact: branch.contact || "",
      notes: branch.notes || ""
    });
  };

  const handleNewBranch = () => {
    setSelectedBranchId(null);
    setBranchForm(initialBranchFormState);
    setBranchFormError("");
    setBranchFormMessage("");
  };

  const handleTechnicianEdit = (technician) => {
    setSelectedTechnicianId(technician.id);
    setTechnicianSubTab(uiText.technicians.subTabs.form);
    setTechnicianFormError("");
    setTechnicianFormMessage("");
    setTechnicianForm({
      fullName: technician.full_name || "",
      phone: technician.phone || "",
      address: technician.address || "",
      notes: technician.notes || "",
      isActive: Boolean(technician.is_active)
    });
  };

  const handleNewTechnician = () => {
    setSelectedTechnicianId(null);
    setTechnicianSubTab(uiText.technicians.subTabs.form);
    setTechnicianForm(initialTechnicianFormState);
    setTechnicianFormError("");
    setTechnicianFormMessage("");
  };

  const handleOpenTechnicianDrawerCreate = () => {
    handleNewTechnician();
    setTechnicianDrawerMode("create");
  };

  const handleOpenTechnicianDrawerDetail = (technician) => {
    handleTechnicianEdit(technician);
    setTechnicianDrawerMode("detail");
  };

  const handleOpenTechnicianDrawerEdit = (technician) => {
    handleTechnicianEdit(technician);
    setTechnicianDrawerMode("edit");
  };

  const handleViewTechnicianInCalendar = (technician) => {
    const technicianName = technician?.full_name || "all";

    setActiveTopLevelTab(dashboardTabs.calendar);
    setActiveAdminView(adminViewTabs.calendar);
    setSelectedCalendarTechnicians(technicianName === "all" ? [] : [technicianName]);
    setTechnicianDrawerMode(null);
  };

  const handleCloseTechnicianDrawer = () => {
    setTechnicianDrawerMode(null);
    setSelectedTechnicianId(null);
    setTechnicianForm(initialTechnicianFormState);
    setTechnicianFormError("");
    setTechnicianFormMessage("");
    setIsConfirmingDeleteTechnician(false);
    setIsDeletingTechnician(false);
  };

  const handleReturnTechnicianDrawerToDetail = () => {
    if (selectedTechnicianId) {
      setTechnicianDrawerMode("detail");
      setTechnicianFormError("");
      setIsConfirmingDeleteTechnician(false);
      return;
    }

    handleCloseTechnicianDrawer();
  };

  const handleRequestDeleteTechnician = async () => {
    if (!selectedTechnicianId) {
      return;
    }

    if (!activeCompanyId) {
      setTechnicianFormError(uiText.dashboard.profileLoadError);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setTechnicianFormError(uiText.technicians.configError);
      return;
    }

    setTechnicianFormError("");
    setTechnicianFormMessage("");

    try {
      const { count: relatedOrdersCount, error: relatedOrdersError } = await supabase
        .from("service_orders")
        .select("*", { count: "exact", head: true })
        .eq("company_id", activeCompanyId)
        .eq("technician_name", activeTechnician?.full_name || "");

      if (relatedOrdersError) {
        throw relatedOrdersError;
      }

      if ((relatedOrdersCount || 0) > 0) {
        throw new Error(
          "No se puede eliminar este tecnico porque tiene ordenes de servicio relacionadas."
        );
      }

      setIsConfirmingDeleteTechnician(true);
    } catch (error) {
      setTechnicianFormError(
        error.message || "No fue posible validar la eliminacion del tecnico."
      );
      setIsConfirmingDeleteTechnician(false);
    }
  };

  const handleDeleteTechnician = async () => {
    if (!selectedTechnicianId) {
      return;
    }

    if (!activeCompanyId) {
      setTechnicianFormError(uiText.dashboard.profileLoadError);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setTechnicianFormError(uiText.technicians.configError);
      return;
    }

    setTechnicianFormError("");
    setTechnicianFormMessage("");
    setIsDeletingTechnician(true);

    try {
      const { count: relatedOrdersCount, error: relatedOrdersError } = await supabase
        .from("service_orders")
        .select("*", { count: "exact", head: true })
        .eq("company_id", activeCompanyId)
        .eq("technician_name", activeTechnician?.full_name || "");

      if (relatedOrdersError) {
        throw relatedOrdersError;
      }

      if ((relatedOrdersCount || 0) > 0) {
        throw new Error(
          "No se puede eliminar este tecnico porque tiene ordenes de servicio relacionadas."
        );
      }

      const { error: deleteError } = await supabase
        .from("technicians")
        .delete()
        .eq("id", selectedTechnicianId)
        .eq("company_id", activeCompanyId);

      if (deleteError) {
        throw deleteError;
      }

      setTechnicians((currentState) =>
        currentState.filter((technician) => technician.id !== selectedTechnicianId)
      );
      setSelectedTechnicianId(null);
      setTechnicianForm(initialTechnicianFormState);
      setIsConfirmingDeleteTechnician(false);
      setTechnicianDrawerMode(null);
    } catch (error) {
      setTechnicianFormError(error.message || "No fue posible eliminar el tecnico.");
      setIsConfirmingDeleteTechnician(false);
    } finally {
      setIsDeletingTechnician(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      router.replace("/");
      router.refresh();
      return;
    }

    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  const handleTechnicianFormChange = (event) => {
    const { name, type, checked, value } = event.target;
    setTechnicianFormError("");
    setTechnicianFormMessage("");

    setTechnicianForm((currentState) => ({
      ...currentState,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleDetailFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDetailFormError("");
    setDetailFormMessage("");

    setDetailFormState((currentState) => ({
      ...currentState,
      isOneOffLocation:
        name === "locationType" ? value === "one_off" : currentState.isOneOffLocation,
      branchId: name === "clientId" ? "" : currentState.branchId,
      serviceLocationName:
        name === "locationType" && value === "saved"
          ? ""
          : currentState.serviceLocationName,
      serviceLocationAddress:
        name === "locationType" && value === "saved"
          ? ""
          : currentState.serviceLocationAddress,
      serviceLocationPhone:
        name === "locationType" && value === "saved"
          ? ""
          : currentState.serviceLocationPhone,
      serviceLocationContact:
        name === "locationType" && value === "saved"
          ? ""
          : currentState.serviceLocationContact,
      recurrenceType:
        name === "isRecurring" && checked === false
          ? defaultRecurrenceType
          : currentState.recurrenceType,
      recurrenceEndDate:
        name === "isRecurring" && checked === false ? "" : currentState.recurrenceEndDate,
      ...(name === "locationType" ? {} : { [name]: type === "checkbox" ? checked : value })
    }));
  };

  const handleCreateServiceOrder = async (event) => {
    event.preventDefault();
    await createAppointmentWithState({
      orderState: formState,
      selectedClient: selectedFormClient,
      branchesForClient: availableBranches,
      setError: setFormError,
      setSuccess: setFormMessage,
      setSaving: setIsSavingOrder,
      resetState: () => setFormState(initialFormState),
      onSuccess: () => {
        setRightPanelMode(rightPanelModes.detail);
      }
    });
  };

  const handleOpenQuickCreate = (slotInfo) => {
    const slotStart = slotInfo?.start instanceof Date ? slotInfo.start : new Date();
    const isPastCreateSlot =
      (calendarView === "week" || calendarView === "month") &&
      startOfDay(slotStart).getTime() < startOfDay(new Date()).getTime();

    if (isPastCreateSlot) {
      setCalendarActionMessage("");
      setCalendarActionError("");
      setPastDateAlertMessage("No puedes crear una cita en una fecha pasada");
      return;
    }

    const nextServiceDate = getServiceDateFromCalendarSlot(slotStart);
    const nextServiceTime = getServiceTimeFromCalendarSlot(
      slotStart,
      calendarView,
      serviceTimeOptions
    );

    if (rightPanelMode === rightPanelModes.create) {
      setCalendarActionError("");
      setFormError("");
      setFormMessage("");
      setFormState((currentState) => ({
        ...currentState,
        serviceDate: nextServiceDate,
        serviceTime: nextServiceTime
      }));
      return;
    }

    setSelectedServiceOrderId(null);
    setSelectedServiceOrderSnapshot(null);
    setSelectedAppointment(null);
    setCalendarActionError("");
    setFormError("");
    setFormMessage("");
    setFormState({
      ...initialFormState,
      serviceDate: nextServiceDate,
      serviceTime: nextServiceTime
    });
    setRightPanelMode(rightPanelModes.create);
  };

  const handleCloseQuickCreate = () => {
    setFormState(initialFormState);
    setFormError("");
    setFormMessage("");
    setRightPanelMode(selectedServiceOrder ? rightPanelModes.detail : rightPanelModes.empty);
  };

  const handleCloseServiceOrderPanel = () => {
    setDetailFormError("");
    setDetailFormMessage("");
    setFormError("");
    setFormMessage("");
    setIsConfirmingDeleteServiceOrder(false);

    if (rightPanelMode === rightPanelModes.create) {
      handleCloseQuickCreate();
      return;
    }

    setSelectedServiceOrderId(null);
    setSelectedServiceOrderSnapshot(null);
    setSelectedAppointment(null);
    setRightPanelMode(rightPanelModes.empty);
  };

  const handleOpenClientModal = () => {
    setClientModalState(initialQuickClientState);
    setClientModalError("");
    setIsClientModalOpen(true);
  };

  const handleCloseClientModal = () => {
    if (isSavingClientModal) {
      return;
    }

    setIsClientModalOpen(false);
    setClientModalState(initialQuickClientState);
    setClientModalError("");
  };

  const handleCloseBranchModal = () => {
    if (isSavingBranchModal) {
      return;
    }

    setIsBranchModalOpen(false);
    setBranchModalState(initialQuickBranchState);
    setBranchModalError("");
    setPendingBranchClient(null);
  };

  const handleClientDrawerFormChange = (event) => {
    const { name, value } = event.target;
    setClientDrawerError("");
    setClientDrawerMessage("");
    setIsConfirmingDeleteClient(false);
    setClientDrawerForm((currentState) => ({
      ...currentState,
      [name]: value
    }));
  };

  const handleContactDrawerFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setContactDrawerError("");
    setContactsMessage("");
    setContactDrawerForm((currentState) => ({
      ...currentState,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleDrawerBranchFormChange = (event) => {
    const { name, value } = event.target;
    setDrawerBranchError("");
    setDrawerBranchMessage("");
    setIsConfirmingDeleteBranch(false);
    setDrawerBranchForm((currentState) => ({
      ...currentState,
      [name]: value
    }));
  };

  const handleCompanySettingsFormChange = (event) => {
    const { name, value } = event.target;
    setCompanySettingsError("");
    setCompanySettingsMessage("");
    setCompanySettingsForm((currentState) => ({
      ...currentState,
      [name]: value
    }));
  };

  const handleResetCompanySettingsForm = () => {
    setCompanySettingsForm(buildCompanySettingsFormState(activeCompany));
    setCompanySettingsError("");
    setCompanySettingsMessage("");
  };

  const handleSaveCompanySettings = async (event) => {
    event.preventDefault();

    if (!activeCompanyId) {
      setCompanySettingsError(uiText.dashboard.profileLoadError);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setCompanySettingsError(uiText.clients.configError);
      return;
    }

    setCompanySettingsError("");
    setCompanySettingsMessage("");
    setIsSavingCompanySettings(true);

    try {
      const payload = {
        name: companySettingsForm.name.trim(),
        business_name: companySettingsForm.businessName.trim() || null,
        tax_id: companySettingsForm.taxId.trim() || null,
        main_phone: companySettingsForm.mainPhone.trim() || null,
        main_email: companySettingsForm.mainEmail.trim() || null,
        main_contact: companySettingsForm.mainContact.trim() || null,
        address_line_1: companySettingsForm.addressLine1.trim() || null,
        address_line_2: companySettingsForm.addressLine2.trim() || null,
        city: companySettingsForm.city.trim() || null,
        state: companySettingsForm.state.trim() || null,
        postal_code: companySettingsForm.postalCode.trim() || null,
        country: companySettingsForm.country.trim() || null,
        logo_url: companySettingsForm.logoUrl.trim() || null
      };

      const { data, error } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", activeCompanyId)
        .select(
          [
            "id",
            "name",
            "business_name",
            "tax_id",
            "main_phone",
            "main_email",
            "main_contact",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "postal_code",
            "country",
            "logo_url"
          ].join(", ")
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      setActiveCompany(data || { id: activeCompanyId, ...payload });
      setCompanySettingsForm(buildCompanySettingsFormState(data || { id: activeCompanyId, ...payload }));
      setCompanySettingsMessage(uiText.dashboard.companySettingsSaveSuccess);
    } catch (error) {
      setCompanySettingsError(error.message || uiText.dashboard.companySettingsSaveError);
    } finally {
      setIsSavingCompanySettings(false);
    }
  };

  const handleSaveClientFromDrawer = async (event) => {
    event.preventDefault();
    setClientDrawerError("");
    setClientDrawerMessage("");
    setIsConfirmingDeleteClient(false);
    setClientDeleteImpact({ branches: 0, contacts: 0 });
    setIsSavingClientDrawer(true);

    try {
      const savedClient = await saveClientRecord({
        clientState: {
          name: clientDrawerForm.name,
          clientType: clientDrawerForm.clientType,
          businessName: clientDrawerForm.businessName || clientDrawerForm.name,
          tradeName: clientDrawerForm.tradeName,
          taxId: clientDrawerForm.taxId,
          mainAddress: "",
          mainPhone: clientDrawerForm.mainPhone,
          mainContact: clientDrawerForm.mainContact,
          mainEmail: clientDrawerForm.mainEmail
        },
        clientId: activeMode === "edit" ? activeEntityId : null,
        autoCreateDefaultBranch: false
      });

      setSelectedClientId(savedClient.id);
      setExpandedClientIds((currentState) => ({
        ...currentState,
        [savedClient.id]: Boolean(currentState[savedClient.id])
      }));
      setActiveEntityType("client");
      setActiveEntityId(savedClient.id);
      setActiveParentClientId(null);
      setActiveMode("detail");
      setClientDrawerMessage(
        activeMode === "edit" ? uiText.clients.updateSuccess : uiText.clients.success
      );
    } catch (error) {
      setClientDrawerError(error.message || uiText.clients.createError);
    } finally {
      setIsSavingClientDrawer(false);
    }
  };

  const handleRequestDeleteClientFromDrawer = async () => {
    if (!activeEntityId || activeEntityType !== "client" || activeMode !== "edit") {
      return;
    }

    if (!activeCompanyId) {
      setClientDrawerError(uiText.dashboard.profileLoadError);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setClientDrawerError(uiText.clients.configError);
      return;
    }

    setClientDrawerError("");
    setClientDrawerMessage("");

    try {
      const [{ count: relatedOrdersCount, error: relatedOrdersError }, { count: relatedBranchesCount, error: relatedBranchesError }, { count: relatedContactsCount, error: relatedContactsError }] = await Promise.all([
        supabase
          .from("service_orders")
          .select("*", { count: "exact", head: true })
          .eq("company_id", activeCompanyId)
          .eq("client_id", activeEntityId),
        supabase
          .from("branches")
          .select("*", { count: "exact", head: true })
          .eq("company_id", activeCompanyId)
          .eq("client_id", activeEntityId),
        supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("company_id", activeCompanyId)
          .eq("client_id", activeEntityId)
      ]);

      if (relatedOrdersError) {
        throw relatedOrdersError;
      }

      if (relatedBranchesError) {
        throw relatedBranchesError;
      }

      if (relatedContactsError) {
        throw relatedContactsError;
      }

      if ((relatedOrdersCount || 0) > 0) {
        throw new Error(
          "No se puede eliminar este cliente porque tiene ordenes de servicio relacionadas."
        );
      }

      setClientDeleteImpact({
        branches: relatedBranchesCount || 0,
        contacts: relatedContactsCount || 0
      });
      setIsConfirmingDeleteClient(true);
    } catch (error) {
      setClientDrawerError(error.message || "No fue posible validar la eliminacion del cliente.");
      setIsConfirmingDeleteClient(false);
    }
  };

  const handleDeleteClientFromDrawer = async () => {
    if (!activeEntityId || activeEntityType !== "client" || activeMode !== "edit") {
      return;
    }

    if (!activeCompanyId) {
      setClientDrawerError(uiText.dashboard.profileLoadError);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setClientDrawerError(uiText.clients.configError);
      return;
    }

    setClientDrawerError("");
    setClientDrawerMessage("");
    setIsDeletingClient(true);

    try {
      const { count: relatedOrdersCount, error: relatedOrdersError } = await supabase
        .from("service_orders")
        .select("*", { count: "exact", head: true })
        .eq("company_id", activeCompanyId)
        .eq("client_id", activeEntityId);

      if (relatedOrdersError) {
        throw relatedOrdersError;
      }

      if ((relatedOrdersCount || 0) > 0) {
        throw new Error(
          "No se puede eliminar este cliente porque tiene ordenes de servicio relacionadas."
        );
      }

      const { error: deleteContactsError } = await supabase
        .from("contacts")
        .delete()
        .eq("company_id", activeCompanyId)
        .eq("client_id", activeEntityId);

      if (deleteContactsError) {
        throw deleteContactsError;
      }

      const { error: deleteBranchesError } = await supabase
        .from("branches")
        .delete()
        .eq("company_id", activeCompanyId)
        .eq("client_id", activeEntityId);

      if (deleteBranchesError) {
        throw deleteBranchesError;
      }

      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", activeEntityId)
        .eq("company_id", activeCompanyId);

      if (deleteError) {
        throw deleteError;
      }

      setClients((currentClients) =>
        currentClients.filter((client) => client.id !== activeEntityId)
      );
      setBranchesByClientId((currentState) => {
        const nextState = { ...currentState };
        delete nextState[activeEntityId];
        return nextState;
      });
      setContactsByClientId((currentState) => {
        const nextState = { ...currentState };
        delete nextState[activeEntityId];
        return nextState;
      });
      setExpandedClientIds((currentState) => {
        const nextState = { ...currentState };
        delete nextState[activeEntityId];
        return nextState;
      });
      setSelectedClientId((currentSelectedClientId) =>
        currentSelectedClientId === activeEntityId ? null : currentSelectedClientId
      );
      handleCloseClientsDrawer();
    } catch (error) {
      setClientDrawerError(error.message || "No fue posible eliminar el cliente.");
      setIsConfirmingDeleteClient(false);
    } finally {
      setIsDeletingClient(false);
    }
  };

  const handleSaveContactFromDrawer = async (event) => {
    event.preventDefault();

    if (!activeDrawerClientId) {
      setContactDrawerError("Guarda el cliente primero para agregar contactos.");
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setContactDrawerError(uiText.clients.configError);
      return;
    }

    setContactDrawerError("");
    setContactsMessage("");
    setIsSavingContactDrawer(true);

    try {
      const nextContactState = {
        clientId: activeDrawerClientId,
        branchId: null,
        fullName: contactDrawerForm.fullName,
        phone: contactDrawerForm.phone,
        email: contactDrawerForm.email,
        role: contactDrawerForm.role,
        notes: contactDrawerForm.notes,
        isPrimary: contactDrawerForm.isPrimary
      };

      const savedContact = activeContactId
        ? await updateContactRecord({
            supabase,
            companyId: activeCompanyId,
            contactId: activeContactId,
            contactState: nextContactState
          })
        : await saveContactRecord({
            supabase,
            companyId: activeCompanyId,
            contactState: nextContactState
          });

      const refreshedContacts = await fetchContactsForClient(
        supabase,
        activeDrawerClientId,
        activeCompanyId
      );

      setContactsByClientId((currentState) => ({
        ...currentState,
        [activeDrawerClientId]: refreshedContacts
      }));
      setActiveContactId(savedContact?.id || activeContactId || null);
      setContactDrawerForm(
        savedContact
          ? {
              fullName: savedContact.full_name || "",
              phone: savedContact.phone || "",
              email: savedContact.email || "",
              role: savedContact.role || "",
              notes: savedContact.notes || "",
              isPrimary: Boolean(savedContact.is_primary)
            }
          : initialContactDrawerForm
      );
      setContactsMessage(
        activeContactId ? "Contacto actualizado correctamente." : "Contacto guardado correctamente."
      );
    } catch (error) {
      setContactDrawerError(error.message || "No fue posible guardar el contacto.");
    }

    setIsSavingContactDrawer(false);
  };

  const handleSaveBranchFromDrawer = async (event) => {
    event.preventDefault();
    const drawerClientId = activeEntityType === "branch" ? activeParentClientId : activeDrawerClientId;

    if (!drawerClientId) {
      setDrawerBranchError("Guarda el cliente primero para agregar sucursales.");
      return;
    }

    setDrawerBranchError("");
    setDrawerBranchMessage("");
    setIsConfirmingDeleteBranch(false);
    setIsSavingDrawerBranch(true);

    try {
      const savedBranch = await saveBranchRecord({
        branchState: drawerBranchForm,
        clientId: drawerClientId,
        branchId:
          activeEntityType === "branch" && activeMode === "edit"
            ? activeEntityId
            : activeBranchFormId,
        preserveOrderClient: true
      });

      setExpandedClientIds((currentState) => ({
        ...currentState,
        [drawerClientId]: true
      }));
      setDrawerBranchMessage(
        (activeEntityType === "branch" && activeMode === "edit") || activeBranchFormId
          ? uiText.clients.branchUpdateSuccess
          : uiText.clients.branchCreateSuccess
      );
      setActiveBranchFormId(savedBranch?.id || activeBranchFormId || null);
      setDrawerBranchForm({
        name: savedBranch?.name || drawerBranchForm.name,
        address: savedBranch?.address || drawerBranchForm.address,
        phone: savedBranch?.phone || drawerBranchForm.phone,
        contact: savedBranch?.contact || drawerBranchForm.contact,
        notes: savedBranch?.notes || drawerBranchForm.notes
      });

    } catch (error) {
      setDrawerBranchError(error.message || uiText.clients.branchCreateError);
    }

    setIsSavingDrawerBranch(false);
  };

  const handleRequestDeleteBranchFromDrawer = async () => {
    const branchId =
      (activeEntityType === "branch" && activeMode === "edit" ? activeEntityId : null) ||
      activeBranchFormId;

    if (!branchId) {
      return;
    }

    if (!activeCompanyId) {
      setDrawerBranchError(uiText.dashboard.profileLoadError);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setDrawerBranchError(uiText.clients.configError);
      return;
    }

    setDrawerBranchError("");
    setDrawerBranchMessage("");

    try {
      const { count: relatedOrdersCount, error: relatedOrdersError } = await supabase
        .from("service_orders")
        .select("*", { count: "exact", head: true })
        .eq("company_id", activeCompanyId)
        .eq("branch_id", branchId);

      if (relatedOrdersError) {
        throw relatedOrdersError;
      }

      if ((relatedOrdersCount || 0) > 0) {
        throw new Error(
          "No se puede eliminar esta sucursal porque tiene ordenes de servicio relacionadas."
        );
      }

      setIsConfirmingDeleteBranch(true);
    } catch (error) {
      setDrawerBranchError(
        error.message || "No fue posible validar la eliminacion de la sucursal."
      );
      setIsConfirmingDeleteBranch(false);
    }
  };

  const handleDeleteBranchFromDrawer = async () => {
    const branchId =
      (activeEntityType === "branch" && activeMode === "edit" ? activeEntityId : null) ||
      activeBranchFormId;
    const parentClientId =
      activeDrawerClientId ||
      activeParentClientId ||
      activeEditingBranch?.client_id ||
      activeBranch?.client_id ||
      null;

    if (!branchId) {
      return;
    }

    if (!activeCompanyId) {
      setDrawerBranchError(uiText.dashboard.profileLoadError);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setDrawerBranchError(uiText.clients.configError);
      return;
    }

    setDrawerBranchError("");
    setDrawerBranchMessage("");
    setIsDeletingBranch(true);

    try {
      const { count: relatedOrdersCount, error: relatedOrdersError } = await supabase
        .from("service_orders")
        .select("*", { count: "exact", head: true })
        .eq("company_id", activeCompanyId)
        .eq("branch_id", branchId);

      if (relatedOrdersError) {
        throw relatedOrdersError;
      }

      if ((relatedOrdersCount || 0) > 0) {
        throw new Error(
          "No se puede eliminar esta sucursal porque tiene ordenes de servicio relacionadas."
        );
      }

      const { error: deleteError } = await supabase
        .from("branches")
        .delete()
        .eq("id", branchId)
        .eq("company_id", activeCompanyId);

      if (deleteError) {
        throw deleteError;
      }

      if (parentClientId) {
        setBranchesByClientId((currentState) => ({
          ...currentState,
          [parentClientId]: (currentState[parentClientId] || []).filter(
            (branch) => branch.id !== branchId
          )
        }));
        setSelectedClientId(parentClientId);
        setExpandedClientIds((currentState) => ({
          ...currentState,
          [parentClientId]: true
        }));
      }

      if (activeEntityType === "branch" && activeMode === "edit" && parentClientId) {
        setActiveEntityType("client");
        setActiveEntityId(parentClientId);
        setActiveParentClientId(null);
        setActiveMode("edit");
        setActiveClientDrawerTab(clientDrawerTabs.branches);
      }

      resetBranchDrawerEditor();
    } catch (error) {
      setDrawerBranchError(error.message || "No fue posible eliminar la sucursal.");
      setIsConfirmingDeleteBranch(false);
    } finally {
      setIsDeletingBranch(false);
    }
  };

  const handleCreateClientFromModal = async (event) => {
    event.preventDefault();
    setClientModalError("");
    setIsSavingClientModal(true);

    try {
      const isResidential = isResidentialClient(clientModalState.clientType);
      const residentialAddress = buildStructuredAddress({
        street: clientModalState.street.trim(),
        streetNumber: clientModalState.streetNumber.trim(),
        city: clientModalState.city.trim(),
        state: clientModalState.state.trim(),
        postalCode: clientModalState.postalCode.trim(),
        reference: clientModalState.reference.trim()
      });

      if (isResidential && !residentialAddress) {
        throw new Error("Ingresa una direccion valida para la sucursal principal.");
      }

      const savedClient = await saveClientRecord({
        clientState: {
          clientType: clientModalState.clientType,
          businessName: (clientModalState.businessName || clientModalState.name).trim(),
          tradeName: clientModalState.tradeName.trim(),
          taxId: clientModalState.taxId.trim(),
          mainAddress: isResidential ? residentialAddress : "",
          mainPhone: clientModalState.phone.trim(),
          mainContact: "",
          mainEmail: ""
        },
        autoCreateDefaultBranch: isResidential,
        defaultBranchPayload: isResidential
          ? {
              name: "Principal",
              address: residentialAddress,
              phone: clientModalState.phone.trim(),
              contact: "",
              notes: clientModalState.reference.trim()
            }
          : null
      });

      setCalendarActionError("");
      setCalendarActionMessage(
        isResidential ? uiText.clients.success : "Cliente creado. Agrega la primera sucursal."
      );
      setIsClientModalOpen(false);
      setClientModalState(initialQuickClientState);
      setClientModalError("");

      if (!isResidential && savedClient) {
        setPendingBranchClient(savedClient);
        setBranchModalState({
          ...initialQuickBranchState,
          name: "Principal",
          phone: clientModalState.phone.trim()
        });
        setBranchModalError("");
        setIsBranchModalOpen(true);
      }
    } catch (error) {
      setClientModalError(error.message || uiText.clients.createError);
    }

    setIsSavingClientModal(false);
  };

  const handleCreateBranchFromModal = async (event) => {
    event.preventDefault();
    setBranchModalError("");
    setIsSavingBranchModal(true);

    try {
      await saveBranchRecord({
        branchState: {
          name: branchModalState.name,
          address: branchModalState.address,
          phone: branchModalState.phone,
          contact: branchModalState.contact,
          notes: ""
        },
        clientId: pendingBranchClient?.id,
        preserveOrderClient: true
      });

      setCalendarActionError("");
      setCalendarActionMessage(uiText.clients.branchCreateSuccess);
      setIsBranchModalOpen(false);
      setBranchModalState(initialQuickBranchState);
      setBranchModalError("");
      setPendingBranchClient(null);
    } catch (error) {
      setBranchModalError(error.message || uiText.clients.branchCreateError);
    }

    setIsSavingBranchModal(false);
  };

  const handleCreateClient = async (event) => {
    event.preventDefault();
    setClientFormError("");
    setClientFormMessage("");

    setIsSavingClient(true);

    try {
      await saveClientRecord({
        clientState: clientForm,
        clientId: selectedClientId
      });
      setClientForm(initialClientFormState);
      setSelectedClientId(null);
      setClientFormMessage(
        selectedClientId ? uiText.clients.updateSuccess : uiText.clients.success
      );
    } catch (error) {
      setClientFormError(error.message || uiText.clients.createError);
    }

    setIsSavingClient(false);
  };

  const handleCreateBranch = async (event) => {
    event.preventDefault();
    setBranchFormError("");
    setBranchFormMessage("");

    if (!selectedBranchClientId) {
      setBranchFormError(uiText.clients.branchesSelectClient);
      return;
    }

    setIsSavingBranch(true);

    if (selectedBranchId) {
      const supabase = getSupabaseClient();

      if (!supabase) {
        setBranchFormError(uiText.clients.configError);
        setIsSavingBranch(false);
        return;
      }

      if (!activeCompanyId) {
        console.warn("[Multi-tenant] No hay company_id activo para crear o editar sucursales.");
        setBranchFormError(uiText.dashboard.profileLoadError);
        setIsSavingBranch(false);
        return;
      }

      const payload = {
        company_id: activeCompanyId,
        client_id: selectedBranchClientId,
        name: branchForm.name.trim(),
        address: branchForm.address.trim(),
        phone: branchForm.phone.trim(),
        contact: branchForm.contact.trim(),
        notes: branchForm.notes.trim()
      };

      const { error } = await supabase
        .from("branches")
        .update(payload)
        .eq("id", selectedBranchId)
        .eq("company_id", activeCompanyId);

      if (error) {
        setBranchFormError(error.message || uiText.clients.branchCreateError);
        setIsSavingBranch(false);
        return;
      }

      await fetchBranchesForClient(supabase, selectedBranchClientId, activeCompanyId);
      if (formState.clientId === selectedBranchClientId) {
        await fetchBranchesForClient(supabase, formState.clientId, activeCompanyId);
      }
      setBranchForm(initialBranchFormState);
      setSelectedBranchId(null);
      setBranchFormMessage(uiText.clients.branchUpdateSuccess);
      setIsSavingBranch(false);
      return;
    }

    try {
      await saveBranchRecord({
        branchState: branchForm,
        clientId: selectedBranchClientId
      });
      setBranchForm(initialBranchFormState);
      setSelectedBranchId(null);
      setBranchFormMessage(uiText.clients.branchCreateSuccess);
    } catch (error) {
      setBranchFormError(error.message || uiText.clients.branchCreateError);
    }

    setIsSavingBranch(false);
  };

  const handleCreateTechnician = async (event) => {
    event.preventDefault();
    setTechnicianFormError("");
    setTechnicianFormMessage("");
    setIsConfirmingDeleteTechnician(false);

    const supabase = getSupabaseClient();

    if (!supabase) {
      setTechnicianFormError(uiText.technicians.configError);
      return;
    }

    if (!activeCompanyId) {
      console.warn("[Multi-tenant] No hay company_id activo para crear o editar tecnicos.");
      setTechnicianFormError(uiText.dashboard.profileLoadError);
      return;
    }

    setIsSavingTechnician(true);

    const payload = {
      company_id: activeCompanyId,
      full_name: technicianForm.fullName.trim(),
      is_active: technicianForm.isActive
    };

    if (supportsExtendedTechnicianFields) {
      payload.phone = technicianForm.phone.trim();
      payload.address = technicianForm.address.trim();
      payload.notes = technicianForm.notes.trim();
    }

    const technicianQuery = selectedTechnicianId
      ? supabase
          .from("technicians")
          .update(payload)
          .eq("id", selectedTechnicianId)
          .eq("company_id", activeCompanyId)
          .select("id, full_name, phone, address, notes, is_active, created_at")
          .single()
      : supabase
          .from("technicians")
          .insert(payload)
          .select("id, full_name, phone, address, notes, is_active, created_at")
          .single();
    const { data: savedTechnician, error } = await technicianQuery;

    if (error) {
      setTechnicianFormError(error.message || uiText.technicians.createError);
      setIsSavingTechnician(false);
      return;
    }

    // Refresh the roster after insert so the new technician appears immediately.
    await fetchTechnicians(supabase, activeCompanyId);
    setSelectedTechnicianId(savedTechnician?.id || selectedTechnicianId || null);
    setTechnicianDrawerMode("detail");
    setTechnicianForm({
      fullName: savedTechnician?.full_name || technicianForm.fullName,
      phone: savedTechnician?.phone || technicianForm.phone,
      address: savedTechnician?.address || technicianForm.address,
      notes: savedTechnician?.notes || technicianForm.notes,
      isActive:
        typeof savedTechnician?.is_active === "boolean"
          ? savedTechnician.is_active
          : technicianForm.isActive
    });
    setTechnicianFormMessage(
      selectedTechnicianId
        ? uiText.technicians.updateSuccess
        : uiText.technicians.success
    );
    setIsSavingTechnician(false);
  };

  const handleSelectServiceOrder = (event) => {
    debugLog("[Service Order Debug] Clicked calendar event:", event);

    if (event?.type === "projected_appointment") {
      debugLog("[Appointments Debug] Projected appointment selected:", {
        seriesId: event.seriesId,
        date: event.serviceDate,
        time: event.serviceTime
      });
      setCalendarActionError("");
      setCalendarActionMessage("Cita recurrente proyectada. Aun no existe como cita real.");
      return;
    }

    if (event?.type === "appointment") {
      const resolvedAppointment =
        event?.appointment ||
        event?.resource ||
        appointments.find((appointment) => appointment.id === event?.appointmentId) ||
        null;

      if (!resolvedAppointment?.id) {
        console.warn("[Appointments Debug] No se pudo resolver la cita desde el evento.");
        return;
      }

      debugLog("[Appointments Debug] Read-only appointment selected:", {
        appointmentId: resolvedAppointment.id,
        serviceOrderId: event.serviceOrderId || null,
        status: event.appointmentStatus || event.status
      });
      setCalendarActionError("");
      setCalendarActionMessage("");
      setDetailFormError("");
      setDetailFormMessage("");
      setSelectedServiceOrderId(null);
      setSelectedServiceOrderSnapshot(null);
      setSelectedAppointment(resolvedAppointment);
      setRightPanelMode(rightPanelModes.detail);
      return;
    }

    const resolvedServiceOrder =
      event?.resource ||
      event?.serviceOrder ||
      serviceOrders.find((serviceOrder) => serviceOrder.id === event?.id) ||
      null;

    if (!resolvedServiceOrder?.id) {
      console.warn("[Service Order Debug] No se pudo resolver la orden desde el evento.");
      return;
    }

    debugLog("[Service Order Debug] Resolved order candidate:", resolvedServiceOrder);
    setSelectedAppointment(null);
    setSelectedServiceOrderId(resolvedServiceOrder.id);
    setSelectedServiceOrderSnapshot(resolvedServiceOrder);
    setRightPanelMode(rightPanelModes.detail);
    debugLog("[Service Order Debug] Saving selection:", {
      selectedServiceOrderId: resolvedServiceOrder.id,
      selectedServiceOrderSnapshot: resolvedServiceOrder
    });
  };

  const handleOpenCreatePanel = () => {
    setActiveAdminView(adminViewTabs.calendar);
    handleOpenQuickCreate();
  };

  const handleViewToday = () => {
    setActiveAdminView(adminViewTabs.calendar);
    setCalendarView(operationalCalendarView);
    setCalendarDate(startOfDay(new Date()));
    setShowOnlyOverdue(false);
  };

  const handleViewPending = () => {
    setActiveAdminView(adminViewTabs.calendar);
    setCalendarView(operationalCalendarView);
    setShowOnlyOverdue(true);
  };

  const handleSelectBacklogServiceOrder = (serviceOrder) => {
    const serviceOrderStart = parseServiceOrderStart(
      serviceOrder?.service_date,
      serviceOrder?.service_time
    );

    setActiveAdminView(adminViewTabs.calendar);
    setCalendarView(operationalCalendarView);

    if (isValid(serviceOrderStart)) {
      setCalendarDate(startOfDay(serviceOrderStart));
    }

    handleSelectServiceOrder(serviceOrder);
  };

  const handleCalendarMouseDownCapture = (nativeEvent) => {
    const eventCardNode = nativeEvent.target.closest?.("[data-calendar-event-id]");
    const targetClassName = String(nativeEvent.target?.className || "");
    const isResizeHandle = targetClassName.includes("rbc-addons-dnd-resize");

    calendarPointerStateRef.current = {
      calendarEventId: eventCardNode?.getAttribute("data-calendar-event-id") || null,
      x: nativeEvent.clientX,
      y: nativeEvent.clientY,
      isResizeHandle
    };

    debugLog("[Service Order Debug] Calendar shell mouseDownCapture:", {
      calendarEventId: calendarPointerStateRef.current.calendarEventId,
      isResizeHandle,
      targetClassName
    });
  };

  const handleCalendarMouseUpCapture = (nativeEvent) => {
    const eventCardNode = nativeEvent.target.closest?.("[data-calendar-event-id]");
    const targetClassName = String(nativeEvent.target?.className || "");
    const pointerState = calendarPointerStateRef.current;
    const currentCalendarEventId =
      eventCardNode?.getAttribute("data-calendar-event-id") || null;
    const movedDistance =
      Math.abs(nativeEvent.clientX - pointerState.x) +
      Math.abs(nativeEvent.clientY - pointerState.y);
    const isResizeHandle =
      pointerState.isResizeHandle || targetClassName.includes("rbc-addons-dnd-resize");

    debugLog("[Service Order Debug] Calendar shell mouseUpCapture:", {
      currentCalendarEventId,
      pointerCalendarEventId: pointerState.calendarEventId,
      movedDistance,
      isResizeHandle,
      targetClassName
    });

    if (
      !currentCalendarEventId ||
      currentCalendarEventId !== pointerState.calendarEventId ||
      isResizeHandle ||
      movedDistance > 6
    ) {
      return;
    }

    const resolvedCalendarEvent =
      filteredCalendarEvents.find(
        (calendarEvent) => String(calendarEvent.id) === currentCalendarEventId
      ) ||
      calendarEvents.find((calendarEvent) => String(calendarEvent.id) === currentCalendarEventId) ||
      null;

    debugLog("[Service Order Debug] VISIBLE EVENT CLICK WORKED", {
      currentCalendarEventId,
      resolvedCalendarEvent
    });

    if (!resolvedCalendarEvent) {
      return;
    }

    handleSelectServiceOrder(resolvedCalendarEvent);
  };

  const handleUpdateServiceOrder = async (event) => {
    event.preventDefault();
    setDetailFormError("");
    setDetailFormMessage("");

    if (!selectedServiceOrderId) {
      return;
    }

    if (!activeCompanyId) {
      setDetailFormError(uiText.dashboard.profileLoadError);
      return;
    }

    if (
      detailFormState.isOneOffLocation &&
      !detailFormState.serviceLocationAddress.trim()
    ) {
      setDetailFormError(uiText.serviceOrder.oneOffLocationRequired);
      return;
    }

    setIsSavingDetail(true);

    try {
      const nextStatus = detailFormState.status;
      debugLog("[Service Order Status Debug] edit save requested:", {
        serviceOrderId: selectedServiceOrderId,
        currentStatus: selectedServiceOrder?.status || null,
        nextStatus
      });

      const updatedServiceOrder = await updateServiceOrderSchedule({
        serviceOrderId: selectedServiceOrderId,
        clientId: detailFormState.clientId,
        technicianName: detailFormState.technicianName.trim(),
        serviceDate: detailFormState.serviceDate,
        serviceTime: detailFormState.serviceTime.trim(),
        durationMinutes: detailFormState.durationMinutes,
        status: nextStatus,
        serviceInstructions: detailFormState.serviceInstructions.trim(),
        serviceReport: detailFormState.serviceReport.trim(),
        isOneOffLocation: detailFormState.isOneOffLocation,
        serviceLocationName: detailFormState.serviceLocationName,
        serviceLocationAddress: detailFormState.serviceLocationAddress,
        serviceLocationPhone: detailFormState.serviceLocationPhone,
        serviceLocationContact: detailFormState.serviceLocationContact,
        recurrenceState: detailFormState,
        existingOrder: selectedServiceOrder,
        branchId: isResidentialDetailClient
          ? preferredDetailResidentialBranch?.id || selectedServiceOrder?.branch_id || null
          : detailFormState.branchId || selectedServiceOrder?.branch_id || null,
        excludeOrderId: selectedServiceOrderId
      });
      setDetailFormState((currentState) => ({
        ...currentState,
        status: updatedServiceOrder?.status || nextStatus,
        serviceReport: updatedServiceOrder?.service_report || currentState.serviceReport
      }));
      setSelectedServiceOrderSnapshot((currentSnapshot) =>
        currentSnapshot?.id === selectedServiceOrderId
          ? {
              ...currentSnapshot,
              ...updatedServiceOrder,
              status: updatedServiceOrder?.status || nextStatus
            }
          : currentSnapshot
      );
      debugLog("[Service Order Status Debug] edit save completed:", {
        serviceOrderId: selectedServiceOrderId,
        returnedStatus: updatedServiceOrder?.status || null
      });
      setDetailFormMessage(uiText.dashboard.detailSuccess);
      setRightPanelMode(rightPanelModes.detail);
    } catch (error) {
      setDetailFormError(error.message || uiText.dashboard.detailError);
    }

    setIsSavingDetail(false);
  };

  const handleDeleteServiceOrder = async () => {
    if (!selectedServiceOrderId) {
      return;
    }

    if (!activeCompanyId) {
      setDetailFormError(uiText.dashboard.profileLoadError);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setDetailFormError(uiText.serviceOrder.configError);
      return;
    }

    setDetailFormError("");
    setDetailFormMessage("");
    setCalendarActionError("");
    setCalendarActionMessage("");
    setIsDeletingServiceOrder(true);

    try {
      const { error } = await supabase
        .from("service_orders")
        .delete()
        .eq("id", selectedServiceOrderId)
        .eq("company_id", activeCompanyId);

      if (error) {
        throw new Error(error.message || uiText.dashboard.detailDeleteError);
      }

      await fetchServiceOrders(supabase, activeCompanyId);
      setSelectedServiceOrderId(null);
      setSelectedServiceOrderSnapshot(null);
      setDetailFormState(initialDetailFormState);
      setRightPanelMode(rightPanelModes.empty);
      setCalendarActionMessage(uiText.dashboard.detailDeleteSuccess);
      setIsConfirmingDeleteServiceOrder(false);
    } catch (error) {
      setDetailFormError(error.message || uiText.dashboard.detailDeleteError);
    }

    setIsDeletingServiceOrder(false);
  };

  const handleMoveServiceOrder = async ({ event, start }) => {
    debugLog("[Service Order Debug] onEventDrop:", { event, start });

    if (event?.type === "projected_appointment") {
      debugLog("[Appointments Debug] Ignoring projected appointment drag:", {
        seriesId: event.seriesId || null
      });
      return;
    }

    if (event?.type === "appointment") {
      if (!event?.appointmentId || !start || !isValid(start)) {
        return;
      }

      if (!activeCompanyId) {
        setCalendarActionError(uiText.dashboard.profileLoadError);
        return;
      }

      const supabase = getSupabaseClient();

      if (!supabase) {
        setCalendarActionError(uiText.serviceOrder.configError);
        return;
      }

      const currentAppointment =
        event?.appointment ||
        event?.resource ||
        appointments.find((appointment) => appointment.id === event?.appointmentId) ||
        null;
      const nextAppointmentDate = getServiceDateFromCalendarSlot(start);
      const nextAppointmentTime = getServiceTimeFromDropTarget(
        start,
        event.serviceTime,
        calendarView,
        serviceTimeOptions
      );
      const hasRecurringSeries = Boolean(currentAppointment?.series_id);
      const originalOccurrenceDate = currentAppointment?.appointment_date || event.serviceDate;
      const originalOccurrenceTime = currentAppointment?.appointment_time || event.serviceTime;
      const originalOccurrenceKey = hasRecurringSeries
        ? getAppointmentOccurrenceKey(
            currentAppointment.series_id,
            originalOccurrenceDate,
            originalOccurrenceTime
          )
        : "";
      const nextOccurrenceKey = hasRecurringSeries
        ? getAppointmentOccurrenceKey(
            currentAppointment.series_id,
            nextAppointmentDate,
            nextAppointmentTime
          )
        : "";
      const previousAppointment = currentAppointment;
      const optimisticAppointment = currentAppointment
        ? {
            ...currentAppointment,
            appointment_date: nextAppointmentDate,
            appointment_time: nextAppointmentTime
          }
        : null;
      const shouldSuppressOriginalProjectedOccurrence =
        hasRecurringSeries &&
        originalOccurrenceKey &&
        nextOccurrenceKey &&
        originalOccurrenceKey !== nextOccurrenceKey;
      const normalizedOccurrenceDate = normalizeAppointmentOccurrenceDateKey(
        originalOccurrenceDate
      );
      const normalizedOccurrenceTime = normalizeAppointmentOccurrenceTimeKey(
        originalOccurrenceTime
      );
      const previousMatchingException = shouldSuppressOriginalProjectedOccurrence
        ? appointmentSeriesExceptions.find(
            (appointmentSeriesException) =>
              getAppointmentOccurrenceKey(
                appointmentSeriesException.series_id,
                appointmentSeriesException.occurrence_date,
                appointmentSeriesException.occurrence_time
              ) === originalOccurrenceKey
          ) || null
        : null;
      const optimisticException =
        shouldSuppressOriginalProjectedOccurrence && currentAppointment?.series_id
          ? {
              id: previousMatchingException?.id || `optimistic-moved-${originalOccurrenceKey}`,
              company_id: activeCompanyId,
              series_id: currentAppointment.series_id,
              occurrence_date: normalizedOccurrenceDate,
              occurrence_time: normalizedOccurrenceTime,
              exception_type: "moved",
              replacement_appointment_id: currentAppointment.id
            }
          : null;

      setCalendarActionError("");
      setCalendarActionMessage("");

      if (optimisticAppointment) {
        setAppointments((currentAppointments) =>
          currentAppointments.map((appointment) =>
            appointment.id === optimisticAppointment.id ? optimisticAppointment : appointment
          )
        );

        if (selectedAppointment?.id === optimisticAppointment.id) {
          setSelectedAppointment(optimisticAppointment);
        }
      }

      if (optimisticException) {
        setAppointmentSeriesExceptions((currentExceptions) => {
          const nextExceptions = currentExceptions.filter(
            (appointmentSeriesException) =>
              getAppointmentOccurrenceKey(
                appointmentSeriesException.series_id,
                appointmentSeriesException.occurrence_date,
                appointmentSeriesException.occurrence_time
              ) !== originalOccurrenceKey
          );

          return [...nextExceptions, optimisticException];
        });
      }

      try {
        const { data: updatedAppointment, error } = await supabase
          .from("appointments")
          .update({
            appointment_date: nextAppointmentDate,
            appointment_time: nextAppointmentTime
          })
          .eq("id", event.appointmentId)
          .eq("company_id", activeCompanyId)
          .select(appointmentSelectQuery)
          .single();

        if (error) {
          console.error("[Appointments Debug] appointment drag update error:", error);
          throw error;
        }

        if (shouldSuppressOriginalProjectedOccurrence) {
          const { data: existingException, error: existingExceptionError } = await supabase
            .from("appointment_series_exceptions")
            .select(appointmentSeriesExceptionSelectQuery)
            .eq("company_id", activeCompanyId)
            .eq("series_id", currentAppointment.series_id)
            .eq("occurrence_date", normalizedOccurrenceDate)
            .eq("occurrence_time", normalizedOccurrenceTime)
            .maybeSingle();

          if (existingExceptionError) {
            console.error(
              "[Appointments Debug] appointment drag exception lookup error:",
              existingExceptionError
            );
            throw existingExceptionError;
          }

          let persistedException = existingException || null;

          if (persistedException?.id) {
            const { data: updatedException, error: updateExceptionError } = await supabase
              .from("appointment_series_exceptions")
              .update({
                exception_type: "moved",
                replacement_appointment_id: updatedAppointment.id
              })
              .eq("id", persistedException.id)
              .eq("company_id", activeCompanyId)
              .select(appointmentSeriesExceptionSelectQuery)
              .single();

            if (updateExceptionError) {
              console.error(
                "[Appointments Debug] appointment drag exception update error:",
                updateExceptionError
              );
              throw updateExceptionError;
            }

            persistedException = updatedException || persistedException;
          } else {
            const { data: createdException, error: createExceptionError } = await supabase
              .from("appointment_series_exceptions")
              .insert({
                company_id: activeCompanyId,
                series_id: currentAppointment.series_id,
                occurrence_date: normalizedOccurrenceDate,
                occurrence_time: normalizedOccurrenceTime,
                exception_type: "moved",
                replacement_appointment_id: updatedAppointment.id
              })
              .select(appointmentSeriesExceptionSelectQuery)
              .single();

            if (createExceptionError) {
              console.error(
                "[Appointments Debug] appointment drag exception create error:",
                createExceptionError
              );
              throw createExceptionError;
            }

            persistedException = createdException || null;
          }

          if (persistedException) {
            setAppointmentSeriesExceptions((currentExceptions) => {
              const nextExceptions = currentExceptions.filter(
                (appointmentSeriesException) =>
                  getAppointmentOccurrenceKey(
                    appointmentSeriesException.series_id,
                    appointmentSeriesException.occurrence_date,
                    appointmentSeriesException.occurrence_time
                  ) !== originalOccurrenceKey
              );

              return [...nextExceptions, persistedException];
            });
          }
        }

        setAppointments((currentAppointments) =>
          currentAppointments.map((appointment) =>
            appointment.id === updatedAppointment.id ? updatedAppointment : appointment
          )
        );

        if (selectedAppointment?.id === updatedAppointment.id) {
          setSelectedAppointment(updatedAppointment);
        }

        setCalendarActionMessage(uiText.dashboard.detailSuccess);
      } catch (error) {
        if (previousAppointment) {
          setAppointments((currentAppointments) =>
            currentAppointments.map((appointment) =>
              appointment.id === previousAppointment.id ? previousAppointment : appointment
            )
          );

          if (selectedAppointment?.id === previousAppointment.id) {
            setSelectedAppointment(previousAppointment);
          }
        }

        if (optimisticException) {
          setAppointmentSeriesExceptions((currentExceptions) => {
            const withoutOptimisticException = currentExceptions.filter(
              (appointmentSeriesException) =>
                getAppointmentOccurrenceKey(
                  appointmentSeriesException.series_id,
                  appointmentSeriesException.occurrence_date,
                  appointmentSeriesException.occurrence_time
                ) !== originalOccurrenceKey
            );

            return previousMatchingException
              ? [...withoutOptimisticException, previousMatchingException]
              : withoutOptimisticException;
          });
        }

        setCalendarActionError(error.message || uiText.dashboard.calendarMoveError);
      }

      return;
    }

    if (!event?.id || !start || !isValid(start)) {
      return;
    }

    const nextServiceDate = getServiceDateFromCalendarSlot(start);
    const nextServiceTime = getServiceTimeFromDropTarget(
      start,
      event.serviceTime,
      calendarView,
      serviceTimeOptions
    );

    setCalendarActionError("");
    setCalendarActionMessage("");

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: event.id,
        technicianName: event.technician,
        serviceDate: nextServiceDate,
        serviceTime: nextServiceTime,
        durationMinutes: event.durationMinutes,
        status: event.status,
        excludeOrderId: event.id
      });

      if (selectedServiceOrderId === event.id) {
        setDetailFormMessage(uiText.dashboard.detailSuccess);
      }
    } catch (error) {
      setCalendarActionError(error.message || uiText.dashboard.calendarMoveError);
    }
  };

  const clearDraggedBacklogServiceOrder = () => {
    draggedBacklogServiceOrderRef.current = null;
    setDraggedBacklogServiceOrder(null);
  };

  const handleBacklogDragStart = (serviceOrder, nativeEvent) => {
    if (externalDragCleanupTimeoutRef.current) {
      clearTimeout(externalDragCleanupTimeoutRef.current);
      externalDragCleanupTimeoutRef.current = null;
    }

    if (nativeEvent?.dataTransfer) {
      nativeEvent.dataTransfer.effectAllowed = "move";
      nativeEvent.dataTransfer.setData("text/plain", serviceOrder?.id || "");
    }

    draggedBacklogServiceOrderRef.current = serviceOrder;
    setDraggedBacklogServiceOrder(serviceOrder);
    debugLog("[Backlog DnD Debug] drag start:", {
      serviceOrderId: serviceOrder?.id,
      technicianName: serviceOrder?.technician_name,
      serviceDate: serviceOrder?.service_date,
      serviceTime: serviceOrder?.service_time,
      durationMinutes: resolveDurationMinutes(serviceOrder?.duration_minutes)
    });
  };

  const handleBacklogDragEnd = () => {
    debugLog("[Backlog DnD Debug] drag end fired:", {
      serviceOrderId: draggedBacklogServiceOrderRef.current?.id || null
    });

    if (externalDragCleanupTimeoutRef.current) {
      clearTimeout(externalDragCleanupTimeoutRef.current);
    }

    externalDragCleanupTimeoutRef.current = setTimeout(() => {
      debugLog("[Backlog DnD Debug] drag cleanup after dragend:", {
        serviceOrderId: draggedBacklogServiceOrderRef.current?.id || null
      });
      clearDraggedBacklogServiceOrder();
      externalDragCleanupTimeoutRef.current = null;
    }, 0);
  };

  const handleBacklogQuickReschedule = async (serviceOrder, dayOffset) => {
    if (!serviceOrder?.id) {
      return;
    }

    setCalendarActionError("");
    setCalendarActionMessage("");

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: serviceOrder.id,
        technicianName: serviceOrder.technician_name,
        serviceDate: format(addDays(startOfDay(new Date()), dayOffset), "yyyy-MM-dd"),
        serviceTime: serviceOrder.service_time,
        durationMinutes: serviceOrder.duration_minutes,
        status: serviceOrder.status,
        recurrenceState: getRecurrenceFormState(serviceOrder),
        existingOrder: serviceOrder,
        branchId: serviceOrder.branch_id ?? null,
        excludeOrderId: serviceOrder.id
      });

      if (selectedServiceOrderId === serviceOrder.id) {
        setDetailFormMessage(uiText.dashboard.detailSuccess);
      }

      setCalendarActionMessage(uiText.dashboard.detailSuccess);
    } catch (error) {
      setCalendarActionError(error.message || uiText.dashboard.calendarMoveError);
    }
  };

  const handleBacklogQuickComplete = async (serviceOrder) => {
    if (!serviceOrder?.id) {
      return;
    }

    setCalendarActionError("");
    setCalendarActionMessage("");

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: serviceOrder.id,
        technicianName: serviceOrder.technician_name,
        serviceDate: serviceOrder.service_date,
        serviceTime: serviceOrder.service_time,
        durationMinutes: serviceOrder.duration_minutes,
        status: "completed",
        recurrenceState: getRecurrenceFormState(serviceOrder),
        existingOrder: serviceOrder,
        branchId: serviceOrder.branch_id ?? null,
        excludeOrderId: serviceOrder.id,
        skipConflictCheck: true
      });

      if (selectedServiceOrderId === serviceOrder.id) {
        setDetailFormMessage(uiText.dashboard.detailSuccess);
      }

      setCalendarActionMessage(uiText.dashboard.detailSuccess);
    } catch (error) {
      setCalendarActionError(error.message || uiText.dashboard.detailError);
    }
  };

  const handleDropBacklogServiceOrder = async ({ start, end }) => {
    const pendingDraggedServiceOrder = draggedBacklogServiceOrderRef.current;

    debugLog("[Backlog DnD Debug] drop received:", {
      serviceOrderId: pendingDraggedServiceOrder?.id || null,
      start,
      end
    });

    if (externalDragCleanupTimeoutRef.current) {
      clearTimeout(externalDragCleanupTimeoutRef.current);
      externalDragCleanupTimeoutRef.current = null;
    }

    if (!pendingDraggedServiceOrder?.id || !start || !isValid(start)) {
      console.warn("[Backlog DnD Debug] drop aborted: invalid dragged item or start", {
        serviceOrderId: pendingDraggedServiceOrder?.id || null,
        start
      });
      clearDraggedBacklogServiceOrder();
      return;
    }

    const nextServiceDate = getServiceDateFromCalendarSlot(start);
    const nextServiceTime = getServiceTimeFromDropTarget(
      start,
      pendingDraggedServiceOrder.service_time,
      calendarView,
      serviceTimeOptions
    );

    debugLog("[Backlog DnD Debug] drop normalized target:", {
      serviceOrderId: pendingDraggedServiceOrder.id,
      serviceDate: nextServiceDate,
      serviceTime: nextServiceTime,
      technicianBefore: pendingDraggedServiceOrder.technician_name,
      technicianAfter: pendingDraggedServiceOrder.technician_name
    });

    setCalendarActionError("");
    setCalendarActionMessage("");

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: pendingDraggedServiceOrder.id,
        technicianName: pendingDraggedServiceOrder.technician_name,
        serviceDate: nextServiceDate,
        serviceTime: nextServiceTime,
        durationMinutes: pendingDraggedServiceOrder.duration_minutes,
        status: pendingDraggedServiceOrder.status,
        recurrenceState: getRecurrenceFormState(pendingDraggedServiceOrder),
        existingOrder: pendingDraggedServiceOrder,
        branchId: pendingDraggedServiceOrder.branch_id ?? null,
        excludeOrderId: pendingDraggedServiceOrder.id
      });

      debugLog("[Backlog DnD Debug] drop update completed:", {
        serviceOrderId: pendingDraggedServiceOrder.id
      });

      if (selectedServiceOrderId === pendingDraggedServiceOrder.id) {
        setDetailFormMessage(uiText.dashboard.detailSuccess);
      }

      setCalendarActionMessage(uiText.dashboard.detailSuccess);
    } catch (error) {
      console.error("[Backlog DnD Debug] drop update failed:", {
        serviceOrderId: pendingDraggedServiceOrder.id,
        error
      });
      setCalendarActionError(error.message || uiText.dashboard.calendarMoveError);
    } finally {
      clearDraggedBacklogServiceOrder();
    }
  };

  const handleResizeServiceOrder = async ({ event, end }) => {
    debugLog("[Service Order Debug] onEventResize:", { event, end });

    if (event?.type === "appointment" || event?.type === "projected_appointment") {
      debugLog("[Appointments Debug] Ignoring read-only appointment resize:", {
        appointmentId: event.appointmentId,
        seriesId: event.seriesId || null
      });
      return;
    }

    if (!event?.id || !end || !isValid(end)) {
      return;
    }

    const originalStart = parseServiceOrderStart(event.serviceDate, event.serviceTime);

    if (!isValid(originalStart)) {
      setCalendarActionError(uiText.dashboard.calendarResizeError);
      return;
    }

    const nextDurationMinutes = resolveResizedDurationMinutes(originalStart, end);

    if (!nextDurationMinutes) {
      setCalendarActionError(uiText.dashboard.calendarResizeError);
      return;
    }

    setCalendarActionError("");
    setCalendarActionMessage("");

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: event.id,
        technicianName: event.technician,
        serviceDate: event.serviceDate,
        serviceTime: event.serviceTime,
        durationMinutes: nextDurationMinutes,
        status: event.status,
        excludeOrderId: event.id
      });

      if (selectedServiceOrderId === event.id) {
        setDetailFormMessage(uiText.dashboard.detailSuccess);
      }
    } catch (error) {
      setCalendarActionError(error.message || uiText.dashboard.calendarResizeError);
    }
  };

  const handleCompleteSelectedServiceOrder = async () => {
    if (!selectedServiceOrder) {
      return;
    }

    setDetailFormError("");
    setDetailFormMessage("");
    setIsSavingDetail(true);

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: selectedServiceOrder.id,
        technicianName: selectedServiceOrder.technician_name || detailFormState.technicianName,
        serviceDate: selectedServiceOrder.service_date,
        serviceTime: selectedServiceOrder.service_time,
        durationMinutes: resolveDurationMinutes(selectedServiceOrder.duration_minutes),
        status: "completed",
        serviceReport: detailFormState.serviceReport?.trim() || selectedServiceOrder.service_report || "",
        serviceSummary:
          detailFormState.serviceSummary?.trim() || selectedServiceOrder.service_summary || "",
        findings: detailFormState.findings?.trim() || selectedServiceOrder.findings || "",
        recommendations:
          detailFormState.recommendations?.trim() || selectedServiceOrder.recommendations || "",
        materialsUsed:
          detailFormState.materialsUsed?.trim() || selectedServiceOrder.materials_used || "",
        existingOrder: selectedServiceOrder,
        branchId: selectedServiceOrder.branch_id || null,
        excludeOrderId: selectedServiceOrder.id,
        skipConflictCheck: true
      });
      setDetailFormState((currentState) => ({
        ...currentState,
        status: "completed"
      }));
      setDetailFormMessage(uiText.technicianDashboard.completionSuccess);
      setRightPanelMode(rightPanelModes.detail);
    } catch (error) {
      setDetailFormError(error.message || uiText.technicianDashboard.completionError);
    }

    setIsSavingDetail(false);
  };

  const handleStartSelectedServiceOrder = async () => {
    if (!selectedServiceOrder) {
      return;
    }

    if (selectedServiceOrder.actual_start_at) {
      setDetailFormError("");
      setDetailFormMessage("El servicio ya tiene un inicio real registrado.");
      return;
    }

    const now = new Date().toISOString();
    setDetailFormError("");
    setDetailFormMessage("");
    setIsSavingDetail(true);

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: selectedServiceOrder.id,
        technicianName: selectedServiceOrder.technician_name || detailFormState.technicianName,
        serviceDate: selectedServiceOrder.service_date,
        serviceTime: selectedServiceOrder.service_time,
        durationMinutes: resolveDurationMinutes(selectedServiceOrder.duration_minutes),
        status: selectedServiceOrder.status || "scheduled",
        existingOrder: selectedServiceOrder,
        branchId: selectedServiceOrder.branch_id ?? null,
        excludeOrderId: selectedServiceOrder.id,
        skipConflictCheck: true,
        executionStatus:
          selectedServiceOrder.execution_status === "completed"
            ? "completed"
            : "in_progress",
        startedAt: selectedServiceOrder.started_at || now,
        actualStartAt: now
      });
      setDetailFormMessage("Servicio iniciado correctamente.");
    } catch (error) {
      setDetailFormError(error.message || "No fue posible iniciar el servicio.");
    }

    setIsSavingDetail(false);
  };

  const handleFinalizeSelectedServiceOrder = async () => {
    if (!selectedServiceOrder) {
      return;
    }

    const now = new Date().toISOString();
    const manualActualEnd = parseDateTimeLocalValue(detailFormState.actualEndAt);
    const resolvedActualEnd = manualActualEnd || now;
    const manualActualStart = parseDateTimeLocalValue(detailFormState.actualStartAt);
    const resolvedActualStart =
      manualActualStart ||
      selectedServiceOrder.actual_start_at ||
      selectedServiceOrder.started_at ||
      resolvedActualEnd;
    const completedByLabel = userProfile?.full_name || userEmail || null;
    const autoFilledStart = !manualActualStart &&
      !selectedServiceOrder.actual_start_at &&
      !selectedServiceOrder.started_at;
    setDetailFormError("");
    setDetailFormMessage("");
    setIsSavingDetail(true);

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: selectedServiceOrder.id,
        technicianName: selectedServiceOrder.technician_name || detailFormState.technicianName,
        serviceDate: selectedServiceOrder.service_date,
        serviceTime: selectedServiceOrder.service_time,
        durationMinutes: resolveDurationMinutes(selectedServiceOrder.duration_minutes),
        status: "completed",
        existingOrder: selectedServiceOrder,
        branchId: selectedServiceOrder.branch_id ?? null,
        excludeOrderId: selectedServiceOrder.id,
        skipConflictCheck: true,
        executionStatus: "completed",
        startedAt: selectedServiceOrder.started_at || resolvedActualStart,
        completedAt: selectedServiceOrder.completed_at || resolvedActualEnd,
        actualStartAt: resolvedActualStart,
        actualEndAt: resolvedActualEnd,
        completedBy: completedByLabel,
        completionNotes: detailFormState.completionNotes.trim() || null,
        serviceReport: detailFormState.serviceReport?.trim() || selectedServiceOrder.service_report || "",
        serviceSummary:
          detailFormState.serviceSummary?.trim() || selectedServiceOrder.service_summary || "",
        findings: detailFormState.findings?.trim() || selectedServiceOrder.findings || "",
        recommendations:
          detailFormState.recommendations?.trim() || selectedServiceOrder.recommendations || "",
        materialsUsed:
          detailFormState.materialsUsed?.trim() || selectedServiceOrder.materials_used || ""
      });
      setDetailFormMessage(
        autoFilledStart
          ? "No registraste inicio. Se guardó automáticamente."
          : "Servicio finalizado correctamente."
      );
      setRightPanelMode(rightPanelModes.detail);
    } catch (error) {
      setDetailFormError(error.message || "No fue posible finalizar el servicio.");
    }

    setIsSavingDetail(false);
  };

  const handleQuickCompleteServiceOrder = async (event) => {
    if (event?.type === "appointment" || event?.type === "projected_appointment") {
      debugLog("[Appointments Debug] Ignoring quick complete for read-only appointment:", {
        appointmentId: event.appointmentId,
        seriesId: event.seriesId || null
      });
      return;
    }

    if (!event?.id) {
      return;
    }

    const currentOrder =
      serviceOrders.find((serviceOrder) => serviceOrder.id === event.id) || null;

    if (!currentOrder) {
      setCalendarActionError(uiText.dashboard.detailError);
      return;
    }

    const currentStatus = currentOrder.status || "scheduled";
    const nextStatus = currentStatus === "completed" ? "scheduled" : "completed";

    debugLog("[Service Order Status Debug] quick toggle requested:", {
      serviceOrderId: event.id,
      currentStatus,
      nextStatus
    });

    setCalendarActionError("");
    setCalendarActionMessage("");

    try {
      const updatedServiceOrder = await updateServiceOrderSchedule({
        serviceOrderId: currentOrder.id,
        technicianName: currentOrder.technician_name,
        serviceDate: currentOrder.service_date,
        serviceTime: currentOrder.service_time,
        durationMinutes: currentOrder.duration_minutes,
        status: nextStatus,
        existingOrder: currentOrder,
        branchId: currentOrder.branch_id ?? null,
        clientId: currentOrder.client_id ?? undefined,
        excludeOrderId: currentOrder.id,
        skipConflictCheck: nextStatus !== "scheduled"
      });
      if (selectedServiceOrderId === currentOrder.id) {
        setDetailFormState((currentState) => ({
          ...currentState,
          status: updatedServiceOrder?.status || nextStatus
        }));
      }
      debugLog("[Service Order Status Debug] quick toggle completed:", {
        serviceOrderId: currentOrder.id,
        returnedStatus: updatedServiceOrder?.status || null
      });
      setCalendarActionMessage(
        nextStatus === "completed" ? "Servicio completado" : "Servicio reactivado"
      );
    } catch (error) {
      setCalendarActionError(error.message || uiText.technicianDashboard.completionError);
    }
  };

  const handleAppointmentConversionFormChange = (event) => {
    const { name, value } = event.target;

    setAppointmentConversionForm((currentState) => ({
      ...currentState,
      [name]: name === "durationMinutes" ? Number(value) : value
    }));
  };

  const handleConfirmAppointment = async () => {
    if (!selectedAppointment?.id) {
      return;
    }

    if (isSelectedAppointmentConverted) {
      setDetailFormError("");
      setDetailFormMessage("Esta cita ya genero una orden de servicio.");
      return;
    }

    if (!activeCompanyId) {
      setDetailFormError(uiText.dashboard.profileLoadError);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setDetailFormError(uiText.dashboard.calendarErrorBody);
      return;
    }

    const now = new Date().toISOString();
    const appointmentUsesOneOffLocation =
      Boolean(selectedAppointment.is_one_off_location) ||
      Boolean(
        selectedAppointment.service_location_name ||
          selectedAppointment.service_location_address ||
          selectedAppointment.service_location_phone ||
          selectedAppointment.service_location_contact
      );
    const serviceOrderPayload = {
      company_id: activeCompanyId,
      appointment_id: selectedAppointment.id,
      client_id: selectedAppointment.client_id,
      branch_id: selectedAppointment.branch_id || null,
      technician_name: appointmentConversionForm.technicianName.trim(),
      service_date: appointmentConversionForm.serviceDate,
      service_time: appointmentConversionForm.serviceTime.trim(),
      duration_minutes: resolveDurationMinutes(appointmentConversionForm.durationMinutes),
      status: "scheduled",
      execution_status: defaultExecutionStatus,
      service_instructions: appointmentConversionForm.serviceInstructions.trim() || null,
      is_one_off_location: appointmentUsesOneOffLocation,
      service_location_name: appointmentUsesOneOffLocation
        ? selectedAppointment.service_location_name || null
        : null,
      service_location_address: appointmentUsesOneOffLocation
        ? selectedAppointment.service_location_address || null
        : null,
      service_location_phone: appointmentUsesOneOffLocation
        ? selectedAppointment.service_location_phone || null
        : null,
      service_location_contact: appointmentUsesOneOffLocation
        ? selectedAppointment.service_location_contact || null
        : null
    };

    if (!appointmentConversionForm.technicianName.trim()) {
      setDetailFormError("Técnico requerido para la orden.");
      return;
    }

    setIsConfirmingAppointment(true);
    setDetailFormError("");
    setDetailFormMessage("");

    try {
      const { data: currentAppointment, error: currentAppointmentError } = await supabase
        .from("appointments")
        .select(appointmentSelectQuery)
        .eq("id", selectedAppointment.id)
        .eq("company_id", activeCompanyId)
        .single();

      if (currentAppointmentError) {
        throw currentAppointmentError;
      }

      if (
        isConvertedAppointmentRecord(currentAppointment)
      ) {
        setSelectedAppointment(currentAppointment || selectedAppointment);
        setDetailFormMessage("Esta cita ya genero una orden de servicio.");
        return;
      }

      const { data: createdServiceOrder, error: insertError } = await supabase
        .from("service_orders")
        .insert(serviceOrderPayload)
        .select(serviceOrderSelectQuery)
        .single();

      if (insertError) {
        console.error("[Appointments Debug] confirm appointment insert error:", insertError);
        throw insertError;
      }

      const { data: updatedAppointment, error: appointmentUpdateError } = await supabase
        .from("appointments")
        .update({
          status: "converted",
          confirmed_at: selectedAppointment.confirmed_at || now,
          converted_at: selectedAppointment.converted_at || now,
          service_order_id: createdServiceOrder?.id || selectedAppointment.service_order_id || null
        })
        .select(appointmentSelectQuery)
        .eq("id", selectedAppointment.id)
        .eq("company_id", activeCompanyId)
        .single();

      if (appointmentUpdateError) {
        console.error(
          "[Appointments Debug] confirm appointment update error:",
          {
            message: appointmentUpdateError?.message || null,
            code: appointmentUpdateError?.code || null,
            details: appointmentUpdateError?.details || null,
            hint: appointmentUpdateError?.hint || null,
            name: appointmentUpdateError?.name || null,
            status: appointmentUpdateError?.status || null,
            error: JSON.stringify(appointmentUpdateError, Object.getOwnPropertyNames(appointmentUpdateError))
          }
        );
        throw appointmentUpdateError;
      }

      setSelectedAppointment(updatedAppointment || selectedAppointment);
      setIsPreparingAppointmentConversion(false);
      setDetailFormMessage("Cita confirmada y orden de servicio creada.");
      await fetchServiceOrders(supabase, activeCompanyId);
    } catch (error) {
      setDetailFormError(error.message || "No fue posible confirmar la cita.");
    } finally {
      setIsConfirmingAppointment(false);
    }
  };

  const handleDeleteAppointmentOccurrence = async () => {
    if (!selectedAppointment?.id) {
      return;
    }

    if (isSelectedAppointmentConverted) {
      setDetailFormError("");
      setDetailFormMessage("No se puede eliminar una cita que ya genero una orden de servicio.");
      return;
    }

    if (!activeCompanyId) {
      setDetailFormError(uiText.dashboard.profileLoadError);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setDetailFormError(uiText.dashboard.calendarErrorBody);
      return;
    }

    const appointmentId = selectedAppointment.id;
    const appointmentSeriesId = selectedAppointment.series_id || null;
    const occurrenceDate = normalizeAppointmentOccurrenceDateKey(
      selectedAppointment.appointment_date
    );
    const occurrenceTime = normalizeAppointmentOccurrenceTimeKey(
      selectedAppointment.appointment_time
    );

    setIsDeletingAppointment(true);
    setDetailFormError("");
    setDetailFormMessage("");

    try {
      if (appointmentSeriesId) {
        const { data: existingException, error: existingExceptionError } = await supabase
          .from("appointment_series_exceptions")
          .select("id")
          .eq("company_id", activeCompanyId)
          .eq("series_id", appointmentSeriesId)
          .eq("occurrence_date", occurrenceDate)
          .eq("occurrence_time", occurrenceTime)
          .eq("exception_type", "deleted")
          .maybeSingle();

        if (existingExceptionError) {
          console.error(
            "[Appointments Debug] lookup delete exception error:",
            existingExceptionError
          );
          throw existingExceptionError;
        }

        if (!existingException?.id) {
          const { data: createdException, error: createExceptionError } = await supabase
            .from("appointment_series_exceptions")
            .insert({
              company_id: activeCompanyId,
              series_id: appointmentSeriesId,
              occurrence_date: occurrenceDate,
              occurrence_time: occurrenceTime,
              exception_type: "deleted",
              replacement_appointment_id: null
            })
            .select(appointmentSeriesExceptionSelectQuery)
            .single();

          if (createExceptionError) {
            console.error(
              "[Appointments Debug] create delete exception error:",
              createExceptionError
            );
            throw createExceptionError;
          }

          setAppointmentSeriesExceptions((currentExceptions) => [
            ...(currentExceptions || []),
            createdException
          ]);
        }
      }

      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointmentId)
        .eq("company_id", activeCompanyId);

      if (error) {
        console.error("[Appointments Debug] delete appointment error:", error);
        throw error;
      }

      setAppointments((currentAppointments) =>
        currentAppointments.filter((appointment) => appointment.id !== appointmentId)
      );
      setSelectedAppointment(null);
      setRightPanelMode(rightPanelModes.empty);
      setIsChoosingRecurringAppointmentDelete(false);
      setCalendarActionMessage("Cita eliminada correctamente.");
    } catch (error) {
      setDetailFormError(error.message || "No fue posible eliminar la cita.");
    } finally {
      setIsDeletingAppointment(false);
    }
  };

  const handleDeleteAppointmentSeries = async () => {
    if (!selectedAppointment?.id || !selectedAppointment?.series_id) {
      return;
    }

    if (!activeCompanyId) {
      setDetailFormError(uiText.dashboard.profileLoadError);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setDetailFormError(uiText.dashboard.calendarErrorBody);
      return;
    }

    const seriesId = selectedAppointment.series_id;
    const selectedOccurrenceDate = normalizeAppointmentOccurrenceDateKey(
      selectedAppointment.appointment_date
    );

    setIsDeletingAppointment(true);
    setDetailFormError("");
    setDetailFormMessage("");

    try {
      const { error: updateSeriesError } = await supabase
        .from("appointment_series")
        .update({ status: "inactive" })
        .eq("id", seriesId)
        .eq("company_id", activeCompanyId);

      if (updateSeriesError) {
        throw updateSeriesError;
      }

      const { data: futureSeriesAppointments, error: futureSeriesAppointmentsError } =
        await supabase
          .from("appointments")
          .select("id, appointment_date, service_order_id, converted_at, status")
          .eq("company_id", activeCompanyId)
          .eq("series_id", seriesId)
          .gte("appointment_date", selectedOccurrenceDate);

      if (futureSeriesAppointmentsError) {
        throw futureSeriesAppointmentsError;
      }

      const preservedAppointmentIds = new Set(
        (futureSeriesAppointments || [])
          .filter(
            (appointment) => isConvertedAppointmentRecord(appointment)
          )
          .map((appointment) => appointment.id)
      );
      const deletableAppointmentIds = (futureSeriesAppointments || [])
        .filter((appointment) => !preservedAppointmentIds.has(appointment.id))
        .map((appointment) => appointment.id);

      if (deletableAppointmentIds.length > 0) {
        const { error: deleteAppointmentsError } = await supabase
          .from("appointments")
          .delete()
          .in("id", deletableAppointmentIds)
          .eq("company_id", activeCompanyId);

        if (deleteAppointmentsError) {
          throw deleteAppointmentsError;
        }
      }

      setAppointmentSeries((currentSeries) =>
        currentSeries.map((series) =>
          series.id === seriesId ? { ...series, status: "inactive" } : series
        )
      );
      setAppointments((currentAppointments) =>
        currentAppointments.filter(
          (appointment) =>
            !(
              appointment.series_id === seriesId &&
              normalizeAppointmentOccurrenceDateKey(appointment.appointment_date) >=
                selectedOccurrenceDate &&
              !preservedAppointmentIds.has(appointment.id)
            )
        )
      );
      setSelectedAppointment(null);
      setRightPanelMode(rightPanelModes.empty);
      setIsChoosingRecurringAppointmentDelete(false);
      setCalendarActionMessage(
        preservedAppointmentIds.size > 0
          ? "Serie desactivada. Las citas futuras sin orden vinculada fueron eliminadas."
          : "Serie desactivada y citas futuras eliminadas."
      );
    } catch (error) {
      setDetailFormError(error.message || "No fue posible eliminar la serie.");
    } finally {
      setIsDeletingAppointment(false);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment?.id) {
      return;
    }

    if (selectedAppointment?.series_id) {
      setIsChoosingRecurringAppointmentDelete(true);
      setDetailFormError("");
      setDetailFormMessage("");
      return;
    }

    await handleDeleteAppointmentOccurrence();
  };

  const handleOpenLinkedServiceOrder = () => {
    if (!selectedAppointment?.service_order_id) {
      return;
    }

    const linkedServiceOrder =
      selectedAppointmentLinkedServiceOrder ||
      serviceOrders.find(
        (serviceOrder) => serviceOrder.id === selectedAppointment.service_order_id
      ) ||
      null;

    if (!linkedServiceOrder) {
      setDetailFormError("No se encontro la orden vinculada en el calendario actual.");
      return;
    }

    setDetailFormError("");
    setDetailFormMessage("");
    setSelectedAppointment(null);
    setSelectedServiceOrderId(linkedServiceOrder.id);
    setSelectedServiceOrderSnapshot(linkedServiceOrder);
    setRightPanelMode(rightPanelModes.detail);
  };

  const handleStartReschedule = () => {
    setRightPanelMode(rightPanelModes.edit);
    setTimeout(() => {
      detailDateInputRef.current?.focus();
    }, 0);
  };

  const getExecutionStatusValue = (serviceOrder) => {
    if (!serviceOrder) {
      return defaultExecutionStatus;
    }

    if (serviceOrder.execution_status) {
      return serviceOrder.execution_status;
    }

    return serviceOrder.status === "completed" ? "completed" : defaultExecutionStatus;
  };

  const canStartTechnicianService = (serviceOrder) =>
    Boolean(
      serviceOrder &&
      serviceOrder.service_date === getTodayDateString() &&
      serviceOrder.status !== "completed" &&
      getExecutionStatusValue(serviceOrder) !== "completed"
    );

  const canCompleteTechnicianService = (serviceOrder) =>
    Boolean(
      serviceOrder &&
      serviceOrder.service_date === getTodayDateString() &&
      getExecutionStatusValue(serviceOrder) !== "completed"
    );

  const handleSelectTechnicianOrder = (serviceOrder) => {
    setSelectedTechnicianOrderId(serviceOrder?.id || null);
    setTechnicianActionMessage("");
    setTechnicianActionError("");
  };

  const handleStartTechnicianOrder = async () => {
    if (!selectedTechnicianOrder) {
      return;
    }

    setTechnicianActionError("");
    setTechnicianActionMessage("");
    setIsStartingTechnicianOrder(true);

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: selectedTechnicianOrder.id,
        technicianName: selectedTechnicianOrder.technician_name,
        serviceDate: selectedTechnicianOrder.service_date,
        serviceTime: selectedTechnicianOrder.service_time,
        durationMinutes: selectedTechnicianOrder.duration_minutes,
        status: selectedTechnicianOrder.status,
        executionStatus: "in_progress",
        startedAt: selectedTechnicianOrder.started_at || new Date().toISOString(),
        completedAt: selectedTechnicianOrder.completed_at || null,
        existingOrder: selectedTechnicianOrder,
        branchId: selectedTechnicianOrder.branch_id ?? null,
        clientId: selectedTechnicianOrder.client_id ?? undefined,
        excludeOrderId: selectedTechnicianOrder.id,
        skipConflictCheck: true
      });

      setTechnicianActionMessage(uiText.technicianDashboard.startSuccess);
    } catch (error) {
      setTechnicianActionError(error.message || uiText.technicianDashboard.startError);
    } finally {
      setIsStartingTechnicianOrder(false);
    }
  };

  const handleCompleteTechnicianOrder = async () => {
    if (!selectedTechnicianOrder) {
      return;
    }

    setTechnicianActionError("");
    setTechnicianActionMessage("");
    setIsCompletingTechnicianOrder(true);

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: selectedTechnicianOrder.id,
        technicianName: selectedTechnicianOrder.technician_name,
        serviceDate: selectedTechnicianOrder.service_date,
        serviceTime: selectedTechnicianOrder.service_time,
        durationMinutes: selectedTechnicianOrder.duration_minutes,
        status: "completed",
        executionStatus: "completed",
        startedAt: selectedTechnicianOrder.started_at || new Date().toISOString(),
        completedAt: selectedTechnicianOrder.completed_at || new Date().toISOString(),
        serviceReport:
          technicianReportDraft.trim() || selectedTechnicianOrder.service_report || "",
        existingOrder: selectedTechnicianOrder,
        branchId: selectedTechnicianOrder.branch_id ?? null,
        clientId: selectedTechnicianOrder.client_id ?? undefined,
        excludeOrderId: selectedTechnicianOrder.id,
        skipConflictCheck: true
      });

      setTechnicianActionMessage(uiText.technicianDashboard.completionSuccess);
    } catch (error) {
      setTechnicianActionError(error.message || uiText.technicianDashboard.completionError);
    } finally {
      setIsCompletingTechnicianOrder(false);
    }
  };

  useEffect(() => {
    debugLog("[Service Order Debug] Selected service order:", selectedServiceOrder);
  }, [selectedServiceOrder]);

  useEffect(() => {
    setTechnicianReportDraft(selectedTechnicianOrder?.service_report || "");
  }, [selectedTechnicianOrder?.id, selectedTechnicianOrder?.service_report]);

  if (isLoading || !isProfileResolved) {
    return (
      <main className="admin-dashboard">
        <div className="card dashboard-card">
          <h1>{uiText.common.loadingDashboard}</h1>
        </div>
      </main>
    );
  }

  if (isTechnicianUser) {
    return (
      <main className="technician-dashboard">
        <header className="technician-header">
          <div>
            <p className="admin-eyebrow">{uiText.technicianDashboard.eyebrow}</p>
            <h1>{uiText.technicianDashboard.headerTitle}</h1>
            <p className="technician-subtitle">{uiText.technicianDashboard.subtitle}</p>
            <div className="admin-debug-panel">
              <span>{uiText.dashboard.companyDebugLabel}:</span>
              <strong>{userProfile?.company_id || "-"}</strong>
            </div>
            <div className="admin-debug-panel">
              <span>Auth user id:</span>
              <strong>{authUserId || "-"}</strong>
            </div>
            <div className="admin-debug-panel">
              <span>Profile id:</span>
              <strong>{userProfile?.id || "-"}</strong>
            </div>
            <div className="admin-debug-panel">
              <span>Profile full_name:</span>
              <strong>{userProfile?.full_name || "-"}</strong>
            </div>
            <div className="admin-debug-panel">
              <span>Profile role:</span>
              <strong>{userProfile?.role || "-"}</strong>
            </div>
            {profileError ? <p className="admin-debug-error">{profileError}</p> : null}
          </div>

          <div className="technician-header-actions">
            <div className="technician-user-card">
              <span className="admin-user-label">{uiText.technicianDashboard.assignedTo}</span>
              <strong>{userProfile?.full_name || userEmail}</strong>
            </div>

            <button
              className="button technician-logout-button"
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
            >
              {isSigningOut ? uiText.common.loggingOut : uiText.common.logout}
            </button>
          </div>
        </header>

        <section className="technician-main">
          <section className="technician-services-panel">
            <div className="calendar-panel-header">
              <div>
                <h2>{uiText.technicianDashboard.title}</h2>
              </div>
            </div>

            {technicianOrdersError ? (
              <div className="calendar-empty-state">
                <h3>{uiText.technicianDashboard.title}</h3>
                <p>{technicianOrdersError}</p>
              </div>
            ) : null}

            {!technicianOrdersError && isTechnicianOrdersLoading ? (
              <div className="calendar-empty-state">
                <h3>{uiText.common.loadingDashboard}</h3>
              </div>
            ) : null}

            {!technicianOrdersError &&
            !isTechnicianOrdersLoading &&
            technicianOrders.length === 0 ? (
              <div className="calendar-empty-state">
                <h3>{uiText.technicianDashboard.title}</h3>
                <p>{uiText.technicianDashboard.empty}</p>
              </div>
            ) : null}

            {!technicianOrdersError &&
            !isTechnicianOrdersLoading &&
            technicianOrders.length > 0 ? (
              <div className="technician-service-list">
                {technicianOrders.map((serviceOrder) => {
                  const serviceLocation = resolveEffectiveServiceLocation(serviceOrder);
                  const isSelected = serviceOrder.id === selectedTechnicianOrderId;
                  const executionStatus = getExecutionStatusValue(serviceOrder);

                  return (
                    <article
                      key={serviceOrder.id}
                      className={
                        isSelected
                          ? "technician-service-card technician-service-card-selected"
                          : "technician-service-card"
                      }
                    >
                      <div className="technician-service-card-copy">
                        <div className="technician-service-card-header">
                          <h3>{getClientDisplayName(serviceOrder.clients)}</h3>
                          <div className="technician-service-card-badges">
                            <span
                              className={`technician-status-badge technician-execution-badge technician-execution-badge-${executionStatus}`}
                            >
                              {getExecutionStatusLabel(executionStatus)}
                            </span>
                            <span className="technician-status-badge">
                              {getStatusLabel(serviceOrder.status)}
                            </span>
                          </div>
                        </div>

                        <div className="technician-service-card-grid">
                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.branch}</span>
                            <strong>
                              {serviceLocation.name || uiText.technicianDashboard.fallbacks.branch}
                            </strong>
                          </div>

                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.address}</span>
                            <strong>
                              {serviceLocation.address ||
                                uiText.technicianDashboard.fallbacks.address}
                            </strong>
                          </div>

                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.phone}</span>
                            <strong>
                              {serviceLocation.phone || uiText.technicianDashboard.fallbacks.phone}
                            </strong>
                          </div>

                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.contact}</span>
                            <strong>
                              {serviceLocation.contact ||
                                uiText.technicianDashboard.fallbacks.contact}
                            </strong>
                          </div>

                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.serviceTime}</span>
                            <strong>{formatDisplayTime(serviceOrder.service_time)}</strong>
                          </div>

                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.executionStatus}</span>
                            <strong>{getExecutionStatusLabel(executionStatus)}</strong>
                          </div>
                        </div>

                        <div className="detail-row">
                          <span>{uiText.technicianDashboard.fields.instructions}</span>
                          <strong>
                            {serviceOrder.service_instructions ||
                              uiText.technicianDashboard.fallbacks.instructions}
                          </strong>
                        </div>
                      </div>

                      <button
                        className="button button-secondary technician-detail-button"
                        type="button"
                        onClick={() => handleSelectTechnicianOrder(serviceOrder)}
                      >
                        {uiText.technicianDashboard.actions.viewDetail}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>

          <aside className="technician-detail-panel">
            <h2>{uiText.technicianDashboard.detailTitle}</h2>

            {!selectedTechnicianOrder ? (
              <p>{uiText.technicianDashboard.detailEmpty}</p>
            ) : (
              <div className="detail-panel">
                {(() => {
                  const technicianServiceLocation =
                    resolveEffectiveServiceLocation(selectedTechnicianOrder);

                  return (
                    <>
                <div className="branch-summary-card">
                  <span>{uiText.technicianDashboard.selectedService}</span>
                  <strong>{getClientDisplayName(selectedTechnicianOrder.clients)}</strong>
                  <p>
                    {technicianServiceLocation.name || uiText.technicianDashboard.fallbacks.branch}
                  </p>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.client}</span>
                  <strong>{getClientDisplayName(selectedTechnicianOrder.clients)}</strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.branch}</span>
                  <strong>
                    {technicianServiceLocation.name || uiText.technicianDashboard.fallbacks.branch}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.address}</span>
                  <strong>
                    {technicianServiceLocation.address ||
                      uiText.technicianDashboard.fallbacks.address}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.phone}</span>
                  <strong>
                    {technicianServiceLocation.phone ||
                      uiText.technicianDashboard.fallbacks.phone}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.contact}</span>
                  <strong>
                    {technicianServiceLocation.contact ||
                      uiText.technicianDashboard.fallbacks.contact}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.dashboard.detailFields.serviceDate}</span>
                  <strong>{formatServiceDate(selectedTechnicianOrder.service_date)}</strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.serviceTime}</span>
                  <strong>{formatDisplayTime(selectedTechnicianOrder.service_time)}</strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.status}</span>
                  <strong>{getStatusLabel(selectedTechnicianOrder.status)}</strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.executionStatus}</span>
                  <strong>
                    {getExecutionStatusLabel(getExecutionStatusValue(selectedTechnicianOrder))}
                  </strong>
                </div>

                {selectedTechnicianOrder.started_at ? (
                  <div className="detail-row">
                    <span>{uiText.technicianDashboard.fields.startedAt}</span>
                    <strong>{formatCompletedAt(selectedTechnicianOrder.started_at)}</strong>
                  </div>
                ) : null}

                {selectedTechnicianOrder.completed_at ? (
                  <div className="detail-row">
                    <span>{uiText.technicianDashboard.fields.completedAt}</span>
                    <strong>{formatCompletedAt(selectedTechnicianOrder.completed_at)}</strong>
                  </div>
                ) : null}

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.instructions}</span>
                  <strong>
                    {selectedTechnicianOrder.service_instructions ||
                      uiText.technicianDashboard.fallbacks.instructions}
                  </strong>
                </div>

                <label className="workspace-input-group">
                  <span>{uiText.technicianDashboard.fields.report}</span>
                  <textarea
                    value={technicianReportDraft}
                    onChange={(event) => setTechnicianReportDraft(event.target.value)}
                    placeholder={uiText.serviceOrder.placeholders.serviceReport}
                    rows={4}
                    disabled={
                      isStartingTechnicianOrder ||
                      isCompletingTechnicianOrder ||
                      getExecutionStatusValue(selectedTechnicianOrder) === "completed"
                    }
                  />
                  <small className="detail-subcopy">{uiText.technicianDashboard.helpers.report}</small>
                </label>

                <div className="workspace-form-messages">
                  {technicianActionError ? (
                    <p className="error">{technicianActionError}</p>
                  ) : null}
                  {technicianActionMessage ? (
                    <p className="success-message">{technicianActionMessage}</p>
                  ) : null}
                </div>

                <div className="workspace-actions workspace-actions-split">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={handleStartTechnicianOrder}
                    disabled={
                      isStartingTechnicianOrder ||
                      isCompletingTechnicianOrder ||
                      !canStartTechnicianService(selectedTechnicianOrder)
                    }
                  >
                    {isStartingTechnicianOrder
                      ? uiText.technicianDashboard.actions.starting
                      : uiText.technicianDashboard.actions.start}
                  </button>
                  <button
                    className="button detail-save-button"
                    type="button"
                    onClick={handleCompleteTechnicianOrder}
                    disabled={
                      isCompletingTechnicianOrder ||
                      isStartingTechnicianOrder ||
                      !canCompleteTechnicianService(selectedTechnicianOrder)
                    }
                  >
                    {isCompletingTechnicianOrder
                      ? uiText.technicianDashboard.actions.completing
                      : uiText.technicianDashboard.actions.complete}
                  </button>
                </div>
                    </>
                  );
                })()}
              </div>
            )}
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-app-bar">
        <div className="admin-app-bar-brand">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src={activeCompanyLogoUrl}
              alt={activeCompany?.name || "Biz2Rise"}
              style={{ height: "26px", width: "auto" }}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/logo.svg";
              }}
            />
            <span>{activeCompany?.name || uiText.common.appName}</span>
          </div>
        </div>

        <div className="admin-app-bar-actions">
          <div className="admin-summary-bar" aria-label="Resumen operativo">
            <span className="admin-summary-chip">
              <span>Hoy</span>
              <strong>{todayOrdersCount}</strong>
            </span>
            <span className="admin-summary-chip admin-summary-chip-warning">
              <span>Pendientes</span>
              <strong>{pendingOrders.length}</strong>
            </span>
            <span className="admin-summary-chip admin-summary-chip-success">
              <span>Completados</span>
              <strong>{completedTodayCount}</strong>
            </span>
          </div>

          <div className="admin-header-actions">
            <button
              className="button"
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
            >
              {isSigningOut ? uiText.common.loggingOut : uiText.common.logout}
            </button>
          </div>
        </div>
      </header>

      <section
        className={
          activeTopLevelTab === dashboardTabs.calendar
            ? serviceOrderPanelStage === "operational"
              ? `admin-content admin-content-operational-edit${
                  isSidebarCollapsed ? " admin-content-sidebar-collapsed" : ""
                }`
              : serviceOrderPanelStage === "detail"
                ? `admin-content admin-content-operational-detail${
                    isSidebarCollapsed ? " admin-content-sidebar-collapsed" : ""
                  }`
                : `admin-content admin-content-two-column${
                    isSidebarCollapsed ? " admin-content-sidebar-collapsed" : ""
                  }`
            : `admin-content admin-content-two-column${
                isSidebarCollapsed ? " admin-content-sidebar-collapsed" : ""
              }`
        }
      >
        {activeTopLevelTab === dashboardTabs.calendar ? (
        <aside
          className={
            isSidebarCollapsed
              ? "operations-panel operations-panel-collapsed"
              : "operations-panel"
          }
        >
          {renderSidebarNavigation()}
          {!isSidebarCollapsed ? (
          <div className="workspace-sidebar-content">
          <div className="operations-inbox">
            <div className="operations-inbox-header">
              <div>
                <span className="control-group-label">Inbox operativo</span>
                <h2>Requiere atencion</h2>
              </div>
              <span>{pendingOrders.length}</span>
            </div>
            <p className="operations-inbox-copy">{uiText.dashboard.backlogBody}</p>

            <div className="operations-pending-list">
              {pendingOrders.length === 0 ? (
                <p className="operational-backlog-empty">{uiText.dashboard.backlogEmpty}</p>
              ) : (
                pendingOrders.map((serviceOrder) => {
                  const isPendingToday = serviceOrder.service_date === getTodayDateString();
                  const serviceLocation = resolveEffectiveServiceLocation(serviceOrder);

                  return (
                    <div
                      key={serviceOrder.id}
                      className={
                        serviceOrder.id === selectedServiceOrderId
                          ? `operational-backlog-card-shell operational-backlog-card-selected ${
                              isPendingToday
                                ? "operational-backlog-card-today"
                                : "operational-backlog-card-overdue"
                            }`
                          : `operational-backlog-card-shell ${
                              isPendingToday
                                ? "operational-backlog-card-today"
                                : "operational-backlog-card-overdue"
                            }`
                      }
                    >
                      <button
                        type="button"
                        draggable
                        className="operational-backlog-card-body"
                        onClick={() => handleSelectBacklogServiceOrder(serviceOrder)}
                        onDragStart={(event) => handleBacklogDragStart(serviceOrder, event)}
                        onDragEnd={handleBacklogDragEnd}
                      >
                        <strong>{getClientDisplayName(serviceOrder.clients)}</strong>
                        <span>{serviceLocation.name || uiText.dashboard.branchEmpty}</span>
                        <span>
                          {formatDisplayTime(serviceOrder.service_time)} ·{" "}
                          {getTechnicianDisplayName(serviceOrder.technician_name)}
                        </span>
                      </button>

                      <div className="operational-backlog-actions">
                        <button
                          type="button"
                          className="operational-backlog-action"
                          draggable={false}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleBacklogQuickReschedule(serviceOrder, 0);
                          }}
                        >
                          {uiText.dashboard.backlogActionToday}
                        </button>
                        <button
                          type="button"
                          className="operational-backlog-action operational-backlog-action-complete"
                          draggable={false}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleBacklogQuickComplete(serviceOrder);
                          }}
                        >
                          {uiText.dashboard.backlogActionComplete}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="operations-divider">
            <span className="control-group-label">Operaciones</span>
          </div>

          <div className="operations-panel-header">
            <div>
              <h2>{uiText.dashboard.operationsTitle}</h2>
              <p>Filtros y accesos rapidos para el despacho diario.</p>
            </div>
            <div className="operations-panel-actions">
              <button className="button" type="button" onClick={handleOpenCreatePanel}>
                + Nueva cita
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={handleOpenClientModal}
              >
                + Cliente
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={handleViewToday}
              >
                Ver hoy
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={handleViewPending}
              >
                Ver pendientes
              </button>
            </div>
          </div>

          {activeAdminView === adminViewTabs.calendar ? (
            <div className="operations-panel-section">
              {hasActiveTechnicianFilter ? (
                <div className="operations-filter-note">
                  <span>Filtrando por {selectedCalendarTechnicians.length} tecnico(s)</span>
                  <button
                    type="button"
                    className="calendar-filter-banner-action"
                    onClick={() => setSelectedCalendarTechnicians([])}
                  >
                    Limpiar
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                className={
                  showOnlyOverdue
                    ? "operations-indicator operations-indicator-active"
                    : "operations-indicator"
                }
                onClick={toggleOverdueFilter}
              >
                <span>{uiText.dashboard.overdueCounterLabel}:</span>
                <strong>{overdueCount}</strong>
              </button>
            </div>
          ) : (
            <div className="operations-panel-section">
              <label className="calendar-filter control-group-body context-panel-filter">
                <span className="control-group-label">{uiText.serviceList.filters.client}</span>
                <input
                  type="text"
                  value={serviceListClientSearch}
                  onChange={(event) => setServiceListClientSearch(event.target.value)}
                  placeholder={uiText.serviceList.placeholders.clientSearch}
                />
              </label>

              <label className="calendar-filter control-group-body context-panel-filter">
                <span className="control-group-label">{uiText.serviceList.filters.recurring}</span>
                <select
                  value={serviceListRecurring}
                  onChange={(event) => setServiceListRecurring(event.target.value)}
                >
                  <option value="all">{uiText.serviceList.filters.all}</option>
                  <option value="yes">{uiText.serviceList.recurringYes}</option>
                  <option value="no">{uiText.serviceList.recurringNo}</option>
                </select>
              </label>
            </div>
          )}
          </div>
          ) : null}
          {renderSidebarFooter()}
        </aside>
        ) : null}

        {activeTopLevelTab === dashboardTabs.clients ? (
          <aside
            className={
              isSidebarCollapsed
                ? "operations-panel operations-panel-collapsed"
                : "operations-panel"
            }
          >
            {renderSidebarNavigation()}
            {!isSidebarCollapsed ? (
            <div className="workspace-sidebar-content">
            <div className="operations-divider">
              <span className="control-group-label">{uiText.dashboard.topTabs.clients}</span>
            </div>

            <div className="operations-panel-header">
              <div>
                <h2>{uiText.clients.title}</h2>
                <p>Busca clientes, filtra por tipo y crea nuevos registros rapidamente.</p>
              </div>
              <div className="operations-panel-actions">
                <button className="button" type="button" onClick={handleOpenClientDrawerCreate}>
                  + Cliente
                </button>
              </div>
            </div>

            {clientsModuleTab === clientsModuleTabs.list ? (
              <div className="operations-panel-section">
                <label className="calendar-filter control-group-body context-panel-filter">
                  <span className="control-group-label">{uiText.serviceList.filters.client}</span>
                  <input
                    type="text"
                    value={clientSidebarSearch}
                    onChange={(event) => setClientSidebarSearch(event.target.value)}
                    placeholder={uiText.serviceList.placeholders.clientSearch}
                  />
                </label>

                <label className="calendar-filter control-group-body context-panel-filter">
                  <span className="control-group-label">{uiText.clients.fields.clientType}</span>
                  <select
                    value={clientSidebarType}
                    onChange={(event) => setClientSidebarType(event.target.value)}
                  >
                    <option value="all">{uiText.dashboard.clientTypeAll}</option>
                    <option value="residential">{uiText.clients.typeOptions.residential}</option>
                    <option value="commercial">{uiText.clients.typeOptions.commercial}</option>
                  </select>
                </label>
              </div>
            ) : null}
            </div>
            ) : null}
            {renderSidebarFooter()}
          </aside>
        ) : null}

        {activeTopLevelTab === dashboardTabs.technicians ? (
          <aside
            className={
              isSidebarCollapsed
                ? "operations-panel operations-panel-collapsed"
                : "operations-panel"
            }
          >
            {renderSidebarNavigation()}
            {!isSidebarCollapsed ? (
            <div className="workspace-sidebar-content">
            <div className="operations-divider">
              <span className="control-group-label">{uiText.dashboard.topTabs.technicians}</span>
            </div>

            <div className="operations-panel-header">
              <div>
                <h2>{uiText.technicians.title}</h2>
                <p>Consulta el roster tecnico y filtra rapidamente por estado.</p>
              </div>
              <div className="operations-panel-actions">
                <button className="button" type="button" onClick={handleOpenTechnicianDrawerCreate}>
                  + Tecnico
                </button>
              </div>
            </div>

            <div className="operations-panel-section">
              <label className="calendar-filter control-group-body context-panel-filter">
                <span className="control-group-label">{uiText.technicians.headers.status}</span>
                <select
                  value={technicianSidebarStatus}
                  onChange={(event) => setTechnicianSidebarStatus(event.target.value)}
                >
                  <option value="all">{uiText.dashboard.technicianStatusAll}</option>
                  <option value="active">{uiText.dashboard.technicianStatusActive}</option>
                  <option value="inactive">{uiText.dashboard.technicianStatusInactive}</option>
                </select>
              </label>
            </div>

            <div className="operations-panel-section">
              <div className="technician-roster-summary">
                <span className="admin-summary-chip admin-summary-chip-success">
                  <span>Activos</span>
                  <strong>{activeTechniciansCount}</strong>
                </span>
                <span className="admin-summary-chip">
                  <span>Inactivos</span>
                  <strong>{inactiveTechniciansCount}</strong>
                </span>
              </div>
            </div>

            <div className="operations-panel-section">
              <span className="control-group-label">{uiText.technicians.listTitle}</span>
              <div className="operations-pending-list">
                {filteredTechnicians.map((technician) => (
                  <div key={technician.id} className="operations-list-item">
                    <strong>{technician.full_name}</strong>
                    <span>
                      {technician.is_active
                        ? uiText.technicians.active
                        : uiText.technicians.inactive}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            </div>
            ) : null}
            {renderSidebarFooter()}
          </aside>
        ) : null}

        {activeTopLevelTab === dashboardTabs.settings ? (
          <aside
            className={
              isSidebarCollapsed
                ? "operations-panel operations-panel-collapsed"
                : "operations-panel"
            }
          >
            {renderSidebarNavigation()}
            {!isSidebarCollapsed ? (
            <div className="workspace-sidebar-content">
            <div className="operations-divider">
              <span className="control-group-label">{uiText.dashboard.topTabs.settings}</span>
            </div>

            <div className="operations-panel-header">
              <div>
                <h2>{uiText.dashboard.settingsPanelTitle}</h2>
                <p>Accesos a configuraciones globales del despacho.</p>
              </div>
            </div>

            <div className="operations-panel-section">
              <button type="button" className="button button-secondary operations-nav-button">
                {uiText.dashboard.settingsNav.company}
              </button>
              <button type="button" className="button button-secondary operations-nav-button">
                {uiText.dashboard.settingsNav.preferences}
              </button>
              <button type="button" className="button button-secondary operations-nav-button">
                {uiText.dashboard.settingsNav.notifications}
              </button>
            </div>
            </div>
            ) : null}
            {renderSidebarFooter()}
          </aside>
        ) : null}

        <div
          className={
            activeTopLevelTab === dashboardTabs.calendar
              ? serviceOrderPanelStage === "operational"
                ? "main-workspace-surface main-workspace-surface-operational-edit"
                : serviceOrderPanelStage === "detail"
                  ? "main-workspace-surface main-workspace-surface-operational-detail"
                  : "main-workspace-surface main-workspace-surface-operational-idle"
              : "main-workspace-surface main-workspace-surface-two-column"
          }
        >
          {activeTopLevelTab === dashboardTabs.calendar ? (
          <section className="calendar-panel">
          <div className="calendar-panel-top">
          <div className="calendar-panel-header">
            <div className="calendar-panel-row calendar-panel-row-1">
              <div className="calendar-panel-row-left">
                <div className="calendar-panel-title-group">
                  <h2>
                    {activeAdminView === adminViewTabs.calendar
                      ? uiText.dashboard.calendarTitle
                      : uiText.serviceList.title}
                  </h2>
                </div>
              </div>
              <div className="calendar-panel-row-center">
                {activeAdminView === adminViewTabs.calendar && technicianLegendItems.length > 0 ? (
                  <div
                    className="calendar-legend calendar-legend-header calendar-legend-inline"
                    aria-label={uiText.dashboard.calendarLegendTitle}
                  >
                    <div className="calendar-legend-items control-group-body">
                      {technicianLegendItems.map((item) => {
                        const isActive = selectedCalendarTechnicianSet.has(item.technicianName);

                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={
                              isActive
                                ? "calendar-legend-item calendar-chip active"
                                : "calendar-legend-item calendar-chip"
                            }
                            aria-pressed={isActive}
                            onClick={() => toggleCalendarTechnicianFilter(item.technicianName)}
                            style={{ "--calendar-chip-accent": item.color.accent }}
                          >
                            <span
                              className="calendar-legend-dot"
                              style={{ backgroundColor: item.color.accent }}
                            />
                            <span>{item.displayName}</span>
                          </button>
                        );
                      })}
                    </div>

                    {hasActiveTechnicianFilter ? (
                      <button
                        type="button"
                        className="calendar-legend-clear"
                        onClick={() => setSelectedCalendarTechnicians([])}
                      >
                        Mostrar todos
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="calendar-panel-row-right">
                <div
                  className="admin-view-tabs segmented-control calendar-segmented-control"
                  role="tablist"
                  aria-label={uiText.serviceList.title}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAdminView === adminViewTabs.calendar}
                    className={
                      activeAdminView === adminViewTabs.calendar
                        ? "admin-view-tab segmented-control-option calendar-segmented-control-option segmented-control-option-active"
                        : "admin-view-tab segmented-control-option calendar-segmented-control-option"
                    }
                    onClick={() => setActiveAdminView(adminViewTabs.calendar)}
                  >
                    {uiText.serviceList.tabs.calendar}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAdminView === adminViewTabs.list}
                    className={
                      activeAdminView === adminViewTabs.list
                        ? "admin-view-tab segmented-control-option calendar-segmented-control-option segmented-control-option-active"
                        : "admin-view-tab segmented-control-option calendar-segmented-control-option"
                    }
                    onClick={() => setActiveAdminView(adminViewTabs.list)}
                  >
                    {uiText.serviceList.tabs.list}
                  </button>
                </div>
              </div>
            </div>

            {activeAdminView === adminViewTabs.list ? (
              <div className="calendar-panel-row calendar-panel-row-2">
                <div className="calendar-panel-row-left">
                  <p className="calendar-panel-subtitle">{uiText.serviceList.subtitle}</p>
                </div>
                <div className="calendar-panel-row-right" />
              </div>
            ) : null}

            {activeAdminView === adminViewTabs.calendar && showOnlyOverdue ? (
              <div className="calendar-filter-banner" role="status" aria-live="polite">
                <span>
                  Mostrando {pendingOrders.length} servicios pendientes de reagendar
                </span>
                <button
                  type="button"
                  className="calendar-filter-banner-action"
                  onClick={() => setShowOnlyOverdue(false)}
                >
                  Limpiar filtro
                </button>
              </div>
            ) : null}

            {activeAdminView === adminViewTabs.calendar && hasActiveTechnicianFilter ? (
              <div className="calendar-filter-banner calendar-filter-banner-technicians">
                <span>
                  Mostrando: {selectedCalendarTechnicians.length}{" "}
                  {selectedCalendarTechnicians.length === 1 ? "tecnico" : "tecnicos"}
                </span>
                <button
                  type="button"
                  className="calendar-filter-banner-action"
                  onClick={() => setSelectedCalendarTechnicians([])}
                >
                  Limpiar filtros
                </button>
              </div>
            ) : null}

          </div>

          {calendarActionError ? <p className="error">{calendarActionError}</p> : null}
          {calendarActionMessage ? (
            <p className="success-message">{calendarActionMessage}</p>
          ) : null}
          </div>

          <div className="calendar-panel-content">

          {calendarError ? (
            <div className="calendar-empty-state">
              <h3>{uiText.dashboard.calendarErrorTitle}</h3>
              <p>{calendarError}</p>
            </div>
          ) : null}

          {!calendarError && isServiceOrdersLoading && !hasExistingServiceOrderData ? (
            <div className="calendar-empty-state">
              <h3>{uiText.common.loadingDashboard}</h3>
            </div>
          ) : null}

          {activeAdminView === adminViewTabs.calendar &&
          shouldRenderCalendarContent &&
          !isServiceOrdersLoading &&
          hasActiveTechnicianFilter &&
          filteredCalendarEvents.length === 0 ? (
            <div className="calendar-empty-state">
              <h3>No hay servicios para los tecnicos seleccionados</h3>
              <p>Prueba con otros tecnicos o limpia los filtros para ver todos los servicios.</p>
              <button
                type="button"
                className="calendar-filter-banner-action calendar-empty-state-action"
                onClick={() => setSelectedCalendarTechnicians([])}
              >
                Limpiar filtros
              </button>
            </div>
          ) : null}

          {activeAdminView === adminViewTabs.calendar &&
          shouldRenderCalendarContent &&
          !isServiceOrdersLoading &&
          calendarView !== operationalCalendarView &&
          !hasActiveTechnicianFilter &&
          filteredCalendarEvents.length === 0 ? (
            <div className="calendar-empty-state">
              <h3>{uiText.dashboard.calendarEmptyTitle}</h3>
              <p>{uiText.dashboard.calendarEmptyBody}</p>
            </div>
          ) : null}

          {activeAdminView === adminViewTabs.calendar &&
          shouldRenderCalendarContent ? (
            <div
              className={
                calendarView === operationalCalendarView
                  ? "operational-calendar-layout"
                  : undefined
              }
            >
              <div
                className="calendar-shell"
                data-view-mode={viewMode}
                onMouseDownCapture={handleCalendarMouseDownCapture}
                onMouseUpCapture={handleCalendarMouseUpCapture}
              >
                <DragAndDropCalendar
                  localizer={localizer}
                  messages={uiText.calendar.messages}
                  culture="es"
                  events={filteredCalendarEvents}
                  defaultView={operationalCalendarView}
                  scrollToTime={calendarScrollToTime}
                  date={focusedDate}
                  onNavigate={handleCalendarNavigate}
                  view={calendarView}
                  onView={handleCalendarViewChange}
                  views={{
                    [operationalCalendarView]: OperationalCalendarView,
                    week: true,
                    month: true
                  }}
                selectable
                step={60}
                timeslots={1}
                dayLayoutAlgorithm={calendarView === "month" ? "overlap" : "no-overlap"}
                startAccessor="start"
                endAccessor="end"
                  onSelectEvent={handleSelectServiceOrder}
                  onSelectSlot={handleOpenQuickCreate}
                  onEventDrop={handleMoveServiceOrder}
                  onEventResize={handleResizeServiceOrder}
                  onDropFromOutside={
                    calendarView === operationalCalendarView
                      ? handleDropBacklogServiceOrder
                      : undefined
                  }
                  dragFromOutsideItem={() => {
                    const previewItem = buildExternalDragPreview(
                      draggedBacklogServiceOrderRef.current
                    );

                    debugLog("[Backlog DnD Debug] dragFromOutsideItem:", {
                      serviceOrderId: draggedBacklogServiceOrderRef.current?.id || null,
                      previewItem
                    });

                    return previewItem;
                  }}
                  draggableAccessor={(event) =>
                    event?.type !== "projected_appointment"
                  }
                  resizable={calendarView !== "month"}
                  resizableAccessor={(event) =>
                    event?.type !== "appointment" && event?.type !== "projected_appointment"
                  }
                  dayPropGetter={getCalendarDayStyle}
                  slotPropGetter={getCalendarSlotStyle}
                  eventPropGetter={getCalendarEventStyle}
                  style={{ height: 640 }}
                  components={{
                    toolbar: CalendarToolbar,
                    event: (eventProps) => (
                      <EventCard
                        {...eventProps}
                        view={calendarView}
                        onSelect={handleSelectServiceOrder}
                        isSelected={
                          eventProps.event?.type === "appointment"
                            ? eventProps.event?.appointmentId === selectedAppointment?.id
                            : eventProps.event?.id === selectedServiceOrderId
                        }
                        onComplete={handleQuickCompleteServiceOrder}
                      />
                    ),
                    eventWrapper: (wrapperProps) => (
                      <CalendarEventWrapper
                        {...wrapperProps}
                        onSelect={handleSelectServiceOrder}
                      />
                    )
                  }}
                />
              </div>
            </div>
          ) : null}

          {activeAdminView === adminViewTabs.list ? (
            <ServiceListView
              serviceOrders={filteredServiceOrders}
              selectedServiceOrderId={selectedServiceOrderId}
              isLoading={isServiceOrdersLoading}
              error={calendarError}
              onSelectServiceOrder={handleSelectServiceOrder}
              getClientDisplayName={getClientDisplayName}
              resolveEffectiveServiceLocation={resolveEffectiveServiceLocation}
              formatServiceDate={formatServiceDate}
            />
          ) : null}
          </div>
          </section>
          ) : null}

          {activeTopLevelTab === dashboardTabs.clients ? (
          <section className="calendar-panel admin-secondary-panel">
            <div className="calendar-panel-header">
              <div className="calendar-panel-row calendar-panel-row-1">
                <div className="calendar-panel-row-left">
                  <h2>{uiText.dashboard.clientsPanelTitle}</h2>
                </div>
                <div className="calendar-panel-row-right">
                  <div
                    className="admin-view-tabs segmented-control calendar-segmented-control"
                    role="tablist"
                    aria-label={uiText.clients.title}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={clientsModuleTab === clientsModuleTabs.summary}
                      className={
                        clientsModuleTab === clientsModuleTabs.summary
                          ? "admin-view-tab segmented-control-option calendar-segmented-control-option segmented-control-option-active"
                          : "admin-view-tab segmented-control-option calendar-segmented-control-option"
                      }
                      onClick={() => setClientsModuleTab(clientsModuleTabs.summary)}
                    >
                      {uiText.clients.moduleTabs.summary}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={clientsModuleTab === clientsModuleTabs.list}
                      className={
                        clientsModuleTab === clientsModuleTabs.list
                          ? "admin-view-tab segmented-control-option calendar-segmented-control-option segmented-control-option-active"
                          : "admin-view-tab segmented-control-option calendar-segmented-control-option"
                      }
                      onClick={() => setClientsModuleTab(clientsModuleTabs.list)}
                    >
                      {uiText.clients.moduleTabs.list}
                    </button>
                  </div>
                </div>
              </div>
              <div className="calendar-panel-row calendar-panel-row-2">
                <div className="calendar-panel-row-left">
                  <p className="calendar-panel-subtitle">{uiText.dashboard.clientsPanelBody}</p>
                </div>
              </div>
            </div>

            {clientsModuleTab === clientsModuleTabs.summary ? (
              <div className="clients-module-summary-body">
                <div className="clients-summary-header">
                  <div className="clients-summary-header-copy">
                    <h3>Resumen de clientes</h3>
                    <p>Vista general de cartera, sucursales y actividad operativa.</p>
                  </div>
                </div>

                <section className="clients-summary-section">
                  <div className="clients-summary-section-header">
                    <h4>Cartera y actividad principal</h4>
                  </div>
                  <div className="client-summary-kpis client-summary-kpis-primary">
                    <div className="detail-static-field">
                      <span>Total clientes</span>
                      <strong>{clientsModuleSummary.totalClients}</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Sucursales totales</span>
                      <strong>{clientsModuleSummary.totalBranches}</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Órdenes del mes</span>
                      <strong>{clientsModuleSummary.serviceOrdersThisMonth}</strong>
                    </div>
                    <div
                      className={
                        clientsModuleSummary.overdueOrders > 0
                          ? "detail-static-field detail-static-field-warning"
                          : "detail-static-field"
                      }
                    >
                      <span>Órdenes vencidas</span>
                      <strong>{clientsModuleSummary.overdueOrders}</strong>
                    </div>
                  </div>
                </section>

                <section className="clients-summary-section">
                  <div className="clients-summary-section-header">
                    <h4>Indicadores complementarios</h4>
                  </div>
                  <div className="client-summary-kpis client-summary-kpis-secondary">
                    <div className="detail-static-field">
                      <span>Clientes comerciales</span>
                      <strong>{clientsModuleSummary.commercialClients}</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Clientes residenciales</span>
                      <strong>{clientsModuleSummary.residentialClients}</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Citas activas del mes</span>
                      <strong>{clientsModuleSummary.activeAppointmentsThisMonth}</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Órdenes completadas</span>
                      <strong>{clientsModuleSummary.completedOrders}</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Órdenes pendientes</span>
                      <strong>{clientsModuleSummary.pendingOrders}</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Sucursales con actividad</span>
                      <strong>{clientsModuleSummary.branchesWithActivity}</strong>
                    </div>
                  </div>
                </section>

                <div className="workspace-grid clients-module-summary-grid">
                  <section className="drawer-section detail-section-card">
                    <div className="clients-summary-section-header">
                      <h4>Alertas operativas</h4>
                    </div>
                    <div className="clients-summary-operational-list">
                      <div className="clients-summary-operational-row">
                        <div className="clients-summary-operational-copy">
                          <strong>Clientes con órdenes vencidas</strong>
                          <span>Clientes que requieren atención inmediata.</span>
                        </div>
                        <strong className="clients-summary-operational-count">
                          {clientsModuleSummary.clientsWithOverdueOrders}
                        </strong>
                      </div>
                      <div className="clients-summary-operational-row">
                        <div className="clients-summary-operational-copy">
                          <strong>Clientes con actividad este mes</strong>
                          <span>Clientes con citas u órdenes dentro del mes actual.</span>
                        </div>
                        <strong className="clients-summary-operational-count">
                          {clientsModuleSummary.clientsWithActivityThisMonth}
                        </strong>
                      </div>
                      <div className="clients-summary-operational-row">
                        <div className="clients-summary-operational-copy">
                          <strong>Sucursales con actividad del mes</strong>
                          <span>Ubicaciones con trabajo planificado o ejecutado.</span>
                        </div>
                        <strong className="clients-summary-operational-count">
                          {clientsModuleSummary.branchesWithActivity}
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section className="drawer-section detail-section-card">
                    <div className="clients-summary-section-header">
                      <h4>Cómo leer este resumen</h4>
                    </div>
                    <p className="detail-subcopy">
                      Este resumen muestra la actividad global del módulo de clientes.
                      Usa Lista de clientes para abrir un cliente específico y revisar su
                      Resumen, Sucursales y Servicios / órdenes.
                    </p>
                    <div className="workspace-actions">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setClientsModuleTab(clientsModuleTabs.list)}
                      >
                        Ver lista de clientes
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="calendar-empty-state clients-empty-state">
                <h3>{uiText.clients.listTitle}</h3>
                <p>{uiText.clients.empty}</p>
              </div>
            ) : (
              <div className="clients-hierarchy">
                {activeClientHierarchyMessage ? (
                  <div className="clients-hierarchy-feedback">{activeClientHierarchyMessage}</div>
                ) : null}
                <div className="clients-hierarchy-header">
                  <span />
                  <span>{uiText.clients.headers.name}</span>
                  <span>{uiText.clients.headers.type}</span>
                  <span>{uiText.clients.headers.phone}</span>
                  <span>{uiText.clients.fields.mainEmail}</span>
                  <span>{uiText.clients.subTabs.branches}</span>
                  <span>{uiText.clients.headers.actions}</span>
                </div>

                <div className="clients-hierarchy-body">
                  {filteredClients.map((client) => {
                    const isExpanded = Boolean(expandedClientIds[client.id]);
                    const clientBranches = branchesByClientId[client.id] || [];
                    const branchCountLabel = branchesByClientId[client.id]
                      ? `${clientBranches.length}`
                      : "—";

                    return (
                      <div key={client.id} className="clients-hierarchy-group">
                        <div
                          className={
                            activeEntityType === "client" && activeEntityId === client.id
                              ? isExpanded
                                ? "clients-parent-row clients-parent-row-expanded workspace-table-row-selected"
                                : "clients-parent-row workspace-table-row-selected"
                              : isExpanded
                                ? "clients-parent-row clients-parent-row-expanded"
                                : "clients-parent-row"
                          }
                          onClick={() => handleOpenClientDrawerDetail(client)}
                        >
                          <button
                            type="button"
                            className="clients-disclosure"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleExpandedClient(client.id);
                            }}
                            aria-expanded={isExpanded}
                            aria-label={
                              isExpanded
                                ? `Ocultar sucursales de ${client.displayName}`
                                : `Mostrar sucursales de ${client.displayName}`
                            }
                          >
                            {isExpanded ? "▼" : "▶"}
                          </button>
                          <strong>{client.displayName}</strong>
                          <span>{getClientTypeLabel(client.client_type)}</span>
                          <span>{client.main_phone || "-"}</span>
                          <span>{client.main_email || "-"}</span>
                          <span>{branchCountLabel}</span>
                          <div className="clients-row-actions">
                            <button
                              type="button"
                              className="clients-row-action-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleClientHierarchyEdit(client);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="clients-row-action-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleClientHierarchyCreateBranch(client);
                              }}
                            >
                              + Sucursal
                            </button>
                          </div>
                        </div>

                        {isExpanded ? (
                          <div className="clients-child-rows">
                            {clientBranches.length === 0 ? (
                              <div className="clients-child-row clients-child-row-empty">
                                <span>└</span>
                                <span>{uiText.clients.branchesEmptyState}</span>
                              </div>
                            ) : (
                              clientBranches.map((branch) => (
                                <div key={branch.id} className="clients-child-row">
                                  <span>└</span>
                                  <strong>{branch.name}</strong>
                                  <span>{branch.address || "-"}</span>
                                  <span>{branch.phone || "-"}</span>
                                  <span>{branch.contact || "-"}</span>
                                  <div className="clients-row-actions">
                                    <button
                                      type="button"
                                      className="clients-row-action-button"
                                      onClick={() => handleClientHierarchyEditBranch(branch)}
                                    >
                                      Editar
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
          ) : null}

          {activeTopLevelTab === dashboardTabs.technicians ? (
          <section className="calendar-panel admin-secondary-panel">
            <div className="calendar-panel-header">
              <div className="calendar-panel-row calendar-panel-row-1">
                <div className="calendar-panel-row-left">
                  <h2>{uiText.dashboard.techniciansPanelTitle}</h2>
                </div>
              </div>
              <div className="calendar-panel-row calendar-panel-row-2">
                <div className="calendar-panel-row-left">
                  <p className="calendar-panel-subtitle">{uiText.dashboard.techniciansPanelBody}</p>
                </div>
              </div>
            </div>

            <div className="workspace-table-wrapper service-list-table-wrapper">
              <table className="workspace-table">
                <thead>
                  <tr>
                    <th>{uiText.technicians.headers.fullName}</th>
                    <th>{uiText.technicians.headers.phone}</th>
                    <th>{uiText.technicians.headers.status}</th>
                    <th>Carga hoy</th>
                    <th>{uiText.clients.headers.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTechnicians.map((technician) => {
                    const technicianWorkload =
                      technicianWorkloadByName.get(technician.full_name) || null;
                    const scheduledToday = technicianWorkload?.scheduledToday || 0;
                    const overdueAssigned = technicianWorkload?.overdueAssigned || 0;

                    return (
                      <tr
                        key={technician.id}
                        className={
                          technician.id === selectedTechnicianId && technicianDrawerMode
                            ? "workspace-table-row-action workspace-table-row-selected"
                            : "workspace-table-row-action"
                        }
                        onClick={() => handleOpenTechnicianDrawerDetail(technician)}
                      >
                        <td>{technician.full_name}</td>
                        <td>{technician.phone || "-"}</td>
                        <td>
                          {technician.is_active
                            ? uiText.technicians.active
                            : uiText.technicians.inactive}
                        </td>
                        <td>
                          <div className="technician-workload-cell">
                            <strong>{scheduledToday} servicios hoy</strong>
                            {overdueAssigned > 0 ? (
                              <span>{overdueAssigned} pendientes asignados</span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="clients-row-actions">
                            <button
                              type="button"
                              className="clients-row-action-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenTechnicianDrawerEdit(technician);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="clients-row-action-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleViewTechnicianInCalendar(technician);
                              }}
                            >
                              Ver en calendario
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          ) : null}

          {activeTopLevelTab === dashboardTabs.settings ? (
          <section className="calendar-panel admin-secondary-panel">
            <div className="calendar-panel-header">
              <div className="calendar-panel-row calendar-panel-row-1">
                <div className="calendar-panel-row-left">
                  <h2>{uiText.dashboard.settingsPanelTitle}</h2>
                </div>
              </div>
              <div className="calendar-panel-row calendar-panel-row-2">
                <div className="calendar-panel-row-left">
                  <p className="calendar-panel-subtitle">{uiText.dashboard.settingsPanelBody}</p>
                </div>
              </div>
            </div>

            <form className="workspace-form settings-company-panel" onSubmit={handleSaveCompanySettings}>
              <section className="drawer-section settings-company-section">
                <div className="entity-drawer-section-header">
                  <div>
                    <h4 className="drawer-section-title">{uiText.dashboard.settingsNav.company}</h4>
                    <p className="settings-company-help">
                      {uiText.dashboard.companySettingsHelp}
                    </p>
                  </div>
                </div>

                <div className="settings-company-brand-preview">
                  <img
                    src={activeCompanyLogoUrl}
                    alt={activeCompany?.name || "Biz2Rise"}
                    className="settings-company-logo-preview"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/logo.svg";
                    }}
                  />
                  <div className="settings-company-brand-copy">
                    <strong>{activeCompany?.name || uiText.common.appName}</strong>
                    <span>{activeCompany?.logo_url || "/logo.svg"}</span>
                  </div>
                </div>

                <div className="workspace-grid settings-company-grid">
                  <label className="workspace-input-group workspace-field-wide">
                    <span>{uiText.dashboard.companySettingsFields.name}</span>
                    <input
                      name="name"
                      type="text"
                      value={companySettingsForm.name}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                      required
                    />
                  </label>

                  <label className="workspace-input-group">
                    <span>{uiText.dashboard.companySettingsFields.businessName}</span>
                    <input
                      name="businessName"
                      type="text"
                      value={companySettingsForm.businessName}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                    />
                  </label>

                  <label className="workspace-input-group">
                    <span>{uiText.dashboard.companySettingsFields.taxId}</span>
                    <input
                      name="taxId"
                      type="text"
                      value={companySettingsForm.taxId}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                    />
                  </label>

                  <label className="workspace-input-group workspace-field-wide">
                    <span>{uiText.dashboard.companySettingsFields.logoUrl}</span>
                    <input
                      name="logoUrl"
                      type="url"
                      value={companySettingsForm.logoUrl}
                      onChange={handleCompanySettingsFormChange}
                      placeholder="https://..."
                      disabled={isSavingCompanySettings}
                    />
                  </label>
                </div>
              </section>

              <section className="drawer-section settings-company-section">
                <div className="entity-drawer-section-header">
                  <div>
                    <h4 className="drawer-section-title">Contacto</h4>
                  </div>
                </div>

                <div className="workspace-grid settings-company-grid settings-company-grid-two-column">
                  <label className="workspace-input-group">
                    <span>{uiText.dashboard.companySettingsFields.mainPhone}</span>
                    <input
                      name="mainPhone"
                      type="text"
                      value={companySettingsForm.mainPhone}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                    />
                  </label>

                  <label className="workspace-input-group">
                    <span>{uiText.dashboard.companySettingsFields.mainEmail}</span>
                    <input
                      name="mainEmail"
                      type="email"
                      value={companySettingsForm.mainEmail}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                    />
                  </label>

                  <label className="workspace-input-group workspace-field-wide">
                    <span>{uiText.dashboard.companySettingsFields.mainContact}</span>
                    <input
                      name="mainContact"
                      type="text"
                      value={companySettingsForm.mainContact}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                    />
                  </label>
                </div>
              </section>

              <section className="drawer-section settings-company-section">
                <div className="entity-drawer-section-header">
                  <div>
                    <h4 className="drawer-section-title">Direccion</h4>
                  </div>
                </div>

                <div className="workspace-grid settings-company-grid settings-company-grid-two-column">
                  <label className="workspace-input-group workspace-field-wide">
                    <span>{uiText.dashboard.companySettingsFields.addressLine1}</span>
                    <input
                      name="addressLine1"
                      type="text"
                      value={companySettingsForm.addressLine1}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                    />
                  </label>

                  <label className="workspace-input-group workspace-field-wide">
                    <span>{uiText.dashboard.companySettingsFields.addressLine2}</span>
                    <input
                      name="addressLine2"
                      type="text"
                      value={companySettingsForm.addressLine2}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                    />
                  </label>

                  <label className="workspace-input-group">
                    <span>{uiText.dashboard.companySettingsFields.city}</span>
                    <input
                      name="city"
                      type="text"
                      value={companySettingsForm.city}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                    />
                  </label>

                  <label className="workspace-input-group">
                    <span>{uiText.dashboard.companySettingsFields.state}</span>
                    <input
                      name="state"
                      type="text"
                      value={companySettingsForm.state}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                    />
                  </label>

                  <label className="workspace-input-group">
                    <span>{uiText.dashboard.companySettingsFields.postalCode}</span>
                    <input
                      name="postalCode"
                      type="text"
                      value={companySettingsForm.postalCode}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                    />
                  </label>

                  <label className="workspace-input-group">
                    <span>{uiText.dashboard.companySettingsFields.country}</span>
                    <input
                      name="country"
                      type="text"
                      value={companySettingsForm.country}
                      onChange={handleCompanySettingsFormChange}
                      disabled={isSavingCompanySettings}
                    />
                  </label>
                </div>
              </section>

              <div className="workspace-form-footer settings-company-footer">
                <div className="workspace-form-messages">
                  {companySettingsError ? <p className="error">{companySettingsError}</p> : null}
                  {companySettingsMessage ? (
                    <p className="success-message">{companySettingsMessage}</p>
                  ) : null}
                </div>

                <div className="workspace-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={handleResetCompanySettingsForm}
                    disabled={isSavingCompanySettings || !isCompanySettingsDirty}
                  >
                    {uiText.common.cancel}
                  </button>
                  <button
                    className={isSavingCompanySettings ? "button is-loading" : "button"}
                    type="submit"
                    disabled={isSavingCompanySettings || !isCompanySettingsDirty}
                  >
                    {isSavingCompanySettings
                      ? uiText.dashboard.companySettingsSaving
                      : uiText.dashboard.companySettingsSave}
                  </button>
                </div>
              </div>
            </form>
          </section>
          ) : null}

          {activeTopLevelTab === dashboardTabs.calendar ? (
          <aside
          className={
            serviceOrderPanelStage === "idle"
              ? "detail-sidebar detail-sidebar-idle"
              : isFocusedServiceOrderPanel
              ? "detail-sidebar detail-sidebar-create-mode"
              : "detail-sidebar"
          }
          aria-hidden={serviceOrderPanelStage === "idle"}
        >
          {serviceOrderPanelStage !== "idle" ? (
            <div
              className={
                isFocusedServiceOrderPanel
                  ? "detail-sidebar-header detail-sidebar-header-create"
                  : "detail-sidebar-header"
              }
            >
              <div className="detail-sidebar-header-copy">
                <span className="detail-sidebar-kicker">
                  {serviceOrderPanelKicker}
                </span>
                <h2>{serviceOrderPanelTitle}</h2>
                <p>{serviceOrderPanelSubtitle}</p>
                {isCreateServiceOrderMode && createServiceOrderContext ? (
                  <div className="detail-create-context" aria-live="polite">
                    <span className="detail-create-context-label">Horario seleccionado</span>
                    <strong>{createServiceOrderContext}</strong>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="entity-drawer-close"
                onClick={handleCloseServiceOrderPanel}
                aria-label="Cerrar panel"
              >
                ×
              </button>
              {selectedOrder ? (
                <div className="detail-action-bar">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={
                      selectedOrder.actual_start_at || selectedOrder.started_at
                        ? handleFinalizeSelectedServiceOrder
                        : handleStartSelectedServiceOrder
                    }
                    disabled={isSavingDetail || isDeletingServiceOrder}
                  >
                    {selectedOrder.actual_start_at || selectedOrder.started_at
                      ? "Finalizar servicio"
                      : "Iniciar servicio"}
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={handleStartReschedule}
                    disabled={isSavingDetail || isDeletingServiceOrder}
                  >
                    {uiText.dashboard.detailReschedule}
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => setRightPanelMode(rightPanelModes.edit)}
                    disabled={isSavingDetail || isDeletingServiceOrder}
                  >
                    Editar
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {serviceOrderPanelStage !== "idle" ? (
          <div className="detail-sidebar-body">
            {rightPanelMode === rightPanelModes.create ? (
              <WorkspacePanel
                activeTab={activeTab}
                clients={clients}
                clientsError={clientsError}
                isClientsLoading={isClientsLoading}
                clientForm={clientForm}
                selectedClientId={selectedClientId}
                selectedBranchClientId={selectedBranchClientId}
                clientSubTab={clientSubTab}
                clientFormError={clientFormError}
                clientFormMessage={clientFormMessage}
                isSavingClient={isSavingClient}
                branchForm={branchForm}
                branches={branches}
                selectedBranch={selectedBranch}
                selectedBranchId={selectedBranchId}
                branchesError={branchesError}
                branchFormError={branchFormError}
                branchFormMessage={branchFormMessage}
                isBranchesLoading={isBranchesLoading}
                isSavingBranch={isSavingBranch}
                activeTechnicians={activeTechnicians}
                technicians={technicians}
                techniciansError={techniciansError}
                isTechniciansLoading={isTechniciansLoading}
                supportsExtendedTechnicianFields={supportsExtendedTechnicianFields}
                technicianSubTab={technicianSubTab}
                selectedTechnicianId={selectedTechnicianId}
                technicianForm={technicianForm}
                technicianFormError={technicianFormError}
                technicianFormMessage={technicianFormMessage}
                isSavingTechnician={isSavingTechnician}
                serviceTimeOptions={serviceTimeOptions}
                serviceDurationOptions={serviceDurationOptions}
                formState={formState}
                selectedFormClient={selectedFormClient}
                isResidentialFormClient={isResidentialFormClient}
                preferredResidentialBranch={preferredResidentialBranch}
                availableBranches={availableBranches}
                formMessage={formMessage}
                formError={formError}
                isSavingOrder={isSavingOrder}
                onFormChange={handleFormChange}
                onSubmit={handleCreateServiceOrder}
                onClientFormChange={handleClientFormChange}
                onClientSubmit={handleCreateClient}
                onClientEdit={handleEditClient}
                onClientNew={handleNewClient}
                onClientSubTabChange={setClientSubTab}
                onSelectClientBranches={handleSelectClientBranches}
                onBranchEdit={handleBranchEdit}
                onBranchNew={handleNewBranch}
                onBranchFormChange={handleBranchFormChange}
                onBranchSubmit={handleCreateBranch}
                onTechnicianEdit={handleTechnicianEdit}
                onTechnicianNew={handleNewTechnician}
                onTechnicianSubTabChange={setTechnicianSubTab}
                onTechnicianFormChange={handleTechnicianFormChange}
                onTechnicianSubmit={handleCreateTechnician}
                isQuickCreate={isCreateServiceOrderMode}
                clientSelectRef={createServiceOrderClientSelectRef}
                onCancelOrder={handleCloseQuickCreate}
              />
            ) : selectedAppointment ? (
              <div className="detail-summary">
                <section className="drawer-section detail-section-card detail-identity-card">
                  <div className="detail-identity-copy">
                    <span className="detail-sidebar-kicker">Cita / Planeación</span>
                    <strong>{getClientDisplayName(selectedAppointment.clients)}</strong>
                    <p>
                      {selectedAppointmentLocation?.name || uiText.dashboard.branchEmpty}
                      {selectedAppointmentLocation?.address
                        ? ` · ${selectedAppointmentLocation.address}`
                        : ""}
                    </p>
                  </div>
                  <div className="detail-identity-meta">
                    <span className="detail-badge-neutral">Cita</span>
                    {isSelectedAppointmentRecurring ? (
                      <span className="detail-badge-recurrence">Recurrente</span>
                    ) : null}
                    {isSelectedAppointmentConverted ? (
                      <span className="detail-badge-converted">Convertida</span>
                    ) : null}
                    <span className="detail-status-badge">{selectedAppointmentStatusLabel}</span>
                  </div>
                  <div className="detail-identity-summary">
                    <p>
                      {formatServiceDate(selectedAppointment.appointment_date)} ·{" "}
                      {formatDisplayTime(selectedAppointment.appointment_time)} ·{" "}
                      {resolveDurationMinutes(selectedAppointment.duration_minutes)} min
                    </p>
                    <p>
                      {selectedAppointmentHasTechnician
                        ? `Técnico actual: ${getTechnicianDisplayName(
                            selectedAppointment.technician_name
                          )}`
                        : "Sin técnico asignado por ahora"}
                    </p>
                  </div>
                </section>

                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <div>
                      <h4 className="drawer-section-title">Planeación</h4>
                      <p className="detail-subcopy">
                        Esta cita representa una visita planeada. La asignación operativa
                        ocurre al convertirla en orden.
                      </p>
                    </div>
                  </div>

                  <div className="detail-section-grid detail-section-grid-2">
                    <div className="detail-static-field">
                      <span>Fecha</span>
                      <strong>{formatServiceDate(selectedAppointment.appointment_date)}</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Hora</span>
                      <strong>{formatDisplayTime(selectedAppointment.appointment_time)}</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Duración</span>
                      <strong>{resolveDurationMinutes(selectedAppointment.duration_minutes)} min</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Cliente</span>
                      <strong>{getClientDisplayName(selectedAppointment.clients)}</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Sucursal / ubicación</span>
                      <strong>
                        {selectedAppointmentLocation?.name || uiText.dashboard.branchEmpty}
                      </strong>
                      <p className="detail-subcopy">
                        {getServiceLocationSummary(selectedAppointment)}
                      </p>
                    </div>
                    <div className="detail-static-field">
                      <span>Técnico</span>
                      <strong>
                        {selectedAppointmentHasTechnician
                          ? getTechnicianDisplayName(selectedAppointment.technician_name)
                          : "Sin técnico asignado"}
                      </strong>
                      <p className="detail-subcopy">
                        {selectedAppointmentHasTechnician
                          ? "La asignación actual es informativa y puede cambiar al convertir."
                          : "La cita puede planearse sin técnico. La asignación se define al convertir."}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <div>
                      <h4 className="drawer-section-title">Recurrencia</h4>
                      <p className="detail-subcopy">
                        {isSelectedAppointmentRecurring
                          ? "Esta cita pertenece a una serie recurrente."
                          : "Esta cita se gestiona como una visita única."}
                      </p>
                    </div>
                  </div>

                  <div className="detail-section-grid detail-section-grid-2">
                    <div className="detail-static-field">
                      <span>Estado de recurrencia</span>
                      <strong>{selectedAppointmentRecurrenceLabel}</strong>
                    </div>
                    <div className="detail-static-field">
                      <span>Tipo de ocurrencia</span>
                      <strong>
                        {isSelectedAppointmentRecurring
                          ? "Ocurrencia real de una serie"
                          : "Cita única"}
                      </strong>
                    </div>
                  </div>

                  <p className="detail-section-empty-copy">
                    {selectedAppointmentRecurrenceDescription}
                  </p>
                </section>

                {selectedAppointment.notes ? (
                  <section className="drawer-section detail-section-card">
                    <div className="entity-drawer-section-header">
                      <h4 className="drawer-section-title">Notas de planeación</h4>
                    </div>

                    <div className="detail-section-grid">
                      <div className="detail-row detail-row-notes">
                        <strong>{selectedAppointment.notes}</strong>
                      </div>
                    </div>
                  </section>
                ) : null}

                {isSelectedAppointmentConverted ? (
                  <section className="drawer-section detail-section-card">
                    <div className="entity-drawer-section-header">
                      <div>
                        <h4 className="drawer-section-title">Trazabilidad</h4>
                        <p className="detail-subcopy">
                          Esta cita ya fue convertida en orden de servicio y ya no forma
                          parte de la planeación activa.
                        </p>
                      </div>
                    </div>

                    <div className="detail-traceability-box">
                      <strong>Esta cita ya fue convertida en orden de servicio.</strong>
                      <p>
                        Conservamos esta cita para referencia histórica y seguimiento de la
                        conversión.
                      </p>
                    </div>

                    <div className="entity-drawer-section-header">
                      <h4 className="drawer-section-title">Orden vinculada</h4>
                    </div>

                    <div className="detail-section-grid">
                      <div className="detail-row">
                        <span>ID de orden</span>
                        <strong>{selectedAppointment.service_order_id || "Pendiente de sincronizar"}</strong>
                      </div>
                      {selectedAppointmentLinkedServiceOrder ? (
                        <div className="detail-row">
                          <span>Programacion</span>
                          <strong>
                            {formatServiceDate(selectedAppointmentLinkedServiceOrder.service_date)} ·{" "}
                            {formatDisplayTime(selectedAppointmentLinkedServiceOrder.service_time)}
                          </strong>
                        </div>
                      ) : null}
                    </div>

                    {selectedAppointment.service_order_id ? (
                      <div className="detail-delete-actions">
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={handleOpenLinkedServiceOrder}
                        >
                          Abrir orden de servicio
                        </button>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {!isSelectedAppointmentConverted ? (
                  <section className="drawer-section detail-section-card">
                    <div className="entity-drawer-section-header">
                      <div>
                        <h4 className="drawer-section-title">Convertir en orden de servicio</h4>
                        <p className="detail-subcopy">
                          Convierte esta cita cuando ya quieras asignar técnico y ejecutar el trabajo.
                        </p>
                      </div>
                    </div>

                    {isPreparingAppointmentConversion ? (
                      <div className="detail-edit-grid detail-edit-grid-2">
                        <label className="workspace-input-group">
                          <span>Técnico requerido para la orden</span>
                          <select
                            name="technicianName"
                            value={appointmentConversionForm.technicianName}
                            onChange={handleAppointmentConversionFormChange}
                            disabled={isConfirmingAppointment || isTechniciansLoading}
                            required
                          >
                            <option value="">
                              {isTechniciansLoading
                                ? uiText.serviceOrder.placeholders.technicianLoading
                                : uiText.serviceOrder.placeholders.technician}
                            </option>
                            {activeTechnicians.map((technician) => (
                              <option key={technician.id} value={technician.full_name}>
                                {technician.full_name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="workspace-input-group">
                          <span>Fecha planificada</span>
                          <input
                            name="serviceDate"
                            type="date"
                            value={appointmentConversionForm.serviceDate}
                            onChange={handleAppointmentConversionFormChange}
                            disabled={isConfirmingAppointment}
                            required
                          />
                        </label>

                        <label className="workspace-input-group">
                          <span>Hora planificada</span>
                          <select
                            name="serviceTime"
                            value={appointmentConversionForm.serviceTime}
                            onChange={handleAppointmentConversionFormChange}
                            disabled={isConfirmingAppointment}
                            required
                          >
                            {serviceTimeOptions.map((timeOption) => (
                              <option key={timeOption.value} value={timeOption.value}>
                                {timeOption.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="workspace-input-group">
                          <span>Duración planificada</span>
                          <select
                            name="durationMinutes"
                            value={appointmentConversionForm.durationMinutes}
                            onChange={handleAppointmentConversionFormChange}
                            disabled={isConfirmingAppointment}
                            required
                          >
                            {durationOptions.map((durationOption) => (
                              <option key={durationOption} value={durationOption}>
                                {durationOption} min
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="workspace-input-group workspace-field-wide">
                          <span>Instrucciones de servicio</span>
                          <textarea
                            name="serviceInstructions"
                            value={appointmentConversionForm.serviceInstructions}
                            onChange={handleAppointmentConversionFormChange}
                            placeholder={uiText.serviceOrder.placeholders.serviceInstructions}
                            disabled={isConfirmingAppointment}
                            rows={4}
                          />
                        </label>

                        <div className="detail-delete-actions workspace-field-wide">
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => setIsPreparingAppointmentConversion(false)}
                            disabled={isConfirmingAppointment}
                          >
                            Cancelar
                          </button>
                          <button
                            className={isConfirmingAppointment ? "button is-loading" : "button"}
                            type="button"
                            onClick={handleConfirmAppointment}
                            disabled={
                              isConfirmingAppointment ||
                              isDeletingAppointment ||
                              !appointmentConversionForm.technicianName.trim() ||
                              !appointmentConversionForm.serviceDate ||
                              !appointmentConversionForm.serviceTime ||
                              !appointmentConversionForm.durationMinutes
                            }
                          >
                            {isConfirmingAppointment
                              ? "Creando..."
                              : "Crear orden de servicio"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="detail-delete-actions">
                        <button
                          className="button"
                          type="button"
                          onClick={() => {
                            setDetailFormError("");
                            setDetailFormMessage("");
                            setIsPreparingAppointmentConversion(true);
                          }}
                          disabled={isDeletingAppointment}
                        >
                          Confirmar y crear orden de servicio
                        </button>
                      </div>
                    )}
                  </section>
                ) : null}

                <div className="workspace-form-messages">
                  {detailFormError ? <p className="error">{detailFormError}</p> : null}
                  {detailFormMessage ? <p className="success-message">{detailFormMessage}</p> : null}
                </div>

                {isChoosingRecurringAppointmentDelete ? (
                  <div className="detail-delete-confirmation">
                    <p>
                      Esta cita pertenece a una recurrencia. ¿Que deseas eliminar?
                    </p>
                    <div className="detail-delete-actions">
                      <button
                        className={
                          isDeletingAppointment ? "button button-secondary is-loading" : "button button-secondary"
                        }
                        type="button"
                        onClick={handleDeleteAppointmentOccurrence}
                        disabled={isDeletingAppointment || isConfirmingAppointment}
                      >
                        {isDeletingAppointment ? "Eliminando..." : "Solo esta cita"}
                      </button>
                      <button
                        className={
                          isDeletingAppointment ? "button is-loading" : "button"
                        }
                        type="button"
                        onClick={handleDeleteAppointmentSeries}
                        disabled={isDeletingAppointment || isConfirmingAppointment}
                      >
                        {isDeletingAppointment ? "Eliminando..." : "Toda la serie"}
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => setIsChoosingRecurringAppointmentDelete(false)}
                        disabled={isDeletingAppointment}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="detail-panel-footer detail-panel-footer-detail">
                  {!isSelectedAppointmentConverted ? (
                    <div className="detail-footer-secondary">
                      <p className="detail-section-empty-copy">
                        Usa la eliminación solo si esta planeación ya no debe mantenerse
                        visible.
                      </p>
                      <button
                        className={
                          isDeletingAppointment
                            ? "button button-secondary is-loading"
                            : "button button-secondary"
                        }
                        type="button"
                        onClick={handleDeleteAppointment}
                        disabled={
                          isConfirmingAppointment ||
                          isDeletingAppointment ||
                          isChoosingRecurringAppointmentDelete
                        }
                      >
                        {isDeletingAppointment ? "Eliminando..." : "Eliminar cita"}
                      </button>
                    </div>
                  ) : (
                    <p className="detail-section-empty-copy">
                      La eliminación está bloqueada porque esta cita ya tiene una orden vinculada.
                    </p>
                  )}
                </div>
              </div>
            ) : !selectedOrder ? (
              <div className="detail-empty-state">
                <p>Selecciona una cita u orden del calendario</p>
              </div>
            ) : rightPanelMode === rightPanelModes.edit ? (
              <form className="detail-panel" onSubmit={handleUpdateServiceOrder}>
                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <h4 className="drawer-section-title">Asignacion y agenda</h4>
                  </div>

                  <div className="detail-edit-grid detail-edit-grid-2">
                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.fields.client}</span>
                      <select
                        name="clientId"
                        value={detailFormState.clientId}
                        onChange={handleDetailFormChange}
                        disabled={isSavingDetail || isClientsLoading}
                        required
                      >
                        <option value="">
                          {isClientsLoading
                            ? uiText.serviceOrder.placeholders.clientLoading
                            : uiText.serviceOrder.placeholders.client}
                        </option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.displayName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="service-order-location-type workspace-field-wide">
                      <span>{uiText.serviceOrder.fields.locationType}</span>
                      <div className="service-order-location-options">
                        <label className="service-order-location-option">
                          <input
                            name="locationType"
                            type="radio"
                            value="saved"
                            checked={!detailFormState.isOneOffLocation}
                            onChange={handleDetailFormChange}
                            disabled={isSavingDetail}
                          />
                          <span>{uiText.serviceOrder.fields.savedLocation}</span>
                        </label>
                        <label className="service-order-location-option">
                          <input
                            name="locationType"
                            type="radio"
                            value="one_off"
                            checked={detailFormState.isOneOffLocation}
                            onChange={handleDetailFormChange}
                            disabled={isSavingDetail}
                          />
                          <span>{uiText.serviceOrder.fields.oneOffLocation}</span>
                        </label>
                      </div>
                    </div>

                    {!detailFormState.isOneOffLocation && isResidentialDetailClient ? (
                      <div className="detail-static-field">
                        <span>{uiText.serviceOrder.fields.branch}</span>
                        <strong>
                          {preferredDetailResidentialBranch
                            ? getBranchDisplayName(preferredDetailResidentialBranch)
                          : uiText.dashboard.branchEmpty}
                        </strong>
                      </div>
                    ) : !detailFormState.isOneOffLocation ? (
                      <label className="workspace-input-group">
                        <span>{uiText.serviceOrder.fields.branch}</span>
                        <select
                          name="branchId"
                          value={detailFormState.branchId}
                          onChange={handleDetailFormChange}
                          disabled={
                            isSavingDetail || isBranchesLoading || !detailFormState.clientId
                          }
                          required={!detailFormState.isOneOffLocation}
                        >
                          <option value="">
                            {isBranchesLoading
                              ? uiText.serviceOrder.placeholders.branchLoading
                              : uiText.serviceOrder.placeholders.branch}
                          </option>
                          {detailAvailableBranches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {getBranchDisplayName(branch)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <label className="workspace-input-group">
                      <span>{uiText.dashboard.detailFields.technicianName}</span>
                      <select
                        name="technicianName"
                        value={detailFormState.technicianName}
                        onChange={handleDetailFormChange}
                        disabled={isSavingDetail || isTechniciansLoading}
                        required
                      >
                        <option value="">
                          {isTechniciansLoading
                            ? uiText.serviceOrder.placeholders.technicianLoading
                            : uiText.serviceOrder.placeholders.technician}
                        </option>
                        {activeTechnicians.map((technician) => (
                          <option key={technician.id} value={technician.full_name}>
                            {technician.full_name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="workspace-input-group detail-status-field">
                      <span>{uiText.serviceOrder.fields.status}</span>
                      <SegmentedControl
                        name="status"
                        value={detailFormState.status}
                        onChange={handleDetailFormChange}
                        options={serviceOrderStatusOptions}
                        disabled={isSavingDetail}
                        className="segmented-control-compact"
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.dashboard.detailFields.serviceDate}</span>
                      <input
                        ref={detailDateInputRef}
                        name="serviceDate"
                        type="date"
                        value={detailFormState.serviceDate}
                        onChange={handleDetailFormChange}
                        disabled={isSavingDetail}
                        required
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.dashboard.detailFields.serviceTime}</span>
                      <select
                        name="serviceTime"
                        value={detailFormState.serviceTime}
                        onChange={handleDetailFormChange}
                        disabled={isSavingDetail}
                        required
                      >
                        {serviceTimeOptions.map((timeOption) => (
                          <option key={timeOption.value} value={timeOption.value}>
                            {timeOption.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.fields.duration}</span>
                      <select
                        name="durationMinutes"
                        value={detailFormState.durationMinutes}
                        onChange={handleDetailFormChange}
                        disabled={isSavingDetail}
                        required
                      >
                        {durationOptions.map((durationOption) => (
                          <option key={durationOption} value={durationOption}>
                            {durationOption} min
                          </option>
                        ))}
                      </select>
                    </label>

                    {detailFormState.isOneOffLocation ? (
                      <>
                        <label className="workspace-input-group">
                          <span>{uiText.serviceOrder.fields.oneOffLocationName}</span>
                          <input
                            name="serviceLocationName"
                            type="text"
                            value={detailFormState.serviceLocationName}
                            onChange={handleDetailFormChange}
                            placeholder={uiText.serviceOrder.placeholders.oneOffLocationName}
                            disabled={isSavingDetail}
                          />
                        </label>

                        <label className="workspace-input-group workspace-field-wide">
                          <span>{uiText.serviceOrder.fields.oneOffLocationAddress}</span>
                          <textarea
                            name="serviceLocationAddress"
                            value={detailFormState.serviceLocationAddress}
                            onChange={handleDetailFormChange}
                            placeholder={uiText.serviceOrder.placeholders.oneOffLocationAddress}
                            disabled={isSavingDetail}
                            rows={3}
                          />
                        </label>

                        <label className="workspace-input-group">
                          <span>{uiText.serviceOrder.fields.oneOffLocationPhone}</span>
                          <input
                            name="serviceLocationPhone"
                            type="text"
                            value={detailFormState.serviceLocationPhone}
                            onChange={handleDetailFormChange}
                            placeholder={uiText.serviceOrder.placeholders.oneOffLocationPhone}
                            disabled={isSavingDetail}
                          />
                        </label>

                        <label className="workspace-input-group">
                          <span>{uiText.serviceOrder.fields.oneOffLocationContact}</span>
                          <input
                            name="serviceLocationContact"
                            type="text"
                            value={detailFormState.serviceLocationContact}
                            onChange={handleDetailFormChange}
                            placeholder={uiText.serviceOrder.placeholders.oneOffLocationContact}
                            disabled={isSavingDetail}
                          />
                        </label>

                        <p className="detail-subcopy workspace-field-wide">
                          {uiText.serviceOrder.oneOffLocationHint}
                        </p>
                      </>
                    ) : null}

                    {isSelectedServiceOrderOverdue ? (
                      <div className="detail-overdue-box detail-overdue-box-inline service-order-inline-alert">
                        <div>
                          <strong>{uiText.dashboard.overdueLabel}</strong>
                          <p>{uiText.dashboard.detailOverdueBody}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <h4 className="drawer-section-title">Ejecucion</h4>
                  </div>

                  <div className="detail-edit-grid">
                    <label className="workspace-input-group workspace-field-wide">
                      <span>{uiText.serviceOrder.fields.serviceInstructions}</span>
                      <textarea
                        name="serviceInstructions"
                        value={detailFormState.serviceInstructions}
                        onChange={handleDetailFormChange}
                        placeholder={uiText.serviceOrder.placeholders.serviceInstructions}
                        disabled={isSavingDetail}
                        rows={4}
                      />
                    </label>

                    <label className="workspace-input-group workspace-field-wide">
                      <span>{uiText.serviceOrder.fields.serviceReport}</span>
                      <textarea
                        name="serviceReport"
                        value={detailFormState.serviceReport}
                        onChange={handleDetailFormChange}
                        placeholder={uiText.serviceOrder.placeholders.serviceReport}
                        disabled={isSavingDetail}
                        rows={5}
                      />
                      <small className="detail-subcopy">
                        Describe brevemente lo que se hizo, observaciones o hallazgos relevantes.
                      </small>
                    </label>

                    {selectedOrder.completed_at ? (
                      <div className="service-order-inline-row workspace-field-wide">
                        <div className="service-order-inline-meta">
                          <strong>Servicio completado</strong>
                          <small className="detail-subcopy">
                            {formatCompletedAt(selectedOrder.completed_at)}
                          </small>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <h4 className="drawer-section-title">Recurrencia</h4>
                  </div>

                  <div className="detail-edit-grid">
                    <div className="service-order-inline-row workspace-field-wide">
                      <label className="workspace-checkbox workspace-checkbox-compact service-order-inline-checkbox">
                        <input
                          name="isRecurring"
                          type="checkbox"
                          checked={detailFormState.isRecurring}
                          onChange={handleDetailFormChange}
                          disabled={isSavingDetail}
                        />
                        <span>{uiText.serviceOrder.fields.isRecurring}</span>
                      </label>
                      <div className="service-order-inline-meta">
                        <strong>
                          {detailFormState.isRecurring
                            ? uiText.serviceOrder.recurrenceOptions[detailFormState.recurrenceType] ||
                              uiText.serviceOrder.fields.isRecurring
                            : "Visita unica"}
                        </strong>
                        <small className="detail-subcopy">
                          {detailFormState.isRecurring
                            ? "Ajusta la configuracion recurrente si aplica. Las visitas futuras aun no se crean automaticamente."
                            : "Activalo solo si la visita debe repetirse. Por ahora no genera visitas futuras automaticamente."}
                        </small>
                      </div>
                    </div>

                    {detailFormState.isRecurring ? (
                      <div className="detail-edit-grid detail-edit-grid-2">
                        <label className="workspace-input-group">
                          <span>{uiText.serviceOrder.fields.recurrenceType}</span>
                          <select
                            name="recurrenceType"
                            value={detailFormState.recurrenceType}
                            onChange={handleDetailFormChange}
                            disabled={isSavingDetail}
                            required
                          >
                            <option value="" disabled>
                              {uiText.serviceOrder.placeholders.recurrenceType}
                            </option>
                            <option value="daily">
                              {uiText.serviceOrder.recurrenceOptions.daily}
                            </option>
                            <option value="weekly">
                              {uiText.serviceOrder.recurrenceOptions.weekly}
                            </option>
                            <option value="biweekly">
                              {uiText.serviceOrder.recurrenceOptions.biweekly}
                            </option>
                            <option value="monthly">
                              {uiText.serviceOrder.recurrenceOptions.monthly}
                            </option>
                          </select>
                        </label>

                        <label className="workspace-input-group">
                          <span>{uiText.serviceOrder.fields.recurrenceEndDate}</span>
                          <input
                            name="recurrenceEndDate"
                            type="date"
                            value={detailFormState.recurrenceEndDate}
                            onChange={handleDetailFormChange}
                            disabled={isSavingDetail}
                          />
                        </label>
                      </div>
                    ) : (
                      <p className="detail-section-empty-copy">
                        Este servicio no tiene una configuracion recurrente activa.
                      </p>
                    )}
                  </div>
                </section>

                <div className="workspace-form-messages">
                  {detailFormError ? <p className="error">{detailFormError}</p> : null}
                  {detailFormMessage ? <p className="success-message">{detailFormMessage}</p> : null}
                </div>

                <div className="workspace-form-footer detail-panel-footer detail-panel-footer-edit">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setRightPanelMode(rightPanelModes.detail)}
                    disabled={isSavingDetail}
                  >
                    Cancelar
                  </button>
                  <button
                    className={isSavingDetail ? "button is-loading" : "button"}
                    type="submit"
                    disabled={
                      isSavingDetail ||
                      isTechniciansLoading ||
                      (!detailFormState.isOneOffLocation &&
                        !isResidentialDetailClient &&
                        !detailFormState.branchId &&
                        detailAvailableBranches.length > 0) ||
                      (!detailFormState.isOneOffLocation &&
                        isResidentialDetailClient &&
                        !preferredDetailResidentialBranch) ||
                      (detailFormState.isOneOffLocation &&
                        !detailFormState.serviceLocationAddress.trim()) ||
                      activeTechnicians.length === 0 ||
                      !detailFormState.technicianName
                    }
                  >
                    {isSavingDetail
                      ? uiText.dashboard.detailSaving
                      : uiText.dashboard.detailSave}
                  </button>
                </div>
              </form>
            ) : (
              <div className="detail-summary">
                <section className="drawer-section detail-section-card detail-identity-card">
                  <div className="detail-identity-copy">
                    <span className="detail-sidebar-kicker">Orden de servicio</span>
                    <strong>{getClientDisplayName(selectedOrder.clients)}</strong>
                    <p>{selectedServiceLocation?.name || uiText.dashboard.branchEmpty}</p>
                  </div>
                  <div className="detail-identity-meta">
                    <span>{getStatusLabel(selectedOrder.status)}</span>
                    <span>{getExecutionStatusLabel(getExecutionStatusValue(selectedOrder))}</span>
                    {isSelectedServiceOrderOverdue ? (
                      <span className="detail-status-badge">{uiText.dashboard.overdueLabel}</span>
                    ) : null}
                  </div>
                </section>

                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <h4 className="drawer-section-title">Resumen</h4>
                  </div>

                  <div className="detail-section-grid">
                    <div className="detail-row">
                      <span>{uiText.dashboard.detailFields.clientName}</span>
                      <strong>{getClientDisplayName(selectedOrder.clients)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{uiText.dashboard.detailFields.branchName}</span>
                      <strong>{selectedServiceLocation?.name || uiText.dashboard.branchEmpty}</strong>
                      <p className="detail-subcopy">{getServiceLocationSummary(selectedOrder)}</p>
                      <small className="detail-subcopy">
                        {selectedServiceLocation?.isOneOff
                          ? "Ubicacion unica de esta visita"
                          : "Ubicacion guardada"}
                      </small>
                    </div>
                    <div className="detail-row">
                      <span>{uiText.dashboard.detailFields.createdAt}</span>
                      <strong>{formatCreatedAt(selectedOrder.created_at)}</strong>
                    </div>
                  </div>
                </section>

                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <h4 className="drawer-section-title">Planeación</h4>
                  </div>

                  <div className="detail-section-grid detail-section-grid-2">
                    <div className="detail-row">
                      <span>Fecha programada</span>
                      <strong>{formatServiceDate(selectedOrder.service_date)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Hora programada</span>
                      <strong>{formatDisplayTime(selectedOrder.service_time)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Duración</span>
                      <strong>{resolveDurationMinutes(selectedOrder.duration_minutes)} min</strong>
                    </div>
                    <div className="detail-row">
                      <span>Técnico asignado</span>
                      <strong>{getTechnicianDisplayName(selectedOrder.technician_name)}</strong>
                    </div>
                  </div>
                  <div className="detail-section-grid">
                    <div className="detail-row detail-row-notes">
                      <span>Instrucciones del servicio</span>
                      <strong>
                        {selectedOrder.service_instructions || "Sin instrucciones registradas."}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <h4 className="drawer-section-title">Reporte del servicio</h4>
                  </div>

                  <div className="detail-edit-grid">
                    <label className="workspace-input-group workspace-field-wide">
                      <span>Qué se hizo</span>
                      <textarea
                        name="serviceSummary"
                        value={detailFormState.serviceSummary}
                        onChange={handleDetailFormChange}
                        placeholder="Describe brevemente qué se hizo durante el servicio"
                        disabled={isSavingDetail}
                        rows={3}
                      />
                    </label>

                    <label className="workspace-input-group workspace-field-wide">
                      <span>Hallazgos</span>
                      <textarea
                        name="findings"
                        value={detailFormState.findings}
                        onChange={handleDetailFormChange}
                        placeholder="Anota hallazgos u observaciones relevantes"
                        disabled={isSavingDetail}
                        rows={3}
                      />
                    </label>

                    <label className="workspace-input-group workspace-field-wide">
                      <span>Recomendaciones</span>
                      <textarea
                        name="recommendations"
                        value={detailFormState.recommendations}
                        onChange={handleDetailFormChange}
                        placeholder="Agrega recomendaciones de seguimiento si aplica"
                        disabled={isSavingDetail}
                        rows={3}
                      />
                    </label>

                    <label className="workspace-input-group workspace-field-wide">
                      <span>Productos utilizados</span>
                      <textarea
                        name="materialsUsed"
                        value={detailFormState.materialsUsed}
                        onChange={handleDetailFormChange}
                        placeholder="Lista materiales o productos utilizados"
                        disabled={isSavingDetail}
                        rows={3}
                      />
                    </label>

                    <label className="workspace-input-group workspace-field-wide">
                      <span>Notas adicionales</span>
                      <textarea
                        name="completionNotes"
                        value={detailFormState.completionNotes}
                        onChange={handleDetailFormChange}
                        placeholder="Agrega notas breves sobre el cierre del servicio"
                        disabled={isSavingDetail}
                        rows={3}
                      />
                    </label>
                  </div>

                  {selectedOrder.status === "completed" &&
                  (selectedOrder.service_summary ||
                    selectedOrder.findings ||
                    selectedOrder.recommendations ||
                    selectedOrder.materials_used ||
                    selectedOrder.completion_notes ||
                    selectedOrder.service_report) ? (
                    <div className="detail-section-grid detail-report-readback">
                      {selectedOrder.completed_at ? (
                        <div className="detail-row">
                          <span>Completado el</span>
                          <strong>{formatCompletedAt(selectedOrder.completed_at)}</strong>
                        </div>
                      ) : null}

                      <div className="detail-row detail-row-notes">
                        <span>Qué se hizo</span>
                        <strong>{selectedOrder.service_summary || "Sin información registrada."}</strong>
                      </div>
                      <div className="detail-row detail-row-notes">
                        <span>Hallazgos</span>
                        <strong>{selectedOrder.findings || "Sin hallazgos registrados."}</strong>
                      </div>
                      <div className="detail-row detail-row-notes">
                        <span>Recomendaciones</span>
                        <strong>{selectedOrder.recommendations || "Sin recomendaciones registradas."}</strong>
                      </div>
                      <div className="detail-row detail-row-notes">
                        <span>Productos utilizados</span>
                        <strong>{selectedOrder.materials_used || "Sin productos registrados."}</strong>
                      </div>
                      <div className="detail-row detail-row-notes">
                        <span>Notas adicionales</span>
                        <strong>
                          {selectedOrder.completion_notes ||
                            selectedOrder.service_report ||
                            "Sin notas adicionales."}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="detail-subcopy">
                      Completa este reporte durante o al finalizar el servicio para dejar trazabilidad clara del trabajo realizado.
                    </p>
                  )}
                </section>

                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <h4 className="drawer-section-title">Ejecución real</h4>
                  </div>

                  <div className="detail-execution-summary">
                    {!selectedOrder.actual_start_at && !selectedOrder.started_at ? (
                      <p className="detail-subcopy">El servicio aún no tiene inicio real.</p>
                    ) : !(selectedOrder.actual_end_at || selectedOrder.completed_at) ? (
                      <p className="detail-subcopy">Servicio en ejecución.</p>
                    ) : (
                      <p className="detail-subcopy">Servicio finalizado.</p>
                    )}
                  </div>

                  <div className="detail-section-grid detail-section-grid-2">
                    <div className="detail-row">
                      <span>Inicio real</span>
                      <strong>
                        {selectedOrder.actual_start_at || selectedOrder.started_at
                          ? formatCompletedAt(
                              selectedOrder.actual_start_at || selectedOrder.started_at
                            )
                          : "Sin registrar"}
                      </strong>
                    </div>
                    <div className="detail-row">
                      <span>Fin real</span>
                      <strong>
                        {selectedOrder.actual_end_at || selectedOrder.completed_at
                          ? formatCompletedAt(
                              selectedOrder.actual_end_at || selectedOrder.completed_at
                            )
                          : "Sin registrar"}
                      </strong>
                    </div>
                    <div className="detail-row">
                      <span>Completado por</span>
                      <strong>{selectedOrder.completed_by || "Sin registrar"}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Estado de ejecución</span>
                      <strong>
                        {getExecutionStatusLabel(getExecutionStatusValue(selectedOrder))}
                      </strong>
                    </div>
                    <div className="detail-row detail-row-notes">
                      <span>Notas de cierre</span>
                      <strong>{selectedOrder.completion_notes || "Sin registrar"}</strong>
                    </div>
                  </div>

                  <div className="detail-edit-grid">
                    <label className="workspace-input-group">
                      <span>Inicio real</span>
                      <input
                        name="actualStartAt"
                        type="datetime-local"
                        value={detailFormState.actualStartAt}
                        onChange={handleDetailFormChange}
                        disabled={isSavingDetail}
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>Fin real</span>
                      <input
                        name="actualEndAt"
                        type="datetime-local"
                        value={detailFormState.actualEndAt}
                        onChange={handleDetailFormChange}
                        disabled={isSavingDetail}
                      />
                    </label>

                    {!detailFormState.actualStartAt &&
                    !(selectedOrder.actual_start_at || selectedOrder.started_at) ? (
                      <p className="detail-subcopy workspace-field-wide">
                        Si finalizas sin inicio, se guardará automáticamente usando la hora de fin.
                      </p>
                    ) : null}
                  </div>

                  <div className="detail-delete-actions">
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={handleStartSelectedServiceOrder}
                      disabled={
                        isSavingDetail ||
                        isDeletingServiceOrder ||
                        Boolean(selectedOrder.actual_start_at)
                      }
                    >
                      Iniciar servicio
                    </button>
                    <button
                      className="button"
                      type="button"
                      onClick={handleFinalizeSelectedServiceOrder}
                      disabled={isSavingDetail || isDeletingServiceOrder}
                    >
                      Finalizar servicio
                    </button>
                  </div>
                </section>

                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <h4 className="drawer-section-title">Recurrencia</h4>
                  </div>

                  <div className="detail-section-grid">
                    <div className="detail-row">
                      <span>{uiText.serviceOrder.fields.isRecurring}</span>
                      <strong>{selectedOrder.is_recurring ? "Activa" : "No configurada"}</strong>
                    </div>

                    {selectedOrder.is_recurring ? (
                      <div className="detail-section-grid detail-section-grid-2">
                        <div className="detail-row">
                          <span>{uiText.serviceOrder.fields.recurrenceType}</span>
                          <strong>
                            {uiText.serviceOrder.recurrenceOptions[
                              normalizeRecurrenceType(selectedOrder.recurrence_type)
                            ]}
                          </strong>
                        </div>
                        <div className="detail-row">
                          <span>{uiText.serviceOrder.fields.recurrenceEndDate}</span>
                          <strong>
                            {selectedOrder.recurrence_end_date
                              ? formatServiceDate(selectedOrder.recurrence_end_date)
                              : "Sin fecha limite"}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <p className="detail-section-empty-copy">
                        Este servicio se gestiona como una visita unica.
                      </p>
                    )}
                  </div>
                </section>

                {selectedOrder.notes ? (
                  <section className="drawer-section detail-section-card">
                    <div className="entity-drawer-section-header">
                      <h4 className="drawer-section-title">Observaciones</h4>
                    </div>

                    <div className="detail-section-grid">
                      <div className="detail-row detail-row-notes">
                        <strong>{selectedOrder.notes}</strong>
                      </div>
                    </div>
                  </section>
                ) : null}

                <div className="workspace-form-messages">
                  {detailFormError ? <p className="error">{detailFormError}</p> : null}
                  {detailFormMessage ? <p className="success-message">{detailFormMessage}</p> : null}
                </div>

                <div className="detail-panel-footer detail-panel-footer-detail">
                  {isConfirmingDeleteServiceOrder ? (
                    <div className="detail-delete-confirmation">
                      <p>{uiText.dashboard.detailDeleteConfirmTitle}</p>
                      <div className="detail-delete-actions">
                        <button
                          className="button button-danger"
                          type="button"
                          onClick={handleDeleteServiceOrder}
                          disabled={isDeletingServiceOrder}
                        >
                          {isDeletingServiceOrder
                            ? uiText.common.loadingDashboard
                            : uiText.dashboard.detailDeleteConfirm}
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => setIsConfirmingDeleteServiceOrder(false)}
                          disabled={isDeletingServiceOrder}
                        >
                          {uiText.dashboard.detailDeleteCancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="button button-danger button-danger-secondary"
                      type="button"
                      onClick={() => setIsConfirmingDeleteServiceOrder(true)}
                      disabled={isSavingDetail || isDeletingServiceOrder}
                    >
                      {uiText.dashboard.detailDelete}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          ) : null}
          </aside>
          ) : null}
        </div>
      </section>

      <footer className="admin-footer">
        <img src="/logo.svg" alt="Biz2Rise" className="admin-footer-logo" />
        <span>© 2026 Biz2Rise. All rights reserved.</span>
      </footer>

      {isClientModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={handleCloseClientModal}>
          <section
            className="quick-create-modal quick-create-modal-compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="workspace-copy">
              <h3 id="client-modal-title">{uiText.clients.formCreateTitle}</h3>
              <p>
                Registra rapidamente un cliente utilizable para programar servicios sin
                salir del panel.
              </p>
            </div>

            <form className="workspace-form" onSubmit={handleCreateClientFromModal}>
              <div className="workspace-grid">
                <label className="workspace-input-group">
                  <span>{uiText.serviceOrder.quickCreate.fields.clientName}</span>
                  <input
                    name="name"
                    type="text"
                    value={clientModalState.name}
                    onChange={handleClientModalChange}
                    disabled={isSavingClientModal}
                    required
                  />
                </label>

                {clientModalState.clientType === "commercial" ? (
                  <>
                    <label className="workspace-input-group">
                      <span>{uiText.clients.fields.businessName}</span>
                      <input
                        name="businessName"
                        type="text"
                        value={clientModalState.businessName}
                        onChange={handleClientModalChange}
                        disabled={isSavingClientModal}
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.clients.fields.tradeName}</span>
                      <input
                        name="tradeName"
                        type="text"
                        value={clientModalState.tradeName}
                        onChange={handleClientModalChange}
                        disabled={isSavingClientModal}
                      />
                    </label>
                  </>
                ) : null}

                <label className="workspace-input-group">
                  <span>{uiText.clients.fields.clientType}</span>
                  <select
                    name="clientType"
                    value={clientModalState.clientType}
                    onChange={handleClientModalChange}
                    disabled={isSavingClientModal}
                    required
                  >
                    <option value="residential">
                      {uiText.clients.typeOptions.residential}
                    </option>
                    <option value="commercial">
                      {uiText.clients.typeOptions.commercial}
                    </option>
                  </select>
                </label>

                {clientModalState.clientType === "commercial" ? (
                  <label className="workspace-input-group">
                    <span>{uiText.clients.fields.taxId}</span>
                    <input
                      name="taxId"
                      type="text"
                      value={clientModalState.taxId}
                      onChange={handleClientModalChange}
                      disabled={isSavingClientModal}
                    />
                  </label>
                ) : null}

                <label className="workspace-input-group">
                  <span>{uiText.serviceOrder.quickCreate.fields.phone}</span>
                  <input
                    name="phone"
                    type="tel"
                    value={clientModalState.phone}
                    onChange={handleClientModalChange}
                    disabled={isSavingClientModal}
                  />
                </label>

                {clientModalState.clientType === "residential" ? (
                  <>
                    <label className="workspace-input-group">
                      <span>Calle</span>
                      <input
                        name="street"
                        type="text"
                        value={clientModalState.street}
                        onChange={handleClientModalChange}
                        disabled={isSavingClientModal}
                        required
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>Numero</span>
                      <input
                        name="streetNumber"
                        type="text"
                        value={clientModalState.streetNumber}
                        onChange={handleClientModalChange}
                        disabled={isSavingClientModal}
                        required
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>Ciudad</span>
                      <input
                        name="city"
                        type="text"
                        value={clientModalState.city}
                        onChange={handleClientModalChange}
                        disabled={isSavingClientModal}
                        required
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>Estado</span>
                      <input
                        name="state"
                        type="text"
                        value={clientModalState.state}
                        onChange={handleClientModalChange}
                        disabled={isSavingClientModal}
                        required
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>Codigo postal</span>
                      <input
                        name="postalCode"
                        type="text"
                        value={clientModalState.postalCode}
                        onChange={handleClientModalChange}
                        disabled={isSavingClientModal}
                        required
                      />
                    </label>

                    <label className="workspace-input-group workspace-field-wide">
                      <span>Referencia / notas</span>
                      <textarea
                        name="reference"
                        value={clientModalState.reference}
                        onChange={handleClientModalChange}
                        disabled={isSavingClientModal}
                        rows={3}
                      />
                    </label>
                  </>
                ) : null}
              </div>

              <div className="workspace-form-footer">
                <div className="workspace-form-messages">
                  {clientModalError ? <p className="error">{clientModalError}</p> : null}
                </div>

                <div className="workspace-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={handleCloseClientModal}
                    disabled={isSavingClientModal}
                  >
                    {uiText.common.cancel}
                  </button>
                  <button className="button" type="submit" disabled={isSavingClientModal}>
                    {isSavingClientModal ? uiText.clients.saving : uiText.clients.save}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isBranchModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={handleCloseBranchModal}>
          <section
            className="quick-create-modal quick-create-modal-compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="workspace-copy">
              <h3 id="branch-modal-title">{uiText.clients.branchesFormCreateTitle}</h3>
              <p>
                Agrega la primera sucursal para {pendingBranchClient?.displayName || "el cliente"}.
              </p>
            </div>

            <form className="workspace-form" onSubmit={handleCreateBranchFromModal}>
              <div className="workspace-grid">
                <label className="workspace-input-group">
                  <span>{uiText.clients.branchFields.name}</span>
                  <input
                    name="name"
                    type="text"
                    value={branchModalState.name}
                    onChange={handleBranchModalChange}
                    disabled={isSavingBranchModal}
                    required
                  />
                </label>

                <label className="workspace-input-group">
                  <span>{uiText.clients.branchFields.phone}</span>
                  <input
                    name="phone"
                    type="text"
                    value={branchModalState.phone}
                    onChange={handleBranchModalChange}
                    disabled={isSavingBranchModal}
                  />
                </label>

                <label className="workspace-input-group">
                  <span>{uiText.clients.branchFields.contact}</span>
                  <input
                    name="contact"
                    type="text"
                    value={branchModalState.contact}
                    onChange={handleBranchModalChange}
                    disabled={isSavingBranchModal}
                  />
                </label>

                <label className="workspace-input-group workspace-field-wide">
                  <span>{uiText.clients.branchFields.address}</span>
                  <textarea
                    name="address"
                    value={branchModalState.address}
                    onChange={handleBranchModalChange}
                    disabled={isSavingBranchModal}
                    rows={3}
                    required
                  />
                </label>
              </div>

              <div className="workspace-form-footer">
                <div className="workspace-form-messages">
                  {branchModalError ? <p className="error">{branchModalError}</p> : null}
                </div>

                <div className="workspace-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={handleCloseBranchModal}
                    disabled={isSavingBranchModal}
                  >
                    {uiText.common.cancel}
                  </button>
                  <button className="button" type="submit" disabled={isSavingBranchModal}>
                    {isSavingBranchModal ? uiText.clients.branchSaving : uiText.clients.branchSave}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {activeTopLevelTab === dashboardTabs.clients && activeEntityType ? (
        <div
          className="entity-drawer-backdrop"
          role="presentation"
          onClick={handleCloseClientsDrawer}
        >
          {(() => {
            const isClientWorkspaceMode =
              (activeEntityType === "client" && (activeMode === "create" || activeMode === "edit")) ||
              activeEntityType === "branch";

            return (
          <aside
            className={
              isClientWorkspaceMode ? "entity-drawer entity-drawer-focused" : "entity-drawer"
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="entity-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="entity-drawer-header">
              <div className="entity-drawer-header-copy">
                <span className="entity-drawer-kicker">
                  {activeEntityType === "client" ? "Clientes" : "Sucursales"}
                </span>
                <h3 id="entity-drawer-title">{activeDrawerTitle}</h3>
                <p>{activeDrawerSubtitle}</p>
              </div>
              <button
                type="button"
                className="entity-drawer-close"
                onClick={handleCloseClientsDrawer}
                aria-label="Cerrar panel"
              >
                ×
              </button>
            </div>

            <div className="entity-drawer-body">
              {activeEntityType === "client" ? (
                activeMode === "detail" ? (
                  <div className="detail-summary">
                    <section className="drawer-section detail-section-card detail-identity-card">
                      <div className="detail-identity-copy">
                        <span className="detail-sidebar-kicker">Cliente</span>
                        <strong>{activeClient?.displayName || activeClient?.name || "-"}</strong>
                        <p>{getClientTypeLabel(activeClient?.client_type)}</p>
                      </div>
                      <div className="detail-identity-meta">
                        <span>{activeClient?.main_phone || "Sin telefono"}</span>
                        <span>{activeClient?.main_email || "Sin email"}</span>
                      </div>
                    </section>

                    <div className="entity-drawer-tabs">
                      <button
                        type="button"
                        className={
                          activeClientDrawerTab === clientDrawerTabs.summary
                            ? "entity-drawer-tab entity-drawer-tab-active"
                            : "entity-drawer-tab"
                        }
                        onClick={() => setActiveClientDrawerTab(clientDrawerTabs.summary)}
                      >
                        Resumen
                      </button>
                      <button
                        type="button"
                        className={
                          activeClientDrawerTab === clientDrawerTabs.branches
                            ? "entity-drawer-tab entity-drawer-tab-active"
                            : "entity-drawer-tab"
                        }
                        onClick={() => setActiveClientDrawerTab(clientDrawerTabs.branches)}
                        disabled={!activeDrawerClientId}
                      >
                        Sucursales
                      </button>
                      <button
                        type="button"
                        className={
                          activeClientDrawerTab === clientDrawerTabs.services
                            ? "entity-drawer-tab entity-drawer-tab-active"
                            : "entity-drawer-tab"
                        }
                        onClick={() => setActiveClientDrawerTab(clientDrawerTabs.services)}
                        disabled={!activeDrawerClientId}
                      >
                        Servicios / ordenes
                      </button>
                    </div>

                    {activeClientDrawerTab === clientDrawerTabs.summary ? (
                      <>
                        <section className="drawer-section detail-section-card">
                          <div className="entity-drawer-section-header">
                            <h4 className="drawer-section-title">Resumen del cliente</h4>
                          </div>

                          <div className="detail-section-grid">
                            <div className="detail-row">
                              <span>Contacto principal</span>
                              <strong>{activeClient?.main_contact || "-"}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Razon social</span>
                              <strong>{activeClient?.business_name || "-"}</strong>
                            </div>
                            <div className="detail-row">
                              <span>RFC</span>
                              <strong>{activeClient?.tax_id || "-"}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Sucursales</span>
                              <strong>{(branchesByClientId[activeDrawerClientId] || []).length}</strong>
                            </div>
                          </div>
                        </section>

                        <section className="drawer-section detail-section-card">
                          <div className="entity-drawer-section-header">
                            <h4 className="drawer-section-title">Cliente 360</h4>
                            <p className="detail-subcopy">Vista del mes actual</p>
                          </div>

                          <div className="client-summary-kpis">
                            <div className="detail-static-field">
                              <span>Citas activas</span>
                              <strong>{activeClientProgressOverview.appointmentCount}</strong>
                            </div>
                            <div className="detail-static-field">
                              <span>Órdenes del mes</span>
                              <strong>{activeClientProgressOverview.serviceOrderCount}</strong>
                            </div>
                            <div className="detail-static-field">
                              <span>Completadas</span>
                              <strong>{activeClientProgressOverview.completedOrderCount}</strong>
                            </div>
                            <div className="detail-static-field">
                              <span>Pendientes</span>
                              <strong>{activeClientProgressOverview.pendingOrderCount}</strong>
                            </div>
                            <div className="detail-static-field">
                              <span>Vencidas</span>
                              <strong>{activeClientProgressOverview.overdueOrderCount}</strong>
                            </div>
                            <div className="detail-static-field">
                              <span>Sucursales con actividad</span>
                              <strong>{activeClientProgressOverview.branchesWithActivity}</strong>
                            </div>
                          </div>
                        </section>

                        <section className="drawer-section detail-section-card">
                          <div className="entity-drawer-section-header">
                            <h4 className="drawer-section-title">Progreso por sucursal</h4>
                          </div>

                          {activeClientBranchProgress.length === 0 ? (
                            <p className="detail-subcopy">
                              Todavia no hay sucursales registradas para este cliente.
                            </p>
                          ) : (
                            <div className="workspace-table-wrapper client-summary-table-wrapper">
                              <table className="workspace-table client-summary-table">
                                <thead>
                                  <tr>
                                    <th>Sucursal</th>
                                    <th>Ultimo servicio</th>
                                    <th>Proximo servicio</th>
                                    <th>Estado</th>
                                    <th>Tecnico</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {activeClientBranchProgress.map((branchProgress) => (
                                    <tr key={branchProgress.id}>
                                      <td>{branchProgress.name}</td>
                                      <td>{branchProgress.lastService}</td>
                                      <td>{branchProgress.nextService}</td>
                                      <td>
                                        <span
                                          className={`client-progress-status client-progress-status-${branchProgress.stateKey}`}
                                        >
                                          {branchProgress.stateLabel}
                                        </span>
                                      </td>
                                      <td>{branchProgress.technicianName}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>
                      </>
                    ) : null}

                    {activeClientDrawerTab === clientDrawerTabs.branches ? (
                      <section className="drawer-section detail-section-card">
                        <div className="entity-drawer-section-header">
                          <h4 className="drawer-section-title">Sucursales</h4>
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => {
                              setActiveClientDrawerTab(clientDrawerTabs.branches);
                              setActiveMode("edit");
                            }}
                          >
                            Gestionar sucursales
                          </button>
                        </div>

                        {branchesByClientId[activeDrawerClientId]?.length ? (
                          <div className="entity-drawer-list">
                            {branchesByClientId[activeDrawerClientId].map((branch) => (
                              <div
                                key={branch.id}
                                className="entity-drawer-list-item drawer-card-row"
                              >
                                <div className="drawer-card-row-heading">
                                  <strong>{branch.name}</strong>
                                </div>
                                {branch.address ? <span>{branch.address}</span> : null}
                                {branch.phone ? <span>Telefono: {branch.phone}</span> : null}
                                {branch.contact ? <span>Contacto: {branch.contact}</span> : null}
                                {!branch.address && !branch.phone && !branch.contact ? (
                                  <span>Sin datos operativos</span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="detail-subcopy">{uiText.clients.branchesEmptyState}</p>
                        )}
                      </section>
                    ) : null}

                    {activeClientDrawerTab === clientDrawerTabs.services ? (
                      <section className="drawer-section detail-section-card">
                        <div className="entity-drawer-section-header">
                          <h4 className="drawer-section-title">Servicios / ordenes</h4>
                        </div>

                        {activeClientTimelineRows.length === 0 ? (
                          <p className="detail-subcopy">
                            No hay citas ni ordenes registradas para este cliente.
                          </p>
                        ) : (
                          <div className="workspace-table-wrapper client-summary-table-wrapper">
                            <table className="workspace-table client-summary-table">
                              <thead>
                                <tr>
                                  <th>Tipo</th>
                                  <th>Fecha</th>
                                  <th>Estado</th>
                                  <th>Ubicacion</th>
                                  <th>Tecnico</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeClientTimelineRows.map((timelineRow) => (
                                  <tr key={timelineRow.id}>
                                    <td>{timelineRow.typeLabel}</td>
                                    <td>
                                      {formatServiceDateTimeSummary(
                                        timelineRow.date,
                                        timelineRow.time
                                      )}
                                    </td>
                                    <td>
                                      <span
                                        className={`client-progress-status client-progress-status-${timelineRow.status.toLowerCase()}`}
                                      >
                                        {timelineRow.status}
                                      </span>
                                    </td>
                                    <td>{timelineRow.location}</td>
                                    <td>{timelineRow.technicianName}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    ) : null}

                    <div className="detail-panel-footer detail-panel-footer-detail">
                      <div className="workspace-form-messages">
                        {clientDrawerMessage ? (
                          <p className="success-message">{clientDrawerMessage}</p>
                        ) : null}
                      </div>
                      <div className="detail-delete-actions">
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => {
                            setActiveClientDrawerTab(clientDrawerTabs.contacts);
                            setActiveMode("edit");
                          }}
                        >
                          Contactos
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => {
                            setActiveClientDrawerTab(clientDrawerTabs.branches);
                            setActiveMode("edit");
                          }}
                        >
                          Sucursales
                        </button>
                        <button
                          className="button"
                          type="button"
                          onClick={() => {
                            setActiveClientDrawerTab(clientDrawerTabs.client);
                            setActiveMode("edit");
                          }}
                        >
                          Editar cliente
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="entity-drawer-tabs">
                      <button
                        type="button"
                        className={
                          activeClientDrawerTab === clientDrawerTabs.client
                            ? "entity-drawer-tab entity-drawer-tab-active"
                            : "entity-drawer-tab"
                        }
                        onClick={() => setActiveClientDrawerTab(clientDrawerTabs.client)}
                      >
                        Cliente
                      </button>
                      <button
                        type="button"
                        className={
                          activeClientDrawerTab === clientDrawerTabs.contacts
                            ? "entity-drawer-tab entity-drawer-tab-active"
                            : "entity-drawer-tab"
                        }
                        onClick={() => setActiveClientDrawerTab(clientDrawerTabs.contacts)}
                        disabled={!activeDrawerClientId}
                      >
                        Contactos
                      </button>
                      <button
                        type="button"
                        className={
                          activeClientDrawerTab === clientDrawerTabs.branches
                            ? "entity-drawer-tab entity-drawer-tab-active"
                            : "entity-drawer-tab"
                        }
                        onClick={() => setActiveClientDrawerTab(clientDrawerTabs.branches)}
                        disabled={!activeDrawerClientId}
                      >
                        Sucursales
                      </button>
                    </div>

                    {activeClientDrawerTab === clientDrawerTabs.client ? (
                      <form className="workspace-form entity-drawer-form" onSubmit={handleSaveClientFromDrawer}>
                        <div className="entity-drawer-section drawer-section">
                          <div className="entity-drawer-section-header">
                            <h4 className="drawer-section-title">General</h4>
                          </div>
                          <div className="workspace-grid entity-drawer-grid drawer-form-grid">
                            <label className="workspace-input-group workspace-field-wide">
                              <span>Nombre del cliente</span>
                              <input
                                name="name"
                                type="text"
                                value={clientDrawerForm.name}
                                onChange={handleClientDrawerFormChange}
                                disabled={isSavingClientDrawer}
                                required
                              />
                            </label>

                            <label className="workspace-input-group">
                              <span>{uiText.clients.fields.clientType}</span>
                              <select
                                name="clientType"
                                value={clientDrawerForm.clientType}
                                onChange={handleClientDrawerFormChange}
                                disabled={isSavingClientDrawer}
                                required
                              >
                                <option value="residential">{uiText.clients.typeOptions.residential}</option>
                                <option value="commercial">{uiText.clients.typeOptions.commercial}</option>
                              </select>
                            </label>

                            <label className="workspace-input-group">
                              <span>{uiText.clients.fields.tradeName}</span>
                              <input
                                name="tradeName"
                                type="text"
                                value={clientDrawerForm.tradeName}
                                onChange={handleClientDrawerFormChange}
                                disabled={isSavingClientDrawer}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="entity-drawer-section drawer-section">
                          <div className="entity-drawer-section-header">
                            <h4 className="drawer-section-title">Contacto principal</h4>
                          </div>
                          <div className="workspace-grid entity-drawer-grid drawer-form-grid">
                            <label className="workspace-input-group">
                              <span>{uiText.clients.fields.mainPhone}</span>
                              <input
                                name="mainPhone"
                                type="tel"
                                value={clientDrawerForm.mainPhone}
                                onChange={handleClientDrawerFormChange}
                                disabled={isSavingClientDrawer}
                              />
                            </label>

                            <label className="workspace-input-group">
                              <span>{uiText.clients.fields.mainEmail}</span>
                              <input
                                name="mainEmail"
                                type="email"
                                value={clientDrawerForm.mainEmail}
                                onChange={handleClientDrawerFormChange}
                                disabled={isSavingClientDrawer}
                              />
                            </label>

                            <label className="workspace-input-group workspace-field-wide">
                              <span>{uiText.clients.fields.mainContact}</span>
                              <input
                                name="mainContact"
                                type="text"
                                value={clientDrawerForm.mainContact}
                                onChange={handleClientDrawerFormChange}
                                disabled={isSavingClientDrawer}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="entity-drawer-section drawer-section">
                          <div className="entity-drawer-section-header">
                            <h4 className="drawer-section-title">Datos administrativos</h4>
                          </div>
                          <div className="workspace-grid entity-drawer-grid drawer-form-grid">
                            <label className="workspace-input-group">
                              <span>{uiText.clients.fields.businessName}</span>
                              <input
                                name="businessName"
                                type="text"
                                value={clientDrawerForm.businessName}
                                onChange={handleClientDrawerFormChange}
                                disabled={isSavingClientDrawer}
                              />
                            </label>

                            <label className="workspace-input-group">
                              <span>{uiText.clients.fields.taxId}</span>
                              <input
                                name="taxId"
                                type="text"
                                value={clientDrawerForm.taxId}
                                onChange={handleClientDrawerFormChange}
                                disabled={isSavingClientDrawer}
                              />
                            </label>
                          </div>
                        </div>

                        {!activeDrawerClientId ? (
                          <p className="empty-hint">
                            Guarda el cliente primero para agregar contactos y sucursales.
                          </p>
                        ) : null}

                        <div className="workspace-form-footer entity-drawer-footer">
                          <div className="workspace-form-messages">
                            {clientDrawerError ? <p className="error">{clientDrawerError}</p> : null}
                            {clientDrawerMessage ? (
                              <p className="success-message">{clientDrawerMessage}</p>
                            ) : null}
                          </div>

                          <div className="workspace-actions">
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={handleReturnClientDrawerToDetail}
                              disabled={isSavingClientDrawer}
                            >
                              {uiText.common.cancel}
                            </button>
                            <button
                              className={isSavingClientDrawer ? "button is-loading" : "button"}
                              type="submit"
                              disabled={isSavingClientDrawer || !isClientDrawerDirty}
                            >
                              {isSavingClientDrawer
                                ? uiText.clients.saving
                                : activeMode === "edit"
                                  ? uiText.clients.update
                                  : uiText.clients.save}
                            </button>
                          </div>
                        </div>

                        {activeMode === "edit" && activeEntityId ? (
                          <div className="entity-drawer-delete-zone">
                            {isConfirmingDeleteClient ? (
                              <div className="detail-delete-confirmation entity-drawer-delete-confirmation">
                                <p>
                                  {clientDeleteImpact.branches > 0 || clientDeleteImpact.contacts > 0
                                    ? `Este cliente tambien tiene ${clientDeleteImpact.branches} sucursales y ${clientDeleteImpact.contacts} contactos asociados. Si continuas, tambien se eliminaran.`
                                    : "Esta accion eliminara el cliente de forma permanente."}
                                </p>
                                <div className="detail-delete-actions">
                                  <button
                                    className="button button-danger"
                                    type="button"
                                    onClick={handleDeleteClientFromDrawer}
                                    disabled={isDeletingClient}
                                  >
                                    {isDeletingClient
                                      ? uiText.common.loadingDashboard
                                      : "Confirmar eliminacion"}
                                  </button>
                                  <button
                                    className="button button-secondary"
                                    type="button"
                                    onClick={() => setIsConfirmingDeleteClient(false)}
                                    disabled={isDeletingClient}
                                  >
                                    {uiText.common.cancel}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                className="button button-danger-secondary"
                                type="button"
                                onClick={handleRequestDeleteClientFromDrawer}
                                disabled={isSavingClientDrawer || isDeletingClient}
                              >
                                Eliminar cliente
                              </button>
                            )}
                          </div>
                        ) : null}
                      </form>
                    ) : null}

                    {activeClientDrawerTab === clientDrawerTabs.contacts ? (
                      <div className="entity-drawer-section drawer-section">
                        {!activeDrawerClientId ? (
                          <p className="empty-hint">
                            Guarda el cliente primero para agregar contactos.
                          </p>
                        ) : (
                          <>
                            <div className="entity-drawer-section-header">
                              <h4>Contactos del cliente</h4>
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={resetContactDrawerEditor}
                              >
                                + Contacto
                              </button>
                            </div>

                            {isContactsLoading ? (
                              <p className="detail-subcopy">Cargando contactos...</p>
                            ) : activeClientContacts.length === 0 ? (
                              <p className="detail-subcopy">
                                Todavia no hay contactos estructurados para este cliente.
                              </p>
                            ) : (
                              <div className="entity-drawer-list">
                                {activeClientContacts.map((contact) => (
                                  <button
                                    key={contact.id}
                                    type="button"
                                    className={
                                      activeContactId === contact.id
                                        ? "entity-drawer-list-item drawer-card-row drawer-card-button drawer-card-button-active"
                                        : "entity-drawer-list-item drawer-card-row drawer-card-button"
                                    }
                                    onClick={() => handleEditContactFromDrawer(contact)}
                                  >
                                    <div className="drawer-card-row-heading">
                                      <strong>{contact.full_name}</strong>
                                      {contact.is_primary ? (
                                        <span className="drawer-card-badge">Principal</span>
                                      ) : null}
                                    </div>
                                    {contact.role ? <span>{contact.role}</span> : null}
                                    {contact.phone ? <span>{contact.phone}</span> : null}
                                    {contact.email ? <span>{contact.email}</span> : null}
                                    {!contact.role && !contact.phone && !contact.email ? (
                                      <span>Sin datos complementarios</span>
                                    ) : null}
                                  </button>
                                ))}
                              </div>
                            )}

                            <form className="workspace-form entity-drawer-subform" onSubmit={handleSaveContactFromDrawer}>
                              <div className="entity-drawer-subform-header">
                                <strong>
                                  {activeEditingContact
                                    ? `Editando contacto: ${activeEditingContact.full_name}`
                                    : "Nuevo contacto"}
                                </strong>
                                {activeEditingContact ? (
                                  <button
                                    type="button"
                                    className="button button-secondary"
                                    onClick={resetContactDrawerEditor}
                                  >
                                    Cancelar edicion
                                  </button>
                                ) : null}
                              </div>
                              <div className="workspace-grid entity-drawer-grid drawer-form-grid">
                                <label className="workspace-input-group workspace-field-wide">
                                  <span>Nombre completo</span>
                                  <input
                                    name="fullName"
                                    type="text"
                                    value={contactDrawerForm.fullName}
                                    onChange={handleContactDrawerFormChange}
                                    disabled={isSavingContactDrawer}
                                    required
                                  />
                                </label>
                                <label className="workspace-input-group">
                                  <span>Telefono</span>
                                  <input
                                    name="phone"
                                    type="text"
                                    value={contactDrawerForm.phone}
                                    onChange={handleContactDrawerFormChange}
                                    disabled={isSavingContactDrawer}
                                  />
                                </label>
                                <label className="workspace-input-group">
                                  <span>Email</span>
                                  <input
                                    name="email"
                                    type="email"
                                    value={contactDrawerForm.email}
                                    onChange={handleContactDrawerFormChange}
                                    disabled={isSavingContactDrawer}
                                  />
                                </label>
                                <label className="workspace-input-group">
                                  <span>Rol</span>
                                  <input
                                    name="role"
                                    type="text"
                                    value={contactDrawerForm.role}
                                    onChange={handleContactDrawerFormChange}
                                    disabled={isSavingContactDrawer}
                                  />
                                </label>
                                <label className="workspace-input-group workspace-field-wide">
                                  <span>Notas</span>
                                  <textarea
                                    name="notes"
                                    value={contactDrawerForm.notes}
                                    onChange={handleContactDrawerFormChange}
                                    disabled={isSavingContactDrawer}
                                    rows={3}
                                  />
                                </label>
                                <label className="workspace-checkbox workspace-field-wide">
                                  <input
                                    name="isPrimary"
                                    type="checkbox"
                                    checked={contactDrawerForm.isPrimary}
                                    onChange={handleContactDrawerFormChange}
                                    disabled={isSavingContactDrawer}
                                  />
                                  <span>Marcar como contacto principal</span>
                                </label>
                              </div>

                              <div className="workspace-form-footer entity-drawer-footer entity-drawer-footer-inline">
                                <div className="workspace-form-messages">
                                  {contactsError ? <p className="error">{contactsError}</p> : null}
                                  {contactDrawerError ? <p className="error">{contactDrawerError}</p> : null}
                                  {contactsMessage ? <p className="success-message">{contactsMessage}</p> : null}
                                </div>
                                <div className="workspace-actions">
                                  <button
                                    className={isSavingContactDrawer ? "button is-loading" : "button"}
                                    type="submit"
                                    disabled={isSavingContactDrawer || !isContactDrawerDirty}
                                  >
                                    {isSavingContactDrawer
                                      ? "Guardando..."
                                      : activeEditingContact
                                        ? "Guardar cambios"
                                        : "Guardar contacto"}
                                  </button>
                                </div>
                              </div>
                            </form>
                          </>
                        )}
                      </div>
                    ) : null}

                    {activeClientDrawerTab === clientDrawerTabs.branches ? (
                      <div className="entity-drawer-section drawer-section">
                        {!activeDrawerClientId ? (
                          <p className="empty-hint">
                            Guarda el cliente primero para agregar sucursales.
                          </p>
                        ) : (
                          <>
                            <div className="entity-drawer-section-header">
                              <h4>Sucursales del cliente</h4>
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={resetBranchDrawerEditor}
                              >
                                + Sucursal
                              </button>
                            </div>

                            {branchesByClientId[activeDrawerClientId]?.length ? (
                              <div className="entity-drawer-list">
                                {branchesByClientId[activeDrawerClientId].map((branch) => (
                                  <button
                                    key={branch.id}
                                    type="button"
                                    className={
                                      activeBranchFormId === branch.id
                                        ? "entity-drawer-list-item drawer-card-row drawer-card-button drawer-card-button-active"
                                        : "entity-drawer-list-item drawer-card-row drawer-card-button"
                                    }
                                    onClick={() => handleEditBranchFromDrawer(branch)}
                                  >
                                    <div className="drawer-card-row-heading">
                                      <strong>{branch.name}</strong>
                                    </div>
                                    {branch.address ? <span>{branch.address}</span> : null}
                                    {branch.phone ? <span>Telefono: {branch.phone}</span> : null}
                                    {branch.contact ? <span>Contacto: {branch.contact}</span> : null}
                                    {!branch.address && !branch.phone && !branch.contact ? (
                                      <span>Sin datos operativos</span>
                                    ) : null}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="detail-subcopy">{uiText.clients.branchesEmptyState}</p>
                            )}

                            <form className="workspace-form entity-drawer-subform" onSubmit={handleSaveBranchFromDrawer}>
                              <div className="entity-drawer-subform-header">
                                <strong>
                                  {activeEditingBranch
                                    ? `Editando sucursal: ${activeEditingBranch.name}`
                                    : "Nueva sucursal"}
                                </strong>
                                {activeEditingBranch ? (
                                  <button
                                    type="button"
                                    className="button button-secondary"
                                    onClick={resetBranchDrawerEditor}
                                  >
                                    Cancelar edicion
                                  </button>
                                ) : null}
                              </div>
                              <div className="workspace-grid entity-drawer-grid drawer-form-grid">
                                <label className="workspace-input-group">
                                  <span>{uiText.clients.branchFields.name}</span>
                                  <input
                                    name="name"
                                    type="text"
                                    value={drawerBranchForm.name}
                                    onChange={handleDrawerBranchFormChange}
                                    disabled={isSavingDrawerBranch}
                                    required
                                  />
                                </label>
                                <label className="workspace-input-group">
                                  <span>{uiText.clients.branchFields.phone}</span>
                                  <input
                                    name="phone"
                                    type="text"
                                    value={drawerBranchForm.phone}
                                    onChange={handleDrawerBranchFormChange}
                                    disabled={isSavingDrawerBranch}
                                  />
                                </label>
                                <label className="workspace-input-group">
                                  <span>{uiText.clients.branchFields.contact}</span>
                                  <input
                                    name="contact"
                                    type="text"
                                    value={drawerBranchForm.contact}
                                    onChange={handleDrawerBranchFormChange}
                                    disabled={isSavingDrawerBranch}
                                  />
                                </label>
                                <label className="workspace-input-group workspace-field-wide">
                                  <span>{uiText.clients.branchFields.address}</span>
                                  <textarea
                                    name="address"
                                    value={drawerBranchForm.address}
                                    onChange={handleDrawerBranchFormChange}
                                    disabled={isSavingDrawerBranch}
                                    rows={3}
                                    required
                                  />
                                </label>
                                <label className="workspace-input-group workspace-field-wide">
                                  <span>{uiText.clients.branchFields.notes}</span>
                                  <textarea
                                    name="notes"
                                    value={drawerBranchForm.notes}
                                    onChange={handleDrawerBranchFormChange}
                                    disabled={isSavingDrawerBranch}
                                    rows={3}
                                  />
                                </label>
                              </div>
                              <div className="workspace-form-footer entity-drawer-footer entity-drawer-footer-inline">
                                <div className="workspace-form-messages">
                                  {drawerBranchError ? <p className="error">{drawerBranchError}</p> : null}
                                  {drawerBranchMessage ? (
                                    <p className="success-message">{drawerBranchMessage}</p>
                                  ) : null}
                                </div>
                                <div className="workspace-actions">
                                  <button
                                    className={isSavingDrawerBranch ? "button is-loading" : "button"}
                                    type="submit"
                                    disabled={isSavingDrawerBranch || !isBranchDrawerDirty}
                                  >
                                    {isSavingDrawerBranch
                                      ? uiText.clients.branchSaving
                                      : activeEditingBranch
                                        ? uiText.clients.branchUpdate
                                        : uiText.clients.branchSave}
                                  </button>
                                </div>
                              </div>

                              {activeEditingBranch ? (
                                <div className="entity-drawer-delete-zone">
                                  {isConfirmingDeleteBranch ? (
                                    <div className="detail-delete-confirmation entity-drawer-delete-confirmation">
                                      <p>
                                        Esta accion eliminara la sucursal de forma permanente. Solo
                                        se permitira si no tiene ordenes de servicio relacionadas.
                                      </p>
                                      <div className="detail-delete-actions">
                                        <button
                                          className="button button-danger"
                                          type="button"
                                          onClick={handleDeleteBranchFromDrawer}
                                          disabled={isDeletingBranch}
                                        >
                                          {isDeletingBranch
                                            ? uiText.common.loadingDashboard
                                            : "Confirmar eliminacion"}
                                        </button>
                                        <button
                                          className="button button-secondary"
                                          type="button"
                                          onClick={() => setIsConfirmingDeleteBranch(false)}
                                          disabled={isDeletingBranch}
                                        >
                                          {uiText.common.cancel}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      className="button button-danger-secondary"
                                      type="button"
                                      onClick={handleRequestDeleteBranchFromDrawer}
                                      disabled={isSavingDrawerBranch || isDeletingBranch}
                                    >
                                      Eliminar sucursal
                                    </button>
                                  )}
                                </div>
                              ) : null}
                            </form>
                          </>
                        )}
                      </div>
                    ) : null}
                  </>
                )
              ) : null}

              {activeEntityType === "branch" ? (
                <form className="workspace-form entity-drawer-form" onSubmit={handleSaveBranchFromDrawer}>
                  <div className="entity-drawer-section drawer-section">
                    <div className="detail-row">
                      <span>Cliente padre</span>
                      <strong>{activeClient?.displayName || "-"}</strong>
                    </div>
                  </div>

                  <div className="workspace-grid entity-drawer-grid drawer-form-grid">
                    <label className="workspace-input-group">
                      <span>{uiText.clients.branchFields.name}</span>
                      <input
                        name="name"
                        type="text"
                        value={drawerBranchForm.name}
                        onChange={handleDrawerBranchFormChange}
                        disabled={isSavingDrawerBranch}
                        required
                      />
                    </label>
                    <label className="workspace-input-group">
                      <span>{uiText.clients.branchFields.phone}</span>
                      <input
                        name="phone"
                        type="text"
                        value={drawerBranchForm.phone}
                        onChange={handleDrawerBranchFormChange}
                        disabled={isSavingDrawerBranch}
                      />
                    </label>
                    <label className="workspace-input-group">
                      <span>{uiText.clients.branchFields.contact}</span>
                      <input
                        name="contact"
                        type="text"
                        value={drawerBranchForm.contact}
                        onChange={handleDrawerBranchFormChange}
                        disabled={isSavingDrawerBranch}
                      />
                    </label>
                    <label className="workspace-input-group workspace-field-wide">
                      <span>{uiText.clients.branchFields.address}</span>
                      <textarea
                        name="address"
                        value={drawerBranchForm.address}
                        onChange={handleDrawerBranchFormChange}
                        disabled={isSavingDrawerBranch}
                        rows={3}
                        required
                      />
                    </label>
                    <label className="workspace-input-group workspace-field-wide">
                      <span>{uiText.clients.branchFields.notes}</span>
                      <textarea
                        name="notes"
                        value={drawerBranchForm.notes}
                        onChange={handleDrawerBranchFormChange}
                        disabled={isSavingDrawerBranch}
                        rows={3}
                      />
                    </label>
                  </div>

                  <div className="workspace-form-footer entity-drawer-footer">
                    <div className="workspace-form-messages">
                      {drawerBranchError ? <p className="error">{drawerBranchError}</p> : null}
                      {drawerBranchMessage ? (
                        <p className="success-message">{drawerBranchMessage}</p>
                      ) : null}
                    </div>

                    <div className="workspace-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={
                          activeMode === "edit" && activeParentClientId
                            ? () => handleOpenClientDrawerDetail(activeClient)
                            : handleCloseClientsDrawer
                        }
                        disabled={isSavingDrawerBranch}
                      >
                        {uiText.common.cancel}
                      </button>
                      <button
                        className={isSavingDrawerBranch ? "button is-loading" : "button"}
                        type="submit"
                        disabled={isSavingDrawerBranch || !isBranchDrawerDirty}
                      >
                        {isSavingDrawerBranch
                          ? uiText.clients.branchSaving
                          : activeMode === "edit"
                            ? uiText.clients.branchUpdate
                            : uiText.clients.branchSave}
                      </button>
                    </div>
                  </div>

                  {activeMode === "edit" ? (
                    <div className="entity-drawer-delete-zone">
                      {isConfirmingDeleteBranch ? (
                        <div className="detail-delete-confirmation entity-drawer-delete-confirmation">
                          <p>
                            Esta accion eliminara la sucursal de forma permanente. Solo se
                            permitira si no tiene ordenes de servicio relacionadas.
                          </p>
                          <div className="detail-delete-actions">
                            <button
                              className="button button-danger"
                              type="button"
                              onClick={handleDeleteBranchFromDrawer}
                              disabled={isDeletingBranch}
                            >
                              {isDeletingBranch
                                ? uiText.common.loadingDashboard
                                : "Confirmar eliminacion"}
                            </button>
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => setIsConfirmingDeleteBranch(false)}
                              disabled={isDeletingBranch}
                            >
                              {uiText.common.cancel}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="button button-danger-secondary"
                          type="button"
                          onClick={handleRequestDeleteBranchFromDrawer}
                          disabled={isSavingDrawerBranch || isDeletingBranch}
                        >
                          Eliminar sucursal
                        </button>
                      )}
                    </div>
                  ) : null}
                </form>
              ) : null}
            </div>
          </aside>
            );
          })()}
        </div>
      ) : null}

      {activeTopLevelTab === dashboardTabs.technicians && technicianDrawerMode ? (
        <div
          className="entity-drawer-backdrop"
          role="presentation"
          onClick={handleCloseTechnicianDrawer}
        >
          <aside
            className={
              technicianDrawerMode === "create" || technicianDrawerMode === "edit"
                ? "entity-drawer entity-drawer-focused"
                : "entity-drawer"
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="technician-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="entity-drawer-header">
              <div className="entity-drawer-header-copy">
                <span className="entity-drawer-kicker">Tecnicos</span>
                <h3 id="technician-drawer-title">
                  {technicianDrawerMode === "detail"
                    ? activeTechnician?.full_name || "Detalle del tecnico"
                    : technicianDrawerMode === "edit"
                    ? uiText.technicians.formEditTitle
                    : uiText.technicians.formCreateTitle}
                </h3>
                <p>
                  {technicianDrawerMode === "detail"
                    ? "Consulta disponibilidad, contacto y contexto operativo antes de entrar a edicion."
                    : technicianDrawerMode === "edit"
                    ? "Actualiza disponibilidad, contacto y notas operativas del tecnico."
                    : "Registra un tecnico nuevo sin salir del roster operativo."}
                </p>
              </div>
              <button
                type="button"
                className="entity-drawer-close"
                onClick={handleCloseTechnicianDrawer}
                aria-label="Cerrar panel"
              >
                ×
              </button>
            </div>

            <div className="entity-drawer-body">
              {technicianDrawerMode === "detail" ? (
                <div className="detail-summary">
                  <section className="drawer-section detail-section-card detail-identity-card">
                    <div className="detail-identity-copy">
                      <span className="detail-sidebar-kicker">Tecnico</span>
                      <strong>{activeTechnician?.full_name || "-"}</strong>
                      <p>
                        {activeTechnician?.is_active
                          ? uiText.technicians.active
                          : uiText.technicians.inactive}
                      </p>
                    </div>
                    <div className="detail-identity-meta">
                      <span>{activeTechnician?.phone || "Sin telefono"}</span>
                    </div>
                  </section>

                  <section className="drawer-section detail-section-card">
                    <div className="entity-drawer-section-header">
                      <h4 className="drawer-section-title">Resumen</h4>
                    </div>

                    <div className="detail-section-grid">
                      <div className="detail-row">
                        <span>Estado</span>
                        <strong>
                          {activeTechnician?.is_active
                            ? uiText.technicians.active
                            : uiText.technicians.inactive}
                        </strong>
                      </div>
                      <div className="detail-row">
                        <span>Telefono</span>
                        <strong>{activeTechnician?.phone || "-"}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Direccion</span>
                        <strong>{activeTechnician?.address || "-"}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Notas</span>
                        <strong>{activeTechnician?.notes || "-"}</strong>
                      </div>
                    </div>
                  </section>

                  <div className="detail-panel-footer detail-panel-footer-detail">
                    <div className="workspace-form-messages">
                      {technicianFormMessage ? (
                        <p className="success-message">{technicianFormMessage}</p>
                      ) : null}
                    </div>
                    <div className="detail-delete-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => handleViewTechnicianInCalendar(activeTechnician)}
                      >
                        Ver en calendario
                      </button>
                      <button
                        className="button"
                        type="button"
                        onClick={() => setTechnicianDrawerMode("edit")}
                      >
                        Editar tecnico
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form className="workspace-form entity-drawer-form" onSubmit={handleCreateTechnician}>
                  <div className="entity-drawer-section drawer-section">
                    <div className="entity-drawer-section-header">
                      <h4 className="drawer-section-title">General</h4>
                    </div>
                    <div className="workspace-grid entity-drawer-grid drawer-form-grid">
                      <label className="workspace-input-group workspace-field-wide">
                        <span>{uiText.technicians.fields.fullName}</span>
                        <input
                          name="fullName"
                          type="text"
                          value={technicianForm.fullName}
                          onChange={handleTechnicianFormChange}
                          placeholder={uiText.technicians.placeholders.fullName}
                          disabled={isSavingTechnician}
                          required
                        />
                      </label>

                      <label className="workspace-input-group">
                        <span>Estado</span>
                        <select
                          name="isActive"
                          value={technicianForm.isActive ? "active" : "inactive"}
                          onChange={(event) =>
                            handleTechnicianFormChange({
                              target: {
                                name: "isActive",
                                type: "checkbox",
                                checked: event.target.value === "active"
                              }
                            })
                          }
                          disabled={isSavingTechnician}
                        >
                          <option value="active">{uiText.technicians.active}</option>
                          <option value="inactive">{uiText.technicians.inactive}</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="entity-drawer-section drawer-section">
                    <div className="entity-drawer-section-header">
                      <h4 className="drawer-section-title">Contacto</h4>
                    </div>
                    <div className="workspace-grid entity-drawer-grid drawer-form-grid">
                      <label className="workspace-input-group workspace-field-wide">
                        <span>{uiText.technicians.fields.phone}</span>
                        <input
                          name="phone"
                          type="text"
                          value={technicianForm.phone}
                          onChange={handleTechnicianFormChange}
                          placeholder={uiText.technicians.placeholders.phone}
                          disabled={isSavingTechnician || !supportsExtendedTechnicianFields}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="entity-drawer-section drawer-section">
                    <div className="entity-drawer-section-header">
                      <h4 className="drawer-section-title">Ubicacion y notas</h4>
                    </div>
                    <div className="workspace-grid entity-drawer-grid drawer-form-grid">
                      <label className="workspace-input-group workspace-field-wide">
                        <span>{uiText.technicians.fields.address}</span>
                        <textarea
                          name="address"
                          value={technicianForm.address}
                          onChange={handleTechnicianFormChange}
                          placeholder={uiText.technicians.placeholders.address}
                          disabled={isSavingTechnician || !supportsExtendedTechnicianFields}
                          rows={3}
                        />
                      </label>

                      <label className="workspace-input-group workspace-field-wide">
                        <span>{uiText.technicians.fields.notes}</span>
                        <textarea
                          name="notes"
                          value={technicianForm.notes}
                          onChange={handleTechnicianFormChange}
                          placeholder={uiText.technicians.placeholders.notes}
                          disabled={isSavingTechnician || !supportsExtendedTechnicianFields}
                          rows={4}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="workspace-form-footer entity-drawer-footer">
                    <div className="workspace-form-messages">
                      {technicianFormError ? <p className="error">{technicianFormError}</p> : null}
                      {technicianFormMessage ? (
                        <p className="success-message">{technicianFormMessage}</p>
                      ) : null}
                    </div>

                    <div className="workspace-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={handleReturnTechnicianDrawerToDetail}
                        disabled={isSavingTechnician}
                      >
                        {uiText.common.cancel}
                      </button>
                      <button
                        className={isSavingTechnician ? "button is-loading" : "button"}
                        type="submit"
                        disabled={isSavingTechnician}
                      >
                        {isSavingTechnician
                          ? uiText.technicians.saving
                          : technicianDrawerMode === "edit"
                            ? uiText.technicians.update
                            : uiText.technicians.save}
                      </button>
                    </div>
                  </div>

                  {technicianDrawerMode === "edit" && selectedTechnicianId ? (
                    <div className="entity-drawer-delete-zone">
                      {isConfirmingDeleteTechnician ? (
                        <div className="detail-delete-confirmation entity-drawer-delete-confirmation">
                          <p>
                            Esta accion eliminara el tecnico de forma permanente. Solo se
                            permitira si no tiene ordenes de servicio relacionadas.
                          </p>
                          <div className="detail-delete-actions">
                            <button
                              className="button button-danger"
                              type="button"
                              onClick={handleDeleteTechnician}
                              disabled={isDeletingTechnician}
                            >
                              {isDeletingTechnician
                                ? uiText.common.loadingDashboard
                                : "Confirmar eliminacion"}
                            </button>
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => setIsConfirmingDeleteTechnician(false)}
                              disabled={isDeletingTechnician}
                            >
                              {uiText.common.cancel}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="button button-danger-secondary"
                          type="button"
                          onClick={handleRequestDeleteTechnician}
                          disabled={isSavingTechnician || isDeletingTechnician}
                        >
                          Eliminar tecnico
                        </button>
                      )}
                    </div>
                  ) : null}
                </form>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {pastDateAlertMessage ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setPastDateAlertMessage("")}
        >
          <section
            className="quick-create-modal quick-create-modal-compact quick-alert-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="past-date-alert-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="workspace-copy">
              <h3 id="past-date-alert-title">Fecha no disponible</h3>
              <p>{pastDateAlertMessage}</p>
            </div>

            <div className="workspace-form-footer quick-alert-modal-footer">
              <div className="workspace-actions">
                <button
                  className="button"
                  type="button"
                  onClick={() => setPastDateAlertMessage("")}
                >
                  OK
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
