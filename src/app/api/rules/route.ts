import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createRouteSupabase, getMonthSummary, jsonError, requireParentChildLink, requireProfile } from '@/lib/server-api';

const schema = z.object({
  childId: z.string().uuid(),
  targetMonth: z.string().regex(/^\d{4}-\d{2}$/),
  label: z.string().trim().min(1).max(80),
  pointValue: z.number().int().min(-999).max(999),
});

export async function POST(request: Request) {
  const supabase = createRouteSupabase();

  try {
    const { profile } = await requireProfile(supabase);
    if (profile.role !== 'parent') {
      return jsonError('親アカウントのみルールを登録できます。', 403);
    }

    const input = schema.parse(await request.json());
    await requireParentChildLink(supabase, profile.id, input.childId);

    const summary = await getMonthSummary(supabase, input.childId, input.targetMonth);
    if (summary?.status === 'closed') {
      return jsonError('締め済みの月にはルールを追加できません。');
    }

    const { error } = await supabase.from('rule_snapshot').insert({
      household_id: profile.household_id,
      child_id: input.childId,
      target_month: input.targetMonth,
      label: input.label,
      point_value: input.pointValue,
      status: 'pending_child_approval',
      created_by: profile.id,
    });

    if (error) {
      return jsonError(error.message.includes('monthly rule limit') ? 'ルールは月20件までです。' : error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? '入力値が不正です。');
    }

    return jsonError(error instanceof Error ? error.message : 'ルール登録に失敗しました。', 500);
  }
}
