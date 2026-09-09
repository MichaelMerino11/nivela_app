<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  ChevronRight,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-vue-next'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { getPlanningSummary, type PlanningSummary } from '@/services/planning'
import { useAuthStore } from '@/stores/auth'
import { centsToCurrency } from '@/utils/money'
import { useFinanceStore } from '@/stores/finance'

const authStore = useAuthStore()

const financeStore = useFinanceStore()

const summary = ref<PlanningSummary | null>(null)

const loading = ref(true)

const errorMessage = ref('')

const todayPlan = computed(() => summary.value?.nextDays[0] ?? null)

const todayRecommended = computed(() => todayPlan.value?.recommendedCents ?? 0)

const todayMaximum = computed(() => todayPlan.value?.maximumRecommendedCents ?? 0)

const spentToday = computed(() => summary.value?.spentTodayCents ?? 0)

const remainingNormal = computed(() => Math.max(todayRecommended.value - spentToday.value, 0))

const remainingMaximum = computed(() => Math.max(todayMaximum.value - spentToday.value, 0))

const spendingProgress = computed(() => {
  if (todayRecommended.value <= 0) {
    return spentToday.value > 0 ? 100 : 0
  }

  return Math.min(Math.round((spentToday.value / todayRecommended.value) * 100), 100)
})

