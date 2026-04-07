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
  isCompletedStatus,
  isOverdueServiceOrder,
  parseServiceOrderStart,
  resolveDurationMinutes
} from "../../lib/serviceOrderUtils";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { formatDisplayTime, getStatusLabel, uiText } from "../../lib/uiText";

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

const workspaceTabs = [
  uiText.tabs.newServiceOrder,
  uiText.tabs.clients,
  uiText.tabs.technicians,
  uiText.tabs.reports
];

const defaultClientSubTab = uiText.clients.subTabs.list;
const defaultTechnicianSubTab = uiText.technicians.subTabs.list;

const initialFormState = {
  clientId: "",
  branchId: "",
  technicianName: "",
  serviceDate: "",
  serviceTime: "9:00 AM",
  durationMinutes: 60,
  isRecurring: false,
  recurrenceType: "weekly",
  recurrenceEndDate: "",
  status: "scheduled",
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
  branchId: "",
  technicianName: "",
  serviceDate: "",
  serviceTime: "9:00 AM",
  durationMinutes: 60,
  isRecurring: false,
  recurrenceType: "weekly",
  recurrenceEndDate: "",
  status: "scheduled"
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
  address: "",
  clientType: "commercial"
};

const initialQuickBranchState = {
  name: "",
  address: ""
};

const quickCreateNewBranchOption = "__new_branch__";

const technicianColorPalette = [
  { background: "#e9f2ff", border: "#bfd6ff", accent: "#1d4ed8", text: "#163b75" },
  { background: "#eaf7ef", border: "#bfe3cb", accent: "#15803d", text: "#166534" },
  { background: "#fff3e8", border: "#f4d1af", accent: "#c2410c", text: "#9a3412" },
  { background: "#f5efff", border: "#d8c7ff", accent: "#7c3aed", text: "#5b21b6" },
  { background: "#eef7f7", border: "#bfe1df", accent: "#0f766e", text: "#115e59" },
  { background: "#fff1f3", border: "#f4c6d1", accent: "#db2777", text: "#9d174d" }
];

const quickCreateNewClientOption = "__new_client__";
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
const operationalCalendarView = "operational";

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
    const technicianColor = getTechnicianColorToken(serviceOrder.technician_name);
    const clientName = getClientDisplayName(serviceOrder.clients);
    const branchName = getBranchDisplayName(serviceOrder.branches);
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
        `Sucursal: ${branchName || uiText.dashboard.branchEmpty}`,
        `Tecnico: ${getTechnicianDisplayName(serviceOrder.technician_name)}`,
        `Hora: ${formatDisplayTime(serviceOrder.service_time) || "-"}`
      ].join("\n"),
      start,
      end: addMinutes(start, durationMinutes)
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

  return matchingOption?.value || initialFormState.serviceTime;
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

