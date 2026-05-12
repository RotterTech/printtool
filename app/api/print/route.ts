import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { logActivity } from "@/utils/logger";
import { requireAuth } from "@/lib/apiAuth";

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    
    // Log the payload to server console
    console.log('📥 Received label data in Next.js API:', body);
    
    const { jobId } = body;
    
    // Forward to print-service
    console.log(`🖨️ Forwarding print job to print-service: ${jobId}`);
    
    try {
      const response = await fetch('http://localhost:3001/print', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Print service returned status ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Print forwarded successfully:', result);

      // Log the activity
      await logActivity(
        supabase,
        "PRINT",
        "REPAIR_LABEL",
        jobId || "unknown",
        `Reparatie label geprint voor #${jobId}`,
        user?.id
      );
      
      return NextResponse.json(result);
      
    } catch (fetchError: any) {
      console.error('❌ Error forwarding to print-service:', fetchError.message);
      
      // Check if it's a connection error
      if (fetchError.code === 'ECONNREFUSED' || fetchError.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Print service unreachable - is it running on port 3001?'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Print service error: ${fetchError.message}` 
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ Error processing request:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error processing request',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
