<template>
  <div class="privacy-policy-page max-w-[900px] mx-auto px-hq-4 py-hq-8">
    <nav class="font-jp text-sm text-muted pb-hq-4" aria-label="パンくず">
      <a href="/" class="hover:text-ink underline-offset-2 hover:underline">High Q</a>
      <span class="mx-hq-2" aria-hidden="true">/</span>
      <span class="text-ink">プライバシーポリシー</span>
    </nav>

    <h1 class="font-jp-display text-3xl font-bold text-ink mb-hq-4">プライバシーポリシー</h1>
    <p class="font-jp text-base text-ink mb-hq-2">
      最終更新日: <time :datetime="lastUpdated">{{ lastUpdated }}</time>
    </p>
    <p class="font-jp text-sm text-muted mb-hq-6">
      本ポリシーは、個人情報の保護に関する法律その他の関係法令に基づき定めます。
    </p>

    <!-- 1. はじめに -->
    <section data-testid="section-intro">
      <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">1. はじめに</h2>
      <p class="font-jp text-base text-ink mb-hq-3">
        High Q バレーボールサークル（以下「当サークル」）は、関係法令を遵守し、お客様の個人情報を適切に取り扱います。本プライバシーポリシーは、当サークルが運営する以下のサービス（以下総称して「本サービス」）に共通して適用されます。
      </p>
      <ul class="pl-6 mb-hq-3 list-disc font-jp text-base text-ink">
        <li>公式サイト</li>
        <li>予約サイト（会員向け）</li>
        <li>管理画面（運営者向け）</li>
      </ul>
      <p class="font-jp text-base text-ink mb-hq-3">
        団体名: High Q バレーボールサークル（江東区社会教育団体）<br />
        活動拠点: 東京都江東区<br />
        お問い合わせ窓口: <a :href="`mailto:${contactEmail}`" class="underline underline-offset-2">{{ contactEmail }}</a>
      </p>
    </section>

    <!-- 2. 取得する個人情報の項目 -->
    <section data-testid="section-items">
      <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">2. 取得する個人情報の項目</h2>
      <p class="font-jp text-base text-ink mb-hq-3">当サークルは、本サービスの提供にあたり、以下の個人情報を取得・保管します。</p>
      <table data-testid="items-table" class="w-full mb-hq-3 font-jp text-sm text-ink border-collapse">
        <thead>
          <tr class="border-b border-hairline">
            <th class="text-left py-hq-2 px-hq-2 whitespace-nowrap" style="width: 30%">カテゴリ</th>
            <th class="text-left py-hq-2 px-hq-2">項目</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-hairline">
            <td class="py-hq-2 px-hq-2 align-top">認証情報</td>
            <td class="py-hq-2 px-hq-2">メールアドレス、ログイン状態を維持するための情報</td>
          </tr>
          <tr class="border-b border-hairline">
            <td class="py-hq-2 px-hq-2 align-top">プロフィール</td>
            <td class="py-hq-2 px-hq-2">氏名、生年月日、電話番号、バレーボール経験レベル</td>
          </tr>
          <tr class="border-b border-hairline">
            <td class="py-hq-2 px-hq-2 align-top">本人確認書類</td>
            <td class="py-hq-2 px-hq-2">運転免許証等の顔写真付き身分証明書の画像</td>
          </tr>
          <tr class="border-b border-hairline">
            <td class="py-hq-2 px-hq-2 align-top">利用ログ</td>
            <td class="py-hq-2 px-hq-2">予約・参加履歴、アクセスログ（IP アドレス、ブラウザの種類、閲覧したページの URL）</td>
          </tr>
        </tbody>
      </table>
      <p class="font-jp text-sm text-muted">
        マイナンバーカードを身分証明書として提出される場合は、個人番号部分をマスクした画像のみ受け付け、マイナンバー（個人番号）自体は保管しません。
      </p>
    </section>

    <!-- 3. 利用目的 -->
    <section data-testid="section-purpose">
      <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">3. 利用目的</h2>
      <p class="font-jp text-base text-ink mb-hq-3">当サークルは、取得した個人情報を以下の目的のためにのみ利用します。</p>
      <ol class="pl-6 mb-hq-3 list-decimal font-jp text-base text-ink">
        <li>会員登録時の本人確認</li>
        <li>イベントに関する連絡（変更・中止通知等）</li>
        <li>江東区・東京都へのスポーツ団体・社会教育団体登録の証憑提出</li>
        <li>サービス提供（予約管理・参加管理・出欠管理）</li>
        <li>障害発生時の調査および不正利用の調査・対応</li>
      </ol>
      <p class="font-jp text-base text-ink mb-hq-3">
        当サークルは、上記の利用目的の範囲を超えて、取得した個人情報を取り扱いません。
      </p>
      <h3 class="font-jp-display text-base font-bold text-ink mt-hq-6 mb-hq-3" data-testid="nickname-display-heading">
        会員間でのニックネーム表示について
      </h3>
      <p class="font-jp text-base text-ink mb-hq-3" data-testid="nickname-display-body">
        会員プロフィールに設定したニックネームは、ご自身が予約しているイベントの他の参加者に表示されます。表示範囲はそのイベントの予約者に限られ、不特定多数に公開されることはありません。
        氏名・メールアドレス・電話番号・生年月日・経験レベルなど、他参加者にとっての個人特定情報は表示されません。
        ニックネームを設定されていない場合は、「参加メンバー」と汎用的に表示します。
      </p>
    </section>

    <!-- 4. 第三者提供 -->
    <section data-testid="section-third-party">
      <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">4. 第三者提供</h2>
      <p class="font-jp text-base text-ink mb-hq-3">
        当サークルは、以下のいずれかに該当する場合を除き、取得した個人情報を第三者に提供しません。
      </p>
      <ol class="pl-6 mb-hq-3 list-decimal font-jp text-base text-ink">
        <li>法令に基づく場合</li>
        <li>江東区・東京都への団体登録の証憑として、当サークル運営者が役所窓口に書類を提出する場合</li>
      </ol>
      <p class="font-jp text-base text-ink mb-hq-3">
        本サービスの運営にあたり、データ保管・配信等の一部業務を外部のクラウドサービス事業者に委託しています。委託先には法令に基づく適切な監督を行います。委託先の所在地は外国にわたる場合がありますが、お客様の個人情報を含むデータは可能な限り日本国内のリージョンに保管されます。具体的な委託先の名称等については、お問い合わせ窓口より個別にご照会ください。
      </p>
    </section>

    <!-- 5. 保管期間と退会後の処理 -->
    <section data-testid="section-retention">
      <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">5. 保管期間と退会後の処理</h2>
      <ul class="pl-6 mb-hq-3 list-disc font-jp text-base text-ink">
        <li>
          <strong>在籍中</strong>: 会員データは、本サービスの提供のために必要な期間継続して保管します
        </li>
        <li>
          <strong>退会時に削除する対象</strong>: 退会時には、氏名・ニックネーム・メールアドレス・電話番号・生年月日・経験レベル・本人確認書類画像・認証アカウントを含む、本人を特定できる会員データを完全に削除します
        </li>
        <li>
          <strong>退会後も残る匿名化された参加履歴</strong>: 退会後も、過去にどのイベントへ何人で参加したかという記録は、会員を特定できない匿名の集計データとしてのみイベント側に残ります。氏名・連絡先・自由記述メモ・本人確認書類など個人を識別できる情報は一切残りません
        </li>
        <li>
          <strong>役所提出済の証憑</strong>: 江東区・東京都に提出済の団体登録証憑コピーは、法令上の保管期限が定められている場合は当該期限まで分離して保管します
        </li>
      </ul>
    </section>

    <!-- 6. 安全管理措置 -->
    <section data-testid="section-security">
      <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">6. 安全管理措置</h2>
      <p class="font-jp text-base text-ink mb-hq-3">
        当サークルは、個人情報の漏えい・滅失・毀損の防止その他の安全管理のために、以下の措置を講じています。
      </p>
      <ul class="pl-6 mb-hq-3 list-disc font-jp text-base text-ink">
        <li>本人および権限を有する運営者のみが該当データにアクセスできるアクセス制御</li>
        <li>保管情報の暗号化</li>
        <li>通信経路の暗号化</li>
        <li>本人確認書類の取扱に関する内部規程に基づく運用（閲覧記録・廃棄手順の規定）</li>
        <li>マイナンバー（個人番号）自体の保管禁止</li>
        <li>本人確認書類の閲覧権限を、本人および当サークル運営者に限定</li>
      </ul>
    </section>

    <!-- 7. 開示・訂正・利用停止等の請求窓口 -->
    <section data-testid="section-rights">
      <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">7. 開示・訂正・利用停止等の請求</h2>
      <p class="font-jp text-base text-ink mb-hq-3">
        ご本人は、当サークルが保有する自身の個人情報について、以下の請求を行うことができます。
      </p>
      <ul class="pl-6 mb-hq-3 list-disc font-jp text-base text-ink">
        <li>保有個人データの開示請求</li>
        <li>内容の訂正・追加・削除の請求</li>
        <li>利用停止・消去の請求</li>
        <li>第三者提供の停止の請求</li>
      </ul>
      <p class="font-jp text-base text-ink mb-hq-3">
        ご請求は下記窓口までメールでお寄せください。本人確認のうえ、合理的な期間内に対応いたします。
      </p>
      <p class="font-jp text-base text-ink mb-hq-3">
        受付窓口:
        <a :href="`mailto:${contactEmail}`" data-testid="rights-mailto" class="underline underline-offset-2">{{ contactEmail }}</a>
      </p>
      <p class="font-jp text-base text-ink mb-hq-3">
        本請求に係る手数料は、MVP1 期間中は無料です。
      </p>
    </section>

    <!-- 8-10. 外部送信 / 改定履歴 / お問い合わせ -->
    <section data-testid="section-meta">
      <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">8. 外部送信・Cookie について</h2>
      <p class="font-jp text-base text-ink mb-hq-3">
        本サービスからお客様の端末情報を外部に送信する場合の詳細（送信先・送信される情報・利用目的・オプトアウト手段）、および Cookie の利用については、別途定める
        <a href="/external-transmission" data-testid="external-transmission-link" class="underline underline-offset-2">外部送信ポリシー</a>
        をご覧ください。
      </p>

      <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">9. 改定履歴</h2>
      <ul class="pl-6 mb-hq-3 list-disc font-jp text-base text-ink">
        <li>2026-05-06: 初版公開</li>
        <li>{{ lastUpdated }}: 「会員間でのニックネーム表示について」を 3. 利用目的に追記</li>
      </ul>

      <h2 class="font-jp-display text-2xl font-bold text-ink mt-hq-8 mb-hq-4">10. お問い合わせ</h2>
      <p class="font-jp text-base text-ink">
        本ポリシーに関するお問い合わせは
        <a :href="`mailto:${contactEmail}`" data-testid="contact-mailto" class="underline underline-offset-2">{{ contactEmail }}</a>
        までお願いいたします。
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
const lastUpdated = "2026-06-08";
const contactEmail = "high.q.volleyball@gmail.com";
</script>

<style scoped>
.privacy-policy-page :deep(h2) {
  scroll-margin-top: 80px;
}
.privacy-policy-page :deep(ul),
.privacy-policy-page :deep(ol) {
  line-height: 1.8;
}
</style>