const todayLabel = computed(() =>
  format(new Date(), "EEEE, d 'de' MMMM", {
    locale: es,
  }).toUpperCase(),
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

const riskStateLabel = computed(() => {
  if (!summary.value) {
    return ''
  }

  if (summary.value.riskLevel === 'low') {
    return 'Todo bien'
  }

  if (summary.value.riskLevel === 'medium') {
    return 'Atención'
  }

  return 'Presupuesto crítico'
})

const riskDescription = computed(() => {
  if (!summary.value) {
    return ''
  }

  if (summary.value.riskLevel === 'low') {
    return 'Tu planificación tiene margen ' + 'para mantener tu objetivo de ahorro.'
  }

  if (summary.value.riskLevel === 'medium') {
    return 'Tu dinero requiere algo más de control ' + 'durante los próximos días.'
  }

  return (
    'Tu saldo actual no alcanza para proteger ' +
    'tu meta de ahorro y cubrir los gastos ' +
    'previstos hasta el próximo sueldo.'
  )
})

const advice = computed(() => {
  if (!summary.value) {
    return ''
  }

  if (summary.value.riskLevel === 'high') {
    if (summary.value.adjustableVariableCents > 0) {
      return (
        `Tienes ${centsToCurrency(
          summary.value.adjustableVariableCents,
        )} en gastos variables que pueden ` +
        'reducirse. Prioriza únicamente ' +
        'lo necesario hasta tu próximo sueldo.'
      )
    }

    return 'Evita nuevos gastos no esenciales ' + 'hasta tu próximo sueldo.'
  }

  if (summary.value.riskLevel === 'medium') {
    return (
      `Hoy procura mantenerte debajo de ${centsToCurrency(
        todayRecommended.value,
      )}. Si gastas más, Nivela reajustará ` + 'los próximos días.'
    )
  }

  return `Puedes gastar hasta ${centsToCurrency(
    todayRecommended.value,
  )} hoy tranquilamente. Tu ahorro continúa protegido.`
})

const riskGaugeStyle = computed(() => {
  const score = summary.value?.riskScore ?? 0

  const degrees = score * 3.6

  let color = '#22C55E'

  if (summary.value?.riskLevel === 'medium') {
    color = '#F59E0B'
  }

  if (summary.value?.riskLevel === 'high') {
    color = '#EF4444'
  }

  return {
    background: `conic-gradient(
          ${color} 0deg ${degrees}deg,
          #EDF1F5 ${degrees}deg 360deg
        )`,
  }
})

async function loadDashboard() {
  errorMessage.value = ''

  try {
    loading.value = true

    summary.value = await getPlanningSummary()
  } catch (error: any) {
    console.error('ERROR DASHBOARD:', error)

    errorMessage.value = error?.message || 'No pudimos cargar tu planificación.'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)

watch(
  () => financeStore.revision,

  async () => {
    await loadDashboard()
  },
)
</script>

<template>
  <div class="page-container dashboard">
    <!-- CARGANDO -->
    <div v-if="loading" class="dashboard-state">
      <v-progress-circular indeterminate color="primary" :size="34" :width="3" />

      <strong> Actualizando tu planificación... </strong>
    </div>

    <!-- ERROR -->
    <div v-else-if="errorMessage" class="dashboard-state dashboard-state--error">
      <AlertTriangle :size="30" />

      <strong> No pudimos cargar Nivela </strong>

      <span>
        {{ errorMessage }}
      </span>

      <button type="button" @click="loadDashboard">
        <RefreshCw :size="17" />
        Reintentar
      </button>
    </div>

    <template v-else-if="summary">
      <!-- BIENVENIDA -->
      <section class="dashboard-header">
        <div>
          <span class="eyebrow">
            {{ todayLabel }}
          </span>

          <h1>
            Buenos días,
            {{ authStore.displayName }}
          </h1>

          <p>Esta es tu situación financiera actualizada.</p>
        </div>

        <div class="cycle-pill">
          <CalendarDays :size="17" />

          <div>
            <span>Ciclo actual</span>

            <strong>
              {{ cycleLabel }}
            </strong>
          </div>
        </div>
      </section>

      <!-- PRINCIPAL -->
      <section class="hero-grid">
        <article
          class="today-card"
          :class="{
            'today-card--danger': summary.riskLevel === 'high',
          }"
        >
          <div class="today-card__header">
            <div>
              <span class="card-eyebrow"> PRESUPUESTO DE HOY </span>

              <h2>Puedes gastar</h2>
            </div>

            <div class="status-badge" :class="`status-badge--${summary.riskLevel}`">
              <span class="status-dot" />

              {{ riskStateLabel }}
            </div>
          </div>

          <div class="today-money">
            <strong>
              {{ centsToCurrency(todayRecommended) }}
            </strong>
          </div>

          <p class="today-description">
            {{
              summary.riskLevel === 'high'
                ? 'Nivela recomienda no realizar gastos adicionales hoy salvo que sean necesarios.'
                : 'Esta es la cantidad recomendada para hoy sin comprometer tu planificación.'
            }}
          </p>

          <div class="today-progress">
            <div class="today-progress__labels">
              <span> Gastado hoy </span>

              <strong>
                {{ centsToCurrency(spentToday) }}

                <span>
                  de
                  {{ centsToCurrency(todayRecommended) }}
                </span>
              </strong>
            </div>

            <v-progress-linear
              :model-value="spendingProgress"
              height="8"
              rounded
              :color="
                summary.riskLevel === 'high'
                  ? 'error'
                  : summary.riskLevel === 'medium'
                    ? 'warning'
                    : 'primary'
              "
              bg-color="#E8EEF7"
            />
          </div>

          <div class="today-footer">
            <div>
              <span> Disponible normal </span>

              <strong>
                {{ centsToCurrency(remainingNormal) }}
              </strong>
            </div>

            <div class="today-footer__divider" />

            <div>
              <span> Máximo disponible </span>

              <strong>
                {{ centsToCurrency(remainingMaximum) }}
              </strong>
            </div>
          </div>
        </article>

        <!-- RIESGO -->
        <article class="risk-card">
          <div class="risk-card__top">
            <div>
              <span class="card-eyebrow"> NIVEL DE RIESGO </span>

              <h3>Situación financiera</h3>
            </div>

            <TrendingUp :size="21" :class="`risk-icon risk-icon--${summary.riskLevel}`" />
          </div>

          <div class="risk-gauge">
            <div class="risk-gauge__circle" :style="riskGaugeStyle">
              <div class="risk-gauge__inner">
                <strong>
                  {{ summary.riskScore }}
                </strong>

                <span>/100</span>
              </div>
            </div>
          </div>

          <div class="risk-state" :class="`risk-state--${summary.riskLevel}`">
            <span class="status-dot" />

            {{ riskLabel }}
          </div>

          <p>
            {{ riskDescription }}
          </p>
        </article>
      </section>

      <!-- MÉTRICAS -->
      <section class="metrics-grid">
        <article class="metric-card">
          <div class="metric-icon metric-icon--blue">
            <Wallet :size="20" />
          </div>

          <div class="metric-content">
            <span> Dinero tranquilo </span>

            <strong
              :class="{
                negative: summary.distributableCents < 0,
              }"
            >
              {{ centsToCurrency(summary.distributableCents) }}
            </strong>

            <small> Disponible después de reservas </small>
          </div>
        </article>

        <article class="metric-card">
          <div class="metric-icon metric-icon--green">
            <PiggyBank :size="20" />
          </div>

          <div class="metric-content">
            <span> Ahorro protegido </span>

            <strong>
              {{ centsToCurrency(summary.savingsTargetCents) }}
            </strong>

            <small class="positive"> Meta del ciclo </small>
          </div>
        </article>

        <article class="metric-card">
          <div class="metric-icon metric-icon--orange">
            <CalendarDays :size="20" />
          </div>

          <div class="metric-content">
            <span> Días restantes </span>

            <strong>
              {{ summary.daysRemaining }}
              días
            </strong>

            <small> Hasta terminar el ciclo </small>
          </div>
        </article>

        <article class="metric-card">
          <div class="metric-icon metric-icon--purple">
            <TrendingUp :size="20" />
          </div>

          <div class="metric-content">
            <span> Proyección final </span>

            <strong
              :class="{
                negative: summary.projectedSurplusCents < 0,
                positive: summary.projectedSurplusCents >= 0,
              }"
            >
              {{ centsToCurrency(summary.projectedSurplusCents) }}
            </strong>

            <small> Después de tu rutina </small>
          </div>
        </article>
      </section>

      <!-- PRÓXIMOS DÍAS -->
      <section class="content-grid">
        <article class="panel">
          <div class="panel-header">
            <div>
              <span class="card-eyebrow"> PLANIFICACIÓN </span>

              <h3>Próximos días</h3>
            </div>

            <button class="text-action">
              Ver planificación

              <ChevronRight :size="16" />
            </button>
          </div>

          <div class="days-list">
            <div v-for="day in summary.nextDays" :key="day.date" class="day-item">
              <div class="day-item__date">
                <CalendarDays :size="18" />
              </div>

              <div class="day-item__description">
                <strong>
                  {{ day.label }}
                </strong>

                <span>
                  {{ day.activity }}
                </span>
              </div>

              <div class="day-item__amount">
                <span> Normal </span>

                <strong>
                  {{ centsToCurrency(day.recommendedCents) }}
                </strong>

                <small>
                  máx.
                  {{ centsToCurrency(day.maximumRecommendedCents) }}
                </small>
              </div>
            </div>
          </div>
        </article>

        <!-- RESUMEN REAL -->
        <article class="panel">
          <div class="panel-header">
            <div>
              <span class="card-eyebrow"> ESTE CICLO </span>

              <h3>Resumen financiero</h3>
            </div>
          </div>

          <div class="summary-list">
            <div class="summary-row">
              <div>
                <span class="summary-dot summary-dot--balance" />

                <div>
                  <strong> Saldo actual </strong>

                  <span> Disponible en este momento </span>
                </div>
              </div>

              <strong class="summary-amount">
                {{ centsToCurrency(summary.currentBalanceCents) }}
              </strong>
            </div>

            <div class="summary-row">
              <div>
                <span class="summary-dot summary-dot--saving" />

                <div>
                  <strong> Ahorro </strong>

                  <span> Protegido </span>
                </div>
              </div>

              <strong class="summary-amount">
                -{{ centsToCurrency(summary.savingsTargetCents) }}
              </strong>
            </div>

            <div class="summary-row">
              <div>
                <span class="summary-dot summary-dot--committed" />

                <div>
                  <strong> Compromisos </strong>

                  <span> Pendientes </span>
                </div>
              </div>

              <strong class="summary-amount">
                -{{ centsToCurrency(summary.upcomingCommitmentsCents) }}
              </strong>
            </div>

            <div class="summary-row">
              <div>
                <span class="summary-dot summary-dot--variable" />

                <div>
                  <strong> Variables </strong>

                  <span> Reserva restante </span>
                </div>
              </div>

              <strong class="summary-amount">
                -{{ centsToCurrency(summary.variableReserveCents) }}
              </strong>
            </div>

            <div class="summary-divider" />

            <div class="summary-row summary-row--total">
              <div>
                <span class="summary-dot summary-dot--available" />

                <div>
                  <strong> Dinero tranquilo </strong>

                  <span> Disponible real </span>
                </div>
              </div>

              <strong
                class="summary-amount"
                :class="{
                  negative: summary.distributableCents < 0,
                }"
              >
                {{ centsToCurrency(summary.distributableCents) }}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <!-- CONSEJO -->
      <section class="insight-card" :class="`insight-card--${summary.riskLevel}`">
        <div class="insight-card__icon">
          <BellRing :size="21" />
        </div>

        <div class="insight-card__content">
          <strong> Consejo de Nivela </strong>

          <p>
            {{ advice }}
          </p>
        </div>

        <div v-if="summary.riskLevel === 'low'" class="insight-trend positive">
          <ArrowDownRight :size="17" />
          Riesgo estable
        </div>

        <div v-else class="insight-trend">
          <ArrowUpRight :size="17" />
          Requiere atención
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  animation: dashboard-enter 0.4s ease-out;
}

