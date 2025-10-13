import { NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase';

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { child_id, month } = await req.json();

  const { data: settings } = await sb.from('child_settings').select('yen_per_point, base_allowance_yen').eq('child_id', child_id).single();
  if (!settings) return NextResponse.json({ error: 'settings missing' }, { status: 400 });

  const { data: snaps } = await sb.from('rule_snapshot').select('id').eq('child_id', child_id).eq('month', month).eq('status', 'active');
  const ids = snaps?.map(s => s.id) || [];
  if (ids.length === 0) return NextResponse.json({ error: 'no active rules' }, { status: 400 });

  const { data: entries } = await sb.from('point_entry').select('delta_points').in('snapshot_id', ids);
  const total_points = (entries || []).reduce((s, e) => s + (e.delta_points || 0), 0);
  const total_yen = Math.max(0, total_points * settings.yen_per_point + settings.base_allowance_yen);

  const up = await sb.from('monthly_summary').upsert({ child_id, month, total_points, total_yen, status: 'finalized', finalized_at: new Date().toISOString() }, { onConflict: 'child_id,month' });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 400 });

  return NextResponse.json({ ok: true, total_points, total_yen });
}
