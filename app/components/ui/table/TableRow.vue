<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <tr
    data-slot="table-row"
    :class="cn('border-b border-default transition-colors hover:bg-elevated data-[state=selected]:bg-elevated has-aria-expanded:bg-elevated', props.class)"
  >
    <slot />
  </tr>
</template>
