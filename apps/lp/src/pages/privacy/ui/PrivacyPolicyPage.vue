<template>
  <v-container class="privacy-policy-page py-12" max-width="900">
    <v-breadcrumbs
      :items="[
        { title: 'High Q', href: '/' },
        { title: 'プライバシーポリシー', disabled: true },
      ]"
      class="px-0 pb-4"
    />

    <h1 class="text-h4 font-weight-bold mb-4">プライバシーポリシー</h1>
    <p class="text-body-1 mb-2">
      最終更新日: <time :datetime="lastUpdated">{{ lastUpdated }}</time>
    </p>
    <p class="text-body-2 mb-6 text-medium-emphasis">
      本ポリシーは、個人情報の保護に関する法律その他の関係法令に基づき定めます。
    </p>

    <!-- 1. はじめに -->
    <section data-testid="section-intro">
      <h2 class="text-h5 font-weight-bold mt-8 mb-4">1. はじめに</h2>
      <p class="text-body-1 mb-3">
        High Q バレーボールサークル（以下「当サークル」）は、関係法令を遵守し、お客様の個人情報を適切に取り扱います。本プライバシーポリシーは、当サークルが運営する以下のサービス（以下総称して「本サービス」）に共通して適用されます。
      </p>
      <ul class="pl-6 mb-3">
        <li>公式サイト</li>
        <li>予約サイト（会員向け）</li>
        <li>管理画面（運営者向け）</li>
      </ul>
      <p class="text-body-1 mb-3">
        団体名: High Q バレーボールサークル（江東区社会教育団体）<br />
        活動拠点: 東京都江東区<br />
        お問い合わせ窓口: <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
      </p>
    </section>

    <!-- 2. 取得する個人情報の項目 -->
    <section data-testid="section-items">
      <h2 class="text-h5 font-weight-bold mt-8 mb-4">2. 取得する個人情報の項目</h2>
      <p class="text-body-1 mb-3">当サークルは、本サービスの提供にあたり、以下の個人情報を取得・保管します。</p>
      <v-table data-testid="items-table" density="comfortable" class="mb-3">
        <thead>
          <tr>
            <th style="width: 30%">カテゴリ</th>
            <th>項目</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>認証情報</td>
            <td>メールアドレス、ログイン状態を維持するための情報</td>
          </tr>
          <tr>
            <td>プロフィール</td>
            <td>氏名、生年月日、電話番号、バレーボール経験レベル</td>
          </tr>
          <tr>
            <td>本人確認書類</td>
            <td>運転免許証等の顔写真付き身分証明書の画像</td>
          </tr>
          <tr>
            <td>利用ログ</td>
            <td>予約・参加履歴、アクセスログ（IP アドレス、ブラウザの種類、閲覧したページの URL）</td>
          </tr>
        </tbody>
      </v-table>
      <p class="text-body-2 text-medium-emphasis">
        マイナンバーカードを身分証明書として提出される場合は、個人番号部分をマスクした画像のみ受け付け、マイナンバー（個人番号）自体は保管しません。
      </p>
    </section>

    <!-- 3. 利用目的 -->
    <section data-testid="section-purpose">
      <h2 class="text-h5 font-weight-bold mt-8 mb-4">3. 利用目的</h2>
      <p class="text-body-1 mb-3">当サークルは、取得した個人情報を以下の目的のためにのみ利用します。</p>
      <ol class="pl-6 mb-3">
        <li>会員登録時の本人確認</li>
        <li>イベントに関する連絡（変更・中止通知等）</li>
        <li>江東区・東京都へのスポーツ団体・社会教育団体登録の証憑提出</li>
        <li>サービス提供（予約管理・参加管理・出欠管理）</li>
        <li>障害発生時の調査および不正利用の調査・対応</li>
      </ol>
      <p class="text-body-1 mb-3">
        当サークルは、上記の利用目的の範囲を超えて、取得した個人情報を取り扱いません。
      </p>
    </section>

    <!-- 4. 第三者提供 -->
    <section data-testid="section-third-party">
      <h2 class="text-h5 font-weight-bold mt-8 mb-4">4. 第三者提供</h2>
      <p class="text-body-1 mb-3">
        当サークルは、以下のいずれかに該当する場合を除き、取得した個人情報を第三者に提供しません。
      </p>
      <ol class="pl-6 mb-3">
        <li>法令に基づく場合</li>
        <li>江東区・東京都への団体登録の証憑として、当サークル運営者が役所窓口に書類を提出する場合</li>
      </ol>
      <p class="text-body-1 mb-3">
        本サービスの運営にあたり、データ保管・配信等の一部業務を外部のクラウドサービス事業者に委託しています。委託先には法令に基づく適切な監督を行います。委託先の所在地は外国にわたる場合がありますが、お客様の個人情報を含むデータは可能な限り日本国内のリージョンに保管されます。具体的な委託先の名称等については、お問い合わせ窓口より個別にご照会ください。
      </p>
    </section>

    <!-- 5. 保管期間と退会後の処理 -->
    <section data-testid="section-retention">
      <h2 class="text-h5 font-weight-bold mt-8 mb-4">5. 保管期間と退会後の処理</h2>
      <ul class="pl-6 mb-3">
        <li>
          <strong>在籍中</strong>: 会員データは、本サービスの提供のために必要な期間継続して保管します
        </li>
        <li>
          <strong>退会時</strong>: 退会のお申し出があった場合、本人確認書類画像を含む会員データを削除します
        </li>
        <li>
          <strong>役所提出済の証憑</strong>: 江東区・東京都に提出済の団体登録証憑コピーは、法令上の保管期限が定められている場合は当該期限まで分離して保管します
        </li>
      </ul>
    </section>

    <!-- 6. 安全管理措置 -->
    <section data-testid="section-security">
      <h2 class="text-h5 font-weight-bold mt-8 mb-4">6. 安全管理措置</h2>
      <p class="text-body-1 mb-3">
        当サークルは、個人情報の漏えい・滅失・毀損の防止その他の安全管理のために、以下の措置を講じています。
      </p>
      <ul class="pl-6 mb-3">
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
      <h2 class="text-h5 font-weight-bold mt-8 mb-4">7. 開示・訂正・利用停止等の請求</h2>
      <p class="text-body-1 mb-3">
        ご本人は、当サークルが保有する自身の個人情報について、以下の請求を行うことができます。
      </p>
      <ul class="pl-6 mb-3">
        <li>保有個人データの開示請求</li>
        <li>内容の訂正・追加・削除の請求</li>
        <li>利用停止・消去の請求</li>
        <li>第三者提供の停止の請求</li>
      </ul>
      <p class="text-body-1 mb-3">
        ご請求は下記窓口までメールでお寄せください。本人確認のうえ、合理的な期間内に対応いたします。
      </p>
      <p class="text-body-1 mb-3">
        受付窓口:
        <a :href="`mailto:${contactEmail}`" data-testid="rights-mailto">{{ contactEmail }}</a>
      </p>
    </section>

    <!-- 8-10. 外部送信 / 改定履歴 / お問い合わせ -->
    <section data-testid="section-meta">
      <h2 class="text-h5 font-weight-bold mt-8 mb-4">8. 外部送信・Cookie について</h2>
      <p class="text-body-1 mb-3">
        本サービスからお客様の端末情報を外部に送信する場合の詳細（送信先・送信される情報・利用目的・オプトアウト手段）、および Cookie の利用については、別途定める
        <a href="/external-transmission" data-testid="external-transmission-link">外部送信ポリシー</a>
        をご覧ください。
      </p>

      <h2 class="text-h5 font-weight-bold mt-8 mb-4">9. 改定履歴</h2>
      <ul class="pl-6 mb-3">
        <li>{{ lastUpdated }}: 初版公開</li>
      </ul>

      <h2 class="text-h5 font-weight-bold mt-8 mb-4">10. お問い合わせ</h2>
      <p class="text-body-1">
        本ポリシーに関するお問い合わせは
        <a :href="`mailto:${contactEmail}`" data-testid="contact-mailto">{{ contactEmail }}</a>
        までお願いいたします。
      </p>
    </section>
  </v-container>
</template>

<script setup>
const lastUpdated = "2026-05-06";
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
.privacy-policy-page :deep(table th) {
  white-space: nowrap;
}
</style>
