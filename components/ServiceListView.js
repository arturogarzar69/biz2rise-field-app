"use client";

import { uiText } from "../lib/uiText";

export default function ServiceListView({
  items,
  selectedItemKey,
  isLoading,
  error,
  onSelectItem,
  clientFilterValue,
  technicianFilterValue,
  clientOptions,
  technicianOptions,
  onClientFilterChange,
  onTechnicianFilterChange,
  formatServiceDate,
  formatDisplayTime,
  formatServiceAmountDisplay
}) {
  return (
    <div className="service-list-view">
      <div className="service-list-filters">
        <label className="calendar-filter control-group-body service-list-filter">
          <span className="control-group-label">{uiText.serviceList.filters.client}</span>
          <select
            value={clientFilterValue}
            onChange={(event) => onClientFilterChange(event.target.value)}
          >
            <option value="all">{uiText.serviceList.filters.allClients}</option>
            {clientOptions.map((client) => (
              <option key={client.id} value={client.id}>
                {client.label}
              </option>
            ))}
          </select>
        </label>

        <label className="calendar-filter control-group-body service-list-filter">
          <span className="control-group-label">{uiText.serviceList.filters.technician}</span>
          <select
            value={technicianFilterValue}
            onChange={(event) => onTechnicianFilterChange(event.target.value)}
          >
            <option value="all">{uiText.serviceList.filters.allTechnicians}</option>
            <option value="__unassigned__">
              {uiText.serviceList.filters.unassignedTechnician}
            </option>
            {technicianOptions.map((technicianName) => (
              <option key={technicianName} value={technicianName}>
                {technicianName}
              </option>
            ))}
          </select>
        </label>
      </div>

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

      {!error && !isLoading && items.length === 0 ? (
        <div className="calendar-empty-state">
          <h3>{uiText.serviceList.emptyTitle}</h3>
          <p>{uiText.serviceList.emptyBody}</p>
        </div>
      ) : null}

      {!error && !isLoading && items.length > 0 ? (
        <div className="workspace-table-wrapper service-list-table-wrapper">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>{uiText.serviceList.headers.type}</th>
                <th>{uiText.serviceList.headers.date}</th>
                <th>{uiText.serviceList.headers.time}</th>
                <th>{uiText.serviceList.headers.client}</th>
                <th>{uiText.serviceList.headers.branch}</th>
                <th>{uiText.serviceList.headers.technician}</th>
                <th>{uiText.serviceList.headers.status}</th>
                <th>{uiText.serviceList.headers.duration}</th>
                <th>{uiText.serviceList.headers.amount}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isSelected = item.key === selectedItemKey;
                const rowClassName = [
                  "workspace-table-row-action",
                  item.isOverdue ? "service-list-row-overdue" : "",
                  isSelected ? "workspace-table-row-selected" : ""
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr
                    key={item.key}
                    className={rowClassName}
                    onClick={() => onSelectItem(item)}
                  >
                    <td>
                      <div className="service-list-type-cell">
                        <span className="service-list-badge">{item.typeLabel}</span>
                        <small className="detail-subcopy">{item.typeDetail}</small>
                      </div>
                    </td>
                    <td>{formatServiceDate(item.date)}</td>
                    <td>{formatDisplayTime(item.time)}</td>
                    <td>{item.clientName}</td>
                    <td>{item.locationName}</td>
                    <td>{item.technicianName}</td>
                    <td>{item.statusLabel}</td>
                    <td>{item.durationMinutes} min</td>
                    <td>
                      {item.type === "service_order" && item.amount !== null
                        ? formatServiceAmountDisplay(item.amount)
                        : "—"}
                    </td>
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
