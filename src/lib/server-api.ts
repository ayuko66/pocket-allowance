import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';

export type AppUserRow = Database['public']['Tables']['app_user']['Row'];
export type MonthSummaryRow = Database['public']['Tables']['month_summary']['Row'];

export const createRouteSupabase = () =>
  createRouteHandlerClient<Database>({ cookies: () => cookies() });

export const jsonError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function getAuthenticatedUser(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('認証が必要です。');
  }

  return user;
}

export async function getCurrentProfile(supabase: SupabaseClient<Database>) {
  const user = await getAuthenticatedUser(supabase);
  const { data, error } = await supabase.from('app_user').select('*').eq('id', user.id).maybeSingle();

  if (error) {
    throw new Error('プロフィールの取得に失敗しました。');
  }

  return { user, profile: data as AppUserRow | null };
}

export async function requireProfile(supabase: SupabaseClient<Database>) {
  const { user, profile } = await getCurrentProfile(supabase);

  if (!profile) {
    throw new Error('初期登録が完了していません。');
  }

  return { user, profile };
}

export async function requireParentChildLink(
  supabase: SupabaseClient<Database>,
  parentId: string,
  childId: string,
) {
  const { data, error } = await supabase
    .from('link_parent_child')
    .select('id')
    .eq('parent_id', parentId)
    .eq('child_id', childId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('対象の子どもにアクセスできません。');
  }
}

export async function getMonthSummary(
  supabase: SupabaseClient<Database>,
  childId: string,
  targetMonth: string,
) {
  const { data, error } = await supabase
    .from('month_summary')
    .select('*')
    .eq('child_id', childId)
    .eq('target_month', targetMonth)
    .maybeSingle();

  if (error) {
    throw new Error('月次サマリーの取得に失敗しました。');
  }

  return data as MonthSummaryRow | null;
}

export async function logOperation(
  supabase: SupabaseClient<Database>,
  params: {
    householdId: string;
    actorId: string;
    actionType: string;
    targetTable: string;
    targetId?: string | null;
    summary: string;
    metadata?: Json;
  },
) {
  const payload: Database['public']['Tables']['operation_log']['Insert'] = {
    household_id: params.householdId,
    actor_id: params.actorId,
    action_type: params.actionType,
    target_table: params.targetTable,
    target_id: params.targetId ?? null,
    summary: params.summary,
    metadata: params.metadata ?? {},
  };

  const operationLogQuery = supabase.from('operation_log' as never) as unknown as {
    insert: (
      value: Database['public']['Tables']['operation_log']['Insert'],
    ) => PromiseLike<{ error: { message: string } | null }>;
  };

  const { error } = await operationLogQuery.insert(payload);

  if (error) {
    throw new Error('操作ログの保存に失敗しました。');
  }
}

export async function recalculateMonthSummary(
  supabase: SupabaseClient<Database>,
  params: {
    householdId: string;
    childId: string;
    targetMonth: string;
    actorId: string;
    keepClosedState?: boolean;
  },
) {
  const [summary, settingsResult, pointsResult] = await Promise.all([
    getMonthSummary(supabase, params.childId, params.targetMonth),
    supabase
      .from('child_settings')
      .select('yen_per_point')
      .eq('child_id', params.childId)
      .maybeSingle(),
    supabase
      .from('point_log')
      .select('point_delta')
      .eq('child_id', params.childId)
      .eq('target_month', params.targetMonth),
  ]);

  if (settingsResult.error) {
    throw new Error('換算レートの取得に失敗しました。');
  }

  if (pointsResult.error) {
    throw new Error('ポイント履歴の取得に失敗しました。');
  }

  const settingsData = settingsResult.data as Pick<
    Database['public']['Tables']['child_settings']['Row'],
    'yen_per_point'
  > | null;
  const pointRows = (pointsResult.data ?? []) as Array<
    Pick<Database['public']['Tables']['point_log']['Row'], 'point_delta'>
  >;

  const yenPerPoint = settingsData?.yen_per_point ?? 100;
  const totalPoints = pointRows.reduce((sum, item) => sum + item.point_delta, 0);
  const nextStatus = summary?.status === 'closed' && params.keepClosedState !== false ? 'closed' : 'open';

  const payload: Database['public']['Tables']['month_summary']['Insert'] = {
    household_id: params.householdId,
    child_id: params.childId,
    target_month: params.targetMonth,
    total_points: totalPoints,
    yen_per_point: yenPerPoint,
    total_yen: totalPoints * yenPerPoint,
    status: nextStatus,
    closed_by: nextStatus === 'closed' ? summary?.closed_by ?? params.actorId : null,
    closed_at: nextStatus === 'closed' ? summary?.closed_at ?? new Date().toISOString() : null,
  };

  const monthSummaryQuery = supabase.from('month_summary' as never) as unknown as {
    upsert: (
      value: Database['public']['Tables']['month_summary']['Insert'],
      options: { onConflict: string },
    ) => {
      select: (value: string) => {
        single: () => PromiseLike<{
          data: Database['public']['Tables']['month_summary']['Row'] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const { data, error } = await monthSummaryQuery
    .upsert(payload, { onConflict: 'child_id,target_month' })
    .select('*')
    .single();

  if (error) {
    throw new Error('月次サマリーの更新に失敗しました。');
  }

  return data as MonthSummaryRow;
}
