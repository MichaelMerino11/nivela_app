<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  WalletCards,
} from 'lucide-vue-next'

import {
  disableCategoryBudget,
  getBudgetOverview,
  saveCategoryBudget,
  type BudgetOverview,
  type CategoryBudgetSummary,
} from '@/services/budgets'

import { centsToCurrency, moneyToCents } from '@/utils/money'

import { useFinanceStore } from '@/stores/finance'

import { format, parseISO } from 'date-fns'

import { es } from 'date-fns/locale'

const financeStore = useFinanceStore()

const overview = ref<BudgetOverview | null>(null)

const loading = ref(true)

const saving = ref(false)

const disabling = ref(false)

const errorMessage = ref('')

const budgetDialog = ref(false)

const disableDialog = ref(false)

const selectedCategory = ref<CategoryBudgetSummary | null>(null)

const budgetToDisable = ref<CategoryBudgetSummary | null>(null)

const limitAmount = ref('')

const warningPercentage = ref(80)

const configuredCategories = computed(
  () => overview.value?.categories.filter((category) => category.budgetId !== null) ?? [],
)

const unconfiguredCategories = computed(
  () => overview.value?.categories.filter((category) => category.budgetId === null) ?? [],
)

const cycleLabel = computed(() => {
  if (!overview.value) {
    return '—'
  }

  const start = format(parseISO(overview.value.cycleStartDate), 'd MMM', {
    locale: es,
  })

  const end = format(parseISO(overview.value.cycleEndDate), 'd MMM', {
    locale: es,
  })

  return `${start} — ${end}`
})

const totalPercentage = computed(() => {
  if (!overview.value || overview.value.totalLimitCents <= 0) {
    return 0
  }

  return Math.round((overview.value.totalSpentCents / overview.value.totalLimitCents) * 100)
})

function statusLabel(category: CategoryBudgetSummary): string {
  if (category.status === 'exceeded') {
    return 'Excedido'
  }

  if (category.status === 'warning') {
    return 'Cerca del límite'
  }

  if (category.status === 'normal') {
    return 'En orden'
  }

  return 'Sin presupuesto'
}

function statusClass(category: CategoryBudgetSummary): string {
  return `status-${category.status}`
}

function progressValue(category: CategoryBudgetSummary): number {
  return Math.min(Math.max(category.percentageUsed, 0), 100)
}

async function loadBudgets() {
  errorMessage.value = ''

  try {
    loading.value = true

    overview.value = await getBudgetOverview()
  } catch (error: any) {
    console.error('ERROR CARGANDO PRESUPUESTOS:', error)

    errorMessage.value = error?.message || 'No pudimos cargar tus presupuestos.'
  } finally {
    loading.value = false
  }
}

function openBudget(category: CategoryBudgetSummary) {
  selectedCategory.value = category

  limitAmount.value = category.limitCents !== null ? (category.limitCents / 100).toFixed(2) : ''

  warningPercentage.value = category.warningPercentage || 80

  budgetDialog.value = true
}

function closeBudgetDialog() {
  if (saving.value) {
    return
  }

  budgetDialog.value = false
}

async function saveBudget() {
  errorMessage.value = ''

  try {
    if (!selectedCategory.value) {
      throw new Error('No hay una categoría seleccionada.')
    }

    const limitCents = moneyToCents(limitAmount.value)

    if (!Number.isInteger(limitCents) || limitCents <= 0) {
      throw new Error('El presupuesto debe ser mayor que cero.')
    }

    if (warningPercentage.value < 1 || warningPercentage.value > 100) {
      throw new Error('La alerta debe estar entre 1 y 100.')
    }

    saving.value = true

    await saveCategoryBudget({
      categoryId: selectedCategory.value.categoryId,

      limitCents,

      warningPercentage: warningPercentage.value,
    })

    budgetDialog.value = false
    selectedCategory.value = null

    await loadBudgets()

    financeStore.notifyFinancialChange()
  } catch (error: any) {
    console.error('ERROR GUARDANDO PRESUPUESTO:', error)

    errorMessage.value = error?.message || 'No pudimos guardar el presupuesto.'
  } finally {
    saving.value = false
  }
}

