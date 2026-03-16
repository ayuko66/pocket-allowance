'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Badge, Card, EmptyState, Field, PrimaryButton, PrimaryLink, SectionTitle, SelectInput, TextInput } from '@/components/UI';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Database } from '@/lib/database.types';
import { formatCurrency, getMonthKey } from '@/lib/utils';

type Household = Database['public']['Tables']['household']['Row'];
type AppUser = Database['public']['Tables']['app_user']['Row'];
type Summary = Database['public']['Tables']['month_summary']['Row'];
type Rule = Database['public']['Tables']['rule_snapshot']['Row'];

export default function HomePage() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const supabase = supabaseBrowser();
  const currentMonth = useMemo(() => getMonthKey(), []);

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [children, setChildren] = useState<AppUser[]>([]);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

  const [loginEmail, setLoginEmail] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'parent' | 'child'>('parent');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    if (!profile) {
      setHousehold(null);
      setChildren([]);
      setSummaries({});
      setPendingCounts({});
      return;
    }

    void loadDashboard();
  }, [profile]);

  const loadDashboard = async () => {
    if (!profile) {
      return;
    }

    setDashboardLoading(true);
    const [{ data: householdData }, { data: householdUsers }, { data: summaryData }, { data: pendingRules }] = await Promise.all([
      supabase.from('household').select('*').eq('id', profile.household_id).maybeSingle(),
      supabase.from('app_user').select('*').eq('household_id', profile.household_id).order('created_at', { ascending: true }),
      supabase.from('month_summary').select('*').eq('household_id', profile.household_id).eq('target_month', currentMonth),
      supabase
        .from('rule_snapshot')
        .select('child_id, status')
        .eq('household_id', profile.household_id)
        .eq('target_month', currentMonth)
        .in('status', ['pending_child_approval', 'pending_parent_approval']),
    ]);

    setHousehold(householdData ?? null);

    const householdChildren = (householdUsers ?? []).filter((item) => item.role === 'child');
    setChildren(householdChildren);

    const summaryMap = Object.fromEntries((summaryData ?? []).map((item) => [item.child_id, item]));
    setSummaries(summaryMap);

    const counts: Record<string, number> = {};
    for (const rule of pendingRules ?? []) {
      counts[rule.child_id] = (counts[rule.child_id] ?? 0) + 1;
    }
    setPendingCounts(counts);
    setDashboardLoading(false);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoginLoading(false);
    setLoginMessage(error ? `送信に失敗しました: ${error.message}` : 'ログインリンクを送信しました。');
  };

  const handleSetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSetupLoading(true);
    setSetupError('');

    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName,
        role,
        householdName: role === 'parent' && !inviteCode ? householdName : undefined,
        inviteCode: inviteCode || undefined,
      }),
    });

    const result = await response.json();
    setSetupLoading(false);

    if (!response.ok) {
      setSetupError(result.error ?? '初期登録に失敗しました。');
      return;
    }

    await refreshProfile();
  };

  if (loading) {
    return <Card className="p-10 text-center text-sm text-stone-500">読み込み中です...</Card>;
  }

  if (!session) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(255,255,255,0.96)_55%,rgba(120,53,15,0.08))] p-8">
          <div className="space-y-6">
            <SectionTitle
              eyebrow="MVP"
              title="ポイントでお小遣いを見える化する"
              description="親が月次ルールを決め、子どもが承認し、日々の行動をポイント化します。月末には円換算まで一括で確認できます。"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-[24px] bg-white/80">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Rule</p>
                <p className="mt-3 text-sm text-stone-600">親子承認付きの月次ルール管理</p>
              </Card>
              <Card className="rounded-[24px] bg-white/80">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Point</p>
                <p className="mt-3 text-sm text-stone-600">加点・減点を日別に記録して履歴化</p>
              </Card>
              <Card className="rounded-[24px] bg-white/80">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Close</p>
                <p className="mt-3 text-sm text-stone-600">月締め後も親だけ修正可能、監査ログ保存</p>
              </Card>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle title="Magic Link ログイン" description="登録メールアドレスにログインリンクを送信します。" />
          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <Field label="メールアドレス">
              <TextInput
                type="email"
                required
                placeholder="family@example.com"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
              />
            </Field>
            <PrimaryButton type="submit" disabled={loginLoading} className="w-full">
              {loginLoading ? '送信中...' : 'ログインリンクを送信'}
            </PrimaryButton>
          </form>
          {loginMessage ? <p className="mt-4 text-sm text-stone-600">{loginMessage}</p> : null}
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="mx-auto max-w-2xl p-6">
        <SectionTitle
          title="初期登録"
          description="表示名とロールを決めて、世帯を作成または参加してください。親は招待コード未入力で世帯を新規作成できます。"
        />
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSetup}>
          <div className="md:col-span-2">
            <Field label="表示名">
              <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </Field>
          </div>
          <Field label="ロール">
            <SelectInput value={role} onChange={(event) => setRole(event.target.value as 'parent' | 'child')}>
              <option value="parent">親</option>
              <option value="child">子</option>
            </SelectInput>
          </Field>
          <Field label="招待コード" hint="親が新規世帯を作る場合は空欄のままで構いません。">
            <TextInput value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} />
          </Field>
          {role === 'parent' && !inviteCode ? (
            <div className="md:col-span-2">
              <Field label="世帯名" hint="例: ">
                <TextInput value={householdName} onChange={(event) => setHouseholdName(event.target.value)} required />
              </Field>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <PrimaryButton type="submit" disabled={setupLoading}>
              {setupLoading ? '登録中...' : '初期登録を完了'}
            </PrimaryButton>
          </div>
          {setupError ? <p className="md:col-span-2 text-sm text-rose-600">{setupError}</p> : null}
        </form>
      </Card>
    );
  }

  const mySummary = profile.role === 'child' ? summaries[profile.id] : null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <SectionTitle
              eyebrow={profile.role === 'parent' ? '親ダッシュボード' : '子ダッシュボード'}
              title={`${profile.display_name} さんのホーム`}
              description={household ? `${household.name} / 招待コード ${household.invite_code}` : '世帯情報を読み込み中です。'}
            />
            <div className="flex flex-wrap gap-2">
              <Badge tone="default">{profile.role === 'parent' ? '親権限' : '子権限'}</Badge>
              {profile.role === 'parent' ? <Badge tone="warning">親は最大2名まで</Badge> : null}
              {profile.role === 'child' && mySummary ? <Badge tone={mySummary.status === 'closed' ? 'success' : 'default'}>{mySummary.status === 'closed' ? '今月は締め済み' : '今月は集計中'}</Badge> : null}
            </div>
          </div>

          {profile.role === 'child' ? (
            <div className="grid gap-3 rounded-[24px] bg-stone-950 p-5 text-stone-50 sm:min-w-[280px]">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-300">今月の見込み</p>
              <p className="text-4xl font-semibold">{formatCurrency(mySummary?.total_yen ?? 0)}</p>
              <p className="text-sm text-stone-300">
                {mySummary?.total_points ?? 0}pt / {mySummary?.status === 'closed' ? '締め済み' : '集計中'}
              </p>
            </div>
          ) : (
            <div className="grid gap-2 rounded-[24px] bg-amber-50 p-5 sm:min-w-[300px]">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-700">招待コード</p>
              <p className="text-3xl font-semibold tracking-[0.12em] text-stone-950">{household?.invite_code ?? '----'}</p>
              <p className="text-sm text-stone-600">子どもと2人目の親はこのコードで世帯に参加できます。</p>
            </div>
          )}
        </div>
      </Card>

      {profile.role === 'parent' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionTitle title="リンク済みの子ども" description="今月の概算金額と未承認ルール数をまとめて確認できます。" />
            <Link href="/children" className="text-sm font-semibold text-amber-700">
              子ども一覧を開く
            </Link>
          </div>
          {dashboardLoading ? (
            <Card className="p-8 text-center text-sm text-stone-500">ダッシュボードを読み込み中です...</Card>
          ) : children.length === 0 ? (
            <EmptyState title="まだ子どもが参加していません" description="招待コードを共有して、子どもに初回登録をしてもらってください。" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {children.map((child) => {
                const summary = summaries[child.id];
                const pending = pendingCounts[child.id] ?? 0;
                return (
                  <Card key={child.id} className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-stone-950">{child.display_name}</p>
                        <p className="text-sm text-stone-500">{currentMonth} の状況</p>
                      </div>
                      <Badge tone={pending > 0 ? 'warning' : 'success'}>{pending > 0 ? `未承認 ${pending} 件` : '承認済み'}</Badge>
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
                    <div className="flex flex-wrap gap-2">
                      <PrimaryLink href={`/rules/${child.id}`}>ルール管理</PrimaryLink>
                      <PrimaryLink href={`/points/${child.id}`} className="bg-amber-700 hover:bg-amber-600">
                        ポイント管理
                      </PrimaryLink>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-4">
            <SectionTitle title="ルールを確認する" description="今月のルール確認と承認を行います。" />
            <PrimaryLink href={`/rules/${profile.id}`}>自分のルールを開く</PrimaryLink>
          </Card>
          <Card className="space-y-4">
            <SectionTitle title="ポイント履歴を見る" description="今月のポイント履歴と換算額を確認します。" />
            <PrimaryLink href={`/points/${profile.id}`} className="bg-amber-700 hover:bg-amber-600">
              自分のポイント画面を開く
            </PrimaryLink>
          </Card>
        </div>
      )}
    </div>
  );
}
