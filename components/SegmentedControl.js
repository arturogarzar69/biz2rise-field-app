"use client";

export default function SegmentedControl({
  options,
  value,
  onChange,
  name,
  disabled = false,
  className = ""
}) {
  const normalizedOptions = Array.isArray(options) ? options : [];
  const hasCurrentValue = normalizedOptions.some((option) => option.value === value);
  const renderedOptions = hasCurrentValue
    ? normalizedOptions
    : value
      ? [...normalizedOptions, { value, label: value }]
      : normalizedOptions;

  return (
    <div
      className={`segmented-control${disabled ? " segmented-control-disabled" : ""}${
        className ? ` ${className}` : ""
      }`}
      role="radiogroup"
      aria-disabled={disabled}
    >
      {renderedOptions.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={
              isActive
                ? "segmented-control-option segmented-control-option-active"
                : "segmented-control-option"
            }
            disabled={disabled}
            onClick={() => onChange?.({ target: { name, value: option.value } })}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
