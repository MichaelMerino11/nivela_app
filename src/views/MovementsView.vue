<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import {
  AlertTriangle,
  CalendarDays,
  Filter,
  ReceiptText,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'

import { deleteMovement, getMovements, type Movement } from '@/services/movements'

import { getExpenseFormOptions, type ExpenseCategory } from '@/services/expenses'

import { centsToCurrency } from '@/utils/money'

import { useFinanceStore } from '@/stores/finance'

import { format, parseISO } from 'date-fns'

import { es } from 'date-fns/locale'

const financeStore = useFinanceStore()

const movements = ref<Movement[]>([])

const categories = ref<ExpenseCategory[]>([])

const loading = ref(true)

const deletingId = ref<string | null>(null)

const errorMessage = ref('')

const search = ref('')

const categoryId = ref<string | null>(null)

const dateFrom = ref('')

const dateTo = ref('')

const exceptionalOnly = ref(false)

const deleteDialog = ref(false)

const movementToDelete = ref<Movement | null>(null)

const filteredMovements = computed(() => {
  const term = search.value.trim().toLowerCase()

  if (!term) {
    return movements.value
  }

  return movements.value.filter((movement) => {
    const description = movement.description?.toLowerCase() ?? ''

    const category = movement.category?.name?.toLowerCase() ?? ''

    return description.includes(term) || category.includes(term)
  })
})

const totalExpenses = computed(() =>
  filteredMovements.value
    .filter((movement) => movement.kind === 'expense')
    .reduce((total, movement) => total + movement.amount_cents, 0),
)

function formatMovementDate(value: string): string {
  return format(parseISO(value), "d 'de' MMMM, HH:mm", {
    locale: es,
  })
}

async function loadCategories() {
  const options = await getExpenseFormOptions()

  categories.value = options.categories
}

async function loadMovements() {
  errorMessage.value = ''

  try {
    loading.value = true

    movements.value = await getMovements({
      categoryId: categoryId.value,

      from: dateFrom.value || null,

      to: dateTo.value || null,

      exceptionalOnly: exceptionalOnly.value,
    })
  } catch (error: any) {
    console.error('ERROR CARGANDO MOVIMIENTOS:', error)

    errorMessage.value = error?.message || 'No pudimos cargar tus movimientos.'
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  search.value = ''
  categoryId.value = null
  dateFrom.value = ''
  dateTo.value = ''
  exceptionalOnly.value = false
}

function askDelete(movement: Movement) {
  movementToDelete.value = movement

  deleteDialog.value = true
}

async function confirmDelete() {
  if (!movementToDelete.value) {
    return
  }

  try {
    deletingId.value = movementToDelete.value.id

    await deleteMovement(movementToDelete.value.id)

    deleteDialog.value = false

    movementToDelete.value = null

    financeStore.notifyFinancialChange()

    await loadMovements()
  } catch (error: any) {
    console.error('ERROR ELIMINANDO MOVIMIENTO:', error)

    errorMessage.value = error?.message || 'No pudimos eliminar el movimiento.'
  } finally {
    deletingId.value = null
  }
}

watch([categoryId, dateFrom, dateTo, exceptionalOnly], async () => {
  await loadMovements()
})

onMounted(async () => {
  try {
    await Promise.all([loadCategories(), loadMovements()])
  } catch (error: any) {
    console.error('ERROR INICIAL MOVIMIENTOS:', error)
  }
})
</script>

<template>
  <div class="page-container movements-page">
    <!-- HEADER -->
    <section class="page-header">
      <div>
        <span class="eyebrow"> ACTIVIDAD FINANCIERA </span>

        <h1>Movimientos</h1>

        <p>Revisa todo lo que has registrado en Nivela.</p>
      </div>

      <div class="header-summary">
        <span> Gastos mostrados </span>

        <strong>
          {{ centsToCurrency(totalExpenses) }}
        </strong>
      </div>
    </section>

    <!-- FILTROS -->
    <section class="filters-card">
      <div class="search-field">
        <Search :size="17" />

        <input v-model="search" type="text" placeholder="Buscar movimiento..." />
      </div>

      <v-select
        v-model="categoryId"
        :items="categories"
        item-title="name"
        item-value="id"
        placeholder="Todas las categorías"
        clearable
        hide-details
        density="compact"
        variant="outlined"
        class="filter-control"
      />

      <v-text-field
        v-model="dateFrom"
        type="date"
        hide-details
        density="compact"
        variant="outlined"
        class="filter-control"
      />

      <v-text-field
        v-model="dateTo"
        type="date"
        hide-details
        density="compact"
        variant="outlined"
        class="filter-control"
      />

      <v-btn
        variant="tonal"
        color="primary"
        class="filter-button"
        @click="exceptionalOnly = !exceptionalOnly"
      >
        <Sparkles :size="15" class="mr-1" />

        Excepcionales

        <span v-if="exceptionalOnly" class="active-filter-dot" />
      </v-btn>

      <v-btn icon variant="text" size="small" @click="clearFilters">
        <Filter :size="17" />
      </v-btn>
    </section>

    <!-- ERROR -->
    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <!-- LOADING -->
    <div v-if="loading" class="state-card">
      <v-progress-circular indeterminate color="primary" :size="34" :width="3" />

      <span> Cargando tus movimientos... </span>
    </div>

    <!-- VACÍO -->
    <div v-else-if="filteredMovements.length === 0" class="state-card">
      <div class="state-icon">
        <ReceiptText :size="28" />
      </div>

      <strong> No encontramos movimientos </strong>

      <span> Prueba quitando los filtros o registra un nuevo gasto. </span>
    </div>

    <!-- LISTA -->
    <section v-else class="movements-card">
      <article v-for="movement in filteredMovements" :key="movement.id" class="movement-row">
        <div class="movement-icon">
          <ReceiptText :size="18" />
        </div>

        <div class="movement-main">
          <div class="movement-title">
            <strong>
              {{ movement.description || movement.category?.name || 'Gasto' }}
            </strong>

            <span v-if="movement.is_exceptional" class="exception-badge">
              <Sparkles :size="11" />

              Excepcional
            </span>
          </div>

          <div class="movement-meta">
            <span>
              {{ movement.category?.name || 'Sin categoría' }}
            </span>

            <span>•</span>

            <span>
              {{ formatMovementDate(movement.occurred_at) }}
            </span>
          </div>

          <div v-if="movement.is_justified && movement.justification" class="justification">
            {{ movement.justification }}
          </div>
        </div>

        <div class="movement-amount">
          <strong
            :class="{
              expense: movement.kind === 'expense',
            }"
          >
            {{ movement.kind === 'expense' ? '-' : '+'
            }}{{ centsToCurrency(movement.amount_cents) }}
          </strong>
        </div>

        <v-btn
          icon
          variant="text"
          size="small"
          color="error"
          :loading="deletingId === movement.id"
          @click="askDelete(movement)"
        >
          <Trash2 :size="16" />
        </v-btn>
      </article>
    </section>

    <!-- CONFIRMACIÓN -->
    <v-dialog v-model="deleteDialog" max-width="430">
      <v-card rounded="xl" class="delete-dialog">
        <div class="delete-icon">
          <AlertTriangle :size="24" />
        </div>

        <h3>¿Eliminar movimiento?</h3>

        <p>
          El saldo y la planificación volverán a calcularse como si este movimiento nunca hubiera
          existido.
        </p>

        <div v-if="movementToDelete" class="delete-preview">
          <span>
            {{ movementToDelete.description || movementToDelete.category?.name || 'Movimiento' }}
          </span>

          <strong>
            {{ centsToCurrency(movementToDelete.amount_cents) }}
          </strong>
        </div>

        <div class="delete-actions">
          <v-btn variant="text" @click="deleteDialog = false"> Cancelar </v-btn>

          <v-btn color="error" variant="flat" :loading="deletingId !== null" @click="confirmDelete">
            Eliminar
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped lang="scss">
.movements-page {
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

  margin-bottom: 6px;

  color: #94a3b8;

  font-size: 9px;
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

.page-header p {
  margin: 6px 0 0;

  color: #64748b;

  font-size: 11px;
}

.header-summary {
  display: flex;

  flex-direction: column;

  padding: 11px 15px;

  border: 1px solid #e6ebf2;
  border-radius: 14px;

  background: white;
}

.header-summary span {
  color: #94a3b8;

  font-size: 8px;
}

.header-summary strong {
  margin-top: 2px;

  color: #e11d48;

  font-size: 15px;
}

.filters-card {
  display: grid;

  grid-template-columns:
    minmax(180px, 1.5fr)
    minmax(160px, 1fr)
    minmax(135px, 0.8fr)
    minmax(135px, 0.8fr)
    auto
    auto;

  gap: 10px;

  align-items: center;

  margin-bottom: 17px;
  padding: 12px;

  border: 1px solid #e8edf4;
  border-radius: 18px;

  background: white;
}

.search-field {
  display: flex;

  min-height: 40px;

  align-items: center;

  gap: 8px;

  padding: 0 12px;

  border: 1px solid #dfe5ec;
  border-radius: 10px;

  color: #94a3b8;
}

.search-field input {
  width: 100%;

  border: 0;
  outline: 0;

  background: transparent;
  color: #334155;

  font-family: inherit;
  font-size: 10px;
}

.filter-control {
  font-size: 10px;
}

.filter-button {
  text-transform: none;
}

.active-filter-dot {
  width: 6px;
  height: 6px;

  margin-left: 5px;

  border-radius: 50%;

  background: currentColor;
}

.state-card {
  display: flex;

  min-height: 320px;

  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: 11px;

  border: 1px solid #e8edf4;
  border-radius: 20px;

  background: white;
  color: #94a3b8;
}

.state-card strong {
  color: #334155;

  font-size: 12px;
}

.state-card span {
  font-size: 9px;
}

.state-icon {
  display: grid;

  width: 58px;
  height: 58px;

  place-items: center;

  border-radius: 18px;

  background: #f1f5f9;
  color: #64748b;
}

.movements-card {
  overflow: hidden;

  border: 1px solid #e8edf4;
  border-radius: 20px;

  background: white;
}

.movement-row {
  display: flex;

  align-items: center;

  gap: 12px;

  padding: 15px 18px;

  border-bottom: 1px solid #eef2f6;

  transition: background 0.18s ease;
}

.movement-row:last-child {
  border-bottom: 0;
}

.movement-row:hover {
  background: #fbfcfe;
}

.movement-icon {
  display: grid;

  width: 39px;
  height: 39px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 12px;

  background: #f1f5f9;
  color: #64748b;
}

.movement-main {
  min-width: 0;
  flex: 1;
}

.movement-title {
  display: flex;

  align-items: center;

  gap: 8px;
}

.movement-title strong {
  overflow: hidden;

  color: #334155;

  font-size: 11px;

  text-overflow: ellipsis;
  white-space: nowrap;
}

.exception-badge {
  display: inline-flex;

  align-items: center;

  gap: 3px;

  padding: 3px 6px;

  border-radius: 999px;

  background: #fff7ed;
  color: #d97706;

  font-size: 7px;
  font-weight: 700;
}

.movement-meta {
  display: flex;

  flex-wrap: wrap;

  gap: 5px;

  margin-top: 4px;

  color: #94a3b8;

  font-size: 8px;

  text-transform: capitalize;
}

.justification {
  max-width: 650px;

  margin-top: 5px;

  color: #64748b;

  font-size: 8px;
  font-style: italic;
}

.movement-amount {
  flex-shrink: 0;

  text-align: right;
}

.movement-amount strong {
  color: #16a34a;

  font-size: 12px;
}

.movement-amount strong.expense {
  color: #e11d48;
}

.delete-dialog {
  padding: 25px;
}

.delete-icon {
  display: grid;

  width: 48px;
  height: 48px;

  place-items: center;

  margin-bottom: 15px;

  border-radius: 15px;

  background: #fff1f2;
  color: #e11d48;
}

.delete-dialog h3 {
  margin: 0;

  color: #1e293b;

  font-size: 17px;
}

.delete-dialog p {
  margin: 8px 0 16px;

  color: #64748b;

  font-size: 10px;
  line-height: 1.6;
}

.delete-preview {
  display: flex;

  align-items: center;
  justify-content: space-between;

  padding: 11px 13px;

  border-radius: 12px;

  background: #f8fafc;
}

.delete-preview span {
  color: #64748b;

  font-size: 10px;
}

.delete-preview strong {
  color: #e11d48;

  font-size: 12px;
}

.delete-actions {
  display: flex;

  justify-content: flex-end;

  gap: 8px;

  margin-top: 18px;
}

@media (max-width: 1000px) {
  .filters-card {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 650px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-summary {
    width: 100%;
  }

  .filters-card {
    grid-template-columns: 1fr;
  }

  .movement-row {
    align-items: flex-start;

    padding: 13px;
  }

  .movement-amount {
    margin-left: auto;
  }

  .movement-title {
    align-items: flex-start;
    flex-direction: column;

    gap: 4px;
  }
}
</style>