import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createRouteSupabase, jsonError, recalculateMonthSummary, requireParentChildLink, requireProfile } from '@/lib/server-api';

const schema = z.object({
  childId: z.string().uuid(),
  yenPerPoint: z.number().int().min(1).max(10000),
});

export async function POST(request: Request) {
  const supabase = createRouteSupabase();

  try {
    const { profile } = await requireProfile(supabase);
    if (profile.role !== 'parent') {
      return jsonError('親アカウントのみ設定を更新できます。', 403);
    }

    const input = schema.parse(await request.json());
    await requireParentChildLink(supabase, profile.id, input.childId);

    const { error } = await supabase.from('child_settings').upsert({
      child_id: input.childId,
      yen_per_point: input.yenPerPoint,
    });

    if (error) {
      return jsonError(error.message);
    }

    const { data: summaries, error: summariesError } = await supabase
      .from('month_summary')
      .select('target_month')
      .eq('child_id', input.childId)
      .eq('status', 'open');

    if (summariesError) {
      return jsonError(summariesError.message);
    }

    for (const summary of summaries ?? []) {
      await recalculateMonthSummary(supabase, {
        householdId: profile.household_id,
        childId: input.childId,
        targetMonth: summary.target_month,
        actorId: profile.id,
        keepClosedState: false,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? '入力値が不正です。');
    }

    return jsonError(error instanceof Error ? error.message : '設定更新に失敗しました。', 500);
  }
}