function askDisable(category: CategoryBudgetSummary) {
  budgetToDisable.value = category

  disableDialog.value = true
}

async function confirmDisable() {
  if (!budgetToDisable.value?.budgetId) {
    return
  }

  errorMessage.value = ''

  try {
    disabling.value = true

    await disableCategoryBudget(budgetToDisable.value.budgetId)

    disableDialog.value = false
    budgetToDisable.value = null

    await loadBudgets()

    financeStore.notifyFinancialChange()
  } catch (error: any) {
    console.error('ERROR DESACTIVANDO PRESUPUESTO:', error)

    errorMessage.value = error?.message || 'No pudimos quitar el presupuesto.'
  } finally {
    disabling.value = false
  }
}

watch(
  () => financeStore.revision,

  async () => {
    await loadBudgets()
  },
)

watch(budgetDialog, (open) => {
  if (!open) {
    selectedCategory.value = null
  }
})

onMounted(loadBudgets)
</script>

<template>
  <div class="page-container budgets-page">
    <!-- LOADING -->
    <div v-if="loading" class="state-card">
      <v-progress-circular indeterminate color="primary" :size="34" :width="3" />

      <span> Calculando tus presupuestos... </span>
    </div>

    <!-- ERROR SIN DATA -->
    <div v-else-if="errorMessage && !overview" class="state-card state-error">
      <AlertTriangle :size="28" />

      <strong> No pudimos cargar Presupuestos </strong>

      <span>
        {{ errorMessage }}
      </span>

      <v-btn color="primary" variant="flat" @click="loadBudgets">
        <RefreshCw :size="15" class="mr-2" />

        Reintentar
      </v-btn>
    </div>

    <template v-else-if="overview">
      <!-- HEADER -->
      <section class="page-header">
        <div>
          <span class="eyebrow"> CONTROL DE GASTOS </span>

          <h1>Presupuestos</h1>

          <p>Define cuánto quieres destinar a cada categoría durante el ciclo.</p>
        </div>

        <div class="cycle-pill">
          <WalletCards :size="17" />

          <div>
            <span> Ciclo actual </span>

            <strong>
              {{ cycleLabel }}
            </strong>
          </div>
        </div>
      </section>

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4">
        {{ errorMessage }}
      </v-alert>

      <!-- RESUMEN -->
      <section class="summary-grid">
        <article class="summary-card">
          <span> Presupuesto total </span>

          <strong>
            {{ centsToCurrency(overview.totalLimitCents) }}
          </strong>

          <small> Categorías configuradas </small>
        </article>

        <article class="summary-card">
          <span> Gastado </span>

          <strong class="spent">
            {{ centsToCurrency(overview.totalSpentCents) }}
          </strong>

          <small> {{ totalPercentage }}% utilizado </small>
        </article>

        <article class="summary-card">
          <span> Disponible </span>

          <strong
            :class="{
              negative: overview.totalRemainingCents < 0,
            }"
          >
            {{ centsToCurrency(overview.totalRemainingCents) }}
          </strong>

          <small> Antes de alcanzar los límites </small>
        </article>

        <article class="summary-card">
          <span> Con presupuesto </span>

          <strong>
            {{ configuredCategories.length }}
          </strong>

          <small>
            de
            {{ overview.categories.length }}
            categorías
          </small>
        </article>
      </section>

      <!-- CONFIGURADOS -->
      <section class="budget-section">
        <div class="section-header">
          <div>
            <span class="eyebrow"> ACTIVOS </span>

            <h2>Tus presupuestos</h2>

            <p>El gasto real se actualiza automáticamente con tus movimientos.</p>
          </div>
        </div>

        <div v-if="configuredCategories.length === 0" class="empty-state">
          <div class="empty-icon">
            <CircleDollarSign :size="25" />
          </div>

          <strong> Aún no configuraste presupuestos </strong>

          <span> Elige una categoría de la sección inferior para comenzar. </span>
        </div>

        <div v-else class="budgets-grid">
          <article
            v-for="category in configuredCategories"
            :key="category.categoryId"
            class="budget-card"
          >
            <div class="budget-top">
              <div class="category-icon">
                <WalletCards :size="18" />
              </div>

              <div class="category-title">
                <strong>
                  {{ category.categoryName }}
                </strong>

                <span class="status-pill" :class="statusClass(category)">
                  {{ statusLabel(category) }}
                </span>
              </div>

              <div class="budget-actions">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  @click="openBudget(category)"
                >
                  <Pencil :size="15" />
                </v-btn>

                <v-btn icon size="small" variant="text" color="error" @click="askDisable(category)">
                  <Trash2 :size="15" />
                </v-btn>
              </div>
            </div>

            <div class="budget-values">
              <div>
                <span> Límite </span>

                <strong>
                  {{ centsToCurrency(category.limitCents ?? 0) }}
                </strong>
              </div>

              <div>
                <span> Gastado </span>

                <strong>
                  {{ centsToCurrency(category.spentCents) }}
                </strong>
              </div>

              <div>
                <span> Disponible </span>

                <strong
                  :class="{
                    negative: (category.remainingCents ?? 0) < 0,
                  }"
                >
                  {{ centsToCurrency(category.remainingCents ?? 0) }}
                </strong>
              </div>
            </div>

            <div class="progress-header">
              <span> Uso del presupuesto </span>

              <strong> {{ category.percentageUsed }}% </strong>
            </div>

            <v-progress-linear
              :model-value="progressValue(category)"
              :color="
                category.status === 'exceeded'
                  ? 'error'
                  : category.status === 'warning'
                    ? 'warning'
                    : 'success'
              "
              height="7"
              rounded
            />

            <div class="warning-info">
              Alerta configurada al
              {{ category.warningPercentage }}%
            </div>
          </article>
        </div>
      </section>

      <!-- SIN CONFIGURAR -->
      <section v-if="unconfiguredCategories.length > 0" class="unconfigured-section">
        <div class="section-header">
          <div>
            <span class="eyebrow"> DISPONIBLES </span>

            <h2>Otras categorías</h2>

            <p>Puedes agregar un límite cuando quieras.</p>
          </div>
        </div>

        <div class="category-list">
          <article
            v-for="category in unconfiguredCategories"
            :key="category.categoryId"
            class="category-row"
          >
            <div class="category-icon small">
              <CircleDollarSign :size="16" />
            </div>

            <div class="category-info">
              <strong>
                {{ category.categoryName }}
              </strong>

              <span v-if="category.spentCents > 0">
                Ya gastaste
                {{ centsToCurrency(category.spentCents) }}
                en este ciclo
              </span>

              <span v-else> Sin gastos en este ciclo </span>
            </div>

            <v-btn color="primary" variant="tonal" size="small" @click="openBudget(category)">
              <Plus :size="14" class="mr-1" />

              Configurar
            </v-btn>
          </article>
        </div>
      </section>
    </template>

    <!-- CREAR / EDITAR -->
    <v-dialog v-model="budgetDialog" max-width="480">
      <v-card rounded="xl" class="budget-dialog">
        <div class="dialog-header">
          <div class="dialog-icon">
            <CircleDollarSign :size="22" />
          </div>

          <div>
            <span> PRESUPUESTO </span>

            <h2>
              {{ selectedCategory?.budgetId ? 'Editar presupuesto' : 'Configurar presupuesto' }}
            </h2>

            <p>
              {{ selectedCategory?.categoryName }}
            </p>
          </div>
        </div>

        <v-divider />

        <div class="dialog-content">
          <div class="field">
            <label> Límite para el ciclo </label>

            <v-text-field
              v-model="limitAmount"
              prefix="$"
              placeholder="0.00"
              inputmode="decimal"
              variant="outlined"
              density="comfortable"
              hide-details
              class="amount-input"
            />
          </div>

          <div class="field">
            <div class="warning-label">
              <label> Avisarme al llegar a </label>

              <strong> {{ warningPercentage }}% </strong>
            </div>

            <v-slider
              v-model="warningPercentage"
              :min="50"
              :max="100"
              :step="5"
              color="primary"
              hide-details
            />

            <small> Nivela marcará esta categoría como cercana al límite. </small>
          </div>

          <div v-if="selectedCategory" class="current-spending">
            <span> Ya gastado en este ciclo </span>

            <strong>
              {{ centsToCurrency(selectedCategory.spentCents) }}
            </strong>
          </div>
        </div>

        <v-divider />

        <div class="dialog-actions">
          <v-btn variant="text" :disabled="saving" @click="closeBudgetDialog"> Cancelar </v-btn>

          <v-btn color="primary" variant="flat" :loading="saving" @click="saveBudget">
            <CheckCircle2 :size="15" class="mr-2" />

            Guardar presupuesto
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- DESACTIVAR -->
    <v-dialog v-model="disableDialog" max-width="430">
      <v-card rounded="xl" class="disable-dialog">
        <div class="disable-icon">
          <AlertTriangle :size="24" />
        </div>

        <h3>¿Quitar presupuesto?</h3>

        <p>
          La categoría seguirá existiendo y sus movimientos no se eliminarán. Solo dejarás de tener
          un límite configurado.
        </p>

        <div v-if="budgetToDisable" class="disable-preview">
          <span>
            {{ budgetToDisable.categoryName }}
          </span>

          <strong>
            {{ centsToCurrency(budgetToDisable.limitCents ?? 0) }}
          </strong>
        </div>

        <div class="dialog-actions">
          <v-btn variant="text" :disabled="disabling" @click="disableDialog = false">
            Volver
          </v-btn>

          <v-btn color="error" variant="flat" :loading="disabling" @click="confirmDisable">
            Quitar presupuesto
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped lang="scss">
.budgets-page {
  animation: page-enter 0.35s ease-out;
}

