<script setup lang="ts">
/**
 * マイナンバーカード時のマスク漏れ確認リマインダーバナー。
 * `document_type === 'my_number_card_masked'` のときのみ親が描画する。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: マイナンバーカード時のリマインダー表示)
 */
</script>

<template>
  <div
    role="alert"
    class="flex flex-col gap-hq-1 rounded-hq-sm border-l-4 border-danger bg-danger-soft px-hq-4 py-hq-3"
  >
    <p class="font-jp text-sm font-medium text-danger">
      個人番号 (裏面 12 桁) のマスクを必ず確認してください
    </p>
    <p class="font-jp text-sm text-danger/80">
      少しでも見えたら「マスク漏れ削除」を選択してください。判断に迷う場合は安全側に倒して削除してください。
    </p>
  </div>
</template>
