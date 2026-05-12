# AWS location → Supabase venue 対照表 (proposed, machine-generated)

> このファイルは `--survey` で機械生成されたものです。
> 翔太郎くんが各行を確定し `correspondence-venues-approved.md` として保存してください。
> 判定欄: `match`（既存 venue を再利用）/ `new`（新規 INSERT）/ `fix`（既存 venue 名を修正）

| # | AWS location | 候補種別 | Supabase venue 候補 | venue_id | 機械判定スコア | 判定 |
|---|---|---|---|---|---|---|
| 1 | `有明テニスの森` | none | `—` | `—` | 0 | new |
| 2 | `練馬高野台駅周辺` | none | `—` | `—` | 0 | new |
| 3 | `有明テニスの森駅周辺` | none | `—` | `—` | 0 | new |
| 4 | `深川スポーツセンター` | exact | `深川スポーツセンター` | `e4ec8de0-56fc-41d9-b0ad-14ed7f2e9586` | 100 | match |
| 5 | `江東区スポーツ会館` | none | `—` | `—` | 0 | new |
| 6 | `東砂スポーツセンター` | exact | `東砂スポーツセンター` | `5d1f746e-e797-482c-8133-258a8913d9fe` | 100 | match |
| 7 | `有明スポーツセンター` | levenshtein | `亀戸スポーツセンター` | `726ec8e9-91c8-4835-8b29-2de6130ed906` | 50 | (要確認) |
| 8 | `亀戸スポーツセンター` | exact | `亀戸スポーツセンター` | `726ec8e9-91c8-4835-8b29-2de6130ed906` | 100 | match |
| 9 | `門前仲町` | none | `—` | `—` | 0 | new |
| 10 | `深川北スポーツセンター` | exact | `深川北スポーツセンター` | `aac7c704-eb7f-4d45-b1de-9fa19caaa4b6` | 100 | match |
| 11 | `東砂町スポーツセンター` | levenshtein | `東砂スポーツセンター` | `5d1f746e-e797-482c-8133-258a8913d9fe` | 55 | (要確認) |
| 12 | `渋谷区` | none | `—` | `—` | 0 | new |
| 13 | `新木場` | none | `—` | `—` | 0 | new |
| 14 | `亀戸駅周辺` | none | `—` | `—` | 0 | new |
