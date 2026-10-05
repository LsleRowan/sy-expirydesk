<script setup lang="ts">
import { STATUS_META, type Status } from '../../shared/status'

defineProps<{ status: Status }>()

const meta = STATUS_META
</script>

<template>
  <span class="badge" :class="meta[status].className">{{ meta[status].label }}</span>
</template>
