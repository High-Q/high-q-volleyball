import type { DashboardStatsRow } from "@/entities/dashboard";
import type { DeltaTone } from "@/shared/ui/statCard.types";

/**
 * `admin_dashboard_view` の 1 行を、StatCard 4 枚分の view model に変換する (#149)。
 *
 * - delta: 小数 (0.20 = 20%) → 「+20%」「-3%」のような文字列に整形
 *          NULL は「— %」 (中立 / 0 除算回避用)
 * - 通貨 (fee_total_this_month): 3 桁区切り + ¥ prefix
 * - パーセント (avg_fill_rate_6m): 0〜100 に整数化、NULL は「—」
 *
 * 関連:
 *   openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 */

export interface StatCardVm {
  kicker: string;
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaTone: DeltaTone;
  sub?: string;
  accent?: boolean;
}

export function formatDelta(
  ratio: number | null,
): { delta: string; tone: DeltaTone } {
  if (ratio === null) return { delta: "— %", tone: "flat" };
  const pct = Math.round(ratio * 100);
  if (pct > 0) return { delta: `+${pct}%`, tone: "up" };
  if (pct < 0) return { delta: `${pct}%`, tone: "down" };
  return { delta: "0%", tone: "flat" };
}

export function formatCurrencyYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function formatPercent(ratio: number | null): string {
  if (ratio === null) return "—";
  return String(Math.round(ratio * 100));
}

export function toStatCardVms(stats: DashboardStatsRow): StatCardVm[] {
  const attendedDelta = formatDelta(stats.attended_delta_pct_vs_last_month);
  const feeDelta = formatDelta(stats.fee_delta_pct_vs_last_month);
  const fillRatePct = formatPercent(stats.avg_fill_rate_6m);

  return [
    {
      kicker: "01",
      label: "今後のイベント",
      value: stats.upcoming_event_count,
      unit: "件",
      deltaTone: "flat",
      sub:
        stats.upcoming_full_event_count > 0
          ? `${stats.upcoming_full_event_count} 件は満員`
          : undefined,
      accent: true,
    },
    {
      kicker: "02",
      label: "累計参加者 (今月)",
      value: stats.attended_this_month_count,
      unit: "名",
      delta: attendedDelta.delta,
      deltaTone: attendedDelta.tone,
      sub: "今月",
    },
    {
      kicker: "03",
      label: "今月の参加費合計",
      value: formatCurrencyYen(stats.fee_total_this_month),
      delta: feeDelta.delta,
      deltaTone: feeDelta.tone,
      sub: "vs 先月",
    },
    {
      kicker: "04",
      label: "平均充足率",
      value: fillRatePct,
      unit: fillRatePct === "—" ? undefined : "%",
      deltaTone: "flat",
      sub: "6 ヶ月",
    },
  ];
}
