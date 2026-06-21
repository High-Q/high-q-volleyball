<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Button } from "@high-q/ui";
import { useVenuesMaster } from "../composables/useVenuesMaster";
import type { FeeType } from "../model/venueDraft";

/**
 * 会場マスタ マスター・ディテール画面の本体 widget（左ペイン=一覧 / 右ペイン=編集）。
 *
 * プロトタイプ（docs/10-デザインサンプル/admin/会場マスタ B案.html）のレイアウト・
 * 挙動を正とし、色は HQ デザイントークン（橙系）に統一する（生 hex 不使用）。
 *
 * 関連:
 *   openspec/changes/admin-venues-crud-screen/specs/admin-venues-crud/spec.md
 *   openspec/changes/admin-venues-crud-screen/design.md (§3)
 */

const m = useVenuesMaster();

// #155 モバイル (< md) は master-detail の横並びが収まらないため、リスト⇄フォームの
// ビュー切替にする。md+ では両ペインを常時表示 (mobileView は無視される)。
const mobileView = ref<"list" | "form">("list");

onMounted(() => {
  void m.reload();
});

function selectVenue(id: string): void {
  m.select(id);
  mobileView.value = "form";
}

function addVenueLocal(): void {
  m.addVenue();
  mobileView.value = "form";
}

function backToList(): void {
  mobileView.value = "list";
}

function onFee(value: string): void {
  m.setField("fee", value === "" ? null : Number(value));
}

function setFeeType(t: FeeType): void {
  m.setField("feeType", t);
}

