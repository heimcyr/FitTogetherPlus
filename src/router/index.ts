import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { supabase } from '@/services/supabase';
import TabsPage from '../views/TabsPage.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/feed'
  },
  {
    path: '/login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { public: true }
  },
  {
    path: '/inscription',
    component: () => import('@/views/InscriptionPage.vue'),
    meta: { public: true }
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
  },
  {
    path: '/modifier-profil',
    component: () => import('@/views/ModifierProfilPage.vue')
  },
  {
    path: '/utilisateur/:id',
    component: () => import('@/views/ProfilUtilisateurPage.vue')
  },
  {
    path: '/publication/:id',
    component: () => import('@/views/PublicationDetailPage.vue')
  },
  {
    path: '/amis',
    component: () => import('@/views/AmisPage.vue')
  },
  {
    path: '/demandes-amis',
    component: () => import('@/views/DemandesAmisPage.vue')
  },
  {
    path: '/enregistrer-entrainement',
    component: () => import('@/views/EnregistrerEntrainementPage.vue')
  },
  {
    path: '/historique-entrainements',
    component: () => import('@/views/HistoriqueEntrainementsPage.vue')
  },
  {
    path: '/historique-pas',
    component: () => import('@/views/HistoriquePasPage.vue')
  },
  {
    path: '/defis',
    component: () => import('@/views/DefisPage.vue')
  },
  {
    path: '/creer-defi',
    component: () => import('@/views/CreerDefiPage.vue')
  },
  {
    path: '/defi/:id',
    component: () => import('@/views/DetailDefiPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to, _from, next) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (to.meta.public) {
    // Pages publiques : rediriger vers le feed si déjà connecté
    if (session) {
      next('/tabs/feed');
    } else {
      next();
    }
  } else {
    // Pages protégées : rediriger vers login si pas connecté
    if (session) {
      next();
    } else {
      next('/login');
    }
  }
});

export default router
