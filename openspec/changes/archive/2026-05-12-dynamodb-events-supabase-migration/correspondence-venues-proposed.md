# AWS location → Supabase venue 対照表 (proposed, machine-generated)

> このファイルは `--survey` で機械生成されたものです。
> 翔太郎くんが各行を確定し `correspondence-venues-approved.md` として保存してください。
> 判定欄: `match`（既存 venue を再利用）/ `new`（新規 INSERT）/ `fix`（既存 venue 名を修正）

| # | AWS location | 候補種別 | Supabase venue 候補 | venue_id | 機械判定スコア | 判定 |
|---|---|---|---|---|---|---|
| 1 | `有明テニスの森` | none | `—` | `—` | 0 | new |
| 2 | `練馬高野台駅周辺` | none | `—` | `—` | 0 | new |
| 3 | `有明テニスの森駅周辺` | none | `—` | `—` | 0 | new |
| 4 | `深川スポーツセンター` | exact | `深川スポーツセンター` | `1778ddd4-b35f-406b-882c-c812619fb60a` | 100 | match |
| 5 | `江東区スポーツ会館` | none | `—` | `—` | 0 | new |
| 6 | `東砂スポーツセンター` | exact | `東砂スポーツセンター` | `31f2fa2e-bd33-43de-a72d-86e1c32342b3` | 100 | match |
| 7 | `有明スポーツセンター` | levenshtein | `亀戸スポーツセンター` | `59d47647-0dfd-4159-a382-774393a40a96` | 50 | (要確認) |
| 8 | `亀戸スポーツセンター` | exact | `亀戸スポーツセンター` | `59d47647-0dfd-4159-a382-774393a40a96` | 100 | match |
| 9 | `門前仲町` | none | `—` | `—` | 0 | new |
| 10 | `深川北スポーツセンター` | exact | `深川北スポーツセンター` | `1d22e7f9-cd32-4e1e-9c60-5df33b1fca1a` | 100 | match |
| 11 | `東砂町スポーツセンター` | levenshtein | `東砂スポーツセンター` | `31f2fa2e-bd33-43de-a72d-86e1c32342b3` | 55 | (要確認) |
| 12 | `渋谷区` | none | `—` | `—` | 0 | new |
| 13 | `新木場` | none | `—` | `—` | 0 | new |
| 14 | `亀戸駅周辺` | none | `—` | `—` | 0 | new |
