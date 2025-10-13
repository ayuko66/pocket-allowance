import AuthGate from '@/src/components/AuthGate';
import Link from 'next/link';

export default function Page() {
  return (
    <AuthGate>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">HOME</h2>
        <ul className="list-disc pl-5 text-sm">
          <li>まずは Supabase の SQL を流してユーザーとリンクを作成します。</li>
          <li>親は Children から子設定を登録 → ルール作成/承認 → ポイント登録へ。</li>
        </ul>
        <div className="flex gap-3">
          <Link className="underline" href="/children">子ども一覧へ</Link>
        </div>
      </div>
    </AuthGate>
  );
}
