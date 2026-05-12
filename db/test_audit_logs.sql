-- Test Script: Verify Audit Logs Table and Data
-- Run this in Supabase SQL Editor to check your audit logs

-- 1. Check if the table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- 2. Count total audit logs
SELECT COUNT(*) as total_logs FROM audit_logs;

-- 3. View the 10 most recent audit logs
SELECT 
    al.id,
    al.action,
    al.entity,
    al.entity_id,
    al.details,
    al.created_at,
    p.full_name as user_name,
    p.email as user_email
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id
ORDER BY al.created_at DESC
LIMIT 10;

-- 4. Count logs by action type
SELECT 
    action,
    COUNT(*) as count
FROM audit_logs
GROUP BY action
ORDER BY count DESC;

-- 5. Count logs by entity type
SELECT 
    entity,
    COUNT(*) as count
FROM audit_logs
GROUP BY entity
ORDER BY count DESC;

-- 6. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'audit_logs';

-- 7. Test inserting a test log (replace 'YOUR_USER_ID' with actual user ID)
-- Uncomment the lines below to test
/*
INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
VALUES (
    'YOUR_USER_ID',
    'TEST',
    'SYSTEM',
    'test-001',
    '{"description": "Test log entry from SQL"}'::jsonb
)
RETURNING *;
*/

-- 8. View logs for a specific user (replace 'YOUR_USER_ID')
/*
SELECT 
    action,
    entity,
    entity_id,
    details,
    created_at
FROM audit_logs
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
*/
