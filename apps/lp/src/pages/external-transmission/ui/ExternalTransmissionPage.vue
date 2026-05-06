<template>
  <v-container class="external-transmission-page py-12" max-width="900">
    <v-breadcrumbs
      :items="[
        { title: 'High Q', href: '/' },
        { title: '外部送信ポリシー', disabled: true },
      ]"
      class="px-0 pb-4"
    />

    <h1 class="text-h4 font-weight-bold mb-4">外部送信ポリシー</h1>
    <p class="text-body-1 mb-2">
      最終更新日: <time :datetime="lastUpdated">{{ lastUpdated }}</time>
    </p>
    <p class="text-body-1 mb-6">
      改正電気通信事業法 §27の12（外部送信規律）に基づき、High Q
      の各サービス（ランディングページ / 管理画面 / 予約サイト）からユーザー情報が外部に送信される場合の送信先・送信される情報・利用目的を以下に公表します。
    </p>

    <h2 class="text-h5 font-weight-bold mt-8 mb-4">外部送信先一覧</h2>
    <v-table data-testid="external-transmission-table" density="comfortable">
      <thead>
        <tr>
          <th>送信先</th>
          <th>区分</th>
          <th>送信される情報</th>
          <th>利用目的</th>
          <th>オプトアウト手段</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in transmissions" :key="row.target">
          <td>{{ row.target }}</td>
          <td>
            <v-chip
              :color="row.category === 'analytics' ? 'warning' : 'default'"
              size="small"
              variant="flat"
            >
              {{ row.category === "analytics" ? "任意" : "必須" }}
            </v-chip>
          </td>
          <td>{{ row.info }}</td>
          <td>{{ row.purpose }}</td>
          <td>{{ row.optOut }}</td>
        </tr>
      </tbody>
    </v-table>

    <h2 class="text-h5 font-weight-bold mt-8 mb-4">Cookie 同意状態の確認・変更</h2>
    <p class="text-body-1 mb-4">
      任意区分（analytics）に属する送信は、Cookie 同意設定で個別に拒否できます。下のボタンから設定パネルを開き、いつでも変更できます。
    </p>
    <v-btn
      data-testid="open-consent-panel"
      color="primary"
      variant="flat"
      @click="openConsent"
    >
      Cookie 同意設定を変更する
    </v-btn>

    <h2 class="text-h5 font-weight-bold mt-8 mb-4">お問い合わせ</h2>
    <p class="text-body-1">
      本ポリシーに関するお問い合わせは
      <a :href="`mailto:${contactEmail}`" data-testid="contact-mailto">{{ contactEmail }}</a>
      までお願いいたします。
    </p>
  </v-container>
</template>

<script setup>
import { useConsentPanel } from "@shared/lib/consentPanel";

const lastUpdated = "2026-05-06";
const contactEmail = "high.q.volleyball@gmail.com";

const transmissions = [
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
function openConsent() {
  consent.open();
}
</script>

<style scoped>
.external-transmission-page :deep(table) {
  font-size: 0.95rem;
}
.external-transmission-page :deep(table th) {
  white-space: nowrap;
}
</style>
