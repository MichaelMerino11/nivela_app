<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-vue-next'
import { getPlanningSummary, type PlanningSummary } from '@/services/planning'
import { centsToCurrency } from '@/utils/money'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { completeOnboarding } from '@/services/onboarding'

const summary = ref<PlanningSummary | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const router = useRouter()
const authStore = useAuthStore()
const completing = ref(false)

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

const riskDescription = computed(() => {
  if (!summary.value) {
    return ''
  }

  if (summary.value.riskLevel === 'low') {
    return 'Tu planificación tiene margen ' + 'suficiente para mantener tu rutina.'
  }

  if (summary.value.riskLevel === 'medium') {
    return 'Tu dinero alcanza, pero Nivela ' + 'recomienda controlar algunos gastos.'
  }

  if (summary.value.essentialDistributableCents < 0) {
    return 'Tus obligaciones esenciales superan ' + 'el dinero disponible actualmente.'
  }

  return 'Necesitarás reducir gastos flexibles ' + 'para mantener tu objetivo de ahorro.'
})

async function loadSummary() {
  errorMessage.value = ''

  try {
    loading.value = true

    summary.value = await getPlanningSummary()
  } catch (error: any) {
    console.error('ERROR PLANIFICACIÓN:', error)

    errorMessage.value = error?.message || 'No pudimos calcular tu planificación.'
  } finally {
    loading.value = false
  }
}

async function finishOnboarding() {
  errorMessage.value = ''

  try {
    completing.value = true

    await completeOnboarding()

    await authStore.loadUserData()

    await router.replace('/')
  } catch (error: any) {
    console.error('ERROR FINALIZANDO ONBOARDING:', error)

    errorMessage.value = error?.message || 'No pudimos finalizar la configuración.'
  } finally {
    completing.value = false
  }
}

onMounted(loadSummary)
</script>