@keyframes dashboard-enter {
  from {
    opacity: 0;
    transform: translateY(7px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dashboard-state {
  display: flex;
  min-height: 440px;

  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: 13px;

  color: #64748b;
}

.dashboard-state strong {
  color: #334155;
  font-size: 13px;
}

.dashboard-state span {
  font-size: 10px;
}

.dashboard-state--error {
  color: #ef4444;
}

.dashboard-state button {
  display: flex;
  min-height: 40px;

  align-items: center;
  gap: 7px;

  padding: 0 15px;

  border: 0;
  border-radius: 11px;

  background: #3b82f6;
  color: white;

  cursor: pointer;
}

.dashboard-header {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 24px;

  margin-bottom: 26px;
}

.eyebrow,
.card-eyebrow {
  display: block;

  margin-bottom: 7px;

  color: #94a3b8;

  font-size: 10px;
  font-weight: 700;

  letter-spacing: 1.2px;
}

.dashboard-header h1 {
  margin: 0;

  color: #0f172a;

  font-size: clamp(25px, 3vw, 34px);

  font-weight: 800;

  letter-spacing: -1px;
}

.dashboard-header p {
  margin: 7px 0 0;

  color: #64748b;

  font-size: 13px;
}

.cycle-pill {
  display: flex;

  align-items: center;

  gap: 11px;

  padding: 11px 15px;

  border: 1px solid #e6ebf2;
  border-radius: 15px;

  background: white;
  color: #64748b;
}

.cycle-pill div {
  display: flex;
  flex-direction: column;
}

.cycle-pill span {
  font-size: 9px;
}

.cycle-pill strong {
  margin-top: 2px;

  color: #334155;

  font-size: 11px;

  text-transform: capitalize;
}

.hero-grid {
  display: grid;

  grid-template-columns:
    minmax(0, 1.7fr)
    minmax(300px, 0.7fr);

  gap: 18px;
}

.today-card,
.risk-card,
.metric-card,
.panel {
  border: 1px solid #e8edf4;
  background: white;
}

.today-card {
  padding: 26px;

  border-radius: 24px;

  background: radial-gradient(circle at 95% 0%, rgba(59, 130, 246, 0.11), transparent 36%), white;
}

.today-card--danger {
  background: radial-gradient(circle at 95% 0%, rgba(239, 68, 68, 0.08), transparent 36%), white;
}

.today-card__header,
.risk-card__top,
.panel-header {
  display: flex;

  align-items: flex-start;
  justify-content: space-between;

  gap: 18px;
}

.today-card h2,
.risk-card h3,
.panel h3 {
  margin: 0;

  color: #1e293b;

  font-size: 16px;
  font-weight: 700;
}

.status-badge {
  display: flex;

  align-items: center;

  gap: 7px;

  padding: 7px 10px;

  border-radius: 999px;

  font-size: 10px;
  font-weight: 700;
}

.status-badge--low {
  background: #ecfdf3;
  color: #15803d;
}

.status-badge--medium {
  background: #fff7ed;
  color: #d97706;
}

.status-badge--high {
  background: #fff1f2;
  color: #e11d48;
}

.status-dot {
  width: 7px;
  height: 7px;

  border-radius: 50%;

  background: currentColor;
}

.today-money {
  margin-top: 20px;
}

.today-money strong {
  color: #0f172a;

  font-size: clamp(48px, 7vw, 70px);

  font-weight: 800;

  letter-spacing: -3px;
}

.today-description {
  max-width: 560px;

  margin: 13px 0 22px;

  color: #64748b;

  font-size: 12px;
  line-height: 1.7;
}

.today-progress__labels {
  display: flex;

  justify-content: space-between;

  margin-bottom: 8px;

  color: #64748b;

  font-size: 10px;
}

.today-progress__labels strong {
  color: #334155;
  font-size: 11px;
}

.today-progress__labels span {
  color: #94a3b8;
  font-weight: 500;
}

.today-footer {
  display: flex;

  align-items: center;

  gap: 26px;

  margin-top: 21px;
}

.today-footer > div:not(.today-footer__divider) {
  display: flex;
  flex-direction: column;
}

.today-footer span {
  color: #94a3b8;
  font-size: 9px;
}

.today-footer strong {
  margin-top: 3px;

  color: #334155;

  font-size: 14px;
}

.today-footer__divider {
  width: 1px;
  height: 30px;

  background: #e8edf4;
}

.risk-card {
  padding: 24px;

  border-radius: 24px;
}

.risk-icon--low {
  color: #22c55e;
}

.risk-icon--medium {
  color: #f59e0b;
}

.risk-icon--high {
  color: #ef4444;
}

.risk-gauge {
  display: flex;

  justify-content: center;

  margin: 20px 0 12px;
}

.risk-gauge__circle {
  display: grid;

  width: 126px;
  height: 126px;

  place-items: center;

  border-radius: 50%;
}

.risk-gauge__inner {
  display: flex;

  width: 98px;
  height: 98px;

  align-items: baseline;
  justify-content: center;

  padding-top: 31px;

  border-radius: 50%;

  background: white;
}

.risk-gauge__inner strong {
  color: #0f172a;

  font-size: 29px;
  font-weight: 800;
}

.risk-gauge__inner span {
  margin-left: 2px;

  color: #94a3b8;
  font-size: 10px;
}

.risk-state {
  display: flex;

  align-items: center;
  justify-content: center;

  gap: 8px;

  font-size: 11px;
  font-weight: 700;
}

.risk-state--low {
  color: #15803d;
}

.risk-state--medium {
  color: #d97706;
}

.risk-state--high {
  color: #e11d48;
}

.risk-card p {
  margin: 12px 0 0;

  color: #64748b;

  font-size: 10px;
  line-height: 1.65;

  text-align: center;
}

.metrics-grid {
  display: grid;

  grid-template-columns: repeat(4, minmax(0, 1fr));

  gap: 14px;

  margin-top: 18px;
}

.metric-card {
  display: flex;

  align-items: center;

  gap: 14px;

  padding: 17px;

  border-radius: 18px;
}

.metric-icon {
  display: grid;

  width: 43px;
  height: 43px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 13px;
}

.metric-icon--blue {
  background: #eef5ff;
  color: #3b82f6;
}

.metric-icon--green {
  background: #ecfdf3;
  color: #22c55e;
}

.metric-icon--orange {
  background: #fff7ed;
  color: #f59e0b;
}

.metric-icon--purple {
  background: #f5f3ff;
  color: #8b5cf6;
}

.metric-content {
  display: flex;

  min-width: 0;
  flex-direction: column;
}

.metric-content > span {
  color: #94a3b8;

  font-size: 9px;
}

.metric-content > strong {
  margin-top: 3px;

  color: #1e293b;

  font-size: 17px;
  font-weight: 800;
}

.metric-content small {
  margin-top: 3px;

  color: #94a3b8;

  font-size: 8px;
}

.positive {
  color: #16a34a !important;
}

.negative {
  color: #e11d48 !important;
}

.content-grid {
  display: grid;

  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 18px;

  margin-top: 18px;
}

.panel {
  padding: 22px;

  border-radius: 22px;
}

.text-action {
  display: flex;

  align-items: center;

  gap: 2px;

  border: 0;

  background: transparent;
  color: #3b82f6;

  cursor: pointer;

  font-size: 10px;
  font-weight: 600;
}

.days-list {
  margin-top: 16px;
}

.day-item {
  display: flex;

  align-items: center;

  gap: 12px;

  padding: 12px 0;

  border-bottom: 1px solid #f0f3f7;
}

.day-item:last-child {
  border-bottom: 0;
}

.day-item__date {
  display: grid;

  width: 39px;
  height: 39px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 12px;

  background: #f4f7fb;
  color: #64748b;
}

.day-item__description {
  display: flex;

  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.day-item__description strong {
  color: #334155;

  font-size: 10px;

  text-transform: capitalize;
}

.day-item__description span {
  margin-top: 2px;

  color: #94a3b8;

  font-size: 9px;
}

.day-item__amount {
  display: flex;

  flex-direction: column;

  text-align: right;
}

.day-item__amount span {
  color: #94a3b8;

  font-size: 8px;
}

.day-item__amount strong {
  margin-top: 2px;

  color: #2563eb;

  font-size: 11px;
}

.day-item__amount small {
  margin-top: 1px;

  color: #94a3b8;

  font-size: 7px;
}

.summary-list {
  margin-top: 16px;
}

.summary-row {
  display: flex;

  align-items: center;
  justify-content: space-between;

  padding: 11px 0;
}

.summary-row > div {
  display: flex;

  align-items: center;

  gap: 11px;
}

.summary-row > div > div {
  display: flex;
  flex-direction: column;
}

.summary-row strong {
  color: #334155;

  font-size: 11px;
}

.summary-row span:not(.summary-dot) {
  margin-top: 2px;

  color: #94a3b8;

  font-size: 9px;
}

.summary-dot {
  width: 9px;
  height: 9px;

  flex-shrink: 0;

  border-radius: 50%;
}

.summary-dot--balance {
  background: #3b82f6;
}

.summary-dot--saving {
  background: #22c55e;
}

.summary-dot--committed {
  background: #f59e0b;
}

.summary-dot--variable {
  background: #8b5cf6;
}

.summary-dot--available {
  background: #0ea5e9;
}

.summary-amount {
  font-size: 12px !important;
}

.summary-divider {
  height: 1px;

  margin: 6px 0;

  background: #edf1f5;
}

.summary-row--total {
  padding-top: 15px;
}

.summary-row--total .summary-amount {
  color: #2563eb;

  font-size: 15px !important;

  font-weight: 800;
}

.insight-card {
  display: flex;

  align-items: center;

  gap: 14px;

  margin-top: 18px;
  padding: 17px 19px;

  border-radius: 18px;
}

.insight-card--low {
  border: 1px solid #bbf7d0;

  background: #f0fdf4;
}

.insight-card--medium {
  border: 1px solid #fed7aa;

  background: #fff7ed;
}

.insight-card--high {
  border: 1px solid #fecaca;

  background: #fff5f5;
}

.insight-card__icon {
  display: grid;

  width: 41px;
  height: 41px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 13px;

  background: white;
  color: #3b82f6;
}

.insight-card__content {
  flex: 1;
}

.insight-card__content strong {
  color: #1e3a5f;

  font-size: 11px;
}

.insight-card__content p {
  margin: 3px 0 0;

  color: #64748b;

  font-size: 10px;
  line-height: 1.6;
}

.insight-trend {
  display: flex;

  align-items: center;

  gap: 5px;

  flex-shrink: 0;

  color: #e11d48;

  font-size: 9px;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .dashboard-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .cycle-pill {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .dashboard-header {
    margin-bottom: 18px;
  }

  .dashboard-header h1 {
    font-size: 25px;
  }

  .today-card,
  .risk-card,
  .panel {
    padding: 19px;

    border-radius: 20px;
  }

  .today-money strong {
    font-size: 52px;
  }

  .metrics-grid {
    grid-template-columns: 1fr 1fr;

    gap: 10px;

    margin-top: 13px;
  }

  .metric-card {
    align-items: flex-start;
    flex-direction: column;

    gap: 10px;

    padding: 15px;
  }

  .content-grid {
    gap: 13px;

    margin-top: 13px;
  }

  .insight-card {
    align-items: flex-start;
  }

  .insight-trend {
    display: none;
  }
}

@media (max-width: 380px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
