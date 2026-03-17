

## Team Management Page

### Overview
Replace the placeholder TeamPage with a full admin team management interface. Admins can view all users with their roles, change roles, and remove team members.

### Data Sources
- `profiles` table: `user_id`, `full_name`, `avatar_url`
- `user_roles` table: `user_id`, `role`
- Join them client-side by `user_id`

### UI Components

**Team members table** showing:
- Avatar (initials fallback) + Full Name
- Email (from profiles or user metadata — note: email isn't in profiles, so we show full_name only)
- Role (badge: Admin / Surveyor / Viewer)
- Joined date (`profiles.created_at`)
- Actions: Change role dropdown, Remove member (with confirmation)

**Filters**: Text search by name, role filter dropdown

### Functionality
1. **View all members**: Fetch all profiles + user_roles, merge by `user_id`
2. **Change role**: Admin updates `user_roles` table for a user — use a Select dropdown inline or in a dialog. Prevent admin from changing their own role.
3. **Remove member**: Delete from `user_roles` (with AlertDialog confirmation). Prevent self-removal.

### File Changes

**`src/pages/TeamPage.tsx`** — Full rewrite:
- Admin guard (redirect non-admins)
- Fetch profiles + user_roles, merge into a team member list
- Table with Avatar, Name, Role badge, Joined date, Actions column
- Search filter + role filter
- Role change via Select component → update `user_roles`
- Remove member via AlertDialog → delete from `user_roles`
- Toast notifications for success/error

### Patterns
- Follow the same admin guard pattern from ReviewPage (`useEffect` redirect)
- Follow the same table/filter patterns from ZonesPage
- Use existing UI components: Table, Badge, Select, AlertDialog, Avatar, Button, Input

