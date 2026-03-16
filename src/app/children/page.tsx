'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Badge, Card, EmptyState, Field, PrimaryButton, PrimaryLink, SectionTitle, TextInput } from '@/components/UI';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Database } from '@/lib/database.types';
import { formatCurrency, getMonthKey } from '@/lib/utils';

type AppUser = Database['public']['Tables']['app_user']['Row'];
type Summary = Database['public']['Tables']['month_summary']['Row'];
type Settings = Database['public']['Tables']['child_settings']['Row'];

type ChildCard = {
  child: AppUser;
  summary: Summary | null;
  settings: Settings | null;
  pendingCount: number;
};

export default function ChildrenPage() {
  const { loading, profile } = useAuth();
  const supabase = supabaseBrowser();
  const currentMonth = useMemo(() => getMonthKey(), []);

  const [cards, setCards] = useState<ChildCard[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saveState, setSaveState] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile?.role === 'parent') {
      void loadChildren();
      return;
    }

    setPageLoading(false);
  }, [profile]);

  const loadChildren = async () => {
    if (!profile) {
      return;
    }

    setPageLoading(true);
    const [{ data: links }, { data: children }, { data: summaries }, { data: settings }, { data: rules }] = await Promise.all([
      supabase.from('link_parent_child').select('child_id').eq('parent_id', profile.id),
      supabase.from('app_user').select('*').eq('household_id', profile.household_id).eq('role', 'child').order('created_at', { ascending: true }),
      supabase.from('month_summary').select('*').eq('household_id', profile.household_id).eq('target_month', currentMonth),
      supabase.from('child_settings').select('*'),
      supabase
        .from('rule_snapshot')
        .select('child_id, status')
        .eq('household_id', profile.household_id)
        .eq('target_month', currentMonth)
        .in('status', ['pending_child_approval', 'pending_parent_approval']),
    ]);

    const linkedChildIds = new Set((links ?? []).map((item) => item.child_id));
    const summaryMap = Object.fromEntries((summaries ?? []).map((item) => [item.child_id, item]));
    const settingsMap = Object.fromEntries((settings ?? []).map((item) => [item.child_id, item]));
    const pendingMap: Record<string, number> = {};

    for (const item of rules ?? []) {
      pendingMap[item.child_id] = (pendingMap[item.child_id] ?? 0) + 1;
    }

    const nextCards = (children ?? [])
      .filter((child) => linkedChildIds.has(child.id))
      .map((child) => ({
        child,
        summary: summaryMap[child.id] ?? null,
        settings: settingsMap[child.id] ?? null,
        pendingCount: pendingMap[child.id] ?? 0,
      }));

    setCards(nextCards);
    setPageLoading(false);
  };

  const handleSaveRate = async (event: FormEvent<HTMLFormElement>, childId: string) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const yenPerPoint = Number(formData.get('yenPerPoint'));
    setSaveState((current) => ({ ...current, [childId]: '保存中...' }));

    const response = await fetch('/api/child-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, yenPerPoint }),
    });

    const result = await response.json();
    if (!response.ok) {
      setSaveState((current) => ({ ...current, [childId]: result.error ?? '保存に失敗しました。' }));
      return;
    }

    setSaveState((current) => ({ ...current, [childId]: '保存しました。' }));
    await loadChildren();
  };

  if (loading || pageLoading) {
    return <Card className="p-10 text-center text-sm text-stone-500">子ども一覧を読み込み中です...</Card>;
  }

  if (profile?.role !== 'parent') {
    return <Card className="p-10 text-center text-sm text-stone-500">この画面は親アカウント専用です。</Card>;
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="子ども一覧" description="リンク済みの子どもごとに、換算レートと今月の状況を管理します。" />

      {cards.length === 0 ? (
        <EmptyState title="リンク済みの子どもがまだいません" description="招待コードで参加した子どもがいる場合、自動で親子リンクが作成されます。" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {cards.map(({ child, summary, settings, pendingCount }) => (
            <Card key={child.id} className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-stone-950">{child.display_name}</p>
                  <p className="text-sm text-stone-500">{currentMonth} の設定と進捗</p>
                </div>
                <Badge tone={pendingCount > 0 ? 'warning' : 'success'}>{pendingCount > 0 ? `未承認 ${pendingCount} 件` : '承認済み'}</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] bg-stone-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-500">ポイント</p>
                  <p className="mt-2 text-2xl font-semibold text-stone-950">{summary?.total_points ?? 0}pt</p>
                </div>
                <div className="rounded-[24px] bg-stone-950 p-4 text-stone-50">
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-300">概算金額</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary?.total_yen ?? 0)}</p>
                </div>
              </div>

              <form className="space-y-3" onSubmit={(event) => handleSaveRate(event, child.id)}>
                <Field label="1pt あたりの金額">
                  <TextInput name="yenPerPoint" type="number" min={1} defaultValue={settings?.yen_per_point ?? 100} required />
                </Field>
                <div className="flex items-center gap-3">
                  <PrimaryButton type="submit">換算レートを保存</PrimaryButton>
                  <span className="text-sm text-stone-500">{saveState[child.id] ?? ''}</span>
                </div>
              </form>

              <div className="flex flex-wrap gap-2">
                <PrimaryLink href={`/rules/${child.id}`}>ルール管理</PrimaryLink>
                <PrimaryLink href={`/points/${child.id}`} className="bg-amber-700 hover:bg-amber-600">
                  ポイント管理
                </PrimaryLink>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
