## ADDED Requirements

### Requirement: `MemberDetailSheet` の他ページからの再利用

`widgets/member-detail-sheet` は MUST `/members` 以外のページ（例: `/events/:id`）からも同一の `MemberDetailSheet` コンポーネントをマウントして開閉できる SHALL。再利用ページは MUST URL クエリ `?detail=<memberId>` を「`/members` と同じセマンティクス」で扱う（クエリ出現でシート表示、クエリ削除で非表示）。

これを実現するため、`useMemberDetailSheet` composable は MUST 「詳細クエリ source」を optional 引数として受け取れる SHALL:
- 引数省略時は `/members` 既存挙動（`useMembersFilter` を内部使用）を保持 SHALL
- 引数指定時は注入された source の `detail` ref / `closeDetail` 関数を使用 SHALL

`/members` 画面の既存挙動・URL スキーマ（`?exp=` `?attended=` `?last=` `?q=` `?sort=` `?dir=` `?page=` `?detail=`）と既存テストは MUST 全て不変であり、refactor によって `/members` の動作が変わってはならない SHALL。

#### Scenario: `useMemberDetailSheet` 引数なし呼び出しの後方互換
- **WHEN** `/members` の `MemberDetailSheet` が引数なしで `useMemberDetailSheet()` を呼ぶ
- **THEN** 内部で `useMembersFilter()` が呼ばれ、`?detail=<id>` の出現でシートが開く既存動作が保たれる

#### Scenario: `useMemberDetailSheet` source 注入呼び出し
- **WHEN** `/events/:id` のページが `useRouteDetailQuery()` を生成し、その `{ detail, closeDetail }` を `useMemberDetailSheet({ detail, closeDetail })` に渡す
- **THEN** シートは渡された `detail` を購読し、`closeDetail` 呼び出しでクエリを削除する

#### Scenario: `/members` 既存テストが緑のまま
- **WHEN** refactor 後に `useMemberDetailSheet.spec.ts` および `MembersListPage` 関連 spec を実行
- **THEN** すべてのテストが既存と同じ assertion で緑になる