@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.eyebrow {
  display: block;
  margin-bottom: 5px;
  color: #94a3b8;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.2px;
}

.page-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.8px;
}

.page-header p,
.section-header p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 9px;
}

.cycle-pill {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  border: 1px solid #e5eaf1;
  border-radius: 14px;
  background: white;
  color: #64748b;
}

.cycle-pill div {
  display: flex;
  flex-direction: column;
}

.cycle-pill span {
  font-size: 7px;
}

.cycle-pill strong {
  margin-top: 2px;
  color: #334155;
  font-size: 9px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  padding: 17px;
  border: 1px solid #e8edf4;
  border-radius: 18px;
  background: white;
}

.summary-card span {
  color: #94a3b8;
  font-size: 8px;
}

.summary-card strong {
  margin-top: 4px;
  color: #334155;
  font-size: 18px;
}

.summary-card small {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 7px;
}

.summary-card .spent {
  color: #2563eb;
}

.negative {
  color: #e11d48 !important;
}

.budget-section,
.unconfigured-section {
  margin-top: 17px;
  padding: 20px;
  border: 1px solid #e8edf4;
  border-radius: 20px;
  background: white;
}

.section-header h2 {
  margin: 0;
  color: #1e293b;
  font-size: 15px;
}

.budgets-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;
  margin-top: 17px;
}

