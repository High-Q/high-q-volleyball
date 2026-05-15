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

const SKELETON_ROWS = 5;
const COLUMNS = ["名前", "メール", "経験", "初回参加", "累計", "最終参加", "メモ"];
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead v-for="col in COLUMNS" :key="col">{{ col }}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-for="i in SKELETON_ROWS" :key="i" data-testid="skeleton-row">
        <TableCell><Skeleton class="h-3 w-32" /></TableCell>
        <TableCell><Skeleton class="h-3 w-40" /></TableCell>
        <TableCell><Skeleton class="h-5 w-16 rounded-hq-pill" /></TableCell>
        <TableCell><Skeleton class="h-3 w-20" /></TableCell>
        <TableCell><Skeleton class="h-3 w-12" /></TableCell>
        <TableCell><Skeleton class="h-3 w-20" /></TableCell>
        <TableCell><Skeleton class="h-3 w-40" /></TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
