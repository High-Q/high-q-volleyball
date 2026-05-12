/**
 * scripts/migrate-aws-events-to-supabase.ts
 *
 * 一度きり: AWS DynamoDB（旧 LP API）→ Supabase events テーブルへ取り込み。
 *
 * 3 段階運用:
 *   1. --survey    AWS データ取得 + Supabase venues 取得 → 対照表（proposed）を生成
 *                  書き込みは一切しない
 *   2. (人手)      proposed を確認し、approved として承認・git commit
 *   3. --dry-run   approved を読んで投入予定をレポート（書き込みなし）
 *   4. --commit    approved を読んで実際に Supabase へ INSERT
 *
 * 必要環境変数（.env.migration から手動 source）:
 *   SUPABASE_URL          例 https://xxx.supabase.co
 *   SUPABASE_SECRET_KEY   旧 service_role / 新 secret key（RLS バイパス用）
 *   AWS_EVENTS_ENDPOINT   既定: https://ptfomh71x9.execute-api.ap-northeast-1.amazonaws.com/beta/event
 *
 * 関連:
 *   openspec/changes/dynamodb-events-supabase-migration/
 *   docs/08-移行/03-AWS-Supabase-events-移行手順.md
 *   CLAUDE.md セキュリティルール
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type Mode = 'survey' | 'dry-run' | 'commit' | 'set-default-fees'

interface CliArgs {
  mode: Mode
  correspondenceDir: string
}

interface AwsEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  location: string
  // 想定外フィールドも検知できるように残す
  [key: string]: unknown
}

interface SupabaseVenue {
  id: string
  name: string
}

interface CandidateMatch {
  kind: 'exact' | 'normalized' | 'substring' | 'levenshtein' | 'none'
  score: number
  candidate: SupabaseVenue | null
}

type ApprovedAction =
  | { action: 'match'; venueId: string }
  | { action: 'new'; newVenueName: string }
  | { action: 'fix'; venueId: string; newVenueName: string }
  | { action: 'skip' }

type ApprovedMap = Map<string, ApprovedAction>

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): CliArgs {
  let mode: Mode = 'dry-run'
  let correspondenceDir = 'openspec/changes/dynamodb-events-supabase-migration'

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--') continue // pnpm 10 が渡すセパレータを無視
    if (a === '--survey') mode = 'survey'
    else if (a === '--dry-run') mode = 'dry-run'
    else if (a === '--commit') mode = 'commit'
    else if (a === '--set-default-fees') mode = 'set-default-fees'
    else if (a === '--correspondence-dir') {
      correspondenceDir = argv[++i] ?? correspondenceDir
    } else if (a === '--help' || a === '-h') {
      printHelp()
      process.exit(0)
    } else {
      console.error(`unknown argument: ${a}`)
      printHelp()
      process.exit(2)
    }
  }
  return { mode, correspondenceDir }
}

function printHelp(): void {
  console.log(`Usage: tsx scripts/migrate-aws-events-to-supabase.ts [--survey|--dry-run|--commit|--set-default-fees] [--correspondence-dir <path>]

Modes:
  --survey            AWS データ取得 + Supabase venues 取得 → proposed 対照表生成（書き込みなし）
  --dry-run           approved 対照表を読んで投入予定をレポート（書き込みなし）[既定]
  --commit            approved 対照表を読んで Supabase へ INSERT
  --set-default-fees  本 migration 投入済 events に「有明会場以外は fee=1000」を一括設定 (commit 後の post step)

環境変数: SUPABASE_URL, SUPABASE_SECRET_KEY, AWS_EVENTS_ENDPOINT`)
}

// ---------------------------------------------------------------------------
// 環境変数 / クライアント
// ---------------------------------------------------------------------------

function requireEnv(key: string): string {
  const v = process.env[key]
  if (!v) {
    console.error(`env ${key} is required`)
    process.exit(1)
  }
  return v
}

function createSupabase(): SupabaseClient {
  const url = requireEnv('SUPABASE_URL')
  const secretKey = requireEnv('SUPABASE_SECRET_KEY')
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const AWS_DEFAULT_ENDPOINT =
  'https://ptfomh71x9.execute-api.ap-northeast-1.amazonaws.com/beta/event'

// ---------------------------------------------------------------------------
// AWS 取得層
// ---------------------------------------------------------------------------

async function fetchAwsEvents(endpoint: string): Promise<AwsEvent[]> {
  const res = await fetch(endpoint)
  if (!res.ok) {
    throw new Error(`AWS fetch failed: HTTP ${res.status}`)
  }
  const json = (await res.json()) as { body?: string }
  if (typeof json.body !== 'string') {
    throw new Error('AWS response shape mismatch: expected { body: <JSON string> }')
  }
  const parsed = JSON.parse(json.body)
  if (!Array.isArray(parsed)) {
    throw new Error('AWS body did not contain an array')
  }
  return parsed as AwsEvent[]
}

// ---------------------------------------------------------------------------
// 文字列正規化 + 候補スコアリング
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　・]+/g, '') // 全半角空白 + 中黒を除去
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

function scoreCandidate(awsLocation: string, venue: SupabaseVenue): CandidateMatch {
  if (awsLocation === venue.name) {
    return { kind: 'exact', score: 100, candidate: venue }
  }
  const na = normalize(awsLocation)
  const nv = normalize(venue.name)
  if (na === nv) {
    return { kind: 'normalized', score: 90, candidate: venue }
  }
  if (na.length >= 2 && (na.includes(nv) || nv.includes(na))) {
    const longer = Math.max(na.length, nv.length)
    const shorter = Math.min(na.length, nv.length)
    return { kind: 'substring', score: 70 + Math.floor((shorter / longer) * 20), candidate: venue }
  }
  const d = levenshtein(na, nv)
  const maxLen = Math.max(na.length, nv.length, 1)
  if (d <= 2 && d / maxLen <= 0.2) {
    return { kind: 'levenshtein', score: 60 - d * 5, candidate: venue }
  }
  return { kind: 'none', score: 0, candidate: null }
}

function bestCandidate(awsLocation: string, venues: SupabaseVenue[]): CandidateMatch {
  let best: CandidateMatch = { kind: 'none', score: 0, candidate: null }
  for (const v of venues) {
    const c = scoreCandidate(awsLocation, v)
    if (c.score > best.score) best = c
  }
  return best
}

// ---------------------------------------------------------------------------
// 対照表ファイル I/O
// ---------------------------------------------------------------------------

function writeVenueProposed(
  dir: string,
  rows: Array<{ awsLocation: string; match: CandidateMatch }>,
): string {
  const lines: string[] = []
  lines.push('# AWS location → Supabase venue 対照表 (proposed, machine-generated)')
  lines.push('')
  lines.push('> このファイルは `--survey` で機械生成されたものです。')
  lines.push('> 翔太郎くんが各行を確定し `correspondence-venues-approved.md` として保存してください。')
  lines.push('> 判定欄: `match`（既存 venue を再利用）/ `new`（新規 INSERT）/ `fix`（既存 venue 名を修正）')
  lines.push('')
  lines.push('| # | AWS location | 候補種別 | Supabase venue 候補 | venue_id | 機械判定スコア | 判定 |')
  lines.push('|---|---|---|---|---|---|---|')
  rows.forEach((r, i) => {
    const c = r.match
    const cname = c.candidate ? c.candidate.name : '—'
    const cid = c.candidate ? c.candidate.id : '—'
    const suggested = c.kind === 'exact' || c.kind === 'normalized' ? 'match' : c.kind === 'none' ? 'new' : '(要確認)'
    lines.push(
      `| ${i + 1} | \`${r.awsLocation}\` | ${c.kind} | \`${cname}\` | \`${cid}\` | ${c.score} | ${suggested} |`,
    )
  })
  lines.push('')
  const path = resolve(dir, 'correspondence-venues-proposed.md')
  ensureDir(path)
  writeFileSync(path, lines.join('\n'), 'utf8')
  return path
}

function writeEventProposed(
  dir: string,
  awsEvents: AwsEvent[],
): string {
  const lines: string[] = []
  lines.push('# AWS event → Supabase events 行プレビュー (proposed, machine-generated)')
  lines.push('')
  lines.push('> このファイルは `--survey` で機械生成された events 投入予定一覧です。')
  lines.push('> AWS の field 一覧 / タイムゾーン表現 / 件数感を確認してください。')
  lines.push('')
  lines.push(`総件数: ${awsEvents.length}`)
  lines.push('')
  const fieldKeys = new Set<string>()
  awsEvents.forEach((e) => Object.keys(e).forEach((k) => fieldKeys.add(k)))
  lines.push(`AWS フィールドキー一覧: ${Array.from(fieldKeys).map((k) => `\`${k}\``).join(', ')}`)
  lines.push('')
  lines.push('| # | AWS id | name (= AWS title) | start_at (JST 補正後) | end_at (JST 補正後) | location | 機械判定 status |')
  lines.push('|---|---|---|---|---|---|---|')
  const now = new Date()
  awsEvents.forEach((e, i) => {
    const isEmpty = !e.location || e.location === ''
    const startAt = toJstTimestamp(e.start_time)
    const endAt = toJstTimestamp(e.end_time)
    const end = new Date(endAt)
    const status = isEmpty
      ? '(skip - empty location)'
      : end.getTime() < now.getTime()
        ? 'closed'
        : 'scheduled'
    lines.push(
      `| ${i + 1} | \`${e.id}\` | ${e.title} | ${startAt} | ${endAt} | \`${e.location}\` | ${status} |`,
    )
  })
  lines.push('')
  const path = resolve(dir, 'correspondence-events-proposed.md')
  ensureDir(path)
  writeFileSync(path, lines.join('\n'), 'utf8')
  return path
}

function ensureDir(filePath: string): void {
  const d = dirname(filePath)
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

function readApprovedVenues(dir: string): ApprovedMap {
  const path = resolve(dir, 'correspondence-venues-approved.md')
  if (!existsSync(path)) {
    throw new Error(`approved 対照表が存在しません: ${path}\n--survey を先に実行し、翔太郎くんに承認してもらってください。`)
  }
  const text = readFileSync(path, 'utf8')
  const map: ApprovedMap = new Map()
  // table 行: | # | `AWS location` | 候補種別 | `venue name` | `venue_id` | score | 判定 |
  const rowRe = /^\|\s*\d+\s*\|\s*`([^`]*)`\s*\|[^|]*\|\s*`([^`]*)`\s*\|\s*`([^`]*)`\s*\|[^|]*\|\s*(match|new|fix|skip)\s*\|/gm
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(text)) !== null) {
    const [, awsLocation, candidateName, candidateId, action] = m
    if (action === 'match') {
      if (!candidateId || candidateId === '—') {
        throw new Error(`approved 行に venue_id がない: "${awsLocation}"`)
      }
      map.set(awsLocation, { action: 'match', venueId: candidateId })
    } else if (action === 'new') {
      // new の場合、candidateName が新規 venue 名（既定で AWS location をそのまま使う、人手で別名にも変更可）。
      // 複数の AWS location が同じ newVenueName を指していた場合、runMigration が name でグルーピング
      // して 1 つの venue に統合 INSERT する。
      const newName = candidateName && candidateName !== '—' ? candidateName : awsLocation
      map.set(awsLocation, { action: 'new', newVenueName: newName })
    } else if (action === 'fix') {
      if (!candidateId || candidateId === '—') {
        throw new Error(`approved fix 行に venue_id がない: "${awsLocation}"`)
      }
      const newName = candidateName && candidateName !== '—' ? candidateName : awsLocation
      map.set(awsLocation, { action: 'fix', venueId: candidateId, newVenueName: newName })
    } else if (action === 'skip') {
      // skip: 当該 location を持つ AWS イベントを移行対象から除外する
      map.set(awsLocation, { action: 'skip' })
    }
  }
  if (map.size === 0) {
    throw new Error(`approved ファイルからレコードを 1 件も読み取れませんでした: ${path}\nテーブル形式と判定欄を確認してください。`)
  }
  return map
}

// ---------------------------------------------------------------------------
// Supabase 取得 / INSERT
// ---------------------------------------------------------------------------

async function fetchSupabaseVenues(supabase: SupabaseClient): Promise<SupabaseVenue[]> {
  const { data, error } = await supabase.from('venues').select('id, name')
  if (error) throw new Error(`venues 取得失敗: ${error.message}`)
  return (data ?? []) as SupabaseVenue[]
}

async function existsByLegacyId(
  supabase: SupabaseClient,
  awsId: string,
  awsStartTime: string,
): Promise<boolean> {
  // 同一 AWS id を共有する複数イベントを区別するため、id + start_time の複合キーで判定。
  const marker = `[Legacy ID: ${awsId}@${awsStartTime}]`
  const { data, error } = await supabase
    .from('events')
    .select('id')
    .ilike('description', `%${marker}%`)
    .limit(1)
  if (error) throw new Error(`events 検索失敗: ${error.message}`)
  return (data ?? []).length > 0
}

/**
 * venues に対する冪等な「name で同定 or INSERT」操作。
 * - 既に同名 venue が存在する → 既存 id を返す (created=false)
 * - 存在しない → INSERT して新 id を返す (created=true)
 *
 * これにより --commit が venue INSERT 途中で失敗・再実行されるケースや、
 * approved を作った後で admin から手動 venue 追加されたケースに耐える。
 */