.budget-card {
  padding: 15px;
  border: 1px solid #e8edf4;
  border-radius: 16px;
  background: #fbfcfe;
}

.budget-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-icon {
  display: grid;
  width: 39px;
  height: 39px;
  place-items: center;
  flex-shrink: 0;
  border-radius: 12px;
  background: #eff6ff;
  color: #3b82f6;
}

.category-icon.small {
  width: 35px;
  height: 35px;
}

.category-title {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.category-title strong,
.category-info strong {
  color: #334155;
  font-size: 10px;
}

.status-pill {
  width: fit-content;
  padding: 3px 6px;
  border-radius: 999px;
  font-size: 7px;
  font-weight: 700;
}

.status-normal {
  background: #ecfdf3;
  color: #16a34a;
}

.status-warning {
  background: #fff7ed;
  color: #d97706;
}

.status-exceeded {
  background: #fff1f2;
  color: #e11d48;
}

.budget-actions {
  display: flex;
}

.budget-values {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 16px;
}

.budget-values div {
  display: flex;
  flex-direction: column;
}

.budget-values span,
.progress-header span {
  color: #94a3b8;
  font-size: 7px;
}

.budget-values strong {
  margin-top: 3px;
  color: #334155;
  font-size: 11px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin: 15px 0 6px;
}

.progress-header strong {
  color: #475569;
  font-size: 8px;
}

.warning-info {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 7px;
}

.category-list {
  margin-top: 13px;
}

.category-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 2px;
  border-bottom: 1px solid #edf1f5;
}

