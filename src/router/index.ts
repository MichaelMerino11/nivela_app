import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import ResetPasswordView from '@/views/ResetPasswordView.vue'
import OnboardingView from '@/views/OnboardingView.vue'
import MovementsView from '@/views/MovementsView.vue'
import PlanningView from '@/views/PlanningView.vue'
import BudgetsView from '@/views/BudgetsView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,

      meta: {
        guestOnly: true,
      },
    },

    {
      path: '/reset-password',
      name: 'reset-password',
      component: ResetPasswordView,
    },

    {
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingView,

      meta: {
        requiresAuth: true,
      },
    },

    {
      path: '/',
      component: AppLayout,

      meta: {
        requiresAuth: true,
      },

      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
        },

        {
          path: 'planificacion',
          name: 'planning',
          component: PlanningView,
        },

        {
          path: 'movimientos',
          name: 'movements',
          component: MovementsView,
        },

        {
          path: 'presupuestos',
          name: 'budgets',
          component: BudgetsView,
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'login',
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return authStore.onboardingCompleted
      ? {
          name: 'dashboard',
        }
      : {
          name: 'onboarding',
        }
  }

  if (
    authStore.isAuthenticated &&
    !authStore.onboardingCompleted &&
    to.name !== 'onboarding' &&
    to.name !== 'reset-password'
  ) {
    return {
      name: 'onboarding',
    }
  }

  if (authStore.isAuthenticated && authStore.onboardingCompleted && to.name === 'onboarding') {
    return {
      name: 'dashboard',
    }
  }

  return true
})

export default router