async function ensureVenueByName(
  supabase: SupabaseClient,
  name: string,
): Promise<{ id: string; created: boolean }> {
  const { data: existing, error: selectError } = await supabase
    .from('venues')
    .select('id')
    .eq('name', name)
    .maybeSingle()
  if (selectError) {
    throw new Error(`venues 検索失敗 (name=${name}): ${selectError.message}`)
  }
  if (existing) {
    return { id: existing.id as string, created: false }
  }
  const { data, error } = await supabase
    .from('venues')
    .insert({ name, is_primary: false })
    .select('id')
    .single()
  if (error) {
    throw new Error(`venues INSERT 失敗 (name=${name}): ${error.message}`)
  }
  return { id: data!.id as string, created: true }
}

async function updateVenueName(
  supabase: SupabaseClient,
  venueId: string,
  newName: string,
): Promise<void> {
  const { error } = await supabase.from('venues').update({ name: newName }).eq('id', venueId)
  if (error) throw new Error(`venues UPDATE 失敗 (id=${venueId}): ${error.message}`)
}

async function insertEvent(
  supabase: SupabaseClient,
  row: {
    name: string
    start_at: string
    end_at: string
    venue_id: string
    description: string
    visibility: 'published'
    status: 'scheduled' | 'closed'
  },
): Promise<void> {
  const { error } = await supabase.from('events').insert(row)
  if (error) throw new Error(`events INSERT 失敗 (name=${row.name}): ${error.message}`)
}

