

## Add Business Category Field to Locations

### Overview
Add a `category` text column to the `locations` table and expose it in the Location Details page (view + inline edit) and the Locations list page. Use a searchable combobox for selection given the extensive list of categories.

### Database Migration
Add a nullable `category` text column to the `locations` table:
```sql
ALTER TABLE public.locations ADD COLUMN category text NULL;
```
Using a plain text column (not an enum) so categories can be extended without migrations.

### Category List
Define a comprehensive set of business categories as a constant array, grouped logically. Examples:
- **Food & Dining**: Restaurant, Café, Bakery, Bar, Fast Food, Grocery Store, Food Truck, Catering
- **Retail**: Clothing, Electronics, Furniture, Hardware, Jewelry, Pet Store, Bookstore, Pharmacy, Convenience Store
- **Services**: Salon/Barbershop, Laundry, Auto Repair, Bank, Insurance, Legal, Accounting, Real Estate
- **Health & Wellness**: Doctor, Dentist, Hospital, Clinic, Gym/Fitness, Spa, Veterinary
- **Education**: School, Daycare, Tutoring, Library, College/University
- **Entertainment**: Cinema, Theater, Arcade, Museum, Gallery, Night Club, Sports Venue
- **Hospitality**: Hotel, Motel, B&B, Event Venue, Travel Agency
- **Religious**: Church, Mosque, Temple, Synagogue
- **Government**: Post Office, Fire Station, Police Station, Government Office, Community Center
- **Industrial**: Warehouse, Factory, Storage Facility, Construction
- **Other**: Parking Lot, Gas Station, Office Building, Non-Profit, Mixed Use, Other

This list (~60-70 items) will be stored as a shared constant in a new file `src/lib/categories.ts`.

### UI Changes

**1. `src/lib/categories.ts` (new)**
- Export the categories array with groupings

**2. `src/pages/LocationDetailsPage.tsx`**
- Add `category` to the Location interface and edit state
- Display category in the Details card (read-only shows text or "—")
- In edit mode, show a searchable combobox (Popover + Command) to filter and select from the category list
- Include `category` in the save/update call

**3. `src/pages/Locations.tsx`**
- Add `category` to the Location interface
- Optionally show category in the table or in a filter dropdown
- Include `category` in the Add Location dialog if desired

### Technical Details
- Use the existing `Command` (cmdk) component inside a `Popover` for the searchable dropdown — this handles the extensive list well with type-to-filter
- The `category` field is nullable and optional, so it won't break existing data

