<template>
  <section class="gallery" aria-labelledby="gallery-heading">
    <header class="gallery__head">
      <Kicker color="muted">— Gallery &amp; Social</Kicker>
      <h2 id="gallery-heading" class="gallery__heading">ある日の、High Q。</h2>
      <p class="gallery__lead">Follow along.</p>
    </header>

    <div class="gallery__grid">
      <Photo label="snap 01" :h="180" />
      <Photo label="snap 02" :h="140" />
      <Photo label="snap 03" :h="140" />
      <Photo label="snap 04" :h="180" />
    </div>

    <div class="gallery__sns">
      <a :href="X_URL" target="_blank" rel="noopener noreferrer" class="gallery__sns-btn">
        <span>X {{ X_HANDLE }}</span>
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  </section>
</template>

<script setup>
import { Kicker, Photo } from '@high-q/ui'
import { X_URL, X_HANDLE } from '@shared/config/sns'
</script>

<style scoped>
.gallery {
  background: var(--hq-color-paper-warm);
  padding: 72px 0 48px;
}

.gallery__head {
  padding: 0 28px 28px;
  padding-inline: max(28px, calc((100% - 880px) / 2));
}

.gallery__heading {
  font-family: var(--hq-font-jp-display);
  font-size: 24px;
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-ink);
  margin: 12px 0 6px;
}

.gallery__lead {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--hq-color-muted);
  text-transform: uppercase;
  margin: 0;
}

.gallery__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 0 6px;
  padding-inline: max(6px, calc((100% - 880px) / 2));
}

.gallery__sns {
  padding: 24px 28px 0;
  padding-inline: max(28px, calc((100% - 720px) / 2));
  display: grid;
  gap: 10px;
}

.gallery__sns-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--hq-color-paper);
  border: 1px solid var(--hq-color-hairline);
  border-radius: var(--hq-radius-pill);
  font-family: var(--hq-font-jp);
  font-size: 14px;
  font-weight: 500;
  color: var(--hq-color-ink);
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: border-color 150ms ease;
}

.gallery__sns-btn:hover {
  border-color: rgba(31, 29, 26, 0.24);
}

.gallery__sns-btn:focus-visible {
  outline: 2px solid var(--hq-color-ink);
  outline-offset: 2px;
}
</style>