<template>
  <div class="summary-wrapper">
    <section v-if="loading" class="loading-card">
      <v-progress-circular indeterminate color="primary" :size="32" :width="3" />

      <strong> Construyendo tu planificación... </strong>

      <span> Nivela está analizando tu ciclo, compromisos y rutina. </span>
    </section>

    <section v-else-if="errorMessage" class="error-card">
      <AlertTriangle :size="28" />

      <h2>No pudimos calcular tu plan</h2>

      <p>
        {{ errorMessage }}
      </p>

      <button type="button" @click="loadSummary">
        <RefreshCw :size="17" />
        Intentar nuevamente
      </button>
    </section>

    <template v-else-if="summary">
      <header class="summary-heading">
        <div>
          <span class="eyebrow"> PASO 5 · TU PLAN </span>

          <h1>Esta es tu situación real</h1>

          <p>Nivela ya combinó tu saldo, ahorro, obligaciones, variables y rutina semanal.</p>
        </div>

        <div class="risk-pill" :class="`risk-pill--${summary.riskLevel}`">
          <span />

          {{ riskLabel }}
        </div>
      </header>

      <!-- CÁLCULO PRINCIPAL -->
      <section class="money-flow">
        <article>
          <div class="money-icon blue">
            <Wallet :size="20" />
          </div>

          <span> Saldo actual </span>

          <strong>
            {{ centsToCurrency(summary.currentBalanceCents) }}
          </strong>
        </article>

        <div class="operator">−</div>

        <article>
          <div class="money-icon green">
            <PiggyBank :size="20" />
          </div>

          <span> Ahorro protegido </span>

          <strong>
            {{ centsToCurrency(summary.savingsTargetCents) }}
          </strong>
        </article>

        <div class="operator">−</div>

        <article>
          <div class="money-icon orange">
            <ReceiptText :size="20" />
          </div>

          <span> Compromisos pendientes </span>

          <strong>
            {{ centsToCurrency(summary.upcomingCommitmentsCents) }}
          </strong>
        </article>

        <div class="operator">−</div>

        <article>
          <div class="money-icon purple">
            <ShieldCheck :size="20" />
          </div>

          <span> Variables reservadas </span>

          <strong>
            {{ centsToCurrency(summary.variableReserveCents) }}
          </strong>
        </article>
      </section>

      <!-- DINERO TRANQUILO -->
      <section
        class="tranquil-card"
        :class="{
          'tranquil-card--negative': summary.distributableCents < 0,
        }"
      >
        <div>
          <span> DINERO TRANQUILO </span>

          <strong>
            {{ centsToCurrency(summary.distributableCents) }}
          </strong>

          <p>Es el dinero disponible para tu rutina diaria después de proteger todo lo anterior.</p>
        </div>

        <div class="tranquil-meta">
          <div>
            <span> Días restantes </span>

            <strong>
              {{ summary.daysRemaining }}
            </strong>
          </div>

          <div>
            <span> Promedio disponible </span>

            <strong>
              {{ centsToCurrency(summary.dailyAverageCents) }}
            </strong>
          </div>
        </div>
      </section>

      <!-- RIESGO -->
      <section class="risk-card">
        <div class="risk-score" :class="`risk-score--${summary.riskLevel}`">
          <div>
            <strong>
              {{ summary.riskScore }}
            </strong>

            <span> /100 </span>
          </div>
        </div>

        <div class="risk-content">
          <span class="risk-eyebrow"> MEDIDOR DE RIESGO </span>

          <h3>
            {{ riskLabel }}
          </h3>

          <p>
            {{ riskDescription }}
          </p>
        </div>
      </section>

      <!-- PROYECCIÓN -->
      <section class="projection-grid">
        <article>
          <span> Tu rutina habitual necesitaría </span>

          <strong>
            {{ centsToCurrency(summary.routineNeedCents) }}
          </strong>
        </article>

        <article>
          <span> Proyección después de tu rutina </span>

          <strong
            :class="{
              negative: summary.projectedSurplusCents < 0,
            }"
          >
            {{ centsToCurrency(summary.projectedSurplusCents) }}
          </strong>
        </article>

        <article>
          <span> Variables que podrían recortarse </span>

          <strong>
            {{ centsToCurrency(summary.adjustableVariableCents) }}
          </strong>
        </article>
      </section>

      <!-- PRÓXIMOS DÍAS -->
      <section class="calendar-card">
        <header>
          <div>
            <span class="eyebrow"> PRÓXIMOS 7 DÍAS </span>

            <h3>Primer presupuesto diario</h3>
          </div>

          <CalendarDays :size="21" />
        </header>

        <div class="days-list">
          <article v-for="day in summary.nextDays" :key="day.date" class="day-row">
            <div>
              <strong>
                {{ day.label }}
              </strong>

              <span>
                {{ day.activity }}
              </span>
            </div>

            <div class="day-budget">
              <span> Recomendado </span>

              <strong>
                {{ centsToCurrency(day.recommendedCents) }}
              </strong>
            </div>
          </article>
        </div>
      </section>

      <section class="final-note final-note--finish">
        <CheckCircle2 :size="21" />

        <div class="final-note__content">
          <strong> Tu primera planificación está lista </strong>

          <p>
            Nivela ya tiene suficiente información para comenzar a administrar tu ciclo financiero.
          </p>
        </div>

        <button
          type="button"
          class="finish-button"
          :disabled="completing"
          @click="finishOnboarding"
        >
          {{ completing ? 'Preparando Nivela...' : 'Entrar a mi Dashboard' }}
        </button>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.summary-wrapper {
  margin-top: 34px;
}

.loading-card,
.error-card {
  display: flex;
  min-height: 340px;

  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: 10px;

  padding: 30px;

  border: 1px solid #e5eaf1;
  border-radius: 28px;

  background: white;

  text-align: center;
}

.loading-card strong,
.error-card h2 {
  margin-top: 10px;

  color: #1e293b;

  font-size: 15px;
}

.loading-card span,
.error-card p {
  max-width: 420px;

  color: #64748b;

  font-size: 10px;
  line-height: 1.6;
}

.error-card {
  color: #ef4444;
}

.error-card button {
  display: flex;
  min-height: 42px;

  align-items: center;
  gap: 7px;

  margin-top: 10px;
  padding: 0 16px;

  border: 0;
  border-radius: 12px;

  background: #3b82f6;
  color: white;

  cursor: pointer;

  font-size: 9px;
  font-weight: 700;
}

