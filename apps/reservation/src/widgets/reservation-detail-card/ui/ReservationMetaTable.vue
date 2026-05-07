<script setup lang="ts">
import { computed } from "vue";

/**
 * 予約詳細画面の Meta テーブル (参加費 / 同伴者)。
 *
 * `<dl>` / `<dt>` / `<dd>` のセマンティック構造で 2 行を順序固定で描画する。
 * 「予約日時」は重要度が低い割に行を専有していたため #215 で削除した
 * (履歴画面で参照可能・必要なら詳細フッター注釈で再導入を検討)。
 *
 * 関連:
 *   openspec/changes/reservation-detail-edit/specs/reservation-detail-page/spec.md
 *     Requirement: Meta テーブル
 */

const props = defineProps<{
  fee: number | null;
  guestCount: number;
}>();

const feeLabel = computed(() => {
  if (props.fee === null) return "—";
  return `¥${props.fee.toLocaleString("ja-JP")}（当日現金）`;
});

const guestCountLabel = computed(() => `${props.guestCount} 名`);

type Row = { key: string; label: string; value: string; testid: string };
const rows = computed<Row[]>(() => [
  { key: "fee", label: "参加費", value: feeLabel.value, testid: "meta-fee" },
  {
    key: "guests",
    label: "同伴者",
    value: guestCountLabel.value,
    testid: "meta-guests",
  },
]);
</script>

<template>
  <dl
    class="border-t border-b border-hairline divide-y divide-hairline m-0"
    data-testid="reservation-meta-table"
  >
    <div
      v-for="row in rows"
      :key="row.key"
      class="grid grid-cols-[92px_1fr] gap-hq-3 py-hq-3"
    >
      <dt class="font-mono text-xs text-muted tracking-widest uppercase">
        {{ row.label }}
      </dt>
      <dd
        class="font-jp text-sm text-ink m-0"
        :data-testid="row.testid"
      >{{ row.value }}</dd>
    </div>
  </dl>
</template>
