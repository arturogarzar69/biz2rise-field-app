Service Management SaaS – Overview

Purpose

This application is a service management platform initially designed for pest control operations. It allows companies to manage their day-to-day service workflow in a structured and scalable way.

Core capabilities include:
	•	Client management
	•	Branch (location) management
	•	Technician management
	•	Service order creation and tracking
	•	Calendar-based scheduling

The long-term vision is to evolve this system into a multi-tenant SaaS platform serving multiple companies across different regions.

⸻

Current Architecture

Frontend
	•	Next.js (App Router)
	•	React-based dashboard

Backend
	•	Supabase
	•	PostgreSQL database
	•	Authentication
	•	API layer

⸻

Core Entities

Clients

Represents a business receiving services.

Branches

A client can have multiple branches (locations).
Service orders are associated with a specific branch.

Technicians

Technicians are operational resources and are assigned per service order.
They are not permanently tied to a client.

Service Orders

The central entity of the system. Each order includes:
	•	Client
	•	Branch
	•	Technician
	•	Scheduled date

Calendar

Provides weekly and monthly visualization of service orders.

⸻

Key Design Decisions

Branch-Centric Model

Clients may operate in multiple locations.
Branches allow accurate service tracking per location.

Technician Flexibility

Technicians are assigned dynamically per service order to reflect real-world operations.

Modular Data Structure

Entities are kept independent to ensure flexibility and future scalability.

⸻

Current Scope (Single-Tenant)

The system currently operates under a single company context:
	•	All data belongs to one organization
	•	No tenant isolation is enforced yet

This is intentional to:
	•	Validate workflows
	•	Refine user experience
	•	Keep development fast and focused

⸻

Future Vision: Multi-Tenant SaaS

The application is designed to evolve into a multi-tenant architecture.

Planned Entity

companies
	•	id
	•	name
	•	tax_id
	•	country
	•	settings

⸻

Multi-Tenant Model

All core tables will include a company_id:
	•	profiles
	•	clients
	•	branches
	•	technicians
	•	service_orders

Expected Behavior
	•	Each user belongs to a company
	•	Users can only access their company’s data
	•	All queries will be scoped by company_id

⸻

Security (Planned)

Future improvements include:
	•	Row Level Security (RLS) in Supabase
	•	Tenant isolation at database level
	•	Controlled administrative access
	•	Activity logging for sensitive operations

⸻

Scalability Considerations

The system is expected to scale to:
	•	Hundreds or thousands of companies
	•	Large volumes of service orders
	•	Multi-region usage

Key principles:
	•	Indexing by company_id
	•	Efficient queries
	•	Clean data relationships

⸻

Development Philosophy
	•	Start simple and evolve intentionally
	•	Avoid premature complexity
	•	Focus on real-world usability
	•	Keep the data model extensible
	•	Document key decisions early

⸻

Documentation Strategy

This file serves as the main entry point for understanding the system.

Future documentation may include:
	•	architecture.md
	•	data-model.md
	•	deployment.md
	•	security.md

⸻

Current Status

The project is in an active development and refinement stage.

Current focus:
	•	UI/UX improvements
	•	Workflow validation
	•	Operational stability

Multi-tenant implementation will be introduced once the core system stabilizes.

## Mobile Strategy (Technician App – Future Vision)

As the platform evolves, a dedicated mobile application (Android and iOS) will be required, primarily focused on field technicians.

### Context: LATAM Reality

In many LATAM markets, mobile data is relatively expensive, and technicians often:

- Use their personal phones for work
- Prefer not to consume their own mobile data for work-related apps
- May operate in areas with unstable or limited connectivity

Because of this, the mobile experience must be designed with **connectivity awareness and data efficiency as core principles**, not as afterthoughts.

---

## Connectivity-Aware Design

The mobile application must detect network conditions and adapt behavior accordingly.

### 1. WiFi Connected Mode (Automatic Sync)

When the device is connected to WiFi:

- The app should:
  - Automatically synchronize all relevant data
  - Download assigned service orders
  - Upload completed work
  - Refresh client, branch, and technician data as needed

- This should feel seamless and automatic to the user

---

### 2. Mobile Data / Offline Mode

When the device is NOT connected to WiFi:

- The app should:
  - Avoid automatic heavy synchronization
  - Preserve local data for use without connectivity
  - Allow the technician to continue working with already loaded service orders

- The technician should have control over data usage

---

### 3. Manual Sync Option

The app must include a clear and simple action:

**"Sincronizar" (Sync)**

This allows the technician to:

- Manually trigger data synchronization
- Decide when to consume mobile data
- Upload completed services
- Download updates

---

## Offline-First Behavior

The technician app should be designed with an **offline-first mindset**:

- Service orders assigned earlier should remain available without internet
- Actions like:
  - marking a service as completed
  - adding notes
should be stored locally and synced later

---

## Product Principle

> The system must respect the technician’s device, data usage, and real-world constraints.

This is critical for adoption in LATAM environments and should guide all future mobile development decisions.

---

## Future Considerations

- Local storage (on-device caching)
- Sync conflict resolution
- Lightweight payloads for data transfer
- Background sync when WiFi becomes available
- Clear UI indicators:
  - "Conectado a WiFi"
  - "Sin conexión"
  - "Pendiente de sincronizar"