.summary-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  gap: 20px;

  padding: 31px;

  border: 1px solid #e5eaf1;
  border-radius: 26px;

  background: white;
}

.eyebrow,
.risk-eyebrow {
  display: block;

  color: #3b82f6;

  font-size: 9px;
  font-weight: 800;

  letter-spacing: 1.5px;
}

.summary-heading h1 {
  margin: 8px 0 0;

  color: #0f172a;

  font-size: 31px;
  font-weight: 800;

  letter-spacing: -1px;
}

.summary-heading p {
  max-width: 580px;

  margin: 9px 0 0;

  color: #64748b;

  font-size: 10px;
  line-height: 1.65;
}

.risk-pill {
  display: flex;

  align-items: center;
  gap: 7px;

  padding: 8px 11px;

  border-radius: 999px;

  font-size: 9px;
  font-weight: 700;
}

.risk-pill span {
  width: 7px;
  height: 7px;

  border-radius: 50%;

  background: currentColor;
}

.risk-pill--low {
  background: #ecfdf3;
  color: #16a34a;
}

.risk-pill--medium {
  background: #fff7ed;
  color: #d97706;
}

.risk-pill--high {
  background: #fff1f2;
  color: #e11d48;
}

.money-flow {
  display: grid;

  grid-template-columns:
    1fr auto
    1fr auto
    1fr auto
    1fr;

  gap: 9px;

  align-items: center;

  margin-top: 17px;
}

.money-flow article {
  min-width: 0;

  padding: 17px;

  border: 1px solid #e8edf4;
  border-radius: 18px;

  background: white;
}

.money-icon {
  display: grid;

  width: 38px;
  height: 38px;

  place-items: center;

  margin-bottom: 13px;

  border-radius: 12px;
}

.money-icon.blue {
  background: #eef5ff;
  color: #3b82f6;
}

.money-icon.green {
  background: #ecfdf3;
  color: #16a34a;
}

.money-icon.orange {
  background: #fff7ed;
  color: #f59e0b;
}

.money-icon.purple {
  background: #f5f3ff;
  color: #8b5cf6;
}

.money-flow article > span {
  color: #94a3b8;

  font-size: 8px;
}

.money-flow article > strong {
  display: block;

  margin-top: 3px;

  color: #1e293b;

  font-size: 14px;
}

.operator {
  color: #94a3b8;

  font-size: 18px;
  font-weight: 400;
}

