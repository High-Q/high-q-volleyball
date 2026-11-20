<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { MemberId } from "@high-q/shared";
import { Button } from "@high-q/ui";
import FormField from "@/shared/ui/FormField.vue";
import Input from "@/shared/ui/Input.vue";
import Textarea from "@/shared/ui/Textarea.vue";
import Select from "@/shared/ui/Select.vue";
import SelectTrigger from "@/shared/ui/SelectTrigger.vue";
import SelectValue from "@/shared/ui/SelectValue.vue";
import SelectContent from "@/shared/ui/SelectContent.vue";
import SelectItem from "@/shared/ui/SelectItem.vue";
import AlertDialog from "@/shared/ui/AlertDialog.vue";
import AlertDialogContent from "@/shared/ui/AlertDialogContent.vue";
import AlertDialogHeader from "@/shared/ui/AlertDialogHeader.vue";
import AlertDialogFooter from "@/shared/ui/AlertDialogFooter.vue";
import AlertDialogTitle from "@/shared/ui/AlertDialogTitle.vue";
import AlertDialogDescription from "@/shared/ui/AlertDialogDescription.vue";
import { useAnnouncementsMaster } from "../composables/useAnnouncementsMaster";
import { BODY_MAX, TITLE_MAX } from "../model/announcementDraft";
import type { AnnouncementStatus } from "@/entities/announcement";

/**
 * お知らせ マスター・ディテール画面の本体 widget（左=一覧 / 右=編集フォーム）。
 *
 * レイアウトは widgets/venues-master-detail を手本にしつつ、フォーム入力は
 * CLAUDE.md 規約どおり shared/ui/FormField でラップし、削除は AlertDialog で確認する。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/admin-announcements/spec.md
 */

const props = defineProps<{ adminMemberId: MemberId | null }>();

const m = useAnnouncementsMaster(computed(() => props.adminMemberId));

// モバイル (< md) は list ⇄ form のビュー切替。md+ では両ペイン常時表示。
const mobileView = ref<"list" | "form">("list");

onMounted(() => {
  void m.reload();
});

function selectItem(id: string): void {
  m.select(id);
  mobileView.value = "form";
}

function addLocal(): void {
  m.addAnnouncement();
  mobileView.value = "form";
}

const STATUS_BADGE: Record<AnnouncementStatus, string> = {
  scheduled: "border-hairline text-muted",
  active: "border-accent bg-accent-soft text-accent",
  ended: "border-hairline text-ink-soft",
};
</script>

