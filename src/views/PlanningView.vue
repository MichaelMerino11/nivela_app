<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import {
  AlertTriangle,
  CalendarDays,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from 'lucide-vue-next'

import { getPlanningSummary, type PlanningSummary } from '@/services/planning'
import { centsToCurrency } from '@/utils/money'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import PurchaseAdvisorCard from '@/components/planning/PurchaseAdvisorCard.vue'
import PlanExpenseDialog from '@/components/planning/PlanExpenseDialog.vue'
import PlannedExpensesCard from '@/components/planning/PlannedExpensesCard.vue'

import { useFinanceStore } from '@/stores/finance'

const summary = ref<PlanningSummary | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const totalRecommended = computed(
  () => summary.value?.dailyPlan.reduce((total, day) => total + day.recommendedCents, 0) ?? 0,
)

const totalMaximum = computed(
  () =>
    summary.value?.dailyPlan.reduce((total, day) => total + day.maximumRecommendedCents, 0) ?? 0,
)

const cycleLabel = computed(() => {
  if (!summary.value) {
    return '—'
  }

  const start = format(parseISO(summary.value.cycleStartDate), 'd MMM', {
    locale: es,
  })

  const end = format(parseISO(summary.value.cycleEndDate), 'd MMM', {
    locale: es,
  })

  return `${start} — ${end}`
})

const riskLabel = computed(() => {
  if (!summary.value) {
    return ''
  }

  if (summary.value.riskLevel === 'low') {
    return 'Riesgo bajo'
  }

  if (summary.value.riskLevel === 'medium') {
    return 'Riesgo moderado'
  }

  return 'Riesgo alto'
})

const financeStore = useFinanceStore()
const planDialogOpen = ref(false)
const amountToPlanCents = ref(0)

async function loadPlanning() {
  errorMessage.value = ''

  try {
    loading.value = true

    summary.value = await getPlanningSummary()
  } catch (error: any) {
    console.error('ERROR PLANIFICACIÓN:', error)

    errorMessage.value = error?.message || 'No pudimos cargar tu planificación.'
  } finally {
    loading.value = false
  }
}

function openPlanDialog(amountCents: number) {
  amountToPlanCents.value = amountCents

  planDialogOpen.value = true
}

function handlePlanSaved() {
  financeStore.notifyFinancialChange()
}

onMounted(loadPlanning)

watch(
  () => financeStore.revision,

  async () => {
    await loadPlanning()
  },
)
</script>

<template>
  <div class="page-container planning-page">
    <div v-if="loading" class="state-card">
      <v-progress-circular indeterminate color="primary" :size="34" :width="3" />

      <span> Calculando tu planificación... </span>
    </div>

    <div v-else-if="errorMessage" class="state-card state-card--error">
      <AlertTriangle :size="29" />

      <strong> No pudimos cargar tu plan </strong>

      <span>
        {{ errorMessage }}
      </span>

      <v-btn color="primary" variant="flat" @click="loadPlanning">
        <RefreshCw :size="16" class="mr-2" />

        Reintentar
      </v-btn>
    </div>

    <template v-else-if="summary">
      <!-- HEADER -->
      <section class="page-header">
        <div>
          <span class="eyebrow"> CICLO FINANCIERO </span>

          <h1>Tu planificación</h1>

          <p>Presupuesto recomendado desde hoy hasta tu próximo sueldo.</p>
        </div>

        <div class="cycle-pill">
          <CalendarDays :size="17" />

          <div>
            <span> Ciclo actual </span>

            <strong>
              {{ cycleLabel }}
            </strong>
          </div>
        </div>
      </section>

      <!-- RESUMEN -->
      <section class="summary-grid">
        <article class="summary-card">
          <div class="summary-icon">
            <WalletCards :size="20" />
          </div>

          <span> Dinero tranquilo </span>

          <strong
            :class="{
              negative: summary.distributableCents < 0,
            }"
          >
            {{ centsToCurrency(summary.distributableCents) }}
          </strong>

          <small> Después de reservas </small>
        </article>

        <article class="summary-card">
          <div class="summary-icon summary-icon--green">
            <ShieldCheck :size="20" />
          </div>

          <span> Ahorro protegido </span>

          <strong>
            {{ centsToCurrency(summary.savingsTargetCents) }}
          </strong>

          <small> Meta del ciclo </small>
        </article>

        <article class="summary-card">
          <div class="summary-icon summary-icon--orange">
            <CalendarDays :size="20" />
          </div>

          <span> Días restantes </span>

          <strong>
            {{ summary.daysRemaining }}
          </strong>

          <small> Incluyendo hoy </small>
        </article>

        <article class="summary-card">
          <div class="summary-icon summary-icon--purple">
            <TrendingUp :size="20" />
          </div>

          <span> Riesgo actual </span>

          <strong :class="`risk-${summary.riskLevel}`"> {{ summary.riskScore }}/100 </strong>

          <small>
            {{ riskLabel }}
          </small>
        </article>
      </section>

      <!-- CAPACIDAD -->
      <section class="capacity-card">
        <div>
          <span class="eyebrow"> CAPACIDAD DEL CICLO </span>

          <h2>Presupuesto restante</h2>
        </div>

        <div class="capacity-values">
          <div>
            <span> Normal recomendado </span>

            <strong>
              {{ centsToCurrency(totalRecommended) }}
            </strong>
          </div>

          <div class="capacity-divider" />

          <div>
            <span> Máximo recomendado </span>

            <strong>
              {{ centsToCurrency(totalMaximum) }}
            </strong>
          </div>

          <div class="capacity-divider" />

          <div>
            <span> Proyección final </span>

            <strong
              :class="{
                negative: summary.projectedSurplusCents < 0,
              }"
            >
              {{ centsToCurrency(summary.projectedSurplusCents) }}
            </strong>
          </div>
        </div>
      </section>

      <PurchaseAdvisorCard @plan="openPlanDialog" />

      <PlannedExpensesCard
        :refresh-key="financeStore.revision"
        @changed="financeStore.notifyFinancialChange()"
      />

      <PlannedVsActualCard :refresh-key="financeStore.revision" />

      <!-- DÍAS -->
      <section class="days-panel">
        <div class="panel-header">
          <div>
            <span class="eyebrow"> DÍA POR DÍA </span>

            <h2>Presupuesto diario</h2>

            <p>Nivela redistribuye estos montos cuando registras nuevos gastos.</p>
          </div>
        </div>

        <div v-if="summary.dailyPlan.length === 0" class="empty-days">
          No quedan días por planificar en este ciclo.
        </div>

        <div v-else class="days-list">
          <article
            v-for="(day, index) in summary.dailyPlan"
            :key="day.date"
            class="day-row"
            :class="{
              'day-row--today': index === 0,
            }"
          >
            <div class="day-date">
              <CalendarDays :size="18" />

              <div>
                <strong>
                  {{ day.label }}
                </strong>

                <span>
                  {{ day.activity }}
                </span>
              </div>
            </div>

            <div class="day-budget">
              <div>
                <span> Habitual </span>

                <strong>
                  {{ centsToCurrency(day.routineNormalCents) }}
                </strong>
              </div>

              <div>
                <span> Recomendado </span>

                <strong class="recommended">
                  {{ centsToCurrency(day.recommendedCents) }}
                </strong>
              </div>

              <div>
                <span> Máximo </span>

                <strong>
                  {{ centsToCurrency(day.maximumRecommendedCents) }}
                </strong>
              </div>
            </div>

            <span v-if="index === 0" class="today-badge"> Hoy </span>
          </article>
        </div>
      </section>
    </template>
    <PlanExpenseDialog
      v-model="planDialogOpen"
      :initial-amount-cents="amountToPlanCents"
      @saved="handlePlanSaved"
    />
  </div>
