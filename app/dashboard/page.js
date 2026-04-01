"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, isValid, parse, startOfWeek, getDay, addHours } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
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

const workspaceTabs = [
  uiText.tabs.newServiceOrder,
  uiText.tabs.clients,
  uiText.tabs.technicians,
  uiText.tabs.reports
];

const initialFormState = {
  clientId: "",
  technicianName: "",
  serviceDate: "",
  serviceTime: "9:00 AM",
  status: "scheduled",
  notes: ""
};

const initialTechnicianFormState = {
  fullName: "",
  isActive: true
};

const initialClientFormState = {
  name: ""
};

const initialDetailFormState = {
  technicianName: "",
  serviceDate: "",
  serviceTime: "9:00 AM",
  status: "scheduled"
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

function parseServiceOrderStart(serviceDate, serviceTime) {
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

function transformServiceOrdersToEvents(serviceOrders) {
  // Map Supabase rows into the calendar shape expected by react-big-calendar.
  return serviceOrders.map((serviceOrder) => {
    const start = parseServiceOrderStart(
      serviceOrder.service_date,
      serviceOrder.service_time
    );

    return {
      id: serviceOrder.id,
      title: serviceOrder.clients?.name || uiText.dashboard.detailFields.clientName,
      clientName:
        serviceOrder.clients?.name || uiText.dashboard.detailFields.clientName,
      technician: serviceOrder.technician_name,
      status: serviceOrder.status,
      serviceDate: serviceOrder.service_date,
      serviceTime: serviceOrder.service_time,
      createdAt: serviceOrder.created_at,
      start,
      end: addHours(start, 1)
    };
  });
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

function EventCard({ event }) {
  return (
    <div className="calendar-event">
      <strong>{event.title}</strong>
    </div>
  );
}

function WorkspacePanel({
  activeTab,
  clients,
  clientsError,
  isClientsLoading,
  clientForm,
  clientFormError,
  clientFormMessage,
  isSavingClient,
  activeTechnicians,
  technicians,
  techniciansError,
  isTechniciansLoading,
  technicianForm,
  technicianFormError,
  technicianFormMessage,
  isSavingTechnician,
  serviceTimeOptions,
  formState,
  formMessage,
  formError,
  isSavingOrder,
  onFormChange,
  onSubmit,
  onClientFormChange,
  onClientSubmit,
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
                    {client.name}
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
              <span>{uiText.serviceOrder.fields.status}</span>
              <select
                name="status"
                value={formState.status}
                onChange={onFormChange}
                disabled={isSavingOrder}
                required
              >
                <option value="scheduled">{getStatusLabel("scheduled")}</option>
                <option value="completed">{getStatusLabel("completed")}</option>
                <option value="cancelled">{getStatusLabel("cancelled")}</option>
              </select>
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
              {clientsError ? <p className="error">{clientsError}</p> : null}
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
    return (
      <div className="workspace-section">
        <div className="workspace-copy">
          <h3>{uiText.clients.title}</h3>
          <p>{uiText.clients.description}</p>
        </div>

        <form className="workspace-form" onSubmit={onClientSubmit}>
          <div className="workspace-grid">
            <label className="workspace-input-group workspace-field-wide">
              <span>{uiText.clients.fieldLabel}</span>
              <input
                name="name"
                type="text"
                value={clientForm.name}
                onChange={onClientFormChange}
                placeholder={uiText.clients.fieldPlaceholder}
                disabled={isSavingClient}
                required
              />
            </label>
          </div>

          <div className="workspace-form-footer">
            <div className="workspace-form-messages">
              {clientsError ? <p className="error">{clientsError}</p> : null}
              {clientFormError ? <p className="error">{clientFormError}</p> : null}
              {clientFormMessage ? <p className="success-message">{clientFormMessage}</p> : null}
            </div>

            <button className="button" type="submit" disabled={isSavingClient}>
              {isSavingClient ? uiText.clients.saving : uiText.clients.save}
            </button>
          </div>
        </form>

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
                    <th>{uiText.clients.headers.createdAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.name}</td>
                      <td>{formatCreatedAt(client.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (activeTab === uiText.tabs.technicians) {
    return (
      <div className="workspace-section">
        <div className="workspace-copy">
          <h3>{uiText.technicians.title}</h3>
          <p>{uiText.technicians.description}</p>
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
              {technicianFormError ? <p className="error">{technicianFormError}</p> : null}
              {technicianFormMessage ? (
                <p className="success-message">{technicianFormMessage}</p>
              ) : null}
            </div>

            <button className="button" type="submit" disabled={isSavingTechnician}>
              {isSavingTechnician ? uiText.technicians.saving : uiText.technicians.save}
            </button>
          </div>
        </form>

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
                    <th>{uiText.technicians.headers.status}</th>
                    <th>{uiText.technicians.headers.createdAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((technician) => (
                    <tr key={technician.id}>
                      <td>{technician.full_name}</td>
                      <td>
                        {technician.is_active
                          ? uiText.technicians.active
                          : uiText.technicians.inactive}
                      </td>
                      <td>{formatCreatedAt(technician.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
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
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarError, setCalendarError] = useState("");
  const [calendarView, setCalendarView] = useState("month");
  const [selectedServiceOrderId, setSelectedServiceOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState(uiText.tabs.newServiceOrder);
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState("");
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [clientForm, setClientForm] = useState(initialClientFormState);
  const [clientFormMessage, setClientFormMessage] = useState("");
  const [clientFormError, setClientFormError] = useState("");
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [techniciansError, setTechniciansError] = useState("");
  const [isTechniciansLoading, setIsTechniciansLoading] = useState(false);
  const [technicianForm, setTechnicianForm] = useState(initialTechnicianFormState);
  const [technicianFormMessage, setTechnicianFormMessage] = useState("");
  const [technicianFormError, setTechnicianFormError] = useState("");
  const [isSavingTechnician, setIsSavingTechnician] = useState(false);
  const [detailFormState, setDetailFormState] = useState(initialDetailFormState);
  const [detailFormMessage, setDetailFormMessage] = useState("");
  const [detailFormError, setDetailFormError] = useState("");
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const activeTechnicians = technicians.filter((technician) => technician.is_active);
  const selectedServiceOrder =
    serviceOrders.find((serviceOrder) => serviceOrder.id === selectedServiceOrderId) || null;

  const fetchServiceOrders = async (supabase) => {
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
          created_at,
          client_id,
          clients (
            name
          )
        `
      )
      .order("service_date", { ascending: true })
      .order("service_time", { ascending: true });

    if (error) {
      throw error;
    }

    setServiceOrders(serviceOrders || []);
    setCalendarEvents(transformServiceOrdersToEvents(serviceOrders || []));
    setCalendarError("");
    setSelectedServiceOrderId((currentSelectionId) => {
      if (!currentSelectionId) {
        return null;
      }

      return (serviceOrders || []).some(
        (serviceOrder) => serviceOrder.id === currentSelectionId
      )
        ? currentSelectionId
        : null;
    });
  };

  const fetchClients = async (supabase) => {
    setIsClientsLoading(true);

    const { data, error } = await supabase
      .from("clients")
      .select("id, name, created_at")
      .order("name", { ascending: true });

    if (error) {
      setClients([]);
      setClientsError(uiText.clients.loadError);
      setIsClientsLoading(false);
      return;
    }

    setClients(data || []);
    setClientsError("");
    setIsClientsLoading(false);
  };

  const fetchTechnicians = async (supabase) => {
    setIsTechniciansLoading(true);

    const { data, error } = await supabase
      .from("technicians")
      .select("id, full_name, is_active, created_at")
      .order("full_name", { ascending: true });

    if (error) {
      setTechnicians([]);
      setTechniciansError(uiText.technicians.loadError);
      setIsTechniciansLoading(false);
      return;
    }

    setTechnicians(data || []);
    setTechniciansError("");
    setIsTechniciansLoading(false);
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

      setUserEmail(session.user.email || "");

      try {
        await fetchServiceOrders(supabase);
      } catch (_error) {
        setCalendarError(uiText.dashboard.calendarErrorBody);
        setCalendarEvents([]);
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

      setUserEmail(session.user.email || "");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (
      !supabase ||
      (activeTab !== uiText.tabs.newServiceOrder && activeTab !== uiText.tabs.clients) ||
      clients.length > 0
    ) {
      return;
    }

    fetchClients(supabase);
  }, [activeTab, clients.length]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (
      !supabase ||
      (activeTab !== uiText.tabs.technicians &&
        activeTab !== uiText.tabs.newServiceOrder) ||
      technicians.length > 0
    ) {
      return;
    }

    fetchTechnicians(supabase);
  }, [activeTab, technicians.length]);

  useEffect(() => {
    if (!selectedServiceOrder) {
      setDetailFormState(initialDetailFormState);
      setDetailFormMessage("");
      setDetailFormError("");
      return;
    }

    // Mirror the selected order into local form state so the side panel can edit it.
    setDetailFormState({
      technicianName: selectedServiceOrder.technician_name || "",
      serviceDate: selectedServiceOrder.service_date || "",
      serviceTime: selectedServiceOrder.service_time || "9:00 AM",
      status: selectedServiceOrder.status || "scheduled"
    });
    setDetailFormMessage("");
    setDetailFormError("");
  }, [selectedServiceOrder]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !selectedServiceOrderId || technicians.length > 0) {
      return;
    }

    fetchTechnicians(supabase);
  }, [selectedServiceOrderId, technicians.length]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormError("");
    setFormMessage("");

    setFormState((currentState) => ({
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
    const { name, value } = event.target;
    setDetailFormError("");
    setDetailFormMessage("");

    setDetailFormState((currentState) => ({
      ...currentState,
      [name]: value
    }));
  };

  const handleCreateServiceOrder = async (event) => {
    event.preventDefault();
    setFormError("");
    setFormMessage("");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setFormError(uiText.serviceOrder.configError);
      return;
    }

    setIsSavingOrder(true);

    // Only persist the columns that exist in the current schema.
    const payload = {
      client_id: formState.clientId,
      technician_name: formState.technicianName.trim(),
      service_date: formState.serviceDate,
      service_time: formState.serviceTime.trim(),
      status: formState.status
    };

    const { error } = await supabase.from("service_orders").insert(payload);

    if (error) {
      setFormError(error.message || uiText.serviceOrder.createError);
      setIsSavingOrder(false);
      return;
    }

    try {
      // Re-run the same loader used by the dashboard so the calendar updates
      // immediately with the newly created service order.
      await fetchServiceOrders(supabase);
    } catch (_refreshError) {
      setCalendarError(uiText.serviceOrder.refreshError);
    }

    setFormState(initialFormState);
    setFormMessage(uiText.serviceOrder.success);
    setIsSavingOrder(false);
  };

  const handleCreateClient = async (event) => {
    event.preventDefault();
    setClientFormError("");
    setClientFormMessage("");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setClientFormError(uiText.clients.configError);
      return;
    }

    setIsSavingClient(true);

    const payload = {
      name: clientForm.name.trim()
    };

    const { error } = await supabase.from("clients").insert(payload);

    if (error) {
      setClientFormError(error.message || uiText.clients.createError);
      setIsSavingClient(false);
      return;
    }

    // Refresh shared client state so the list and service-order dropdown stay aligned.
    await fetchClients(supabase);
    setClientForm(initialClientFormState);
    setClientFormMessage(uiText.clients.success);
    setIsSavingClient(false);
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

    setIsSavingTechnician(true);

    const payload = {
      full_name: technicianForm.fullName.trim(),
      is_active: technicianForm.isActive
    };

    const { error } = await supabase.from("technicians").insert(payload);

    if (error) {
      setTechnicianFormError(error.message || uiText.technicians.createError);
      setIsSavingTechnician(false);
      return;
    }

    // Refresh the roster after insert so the new technician appears immediately.
    await fetchTechnicians(supabase);
    setTechnicianForm(initialTechnicianFormState);
    setTechnicianFormMessage(uiText.technicians.success);
    setIsSavingTechnician(false);
  };

  const handleSelectServiceOrder = (event) => {
    console.log("[Service Order Debug] Clicked calendar event:", event);
    setSelectedServiceOrderId(event?.id || null);
  };

  const handleUpdateServiceOrder = async (event) => {
    event.preventDefault();
    setDetailFormError("");
    setDetailFormMessage("");

    if (!selectedServiceOrderId) {
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setDetailFormError(uiText.serviceOrder.configError);
      return;
    }

    setIsSavingDetail(true);

    const payload = {
      technician_name: detailFormState.technicianName.trim(),
      service_date: detailFormState.serviceDate,
      service_time: detailFormState.serviceTime.trim(),
      status: detailFormState.status
    };

    const { error } = await supabase
      .from("service_orders")
      .update(payload)
      .eq("id", selectedServiceOrderId);

    if (error) {
      setDetailFormError(error.message || uiText.dashboard.detailError);
      setIsSavingDetail(false);
      return;
    }

    try {
      // Reuse the shared loader so the calendar and selected record stay in sync.
      await fetchServiceOrders(supabase);
      setDetailFormMessage(uiText.dashboard.detailSuccess);
    } catch (_refreshError) {
      setCalendarError(uiText.dashboard.calendarErrorBody);
      setDetailFormError(uiText.serviceOrder.refreshError);
    }

    setIsSavingDetail(false);
  };

  useEffect(() => {
    console.log("[Service Order Debug] Selected service order:", selectedServiceOrder);
  }, [selectedServiceOrder]);

  if (isLoading) {
    return (
      <main className="admin-dashboard">
        <div className="card dashboard-card">
          <h1>{uiText.common.loadingDashboard}</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">{uiText.dashboard.eyebrow}</p>
          <h1>{uiText.common.appName}</h1>
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
        </aside>

        <section className="calendar-panel">
          <div className="calendar-panel-header">
            <div>
              <h2>{uiText.dashboard.calendarTitle}</h2>
              <p>{uiText.dashboard.calendarSubtitle}</p>
            </div>
          </div>

          {calendarError ? (
            <div className="calendar-empty-state">
              <h3>{uiText.dashboard.calendarErrorTitle}</h3>
              <p>{calendarError}</p>
            </div>
          ) : null}

          {!calendarError && calendarEvents.length === 0 ? (
            <div className="calendar-empty-state">
              <h3>{uiText.dashboard.calendarEmptyTitle}</h3>
              <p>{uiText.dashboard.calendarEmptyBody}</p>
            </div>
          ) : null}

          {!calendarError && calendarEvents.length > 0 ? (
            <div className="calendar-shell">
              <Calendar
                localizer={localizer}
                messages={uiText.calendar.messages}
                culture="es"
                events={calendarEvents}
                defaultView="month"
                view={calendarView}
                onView={setCalendarView}
                views={["month", "week"]}
                startAccessor="start"
                endAccessor="end"
                onSelectEvent={handleSelectServiceOrder}
                style={{ height: 640 }}
                components={{
                  event: EventCard
                }}
              />
            </div>
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
                clientFormError={clientFormError}
                clientFormMessage={clientFormMessage}
                isSavingClient={isSavingClient}
                activeTechnicians={activeTechnicians}
                technicians={technicians}
                techniciansError={techniciansError}
                isTechniciansLoading={isTechniciansLoading}
                technicianForm={technicianForm}
                technicianFormError={technicianFormError}
                technicianFormMessage={technicianFormMessage}
                isSavingTechnician={isSavingTechnician}
                serviceTimeOptions={serviceTimeOptions}
                formState={formState}
                formMessage={formMessage}
                formError={formError}
                isSavingOrder={isSavingOrder}
                onFormChange={handleFormChange}
                onSubmit={handleCreateServiceOrder}
                onClientFormChange={handleClientFormChange}
                onClientSubmit={handleCreateClient}
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

              <div className="detail-row">
                <span>{uiText.dashboard.detailFields.clientName}</span>
                <strong>
                  {selectedServiceOrder.clients?.name ||
                    uiText.dashboard.detailFields.clientName}
                </strong>
              </div>

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
                <span>{uiText.dashboard.detailFields.status}</span>
                <select
                  name="status"
                  value={detailFormState.status}
                  onChange={handleDetailFormChange}
                  disabled={isSavingDetail}
                  required
                >
                  <option value="scheduled">{getStatusLabel("scheduled")}</option>
                  <option value="completed">{getStatusLabel("completed")}</option>
                  <option value="cancelled">{getStatusLabel("cancelled")}</option>
                </select>
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
    </main>
  );
}
