# Pocket Allowance MVP (Next.js + Supabase + Docker)

親子で使うポイント制お小遣い管理アプリ（最小実装版）

## 📝 概要

Pocket Allowance MVP は、親と子でルールを設定し、行動や成果に応じてポイントを付与・減点し、翌月のお小遣い額を決定するアプリです。
まずは家族内での試験運用を目的とし、Next.js + Supabase + TailwindCSS による Web アプリとして構築しています。

## 🧩 主な機能

- **認証**
Supabase Auth による Magic Link ログイン
- **アカウント構成**
親アカウント・子アカウントの2種。多対多で紐づけ可能
- **ルール管理**
親が月ごとに最大20件までルールを登録。子と親の両方の承認が必要
- **ポイント登録**
親が日付・ルールごとに加点/減点を登録
- **ポイント換算**
各子どもごとに「1pt = ○円」の換算レートを設定可能
- **月締め処理**
月末に親が承認してポイントを確定。以後は編集不可
- **ポイント履歴**
月ごとに行動履歴・ポイント変動を閲覧可能

- **承認通知**
未承認ルールがある場合にバッジ表示（将来は通知対応予定）


## 📁 構成

```text
pocket-allowance-mvp/
├── docker-compose.yml       # Webアプリ + Node + Supabase接続設定
├── .env.example              # 環境変数テンプレート
├── supabase/
│   ├── schema.sql            # テーブル・RLS・ポリシー定義
│   └── seed.sql              # （任意）親子デモデータ挿入
├── src/
│   ├── app/
│   │   ├── layout.tsx        # 全体レイアウト（AppShell読込）
│   │   ├── page.tsx          # トップページ（ログインなど）
│   │   ├── children/         # 親用：子一覧
│   │   ├── rules/[childId]/  # ルール管理画面
│   │   ├── points/[childId]/ # ポイント登録画面
│   │   └── api/              # APIエンドポイント
│   ├── components/           # 共通UI, Header, AuthGateなど
│   ├── lib/                  # Supabaseクライアントなど
│   └── styles/
│       └── globals.css       # Tailwindスタイル
└── README.md
    
 ```
## 🛠️ 技術スタック
## カテゴリ

### 技術

#### フロントエンド

- Next.js 14（App Router構成）
- UIスタイル
  - Tailwind CSS
- バックエンド
  - Supabase（PostgreSQL + Auth）
- 開発環境
  - Docker Compose（Node 20 + npm）
- 言語
  - TypeScript / React（Client & Server Components）


## 📊 データベース設計
| テーブル名 | 目的 |
| --- | --- |
| app_user | 親・子ユーザーの基本情報（role, name, uidなど） |
| link_parent_child | 親子の紐づけ（多対多） |
| rule_snapshot | ルール定義（月単位、承認状態込み） |
| rule_approval | 親・子のルール承認履歴 |
| point_log | 日々のポイント加減履歴 |
| month_summary | 各月の合計ポイント・換算額 |
| child_settings | 各子どもの個別設定（円換算など） |


## 🧰 開発環境セットアップ

```bash
docker compose up --build
```

ブラウザで http://localhost:3000 にアクセス

## 🖥️ 画面一覧

| 画面  | URL  | 主な機能  |
| --- | --- | --- |
| トップ  | /        | ログイン・ログアウト  |
| 子一覧  | /children | 親アカウント用、紐づく子の一覧  |
| ルール管理  | /rules/[childId] | 月ごとのルール登録・承認  |
| ポイント登録  | /points/[childId] | 加点/減点登録・月締め  |
| APIルート  | /api/... | Supabaseアクセスラッパー  |


## 🛠️ 使い方フロー
1. 親がルール登録 → 子が承認 → 親が承認 → ルールactive化
2. 親が「洗濯物をたたむ」を選択し1pt付与
3. 月末に親が「締める」→ 確定ポイント算出
4. 翌月のお小遣い（円）を表示


## 🚧 今後の拡張予定
*   前月ルールの自動コピー
*   通知（未承認ルールのリマインド）
*   グラフによる推移表示
*   オフライン対応（PWA）
*   家族間共有リンク（QRコード生成）

## 🧾 LICENSE
MIT License
（家族内・教育目的での利用・改変・再配布を自由に許可）