// ---------------------------------------------------------------------------
// マッピング
// ---------------------------------------------------------------------------

function toJstTimestamp(raw: string): string {
  // AWS DynamoDB の start_time / end_time は TZ designator を持たない（例: 2025-10-11T18:00:00）。
  // High Q の運用上 JST 表記なので、+09:00 を補って Supabase timestamptz に正しく保存する。
  // 既に Z や ±HH:MM が付いていればそのまま使う。
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)) return raw
  return `${raw}+09:00`
}

function buildEventRow(
  e: AwsEvent,
  venueId: string,
): {
  name: string
  start_at: string
  end_at: string
  venue_id: string
  description: string
  visibility: 'published'
  status: 'scheduled' | 'closed'
} {
  const startAt = toJstTimestamp(e.start_time)
  const endAt = toJstTimestamp(e.end_time)
  const now = new Date()
  const end = new Date(endAt)
  const status: 'scheduled' | 'closed' = end.getTime() < now.getTime() ? 'closed' : 'scheduled'
  return {
    name: e.title,
    start_at: startAt,
    end_at: endAt,
    venue_id: venueId,
    // 冪等性判定用: id 単独だと AWS 側で id 衝突がある（36 件が同一 id を共有）ため
    // id + start_time の複合キーをマーカーに埋め込む。
    description: `[Legacy ID: ${e.id}@${e.start_time}]`,
    visibility: 'published',
    status,
  }
}

