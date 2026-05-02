# Biz2Rise Form Patterns

## Pattern Name
**Operational Contact Rows**

## Purpose
Make client-related forms compact, consistent, and easy to extend without falling back to long traditional forms.

## Core Rules
- Use grouped repeatable sections for structured client data.
- Use compact rows instead of long stacked forms when editing repeated data.
- Place the type/tag selector on the left.
- Place the main value field on the right.
- Use a small add icon/row at the bottom of each repeatable section.
- Expand into subfields only when the item needs more detail.
- Do not use large cards for simple repeated data.

## Where To Use
Use this pattern for editable client-related data such as:
- clients
- directions
- contacts
- phones
- emails
- fiscal/commercial data
- notes when the note belongs to a repeatable client-related section

## Where Not To Use
Do not use this pattern for:
- operational comparison tables
- calendar views
- summary KPI cards
- read-only operational dashboards

## Tables vs Cards vs Repeatable Rows
- Use **tables** for comparison, status, workload, and operational overview.
- Use **repeatable rows** for editable client data and other structured repeated inputs.
- Use **cards** only for complex grouped information, contextual summaries, or multi-part detail blocks.

## Buttons And Actions
- Use primary buttons only for the main create/save action.
- Use small icon buttons for add/edit/remove inside repeatable row sections.
- Avoid large text buttons inside repeated data lists.

## Work Layer Rule
- Use the wide work layer for create/edit flows.
- Keep the internal form layout compact even when the work layer is wide.
- Avoid unnecessary vertical scroll caused by oversized sections or permanently expanded inputs.

## Anti-patterns
- Forcing users to save first before adding addresses or contacts
- Large full-width dropdowns for repeatable fields
- Giant cards for each address or contact
- Inconsistent styles between screens
- One-off visual patterns that break the shared form language
