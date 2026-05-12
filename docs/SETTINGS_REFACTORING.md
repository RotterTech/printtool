# Settings Page Refactoring - Audit Logs

## Overview
The Settings page has been refactored to ensure audit logs are **always visible** with independent data fetching.

## Changes Made

### 1. New Component: AuditLogList
**File**: `app/settings/components/AuditLogList.tsx`

**Purpose**: Dedicated server component that independently fetches and displays audit logs

**Key Features**:
- ✅ Independent Supabase data fetching (not reliant on parent props)
- ✅ Direct SQL query: `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50`
- ✅ Automatic user role verification (only admins can view)
- ✅ Beautiful timeline layout with icons and colors
- ✅ Comprehensive error handling with debug info
- ✅ Empty state with debug information

**Data Structure**:
```typescript
interface AuditLog {
  id: string;
  user_id: string;
  action: string;        // CREATE, UPDATE, DELETE, PRINT, LOGIN
  entity: string;        // REPAIR, TEAM, PART_LABEL, etc.
  entity_id: string;     // The specific ID of the affected entity
  details: Record<string, any> | null;  // Additional context
  created_at: string;    // Timestamp
  user?: {
    full_name?: string;
    email: string;
  } | null;
}
```

**Icon & Color Mapping**:
| Action | Color | Icon | 
|--------|-------|------|
| CREATE | 🟢 Green | PlusCircle |
| UPDATE | 🔵 Blue | Edit |
| DELETE | 🔴 Red | Trash2 |
| PRINT | 🟣 Purple | Printer |
| LOGIN | ⚪ Gray | LogIn |

### 2. Refactored: page.tsx
**File**: `app/settings/page.tsx`

**Changes**:
- Removed audit log fetching from main page
- Now imports and renders `<AuditLogList />` component
- Cleaner separation of concerns
- Audit logs always fetch independently

**New Layout**:
```
Settings Page
├── SettingsClient (tabs for profile, team, printers)
└── AuditLogList (always visible below settings)
```

### 3. Simplified: SettingsClient.tsx
**File**: `app/settings/SettingsClient.tsx`

**Changes**:
- Removed `auditLogs` prop
- Removed "Gebeurtenissen" tab (no longer in sidebar)
- Now only handles profile, team, and printer settings
- Cleaner component interface

## Display Logic

### When Logs ARE Visible:
1. User is authenticated ✅
2. User is an admin ✅
3. Logs exist in database ✅
4. Query succeeds ✅

→ **Timeline displays with all actions**

### When Logs Are NOT Visible:

| Condition | Message |
|-----------|---------|
| Not logged in | "Niet ingelogd" |
| User profile missing | "Profiel niet gevonden" |
| User is not admin | "Beheerder toegang vereist" |
| Query error | "Fout bij laden van logs" |
| No logs in DB | "Geen logs gevonden" + Debug info |

## Debugging

### Console Logs
The component outputs debug information:
```
📥 Fetching audit logs from database...
✅ Successfully fetched 12 audit logs
```

### Expandable Debug Info
When no logs are found, an expandable section shows:
```json
{
  "userId": "...",
  "userRole": "admin",
  "logsCount": 0,
  "timestamp": "2026-01-28T..."
}
```

## Testing the Implementation

### Test 1: View Logs
1. Go to `http://localhost:3000/settings`
2. Log in as admin
3. Scroll down to "Gebeurtenissen & Logs" section
4. Should see timeline or "Geen logs gevonden" message

### Test 2: Generate New Logs
1. Create a repair (Inboeken)
2. Scroll down to Audit Logs section
3. **Should immediately see**: New CREATE REPAIR entry

### Test 3: Check Console
Open browser DevTools → Console
Look for:
```
✅ Successfully fetched X audit logs
```

### Test 4: Debug Info
If no logs appear:
1. Check if user is admin
2. Expand "Debug Info" section
3. Verify userId and userRole
4. Check Supabase audit_logs table directly

## File Structure

```
app/settings/
├── page.tsx                          # Server page - fetches profiles, renders children
├── SettingsClient.tsx                # Client component - tabbed interface
├── components/
│   ├── AuditLogList.tsx             # NEW - Dedicated audit log display
│   ├── CompanyProfileSection.tsx
│   ├── TeamManagementSection.tsx
│   ├── PrinterSettingsSection.tsx
│   └── AuditLogSection.tsx           # DEPRECATED - Old unused version
```

## Key Improvements

| Before | After |
|--------|-------|
| Logs fetched in page.tsx | Logs fetched independently |
| Passed as props | Self-contained component |
| Might be missed if prop fails | Always rendered and visible |
| Complex parent-child dependency | Clean separation of concerns |
| Fixed in Ereignisse tab | Always visible below settings |

## SQL Query Used

```sql
SELECT 
  id,
  user_id,
  action,
  entity,
  entity_id,
  details,
  created_at,
  user:profiles(full_name, email)
FROM audit_logs
ORDER BY created_at DESC
LIMIT 50
```

## Expected Output

When viewing the settings page, you should see:

```
┌─────────────────────────────────────────────────────────┐
│ Instellingen                                            │
│ Beheer bedrijfsinformatie...                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Bedrijfsprofiel] [Team Beheer] [Printers & Labels]   │
│                                                         │
│ (Selected tab content shown here)                      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Gebeurtenissen & Logs                                   │
│ Alle gebruikersacties in het systeem (12 logs)         │
│                                                         │
│  🟢 Admin heeft Reparatie #ABC123 aangemaakt           │
│     Nieuwe reparatie aangemaakt...                      │
│     5 min geleden                                       │
│     │                                                   │
│  🔵 Admin heeft Reparatie #ABC123 bewerkt              │
│     Status: In behandeling                              │
│     10 min geleden                                      │
│                                                         │
│  ... more logs ...                                      │
└─────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Issue: Audit Logs Section Not Showing

**Check**:
1. Are you an admin? (Required to view logs)
2. Are there any logs in the database?
3. Check browser console for errors
4. Check server logs for fetch errors

**Solution**:
```bash
# Check logs in Supabase
SELECT COUNT(*) FROM audit_logs;

# Create test log manually
INSERT INTO audit_logs (user_id, action, entity, entity_id)
VALUES ('YOUR_USER_ID', 'TEST', 'SYSTEM', 'test-001');
```

### Issue: "Geen logs gevonden"

**This is normal if**:
- No actions have been performed yet
- All actions are older than logs kept

**To generate logs**:
1. Create a new repair
2. Edit a repair
3. Print a label
4. Each action creates a log entry

### Issue: Logs Not Updating

**Solution**:
1. Refresh the page (F5)
2. Clear browser cache
3. Check if actions are being logged (check API response)

## Next Steps

1. ✅ Verify logs display correctly
2. ✅ Test all log types (create, update, delete, print)
3. ✅ Confirm user isolation works (non-admins see message)
4. 🔄 Consider adding search/filter functionality
5. 🔄 Consider adding export to CSV
6. 🔄 Consider adding date range filtering
