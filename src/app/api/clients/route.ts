import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/services/supabase-client';

// GET all clients
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST a new client
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, tax_id } = body;

    if (!name || !tax_id) {
      return NextResponse.json({ error: 'Name and Tax ID are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert([{ name, tax_id }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
