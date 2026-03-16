import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createRouteSupabase, getAuthenticatedUser, jsonError } from '@/lib/server-api';

const schema = z.object({
  displayName: z.string().trim().min(1).max(40),
  role: z.enum(['parent', 'child']),
  householdName: z.string().trim().max(60).optional(),
  inviteCode: z.string().trim().max(16).optional(),
});

const formatSchemaCacheError = (message: string) => {
  if (message.includes("Could not find the table 'public.household' in the schema cache")) {
    return 'Supabase に最新スキーマが反映されていません。`supabase/schema.sql` を SQL Editor で再実行してください。';
  }

  return message;
};

export async function POST(request: Request) {
  const supabase = createRouteSupabase();

  try {
    const user = await getAuthenticatedUser(supabase);
    const input = schema.parse(await request.json());

    const { data: existingProfile } = await supabase.from('app_user').select('id').eq('id', user.id).maybeSingle();
    if (existingProfile) {
      return jsonError('初期登録は完了済みです。', 409);
    }

    let householdId = '';

    if (input.inviteCode) {
      const { data: household, error } = await supabase
        .from('household')
        .select('id')
        .eq('invite_code', input.inviteCode.toUpperCase())
        .maybeSingle();

      if (error || !household) {
        return jsonError(error ? formatSchemaCacheError(error.message) : '招待コードが見つかりません。', error ? 500 : 404);
      }

      householdId = household.id;
    } else {
      if (input.role !== 'parent') {
        return jsonError('子アカウントは招待コードが必要です。');
      }

      if (!input.householdName) {
        return jsonError('世帯名を入力してください。');
      }

      const { data: household, error } = await supabase
        .from('household')
        .insert({
          name: input.householdName,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error || !household) {
        return jsonError(error ? formatSchemaCacheError(error.message) : '世帯作成に失敗しました。');
      }

      householdId = household.id;
    }

    const { error: profileError } = await supabase.from('app_user').insert({
      id: user.id,
      household_id: householdId,
      role: input.role,
      display_name: input.displayName,
    });

    if (profileError) {
      return jsonError(
        profileError.message.includes('parent limit')
          ? '親は1世帯につき2名までです。'
          : formatSchemaCacheError(profileError.message),
      );
    }

    if (input.role === 'child') {
      const { error: settingsError } = await supabase.from('child_settings').upsert({
        child_id: user.id,
        yen_per_point: 100,
      });

      if (settingsError) {
        return jsonError(formatSchemaCacheError(settingsError.message));
      }

      const { data: parents, error: parentsError } = await supabase
        .from('app_user')
        .select('id')
        .eq('household_id', householdId)
        .eq('role', 'parent');

      if (parentsError) {
        return jsonError(formatSchemaCacheError(parentsError.message));
      }

      if ((parents ?? []).length > 0) {
        const { error: linkError } = await supabase.from('link_parent_child').upsert(
          parents.map((parent) => ({
            household_id: householdId,
            parent_id: parent.id,
            child_id: user.id,
          })),
          { onConflict: 'parent_id,child_id' },
        );

        if (linkError) {
          return jsonError(formatSchemaCacheError(linkError.message));
        }
      }
    }

    if (input.role === 'parent' && input.inviteCode) {
      const { data: children, error: childrenError } = await supabase
        .from('app_user')
        .select('id')
        .eq('household_id', householdId)
        .eq('role', 'child');

      if (childrenError) {
        return jsonError(formatSchemaCacheError(childrenError.message));
      }

      if ((children ?? []).length > 0) {
        const { error: linkError } = await supabase.from('link_parent_child').upsert(
          children.map((child) => ({
            household_id: householdId,
            parent_id: user.id,
            child_id: child.id,
          })),
          { onConflict: 'parent_id,child_id' },
        );

        if (linkError) {
          return jsonError(formatSchemaCacheError(linkError.message));
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? '入力値が不正です。');
    }

    return jsonError(error instanceof Error ? error.message : '初期登録に失敗しました。', 500);
  }
}
