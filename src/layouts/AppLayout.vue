<script setup lang="ts">
import { ref } from 'vue'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import RegisterExpenseDialog from '@/components/expenses/RegisterExpenseDialog.vue'
import { useFinanceStore } from '@/stores/finance'

import {
  LayoutDashboard,
  CalendarDays,
  ArrowLeftRight,
  WalletCards,
  PiggyBank,
  BarChart3,
  Settings,
  Plus,
  Bell,
} from 'lucide-vue-next'

const { mdAndUp } = useDisplay()
const authStore = useAuthStore()
const drawer = ref(true)

const menuItems = [
  {
    title: 'Inicio',
    icon: LayoutDashboard,
    to: '/',
  },
  {
    title: 'Planificación',
    icon: CalendarDays,
    to: '/planificacion',
  },
  {
    title: 'Movimientos',
    icon: ArrowLeftRight,
    to: '/movimientos',
  },
  {
    title: 'Presupuestos',
    icon: WalletCards,
    to: '/presupuestos',
  },
  {
    title: 'Ahorro',
    icon: PiggyBank,
    to: '/ahorro',
  },
  {
    title: 'Estadísticas',
    icon: BarChart3,
    to: '/estadisticas',
  },
]

const mobileItems = menuItems.filter((item) =>
  ['Inicio', 'Planificación', 'Movimientos', 'Ahorro'].includes(item.title),
)

const financeStore = useFinanceStore()

const expenseDialogOpen = ref(false)

const expenseSaved = ref(false)

function handleExpenseSaved() {
  financeStore.notifyFinancialChange()

  expenseSaved.value = true
}
</script>

<template>
  <div class="app-layout">
    <!-- SIDEBAR DESKTOP -->
    <v-navigation-drawer v-if="mdAndUp" v-model="drawer" permanent width="270" class="sidebar">
      <div class="brand">
        <div class="brand__logo">
          <span>N</span>
        </div>

        <div>
          <div class="brand__name">Nivela</div>
          <div class="brand__tagline">Finanzas personales</div>
        </div>
      </div>

      <div class="sidebar-section-title">MENÚ</div>

      <nav class="sidebar-menu">
        <RouterLink v-for="item in menuItems" :key="item.title" :to="item.to" class="sidebar-item">
          <component :is="item.icon" :size="20" :stroke-width="1.8" />

          <span>
            {{ item.title }}
          </span>
        </RouterLink>
      </nav>

      <div class="sidebar-spacer" />

      <RouterLink to="/configuracion" class="sidebar-item">
        <Settings :size="20" :stroke-width="1.8" />

        <span>Configuración</span>
      </RouterLink>

      <div class="profile-card">
        <div class="profile-avatar">MM</div>

        <div class="profile-info">
          <strong>{{ authStore.displayName }}</strong>
          <span>Cuenta personal</span>
        </div>
      </div>
    </v-navigation-drawer>

    <!-- CONTENIDO -->
    <v-main class="main-content">
      <header class="topbar">
        <div>
          <div class="mobile-brand">
            <div class="brand__logo brand__logo--small">N</div>

            <strong>Nivela</strong>
          </div>
        </div>

        <div class="topbar-actions">
          <button class="icon-button">
            <Bell :size="20" />
          </button>

          <v-btn color="primary" @click="expenseDialogOpen = true"> Registrar gasto </v-btn>
        </div>
      </header>

      <router-view />
    </v-main>

    <!-- NAVEGACIÓN MÓVIL -->
    <nav v-if="!mdAndUp" class="mobile-navigation">
      <RouterLink
        v-for="item in mobileItems"
        :key="item.title"
        :to="item.to"
        class="mobile-navigation__item"
      >
        <component :is="item.icon" :size="21" :stroke-width="1.8" />

        <span>{{ item.title }}</span>
      </RouterLink>

      <RouterLink to="/configuracion" class="mobile-navigation__item">
        <Settings :size="21" :stroke-width="1.8" />

        <span>Ajustes</span>
      </RouterLink>
    </nav>
  </div>
  <RegisterExpenseDialog v-model="expenseDialogOpen" @saved="handleExpenseSaved" />

  <v-snackbar v-model="expenseSaved" color="success" :timeout="2800" location="bottom right">
    Gasto registrado. Tu planificación fue actualizada.
  </v-snackbar>
