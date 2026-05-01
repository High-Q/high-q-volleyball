import { ref, type Ref, onMounted } from "vue";
import { getSupabase } from "@/shared/api/supabase";

/**
 * Create 画面の onMounted で events から「ゆる練 vol.NN」の最大番号を抽出し、
 * `vol.<NN+1>` をタイトルのプレースホルダ提案として返す best-effort 補完。
 *
 * 失敗時は undefined（フォーム全体の Error にはしない）。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (D6)
 */

// 語尾固定で「ゆる練 vol.42 修正版」のような誤マッチを避ける
const VOLUME_RE = /vol\.(\d+)$/;

/** 単発で次の vol 番号付きタイトルを返す純関数（テスト容易性のため）。 */
export async function suggestNextVolume(): Promise<string | undefined> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("name")
      .ilike("name", "ゆる練 vol.%")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !Array.isArray(data)) return undefined;
    let max = 0;
    for (const row of data as { name: string }[]) {
      const m = VOLUME_RE.exec(row.name);
      if (m && m[1] != null) {
        const n = Number.parseInt(m[1], 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    if (max === 0) return undefined;
    return `ゆる練 vol.${max + 1}`;
  } catch {
    return undefined;
  }
}

export interface UseVolumeSuggest {
  suggestion: Ref<string | undefined>;
}

export function useVolumeSuggest(): UseVolumeSuggest {
  const suggestion = ref<string | undefined>(undefined);
  onMounted(async () => {
    suggestion.value = await suggestNextVolume();
  });
  return { suggestion };
}