// ---------------------------------------------------------------------------
// メインフロー
// ---------------------------------------------------------------------------

async function runSurvey(args: CliArgs): Promise<void> {
  const supabase = createSupabase()
  const awsEndpoint = process.env.AWS_EVENTS_ENDPOINT || AWS_DEFAULT_ENDPOINT
  console.log(`[survey] AWS から取得: ${awsEndpoint}`)
  const awsEvents = await fetchAwsEvents(awsEndpoint)
  console.log(`[survey] AWS イベント件数: ${awsEvents.length}`)

  const venues = await fetchSupabaseVenues(supabase)
  console.log(`[survey] Supabase 現行 venues 件数: ${venues.length}`)

  const uniqLocations = Array.from(new Set(awsEvents.map((e) => e.location ?? ''))).filter((l) => l !== '')
  console.log(`[survey] ユニーク location 件数: ${uniqLocations.length}`)

  const rows = uniqLocations.map((loc) => ({ awsLocation: loc, match: bestCandidate(loc, venues) }))
  const venuesPath = writeVenueProposed(args.correspondenceDir, rows)
  const eventsPath = writeEventProposed(args.correspondenceDir, awsEvents)
  console.log(`[survey] 出力: ${venuesPath}`)
  console.log(`[survey] 出力: ${eventsPath}`)
  console.log('[survey] 次のステップ: proposed をレビュー → approved として保存・commit してから --dry-run へ')
}

