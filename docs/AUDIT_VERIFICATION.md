# Audit Logs Verification Checklist

## 🎯 Quick Verification Steps

### 1. Check Database Table
Run in Supabase SQL Editor:
```sql
SELECT COUNT(*) FROM audit_logs;
```
**Expected**: Should return the number of logged actions (may be 0 if no actions taken yet)

### 2. Verify RLS Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'audit_logs';
```
**Expected**: Should show two policies:
- `audit_logs_select_authenticated`
- `audit_logs_insert_authenticated`

### 3. Test Manual Insert
Replace `YOUR_USER_ID` with your actual user ID from the profiles table:
```sql
INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
VALUES (
    'YOUR_USER_ID',
    'TEST',
    'SYSTEM',
    'manual-test-001',
    '{"description": "Manual test entry", "source": "SQL Editor"}'::jsonb
)
RETURNING *;
```
**Expected**: Should insert successfully and return the new row

### 4. View Recent Logs with User Info
```sql
SELECT 
    al.action,
    al.entity,
    al.entity_id,
    al.details,
    al.created_at,
    p.full_name,
    p.email
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id
ORDER BY al.created_at DESC
LIMIT 10;
```
**Expected**: Should show recent logs with user names/emails

## 🖥️ Frontend Verification

### 1. Access Settings Page
1. Navigate to: `http://localhost:3000/settings` (or your domain)
2. Log in as an **admin** user
3. Click on **"Gebeurtenissen"** in the left sidebar

**Expected Result**: 
- ✅ Gebeurtenissen tab is visible (only for admins)
- ✅ Page loads without errors
- ✅ Timeline appears (or "Geen gebeurtenissen" if no logs)

### 2. Check Browser Console
Open Developer Tools → Console tab

**Expected Logs**:
```
✅ Fetched X audit logs for admin
📊 AuditLogSection received X logs
Sample log: {id: "...", action: "...", ...}
```

**Red Flags** (should NOT see):
```
❌ Error fetching audit logs
❌ TypeError: Cannot read property...
❌ RLS policy violation
```

### 3. Test Refresh Button
1. In Gebeurtenissen tab, click **"Verversen"** (top-right)
2. Watch the button show spinning icon briefly

**Expected**: 
- ✅ Button animates
- ✅ Page reloads data
- ✅ No errors in console

### 4. Test Log Creation
Perform any of these actions and then refresh the Gebeurtenissen page:

**Action A: Create a Repair**
1. Go to "Inboeken"
2. Fill out the repair form
3. Submit
4. Go back to Settings → Gebeurtenissen
5. **Expected**: Should see new `CREATE - REPAIR` entry

**Action B: Edit a Repair**
1. Go to Dashboard
2. Click Edit on any repair
3. Change status or any field
4. Save
5. Check Gebeurtenissen
6. **Expected**: Should see new `UPDATE - REPAIR` entry

**Action C: Print a Label**
1. Print any repair or part label
2. Check Gebeurtenissen
3. **Expected**: Should see new `PRINT - REPAIR_LABEL` or `PRINT - PART_LABEL` entry

**Action D: Delete a User (Admin only)**
1. Settings → Team Beheer
2. Delete a non-admin user
3. Check Gebeurtenissen
4. **Expected**: Should see new `DELETE - TEAM` entry

## 🐛 Troubleshooting

### Issue: "Geen gebeurtenissen gevonden"

**Possible Causes**:
1. ✅ **Normal**: No actions have been logged yet
2. ❌ **RLS Issue**: User doesn't have permission to view logs
3. ❌ **Query Issue**: Join or filter is incorrect

**Solution**:
```sql
-- Check if ANY logs exist
SELECT COUNT(*) FROM audit_logs;

-- If > 0, check RLS by running as admin
SELECT * FROM audit_logs LIMIT 5;

-- Insert a test log (see step 3 above)
```

### Issue: "Error fetching audit logs" in console

**Check**:
1. Environment variables are set (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
2. Foreign key constraint exists: `audit_logs_user_id_fkey`
3. Table and policies exist

**Run this check**:
```sql
-- Verify foreign key exists
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'audit_logs' 
  AND tc.constraint_type = 'FOREIGN KEY';
```

### Issue: Gebeurtenissen tab not visible

**Check**:
1. User role is `admin` (only admins see this tab)
2. Query your role:
```sql
SELECT id, email, role FROM profiles WHERE email = 'your@email.com';
```
3. Update role if needed:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### Issue: Logs show but no user names

**Problem**: Foreign key join might be failing

**Check**:
```sql
-- See if user data is properly joined
SELECT 
    al.*,
    p.full_name,
    p.email
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id
LIMIT 5;
```

**If NULL**: The `user_id` in audit_logs doesn't match any profile
**Solution**: Check user IDs match between tables

### Issue: Timestamps showing wrong timezone

**Fix**: Date-fns should use Dutch locale automatically

**Verify in code**:
```typescript
import { nl } from "date-fns/locale";
formatDistanceToNow(new Date(log.created_at), {
  addSuffix: true,
  locale: nl, // ← Should be present
})
```

## ✅ Success Criteria

Your audit logging system is working correctly if:

- [ ] Audit logs table exists in Supabase
- [ ] RLS policies are active and correct
- [ ] Manual SQL insert works
- [ ] Settings page loads without errors
- [ ] Gebeurtenissen tab is visible (for admins)
- [ ] Creating a repair generates a log entry
- [ ] Editing a repair generates a log entry
- [ ] Printing a label generates a log entry
- [ ] Deleting a user generates a log entry
- [ ] Logs show user names correctly
- [ ] Timestamps show relative time ("X min geleden")
- [ ] Refresh button works
- [ ] Icons are color-coded correctly
- [ ] Timeline layout displays properly

## 🎨 Visual Check

When viewing the Gebeurtenissen tab, you should see:

```
┌─────────────────────────────────────────────────┐
│ Gebeurtenissen                    [Verversen]   │
│ Bekijk alle acties...                           │
├─────────────────────────────────────────────────┤
│                                                 │
│  🟢 Admin heeft Reparatie #ABC123 aangemaakt   │
│     Nieuwe reparatie aangemaakt...              │
│     2 minuten geleden                           │
│     │                                           │
│  🔵 Medewerker heeft Reparatie #ABC123 bewerkt │
│     Status: In behandeling                      │
│     5 minuten geleden                           │
│     │                                           │
│  🟣 Admin heeft Onderdeel Label #DEF456 geprint│
│     Label geprint voor onderdeel...             │
│     10 minuten geleden                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 📞 Still Having Issues?

1. Check [docs/AUDIT_LOGGING.md](./AUDIT_LOGGING.md) for full documentation
2. Run [db/test_audit_logs.sql](../db/test_audit_logs.sql) for diagnostics
3. Check browser console for JavaScript errors
4. Check server logs for API errors
5. Verify Supabase dashboard for RLS policy status

## 🚀 Next Steps After Verification

Once everything works:
1. Test all logged actions (create, update, delete, print)
2. Verify logs appear in real-time
3. Test as both admin and regular user
4. Consider adding more action types (login, export, etc.)
5. Set up log retention policy if needed
6. Consider exporting logs for compliance
