import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from './layouts/AppLayout.vue'
import { fetchAuthStatus } from './composables/useAuth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('./pages/Login.vue'),
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'home', component: () => import('./pages/Dashboard.vue') },
        { path: 'services', name: 'services', component: () => import('./pages/Services.vue') },
        { path: 'settings', name: 'settings', component: () => import('./pages/Settings.vue') },
        { path: ':pathMatch(.*)*', redirect: '/' },
      ],
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  if (to.path === '/login') return true
  const { authenticated } = await fetchAuthStatus()
  if (authenticated) return true
  return '/login'
})

export default router