</template>

<style scoped lang="scss">
.app-layout {
  min-height: 100vh;
  background: #f7f9fc;
}

.sidebar {
  border-right: 1px solid #e8edf4 !important;
  background: #ffffff !important;
  padding: 20px 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px 30px;
}

.brand__logo {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  flex-shrink: 0;
  border-radius: 14px;

  background: linear-gradient(135deg, #3b82f6, #6366f1);

  color: white;
  font-size: 20px;
  font-weight: 800;

  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.22);
}

.brand__logo--small {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  font-size: 16px;
}

.brand__name {
  color: #0f172a;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.4px;
}

.brand__tagline {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 11px;
}

.sidebar-section-title {
  margin: 4px 12px 10px;
  color: #a1aab9;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.3px;
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-item {
  display: flex;
  min-height: 46px;
  align-items: center;
  gap: 13px;

  padding: 0 14px;

  border-radius: 13px;

  color: #64748b;

  font-size: 13px;
  font-weight: 600;

  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.sidebar-item:hover {
  background: #f6f9fd;
  color: #2563eb;
}

.sidebar-item.router-link-exact-active {
  background: #edf5ff;
  color: #2563eb;
}

.sidebar-spacer {
  height: calc(100vh - 570px);
  min-height: 30px;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 11px;

  margin-top: 14px;
  padding: 14px;

  border: 1px solid #eef2f7;
  border-radius: 16px;

  background: #fafcff;
}

.profile-avatar {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;

  flex-shrink: 0;

  border-radius: 12px;

  background: #e8f1ff;
  color: #2563eb;

  font-size: 12px;
  font-weight: 800;
}

.profile-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.profile-info strong {
  overflow: hidden;
  color: #1e293b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-info span {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 10px;
}

.main-content {
  min-height: 100vh;
  background: #f7f9fc;
}

.topbar {
  position: sticky;
  z-index: 20;
  top: 0;

  display: flex;
  min-height: 74px;
  align-items: center;
  justify-content: space-between;

  padding: 0 32px;

  border-bottom: 1px solid rgba(226, 232, 240, 0.8);

  background: rgba(247, 249, 252, 0.88);
  backdrop-filter: blur(16px);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.icon-button {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;

  border: 1px solid #e5eaf1;
  border-radius: 13px;

  background: #ffffff;
  color: #64748b;

  cursor: pointer;

  transition: all 0.2s ease;
}

.icon-button:hover {
  border-color: #cbd5e1;
  color: #2563eb;
  transform: translateY(-1px);
}

.new-expense-button {
  height: 42px !important;
  padding: 0 18px !important;

  font-size: 12px !important;
  font-weight: 700 !important;
  text-transform: none !important;

  box-shadow: 0 7px 20px rgba(59, 130, 246, 0.18) !important;
}

.mobile-brand {
  display: none;
  align-items: center;
  gap: 9px;
}

.mobile-brand strong {
  font-size: 17px;
}

.mobile-navigation {
  position: fixed;
  z-index: 50;
  right: 12px;
  bottom: 12px;
  left: 12px;

  display: grid;
  grid-template-columns: repeat(5, 1fr);

  padding: 7px 5px;

  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 20px;

  background: rgba(255, 255, 255, 0.96);

  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.12);

  backdrop-filter: blur(18px);
}

.mobile-navigation__item {
  display: flex;
  min-width: 0;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: 4px;

  border-radius: 14px;

  color: #94a3b8;

  font-size: 9px;
  font-weight: 600;
}

.mobile-navigation__item.router-link-exact-active {
  background: #edf5ff;
  color: #2563eb;
}

@media (max-width: 960px) {
  .topbar {
    min-height: 66px;
    padding: 0 18px;
  }

  .mobile-brand {
    display: flex;
  }
}

@media (max-width: 600px) {
  .topbar {
    padding: 0 14px;
  }

  .new-expense-button {
    min-width: 42px !important;
    width: 42px;
    padding: 0 !important;

    font-size: 0 !important;
  }

  .new-expense-button :deep(.mr-2) {
    margin-right: 0 !important;
  }
}
</style>
