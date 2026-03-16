# データ設計

## テーブル一覧

### `household`

- 世帯の基本情報
- 招待コードを保持する

### `app_user`

- アプリ利用者の基本情報
- Supabase Auth の UID と 1 対 1

### `link_parent_child`

- 親子リンク
- 多対多を表現する

### `rule_snapshot`

- 月次ルールのスナップショット
- 承認状態を含む

### `rule_approval`

- ルール承認履歴
- 親承認と子承認を別レコードで保持する

### `point_log`

- ポイント加点 / 減点の履歴
- ルール紐づきと手入力の両方を許容する

### `month_summary`

- 月次の集計結果
- 締め状態と換算結果を保持する

### `child_settings`

- 子どもごとの換算レート設定

### `operation_log`

- 締め後修正や重要操作の監査ログ

## 主要カラム方針

### `household`

- `id`
- `name`
- `invite_code`
- `created_by`
- `created_at`

### `app_user`

- `id`
- `household_id`
- `role`
- `display_name`
- `created_at`

補足:
MVP では 1 ユーザー 1 世帯所属とする。

### `link_parent_child`

- `id`
- `household_id`
- `parent_id`
- `child_id`
- `created_at`

制約:

- 同一世帯内のユーザー同士のみ登録可能
- 同じ親子組み合わせは重複不可

### `rule_snapshot`

- `id`
- `household_id`
- `child_id`
- `target_month`
- `label`
- `point_value`
- `status`
- `created_by`
- `created_at`
- `updated_at`

制約:

- 子ども 1 人あたり月 20 件まで

### `rule_approval`

- `id`
- `rule_snapshot_id`
- `approver_id`
- `approver_role`
- `decision`
- `comment`
- `created_at`

### `point_log`

- `id`
- `household_id`
- `child_id`
- `rule_snapshot_id`
- `target_month`
- `occurred_on`
- `point_delta`
- `note`
- `created_by`
- `created_at`
- `updated_at`

### `month_summary`

- `id`
- `household_id`
- `child_id`
- `target_month`
- `total_points`
- `yen_per_point`
- `total_yen`
- `status`
- `closed_by`
- `closed_at`
- `updated_at`

### `child_settings`

- `child_id`
- `yen_per_point`
- `updated_at`

### `operation_log`

- `id`
- `household_id`
- `actor_id`
- `action_type`
- `target_table`
- `target_id`
- `summary`
- `metadata`
- `created_at`

## 業務制約

- `app_user.role = parent` は同一 `household_id` 内で最大 2 件
- `month_summary.status = closed` の月でも親は更新可能
- 締め済み月の更新時は `operation_log` を必須で記録する
- 集計は `point_log.target_month` 単位で行う
