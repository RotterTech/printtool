import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Endpoint: Cleanup Expired Trial Accounts
 * 
 * This endpoint should be called daily via a cron job to remove
 * trial accounts that have expired (7 days after signup).
 * 
 * Security: Requires a secret key to prevent unauthorized access.
 * 
 * Usage:
 * curl -X POST https://yourdomain.com/api/admin/cleanup-trials \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

export async function POST(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error("❌ CRON_SECRET not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("⚠️ Unauthorized cleanup attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Supabase credentials not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get current date
    const now = new Date();
    console.log("🧹 Starting trial cleanup at:", now.toISOString());

    // List all users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("❌ Error listing users:", listError);
      return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
    }

    // Find expired trial users
    const expiredTrials = users.filter(user => {
      const metadata = user.user_metadata;
      if (!metadata?.is_trial) return false;
      
      const trialEnds = metadata?.trial_ends;
      if (!trialEnds) return false;

      const trialEndDate = new Date(trialEnds);
      return trialEndDate < now;
    });

    console.log(`📊 Found ${expiredTrials.length} expired trial accounts`);

    // Delete expired trial accounts
    const results = {
      total: expiredTrials.length,
      deleted: 0,
      errors: [] as string[]
    };

    for (const user of expiredTrials) {
      try {
        console.log(`🗑️ Deleting expired trial: ${user.email} (expired: ${user.user_metadata?.trial_ends})`);
        
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`❌ Failed to delete ${user.email}:`, deleteError);
          results.errors.push(`${user.email}: ${deleteError.message}`);
        } else {
          console.log(`✅ Deleted: ${user.email}`);
          results.deleted++;
        }
      } catch (err: any) {
        console.error(`❌ Error deleting ${user.email}:`, err);
        results.errors.push(`${user.email}: ${err.message}`);
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🧹 Cleanup complete: ${results.deleted}/${results.total} accounts deleted`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return NextResponse.json({
      success: true,
      message: `Cleanup complete: ${results.deleted} trial accounts deleted`,
      ...results
    });

  } catch (error: any) {
    console.error("❌ Cleanup error:", error);
    return NextResponse.json({ error: error.message || "Cleanup failed" }, { status: 500 });
  }
}

// Also support GET for easy testing (with same auth)
export async function GET(request: Request) {
  return POST(request);
}

export const dynamic = "force-dynamic";
