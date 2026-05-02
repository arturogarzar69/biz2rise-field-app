"use client";

export default function RepeatableRow({
  typeLabel,
  summary,
  meta = null,
  actions = null,
  expanded = false,
  children = null,
  className = ""
}) {
  const classNames = ["repeatable-row", className].filter(Boolean).join(" ");

  return (
    <div className={classNames}>
      <div className="repeatable-row-main">
        <div className="repeatable-row-copy">
          <span className="repeatable-row-type">{typeLabel}</span>
          <strong className="repeatable-row-summary">{summary}</strong>
          {meta ? <span className="repeatable-row-meta">{meta}</span> : null}
        </div>
        {actions ? <div className="repeatable-row-actions">{actions}</div> : null}
      </div>

      {expanded && children ? <div className="repeatable-row-expanded">{children}</div> : null}
    </div>
  );
}