.category-row:last-child {
  border-bottom: 0;
}

.category-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.category-info span {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 7px;
}

.empty-state,
.state-card {
  display: flex;
  min-height: 210px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  color: #94a3b8;
}

.state-card {
  min-height: 420px;
}

.state-error {
  color: #ef4444;
}

.empty-state strong,
.state-card strong {
  color: #475569;
  font-size: 10px;
}

.empty-state span,
.state-card span {
  font-size: 8px;
}

.empty-icon {
  display: grid;
  width: 45px;
  height: 45px;
  place-items: center;
  border-radius: 14px;
  background: #f1f5f9;
}

.budget-dialog {
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 21px 23px;
}

.dialog-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  flex-shrink: 0;
  border-radius: 14px;
  background: #eff6ff;
  color: #2563eb;
}

.dialog-header span {
  color: #94a3b8;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
}

.dialog-header h2 {
  margin: 2px 0;
  color: #1e293b;
  font-size: 17px;
}

.dialog-header p {
  margin: 0;
  color: #64748b;
  font-size: 9px;
}

.dialog-content {
  padding: 21px 23px;
}

.field {
  margin-bottom: 18px;
}

.field label {
  color: #334155;
  font-size: 10px;
  font-weight: 700;
}

.field small {
  display: block;
  margin-top: 5px;
  color: #94a3b8;
  font-size: 7px;
}

.warning-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.warning-label strong {
  color: #2563eb;
  font-size: 10px;
}

.amount-input :deep(input) {
  font-size: 18px;
  font-weight: 800;
}

.current-spending {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 13px;
  border-radius: 12px;
  background: #f8fafc;
}

.current-spending span {
  color: #64748b;
  font-size: 8px;
}

.current-spending strong {
  color: #334155;
  font-size: 11px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
}

.disable-dialog {
  padding: 25px;
}

.disable-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  margin-bottom: 15px;
  border-radius: 15px;
  background: #fff1f2;
  color: #e11d48;
}

.disable-dialog h3 {
  margin: 0;
  color: #1e293b;
  font-size: 17px;
}

.disable-dialog p {
  margin: 8px 0 16px;
  color: #64748b;
  font-size: 9px;
  line-height: 1.6;
}

.disable-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 13px;
  border-radius: 12px;
  background: #f8fafc;
}

.disable-preview span {
  color: #64748b;
  font-size: 9px;
}

.disable-preview strong {
  color: #334155;
  font-size: 11px;
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }

  .budgets-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .cycle-pill {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }

  .budget-values {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .category-row {
    align-items: flex-start;
  }
}
</style>