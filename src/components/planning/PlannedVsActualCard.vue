<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import {
  AlertTriangle,
  CheckCircle2,
  History,
  ReceiptText,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-vue-next'

import {
  getPlannedHistory,
  type PlannedHistoryItem,
  type PlannedHistorySummary,
} from '@/services/planned-history'

import { centsToCurrency } from '@/utils/money'

import { format, parseISO } from 'date-fns'

import { es } from 'date-fns/locale'

const props = defineProps<{
  refreshKey: number
}>()

const history = ref<PlannedHistorySummary | null>(null)

const loading = ref(true)

const errorMessage = ref('')

const globalDifferenceLabel = computed(() => {
  const difference = history.value?.differenceCents ?? 0

  if (difference > 0) {
    return `${centsToCurrency(difference)} a favor`
  }

  if (difference < 0) {
    return `${centsToCurrency(Math.abs(difference))} sobre el plan`
  }

  return 'Exacto'
})

function formatPlanDate(value: string): string {
  return format(parseISO(value), "d 'de' MMM", {
    locale: es,
  })
}

function formatPaidDate(value: string | null): string {
  if (!value) {
    return 'Sin movimiento'
  }

  return format(parseISO(value), "d 'de' MMM, HH:mm", {
    locale: es,
  })
}

function getDifferenceLabel(item: PlannedHistoryItem): string {
  if (!item.hasPayment) {
    return 'Sin movimiento'
  }

  if (item.differenceCents > 0) {
    return `${centsToCurrency(item.differenceCents)} a favor`
  }

  if (item.differenceCents < 0) {
    return `${centsToCurrency(Math.abs(item.differenceCents))} sobre plan`
  }

  return 'Exacto'
}

function getDifferenceClass(item: PlannedHistoryItem): string {
  if (!item.hasPayment) {
    return 'neutral'
  }

  if (item.differenceCents > 0) {
    return 'positive'
  }

  if (item.differenceCents < 0) {
    return 'negative'
  }

  return 'neutral'
}

async function loadHistory() {
  errorMessage.value = ''

  try {
    loading.value = true

    history.value = await getPlannedHistory()
  } catch (error: any) {
    console.error('ERROR HISTORIAL PLANIFICADOS:', error)

    errorMessage.value = error?.message || 'No pudimos cargar el historial.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.refreshKey,

  loadHistory,
)

onMounted(loadHistory)
</script>

<template>
  <section class="history-card">
    <div class="history-header">
      <div class="header-title">
        <div class="header-icon">
          <History :size="20" />
        </div>

        <div>
          <span class="eyebrow"> HISTORIAL </span>

          <h2>Planeado vs. Real</h2>

          <p>Descubre qué tan cerca estuvo tu estimación del gasto real.</p>
        </div>
      </div>

      <div v-if="history && history.completedCount > 0" class="completed-badge">
        <CheckCircle2 :size="15" />

        {{ history.completedCount }}
        completados
      </div>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mx-5 mt-4">
      {{ errorMessage }}
    </v-alert>

    <div v-if="loading" class="history-state">
      <v-progress-circular indeterminate color="primary" :size="30" :width="3" />

      <span> Analizando tus gastos... </span>
    </div>

    <template v-else-if="history && history.items.length > 0">
      <!-- RESUMEN -->
      <div class="history-summary">
        <div>
          <span> Planeado </span>

          <strong>
            {{ centsToCurrency(history.totalPlannedCents) }}
          </strong>
        </div>

        <div>
          <span> Real </span>

          <strong>
            {{ centsToCurrency(history.totalActualCents) }}
          </strong>
        </div>

        <div>
          <span> Diferencia </span>

          <strong
            :class="{
              positive: history.differenceCents > 0,

              negative: history.differenceCents < 0,
            }"
          >
            {{ globalDifferenceLabel }}
          </strong>
        </div>
      </div>

      <!-- FILAS -->
      <div class="history-list">
        <article v-for="item in history.items" :key="item.id" class="history-row">
          <div class="movement-icon">
            <ReceiptText :size="18" />
          </div>

          <div class="movement-main">
            <div class="movement-title">
              <strong>
                {{ item.name }}
              </strong>

              <span v-if="item.isExceptional" class="exception-badge">
                <Sparkles :size="10" />
                Excepcional
              </span>
            </div>

            <div class="movement-meta">
              <span>
                {{ item.categoryName }}
              </span>

              <span>•</span>

              <span>
                Planeado:
                {{ formatPlanDate(item.plannedDate) }}
              </span>

              <span>•</span>

              <span>
                Pagado:
                {{ formatPaidDate(item.paidAt) }}
              </span>
            </div>
          </div>

          <div class="comparison-values">
            <div>
              <span> Planeado </span>

              <strong>
                {{ centsToCurrency(item.plannedAmountCents) }}
              </strong>
            </div>

            <div>
              <span> Real </span>

              <strong>
                {{ centsToCurrency(item.actualAmountCents) }}
              </strong>
            </div>

            <div class="difference-column">
              <span> Diferencia </span>

              <strong :class="getDifferenceClass(item)">
                <TrendingDown v-if="item.differenceCents > 0" :size="13" />

                <TrendingUp v-else-if="item.differenceCents < 0" :size="13" />

                {{ getDifferenceLabel(item) }}
              </strong>
            </div>
          </div>

          <AlertTriangle v-if="!item.hasPayment" :size="17" class="missing-payment" />
        </article>
      </div>
    </template>

    <div v-else class="history-state">
      <div class="empty-icon">
        <History :size="23" />
      </div>

      <strong> Todavía no hay comparaciones </strong>

      <span> Cuando completes un gasto planificado aparecerá aquí. </span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.history-card {
  margin-top: 16px;

  overflow: hidden;

  border: 1px solid #e8edf4;
  border-radius: 20px;

  background: white;
}

.history-header {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 20px;

  padding: 20px 21px;

  border-bottom: 1px solid #edf1f5;
}

.header-title {
  display: flex;

  align-items: center;

  gap: 12px;
}

.header-icon {
  display: grid;

  width: 42px;
  height: 42px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 13px;

  background: #f1f5f9;
  color: #64748b;
}

.eyebrow {
  display: block;

  margin-bottom: 4px;

  color: #94a3b8;

  font-size: 8px;
  font-weight: 700;

  letter-spacing: 1.2px;
}

.history-header h2 {
  margin: 0;

  color: #1e293b;

  font-size: 15px;
}

.history-header p {
  margin: 4px 0 0;

  color: #64748b;

  font-size: 8px;
}

.completed-badge {
  display: inline-flex;

  align-items: center;

  gap: 5px;

  padding: 7px 10px;

  border-radius: 999px;

  background: #ecfdf3;
  color: #16a34a;

  font-size: 8px;
  font-weight: 700;
}

.history-summary {
  display: grid;

  grid-template-columns: repeat(3, minmax(0, 1fr));

  gap: 1px;

  background: #edf1f5;
}

.history-summary > div {
  display: flex;

  flex-direction: column;

  padding: 14px 20px;

  background: #fbfcfe;
}

.history-summary span {
  color: #94a3b8;

  font-size: 8px;
}

.history-summary strong {
  margin-top: 3px;

  color: #334155;

  font-size: 13px;
}

.history-list {
  padding: 5px 18px;
}

.history-row {
  display: flex;

  align-items: center;

  gap: 12px;

  padding: 15px 3px;

  border-bottom: 1px solid #edf1f5;
}

.history-row:last-child {
  border-bottom: 0;
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

  gap: 7px;
}

.movement-title strong {
  color: #334155;

  font-size: 10px;
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

  font-size: 7px;

  text-transform: capitalize;
}

.comparison-values {
  display: grid;

  min-width: 340px;

  grid-template-columns: repeat(3, minmax(85px, 1fr));

  gap: 12px;
}

.comparison-values > div {
  display: flex;

  flex-direction: column;
}

.comparison-values span {
  color: #94a3b8;

  font-size: 7px;
}

.comparison-values strong {
  margin-top: 3px;

  color: #334155;

  font-size: 10px;
}

.difference-column strong {
  display: flex;

  align-items: center;

  gap: 3px;
}

.positive {
  color: #16a34a !important;
}

.negative {
  color: #e11d48 !important;
}

.neutral {
  color: #64748b !important;
}

.missing-payment {
  flex-shrink: 0;

  color: #f59e0b;
}

.history-state {
  display: flex;

  min-height: 170px;

  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: 9px;

  color: #94a3b8;
}

.history-state strong {
  color: #475569;

  font-size: 10px;
}

.history-state span {
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

@media (max-width: 850px) {
  .history-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .comparison-values {
    width: 100%;
    min-width: 0;

    padding-left: 51px;
  }
}

@media (max-width: 600px) {
  .history-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .history-summary {
    grid-template-columns: 1fr;
  }

  .comparison-values {
    grid-template-columns: 1fr 1fr;
    padding-left: 0;
  }

  .difference-column {
    grid-column: 1 / -1;
  }
}
</style>