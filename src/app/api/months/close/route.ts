import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createRouteSupabase, jsonError, logOperation, recalculateMonthSummary, requireParentChildLink, requireProfile } from '@/lib/server-api';

const schema = z.object({
  childId: z.string().uuid(),
  targetMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function POST(request: Request) {
  const supabase = createRouteSupabase();

  try {
    const { profile } = await requireProfile(supabase);
    if (profile.role !== 'parent') {
      return jsonError('親アカウントのみ月締めできます。', 403);
    }

    const input = schema.parse(await request.json());
    await requireParentChildLink(supabase, profile.id, input.childId);

    await recalculateMonthSummary(supabase, {
      householdId: profile.household_id,
      childId: input.childId,
      targetMonth: input.targetMonth,
      actorId: profile.id,
      keepClosedState: true,
    });

    const { error } = await supabase
      .from('month_summary')
      .update({
        status: 'closed',
        closed_by: profile.id,
        closed_at: new Date().toISOString(),
      })
      .eq('child_id', input.childId)
      .eq('target_month', input.targetMonth);

    if (error) {
      return jsonError(error.message);
    }

    await logOperation(supabase, {
      householdId: profile.household_id,
      actorId: profile.id,
      actionType: 'month_summary.close',
      targetTable: 'month_summary',
      summary: '月締めを実行しました。',
      metadata: {
        child_id: input.childId,
        target_month: input.targetMonth,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? '入力値が不正です。');
    }

    return jsonError(error instanceof Error ? error.message : '月締めに失敗しました。', 500);
  }
}
