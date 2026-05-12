import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Service-role client for inserting audit logs (bypasses RLS)
const getServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * Log user activity to the audit_logs table
 * @param supabase - Supabase client instance (used as fallback for user detection only)
 * @param action - The action performed (e.g., 'CREATE', 'UPDATE', 'DELETE', 'PRINT')
 * @param entity - The entity type (e.g., 'REPAIR', 'PART', 'TEAM', 'APK')
 * @param entityId - The ID of the entity affected
 * @param details - Additional details about the action (optional)
 * @param userId - User ID to log (optional, falls back to supabase.auth.getUser())
 * @returns Promise<void>
 */
export const logActivity = async (
  supabase: SupabaseClient,
  action: string,
  entity: string,
  entityId: string,
  details?: string | Record<string, any>,
  userId?: string
): Promise<void> => {
  try {
    // Use provided userId or try to get from session
    let uid = userId;
    if (!uid) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      uid = user?.id;
    }

    if (!uid) {
      console.warn("⚠️ Skipping audit log: No user ID available");
      return;
    }

    // Prepare details object
    const detailsObj =
      typeof details === "string" ? { description: details } : details || {};

    const actionUpper = action.toUpperCase();

    // Use service role client to bypass RLS for audit logging
    const serviceClient = getServiceClient();
    const { error } = await serviceClient.from("audit_logs").insert({
      user_id: uid,
      action: actionUpper,
      action_type: actionUpper,
      entity: entity.toUpperCase(),
      entity_id: entityId,
      details: detailsObj,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log activity:", error);
    }
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};