// ページヘッダーの「＋ 新しい会場」CTA から呼ぶ (モバイルはフォームビューへ切替)
defineExpose({ addVenue: addVenueLocal, dirty: m.dirty });
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 2ペインカード -->
    <div
      class="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-hairline bg-surface shadow-hq-sm md:grid-cols-[320px_1fr]"
    >
      <!-- ===== 左: 一覧ペイン (モバイルは list ビュー時のみ表示) ===== -->
      <aside
        class="min-h-0 flex-col border-b border-hairline md:border-b-0 md:border-r md:flex"
        :class="mobileView === 'form' ? 'hidden' : 'flex'"
      >
        <div class="border-b border-hairline px-hq-4 pb-hq-3 pt-hq-4">
          <input
            v-model="m.query.value"
            type="search"
            class="w-full rounded-hq-pill border border-hairline bg-surface px-hq-4 py-hq-2 font-jp text-sm text-ink placeholder:text-muted focus:border-accent focus:bg-paper focus:outline-none"
            placeholder="会場名・住所で検索…"
            aria-label="会場検索"
          />
        </div>

        <div
          class="flex items-center justify-between px-hq-4 pb-hq-2 pt-hq-3 font-mono text-[11px] uppercase tracking-widest text-muted"
        >
          <span>会場一覧</span>
          <span>{{ m.filteredCount.value }} / {{ m.totalCount.value }}</span>
        </div>

        <div class="flex-1 overflow-y-auto">
          <button
            v-for="it in m.items.value"
            :key="it.id"
            type="button"
            class="flex min-h-[44px] w-full items-center gap-hq-2 border-b border-l-[3px] border-b-hairline-soft border-l-transparent px-hq-4 py-hq-2 text-left transition-colors hover:bg-paper-warm"
            :class="
              it.selected
                ? 'border-l-accent bg-accent-soft'
                : ''
            "
            :aria-current="it.selected ? 'true' : undefined"
            @click="selectVenue(it.id)"
          >
            <span
              class="font-jp text-sm leading-snug"
              :class="it.selected ? 'font-medium text-ink' : 'text-ink-soft'"
            >
              {{ it.name || "（無題の会場）" }}
            </span>
            <span
              v-if="it.isMain"
              class="ml-auto flex-none rounded-hq-pill border border-accent px-hq-2 py-px font-jp text-[10px] tracking-wide text-accent"
            >
              メイン
            </span>
            <span
              v-else
              class="ml-auto flex-none font-mono text-xs"
              :class="it.selected ? 'text-ink-soft' : 'text-muted'"
            >
              {{ it.feeLabel }}
            </span>
          </button>

          <p
            v-if="m.filteredCount.value === 0"
            class="px-hq-4 py-hq-8 font-jp text-sm text-muted"
          >
            該当する会場がありません
          </p>
        </div>

        <button
          type="button"
          class="flex min-h-[44px] items-center gap-hq-2 border-t border-hairline px-hq-4 py-hq-3 text-left font-jp text-sm text-ink-soft transition-colors hover:text-accent"
          @click="addVenueLocal()"
        >
          ＋ 新しい会場を追加
        </button>
      </aside>

      <!-- ===== 右: 詳細ペイン (モバイルは form ビュー時のみ表示) ===== -->
      <section
        class="min-h-0 flex-col md:flex"
        :class="mobileView === 'list' ? 'hidden' : 'flex'"
      >
        <!-- モバイル: 一覧へ戻る -->
        <button
          type="button"
          class="flex min-h-[44px] items-center gap-hq-2 border-b border-hairline px-hq-4 py-hq-2 text-left font-jp text-sm text-ink-soft transition-colors hover:text-accent md:hidden"
          @click="backToList()"
        >
          ← 会場一覧へ戻る
        </button>

        <!-- Loading -->
        <div
          v-if="m.isLoading.value && !m.draft.value"
          class="flex flex-1 items-center justify-center font-jp text-sm text-muted"
        >
          読み込み中…
        </div>

        <!-- Error -->
        <div
          v-else-if="m.loadErrorCode.value"
          role="alert"
          class="m-hq-6 rounded-hq-md border border-danger/40 bg-danger-soft p-hq-6 font-jp text-sm text-danger"
        >
          会場を読み込めませんでした（ERR · supabase / venues ·
          {{ m.loadErrorCode.value }}）
          <div class="mt-hq-4">
            <Button variant="outline" size="sm" @click="m.reload()">再試行</Button>
          </div>
        </div>

        <!-- Empty (会場ゼロ) -->
        <div
          v-else-if="!m.draft.value"
          class="flex flex-1 items-center justify-center font-jp text-sm text-muted"
        >
          会場が登録されていません
        </div>

        <!-- 詳細フォーム -->
        <template v-else>
          <div class="flex-1 overflow-y-auto px-hq-8 pb-hq-4 pt-hq-6">
            <div class="mb-px flex items-center gap-hq-3">
              <h2 class="font-jp-display text-2xl font-semibold text-ink">
                <template v-if="m.draft.value.name">{{ m.draft.value.name }}</template>
                <span v-else class="text-muted">（無題の会場）</span>
              </h2>
              <span
                v-if="m.draft.value.main"
                class="inline-flex items-center gap-hq-2 rounded-hq-pill border border-accent bg-accent-soft px-hq-3 py-hq-1 font-jp text-xs tracking-wide text-accent"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true"></span>
                メイン会場
              </span>
            </div>
            <p class="mb-hq-6 mt-hq-1 font-mono text-xs text-muted">
              <template v-if="m.draft.value.id">
                最終更新 {{ m.draft.value.updated }}・ID {{ m.draft.value.id }}
              </template>
              <template v-else>新規会場（未保存）</template>
            </p>

            <div class="grid grid-cols-1 gap-x-hq-8 gap-y-hq-5 md:grid-cols-2">
              <!-- 会場名 -->
              <div class="flex flex-col md:col-span-2">
                <label for="vf-name" class="mb-hq-2 font-jp text-xs tracking-wide text-muted">
                  会場名 <span class="text-danger" aria-hidden="true">*</span>
                </label>
                <input
                  id="vf-name"
                  :value="m.draft.value.name"
                  type="text"
                  class="rounded-hq-lg border border-hairline bg-surface px-hq-4 py-hq-3 font-jp text-base text-ink focus:border-accent focus:bg-paper focus:outline-none"
                  :class="m.displayErrors.value.name ? 'border-danger' : ''"
                  :aria-invalid="Boolean(m.displayErrors.value.name)"
                  aria-describedby="vf-name-err"
                  placeholder="例）有明会場"
                  @input="m.setField('name', ($event.target as HTMLInputElement).value)"
                />
                <p
                  v-if="m.displayErrors.value.name"
                  id="vf-name-err"
                  role="alert"
                  class="mt-hq-1 font-jp text-xs text-danger"
                >
                  {{ m.displayErrors.value.name }}
                </p>
              </div>

              <!-- 住所（郵便番号は住所に統合） -->
              <div class="flex flex-col md:col-span-2">
                <label for="vf-address" class="mb-hq-2 font-jp text-xs tracking-wide text-muted">
                  住所
                </label>
                <input
                  id="vf-address"
                  :value="m.draft.value.address"
                  type="text"
                  class="rounded-hq-lg border border-hairline bg-surface px-hq-4 py-hq-3 font-jp text-base text-ink focus:border-accent focus:bg-paper focus:outline-none"
                  placeholder="〒135-0063 東京都江東区有明 1-8-14"
                  @input="m.setField('address', ($event.target as HTMLInputElement).value)"
                />
              </div>

              <!-- 料金タイプ -->
              <div class="flex flex-col">
                <label class="mb-hq-2 font-jp text-xs tracking-wide text-muted">料金タイプ</label>
                <div
                  class="inline-flex w-fit gap-px rounded-hq-lg border border-hairline bg-surface p-px"
                  role="group"
                  aria-label="料金タイプ"
                >
                  <button
                    type="button"
                    class="rounded-hq-sm px-hq-5 py-hq-2 font-jp text-sm"
                    :class="m.draft.value.feeType === 'fixed' ? 'bg-ink text-paper' : 'text-ink-soft'"
                    :aria-pressed="m.draft.value.feeType === 'fixed'"
                    @click="setFeeType('fixed')"
                  >
                    固定額
                  </button>
                  <button
                    type="button"
                    class="rounded-hq-sm px-hq-5 py-hq-2 font-jp text-sm"
                    :class="m.draft.value.feeType === 'variable' ? 'bg-ink text-paper' : 'text-ink-soft'"
                    :aria-pressed="m.draft.value.feeType === 'variable'"
                    @click="setFeeType('variable')"
                  >
                    都度設定
                  </button>
                </div>
              </div>

              <!-- 標準参加費 -->
              <div class="flex flex-col">
                <label for="vf-fee" class="mb-hq-2 font-jp text-xs tracking-wide text-muted">
                  標準参加費
                </label>
                <div
                  class="flex items-center gap-hq-2"
                  :class="m.draft.value.feeType === 'variable' ? 'pointer-events-none opacity-40' : ''"
                >
                  <span class="font-jp text-lg text-ink-soft">¥</span>
                  <input
                    id="vf-fee"
                    :value="m.draft.value.fee ?? ''"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    step="1"
                    class="w-32 rounded-hq-lg border border-hairline bg-surface px-hq-4 py-hq-3 font-jp text-base text-ink focus:border-accent focus:bg-paper focus:outline-none"
                    :class="m.displayErrors.value.fee ? 'border-danger' : ''"
                    :aria-invalid="Boolean(m.displayErrors.value.fee)"
                    :disabled="m.draft.value.feeType === 'variable'"
                    aria-describedby="vf-fee-err"
                    placeholder="1000"
                    @input="onFee(($event.target as HTMLInputElement).value)"
                  />
                </div>
                <p
                  v-if="m.displayErrors.value.fee"
                  id="vf-fee-err"
                  role="alert"
                  class="mt-hq-1 font-jp text-xs text-danger"
                >
                  {{ m.displayErrors.value.fee }}
                </p>
              </div>

              <!-- アクセスメモ（全文表示） -->
              <div class="flex flex-col md:col-span-2">
                <label for="vf-access" class="mb-hq-2 font-jp text-xs tracking-wide text-muted">
                  アクセスメモ
                </label>
                <textarea
                  id="vf-access"
                  :value="m.draft.value.access"
                  rows="3"
                  class="min-h-[84px] resize-y rounded-hq-lg border border-hairline bg-surface px-hq-4 py-hq-3 font-jp text-base leading-relaxed text-ink focus:border-accent focus:bg-paper focus:outline-none"
                  placeholder="最寄り駅・徒歩分数・注意事項など"
                  @input="m.setField('access', ($event.target as HTMLTextAreaElement).value)"
                ></textarea>
              </div>

              <!-- 地図 / 位置情報（map_url 流用） -->
              <div class="flex flex-col md:col-span-2">
                <label for="vf-geo" class="mb-hq-2 font-jp text-xs tracking-wide text-muted">
                  地図 / 位置情報（緯度経度 または 埋め込み URL）
                </label>
                <input
                  id="vf-geo"
                  :value="m.draft.value.geo"
                  type="text"
                  class="mb-hq-3 rounded-hq-lg border border-hairline bg-surface px-hq-4 py-hq-3 font-jp text-base text-ink focus:border-accent focus:bg-paper focus:outline-none"
                  placeholder="35.6357, 139.7902 または https://maps.google.com/..."
                  @input="m.setField('geo', ($event.target as HTMLInputElement).value)"
                />
                <a
                  v-if="m.draft.value.geo"
                  :href="m.draft.value.geo"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex h-40 items-center justify-center rounded-hq-lg border border-hairline bg-paper-warm font-mono text-xs tracking-wide text-ink-soft hover:border-accent hover:text-accent"
                >
                  地図を開く — {{ m.draft.value.geo }}
                </a>
                <div
                  v-else
                  class="flex h-40 items-center justify-center rounded-hq-lg border border-hairline bg-paper-warm font-mono text-xs tracking-wide text-muted"
                >
                  位置情報が未設定です
                </div>
              </div>

              <!-- メイン会場トグル -->
              <div class="flex flex-col md:col-span-2">
                <div
                  class="flex items-center gap-hq-3 rounded-hq-lg border border-dashed border-hairline bg-surface px-hq-4 py-hq-3"
                >
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="m.draft.value.main"
                    aria-label="この会場をメイン会場に設定"
                    class="relative h-6 w-11 flex-none rounded-hq-pill transition-colors"
                    :class="m.draft.value.main ? 'bg-accent' : 'bg-hairline'"
                    @click="m.setField('main', !m.draft.value.main)"
                  >
                    <span
                      class="absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-paper shadow-hq-sm transition-transform"
                      :class="m.draft.value.main ? 'translate-x-[18px]' : ''"
                      aria-hidden="true"
                    ></span>
                  </button>
                  <div>
                    <div class="font-jp text-sm text-ink">この会場をメイン会場に設定</div>
                    <div class="font-jp text-xs text-muted">
                      メインは 1 会場のみ。設定すると既存のメインは自動で解除されます。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- フッターアクション -->
          <footer
            class="flex items-center gap-hq-3 border-t border-hairline bg-paper-warm px-hq-8 py-hq-4"
          >
            <Button
              variant="primary"
              size="sm"
              :loading="m.isSaving.value"
              :disabled="m.isSaving.value"
              @click="m.save()"
            >
              保存
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="!m.dirty.value || m.isSaving.value"
              @click="m.cancel()"
            >
              キャンセル
            </Button>
            <span v-if="m.dirty.value" class="font-jp text-xs text-muted">
              未保存の変更があります
            </span>
            <button
              type="button"
              class="ml-auto rounded-hq-pill border border-accent bg-surface px-hq-5 py-hq-2 font-jp text-sm text-accent transition-colors hover:bg-accent hover:text-paper disabled:pointer-events-none disabled:opacity-50"
              :disabled="m.isDeleting.value"
              @click="m.remove()"
            >
              {{ m.isDeleting.value ? "削除中…" : "この会場を削除" }}
            </button>
          </footer>
        </template>
      </section>
    </div>

    <!-- トースト -->
    <div
      class="pointer-events-none fixed bottom-7 left-1/2 z-50 -translate-x-1/2 rounded-hq-pill bg-ink px-hq-6 py-hq-3 font-jp text-sm text-paper transition-opacity"
      :class="m.toast.value ? 'opacity-100' : 'opacity-0'"
      role="status"
      aria-live="polite"
    >
      {{ m.toast.value }}
    </div>
  </div>
</template>