<template>
  <div class="flex h-full flex-col">
    <div
      class="grid flex-1 grid-cols-1 rounded-2xl border border-hairline bg-surface shadow-hq-sm md:min-h-0 md:overflow-hidden md:grid-cols-[320px_1fr]"
    >
      <!-- ===== 左: 一覧ペイン ===== -->
      <aside
        class="min-h-0 flex-col border-b border-hairline md:border-b-0 md:border-r md:flex"
        :class="mobileView === 'form' ? 'hidden' : 'flex'"
      >
        <div
          class="flex items-center justify-between border-b border-hairline px-hq-4 pb-hq-2 pt-hq-4 font-mono text-[11px] uppercase tracking-widest text-muted"
        >
          <span>お知らせ一覧</span>
          <span>{{ m.totalCount.value }}</span>
        </div>

        <div class="flex-1 md:overflow-y-auto">
          <button
            v-for="it in m.items.value"
            :key="it.id"
            type="button"
            class="flex min-h-[44px] w-full flex-col gap-hq-1 border-b border-l-[3px] border-b-hairline-soft border-l-transparent px-hq-4 py-hq-2 text-left transition-colors hover:bg-paper-warm"
            :class="it.selected ? 'border-l-accent bg-accent-soft' : ''"
            :aria-current="it.selected ? 'true' : undefined"
            @click="selectItem(it.id)"
          >
            <span
              class="font-jp text-sm leading-snug"
              :class="it.selected ? 'font-medium text-ink' : 'text-ink-soft'"
            >
              {{ it.title || "（無題のお知らせ）" }}
            </span>
            <span class="flex items-center gap-hq-2">
              <span
                class="rounded-hq-pill border px-hq-2 py-px font-jp text-[10px] tracking-wide"
                :class="STATUS_BADGE[it.status]"
              >
                {{ it.statusLabel }}
              </span>
              <span class="font-jp text-[10px] text-muted">{{ it.audienceLabel }}</span>
            </span>
          </button>

          <p
            v-if="m.totalCount.value === 0 && !m.isLoading.value"
            class="px-hq-4 py-hq-8 font-jp text-sm text-muted"
          >
            お知らせはまだありません
          </p>
        </div>

        <button
          type="button"
          class="flex min-h-[44px] items-center gap-hq-2 border-t border-hairline px-hq-4 py-hq-3 text-left font-jp text-sm text-ink-soft transition-colors hover:text-accent"
          @click="addLocal()"
        >
          ＋ 新しいお知らせを追加
        </button>
      </aside>

      <!-- ===== 右: 詳細ペイン ===== -->
      <section
        class="min-h-0 flex-col md:flex"
        :class="mobileView === 'list' ? 'hidden' : 'flex'"
      >
        <button
          type="button"
          class="flex min-h-[44px] items-center gap-hq-2 border-b border-hairline px-hq-4 py-hq-2 text-left font-jp text-sm text-ink-soft transition-colors hover:text-accent md:hidden"
          @click="mobileView = 'list'"
        >
          ← お知らせ一覧へ戻る
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
          お知らせを読み込めませんでした（ERR · supabase / announcements ·
          {{ m.loadErrorCode.value }}）
          <div class="mt-hq-4">
            <Button variant="outline" size="sm" @click="m.reload()">再試行</Button>
          </div>
        </div>

        <!-- Empty -->
        <div
          v-else-if="!m.draft.value"
          class="flex flex-1 flex-col items-center justify-center gap-hq-3 font-jp text-sm text-muted"
        >
          <p>お知らせはまだありません</p>
          <Button variant="outline" size="sm" @click="addLocal()">お知らせを作成</Button>
        </div>

        <!-- 詳細フォーム -->
        <template v-else>
          <div class="flex-1 md:overflow-y-auto px-hq-8 pb-hq-4 pt-hq-6">
            <p class="mb-hq-6 font-mono text-xs text-muted">
              <template v-if="m.draft.value.id">
                最終更新 {{ m.draft.value.updated }}・ID {{ m.draft.value.id }}
              </template>
              <template v-else>新規お知らせ（未保存）</template>
            </p>

            <div class="grid grid-cols-1 gap-x-hq-8 gap-y-hq-5 md:grid-cols-2">
              <!-- タイトル -->
              <FormField
                label="タイトル"
                class="md:col-span-2"
                :error="m.displayErrors.value.title"
                v-slot="{ fieldId, messageId, ariaInvalid }"
              >
                <Input
                  :id="fieldId"
                  :model-value="m.draft.value.title"
                  :maxlength="TITLE_MAX"
                  :aria-invalid="ariaInvalid"
                  :aria-describedby="messageId"
                  placeholder="例）年末年始の活動休止について"
                  @update:model-value="(v) => m.setField('title', String(v))"
                />
              </FormField>

              <!-- 本文 -->
              <FormField
                label="本文"
                class="md:col-span-2"
                :error="m.displayErrors.value.body"
                :hint="`改行はそのまま表示されます（${BODY_MAX} 文字以内）`"
                v-slot="{ fieldId, messageId, ariaInvalid }"
              >
                <Textarea
                  :id="fieldId"
                  :model-value="m.draft.value.body"
                  :maxlength="BODY_MAX"
                  :rows="5"
                  :aria-invalid="ariaInvalid"
                  :aria-describedby="messageId"
                  placeholder="お知らせの本文を入力してください。"
                  @update:model-value="(v) => m.setField('body', String(v))"
                />
              </FormField>

              <!-- 出す相手 -->
              <FormField
                label="出す相手"
                :error="m.displayErrors.value.audience"
                hint="公開=LP / 会員=予約サイト / 両方"
                v-slot="{ fieldId, ariaInvalid }"
              >
                <Select
                  :model-value="m.draft.value.audience"
                  @update:model-value="(v) => m.setField('audience', (v ?? '') as typeof m.draft.value.audience)"
                >
                  <SelectTrigger :id="fieldId" :aria-invalid="ariaInvalid" aria-label="出す相手">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">公開（LP）</SelectItem>
                    <SelectItem value="members">会員（予約）</SelectItem>
                    <SelectItem value="all">両方</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <!-- 掲載開始日 -->
              <FormField label="掲載開始日" v-slot="{ fieldId }">
                <Input
                  :id="fieldId"
                  type="date"
                  :model-value="m.draft.value.startDate"
                  @update:model-value="(v) => m.setField('startDate', String(v))"
                />
              </FormField>

              <!-- 掲載終了日（任意） -->
              <FormField
                label="掲載終了日（任意・空欄で無期限）"
                :error="m.displayErrors.value.endDate"
                v-slot="{ fieldId, messageId, ariaInvalid }"
              >
                <Input
                  :id="fieldId"
                  type="date"
                  :model-value="m.draft.value.endDate"
                  :aria-invalid="ariaInvalid"
                  :aria-describedby="messageId"
                  @update:model-value="(v) => m.setField('endDate', String(v))"
                />
              </FormField>
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
              @click="m.requestDelete()"
            >
              {{ m.draft.value.id ? "このお知らせを削除" : "入力中の新規を破棄" }}
            </button>
          </footer>
        </template>
      </section>
    </div>

    <!-- 削除確認ダイアログ -->
    <AlertDialog
      :open="m.deleteOpen.value"
      @update:open="(next) => { if (!next) m.cancelDelete(); }"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>このお知らせを削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            この操作は取り消せません。掲載中の場合は LP・予約サイトからも即座に消えます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <button
            type="button"
            :disabled="m.isDeleting.value"
            class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 mt-hq-2 sm:mt-0"
            @click="m.cancelDelete()"
          >
            キャンセル
          </button>
          <button
            type="button"
            :disabled="m.isDeleting.value"
            class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-danger px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
            @click="m.confirmDelete()"
          >
            {{ m.isDeleting.value ? "削除中…" : "削除する" }}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

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
