"use client";

import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

const defaultClientSubTab = uiText.clients.subTabs.list;
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
  serviceReport: ""
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
  client: "client",
  contacts: "contacts",
  branches: "branches"
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
const dashboardTabs = {
  calendar: "calendar",
  clients: "clients",
  technicians: "technicians",
  settings: "settings"
};
const sidebarNavigationGroups = [
  {
    label: "OPERACION",
    items: [{ key: "calendar", value: dashboardTabs.calendar, icon: "CA" }]
  },
  {
    label: "GESTION",
    items: [
      { key: "clients", value: dashboardTabs.clients, icon: "CL" },
      { key: "technicians", value: dashboardTabs.technicians, icon: "TE" }
    ]
  },
  {
    label: "SISTEMA",
    items: [{ key: "settings", value: dashboardTabs.settings, icon: "SE" }]
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
  created_at,
  service_instructions,
  service_report,
  started_at,
  completed_at,
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

const defaultExecutionStatus = "pending";

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

  const match = String(timeValue).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  const normalizedHours = hours % 12 + (meridiem === "PM" ? 12 : 0);

  return normalizedHours * 60 + minutes;
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

  if (["daily", "weekly", "biweekly", "monthly"].includes(normalizedType)) {
    return normalizedType;
  }

  return defaultRecurrenceType;
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

function getClientDisplayName(client) {
  if (!client) {
    return uiText.dashboard.detailFields.clientName;
  }

  return (
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

  console.log("[Backlog DnD Debug] normalized slot to nearest service time option:", {
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

  if (view === "month") {
    return (
      <div
        className={`calendar-event calendar-event-month${
          isSelected ? " calendar-event-selected" : ""
        }`}
        title={event.tooltipText}
        data-service-order-id={event.id}
        onClick={() => {
          console.log("[Service Order Debug] EventCard onClick:", event);
          onSelect?.(event);
        }}
      >
        <span
          className="calendar-event-dot"
          style={{ backgroundColor: event.technicianColor.accent }}
        />
        {event.isOverdue ? <span className="calendar-event-overdue-dot" /> : null}
      </div>
    );
  }

  return (
    <div
      className={`calendar-event calendar-event-week${
        isSelected ? " calendar-event-selected" : ""
      }${isCompleted ? " calendar-event-completed" : ""}`}
      title={event.tooltipText}
      data-service-order-id={event.id}
      onClick={() => {
        console.log("[Service Order Debug] EventCard onClick:", event);
        onSelect?.(event);
      }}
      >
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
            console.log("[Service Order Status Debug] event quick icon clicked:", {
              serviceOrderId: event.id,
              eventStatus: event.status
            });
            onComplete?.(event);
          }}
        >
          <span aria-hidden="true">✓</span>
        </button>
      </div>
      <div className="calendar-event-week-accent" />
      <div className="calendar-event-week-copy">
        <strong className="calendar-event-week-line-primary">
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

    console.log("[Service Order Debug] CalendarEventWrapper onMouseDownCapture:", {
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

    console.log("[Service Order Debug] CalendarEventWrapper onMouseUpCapture:", {
      event,
      movedDistance,
      isResizeHandle,
      targetClassName
    });

    if (isResizeHandle || movedDistance > 6) {
      return;
    }

    console.log("[Service Order Debug] CalendarEventWrapper selecting event:", event);
    onSelect?.(event);
  };

  const handleClickCapture = (nativeEvent) => {
    console.log("[Service Order Debug] CalendarEventWrapper onClickCapture:", {
      event,
      targetClassName: String(nativeEvent.target?.className || "")
    });
  };

  // Keep the custom event renderer output intact and only attach the tooltip
  // metadata at the wrapper level so Month and Week can render differently.
  return cloneElement(children, {
    title: event.tooltipText,
    "data-service-order-id": event.id,
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

function CalendarToolbar({ label, localizer, onNavigate, onView, view, views }) {
  const viewNames = Array.isArray(views) ? views : Object.keys(views || {});
  const messages = localizer.messages;

  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-zone calendar-toolbar-zone-left">
        <div className="calendar-toolbar-group">
          <button type="button" onClick={() => onNavigate("TODAY")}>
            {messages.today}
          </button>
          <button type="button" onClick={() => onNavigate("PREV")}>
            {messages.previous}
          </button>
          <button type="button" onClick={() => onNavigate("NEXT")}>
            {messages.next}
          </button>
        </div>
      </div>

      <div className="calendar-toolbar-zone calendar-toolbar-zone-center">
        <span className="calendar-toolbar-label">{label}</span>
      </div>

      <div className="calendar-toolbar-zone calendar-toolbar-zone-right">
        <div className="calendar-toolbar-group">
          {viewNames.map((viewName) => (
            <button
              key={viewName}
              type="button"
              className={view === viewName ? "rbc-active" : undefined}
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
    return (
      <div className="workspace-section">
        <div className={isQuickCreate ? "workspace-copy workspace-copy-compact" : "workspace-copy"}>
          <h3>{uiText.serviceOrder.title}</h3>
          <p>
            {isQuickCreate
              ? "Completa lo esencial y programa el servicio rapidamente. Si aplica, marca la recurrencia desde esta vista; por ahora solo se guarda la configuracion y no se generan visitas futuras automaticamente."
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
                <label className="workspace-input-group">
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
                  <div className="detail-row workspace-quick-static-field">
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
              </div>
            ) : !formState.isOneOffLocation ? (
                  <label className="workspace-input-group">
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
              </label>
            ) : null}

                <label className="workspace-input-group">
                  <span>{uiText.serviceOrder.fields.technician}</span>
                  <select
                    name="technicianName"
                    value={formState.technicianName}
                    onChange={onFormChange}
                    disabled={isSavingOrder || isTechniciansLoading}
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
              <span>{uiText.serviceOrder.fields.serviceDate}</span>
              <input
                name="serviceDate"
                type="date"
                value={formState.serviceDate}
                onChange={onFormChange}
                disabled={isSavingOrder}
                required
              />
            </label>

                <label className="workspace-input-group">
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
            </label>

                <label className="workspace-input-group">
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

                    <label className="workspace-input-group workspace-field-wide">
                      <span>{uiText.serviceOrder.fields.oneOffLocationAddress}</span>
                      <textarea
                        name="serviceLocationAddress"
                        value={formState.serviceLocationAddress}
                        onChange={onFormChange}
                        placeholder={uiText.serviceOrder.placeholders.oneOffLocationAddress}
                        disabled={isSavingOrder}
                        rows={3}
                      />
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
                        ? "Guarda la configuracion recurrente para este servicio. Las siguientes visitas aun no se crean automaticamente."
                        : "Activalo solo si este servicio debe repetirse. Por ahora no genera visitas futuras automaticamente."}
                    </small>
                  </div>
                </div>

                {formState.isRecurring ? (
                  <>
                    <label className="workspace-input-group">
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
              {!isTechniciansLoading && activeTechnicians.length === 0 ? (
                <p className="empty-hint">{uiText.serviceOrder.technicianEmpty}</p>
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
                  isTechniciansLoading ||
                  clients.length === 0 ||
                  (!formState.isOneOffLocation &&
                    ((!isResidentialFormClient && !formState.branchId) ||
                      (isResidentialFormClient && !preferredResidentialBranch))) ||
                  (formState.isOneOffLocation &&
                    !formState.serviceLocationAddress.trim()) ||
                  activeTechnicians.length === 0 ||
                  !formState.technicianName
                }
              >
                {isSavingOrder ? uiText.serviceOrder.saving : uiText.serviceOrder.save}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (activeTab === uiText.tabs.clients) {
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
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarError, setCalendarError] = useState("");
  const [calendarActionMessage, setCalendarActionMessage] = useState("");
  const [calendarActionError, setCalendarActionError] = useState("");
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
  const [rightPanelMode, setRightPanelMode] = useState(rightPanelModes.empty);
  const [activeTab] = useState(uiText.tabs.newServiceOrder);
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState("");
  const [isClientsLoading, setIsClientsLoading] = useState(false);
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
  const [branchesError, setBranchesError] = useState("");
  const [branchFormMessage, setBranchFormMessage] = useState("");
  const [branchFormError, setBranchFormError] = useState("");
  const [isBranchesLoading, setIsBranchesLoading] = useState(false);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const [lastUsedTechnicianName, setLastUsedTechnicianName] = useState("");
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
  const [isConfirmingDeleteServiceOrder, setIsConfirmingDeleteServiceOrder] = useState(false);
  const [isDeletingServiceOrder, setIsDeletingServiceOrder] = useState(false);
  const detailDateInputRef = useRef(null);
  const createServiceOrderClientSelectRef = useRef(null);
  const draggedBacklogServiceOrderRef = useRef(null);
  const externalDragCleanupTimeoutRef = useRef(null);
  const calendarPointerStateRef = useRef({
    serviceOrderId: null,
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
  const isEditingServiceOrder =
    activeTopLevelTab === dashboardTabs.calendar && rightPanelMode === rightPanelModes.edit;
  const isCreateServiceOrderMode =
    activeTopLevelTab === dashboardTabs.calendar && rightPanelMode === rightPanelModes.create;
  const isServiceOrderDetailMode =
    activeTopLevelTab === dashboardTabs.calendar &&
    rightPanelMode === rightPanelModes.detail &&
    Boolean(selectedServiceOrder);
  const isFocusedServiceOrderPanel = isCreateServiceOrderMode || isEditingServiceOrder;
  const serviceOrderPanelStage = isFocusedServiceOrderPanel
    ? "operational"
    : isServiceOrderDetailMode
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
    () =>
      calendarEvents.filter((event) => {
        const matchesTechnician = hasActiveTechnicianFilter
          ? selectedCalendarTechnicianSet.has(event.technician)
          : true;
        const matchesOverdue = showOnlyOverdue ? Boolean(event.isOverdue) : true;

        return matchesTechnician && matchesOverdue;
      }),
    [calendarEvents, hasActiveTechnicianFilter, selectedCalendarTechnicianSet, showOnlyOverdue]
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
  const hasExistingServiceOrderData = serviceOrders.length > 0 || calendarEvents.length > 0;
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
      ? "Orden de servicio"
      : rightPanelMode === rightPanelModes.edit
        ? "Orden de servicio"
        : selectedServiceOrder
          ? "Orden de servicio"
          : uiText.dashboard.detailTitle;
  const serviceOrderPanelTitle =
    rightPanelMode === rightPanelModes.create
      ? uiText.serviceOrder.title
      : rightPanelMode === rightPanelModes.edit
        ? "Editar orden de servicio"
        : selectedServiceOrder
          ? getClientDisplayName(selectedServiceOrder.clients)
          : uiText.dashboard.detailTitle;
  const serviceOrderPanelSubtitle =
    rightPanelMode === rightPanelModes.create
      ? "Completa los datos para programar un nuevo servicio."
      : rightPanelMode === rightPanelModes.edit
        ? "Ajusta programacion, estado y la configuracion de recurrencia sin salir del calendario. Las visitas futuras aun no se generan automaticamente."
        : selectedServiceOrder
          ? `${selectedServiceLocation?.name || uiText.dashboard.branchEmpty} · ${formatServiceDate(
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
              {group.items.map((item) => (
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
                    {item.icon}
                  </span>
                  {!isSidebarCollapsed ? (
                    <span className="workspace-sidebar-nav-label">
                      {uiText.dashboard.topTabs[item.key]}
                    </span>
                  ) : null}
                </button>
              ))}
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
  const viewMode = calendarView === "month" ? "month" : "week";
  const focusedDate = calendarDate;
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

  const fetchUserProfile = async (supabase, userId) => {
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

  const fetchActiveCompany = async (supabase, companyId) => {
    if (!companyId) {
      setActiveCompany(null);
      setCompanySettingsForm(initialCompanySettingsForm);
      setCompanySettingsError("");
      setCompanySettingsMessage("");
      return null;
    }

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

  const fetchServiceOrders = async (supabase, companyId) => {
    if (!companyId) {
      setServiceOrders([]);
      setCalendarEvents([]);
      setCalendarError("");
      setSelectedServiceOrderId(null);
      setSelectedServiceOrderSnapshot(null);
      setIsServiceOrdersLoading(false);
      return;
    }

    setIsServiceOrdersLoading(true);
    console.log("[Backlog DnD Debug] fetchServiceOrders start:", { companyId });

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

    setServiceOrders(serviceOrders || []);
    setCalendarEvents(transformServiceOrdersToEvents(serviceOrders || []));
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
        console.log(
          "[Service Order Debug] fetchServiceOrders cleared selectedServiceOrderId:",
          currentSelectionId
        );
      }

      return nextSelectionExists;
    });
    setIsServiceOrdersLoading(false);
    console.log("[Backlog DnD Debug] fetchServiceOrders complete:", {
      count: (serviceOrders || []).length
    });
  };

  const fetchTechnicianOrders = async (supabase, companyId, technicianName) => {
    if (!companyId || !technicianName) {
      setTechnicianOrders([]);
      setTechnicianOrdersError("");
      setIsTechnicianOrdersLoading(false);
      return;
    }

    setIsTechnicianOrdersLoading(true);

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

  const fetchClients = async (supabase, companyId) => {
    if (!companyId) {
      console.warn("[Multi-tenant] No hay company_id activo para cargar clientes.");
      setClients([]);
      setClientsError("");
      setIsClientsLoading(false);
      return;
    }

    setIsClientsLoading(true);

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

  const fetchTechnicians = async (supabase, companyId) => {
    if (!companyId) {
      console.warn("[Multi-tenant] No hay company_id activo para cargar tecnicos.");
      setTechnicians([]);
      setTechniciansError("");
      setIsTechniciansLoading(false);
      return;
    }

    setIsTechniciansLoading(true);

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

      setCalendarEvents(transformServiceOrdersToEvents(nextServiceOrders));
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

      setCalendarEvents(transformServiceOrdersToEvents(nextServiceOrders));
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

      console.log("[Service Order Status Debug] replaceServiceOrderRecord:", {
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

  const checkTechnicianScheduleConflict = async ({
    companyId,
    technicianName,
    serviceDate,
    serviceTime,
    durationMinutes,
    excludeOrderId = null
  }) => {
    if (!companyId || !technicianName || !serviceDate || !serviceTime) {
      console.log("[Backlog DnD Debug] conflict check skipped:", {
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

    console.log("[Backlog DnD Debug] conflict check result:", {
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
    executionStatus = undefined,
    startedAt = undefined,
    completedAt = undefined,
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

    console.log("[Backlog DnD Debug] updateServiceOrderSchedule normalized input:", {
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
    console.log("[Backlog DnD Debug] updateServiceOrderSchedule optimistic patch applied:", {
      serviceOrderId,
      payload: optimisticPatch
    });

    console.log("[Backlog DnD Debug] updateServiceOrderSchedule Supabase payload:", {
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

    console.log("[Backlog DnD Debug] updateServiceOrderSchedule Supabase success:", {
      serviceOrderId,
      returnedStatus: updatedServiceOrder?.status || null
    });

    if (updatedServiceOrder) {
      replaceServiceOrderRecord(updatedServiceOrder);
    }

    console.log("[Service Order Status Debug] updateServiceOrderSchedule success:", {
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

  const getCalendarEventStyle = (event) => ({
    style: {
      background: event?.isOverdue
        ? "color-mix(in srgb, #c2410c " +
          (showOnlyOverdue ? "76%" : "68%") +
          ", #fff2ef " +
          (showOnlyOverdue ? "24%" : "32%") +
          ")"
        : "color-mix(in srgb, " +
          (event?.technicianColor?.accent || "#64748b") +
          " 56%, #f8fbff 44%)",
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
      event?.isOverdue ? "calendar-event-overdue" : "",
      event?.isOverdue && showOnlyOverdue ? "calendar-event-overdue-filtered" : "",
      event?.id === selectedServiceOrderId ? "calendar-event-shell-selected" : ""
    ]
      .filter(Boolean)
      .join(" ")
  });

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
        await fetchUserProfile(supabase, session.user.id);
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/");
        router.refresh();
        return;
      }

      setIsLoading(true);
      setIsProfileResolved(false);
      setUserProfile(null);
      setAuthUserId(session.user.id || "");
      setUserEmail(session.user.email || "");
      fetchUserProfile(supabase, session.user.id)
        .catch(() => {
          setUserProfile(null);
          setProfileError(uiText.dashboard.profileLoadError);
          setIsProfileResolved(true);
        })
        .finally(() => {
          setIsLoading(false);
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
      setActiveCompany(null);
      setCompanySettingsForm(initialCompanySettingsForm);
      setCompanySettingsError("");
      setCompanySettingsMessage("");
      return;
    }

    fetchActiveCompany(supabase, activeCompanyId).catch(() => {
      setActiveCompany(null);
      setCompanySettingsError(uiText.dashboard.companySettingsLoadError);
    });
  }, [activeCompanyId]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !activeCompanyId || isTechnicianUser) {
      setServiceOrders([]);
      setCalendarEvents([]);
      setCalendarError("");
      setIsServiceOrdersLoading(false);
      return;
    }

    fetchServiceOrders(supabase, activeCompanyId).catch(() => {
      setCalendarError(uiText.dashboard.calendarErrorBody);
      setCalendarEvents([]);
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

    fetchClients(supabase, activeCompanyId);
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

    fetchTechnicians(supabase, activeCompanyId);
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
    if (!activeEntityType) {
      setClientDrawerForm(initialClientDrawerForm);
      setContactDrawerForm(initialContactDrawerForm);
      setDrawerBranchForm(initialBranchFormState);
      return;
    }

    if (activeEntityType === "client") {
      setActiveClientDrawerTab(clientDrawerTabs.client);
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
  }, [activeBranch, activeClient, activeEntityType]);

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
        currentMode === rightPanelModes.create ? currentMode : rightPanelModes.empty
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
      ...getRecurrenceFormState(selectedServiceOrder),
      status: selectedServiceOrder.status || "scheduled"
    });
    setDetailFormMessage("");
    setDetailFormError("");
    setIsConfirmingDeleteServiceOrder(false);
    setRightPanelMode(rightPanelModes.detail);
  }, [selectedServiceOrder]);

  useEffect(() => {
    console.log("[Service Order Debug] Selection state:", {
      selectedServiceOrderId,
      selectedServiceOrderSnapshot,
      selectedServiceOrder
    });
  }, [selectedServiceOrderId, selectedServiceOrderSnapshot, selectedServiceOrder]);

  useEffect(() => {
    console.log("[Service Order Debug] Detail panel render gate:", {
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

    fetchTechnicians(supabase, activeCompanyId);
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

    fetchTechnicianOrders(supabase, activeCompanyId, userProfile.full_name);
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
    console.log("Edit client", client);
  };

  const handleOpenClientDrawerDetail = (client) => {
    setSelectedClientId(client.id);
    setActiveEntityType("client");
    setActiveEntityId(client.id);
    setActiveParentClientId(null);
    setActiveMode("detail");
    setActiveClientDrawerTab(clientDrawerTabs.client);
  };

  const handleClientHierarchyCreateBranch = (client) => {
    setActiveEntityType("branch");
    setActiveEntityId(null);
    setActiveParentClientId(client.id);
    setActiveMode("create");
    setActiveClientDrawerTab(clientDrawerTabs.branches);
    console.log("Create branch for client", client);
  };

  const handleClientHierarchyEditBranch = (branch) => {
    setActiveEntityType("branch");
    setActiveEntityId(branch.id);
    setActiveParentClientId(branch.client_id || null);
    setActiveMode("edit");
    setActiveClientDrawerTab(clientDrawerTabs.branches);
    console.log("Edit branch", branch);
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
      setActiveClientDrawerTab(clientDrawerTabs.client);
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
    await createServiceOrderWithState({
      orderState: formState,
      selectedClient: selectedFormClient,
      branchesForClient: availableBranches,
      setError: setFormError,
      setSuccess: setFormMessage,
      setSaving: setIsSavingOrder,
      resetState: () => setFormState(initialFormState),
      onSuccess: () => {
        setLastUsedTechnicianName(formState.technicianName.trim());
        setRightPanelMode(rightPanelModes.detail);
      }
    });
  };

  const handleOpenQuickCreate = (slotInfo) => {
    const slotStart = slotInfo?.start instanceof Date ? slotInfo.start : new Date();
    const preferredTechnicianName =
      selectedCalendarTechnicians.length === 1
        ? selectedCalendarTechnicians[0]
        : lastUsedTechnicianName;
    const nextServiceDate = getServiceDateFromCalendarSlot(slotStart);
    const nextServiceTime = getServiceTimeFromCalendarSlot(
      slotStart,
      calendarView,
      serviceTimeOptions
    );

    if (rightPanelMode === rightPanelModes.create) {
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
    setFormError("");
    setFormMessage("");
    setFormState({
      ...initialFormState,
      technicianName: preferredTechnicianName,
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
    console.log("[Service Order Debug] Clicked calendar event:", event);

    const resolvedServiceOrder =
      event?.resource ||
      event?.serviceOrder ||
      serviceOrders.find((serviceOrder) => serviceOrder.id === event?.id) ||
      null;

    if (!resolvedServiceOrder?.id) {
      console.warn("[Service Order Debug] No se pudo resolver la orden desde el evento.");
      return;
    }

    console.log("[Service Order Debug] Resolved order candidate:", resolvedServiceOrder);
    setSelectedServiceOrderId(resolvedServiceOrder.id);
    setSelectedServiceOrderSnapshot(resolvedServiceOrder);
    setRightPanelMode(rightPanelModes.detail);
    console.log("[Service Order Debug] Saving selection:", {
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
    const eventCardNode = nativeEvent.target.closest?.("[data-service-order-id]");
    const targetClassName = String(nativeEvent.target?.className || "");
    const isResizeHandle = targetClassName.includes("rbc-addons-dnd-resize");

    calendarPointerStateRef.current = {
      serviceOrderId: eventCardNode?.getAttribute("data-service-order-id") || null,
      x: nativeEvent.clientX,
      y: nativeEvent.clientY,
      isResizeHandle
    };

    console.log("[Service Order Debug] Calendar shell mouseDownCapture:", {
      serviceOrderId: calendarPointerStateRef.current.serviceOrderId,
      isResizeHandle,
      targetClassName
    });
  };

  const handleCalendarMouseUpCapture = (nativeEvent) => {
    const eventCardNode = nativeEvent.target.closest?.("[data-service-order-id]");
    const targetClassName = String(nativeEvent.target?.className || "");
    const pointerState = calendarPointerStateRef.current;
    const currentServiceOrderId =
      eventCardNode?.getAttribute("data-service-order-id") || null;
    const movedDistance =
      Math.abs(nativeEvent.clientX - pointerState.x) +
      Math.abs(nativeEvent.clientY - pointerState.y);
    const isResizeHandle =
      pointerState.isResizeHandle || targetClassName.includes("rbc-addons-dnd-resize");

    console.log("[Service Order Debug] Calendar shell mouseUpCapture:", {
      currentServiceOrderId,
      pointerServiceOrderId: pointerState.serviceOrderId,
      movedDistance,
      isResizeHandle,
      targetClassName
    });

    if (
      !currentServiceOrderId ||
      currentServiceOrderId !== pointerState.serviceOrderId ||
      isResizeHandle ||
      movedDistance > 6
    ) {
      return;
    }

    const resolvedCalendarEvent =
      filteredCalendarEvents.find(
        (calendarEvent) => String(calendarEvent.id) === currentServiceOrderId
      ) ||
      calendarEvents.find((calendarEvent) => String(calendarEvent.id) === currentServiceOrderId) ||
      null;

    console.log("[Service Order Debug] VISIBLE EVENT CLICK WORKED", {
      currentServiceOrderId,
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
      console.log("[Service Order Status Debug] edit save requested:", {
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
      console.log("[Service Order Status Debug] edit save completed:", {
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
    console.log("[Service Order Debug] onEventDrop:", { event, start });

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
    console.log("[Backlog DnD Debug] drag start:", {
      serviceOrderId: serviceOrder?.id,
      technicianName: serviceOrder?.technician_name,
      serviceDate: serviceOrder?.service_date,
      serviceTime: serviceOrder?.service_time,
      durationMinutes: resolveDurationMinutes(serviceOrder?.duration_minutes)
    });
  };

  const handleBacklogDragEnd = () => {
    console.log("[Backlog DnD Debug] drag end fired:", {
      serviceOrderId: draggedBacklogServiceOrderRef.current?.id || null
    });

    if (externalDragCleanupTimeoutRef.current) {
      clearTimeout(externalDragCleanupTimeoutRef.current);
    }

    externalDragCleanupTimeoutRef.current = setTimeout(() => {
      console.log("[Backlog DnD Debug] drag cleanup after dragend:", {
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

    console.log("[Backlog DnD Debug] drop received:", {
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

    console.log("[Backlog DnD Debug] drop normalized target:", {
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

      console.log("[Backlog DnD Debug] drop update completed:", {
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
    console.log("[Service Order Debug] onEventResize:", { event, end });

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

  const handleQuickCompleteServiceOrder = async (event) => {
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

    console.log("[Service Order Status Debug] quick toggle requested:", {
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
      console.log("[Service Order Status Debug] quick toggle completed:", {
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
    console.log("[Service Order Debug] Selected service order:", selectedServiceOrder);
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
                + {uiText.tabs.newServiceOrder}
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
                <h2>
                  {activeAdminView === adminViewTabs.calendar
                    ? uiText.dashboard.calendarTitle
                    : uiText.serviceList.title}
                </h2>
              </div>
              <div className="calendar-panel-row-right">
                <div className="admin-view-tabs" role="tablist" aria-label={uiText.serviceList.title}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAdminView === adminViewTabs.calendar}
                    className={
                      activeAdminView === adminViewTabs.calendar
                        ? "admin-view-tab admin-view-tab-active"
                        : "admin-view-tab"
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
                        ? "admin-view-tab admin-view-tab-active"
                        : "admin-view-tab"
                    }
                    onClick={() => setActiveAdminView(adminViewTabs.list)}
                  >
                    {uiText.serviceList.tabs.list}
                  </button>
                </div>
              </div>
            </div>

            <div className="calendar-panel-row calendar-panel-row-2">
              <div className="calendar-panel-row-left">
                {technicianLegendItems.length > 0 ? (
                  <div
                    className="calendar-legend calendar-legend-header"
                    aria-label={uiText.dashboard.calendarLegendTitle}
                  >
                    <div className="calendar-legend-header-copy">
                      <span className="calendar-legend-title control-group-label">
                        {uiText.dashboard.calendarLegendTitle}
                      </span>
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
                    <div className="calendar-legend-items control-group-body">
                      {technicianLegendItems.map((item) => {
                        const isActive = selectedCalendarTechnicianSet.has(item.technicianName);

                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={
                              isActive
                                ? "calendar-legend-item calendar-legend-item-active"
                                : "calendar-legend-item"
                            }
                            aria-pressed={isActive}
                            onClick={() => toggleCalendarTechnicianFilter(item.technicianName)}
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
                  </div>
                ) : activeAdminView === adminViewTabs.list ? (
                  <p className="calendar-panel-subtitle">{uiText.serviceList.subtitle}</p>
                ) : null}
              </div>
              <div className="calendar-panel-row-right" />
            </div>

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
          calendarView !== operationalCalendarView &&
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

                    console.log("[Backlog DnD Debug] dragFromOutsideItem:", {
                      serviceOrderId: draggedBacklogServiceOrderRef.current?.id || null,
                      previewItem
                    });

                    return previewItem;
                  }}
                  draggableAccessor={() => true}
                  resizable={calendarView !== "month"}
                  eventPropGetter={getCalendarEventStyle}
                  style={{ height: 640 }}
                  components={{
                    toolbar: CalendarToolbar,
                    event: (eventProps) => (
                      <EventCard
                        {...eventProps}
                        view={calendarView}
                        onSelect={handleSelectServiceOrder}
                        isSelected={eventProps.event?.id === selectedServiceOrderId}
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
              </div>
              <div className="calendar-panel-row calendar-panel-row-2">
                <div className="calendar-panel-row-left">
                  <p className="calendar-panel-subtitle">{uiText.dashboard.clientsPanelBody}</p>
                </div>
              </div>
            </div>

            {filteredClients.length === 0 ? (
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
                    onClick={handleCompleteSelectedServiceOrder}
                    disabled={isSavingDetail || isDeletingServiceOrder}
                  >
                    Completar
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
            ) : !selectedOrder ? (
              <div className="detail-empty-state">
                <p>Selecciona una orden del calendario</p>
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
                    <span className="detail-sidebar-kicker">Resumen</span>
                    <strong>{getClientDisplayName(selectedOrder.clients)}</strong>
                    <p>{selectedServiceLocation?.name || uiText.dashboard.branchEmpty}</p>
                  </div>
                  <div className="detail-identity-meta">
                    <span>{getTechnicianDisplayName(selectedOrder.technician_name)}</span>
                    <span>
                      {formatServiceDate(selectedOrder.service_date)} ·{" "}
                      {formatDisplayTime(selectedOrder.service_time)}
                    </span>
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
                    <h4 className="drawer-section-title">Programacion</h4>
                  </div>

                  <div className="detail-section-grid detail-section-grid-2">
                    <div className="detail-row">
                      <span>{uiText.dashboard.detailFields.technicianName}</span>
                      <strong>{getTechnicianDisplayName(selectedOrder.technician_name)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{uiText.dashboard.detailFields.serviceDate}</span>
                      <strong>{formatServiceDate(selectedOrder.service_date)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{uiText.dashboard.detailFields.serviceTime}</span>
                      <strong>{formatDisplayTime(selectedOrder.service_time)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{uiText.serviceOrder.fields.duration}</span>
                      <strong>{resolveDurationMinutes(selectedOrder.duration_minutes)} min</strong>
                    </div>
                  </div>
                </section>

                {selectedOrder.service_instructions ? (
                  <section className="drawer-section detail-section-card">
                    <div className="entity-drawer-section-header">
                      <h4 className="drawer-section-title">Instrucciones de servicio</h4>
                    </div>

                    <div className="detail-section-grid">
                      <div className="detail-row detail-row-notes">
                        <strong>{selectedOrder.service_instructions}</strong>
                      </div>
                    </div>
                  </section>
                ) : null}

                {selectedOrder.status === "completed" && selectedOrder.service_report ? (
                  <section className="drawer-section detail-section-card">
                    <div className="entity-drawer-section-header">
                      <h4 className="drawer-section-title">Reporte del servicio</h4>
                    </div>

                    <div className="detail-section-grid">
                      {selectedOrder.completed_at ? (
                        <div className="detail-row">
                          <span>Completado el</span>
                          <strong>{formatCompletedAt(selectedOrder.completed_at)}</strong>
                        </div>
                      ) : null}

                      <div className="detail-row detail-row-notes">
                        <strong>{selectedOrder.service_report}</strong>
                      </div>
                    </div>
                  </section>
                ) : null}

                <section className="drawer-section detail-section-card">
                  <div className="entity-drawer-section-header">
                    <h4 className="drawer-section-title">Estado</h4>
                  </div>

                  <div className="detail-section-grid">
                    <div className="detail-status-summary">
                      <span className="detail-status-badge">
                        {getStatusLabel(selectedOrder.status)}
                      </span>
                    </div>

                    {isSelectedServiceOrderOverdue ? (
                      <div className="detail-overdue-box">
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

                    <section className="drawer-section detail-section-card">
                      <div className="entity-drawer-section-header">
                        <h4 className="drawer-section-title">Resumen</h4>
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
    </main>
  );
}
