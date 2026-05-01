"use client";

import { isOverdueServiceOrder, resolveDurationMinutes } from "../lib/serviceOrderUtils";
import { formatDisplayTime, getStatusLabel, uiText } from "../lib/uiText";

function getRecurringLabel(serviceOrder) {
  return serviceOrder?.is_recurring ? uiText.serviceList.recurringYes : uiText.serviceList.recurringNo;
}

function getFrequencyLabel(serviceOrder) {
  if (!serviceOrder?.is_recurring) {
    return "";
  }

  return (
    uiText.serviceOrder.recurrenceOptions[serviceOrder.recurrence_type] ||
    serviceOrder.recurrence_type ||
    ""
  );
}

function formatServiceAmountDisplay(amountValue) {
  const parsedAmount = Number(amountValue);

  if (!Number.isFinite(parsedAmount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parsedAmount);
}

export default function ServiceListView({
  serviceOrders,
  selectedServiceOrderId,
  isLoading,
  error,
  onSelectServiceOrder,
  getClientDisplayName,
  resolveEffectiveServiceLocation,
  formatServiceDate
}) {
  return (
    <div className="service-list-view">
      {error ? (
        <div className="calendar-empty-state">
          <h3>{uiText.dashboard.calendarErrorTitle}</h3>
          <p>{error}</p>
        </div>
      ) : null}

      {!error && isLoading ? (
        <div className="calendar-empty-state">
          <h3>{uiText.common.loadingDashboard}</h3>
        </div>
      ) : null}

      {!error && !isLoading && serviceOrders.length === 0 ? (
        <div className="calendar-empty-state">
          <h3>{uiText.serviceList.emptyTitle}</h3>
          <p>{uiText.serviceList.emptyBody}</p>
        </div>
      ) : null}

      {!error && !isLoading && serviceOrders.length > 0 ? (
        <div className="workspace-table-wrapper service-list-table-wrapper">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>{uiText.serviceList.headers.date}</th>
                <th>{uiText.serviceList.headers.time}</th>
                <th>{uiText.serviceList.headers.client}</th>
                <th>{uiText.serviceList.headers.branch}</th>
                <th>{uiText.serviceList.headers.technician}</th>
                <th>{uiText.serviceList.headers.status}</th>
                <th>{uiText.serviceList.headers.recurring}</th>
                <th>{uiText.serviceList.headers.frequency}</th>
                <th>{uiText.serviceList.headers.duration}</th>
                <th>{uiText.serviceList.headers.amount}</th>
              </tr>
            </thead>
            <tbody>
              {serviceOrders.map((serviceOrder) => {
                const isSelected = serviceOrder.id === selectedServiceOrderId;
                const isOverdue = isOverdueServiceOrder(
                  serviceOrder.service_date,
                  serviceOrder.service_time,
                  serviceOrder.status,
                  serviceOrder.duration_minutes
                );
                const rowClassName = [
                  "workspace-table-row-action",
                  isOverdue ? "service-list-row-overdue" : "",
                  isSelected ? "workspace-table-row-selected" : ""
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr
                    key={serviceOrder.id}
                    className={rowClassName}
                    onClick={() => onSelectServiceOrder(serviceOrder)}
                  >
                    <td>{formatServiceDate(serviceOrder.service_date)}</td>
                    <td>{formatDisplayTime(serviceOrder.service_time)}</td>
                    <td>{getClientDisplayName(serviceOrder.clients)}</td>
                    <td>
                      {resolveEffectiveServiceLocation(serviceOrder).name ||
                        uiText.dashboard.branchEmpty}
                    </td>
                    <td>
                      {serviceOrder.technician_name ||
                        uiText.dashboard.calendarTechnicianFallback}
                    </td>
                    <td>{getStatusLabel(serviceOrder.status)}</td>
                    <td>
                      {serviceOrder.is_recurring ? (
                        <span className="service-list-badge">
                          {uiText.serviceList.recurringBadge}
                        </span>
                      ) : (
                        getRecurringLabel(serviceOrder)
                      )}
                    </td>
                    <td>{getFrequencyLabel(serviceOrder)}</td>
                    <td>{resolveDurationMinutes(serviceOrder.duration_minutes)} min</td>
                    <td>{formatServiceAmountDisplay(serviceOrder.service_amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
