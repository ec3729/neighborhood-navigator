
# Neighborhood Canvassing & Survey App

## Overview
A comprehensive field surveying tool for large organizations to systematically canvass neighborhoods, record property data, and manage survey teams — with both map and list views.

---

## Phase 1: Core Foundation

### 1. Authentication & User Management
- Sign up / login for all organization members
- User roles: **Admin**, **Surveyor**, **Viewer**
- Admins can invite members and assign roles

### 2. Location Management
- Add locations by entering an address or dropping a pin on a map
- Location types: Residential, Business, Vacant, Public Space
- Each location stores: address, type, GPS coordinates, status (surveyed / not surveyed)

### 3. Survey Data Collection
- **Property condition**: Rating scale (excellent → poor) with notes on specific issues (damage, blight, maintenance)
- **Resident / Owner info**: Name, contact info, occupancy status
- **Business info**: Business name, type, hours, contact
- **Custom survey questions**: Admins can create custom question templates with text, multiple choice, rating, and yes/no question types
- **Photo uploads**: Attach multiple photos per location with optional captions

---

## Phase 2: Views & Navigation

### 4. Map View
- Interactive map showing all locations as color-coded pins (by type or survey status)
- Click a pin to see a summary and navigate to the full record
- Filter pins by location type, survey status, or assigned surveyor

### 5. List View
- Searchable, sortable table of all locations
- Filter by type, status, surveyor, date range
- Quick-view expandable rows with key details

### 6. Location Detail Page
- Full view of all collected data for a location
- Survey history and edit log
- Photo gallery

---

## Phase 3: Team & Workflow Features

### 7. Assignment & Tracking
- Admins can assign areas or specific locations to surveyors
- Dashboard showing survey progress: how many locations surveyed vs. remaining
- Activity feed of recent submissions

### 8. Data Export
- Export survey data as CSV for reporting and analysis

---

## Technical Approach
- **Backend**: Lovable Cloud (Supabase) for database, authentication, file storage, and role management
- **Map**: Leaflet (free, open-source) for interactive mapping
- **Mobile-friendly**: Responsive design so surveyors can use it on phones in the field
