"use client";

import { cloneElement, isValidElement, useEffect, useState } from "react";
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

const defaultClientSubTab = uiText.clients.subTabs.list;
const defaultTechnicianSubTab = uiText.technicians.subTabs.list;

const initialFormState = {
  clientId: "",
  branchId: "",
  technicianName: "",
  serviceDate: "",
  serviceTime: "9:00 AM",
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
  businessName: "",
  tradeName: "",
  taxId: "",
  mainAddress: "",
  mainPhone: "",
  mainContact: "",
  mainEmail: ""
};

const initialDetailFormState = {
  technicianName: "",
  serviceDate: "",
  serviceTime: "9:00 AM",
  status: "scheduled"
};

const initialBranchFormState = {
  name: "",
  address: "",
  phone: "",
  contact: "",
  notes: ""
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
      title: getClientDisplayName(serviceOrder.clients),
      clientName: getClientDisplayName(serviceOrder.clients),
      branchName: getBranchDisplayName(serviceOrder.branches),
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

function EventCard({ event }) {
  return (
    <div className="calendar-event">
      <strong>{event.clientName}</strong>
      <span>{event.branchName}</span>
    </div>
  );
}

function CalendarEventWrapper({ children, event }) {
  if (!isValidElement(children)) {
    return children;
  }

  // Force every calendar view to use the same visible event body and discard
  // any built-in time label markup injected by react-big-calendar internals.
  return cloneElement(
    children,
    undefined,
    <div className="rbc-event-content">
      <EventCard event={event} />
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
  formState,
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
              {formState.clientId && !isBranchesLoading && availableBranches.length === 0 ? (
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
                !formState.branchId ||
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
                      <th>{uiText.clients.headers.phone}</th>
                      <th>{uiText.clients.headers.contact}</th>
                      <th>{uiText.clients.headers.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id}>
                        <td>{client.displayName}</td>
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
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarError, setCalendarError] = useState("");
  const [calendarView, setCalendarView] = useState("week");
  const [selectedServiceOrderId, setSelectedServiceOrderId] = useState(null);
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
  const activeTechnicians = technicians.filter((technician) => technician.is_active);
  const availableBranches = branchesByClientId[formState.clientId] || [];
  const branches = branchesByClientId[selectedBranchClientId] || [];
  const selectedBranch =
    branches.find((branch) => branch.id === selectedBranchId) || null;
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
          branch_id,
          clients (
            name,
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
      .select(
        `
          id,
          name,
          business_name,
          trade_name,
          tax_id,
          main_address,
          main_phone,
          main_contact,
          main_email,
          created_at
        `
      );

    if (error) {
      setClients([]);
      setClientsError(uiText.clients.loadError);
      setIsClientsLoading(false);
      return;
    }

    const sortedClients = (data || [])
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

  const fetchBranchesForClient = async (supabase, clientId) => {
    if (!clientId) {
      return [];
    }

    setIsBranchesLoading(true);

    const { data, error } = await supabase
      .from("branches")
      .select("id, client_id, name, address, phone, contact, notes, created_at")
      .eq("client_id", clientId)
      .order("name", { ascending: true });

    if (error) {
      setBranchesError(uiText.clients.branchesLoadError);
      setIsBranchesLoading(false);
      return [];
    }

    const branchRecords = data || [];

    setBranchesByClientId((currentState) => ({
      ...currentState,
      [clientId]: branchRecords
    }));
    setBranchesError("");
    setIsBranchesLoading(false);
    return branchRecords;
  };

  const fetchTechnicians = async (supabase) => {
    setIsTechniciansLoading(true);

    let supportsExtendedFields = true;
    let { data, error } = await supabase
      .from("technicians")
      .select("id, full_name, phone, address, notes, is_active, created_at")
      .order("full_name", { ascending: true });

    if (error) {
      supportsExtendedFields = false;

      const fallbackResult = await supabase
        .from("technicians")
        .select("id, full_name, is_active, created_at")
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
    const supabase = getSupabaseClient();

    if (!supabase || !formState.clientId) {
      return;
    }

    fetchBranchesForClient(supabase, formState.clientId);
  }, [formState.clientId]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !selectedBranchClientId) {
      return;
    }

    fetchBranchesForClient(supabase, selectedBranchClientId);
  }, [selectedBranchClientId]);

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
    const { name, value } = event.target;
    setFormError("");
    setFormMessage("");

    setFormState((currentState) => ({
      ...currentState,
      branchId: name === "clientId" ? "" : currentState.branchId,
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
      branch_id: formState.branchId,
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

    const businessName = clientForm.businessName.trim();
    const tradeName = clientForm.tradeName.trim();
    const payload = {
      // Keep the legacy `name` column aligned so existing dropdowns and older
      // records continue to display a usable client label.
      name: tradeName || businessName,
      business_name: businessName,
      trade_name: tradeName,
      tax_id: clientForm.taxId.trim(),
      main_address: clientForm.mainAddress.trim(),
      main_phone: clientForm.mainPhone.trim(),
      main_contact: clientForm.mainContact.trim(),
      main_email: clientForm.mainEmail.trim()
    };

    const clientQuery = selectedClientId
      ? supabase.from("clients").update(payload).eq("id", selectedClientId)
      : supabase.from("clients").insert(payload);
    const { error } = await clientQuery;

    if (error) {
      setClientFormError(error.message || uiText.clients.createError);
      setIsSavingClient(false);
      return;
    }

    // Refresh shared client state so the list and service-order dropdown stay aligned.
    await fetchClients(supabase);
    setClientForm(initialClientFormState);
    setSelectedClientId(null);
    setClientFormMessage(
      selectedClientId ? uiText.clients.updateSuccess : uiText.clients.success
    );
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

    const supabase = getSupabaseClient();

    if (!supabase) {
      setBranchFormError(uiText.clients.configError);
      return;
    }

    setIsSavingBranch(true);

    const payload = {
      client_id: selectedBranchClientId,
      name: branchForm.name.trim(),
      address: branchForm.address.trim(),
      phone: branchForm.phone.trim(),
      contact: branchForm.contact.trim(),
      notes: branchForm.notes.trim()
    };

    const branchQuery = selectedBranchId
      ? supabase.from("branches").update(payload).eq("id", selectedBranchId)
      : supabase.from("branches").insert(payload);
    const { error } = await branchQuery;

    if (error) {
      setBranchFormError(error.message || uiText.clients.branchCreateError);
      setIsSavingBranch(false);
      return;
    }

    await fetchBranchesForClient(supabase, selectedBranchClientId);
    if (formState.clientId === selectedBranchClientId) {
      await fetchBranchesForClient(supabase, formState.clientId);
    }
    setBranchForm(initialBranchFormState);
    setSelectedBranchId(null);
    setBranchFormMessage(
      selectedBranchId
        ? uiText.clients.branchUpdateSuccess
        : uiText.clients.branchCreateSuccess
    );
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

    setIsSavingTechnician(true);

    const payload = {
      full_name: technicianForm.fullName.trim(),
      is_active: technicianForm.isActive
    };

    if (supportsExtendedTechnicianFields) {
      payload.phone = technicianForm.phone.trim();
      payload.address = technicianForm.address.trim();
      payload.notes = technicianForm.notes.trim();
    }

    const technicianQuery = selectedTechnicianId
      ? supabase.from("technicians").update(payload).eq("id", selectedTechnicianId)
      : supabase.from("technicians").insert(payload);
    const { error } = await technicianQuery;

    if (error) {
      setTechnicianFormError(error.message || uiText.technicians.createError);
      setIsSavingTechnician(false);
      return;
    }

    // Refresh the roster after insert so the new technician appears immediately.
    await fetchTechnicians(supabase);
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
                defaultView="week"
                view={calendarView}
                onView={setCalendarView}
                views={["month", "week"]}
                startAccessor="start"
                endAccessor="end"
                onSelectEvent={handleSelectServiceOrder}
                style={{ height: 640 }}
                components={{
                  event: EventCard,
                  eventWrapper: CalendarEventWrapper
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
                formState={formState}
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
