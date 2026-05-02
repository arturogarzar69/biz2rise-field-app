"use client";

export default function IconButton({
  variant = "neutral",
  size = "md",
  label,
  title,
  disabled = false,
  type = "button",
  onClick,
  className = "",
  children
}) {
  const resolvedTitle = title || label;
  const classNames = [
    "icon-action-button",
    variant === "danger" ? "icon-action-button-danger" : "",
    size === "sm" ? "icon-action-button-sm" : "",
    size === "md" ? "icon-action-button-md" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classNames}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={resolvedTitle}
    >
      {children}
    </button>
  );
}
