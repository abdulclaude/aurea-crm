# Arketa Forms Parity Audit

Date: 2026-07-17

## Safety boundary

The Arketa inspection was read-only. No form was saved, duplicated, deleted, or
published. A locally created unsaved question was discarded by cancelling the
editor and returning to the forms list.

## Observed Arketa surfaces

### Forms list

- Columns: Name, Created, Landing Page Link
- Row actions: View, Edit, Duplicate, Delete
- Each form opens a response list with:
  - Photo
  - Name
  - Date Completed
  - Email
  - client search
  - CSV export
  - pagination

### Builder settings

- Details:
  - Name
  - Title
  - Subtitle
  - Redirect URL
  - Custom lifecycle stage
  - Custom lead source
  - Show one time only
- Submission message
- Styling:
  - Background color
  - Text color
  - Primary color
- Visibility:
  - service categories
  - templates
  - pricing options
  - communities
- Questions are expandable rows with field type, label, required state, and
  type-specific options.
- A live preview switches between Form and Submitted states.

### Field type select

- Small Text
- Medium Text
- Number
- Drop down with options
- Checkbox
- Multiple Choice
- Client Shipping Address
- Client Phone Number
- Client Birthday
- Date
- Liability Waiver
- Marketing Opt-In (Email)
- Marketing Opt-In (SMS)
- Signature
- tenant-defined custom fields

The select also explained that liability waivers are available only through a
direct form link.

### Tenant resource selects

Lifecycle stages, service categories, templates, pricing options, communities,
and custom fields were populated from the signed-in tenant. The observed option
names are not platform constants and must not be hardcoded.

## Aurea additions

### Forms table

- Shared `DataTable` and `StudioTableToolbar`
- Search, status filters, sorting, column visibility, and pagination
- Form, status, steps, responses, landing page, created, and updated columns
- Edit, view responses, create automation, duplicate, archive, and delete
  actions
- Publication state linked to the publication control plane

### Response table

- Shared `DataTable` and `StudioTableToolbar`
- Server-backed respondent/source search across the complete response set
- Member-resolution and automation-status filters
- Newest/oldest submitted sorting
- Column visibility/order controls and CSV export

### Builder

- Details, submission behavior, layout, and visual-style settings
- Per-form background, text, and primary colors with swatches and hex inputs
- Multi-step forms with progress control
- Expandable question settings
- Type changes, labels, placeholders, help text, defaults, options, numeric
  limits, required state, and field removal
- Live Form and Submitted previews using the public runtime controls
- Member profile resolution controls

### Field catalog

- Contact: first name, last name, email, phone, shipping address
- Questions: short text, long text, number, website
- Choice: dropdown, multiple choice, checkbox group, checkbox
- Consent: email and SMS marketing opt-ins
- Date and time: birthday, date, time, date and time
- Advanced: rating and slider
- Signature, file upload, and payment remain visible but disabled until their
  required organization-owned storage, retention, and payment capabilities are
  configured.

### Sharing

- Versioned public form publication
- Form colors stored in the immutable published source snapshot
- Direct public form route
- Exact-origin website allowlist
- Sandboxed iframe embed code
- Publication state and embed management in one sheet

## Deliberate differences

- Arketa tenant option names were not copied. Aurea resource selectors must be
  location-scoped and populated from Aurea records.
- Operational field types are not presented as working until their secure
  storage, retention, provider, and execution contracts exist.
- Public forms reuse the immutable publication snapshot rather than rendering
  the mutable draft.

## Follow-up gaps

- Add tenant resource visibility rules for services, templates, pricing
  options, and communities once the corresponding Aurea resource selectors are
  available in the builder.
- Add a configurable one-time-display rule with a clear browser-identity and
  privacy contract.
- Add lifecycle stage and lead-source submission mappings through the member
  resolution configuration.
- Preserve historical field labels with each submission so renamed or deleted
  draft fields do not change old response displays.
