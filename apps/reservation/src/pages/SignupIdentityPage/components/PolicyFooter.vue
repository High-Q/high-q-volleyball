<script setup lang="ts">
// 個人情報保護法 + 改正電気通信事業法対応の footer 注記。
// リンク先 (/privacy / /external-transmission) は別 Issue (#193 / #192) で実装。
</script>

<template>
  <div
    class="mt-hq-5 flex flex-col gap-hq-2 font-jp text-[11px] leading-[1.7] text-muted"
  >
    <p>
      アップロードいただいた画像は、参加者の身元確認 (安全担保) と、江東区・東京都への団体登録 (スポーツ団体・社会教育団体) の証憑提出のためにのみ使用します。第三者への提供は法令に基づく場合を除き行いません。
    </p>
    <p>
      画像は Supabase (米国法人運営の SaaS、データは日本リージョン保管) を経由して安全に保管されます。
    </p>
    <p>
      詳細は
      <RouterLink to="/privacy" class="text-accent underline">
        プライバシーポリシー
      </RouterLink>
      ・
      <RouterLink to="/external-transmission" class="text-accent underline">
        外部送信ポリシー
      </RouterLink>
      をご覧ください。
    </p>
  </div>
</template>
