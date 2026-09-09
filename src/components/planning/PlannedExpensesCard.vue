<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AlertTriangle, CalendarDays, PiggyBank, Sparkles, X, CheckCircle2 } from 'lucide-vue-next'
import {
  cancelPlannedExpense,
  getPlannedExpenses,
  type PlannedExpenseItem,
} from '@/services/planned-expenses'
import { centsToCurrency } from '@/utils/money'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import CompletePlannedExpenseDialog from '@/components/planning/CompletePlannedExpenseDialog.vue'

const props = defineProps<{
  refreshKey: number
}>()

const emit = defineEmits<{
  (e: 'changed'): void
}>()

const plans = ref<PlannedExpenseItem[]>([])
const loading = ref(true)
const cancellingId = ref<string | null>(null)
const errorMessage = ref('')
const cancelDialog = ref(false)
const planToCancel = ref<PlannedExpenseItem | null>(null)
const paymentDialog = ref(false)

const planToPay = ref<PlannedExpenseItem | null>(null)
const activePlans = computed(() => plans.value.filter((item) => item.status === 'planned'))
const reservedTotal = computed(() =>
  activePlans.value
    .filter((item) => item.reserve_funds)
    .reduce((total, item) => total + item.amount_cents, 0),
)

function formatPlanDate(value: string): string {
  return format(parseISO(value), "d 'de' MMMM", {
    locale: es,
  })
}

async function loadPlans() {
  errorMessage.value = ''

  try {
    loading.value = true

    plans.value = await getPlannedExpenses()
  } catch (error: any) {
    console.error('ERROR CARGANDO PLANIFICADOS:', error)

    errorMessage.value = error?.message || 'No pudimos cargar tus gastos planificados.'
  } finally {
    loading.value = false
  }
}

function openPayment(plan: PlannedExpenseItem) {
  planToPay.value = plan

  paymentDialog.value = true
}

async function handlePaymentSaved() {
  await loadPlans()

  emit('changed')

  planToPay.value = null
}

function askCancel(plan: PlannedExpenseItem) {
  planToCancel.value = plan

  cancelDialog.value = true
}

async function confirmCancel() {
  if (!planToCancel.value) {
    return
  }

  try {
    cancellingId.value = planToCancel.value.id

    await cancelPlannedExpense(planToCancel.value.id)

    cancelDialog.value = false
    planToCancel.value = null

    await loadPlans()

    emit('changed')
  } catch (error: any) {
    console.error('ERROR CANCELANDO PLANIFICADO:', error)

    errorMessage.value = error?.message || 'No pudimos cancelar este gasto.'
  } finally {
    cancellingId.value = null
  }
}

watch(
  () => props.refreshKey,

  async () => {
    await loadPlans()
  },
)

watch(paymentDialog, (open) => {
  if (!open) {
    planToPay.value = null
  }
})

onMounted(loadPlans)
</script>

<template>
  <section class="planned-card">
    <div class="planned-header">
      <div>
        <span class="eyebrow"> PRÓXIMOS GASTOS </span>

        <h2>Gastos planificados</h2>

        <p>Dinero que Nivela ya sabe que podrías necesitar.</p>
      </div>

      <div class="reserved-summary">
        <PiggyBank :size="17" />

        <div>
          <span> Reservado </span>

          <strong>
            {{ centsToCurrency(reservedTotal) }}
          </strong>
        </div>
      </div>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mx-5 mt-4">
      {{ errorMessage }}
    </v-alert>

    <div v-if="loading" class="state-box">
      <v-progress-circular indeterminate color="primary" :size="30" :width="3" />

      <span> Cargando gastos planificados... </span>
    </div>

    <div v-else-if="activePlans.length === 0" class="state-box">
      <div class="empty-icon">
        <CalendarDays :size="23" />
      </div>

      <strong> No tienes gastos planificados </strong>

      <span> Cuando planifiques una compra, aparecerá aquí. </span>
    </div>

    <div v-else class="plans-list">
      <article v-for="plan in activePlans" :key="plan.id" class="plan-row">
        <div class="plan-icon">
          <CalendarDays :size="18" />
        </div>

        <div class="plan-main">
          <div class="plan-title">
            <strong>
              {{ plan.name }}
            </strong>

            <span v-if="plan.is_exceptional" class="exception-badge">
              <Sparkles :size="11" />

              Excepcional
            </span>
          </div>

          <div class="plan-meta">
            <span>
              {{ formatPlanDate(plan.planned_date) }}
            </span>

            <span>•</span>

            <span v-if="plan.reserve_funds" class="reserved-label"> Dinero reservado </span>

            <span v-else> Sin reserva </span>
          </div>

          <p v-if="plan.notes" class="notes">
            {{ plan.notes }}
          </p>
        </div>

        <div class="plan-amount">
          <strong>
            {{ centsToCurrency(plan.amount_cents) }}
          </strong>
        </div>

        <v-btn
          color="success"
          variant="tonal"
          size="small"
          class="paid-button"
          @click="openPayment(plan)"
        >
          <CheckCircle2 :size="14" class="mr-1" />

          Ya lo pagué
        </v-btn>

        <v-btn
          icon
          variant="text"
          size="small"
          color="error"
          :loading="cancellingId === plan.id"
          @click="askCancel(plan)"
        >
          <X :size="16" />
        </v-btn>
      </article>
    </div>

    <!-- CANCELAR -->
    <v-dialog v-model="cancelDialog" max-width="430">
      <v-card rounded="xl" class="cancel-dialog">
        <div class="cancel-icon">
          <AlertTriangle :size="24" />
        </div>

        <h3>¿Cancelar este gasto?</h3>

        <p>Nivela dejará de reservar este dinero y recalculará tu planificación.</p>

        <div v-if="planToCancel" class="cancel-preview">
          <span>
            {{ planToCancel.name }}
          </span>

          <strong>
            {{ centsToCurrency(planToCancel.amount_cents) }}
          </strong>
        </div>

        <div class="cancel-actions">
          <v-btn variant="text" @click="cancelDialog = false"> Volver </v-btn>

          <v-btn
            color="error"
            variant="flat"
            :loading="cancellingId !== null"
            @click="confirmCancel"
          >
            Cancelar gasto
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
    <CompletePlannedExpenseDialog
      v-model="paymentDialog"
      :plan="planToPay"
      @saved="handlePaymentSaved"
    />
  </section>
