import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pin, action, payload } = body;

    if (!pin || pin !== process.env.ADMIN_SECRET_PIN) {
      return NextResponse.json({ error: 'Invalid Master Admin PIN' }, { status: 401 });
    }

    if (action === 'verify') {
      return NextResponse.json({ ok: true });
    }

    if (action === 'add_faculty') {
      const { error } = await supabaseAdmin.from('faculty_access').insert([payload]);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle_faculty') {
      const { error } = await supabaseAdmin
        .from('faculty_access')
        .update({ is_active: payload.is_active })
        .eq('id', payload.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete_student') {
      const { error } = await supabaseAdmin
        .from('students')
        .delete()
        .eq('roll_no', payload.roll_no);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
