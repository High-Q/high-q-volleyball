<script setup lang="ts">
import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";

/**
 * Events 一覧の Loading 状態。Skeleton bar を 6 行 × 8 列で描画する。
 *
 * 関連: openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 */

const SKELETON_ROWS = 6;
const COLUMNS = [
  "日付",
  "タイトル",
  "会場",
  "時間",
  "定員",
  "予約",
  "ステータス",
  "操作",
];
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead v-for="col in COLUMNS" :key="col">{{ col }}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow
        v-for="i in SKELETON_ROWS"
        :key="i"
        data-testid="skeleton-row"
      >
        <TableCell><Skeleton class="h-3 w-20" /></TableCell>
        <TableCell><Skeleton class="h-3 w-40" /></TableCell>
        <TableCell><Skeleton class="h-3 w-32" /></TableCell>
        <TableCell><Skeleton class="h-3 w-16" /></TableCell>
        <TableCell><Skeleton class="h-3 w-10" /></TableCell>
        <TableCell><Skeleton class="h-3 w-24" /></TableCell>
        <TableCell><Skeleton class="h-5 w-16 rounded-hq-pill" /></TableCell>
        <TableCell><Skeleton class="h-3 w-12" /></TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
