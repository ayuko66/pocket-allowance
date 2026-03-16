# Pocket Allowance MVP

親子で使うポイント制お小遣い管理アプリの MVP です。親が月ごとのルールを設定し、子どもの行動に応じてポイントを記録し、月末に確定した合計ポイントを円換算して翌月のお小遣いの目安にします。

本リポジトリでは、README を導入と運用の入口とし、詳細仕様は `docs/` 配下を正本として管理します。機能や構成の変更時は、先にドキュメントを更新してから実装を変更します。

## 仕様書

- [MVP仕様](./docs/specification.md)
- [画面仕様](./docs/screens.md)
- [データ設計](./docs/data-model.md)

## 機能概要

- Supabase Auth の Magic Link ログイン
- 親アカウント / 子アカウントの 2 ロール
- 招待コードによる世帯参加
- 1 世帯あたり親権限は最大 2 名
- 親子の多対多リンク
- 月ごとのルール登録と親子承認
- 親によるポイント加点 / 減点
- 子ごとの換算レート設定
- 月締めと月次確定
- 操作ログの保存

## 技術スタック

- Next.js 14 App Router
- TypeScript / React
- Tailwind CSS
- Supabase Auth / PostgreSQL
- Docker Compose

## ディレクトリ構成

```text
pocket-allowance/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── supabase/
│   ├── schema.sql
│   └── seed.sql
├── docs/
│   ├── specification.md
│   ├── screens.md
│   └── data-model.md
├── src/
│   ├── app/
│   ├── components/
│   └── lib/
└── README.md
```

## 環境変数

`.env.example` を `.env` にコピーして設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## セットアップ

### 1. Supabase を準備する

1. Supabase でプロジェクトを作成する
2. Supabase Dashboard の `Auth` → `Email Templates` → `Magic Link` で件名を設定する
   - 推奨件名: `【ポイント制お小遣いアプリ】ログインリンク`
3. SQL Editor で `supabase/schema.sql` を実行する
4. 必要なら `supabase/seed.sql` を実行する

注意:
既存の古いスキーマのままアプリを起動すると、初期登録時に `Could not find the table 'public.household' in the schema cache` が発生します。その場合は、現在の [supabase/schema.sql](/Users/ayuko/Documents/projects/repos/pocket-allowance/supabase/schema.sql) を Supabase SQL Editor で再実行してください。

### 2. Docker で起動する

```bash
docker compose up --build
```

アプリは `http://localhost:3000` で確認できます。

## 画面一覧

- `/` : ログイン、初期登録、ダッシュボード
- `/children` : 親用の子ども一覧
- `/rules/[childId]` : 月次ルール管理と承認
- `/points/[childId]` : ポイント登録、履歴、月締め
- `/api/*` : 認証済みサーバー API

## 開発方針

- 仕様変更は `docs/` を先に更新する
- Docker 環境を前提に実行する
- 日本語を基本言語とする
- MVP では 1 世帯 1 グループ運用を前提とする

## ライセンス

MIT License