async function runMigration(args: CliArgs, commit: boolean): Promise<void> {
  const supabase = createSupabase()
  const awsEndpoint = process.env.AWS_EVENTS_ENDPOINT || AWS_DEFAULT_ENDPOINT
  console.log(`[${commit ? 'commit' : 'dry-run'}] AWS から取得: ${awsEndpoint}`)
  const awsEvents = await fetchAwsEvents(awsEndpoint)
  console.log(`[${commit ? 'commit' : 'dry-run'}] AWS イベント件数: ${awsEvents.length}`)

  const approved = readApprovedVenues(args.correspondenceDir)
  console.log(`[${commit ? 'commit' : 'dry-run'}] approved エントリ件数: ${approved.size}`)

  // approved の整合性検証
  const awsLocations = new Set(awsEvents.map((e) => e.location ?? '').filter((l) => l !== ''))
  for (const loc of awsLocations) {
    if (!approved.has(loc)) {
      throw new Error(`AWS に存在する location が approved にない: "${loc}". 再 --survey が必要です。`)
    }
  }
  for (const loc of approved.keys()) {
    if (!awsLocations.has(loc)) {
      console.warn(`[warn] approved にあるが AWS で出現しない location: "${loc}"（無害だが survey 後に AWS が変化した可能性）`)
    }
  }

  // Step A: new venue を name でグルーピングして 1 回ずつ INSERT
  //   複数の AWS location が同じ newVenueName を指すケース（例: 「有明テニスの森」と
  //   「有明テニスの森駅周辺」を共に「有明会場」に統合）を 1 つの venue として扱う。
  const newVenueNames = new Set<string>()
  for (const action of approved.values()) {
    if (action.action === 'new') newVenueNames.add(action.newVenueName)
  }
  const newVenueIdByName = new Map<string, string>()
  for (const name of newVenueNames) {
    if (commit) {
      const { id, created } = await ensureVenueByName(supabase, name)
      newVenueIdByName.set(name, id)
      console.log(`[venue] ${created ? 'NEW   ' : 'REUSE '} name="${name}" → ${id}`)
    } else {
      newVenueIdByName.set(name, '(dry-run pending)')
      console.log(`[venue] (dry-run) NEW name="${name}"`)
    }
  }

  // Step B: AWS location ごとに venue_id を解決し、skip / match / new / fix を確定
  const venueIdMap = new Map<string, string>()
  const skippedLocations = new Set<string>()
  for (const [loc, action] of approved.entries()) {
    if (action.action === 'match') {
      venueIdMap.set(loc, action.venueId)
      console.log(`[venue] MATCH  "${loc}" → ${action.venueId}`)
    } else if (action.action === 'new') {
      const id = newVenueIdByName.get(action.newVenueName)!
      venueIdMap.set(loc, id)
      console.log(`[venue] NEW→   "${loc}" → ${id} (name="${action.newVenueName}")`)
    } else if (action.action === 'fix') {
      if (commit) {
        await updateVenueName(supabase, action.venueId, action.newVenueName)
        console.log(`[venue] FIX    "${loc}" venue ${action.venueId} renamed to "${action.newVenueName}"`)
      } else {
        console.log(`[venue] (dry-run) FIX venue ${action.venueId} → "${action.newVenueName}"`)
      }
      venueIdMap.set(loc, action.venueId)
    } else {
      // skip
      skippedLocations.add(loc)
      console.log(`[venue] SKIP   "${loc}" (approved 指定により移行対象外)`)
    }
  }

  // events 投入
  let inserted = 0
  let skippedExisting = 0
  let skippedEmptyLocation = 0
  let skippedByApproved = 0
  for (const e of awsEvents) {
    if (!e.location || e.location === '') {
      console.log(`[event] SKIP (empty location) ${e.id} "${e.title}" ${e.start_time}`)
      skippedEmptyLocation++
      continue
    }
    if (skippedLocations.has(e.location)) {
      console.log(`[event] SKIP (approved skip) ${e.id}@${e.start_time} "${e.title}" location="${e.location}"`)
      skippedByApproved++
      continue
    }
    const venueId = venueIdMap.get(e.location)
    if (!venueId) {
      throw new Error(`venue 解決失敗: "${e.location}" (event id=${e.id})`)
    }
    const exists = await existsByLegacyId(supabase, e.id, e.start_time)
    if (exists) {
      console.log(`[event] SKIP (Legacy ID 既存) ${e.id}@${e.start_time} "${e.title}"`)
      skippedExisting++
      continue
    }
    if (commit) {
      const row = buildEventRow(e, venueId)
      await insertEvent(supabase, row)
      console.log(`[event] INSERT ${e.id}@${e.start_time} "${e.title}" venue=${venueId} status=${row.status}`)
    } else {
      const row = buildEventRow(e, venueId === '(dry-run pending)' ? '<new venue>' : venueId)
      console.log(`[event] (dry-run) INSERT ${e.id}@${e.start_time} "${e.title}" venue=${row.venue_id} status=${row.status}`)
    }
    inserted++
  }

  console.log('')
  console.log('--- サマリー ---')
  console.log(`AWS 取得件数: ${awsEvents.length}`)
  console.log(`INSERT ${commit ? '実行' : '予定'}: ${inserted}`)
  console.log(`SKIP（Legacy ID 既存）: ${skippedExisting}`)
  console.log(`SKIP（空 location）: ${skippedEmptyLocation}`)
  console.log(`SKIP（approved skip）: ${skippedByApproved}`)
  console.log(`venue NEW (ユニーク件数) ${commit ? '実行' : '予定'}: ${newVenueNames.size}`)
  console.log(`venue FIX ${commit ? '実行' : '予定'}: ${Array.from(approved.values()).filter((a) => a.action === 'fix').length}`)
}

