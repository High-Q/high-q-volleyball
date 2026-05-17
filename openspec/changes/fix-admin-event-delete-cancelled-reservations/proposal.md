## Why

admin のイベント削除で、UI 上「予約 0 人」のイベントですら、過去にキャンセルされた reservations 行が DB に残っていると「予約があるため削除できません」となって削除できない事象が発生している (#253)。さらに、運用観点では **有効予約があるイベントも主催者（翔太郎くん）の判断で削除できなければ困る**（雨天中止 / 会場トラブル等）。現状の「reservations が 1 件でもあれば削除阻止」は主催権限を縛りすぎている。商用利用が開始した今、運営側の段取りを止めない柔軟性が必要 (priority:high)。

## What Changes

- イベント削除確認ダイアログに、対象イベントに紐づく **予約の内訳（有効 / キャンセル済 / no-show）** を表示する
- 有効予約があっても削除を **阻止せず**、件数を明示した上で主催者の判断で削除できるようにする
- 削除を確定したら、イベント本体に加えて **紐づく予約レコードもすべて連鎖削除**する
- 既存メッセージ「予約があるため削除できません」を廃止し、警告メッセージ（「N 名の予約も同時に削除されます」）に置換する

破壊的変更:
- **BREAKING**: reservations テーブルの events への FK 制約を `ON DELETE RESTRICT` → `ON DELETE CASCADE` に変更する（DB スキーマ変更）

UX 維持: AlertDialog 二段階確認 / 完了後 toast + 一覧 redirect は維持。

## Capabilities

### New Capabilities

なし

### Modified Capabilities

- `admin-events-crud`: 削除挙動を「件数表示 + 主催者判断による一括削除」に変更し、有効予約による削除阻止を廃止する
- `data-schema`: reservations.event_id FK 制約を `ON DELETE CASCADE` に変更する

## Impact

- **DB**: `reservations.event_id` FK 制約の DDL 変更（migration 1 本）
- **admin**: `features/event-delete/` の削除前 classify クエリ追加 / ダイアログ表示更新 / エラー分類簡素化
- **テスト**: 単体テスト（cascade 連鎖削除）/ E2E（有効予約付き削除シナリオ）
- 影響なし: LP / reservation / 他 admin 画面 / Auth / 予約完了メール送信パス

## Open Questions（決定済）

1. **キャンセル通知メールの自動送信**: ✅ 別 Issue **#272** として切り出し済。本 Issue では送信せず、AlertDialog に「予約者には別途ご連絡ください」を明記する
