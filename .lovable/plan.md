

## Add Canvas Link to Sidebar

Add a "Canvas" navigation item to the main nav section in `src/components/AppSidebar.tsx`, using the `ClipboardCheck` (or similar) icon, pointing to `/canvas`. It will sit after the existing Locations link.

### Changes

**`src/components/AppSidebar.tsx`**
- Import a suitable icon (e.g. `ClipboardCheck` from lucide-react)
- Add `{ to: "/canvas", label: "Canvas", icon: ClipboardCheck }` to the `navItems` array

**`src/components/MobileNav.tsx`**
- Add the same Canvas link to the mobile navigation for consistency