</template>

<style scoped lang="scss">
.planning-page {
  animation: planning-enter 0.35s ease-out;
}

@keyframes planning-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.state-card {
  display: flex;

  min-height: 420px;

  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: 12px;

  color: #64748b;
}

.state-card--error {
  color: #ef4444;
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

.page-header p,
.panel-header p {
  margin: 6px 0 0;

  color: #64748b;

  font-size: 10px;
}

.cycle-pill {
  display: flex;

  align-items: center;

  gap: 10px;

  padding: 11px 15px;

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
  font-size: 8px;
}

.cycle-pill strong {
  margin-top: 2px;

  color: #334155;

  font-size: 10px;
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

.summary-icon {
  display: grid;

  width: 40px;
  height: 40px;

  place-items: center;

  margin-bottom: 12px;

  border-radius: 12px;

  background: #eff6ff;
  color: #3b82f6;
}

.summary-icon--green {
  background: #ecfdf3;
  color: #22c55e;
}

.summary-icon--orange {
  background: #fff7ed;
  color: #f59e0b;
}

.summary-icon--purple {
  background: #f5f3ff;
  color: #8b5cf6;
}

.summary-card > span {
  color: #94a3b8;

  font-size: 9px;
}

.summary-card > strong {
  margin-top: 4px;

  color: #1e293b;

  font-size: 18px;
  font-weight: 800;
}

.summary-card small {
  margin-top: 4px;

  color: #94a3b8;

  font-size: 8px;
}

.negative {
  color: #e11d48 !important;
}

.risk-low {
  color: #16a34a !important;
}

.risk-medium {
  color: #d97706 !important;
}

.risk-high {
  color: #e11d48 !important;
}

.capacity-card {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 25px;

  margin-top: 16px;
  padding: 19px 21px;

  border: 1px solid #e8edf4;
  border-radius: 19px;

  background: white;
}

.capacity-card h2,
.panel-header h2 {
  margin: 0;

  color: #1e293b;

  font-size: 15px;
}

.capacity-values {
  display: flex;

  align-items: center;

  gap: 25px;
}

.capacity-values > div:not(.capacity-divider) {
  display: flex;
  flex-direction: column;
}

.capacity-values span {
  color: #94a3b8;

  font-size: 8px;
}

.capacity-values strong {
  margin-top: 3px;

  color: #334155;

  font-size: 13px;
}

.capacity-divider {
  width: 1px;
  height: 31px;

  background: #e8edf4;
}

.days-panel {
  margin-top: 16px;
  padding: 21px;

  border: 1px solid #e8edf4;
  border-radius: 20px;

  background: white;
}

.days-list {
  margin-top: 17px;
}

.day-row {
  position: relative;

  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 20px;

  padding: 14px 12px;

  border-bottom: 1px solid #edf1f5;
}

.day-row:last-child {
  border-bottom: 0;
}

.day-row--today {
  border-radius: 13px;

  background: #f7faff;
}

.day-date {
  display: flex;

  min-width: 190px;

  align-items: center;

  gap: 10px;

  color: #64748b;
}

.day-date div {
  display: flex;
  flex-direction: column;
}

.day-date strong {
  color: #334155;

  font-size: 10px;

  text-transform: capitalize;
}

.day-date span {
  margin-top: 2px;

  color: #94a3b8;

  font-size: 8px;
}

.day-budget {
  display: grid;

  min-width: 360px;

  grid-template-columns: repeat(3, 1fr);

  gap: 25px;
}

.day-budget div {
  display: flex;
  flex-direction: column;

  text-align: right;
}

.day-budget span {
  color: #94a3b8;

  font-size: 8px;
}

.day-budget strong {
  margin-top: 3px;

  color: #475569;

  font-size: 11px;
}

.day-budget .recommended {
  color: #2563eb;

  font-size: 13px;
}

.today-badge {
  position: absolute;

  top: 8px;
  right: 8px;

  padding: 3px 6px;

  border-radius: 999px;

  background: #dbeafe;
  color: #2563eb;

  font-size: 7px;
  font-weight: 700;
}

.empty-days {
  margin-top: 18px;
  padding: 30px;

  text-align: center;

  color: #94a3b8;

  font-size: 10px;
}

@media (max-width: 1000px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .capacity-card {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 700px) {
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

  .capacity-values {
    width: 100%;

    justify-content: space-between;

    gap: 10px;
  }

  .day-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .day-budget {
    width: 100%;
    min-width: 0;

    gap: 8px;
  }

  .day-budget div {
    text-align: left;
  }
}

@media (max-width: 420px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .capacity-values {
    align-items: flex-start;
    flex-direction: column;
  }

  .capacity-divider {
    width: 100%;
    height: 1px;
  }
}
</style>
