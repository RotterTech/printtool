import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

function getServerSupabase(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        const cookieOptions = { ...options, path: '/', sameSite: 'lax' as const };
        req.cookies.set({ name, value, ...cookieOptions });
        response.cookies.set({ name, value, ...cookieOptions });
      },
      remove(name: string, options: any) {
        const cookieOptions = { ...options, path: '/', sameSite: 'lax' as const };
        req.cookies.set({ name, value: '', ...cookieOptions });
        response.cookies.set({ name, value: '', ...cookieOptions });
      },
    },
  });

  return { supabase, response };
}

// GET /api/repairs?status=&klant=&from=&to=&q=
export async function GET(req: NextRequest) {
  const { supabase } = getServerSupabase(req);
  const { searchParams } = new URL(req.url);

  const status = searchParams.get('status') || undefined;
  const klant = searchParams.get('klant') || undefined;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const q = searchParams.get('q') || undefined;

  let query = supabase.from('repairs').select('*').order('datum_in', { ascending: false });

  if (status) query = query.eq('status', status);
  if (klant) query = query.ilike('klant', `%${klant}%`);
  if (from) query = query.gte('datum_in', from);
  if (to) query = query.lte('datum_in', to);
  if (q) {
    // basic ilike across a few fields
    query = query.or(
      [
        `jobId.ilike.%${q}%`,
        `klant.ilike.%${q}%`,
        `email.ilike.%${q}%`,
        `telefoon.ilike.%${q}%`,
        `merk.ilike.%${q}%`,
        `model.ilike.%${q}%`,
        `omschrijving.ilike.%${q}%`,
      ].join(',')
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/repairs
export async function POST(req: NextRequest) {
  const { supabase } = getServerSupabase(req);
  const body = await req.json();

  // Minimal validation
  const required = ['jobId', 'klant'];
  for (const key of required) {
    if (!body[key]) return NextResponse.json({ error: `${key} is required` }, { status: 400 });
  }

  const payload = {
    jobId: String(body.jobId),
    klant: String(body.klant),
    email: body.email ?? null,
    telefoon: body.telefoon ?? null,
    klantnummer: body.klantnummer ?? null,
    merk: body.merk ?? null,
    model: body.model ?? null,
    omschrijving: body.omschrijving ?? null,
    status: body.status ?? 'Ingeboekt',
    onderdeel_besteld: Boolean(body.onderdeel_besteld ?? false),
    onderdeel_naam: body.onderdeel_naam ?? null,
    onderdeel_leverancier: body.onderdeel_leverancier ?? 'DDKM',
    datum_in: body.datum_in ?? new Date().toISOString(),
    datum_uit: body.datum_uit ?? null,
  };

  const { data, error } = await supabase.from('repairs').insert(payload).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// PATCH /api/repairs?id=...  body: partial fields
export async function PATCH(req: NextRequest) {
  const { supabase } = getServerSupabase(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const body = await req.json();

  const { data, error } = await supabase
    .from('repairs')
    .update(body)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// DELETE /api/repairs?id=...
export async function DELETE(req: NextRequest) {
  const { supabase } = getServerSupabase(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const { error } = await supabase.from('repairs').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}


