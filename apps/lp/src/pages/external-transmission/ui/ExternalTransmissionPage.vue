<template>
  <div class="external-transmission-page max-w-[900px] mx-auto px-hq-4 py-hq-8">
    <nav class="font-jp text-sm text-muted pb-hq-4" aria-label="パンくず">
      <a href="/" class="hover:text-ink underline-offset-2 hover:underline">High Q</a>
      <span class="mx-hq-2" aria-hidden="true">/</span>
      <span class="text-ink">外部送信ポリシー</span>
    </nav>

    <h1 class="font-jp-display text-3xl font-bold text-ink mb-hq-4">外部送信ポリシー</h1>
    <p class="font-jp text-base text-ink mb-hq-2">
      最終更新日: <time :datetime="lastUpdated">{{ lastUpdated }}</time>
    </p>
    <p class="font-jp text-base text-ink mb-hq-6">
      改正電気通信事業法 §27の12（外部送信規律）に基づき、High Q
      の各サービス（ランディングページ / 管理画面 / 予約サイト）からユーザー情報が外部に送信される場合の送信先・送信される情報・利用目的を以下に公表します。
    </p>

    <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">外部送信先一覧</h2>
    <div class="overflow-x-auto">
      <table data-testid="external-transmission-table" class="w-full font-jp text-sm text-ink border-collapse">
        <thead>
          <tr class="border-b border-hairline">
            <th class="text-left py-hq-2 px-hq-2 whitespace-nowrap">送信先</th>
            <th class="text-left py-hq-2 px-hq-2 whitespace-nowrap">区分</th>
            <th class="text-left py-hq-2 px-hq-2">送信される情報</th>
            <th class="text-left py-hq-2 px-hq-2">利用目的</th>
            <th class="text-left py-hq-2 px-hq-2">オプトアウト手段</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in transmissions" :key="row.target" class="border-b border-hairline align-top">
            <td class="py-hq-2 px-hq-2">{{ row.target }}</td>
            <td class="py-hq-2 px-hq-2">
              <Badge :tone="row.category === 'analytics' ? 'warn' : 'neutral'">
                {{ row.category === "analytics" ? "任意" : "必須" }}
              </Badge>
            </td>
            <td class="py-hq-2 px-hq-2">{{ row.info }}</td>
            <td class="py-hq-2 px-hq-2">{{ row.purpose }}</td>
            <td class="py-hq-2 px-hq-2">{{ row.optOut }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">Cookie 同意状態の確認・変更</h2>
    <p class="font-jp text-base text-ink mb-hq-4">
      任意区分（analytics）に属する送信は、Cookie 同意設定で個別に拒否できます。下のボタンから設定パネルを開き、いつでも変更できます。
    </p>
    <Button
      data-testid="open-consent-panel"
      variant="primary"
      @click="openConsent"
    >
      Cookie 同意設定を変更する
    </Button>

    <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">お問い合わせ</h2>
    <p class="font-jp text-base text-ink">
      本ポリシーに関するお問い合わせは
      <a :href="`mailto:${contactEmail}`" data-testid="contact-mailto" class="underline underline-offset-2">{{ contactEmail }}</a>
      までお願いいたします。
    </p>
  </div>
</template>

<script setup lang="ts">
import { Badge, Button } from "@high-q/ui";
import { useConsentPanel } from "@shared/lib/consentPanel";

const lastUpdated = "2026-05-06";
const contactEmail = "high.q.volleyball@gmail.com";

interface Transmission {
  target: string;
  category: "analytics" | "necessary";
  info: string;
  purpose: string;
  optOut: string;
}

const transmissions: Transmission[] = [
  {
    target: "Google Tag Manager / Google Analytics",
    category: "analytics",
    info: "ページビュー、リファラ、ブラウザ識別情報、IP アドレス（推定地域算出用）",
    purpose: "サイト利用状況の分析",
    optOut: "本ページの「Cookie 同意設定を変更する」または初回バナーで「必須のみ」を選択",
  },
  {
    target: "Google Fonts CDN",
    category: "necessary",
    info: "フォントリクエスト時の IP アドレス、Referer、User-Agent",
    purpose: "Web フォント配信",
    optOut: "ブラウザでフォント読み込みをブロック（標準では提供なし）",
  },
  {
    target: "Supabase（米国法人運営、データは日本リージョン保管）",
    category: "necessary",
    info: "メールアドレス、認証セッション、会員情報、本人確認書類画像",
    purpose: "認証・データ保管・ストレージ",
    optOut: "サービス利用に必須のため提供なし",
  },
  {
    target: "Render（米国）",
    category: "necessary",
    info: "アクセスログ（IP アドレス、User-Agent、リクエストパス）",
    purpose: "Web サイトホスティング",
    optOut: "サービス利用に必須のため提供なし",
  },
  {
    target: "AWS API Gateway / DynamoDB（LP の既存イベント取得 API）",
    category: "necessary",
    info: "アクセスログ（IP アドレス、User-Agent）",
    purpose: "イベント情報の取得",
    optOut: "サービス利用に必須のため提供なし",
  },
];

const consent = useConsentPanel();
function openConsent(): void {
  consent.open();
}
</script>