.tranquil-card {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 20px;

  margin-top: 17px;
  padding: 25px;

  border: 1px solid #bfdbfe;
  border-radius: 22px;

  background: linear-gradient(100deg, #eff6ff, #f8fbff);
}

.tranquil-card > div:first-child > span {
  color: #3b82f6;

  font-size: 8px;
  font-weight: 800;

  letter-spacing: 1.3px;
}

.tranquil-card > div:first-child > strong {
  display: block;

  margin-top: 4px;

  color: #0f172a;

  font-size: 34px;
  font-weight: 800;

  letter-spacing: -1.5px;
}

.tranquil-card p {
  max-width: 520px;

  margin: 5px 0 0;

  color: #64748b;

  font-size: 9px;
  line-height: 1.6;
}

.tranquil-card--negative {
  border-color: #fecaca;

  background: linear-gradient(100deg, #fff1f2, #fffafa);
}

.tranquil-meta {
  display: flex;

  gap: 10px;
}

.tranquil-meta > div {
  display: flex;
  min-width: 125px;

  flex-direction: column;

  padding: 12px;

  border-radius: 13px;

  background: rgba(255, 255, 255, 0.8);
}

.tranquil-meta span {
  color: #94a3b8;

  font-size: 8px;
}

.tranquil-meta strong {
  margin-top: 3px;

  color: #334155;

  font-size: 12px;
}

.risk-card {
  display: flex;
  align-items: center;

  gap: 20px;

  margin-top: 17px;
  padding: 22px;

  border: 1px solid #e5eaf1;
  border-radius: 21px;

  background: white;
}

.risk-score {
  display: grid;

  width: 86px;
  height: 86px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 50%;
}

.risk-score > div {
  display: flex;

  align-items: baseline;
}

.risk-score strong {
  font-size: 25px;
  font-weight: 800;
}

.risk-score span {
  margin-left: 2px;

  font-size: 8px;
}

.risk-score--low {
  background: #ecfdf3;
  color: #16a34a;
}

.risk-score--medium {
  background: #fff7ed;
  color: #d97706;
}

.risk-score--high {
  background: #fff1f2;
  color: #e11d48;
}

.risk-content h3 {
  margin: 5px 0 0;

  color: #1e293b;

  font-size: 15px;
}

.risk-content p {
  margin: 5px 0 0;

  color: #64748b;

  font-size: 9px;
  line-height: 1.6;
}

.projection-grid {
  display: grid;

  grid-template-columns: repeat(3, 1fr);

  gap: 11px;

  margin-top: 17px;
}

.projection-grid article {
  display: flex;
  flex-direction: column;

  padding: 16px;

  border: 1px solid #e8edf4;
  border-radius: 16px;

  background: white;
}

.projection-grid span {
  color: #94a3b8;

  font-size: 8px;
}

.projection-grid strong {
  margin-top: 4px;

  color: #1e293b;

  font-size: 14px;
}

.negative {
  color: #e11d48 !important;
}

.calendar-card {
  margin-top: 17px;
  padding: 22px;

  border: 1px solid #e5eaf1;
  border-radius: 21px;

  background: white;
}

.calendar-card > header {
  display: flex;

  align-items: center;
  justify-content: space-between;

  color: #3b82f6;
}

.calendar-card h3 {
  margin: 5px 0 0;

  color: #1e293b;

  font-size: 15px;
}

.days-list {
  margin-top: 15px;
}

.day-row {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 15px;

  padding: 12px 0;

  border-bottom: 1px solid #f0f3f7;
}

.day-row:last-child {
  border-bottom: 0;
}

.day-row > div:first-child {
  display: flex;
  flex-direction: column;
}

.day-row > div:first-child strong {
  color: #334155;

  font-size: 10px;
  text-transform: capitalize;
}

.day-row > div:first-child span {
  margin-top: 2px;

  color: #94a3b8;

  font-size: 8px;
}

.day-budget {
  display: flex;
  flex-direction: column;

  text-align: right;
}

.day-budget span {
  color: #94a3b8;

  font-size: 8px;
}

.day-budget strong {
  margin-top: 2px;

  color: #2563eb;

  font-size: 12px;
}

.final-note {
  display: flex;
  align-items: flex-start;

  gap: 11px;

  margin-top: 17px;
  padding: 16px;

  border: 1px solid #bbf7d0;
  border-radius: 16px;

  background: #f0fdf4;
  color: #16a34a;
}

.final-note strong {
  color: #166534;

  font-size: 10px;
}

.final-note p {
  margin: 3px 0 0;

  color: #64748b;

  font-size: 9px;
  line-height: 1.6;
}

.final-note--finish {
  align-items: center;
}

.final-note__content {
  flex: 1;
}

.finish-button {
  min-height: 42px;

  padding: 0 16px;

  flex-shrink: 0;

  border: 0;
  border-radius: 12px;

  background: #16a34a;
  color: white;

  cursor: pointer;

  font-family: inherit;
  font-size: 9px;
  font-weight: 700;
}

.finish-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

@media (max-width: 600px) {
  .final-note--finish {
    align-items: flex-start;
    flex-direction: column;
  }

  .finish-button {
    width: 100%;
  }
}

@media (max-width: 950px) {
  .money-flow {
    grid-template-columns: repeat(2, 1fr);
  }

  .operator {
    display: none;
  }
}

@media (max-width: 700px) {
  .summary-heading,
  .tranquil-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .tranquil-meta {
    width: 100%;
  }

  .tranquil-meta > div {
    flex: 1;
  }

  .projection-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .summary-heading {
    padding: 22px 18px;
  }

  .summary-heading h1 {
    font-size: 26px;
  }

  .money-flow {
    grid-template-columns: 1fr;
  }

  .tranquil-meta {
    flex-direction: column;
  }

  .risk-card {
    align-items: flex-start;
  }
}
</style>
