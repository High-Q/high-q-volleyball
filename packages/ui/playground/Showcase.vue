<script setup lang="ts">
import { Button, Kicker, Badge, Photo, RemainBar } from "@high-q/ui";
</script>

<template>
  <main class="showcase">
    <Kicker>showcase</Kicker>
    <h1>High Q UI primitives</h1>
    <p class="showcase__lede">
      MVP1 範囲のプリミティブを HQ design tokens でレンダリングしています。
    </p>

    <h2>Button — variant</h2>
    <div class="row">
      <span class="label">primary (ink)</span>
      <Button variant="primary">予約する</Button>
      <Button variant="primary" size="sm">予約する</Button>
    </div>
    <div class="row">
      <span class="label">outline</span>
      <Button variant="outline">詳細を見る</Button>
      <Button variant="outline" size="sm">詳細を見る</Button>
    </div>
    <div class="row">
      <span class="label">ghost</span>
      <Button variant="ghost">キャンセル</Button>
      <Button variant="ghost" size="sm">キャンセル</Button>
    </div>
    <div class="row">
      <span class="label">danger</span>
      <Button variant="danger">退会する</Button>
      <Button variant="danger" size="sm">削除</Button>
    </div>

    <h2>Button — state</h2>
    <div class="row">
      <span class="label">disabled</span>
      <Button disabled>送信</Button>
      <Button variant="outline" disabled>送信</Button>
    </div>
    <div class="row">
      <span class="label">loading</span>
      <Button loading>送信中</Button>
      <Button variant="danger" loading>削除中</Button>
    </div>

    <h2>Kicker</h2>
    <div class="row">
      <Kicker>— event</Kicker>
      <Kicker color="ink">— ink</Kicker>
      <Kicker color="muted">— muted</Kicker>
    </div>

    <h2>Badge — tone</h2>
    <div class="row">
      <Badge>neutral</Badge>
      <Badge tone="accent">accent</Badge>
      <Badge tone="success">承認済</Badge>
      <Badge tone="warn">警告</Badge>
      <Badge tone="danger">却下</Badge>
      <Badge tone="draft">下書き</Badge>
    </div>

    <h2>Photo</h2>
    <div class="grid-2">
      <Photo :h="180" label="HALL_001" />
      <Photo :h="180" :radius="12" label="ROUND" />
    </div>

    <h2>RemainBar</h2>
    <div style="display: flex; flex-direction: column; gap: 24px; max-width: 320px;">
      <RemainBar :capacity="20" :taken="5" />
      <RemainBar :capacity="20" :taken="18" />
      <RemainBar :capacity="20" :taken="20" />
    </div>
  </main>
</template>
