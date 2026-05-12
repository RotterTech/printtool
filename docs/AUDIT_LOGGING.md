# Audit Logging System

## Overview
The application now has a comprehensive audit logging system that tracks all user activities across the platform. All actions are stored in the `audit_logs` table and can be viewed in the Settings Dashboard under the "Gebeurtenissen" (Events) tab.

## Database Table Structure

The `audit_logs` table contains:
- `id` (UUID) - Unique identifier
- `user_id` (UUID) - Foreign key to profiles table
- `action` (TEXT) - Action type (CREATE, UPDATE, DELETE, PRINT, LOGIN)
- `entity` (TEXT) - Entity type (REPAIR, PART_LABEL, TEAM, APK, etc.)
- `entity_id` (TEXT) - The ID of the affected entity
- `details` (JSONB) - Additional context as JSON
- `created_at` (TIMESTAMP) - When the action occurred

## Migration

Run the migration script to create the table:
```sql
-- Located at: db/migrations/2026-01-28_create_audit_logs.sql
```

If the table already exists, you'll see an error - this is normal and expected.

## Usage

### Logging an Activity

Use the `logActivity` function from `utils/logger.ts`:

```typescript
import { logActivity } from "@/utils/logger";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Simple string details
await logActivity(
  supabase,
  "CREATE",
  "REPAIR",
  jobId,
  "Nieuwe reparatie aangemaakt"
);

// Object details
await logActivity(
  supabase,
  "UPDATE",
  "REPAIR",
  jobId,
  {
    description: "Status gewijzigd",
    old_status: "Nieuw",
    new_status: "In behandeling",
    changed_fields: ["status", "notes"]
  }
);
```

### Action Types
- **CREATE** - New entity created
- **UPDATE** - Entity modified
- **DELETE** - Entity deleted
- **PRINT** - Label printed
- **LOGIN** - User logged in (future implementation)

### Entity Types
- **REPAIR** - Repair record
- **REPAIR_LABEL** - Repair label print
- **PART** - Part/inventory item
- **PART_LABEL** - Part label print
- **TEAM** - Team member (user)
- **APK** - APK maintenance record
- **REFURBISHED** - Refurbished item

## Integrated Actions

The following actions are automatically logged:

### 1. Repair Creation
- **File**: `app/api/repairs/route.ts`
- **Action**: CREATE
- **Entity**: REPAIR
- **Trigger**: New repair submitted

### 2. Repair Update
- **File**: `app/api/repairs/update/route.ts`
- **Action**: UPDATE
- **Entity**: REPAIR
- **Trigger**: Repair edited/status changed

### 3. Repair Label Print
- **File**: `app/api/print/route.ts`
- **Action**: PRINT
- **Entity**: REPAIR_LABEL
- **Trigger**: Repair label printed

### 4. Part Label Print
- **File**: `app/api/print-part/route.ts`
- **Action**: PRINT
- **Entity**: PART_LABEL
- **Trigger**: Part label printed

### 5. Team Member Deletion
- **File**: `app/api/admin/delete-user/route.ts`
- **Action**: DELETE
- **Entity**: TEAM
- **Trigger**: Admin deletes team member

## Viewing Audit Logs

### Admin Dashboard
1. Navigate to **Instellingen** (Settings)
2. Click on **Gebeurtenissen** (Events) in the sidebar
3. View the timeline of all activities

### Features
- **Real-time Timeline**: Visual timeline with icons
- **Relative Time**: Shows "2 minuten geleden" using date-fns
- **Refresh Button**: Manual refresh to load latest logs
- **User Attribution**: Shows who performed each action
- **Detailed Context**: Expandable details for each log

### Permissions
- **Admins**: Can view all audit logs
- **Regular Users**: Can only view their own logs (RLS enforced)

## UI Components

### AuditLogSection Component
Located at: `app/settings/components/AuditLogSection.tsx`

Features:
- Icon-based action indicators (color-coded)
- Timeline layout with connecting lines
- Relative time formatting (Dutch locale)
- User name display
- Expandable details
- Empty state handling
- Refresh functionality

### Action Colors
- **CREATE** (Green) - PlusCircle icon
- **UPDATE** (Blue) - Edit icon
- **DELETE** (Red) - Trash2 icon
- **PRINT** (Purple) - Printer icon
- **LOGIN** (Gray) - LogIn icon

## Security

### Row Level Security (RLS)
- Users can only insert logs for themselves
- Users can view their own logs
- Admins can view all logs
- Enforced at database level

### Indexes
- `idx_audit_logs_user_id` - Fast user filtering
- `idx_audit_logs_created_at` - Chronological sorting
- `idx_audit_logs_entity` - Entity-based queries
- `idx_audit_logs_action` - Action-based queries

## Future Enhancements

### Potential Additions
1. **Login Tracking** - Log user authentication events
2. **Export Functionality** - Download audit logs as CSV/PDF
3. **Advanced Filtering** - Filter by date range, action, entity
4. **Search** - Search through log details
5. **Retention Policy** - Auto-archive old logs
6. **Notifications** - Alert admins of critical actions
7. **Audit Report Generation** - Compliance reports

## Troubleshooting

### Table Already Exists Error
**Message**: `relation "audit_logs" already exists`
**Solution**: This is normal - the table is already created. No action needed.

### No Logs Appearing
1. Check if user is authenticated
2. Verify user has permission (admin for all logs)
3. Check browser console for errors
4. Verify audit_logs table exists in Supabase
5. Check RLS policies are enabled

### Missing User Names
- Ensure the foreign key relationship exists: `audit_logs_user_id_fkey`
- Verify the join query includes user data
- Check profiles table has user data

## Testing

To test the audit logging:

1. **Create a Repair**: Go to Inboeken → Submit form → Check logs
2. **Edit a Repair**: Go to Dashboard → Edit repair → Check logs
3. **Print a Label**: Print any repair label → Check logs
4. **Delete a User**: Settings → Team → Delete user → Check logs

All actions should appear in Settings → Gebeurtenissen within seconds.

## Code Structure

```
utils/
  └── logger.ts                 # Core logging utility

app/
  └── settings/
      ├── page.tsx              # Server component - fetches logs
      ├── SettingsClient.tsx    # Client wrapper with tabs
      └── components/
          └── AuditLogSection.tsx   # Timeline visualization

  └── api/
      ├── repairs/
      │   ├── route.ts          # CREATE logs
      │   └── update/
      │       └── route.ts      # UPDATE logs
      ├── print/
      │   └── route.ts          # REPAIR_LABEL print logs
      ├── print-part/
      │   └── route.ts          # PART_LABEL print logs
      └── admin/
          └── delete-user/
              └── route.ts      # TEAM delete logs

db/
  └── migrations/
      └── 2026-01-28_create_audit_logs.sql
```

## Support

For issues or questions about the audit logging system:
1. Check this documentation first
2. Review the code comments in `utils/logger.ts`
3. Inspect the browser console for errors
4. Check Supabase dashboard for RLS policies
5. Verify environment variables are set correctly
