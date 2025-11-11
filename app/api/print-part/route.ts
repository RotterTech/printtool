import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, jobId } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, message: 'Text is required' },
        { status: 400 }
      );
    }

    console.log('📥 Received part label print request:', { text, jobId });

    // Forward to print-service with part label format
    try {
      const response = await fetch('http://localhost:3001/print-part', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          jobId: jobId || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`Print service returned status ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Part label print forwarded successfully:', result);

      return NextResponse.json(result);
    } catch (fetchError: any) {
      console.error('❌ Error forwarding to print-service:', fetchError.message);

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

