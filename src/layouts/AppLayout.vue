<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import Topbar from '../components/Topbar.vue'

const menuOpen = ref(false)
</script>

<template>
  <div class="min-h-screen">
    <Sidebar :open="menuOpen" @close="menuOpen = false" />

    <div class="flex min-h-screen flex-col md:pl-60">
      <Topbar @menu="menuOpen = true" />
      <main class="flex-1 px-4 pb-10 md:px-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
