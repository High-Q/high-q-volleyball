import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn-vue 規約の class 結合ユーティリティ。
 * `clsx` で条件付きクラスをまとめ、`tailwind-merge` で衝突する Tailwind
 * utility を後勝ちで解決する。プリミティブの `class` prop と内部 default
 * を合成する用途で利用する。
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
