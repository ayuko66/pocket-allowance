# Pocket Allowance MVP (Next.js + Supabase + Docker)

最小構成のテンプレ一式です。家族内運用向けに「ルール承認 → ポイント登録 → 月締め」を回せます。

## 🚀 Quick Start
1. Supabase プロジェクトを作成し、ダッシュボードの SQL Editor に `supabase/schema.sql` を貼って実行
2. `.env.example` を `.env` にコピーし、`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
3. `docker compose up --build` で起動 → http://localhost:3000
4. 親ユーザー/子ユーザーの `app_user` と `link_parent_child` を SQL で作成（authでログイン後に `auth.uid()` を使う）
5. 親でログイン → /children → /rules/{child_id} で当月ルール作成・親子承認 → /points/{child_id} で加減点登録 → 「当月を締める」

## 📦 同梱物
- Next.js App Router 構成（TS）
- Dockerfile / docker-compose.yml
- Supabase スキーマ & RLS (`supabase/schema.sql`)
- 最小UI（Tailwind）とAPIルート（承認・ポイント登録・月締め）

## 📝 注意
- 通知・QR連携・取消UI・Cronは未実装（MVP）。取消は**逆符号の point_entry** で代替してください。
