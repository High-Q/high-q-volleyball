<script setup lang="ts">
/**
 * /events/:id 画面の参加者ゼロ時の Empty 状態。
 *
 * StatCard と TopBar は親で通常表示されるため、本コンポーネントはテーブル
 * エリア内のメッセージのみを担当する（参加者ゼロ ≠ event 取得失敗）。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */
</script>

<template>
  <div
    class="flex flex-col items-center gap-hq-2 py-hq-14 text-center"
    data-testid="event-detail-empty"
  >
    <p class="font-jp text-sm text-ink">まだ予約がありません。</p>
    <p class="font-jp text-xs text-muted">
      公開直後 / または全員キャンセルされた状態です。
    </p>
  </div>
</template>