/**
 * 本 migration 投入済 events のうち、`venues.name = '有明会場'` 以外に fee=1000 を一括設定。
 * AWS API は fee を公開しないため、--commit 後の post step として実行する。
 * Idempotent: 何度実行しても結果は変わらない。
 */
async function runSetDefaultFees(): Promise<void> {
  const supabase = createSupabase()
  const { data: ariake, error: aErr } = await supabase
    .from('venues')
    .select('id')
    .eq('name', '有明会場')
    .maybeSingle()
  if (aErr) {
    throw new Error(`venues 検索失敗 (name=有明会場): ${aErr.message}`)
  }
  if (!ariake) {
    throw new Error('venue "有明会場" が存在しません。--commit を先に実行してください。')
  }
  console.log(`[set-default-fees] 有明会場 venue_id = ${ariake.id}`)

  const { data: updated, error: uErr } = await supabase
    .from('events')
    .update({ fee: 1000 })
    .ilike('description', '%[Legacy ID:%')
    .neq('venue_id', ariake.id)
    .select('id')
  if (uErr) {
    throw new Error(`events UPDATE 失敗: ${uErr.message}`)
  }
  console.log(`[set-default-fees] fee=1000 を ${updated?.length ?? 0} 件の events に設定完了`)

  // 確認用サマリー
  const { data: summary, error: sErr } = await supabase
    .from('events')
    .select('venue_id, fee')
    .ilike('description', '%[Legacy ID:%')
  if (sErr) {
    throw new Error(`events 検索失敗: ${sErr.message}`)
  }
  const byFee = new Map<string, number>()
  for (const row of summary ?? []) {
    const key = row.fee === null ? 'NULL' : String(row.fee)
    byFee.set(key, (byFee.get(key) ?? 0) + 1)
  }
  console.log('')
  console.log('--- 投入済 events の fee 分布 ---')
  for (const [fee, count] of byFee.entries()) {
    console.log(`  fee=${fee}: ${count} 件`)
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (args.mode === 'survey') {
    await runSurvey(args)
  } else if (args.mode === 'dry-run') {
    await runMigration(args, false)
  } else if (args.mode === 'commit') {
    await runMigration(args, true)
  } else {
    await runSetDefaultFees()
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