</template>

<style scoped lang="scss">
.planned-card {
  margin-top: 16px;

  overflow: hidden;

  border: 1px solid #e8edf4;

  border-radius: 20px;

  background: white;
}

.planned-header {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 20px;

  padding: 20px 21px;

  border-bottom: 1px solid #edf1f5;
}

.eyebrow {
  display: block;

  margin-bottom: 5px;

  color: #94a3b8;

  font-size: 9px;
  font-weight: 700;

  letter-spacing: 1.2px;
}

.planned-header h2 {
  margin: 0;

  color: #1e293b;

  font-size: 15px;
}

.planned-header p {
  margin: 5px 0 0;

  color: #64748b;

  font-size: 9px;
}

.reserved-summary {
  display: flex;

  align-items: center;

  gap: 9px;

  padding: 10px 13px;

  border-radius: 13px;

  background: #eff6ff;
  color: #3b82f6;
}

.reserved-summary div {
  display: flex;
  flex-direction: column;
}

.reserved-summary span {
  color: #64748b;

  font-size: 7px;
}

.reserved-summary strong {
  color: #2563eb;

  font-size: 12px;
}

.state-box {
  display: flex;

  min-height: 170px;

  align-items: center;
  justify-content: center;

  flex-direction: column;

  gap: 9px;

  color: #94a3b8;
}

.state-box strong {
  color: #475569;

  font-size: 10px;
}

.state-box span {
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

.plans-list {
  padding: 5px 18px;
}

.plan-row {
  display: flex;

  align-items: center;

  gap: 12px;

  padding: 14px 3px;

  border-bottom: 1px solid #edf1f5;
}

.plan-row:last-child {
  border-bottom: 0;
}

.plan-icon {
  display: grid;

  width: 39px;
  height: 39px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 12px;

  background: #f1f5f9;
  color: #64748b;
}

.plan-main {
  min-width: 0;
  flex: 1;
}

.plan-title {
  display: flex;

  align-items: center;

  gap: 7px;
}

.plan-title > strong {
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

.plan-meta {
  display: flex;

  flex-wrap: wrap;

  gap: 5px;

  margin-top: 4px;

  color: #94a3b8;

  font-size: 8px;
}

.reserved-label {
  color: #2563eb;
}

.notes {
  margin: 5px 0 0;

  color: #64748b;

  font-size: 8px;
  font-style: italic;
}

.plan-amount {
  flex-shrink: 0;
}

.plan-amount strong {
  color: #334155;

  font-size: 12px;
}

.cancel-dialog {
  padding: 25px;
}

.cancel-icon {
  display: grid;

  width: 48px;
  height: 48px;

  place-items: center;

  margin-bottom: 15px;

  border-radius: 15px;

  background: #fff1f2;
  color: #e11d48;
}

.cancel-dialog h3 {
  margin: 0;

  color: #1e293b;

  font-size: 17px;
}

.cancel-dialog p {
  margin: 8px 0 16px;

  color: #64748b;

  font-size: 10px;
  line-height: 1.6;
}

.cancel-preview {
  display: flex;

  align-items: center;
  justify-content: space-between;

  padding: 11px 13px;

  border-radius: 12px;

  background: #f8fafc;
}

.cancel-preview span {
  color: #64748b;

  font-size: 10px;
}

.cancel-preview strong {
  color: #334155;

  font-size: 12px;
}

.cancel-actions {
  display: flex;

  justify-content: flex-end;

  gap: 8px;

  margin-top: 18px;
}

.paid-button {
  flex-shrink: 0;
  text-transform: none;
  font-size: 9px;
}

@media (max-width: 650px) {
  .planned-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .paid-button {
    align-self: center;
  }

  .reserved-summary {
    width: 100%;
  }

  .plan-row {
    align-items: flex-start;
  }

  .plan-amount {
    margin-left: auto;
  }
}
</style>
