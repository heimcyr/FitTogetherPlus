import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import TabsPage from '../views/TabsPage.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/feed'
  },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      {
        path: '',
        redirect: '/tabs/feed'
      },
      {
        path: 'feed',
        component: () => import('@/views/FeedPage.vue')
      },
      {
        path: 'recherche',
        component: () => import('@/views/RecherchePage.vue')
      },
      {
        path: 'messages',
        component: () => import('@/views/MessagesPage.vue')
      },
      {
        path: 'espace',
        component: () => import('@/views/MonEspacePage.vue')
      }
    ]
  },
  {
    path: '/notifications',
    component: () => import('@/views/NotificationsPage.vue')
  },
  {
    path: '/profil',
    component: () => import('@/views/ProfilPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