function EventCard({ event, view, onSelect, isSelected }) {
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
      }`}
      title={event.tooltipText}
      data-service-order-id={event.id}
      onClick={() => {
        console.log("[Service Order Debug] EventCard onClick:", event);
        onSelect?.(event);
      }}
    >
      <div className="calendar-event-week-accent" />
      <div className="calendar-event-week-copy">
        <strong>{event.clientName}</strong>
        <span>{event.branchName}</span>
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
  onTechnicianSubmit
}) {
  if (activeTab === uiText.tabs.newServiceOrder) {
    return (
      <div className="workspace-section">
        <div className="workspace-copy">
          <h3>{uiText.serviceOrder.title}</h3>
          <p>{uiText.serviceOrder.description}</p>
        </div>

        <form className="workspace-form" onSubmit={onSubmit}>
          <div className="workspace-grid">
            <label className="workspace-input-group">
              <span>{uiText.serviceOrder.fields.client}</span>
              <select
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

            {isResidentialFormClient ? (
              <div className="detail-row workspace-field-wide">
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
            ) : (
              <label className="workspace-input-group">
                <span>{uiText.serviceOrder.fields.branch}</span>
                <select
                  name="branchId"
                  value={formState.branchId}
                  onChange={onFormChange}
                  disabled={isSavingOrder || isClientsLoading || !formState.clientId}
                  required
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
            )}

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

            <label className="workspace-checkbox workspace-field-wide">
              <input
                name="isRecurring"
                type="checkbox"
                checked={formState.isRecurring}
                onChange={onFormChange}
                disabled={isSavingOrder}
              />
              <span>{uiText.serviceOrder.fields.isRecurring}</span>
            </label>

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

            <label className="workspace-input-group">
              <span>{uiText.serviceOrder.fields.status}</span>
              <SegmentedControl
                name="status"
                value={formState.status}
                onChange={onFormChange}
                options={serviceOrderStatusOptions}
                disabled={isSavingOrder}
              />
            </label>

            <label className="workspace-input-group workspace-field-wide">
              <span>{uiText.serviceOrder.fields.notes}</span>
              <textarea
                name="notes"
                value={formState.notes}
                onChange={onFormChange}
                placeholder={uiText.serviceOrder.placeholders.notes}
                disabled={isSavingOrder}
                rows={5}
              />
            </label>
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
              isResidentialFormClient &&
              !isBranchesLoading &&
              !preferredResidentialBranch ? (
                <p className="empty-hint">{uiText.serviceOrder.residentialBranchMissing}</p>
              ) : null}
              {formState.clientId &&
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

            <button
              className="button"
              type="submit"
              disabled={
                isSavingOrder ||
                isClientsLoading ||
                isTechniciansLoading ||
                clients.length === 0 ||
                (!isResidentialFormClient && !formState.branchId) ||
                (isResidentialFormClient && !preferredResidentialBranch) ||
                activeTechnicians.length === 0 ||
                !formState.technicianName
              }
            >
              {isSavingOrder ? uiText.serviceOrder.saving : uiText.serviceOrder.save}
            </button>
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
  const [activeAdminView, setActiveAdminView] = useState(adminViewTabs.calendar);
  const [selectedCalendarTechnician, setSelectedCalendarTechnician] = useState("all");
  const [draggedBacklogServiceOrder, setDraggedBacklogServiceOrder] = useState(null);
  const [serviceListClientSearch, setServiceListClientSearch] = useState("");
  const [serviceListTechnician, setServiceListTechnician] = useState("all");
  const [serviceListRecurring, setServiceListRecurring] = useState("all");
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [selectedServiceOrderId, setSelectedServiceOrderId] = useState(null);
  const [selectedServiceOrderSnapshot, setSelectedServiceOrderSnapshot] = useState(null);
  const [activeTab, setActiveTab] = useState(uiText.tabs.newServiceOrder);
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState("");
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [clientSubTab, setClientSubTab] = useState(defaultClientSubTab);
  const [clientForm, setClientForm] = useState(initialClientFormState);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedBranchClientId, setSelectedBranchClientId] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [clientFormMessage, setClientFormMessage] = useState("");
  const [clientFormError, setClientFormError] = useState("");
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [branchForm, setBranchForm] = useState(initialBranchFormState);
  const [branchesByClientId, setBranchesByClientId] = useState({});
  const [branchesError, setBranchesError] = useState("");
  const [branchFormMessage, setBranchFormMessage] = useState("");
  const [branchFormError, setBranchFormError] = useState("");
  const [isBranchesLoading, setIsBranchesLoading] = useState(false);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateState, setQuickCreateState] = useState(initialFormState);
  const [quickCreateError, setQuickCreateError] = useState("");
  const [quickCreateMessage, setQuickCreateMessage] = useState("");
  const [isInlineQuickClientOpen, setIsInlineQuickClientOpen] = useState(false);
  const [quickClientState, setQuickClientState] = useState(initialQuickClientState);
  const [quickClientError, setQuickClientError] = useState("");
  const [quickClientMessage, setQuickClientMessage] = useState("");
  const [isSavingQuickClient, setIsSavingQuickClient] = useState(false);
  const [isInlineQuickBranchOpen, setIsInlineQuickBranchOpen] = useState(false);
  const [quickBranchState, setQuickBranchState] = useState(initialQuickBranchState);
  const [quickBranchError, setQuickBranchError] = useState("");
  const [quickBranchMessage, setQuickBranchMessage] = useState("");
  const [isSavingQuickBranch, setIsSavingQuickBranch] = useState(false);
  const [isQuickCreatingOrder, setIsQuickCreatingOrder] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [techniciansError, setTechniciansError] = useState("");
  const [isTechniciansLoading, setIsTechniciansLoading] = useState(false);
  const [technicianSubTab, setTechnicianSubTab] = useState(defaultTechnicianSubTab);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(null);
  const [technicianForm, setTechnicianForm] = useState(initialTechnicianFormState);
  const [technicianFormMessage, setTechnicianFormMessage] = useState("");
  const [technicianFormError, setTechnicianFormError] = useState("");
  const [isSavingTechnician, setIsSavingTechnician] = useState(false);
  const [supportsExtendedTechnicianFields, setSupportsExtendedTechnicianFields] =
    useState(true);
  const [detailFormState, setDetailFormState] = useState(initialDetailFormState);
  const [detailFormMessage, setDetailFormMessage] = useState("");
  const [detailFormError, setDetailFormError] = useState("");
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const detailDateInputRef = useRef(null);
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
  const overdueCount = calendarEvents.filter((event) => Boolean(event.isOverdue)).length;
  const toggleOverdueFilter = () => {
    setShowOnlyOverdue((currentState) => !currentState);
  };
  const filteredCalendarEvents = calendarEvents.filter((event) => {
    const matchesTechnician =
      selectedCalendarTechnician && selectedCalendarTechnician !== "all"
        ? event.technician === selectedCalendarTechnician
        : true;
    const matchesOverdue = showOnlyOverdue ? Boolean(event.isOverdue) : true;

    return matchesTechnician && matchesOverdue;
  });
  const backlogServiceOrders = useMemo(
    () =>
      serviceOrders
        .filter((serviceOrder) => {
          const matchesTechnician =
            selectedCalendarTechnician && selectedCalendarTechnician !== "all"
              ? serviceOrder.technician_name === selectedCalendarTechnician
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
    [selectedCalendarTechnician, serviceOrders]
  );
  const serviceListTechnicianOptions = useMemo(
    () =>
      Array.from(
        new Set(
          serviceOrders
            .map(
              (serviceOrder) =>
                serviceOrder.technician_name || uiText.dashboard.calendarTechnicianFallback
            )
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [serviceOrders]
  );
  const filteredServiceOrders = useMemo(() => {
    const normalizedClientSearch = serviceListClientSearch.trim().toLowerCase();

    return serviceOrders.filter((serviceOrder) => {
      const clientName = getClientDisplayName(serviceOrder.clients);
      const technicianName =
        serviceOrder.technician_name || uiText.dashboard.calendarTechnicianFallback;
      const matchesClient = normalizedClientSearch
        ? clientName.toLowerCase().includes(normalizedClientSearch)
        : true;
      const matchesTechnician =
        serviceListTechnician !== "all" ? technicianName === serviceListTechnician : true;
      const matchesRecurring =
        serviceListRecurring === "all"
          ? true
          : serviceListRecurring === "yes"
            ? Boolean(serviceOrder.is_recurring)
            : !serviceOrder.is_recurring;

      return matchesClient && matchesTechnician && matchesRecurring;
    });
  }, [
    serviceListClientSearch,
    serviceListRecurring,
    serviceListTechnician,
    serviceOrders
  ]);
  const selectedFormClient =
    clients.find((client) => client.id === formState.clientId) || null;
  const isResidentialFormClient = isResidentialClient(selectedFormClient?.client_type);
  const preferredResidentialBranch = resolvePreferredBranch(availableBranches);
  const quickAvailableBranches = branchesByClientId[quickCreateState.clientId] || [];
  const selectedQuickClient =
    clients.find((client) => client.id === quickCreateState.clientId) || null;
  const isResidentialQuickClient = isResidentialClient(selectedQuickClient?.client_type);
  const preferredQuickResidentialBranch = resolvePreferredBranch(quickAvailableBranches);
  const selectedDetailClient = selectedServiceOrder?.clients || null;
  const isResidentialDetailClient = isResidentialClient(selectedDetailClient?.client_type);
  const detailAvailableBranches = branchesByClientId[selectedServiceOrder?.client_id] || [];
  const preferredDetailResidentialBranch = resolvePreferredBranch(detailAvailableBranches);
  const isSelectedServiceOrderOverdue = selectedServiceOrder
    ? isOverdueServiceOrder(
        selectedServiceOrder.service_date,
        selectedServiceOrder.service_time,
        selectedServiceOrder.status,
        selectedServiceOrder.duration_minutes
      )
    : false;

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

    // Read service orders together with the related client record so each
    // calendar event can show the customer's name without extra requests.
    const { data: serviceOrders, error } = await supabase
      .from("service_orders")
      .select(
        `
          id,
          technician_name,
          service_date,
          service_time,
          status,
          duration_minutes,
          is_recurring,
          recurrence_type,
          recurrence_interval,
          recurrence_end_date,
          recurrence_group_id,
          parent_service_order_id,
          created_at,
          client_id,
          branch_id,
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
        `
      )
      .eq("company_id", companyId)
      .order("service_date", { ascending: true })
      .order("service_time", { ascending: true });

    if (error) {
      setIsServiceOrdersLoading(false);
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
      .select(
        `
          id,
          technician_name,
          service_date,
          service_time,
          status,
          duration_minutes,
          is_recurring,
          recurrence_type,
          recurrence_interval,
          recurrence_end_date,
          recurrence_group_id,
          parent_service_order_id,
          created_at,
          notes,
          client_id,
          branch_id,
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
        `
      )
      .eq("company_id", companyId)
      .eq("service_date", getTodayDateString())
      .eq("technician_name", technicianName)
      .order("service_time", { ascending: true });

    let { data, error } = await query;

    if (error) {
      const fallbackQuery = await supabase
        .from("service_orders")
        .select(
          `
            id,
            technician_name,
            service_date,
            service_time,
            status,
            duration_minutes,
            is_recurring,
            recurrence_type,
            recurrence_interval,
            recurrence_end_date,
            recurrence_group_id,
            parent_service_order_id,
            created_at,
            client_id,
            branch_id,
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
          `
        )
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

    const supabase = getSupabaseClient();

    if (!supabase) {
      setError(uiText.serviceOrder.configError);
      return;
    }

    if (!activeCompanyId) {
      setError(uiText.dashboard.profileLoadError);
      return;
    }

    const resolvedBranchId = resolveServiceOrderBranchId(
      selectedClient,
      orderState.branchId,
      branchesForClient
    );

    if (!resolvedBranchId) {
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

    setSaving(true);

    const payload = {
      company_id: activeCompanyId,
      client_id: orderState.clientId,
      branch_id: resolvedBranchId,
      technician_name: orderState.technicianName.trim(),
      service_date: orderState.serviceDate,
      service_time: orderState.serviceTime.trim(),
      duration_minutes: resolveDurationMinutes(orderState.durationMinutes),
      status: orderState.status,
      ...buildRecurrencePayload(orderState)
    };

    const { error } = await supabase.from("service_orders").insert(payload);

    if (error) {
      setError(error.message || uiText.serviceOrder.createError);
      setSaving(false);
      return;
    }

    try {
      await fetchServiceOrders(supabase, activeCompanyId);
      setSuccess(uiText.serviceOrder.success);
      resetState();
      onSuccess?.();
    } catch (_refreshError) {
      setCalendarError(uiText.serviceOrder.refreshError);
    }

    setSaving(false);
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
      return false;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      return false;
    }

    const candidateStart = parseServiceOrderStart(serviceDate, serviceTime);

    if (!isValid(candidateStart)) {
      return false;
    }

    const candidateEnd = addMinutes(
      candidateStart,
      resolveDurationMinutes(durationMinutes)
    );

    const { data, error } = await supabase
      .from("service_orders")
      .select("id, service_date, service_time, status, duration_minutes")
      .eq("company_id", companyId)
      .eq("technician_name", technicianName)
      .eq("service_date", serviceDate)
      .in("status", ["scheduled"])
      .order("service_time", { ascending: true });

    if (error || !data) {
      return false;
    }

    return data.some((serviceOrder) => {
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
  };

  const updateServiceOrderSchedule = async ({
    serviceOrderId,
    technicianName,
    serviceDate,
    serviceTime,
    durationMinutes,
    status,
    recurrenceState = null,
    existingOrder = null,
    branchId = undefined,
    excludeOrderId = null
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

    const payload = {
      technician_name: technicianName,
      service_date: serviceDate,
      service_time: serviceTime,
      duration_minutes: resolveDurationMinutes(durationMinutes),
      status
    };

    if (recurrenceState) {
      Object.assign(payload, buildRecurrencePayload(recurrenceState, existingOrder));
    }

    if (branchId !== undefined) {
      payload.branch_id = branchId;
    }

    const { error } = await supabase
      .from("service_orders")
      .update(payload)
      .eq("id", serviceOrderId)
      .eq("company_id", activeCompanyId);

    if (error) {
      throw new Error(error.message || uiText.dashboard.detailError);
    }

    await fetchServiceOrders(supabase, activeCompanyId);
  };

  const getCalendarEventStyle = (event) => ({
    style: {
      background: event?.isOverdue
        ? "color-mix(in srgb, #fff4f2 72%, " +
          (event?.technicianColor?.background || "#edf2f7") +
          " 28%)"
        : event?.technicianColor?.background || "#edf2f7",
      borderColor: event?.isOverdue
        ? "#f4b6a8"
        : event?.technicianColor?.border || "#d7e0ea",
      color: event?.isOverdue
        ? "#9f2d16"
        : event?.technicianColor?.text || "#334155",
      boxShadow: `0 3px 10px ${
        (event?.isOverdue ? "#c2410c" : event?.technicianColor?.accent || "#64748b") +
        "18"
      }`
    },
    className: [
      event?.isOverdue ? "calendar-event-overdue" : "",
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

  const saveClientRecord = async ({ clientState, clientId = null }) => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error(uiText.clients.configError);
    }

    if (!activeCompanyId) {
      throw new Error(uiText.dashboard.profileLoadError);
    }

    const businessName = clientState.businessName.trim();
    const tradeName = clientState.tradeName.trim();
    const payload = {
      company_id: activeCompanyId,
      name: tradeName || businessName,
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

    if (savedClient?.id) {
      const { count, error: branchCountError } = await supabase
        .from("branches")
        .select("id", { count: "exact", head: true })
        .eq("client_id", savedClient.id)
        .eq("company_id", activeCompanyId);

      if (!branchCountError && count === 0) {
        await supabase.from("branches").insert(
          buildDefaultBranchPayload(normalizeClientRecord(savedClient), activeCompanyId)
        );
      }
    }

    await fetchClients(supabase, activeCompanyId);
    return normalizeClientRecord(savedClient);
  };

  const saveBranchRecord = async ({ branchState, clientId, preserveOrderClient = false }) => {
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
      phone: "",
      contact: "",
      notes: ""
    };

    const { data: savedBranch, error } = await supabase
      .from("branches")
      .insert(payload)
      .select("id, client_id, name, address, phone, contact, notes, created_at")
      .single();

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
      (!isQuickCreateOpen &&
        activeTab !== uiText.tabs.newServiceOrder &&
        activeTab !== uiText.tabs.clients) ||
      clients.length > 0
    ) {
      return;
    }

    fetchClients(supabase, activeCompanyId);
  }, [activeCompanyId, activeTab, clients.length, isQuickCreateOpen, isTechnicianUser]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (
      !supabase ||
      !activeCompanyId ||
      isTechnicianUser ||
      (!isQuickCreateOpen &&
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
    isQuickCreateOpen,
    isTechnicianUser
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

    if (!supabase || !activeCompanyId || !quickCreateState.clientId) {
      return;
    }

    fetchBranchesForClient(supabase, quickCreateState.clientId, activeCompanyId);
  }, [activeCompanyId, clients, quickCreateState.clientId]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !activeCompanyId || !selectedBranchClientId) {
      return;
    }

    fetchBranchesForClient(supabase, selectedBranchClientId, activeCompanyId);
  }, [activeCompanyId, clients, selectedBranchClientId]);

  useEffect(() => {
    if (!selectedServiceOrder) {
      setDetailFormState(initialDetailFormState);
      setDetailFormMessage("");
      setDetailFormError("");
      return;
    }

    // Mirror the selected order into local form state so the side panel can edit it.
    setDetailFormState({
      branchId: selectedServiceOrder.branch_id || "",
      technicianName: selectedServiceOrder.technician_name || "",
      serviceDate: selectedServiceOrder.service_date || "",
      serviceTime: selectedServiceOrder.service_time || "9:00 AM",
      durationMinutes: resolveDurationMinutes(selectedServiceOrder.duration_minutes),
      ...getRecurrenceFormState(selectedServiceOrder),
      status: selectedServiceOrder.status || "scheduled"
    });
    setDetailFormMessage("");
    setDetailFormError("");
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

    if (!supabase || !activeCompanyId || !selectedServiceOrder?.client_id) {
      return;
    }

    fetchBranchesForClient(supabase, selectedServiceOrder.client_id, activeCompanyId);
  }, [activeCompanyId, selectedServiceOrder?.client_id]);

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
      branchId: name === "clientId" ? "" : currentState.branchId,
      recurrenceType:
        name === "isRecurring" && checked === false
          ? defaultRecurrenceType
          : currentState.recurrenceType,
      recurrenceEndDate:
        name === "isRecurring" && checked === false ? "" : currentState.recurrenceEndDate,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleQuickCreateChange = (event) => {
    const { name, value } = event.target;

    setQuickCreateError("");
    setQuickCreateMessage("");

    if (name === "clientId" && value === quickCreateNewClientOption) {
      setIsInlineQuickClientOpen(true);
      setIsInlineQuickBranchOpen(false);
      setQuickClientError("");
      setQuickClientMessage("");
      return;
    }

    if (name === "branchId" && value === quickCreateNewBranchOption) {
      setIsInlineQuickBranchOpen(true);
      setIsInlineQuickClientOpen(false);
      setQuickBranchError("");
      setQuickBranchMessage("");
      return;
    }

    setQuickCreateState((currentState) => ({
      ...currentState,
      branchId: name === "clientId" ? "" : currentState.branchId,
      [name]: value
    }));
  };

  const handleQuickClientChange = (event) => {
    const { name, value } = event.target;

    setQuickClientError("");
    setQuickClientMessage("");
    setQuickClientState((currentState) => ({
      ...currentState,
      [name]: value
    }));
  };

  const handleQuickBranchChange = (event) => {
    const { name, value } = event.target;

    setQuickBranchError("");
    setQuickBranchMessage("");
    setQuickBranchState((currentState) => ({
      ...currentState,
      [name]: value
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
      recurrenceType:
        name === "isRecurring" && checked === false
          ? defaultRecurrenceType
          : currentState.recurrenceType,
      recurrenceEndDate:
        name === "isRecurring" && checked === false ? "" : currentState.recurrenceEndDate,
      [name]: type === "checkbox" ? checked : value
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
      resetState: () => setFormState(initialFormState)
    });
  };

  const handleOpenQuickCreate = (slotInfo) => {
    const slotStart = slotInfo?.start instanceof Date ? slotInfo.start : new Date();

    setQuickCreateError("");
    setQuickCreateMessage("");
    setIsInlineQuickClientOpen(false);
    setQuickClientState(initialQuickClientState);
    setQuickClientError("");
    setQuickClientMessage("");
    setQuickCreateState({
      ...initialFormState,
      serviceDate: getServiceDateFromCalendarSlot(slotStart),
      serviceTime: getServiceTimeFromCalendarSlot(
        slotStart,
        calendarView,
        serviceTimeOptions
      )
    });
    setIsQuickCreateOpen(true);
  };

  const handleCloseQuickCreate = () => {
    setIsQuickCreateOpen(false);
    setQuickCreateState(initialFormState);
    setQuickCreateError("");
    setQuickCreateMessage("");
    setIsInlineQuickClientOpen(false);
    setQuickClientState(initialQuickClientState);
    setQuickClientError("");
    setQuickClientMessage("");
    setIsInlineQuickBranchOpen(false);
    setQuickBranchState(initialQuickBranchState);
    setQuickBranchError("");
    setQuickBranchMessage("");
  };

  const handleBackToQuickOrder = () => {
    setIsInlineQuickClientOpen(false);
    setQuickClientError("");
    setQuickClientMessage("");
    setIsInlineQuickBranchOpen(false);
    setQuickBranchError("");
    setQuickBranchMessage("");
  };

  const handleQuickCreateClient = async (event) => {
    event.preventDefault();
    setQuickClientError("");
    setQuickClientMessage("");
    setIsSavingQuickClient(true);

    try {
      const savedClient = await saveClientRecord({
        clientState: {
          clientType: quickClientState.clientType,
          businessName: quickClientState.name,
          tradeName: "",
          taxId: "",
          mainAddress: quickClientState.address,
          mainPhone: quickClientState.phone,
          mainContact: "",
          mainEmail: ""
        }
      });

      setQuickCreateState((currentState) => ({
        ...currentState,
        clientId: savedClient.id,
        branchId: ""
      }));
      setQuickClientState(initialQuickClientState);
      setQuickClientMessage(uiText.clients.success);
      setIsInlineQuickClientOpen(false);
    } catch (error) {
      setQuickClientError(error.message || uiText.serviceOrder.quickCreate.clientCreateError);
    }

    setIsSavingQuickClient(false);
  };

  const handleQuickCreateBranch = async (event) => {
    event.preventDefault();
    setQuickBranchError("");
    setQuickBranchMessage("");
    setIsSavingQuickBranch(true);

    try {
      const savedBranch = await saveBranchRecord({
        branchState: quickBranchState,
        clientId: quickCreateState.clientId,
        preserveOrderClient: true
      });

      setQuickCreateState((currentState) => ({
        ...currentState,
        branchId: savedBranch.id
      }));
      setQuickBranchState(initialQuickBranchState);
      setQuickBranchMessage(uiText.clients.branchCreateSuccess);
      setIsInlineQuickBranchOpen(false);
    } catch (error) {
      setQuickBranchError(error.message || uiText.serviceOrder.quickCreate.branchCreateError);
    }

    setIsSavingQuickBranch(false);
  };

  const handleQuickCreateServiceOrder = async (event) => {
    event.preventDefault();

    await createServiceOrderWithState({
      orderState: quickCreateState,
      selectedClient: selectedQuickClient,
      branchesForClient: quickAvailableBranches,
      setError: setQuickCreateError,
      setSuccess: setQuickCreateMessage,
      setSaving: setIsQuickCreatingOrder,
      resetState: () => setQuickCreateState(initialFormState),
      onSuccess: () => {
        handleCloseQuickCreate();
      }
    });
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
      : supabase.from("technicians").insert(payload);
    const { error } = await technicianQuery;

    if (error) {
      setTechnicianFormError(error.message || uiText.technicians.createError);
      setIsSavingTechnician(false);
      return;
    }

    // Refresh the roster after insert so the new technician appears immediately.
    await fetchTechnicians(supabase, activeCompanyId);
    setTechnicianForm(initialTechnicianFormState);
    setSelectedTechnicianId(null);
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
    console.log("[Service Order Debug] Saving selection:", {
      selectedServiceOrderId: resolvedServiceOrder.id,
      selectedServiceOrderSnapshot: resolvedServiceOrder
    });
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

    setIsSavingDetail(true);

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: selectedServiceOrderId,
        technicianName: detailFormState.technicianName.trim(),
        serviceDate: detailFormState.serviceDate,
        serviceTime: detailFormState.serviceTime.trim(),
        durationMinutes: detailFormState.durationMinutes,
        status: detailFormState.status,
        recurrenceState: detailFormState,
        existingOrder: selectedServiceOrder,
        branchId: isResidentialDetailClient
          ? preferredDetailResidentialBranch?.id || selectedServiceOrder?.branch_id || null
          : detailFormState.branchId || selectedServiceOrder?.branch_id || null,
        excludeOrderId: selectedServiceOrderId
      });
      setDetailFormMessage(uiText.dashboard.detailSuccess);
    } catch (error) {
      setDetailFormError(error.message || uiText.dashboard.detailError);
    }

    setIsSavingDetail(false);
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

  const handleBacklogDragStart = (serviceOrder) => {
    setDraggedBacklogServiceOrder(serviceOrder);
  };

  const handleBacklogDragEnd = () => {
    setDraggedBacklogServiceOrder(null);
  };

  const handleDropBacklogServiceOrder = async ({ start }) => {
    if (!draggedBacklogServiceOrder?.id || !start || !isValid(start)) {
      setDraggedBacklogServiceOrder(null);
      return;
    }

    const nextServiceDate = getServiceDateFromCalendarSlot(start);
    const nextServiceTime = getServiceTimeFromDropTarget(
      start,
      draggedBacklogServiceOrder.service_time,
      calendarView,
      serviceTimeOptions
    );

    setCalendarActionError("");
    setCalendarActionMessage("");

    try {
      await updateServiceOrderSchedule({
        serviceOrderId: draggedBacklogServiceOrder.id,
        technicianName: draggedBacklogServiceOrder.technician_name,
        serviceDate: nextServiceDate,
        serviceTime: nextServiceTime,
        durationMinutes: draggedBacklogServiceOrder.duration_minutes,
        status: draggedBacklogServiceOrder.status,
        recurrenceState: getRecurrenceFormState(draggedBacklogServiceOrder),
        existingOrder: draggedBacklogServiceOrder,
        branchId: draggedBacklogServiceOrder.branch_id ?? null,
        excludeOrderId: draggedBacklogServiceOrder.id
      });

      if (selectedServiceOrderId === draggedBacklogServiceOrder.id) {
        setDetailFormMessage(uiText.dashboard.detailSuccess);
      }

      setCalendarActionMessage(uiText.dashboard.detailSuccess);
    } catch (error) {
      setCalendarActionError(error.message || uiText.dashboard.calendarMoveError);
    } finally {
      setDraggedBacklogServiceOrder(null);
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

  const handleStartReschedule = () => {
    detailDateInputRef.current?.focus();
  };

  const handleSelectTechnicianOrder = (serviceOrder) => {
    setSelectedTechnicianOrderId(serviceOrder?.id || null);
    setTechnicianActionMessage("");
    setTechnicianActionError("");
  };

  const handleCompleteTechnicianOrder = async () => {
    if (!selectedTechnicianOrderId) {
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setTechnicianActionError(uiText.serviceOrder.configError);
      return;
    }

    if (!activeCompanyId || !userProfile?.full_name) {
      setTechnicianActionError(uiText.dashboard.profileLoadError);
      return;
    }

    setTechnicianActionError("");
    setTechnicianActionMessage("");
    setIsCompletingTechnicianOrder(true);

    const { error } = await supabase
      .from("service_orders")
      .update({ status: "completed" })
      .eq("id", selectedTechnicianOrderId)
      .eq("company_id", activeCompanyId);

    if (error) {
      setTechnicianActionError(error.message || uiText.technicianDashboard.completionError);
      setIsCompletingTechnicianOrder(false);
      return;
    }

    await fetchTechnicianOrders(supabase, activeCompanyId, userProfile.full_name);
    setTechnicianActionMessage(uiText.technicianDashboard.completionSuccess);
    setIsCompletingTechnicianOrder(false);
  };

  useEffect(() => {
    console.log("[Service Order Debug] Selected service order:", selectedServiceOrder);
  }, [selectedServiceOrder]);

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
                  const branch = serviceOrder.branches;
                  const branchName = getBranchDisplayName(branch);
                  const isSelected = serviceOrder.id === selectedTechnicianOrderId;

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
                          <span className="technician-status-badge">
                            {getStatusLabel(serviceOrder.status)}
                          </span>
                        </div>

                        <div className="technician-service-card-grid">
                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.branch}</span>
                            <strong>{branchName || uiText.technicianDashboard.fallbacks.branch}</strong>
                          </div>

                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.address}</span>
                            <strong>
                              {branch?.address || uiText.technicianDashboard.fallbacks.address}
                            </strong>
                          </div>

                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.phone}</span>
                            <strong>
                              {branch?.phone || uiText.technicianDashboard.fallbacks.phone}
                            </strong>
                          </div>

                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.contact}</span>
                            <strong>
                              {branch?.contact || uiText.technicianDashboard.fallbacks.contact}
                            </strong>
                          </div>

                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.serviceTime}</span>
                            <strong>{formatDisplayTime(serviceOrder.service_time)}</strong>
                          </div>

                          <div className="detail-row">
                            <span>{uiText.technicianDashboard.fields.status}</span>
                            <strong>{getStatusLabel(serviceOrder.status)}</strong>
                          </div>
                        </div>

                        <div className="detail-row">
                          <span>{uiText.technicianDashboard.fields.notes}</span>
                          <strong>
                            {serviceOrder.notes || uiText.technicianDashboard.fallbacks.notes}
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
                <div className="branch-summary-card">
                  <span>{uiText.technicianDashboard.selectedService}</span>
                  <strong>{getClientDisplayName(selectedTechnicianOrder.clients)}</strong>
                  <p>
                    {getBranchDisplayName(selectedTechnicianOrder.branches)}
                  </p>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.client}</span>
                  <strong>{getClientDisplayName(selectedTechnicianOrder.clients)}</strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.branch}</span>
                  <strong>{getBranchDisplayName(selectedTechnicianOrder.branches)}</strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.address}</span>
                  <strong>
                    {selectedTechnicianOrder.branches?.address ||
                      uiText.technicianDashboard.fallbacks.address}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.phone}</span>
                  <strong>
                    {selectedTechnicianOrder.branches?.phone ||
                      uiText.technicianDashboard.fallbacks.phone}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>{uiText.technicianDashboard.fields.contact}</span>
                  <strong>
                    {selectedTechnicianOrder.branches?.contact ||
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
                  <span>{uiText.technicianDashboard.fields.notes}</span>
                  <strong>
                    {selectedTechnicianOrder.notes || uiText.technicianDashboard.fallbacks.notes}
                  </strong>
                </div>

                <div className="workspace-form-messages">
                  {technicianActionError ? (
                    <p className="error">{technicianActionError}</p>
                  ) : null}
                  {technicianActionMessage ? (
                    <p className="success-message">{technicianActionMessage}</p>
                  ) : null}
                </div>

                <button
                  className="button detail-save-button"
                  type="button"
                  onClick={handleCompleteTechnicianOrder}
                  disabled={
                    isCompletingTechnicianOrder ||
                    selectedTechnicianOrder.status === "completed"
                  }
                >
                  {isCompletingTechnicianOrder
                    ? uiText.technicianDashboard.actions.completing
                    : uiText.technicianDashboard.actions.complete}
                </button>
              </div>
            )}
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">{uiText.dashboard.eyebrow}</p>
          <h1>{uiText.common.appName}</h1>
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

        <div className="admin-header-actions">
          <div className="admin-user">
            <span className="admin-user-label">{uiText.common.loggedInAs}</span>
            <strong>{userEmail}</strong>
          </div>

          <button
            className="button"
            type="button"
            onClick={handleLogout}
            disabled={isSigningOut}
          >
            {isSigningOut ? uiText.common.loggingOut : uiText.common.logout}
          </button>
        </div>
      </header>

      <section className="admin-content">
        <aside className="admin-placeholder">
          <h2>{uiText.dashboard.operationsTitle}</h2>
          <p>{uiText.dashboard.operationsBody}</p>
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
        </aside>

        <section className="calendar-panel">
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
                <p className="calendar-panel-subtitle">
                  {activeAdminView === adminViewTabs.calendar
                    ? uiText.dashboard.calendarSubtitle
                    : uiText.serviceList.subtitle}
                </p>
              </div>
              <div className="calendar-panel-row-right" />
            </div>

            <div className="calendar-panel-row calendar-panel-row-3">
              {activeAdminView === adminViewTabs.calendar ? (
                <>
                  <div className="calendar-panel-row-left">
                    <button
                      type="button"
                      className={showOnlyOverdue ? "overdue-chip active" : "overdue-chip"}
                      onClick={toggleOverdueFilter}
                    >
                      {uiText.dashboard.overdueCounterLabel}: {overdueCount}
                    </button>
                  </div>

                  <div className="calendar-panel-row-right">
                    <div className="calendar-controls-right">
                      <div className="control-group">
                        <label className="calendar-filter control-group-body">
                          <span className="control-group-label">
                            {uiText.dashboard.calendarFilterLabel}
                          </span>
                          <select
                            value={selectedCalendarTechnician}
                            onChange={(event) => setSelectedCalendarTechnician(event.target.value)}
                          >
                            <option value="all">{uiText.dashboard.calendarFilterAll}</option>
                            {technicianLegendItems.map((item) => (
                              <option key={item.key} value={item.technicianName}>
                                {item.displayName}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {technicianLegendItems.length > 0 ? (
                        <div
                          className="calendar-legend control-group"
                          aria-label={uiText.dashboard.calendarLegendTitle}
                        >
                          <span className="calendar-legend-title control-group-label">
                            {uiText.dashboard.calendarLegendTitle}
                          </span>
                          <div className="calendar-legend-items control-group-body">
                            {technicianLegendItems.map((item) => (
                              <span key={item.key} className="calendar-legend-item">
                                <span
                                  className="calendar-legend-dot"
                                  style={{ backgroundColor: item.color.accent }}
                                />
                                <span>{item.displayName}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="calendar-panel-row-left" />

                  <div className="calendar-panel-row-right">
                    <div className="calendar-controls-right service-list-controls">
                      <div className="control-group">
                        <label className="calendar-filter control-group-body">
                          <span className="control-group-label">
                            {uiText.serviceList.filters.client}
                          </span>
                          <input
                            type="text"
                            value={serviceListClientSearch}
                            onChange={(event) => setServiceListClientSearch(event.target.value)}
                            placeholder={uiText.serviceList.placeholders.clientSearch}
                          />
                        </label>
                      </div>

                      <div className="control-group">
                        <label className="calendar-filter control-group-body">
                          <span className="control-group-label">
                            {uiText.serviceList.filters.technician}
                          </span>
                          <select
                            value={serviceListTechnician}
                            onChange={(event) => setServiceListTechnician(event.target.value)}
                          >
                            <option value="all">{uiText.serviceList.filters.all}</option>
                            {serviceListTechnicianOptions.map((technicianName) => (
                              <option key={technicianName} value={technicianName}>
                                {technicianName}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="control-group">
                        <label className="calendar-filter control-group-body">
                          <span className="control-group-label">
                            {uiText.serviceList.filters.recurring}
                          </span>
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
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {calendarActionError ? <p className="error">{calendarActionError}</p> : null}
          {calendarActionMessage ? (
            <p className="success-message">{calendarActionMessage}</p>
          ) : null}

          {activeAdminView === adminViewTabs.calendar && showOnlyOverdue ? (
            <div className="overdue-active-banner">
              Mostrando solo pendientes de reagendar
            </div>
          ) : null}

          {calendarError ? (
            <div className="calendar-empty-state">
              <h3>{uiText.dashboard.calendarErrorTitle}</h3>
              <p>{calendarError}</p>
            </div>
          ) : null}

          {!calendarError && isServiceOrdersLoading ? (
            <div className="calendar-empty-state">
              <h3>{uiText.common.loadingDashboard}</h3>
            </div>
          ) : null}

          {activeAdminView === adminViewTabs.calendar &&
          !calendarError &&
          !isServiceOrdersLoading &&
          calendarView !== operationalCalendarView &&
          filteredCalendarEvents.length === 0 ? (
            <div className="calendar-empty-state">
              <h3>{uiText.dashboard.calendarEmptyTitle}</h3>
              <p>{uiText.dashboard.calendarEmptyBody}</p>
            </div>
          ) : null}

          {activeAdminView === adminViewTabs.calendar &&
          !calendarError &&
          !isServiceOrdersLoading ? (
            <div
              className={
                calendarView === operationalCalendarView
                  ? "operational-calendar-layout"
                  : undefined
              }
            >
              {calendarView === operationalCalendarView ? (
                <aside className="operational-backlog">
                  <div className="operational-backlog-header">
                    <h3>{uiText.dashboard.backlogTitle}</h3>
                    <span>{backlogServiceOrders.length}</span>
                  </div>
                  <p className="operational-backlog-subtitle">
                    {uiText.dashboard.backlogBody}
                  </p>

                  <div className="operational-backlog-list">
                    {backlogServiceOrders.length === 0 ? (
                      <p className="operational-backlog-empty">
                        {uiText.dashboard.backlogEmpty}
                      </p>
                    ) : (
                      backlogServiceOrders.map((serviceOrder) => (
                        <button
                          key={serviceOrder.id}
                          type="button"
                          draggable
                          className={
                            serviceOrder.id === selectedServiceOrderId
                              ? "operational-backlog-card operational-backlog-card-selected"
                              : "operational-backlog-card"
                          }
                          onClick={() => handleSelectServiceOrder(serviceOrder)}
                          onDragStart={() => handleBacklogDragStart(serviceOrder)}
                          onDragEnd={handleBacklogDragEnd}
                        >
                          <strong>{getClientDisplayName(serviceOrder.clients)}</strong>
                          <span>{getBranchDisplayName(serviceOrder.branches)}</span>
                          <span>
                            {formatServiceDate(serviceOrder.service_date)} ·{" "}
                            {formatDisplayTime(serviceOrder.service_time)}
                          </span>
                          <span>
                            {getTechnicianDisplayName(serviceOrder.technician_name)} ·{" "}
                            {resolveDurationMinutes(serviceOrder.duration_minutes)} min
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </aside>
              ) : null}

              <div
                className="calendar-shell"
                onMouseDownCapture={handleCalendarMouseDownCapture}
                onMouseUpCapture={handleCalendarMouseUpCapture}
              >
                <DragAndDropCalendar
                  localizer={localizer}
                  messages={uiText.calendar.messages}
                  culture="es"
                  events={filteredCalendarEvents}
                  defaultView={operationalCalendarView}
                  date={calendarDate}
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
                  dragFromOutsideItem={() =>
                    draggedBacklogServiceOrder
                      ? buildExternalDragPreview(draggedBacklogServiceOrder)
                      : null
                  }
                  draggableAccessor={() => true}
                  resizable={calendarView !== "month"}
                  eventPropGetter={getCalendarEventStyle}
                  style={{ height: 640 }}
                  components={{
                    event: (eventProps) => (
                      <EventCard
                        {...eventProps}
                        view={calendarView}
                        onSelect={handleSelectServiceOrder}
                        isSelected={eventProps.event?.id === selectedServiceOrderId}
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
              getBranchDisplayName={getBranchDisplayName}
              formatServiceDate={formatServiceDate}
            />
          ) : null}

          <section className="workspace-panel">
            <div className="workspace-panel-header">
              <div>
                <h2>{uiText.dashboard.workspaceTitle}</h2>
                <p>{uiText.dashboard.workspaceBody}</p>
              </div>
            </div>

            <div className="workspace-tabs" role="tablist" aria-label="Herramientas del panel">
              {workspaceTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={
                    activeTab === tab ? "workspace-tab workspace-tab-active" : "workspace-tab"
                  }
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="workspace-body">
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
              />
            </div>
          </section>
        </section>

        <aside className="admin-placeholder">
          <h2>{uiText.dashboard.detailTitle}</h2>
          {!selectedServiceOrder ? (
            <p>{uiText.dashboard.detailEmpty}</p>
          ) : (
            <form className="detail-panel" onSubmit={handleUpdateServiceOrder}>
              <p className="detail-description">{uiText.dashboard.detailDescription}</p>

              {isSelectedServiceOrderOverdue ? (
                <div className="detail-overdue-box">
                  <div>
                    <strong>{uiText.dashboard.overdueLabel}</strong>
                    <p>{uiText.dashboard.detailOverdueBody}</p>
                  </div>
                  <button
                    className="button button-secondary detail-reschedule-button"
                    type="button"
                    onClick={handleStartReschedule}
                  >
                    {uiText.dashboard.detailReschedule}
                  </button>
                </div>
              ) : null}

              <div className="detail-row">
                <span>{uiText.dashboard.detailFields.clientName}</span>
                <strong>
                  {getClientDisplayName(selectedServiceOrder.clients)}
                </strong>
              </div>

              <div className="detail-row">
                <span>{uiText.dashboard.detailFields.branchName}</span>
                <strong>{getBranchDisplayName(selectedServiceOrder.branches)}</strong>
                {selectedServiceOrder.branches ? (
                  <small className="detail-subcopy">
                    {getBranchSummary(selectedServiceOrder.branches) ||
                      uiText.clients.branchSummaryFallback}
                  </small>
                ) : null}
              </div>

              {isResidentialDetailClient ? (
                <div className="detail-row">
                  <span>{uiText.serviceOrder.fields.branch}</span>
                  <strong>
                    {preferredDetailResidentialBranch
                      ? getBranchDisplayName(preferredDetailResidentialBranch)
                      : getBranchDisplayName(selectedServiceOrder.branches)}
                  </strong>
                  <small className="detail-subcopy">
                    {isBranchesLoading
                      ? uiText.serviceOrder.placeholders.branchLoading
                      : preferredDetailResidentialBranch || selectedServiceOrder.branches
                      ? uiText.serviceOrder.residentialBranchAuto
                      : uiText.serviceOrder.residentialBranchMissing}
                  </small>
                </div>
              ) : (
                <label className="workspace-input-group">
                  <span>{uiText.serviceOrder.fields.branch}</span>
                  <select
                    name="branchId"
                    value={detailFormState.branchId}
                    onChange={handleDetailFormChange}
                    disabled={
                      isSavingDetail ||
                      isBranchesLoading ||
                      !selectedServiceOrder?.client_id
                    }
                    required
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
              )}

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
                  value={detailFormState.durationMinutes}
                  onChange={handleDetailFormChange}
                  disabled={isSavingDetail}
                  required
                >
                  <option value="" disabled>
                    {uiText.serviceOrder.placeholders.duration}
                  </option>
                  {durationOptions.map((durationOption) => (
                    <option key={durationOption} value={durationOption}>
                      {durationOption} min
                    </option>
                  ))}
                </select>
              </label>

              <label className="workspace-checkbox workspace-field-wide">
                <input
                  name="isRecurring"
                  type="checkbox"
                  checked={detailFormState.isRecurring}
                  onChange={handleDetailFormChange}
                  disabled={isSavingDetail}
                />
                <span>{uiText.serviceOrder.fields.isRecurring}</span>
              </label>

              {detailFormState.isRecurring ? (
                <>
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
                </>
              ) : null}

              <label className="workspace-input-group">
                <span>{uiText.dashboard.detailFields.status}</span>
                <SegmentedControl
                  name="status"
                  value={detailFormState.status}
                  onChange={handleDetailFormChange}
                  options={serviceOrderStatusOptions}
                  disabled={isSavingDetail}
                />
              </label>

              <div className="detail-row">
                <span>{uiText.dashboard.detailFields.createdAt}</span>
                <strong>{formatCreatedAt(selectedServiceOrder.created_at)}</strong>
              </div>

              <div className="workspace-form-messages">
                {!isTechniciansLoading && activeTechnicians.length === 0 ? (
                  <p className="empty-hint">{uiText.dashboard.detailTechnicianEmpty}</p>
                ) : null}
                {techniciansError ? <p className="error">{techniciansError}</p> : null}
                {detailFormError ? <p className="error">{detailFormError}</p> : null}
                {detailFormMessage ? (
                  <p className="success-message">{detailFormMessage}</p>
                ) : null}
              </div>

              <button
                className="button detail-save-button"
                type="submit"
                disabled={
                  isSavingDetail ||
                  isTechniciansLoading ||
                  (!isResidentialDetailClient &&
                    !detailFormState.branchId &&
                    detailAvailableBranches.length > 0) ||
                  activeTechnicians.length === 0 ||
                  !detailFormState.technicianName
                }
              >
                {isSavingDetail
                  ? uiText.dashboard.detailSaving
                  : uiText.dashboard.detailSave}
              </button>
            </form>
          )}
        </aside>
      </section>

      {isQuickCreateOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={handleCloseQuickCreate}>
          <section
            className="quick-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-create-title"
            onClick={(event) => event.stopPropagation()}
          >
            {!isInlineQuickClientOpen && !isInlineQuickBranchOpen ? (
              <>
                <div className="workspace-copy">
                  <h3 id="quick-create-title">{uiText.serviceOrder.quickCreate.title}</h3>
                  <p>{uiText.serviceOrder.quickCreate.description}</p>
                </div>

                <form className="workspace-form" onSubmit={handleQuickCreateServiceOrder}>
                  <div className="workspace-grid">
                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.fields.client}</span>
                      <select
                        name="clientId"
                        value={quickCreateState.clientId}
                        onChange={handleQuickCreateChange}
                        disabled={isQuickCreatingOrder || isClientsLoading}
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
                        <option value={quickCreateNewClientOption}>
                          {uiText.serviceOrder.quickCreate.newClient}
                        </option>
                      </select>
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.fields.technician}</span>
                      <select
                        name="technicianName"
                        value={quickCreateState.technicianName}
                        onChange={handleQuickCreateChange}
                        disabled={isQuickCreatingOrder || isTechniciansLoading}
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

                    {isResidentialQuickClient ? (
                      <div className="detail-row workspace-field-wide">
                        <span>{uiText.serviceOrder.fields.branch}</span>
                        <strong>
                          {preferredQuickResidentialBranch
                            ? getBranchDisplayName(preferredQuickResidentialBranch)
                            : uiText.dashboard.branchEmpty}
                        </strong>
                        <small className="detail-subcopy">
                          {isBranchesLoading
                            ? uiText.serviceOrder.placeholders.branchLoading
                            : preferredQuickResidentialBranch
                              ? uiText.serviceOrder.residentialBranchAuto
                              : uiText.serviceOrder.residentialBranchMissing}
                        </small>
                      </div>
                    ) : (
                      <label className="workspace-input-group">
                        <span>{uiText.serviceOrder.fields.branch}</span>
                        <select
                          name="branchId"
                          value={quickCreateState.branchId}
                          onChange={handleQuickCreateChange}
                          disabled={
                            isQuickCreatingOrder ||
                            isClientsLoading ||
                            !quickCreateState.clientId
                          }
                          required
                        >
                          <option value="">
                            {!quickCreateState.clientId
                              ? uiText.serviceOrder.placeholders.branchDisabled
                              : isBranchesLoading
                                ? uiText.serviceOrder.placeholders.branchLoading
                                : uiText.serviceOrder.placeholders.branch}
                          </option>
                          {quickAvailableBranches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {getBranchDisplayName(branch)}
                            </option>
                          ))}
                          {quickCreateState.clientId ? (
                            <option value={quickCreateNewBranchOption}>
                              {uiText.serviceOrder.quickCreate.newBranch}
                            </option>
                          ) : null}
                        </select>
                      </label>
                    )}

                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.fields.serviceDate}</span>
                      <input
                        name="serviceDate"
                        type="date"
                        value={quickCreateState.serviceDate}
                        onChange={handleQuickCreateChange}
                        disabled={isQuickCreatingOrder}
                        required
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.fields.serviceTime}</span>
                      <select
                        name="serviceTime"
                        value={quickCreateState.serviceTime}
                        onChange={handleQuickCreateChange}
                        disabled={isQuickCreatingOrder}
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
                        value={quickCreateState.durationMinutes}
                        onChange={handleQuickCreateChange}
                        disabled={isQuickCreatingOrder}
                        required
                      >
                        <option value="" disabled>
                          {uiText.serviceOrder.placeholders.duration}
                        </option>
                        {durationOptions.map((durationOption) => (
                          <option key={durationOption} value={durationOption}>
                            {durationOption} min
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.fields.status}</span>
                      <select
                        name="status"
                        value={quickCreateState.status}
                        onChange={handleQuickCreateChange}
                        disabled={isQuickCreatingOrder}
                        required
                      >
                        <option value="scheduled">{getStatusLabel("scheduled")}</option>
                        <option value="completed">{getStatusLabel("completed")}</option>
                        <option value="cancelled">{getStatusLabel("cancelled")}</option>
                      </select>
                    </label>
                  </div>

                  <div className="workspace-form-footer">
                    <div className="workspace-form-messages">
                      {quickCreateState.clientId &&
                      isResidentialQuickClient &&
                      !isBranchesLoading &&
                      !preferredQuickResidentialBranch ? (
                        <p className="empty-hint">
                          {uiText.serviceOrder.residentialBranchMissing}
                        </p>
                      ) : null}
                      {quickCreateState.clientId &&
                      !isResidentialQuickClient &&
                      !isBranchesLoading &&
                      quickAvailableBranches.length === 0 ? (
                        <p className="empty-hint">{uiText.serviceOrder.branchEmpty}</p>
                      ) : null}
                      {quickClientMessage ? (
                        <p className="success-message">{quickClientMessage}</p>
                      ) : null}
                      {quickCreateError ? <p className="error">{quickCreateError}</p> : null}
                    </div>

                    <div className="workspace-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={handleCloseQuickCreate}
                        disabled={isQuickCreatingOrder}
                      >
                        {uiText.serviceOrder.quickCreate.cancel}
                      </button>

                      <button
                        className="button"
                        type="submit"
                        disabled={
                          isQuickCreatingOrder ||
                          isClientsLoading ||
                          isTechniciansLoading ||
                          !quickCreateState.clientId ||
                          !quickCreateState.technicianName ||
                          (!isResidentialQuickClient && !quickCreateState.branchId) ||
                          (isResidentialQuickClient && !preferredQuickResidentialBranch)
                        }
                      >
                        {isQuickCreatingOrder
                          ? uiText.serviceOrder.quickCreate.saving
                          : uiText.serviceOrder.quickCreate.save}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : isInlineQuickClientOpen ? (
              <>
                <div className="workspace-copy">
                  <h3 id="quick-create-title">
                    {uiText.serviceOrder.quickCreate.inlineClientTitle}
                  </h3>
                  <p>{uiText.serviceOrder.quickCreate.inlineClientDescription}</p>
                </div>

                <form className="workspace-form" onSubmit={handleQuickCreateClient}>
                  <div className="workspace-grid">
                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.quickCreate.fields.clientName}</span>
                      <input
                        name="name"
                        type="text"
                        value={quickClientState.name}
                        onChange={handleQuickClientChange}
                        disabled={isSavingQuickClient}
                        required
                      />
                    </label>

                    <label className="workspace-input-group">
                      <span>{uiText.clients.fields.clientType}</span>
                      <select
                        name="clientType"
                        value={quickClientState.clientType}
                        onChange={handleQuickClientChange}
                        disabled={isSavingQuickClient}
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

                    <label className="workspace-input-group">
                      <span>{uiText.serviceOrder.quickCreate.fields.phone}</span>
                      <input
                        name="phone"
                        type="tel"
                        value={quickClientState.phone}
                        onChange={handleQuickClientChange}
                        disabled={isSavingQuickClient}
                        required
                      />
                    </label>

                    <label className="workspace-input-group workspace-field-wide">
                      <span>{uiText.serviceOrder.quickCreate.fields.address}</span>
                      <textarea
                        name="address"
                        value={quickClientState.address}
                        onChange={handleQuickClientChange}
                        disabled={isSavingQuickClient}
                        rows={3}
                        required
                      />
                    </label>
                  </div>

                  <div className="workspace-form-footer">
                    <div className="workspace-form-messages">
                      {quickClientError ? <p className="error">{quickClientError}</p> : null}
                    </div>

                    <div className="workspace-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={handleBackToQuickOrder}
                        disabled={isSavingQuickClient}
                      >
                        {uiText.serviceOrder.quickCreate.backToOrder}
                      </button>

                      <button className="button" type="submit" disabled={isSavingQuickClient}>
                        {isSavingQuickClient
                          ? uiText.serviceOrder.quickCreate.creatingClient
                          : uiText.serviceOrder.quickCreate.createClient}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="workspace-copy">
                  <h3 id="quick-create-title">
                    {uiText.serviceOrder.quickCreate.inlineBranchTitle}
                  </h3>
                  <p>{uiText.serviceOrder.quickCreate.inlineBranchDescription}</p>
                </div>

                <form className="workspace-form" onSubmit={handleQuickCreateBranch}>
                  <div className="workspace-grid">
                    <label className="workspace-input-group">
                      <span>{uiText.clients.branchFields.name}</span>
                      <input
                        name="name"
                        type="text"
                        value={quickBranchState.name}
                        onChange={handleQuickBranchChange}
                        disabled={isSavingQuickBranch}
                        required
                      />
                    </label>

                    <label className="workspace-input-group workspace-field-wide">
                      <span>{uiText.clients.branchFields.address}</span>
                      <textarea
                        name="address"
                        value={quickBranchState.address}
                        onChange={handleQuickBranchChange}
                        disabled={isSavingQuickBranch}
                        rows={3}
                        required
                      />
                    </label>
                  </div>

                  <div className="workspace-form-footer">
                    <div className="workspace-form-messages">
                      {quickBranchError ? <p className="error">{quickBranchError}</p> : null}
                    </div>

                    <div className="workspace-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={handleBackToQuickOrder}
                        disabled={isSavingQuickBranch}
                      >
                        {uiText.serviceOrder.quickCreate.backToOrder}
                      </button>

                      <button className="button" type="submit" disabled={isSavingQuickBranch}>
                        {isSavingQuickBranch
                          ? uiText.serviceOrder.quickCreate.creatingBranch
                          : uiText.serviceOrder.quickCreate.createBranch}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
