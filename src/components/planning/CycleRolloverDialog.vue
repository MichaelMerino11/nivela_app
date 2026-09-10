<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, CalendarDays, CheckCircle2, WalletCards } from 'lucide-vue-next'
import { addMonths, endOfMonth, format, getDate, parseISO, setDate, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  getCycleRolloverContext,
  rolloverFinancialCycle,
  type CycleRolloverContext,
  type RolloverFinancialCycleResult,
} from '@/services/cycle-rollover'
import { centsToCurrency, moneyToCents } from '@/utils/money'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void

  (e: 'completed', result: RolloverFinancialCycleResult): void
}>()

const context = ref<CycleRolloverContext | null>(null)

const loading = ref(false)

const saving = ref(false)

const errorMessage = ref('')

const salaryReceived = ref('')

const totalBalance = ref('')

const savingsTarget = ref('')

const receivedDate = ref('')

const nextPaydayDate = ref('')

const confirmed = ref(false)

function getToday(): string {
  const now = new Date()

  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)

  return local.toISOString().slice(0, 10)
}

function safeMoneyToCents(value: string): number | null {
  try {
    if (!value.trim()) {
      return null
    }

    const cents = moneyToCents(value)

    if (!Number.isInteger(cents)) {
      return null
    }

    return cents
  } catch {
    return null
  }
}

function calculateNextPayday(dateValue: string, usualPayDay: number | null): string {
  const received = parseISO(dateValue)

  const nextMonth = addMonths(received, 1)

  const desiredDay = usualPayDay ?? getDate(received)

  const maximumDay = getDate(endOfMonth(nextMonth))

  const finalDate = setDate(nextMonth, Math.min(desiredDay, maximumDay))

  return format(finalDate, 'yyyy-MM-dd')
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }

  return format(parseISO(value), "d 'de' MMMM 'de' yyyy", {
    locale: es,
  })
}

const salaryCents = computed(() => safeMoneyToCents(salaryReceived.value))

const totalBalanceCents = computed(() => safeMoneyToCents(totalBalance.value))

const savingsTargetCents = computed(() => safeMoneyToCents(savingsTarget.value))

const closingBalanceCents = computed(() => {
  if (salaryCents.value === null || totalBalanceCents.value === null) {
    return null
  }

  return totalBalanceCents.value - salaryCents.value
})

const newCycleEndDate = computed(() => {
  if (!nextPaydayDate.value) {
    return ''
  }

  return format(subDays(parseISO(nextPaydayDate.value), 1), 'yyyy-MM-dd')
})

const canSubmit = computed(
  () =>
    confirmed.value &&
    salaryCents.value !== null &&
    salaryCents.value > 0 &&
    totalBalanceCents.value !== null &&
    totalBalanceCents.value >= 0 &&
    savingsTargetCents.value !== null &&
    savingsTargetCents.value >= 0 &&
    Boolean(receivedDate.value) &&
    receivedDate.value <= getToday() &&
    Boolean(nextPaydayDate.value) &&
    nextPaydayDate.value > receivedDate.value,
)

function resetForm() {
  context.value = null

  errorMessage.value = ''

  salaryReceived.value = ''
  totalBalance.value = ''
  savingsTarget.value = ''

  receivedDate.value = getToday()

  nextPaydayDate.value = ''

  confirmed.value = false
}

function closeDialog() {
  if (saving.value) {
    return
  }

  emit('update:modelValue', false)
}

async function loadContext() {
  context.value = await getCycleRolloverContext()

  salaryReceived.value = (context.value.salaryCents / 100).toFixed(2)

  savingsTarget.value = (context.value.savingsTargetCents / 100).toFixed(2)

  nextPaydayDate.value = calculateNextPayday(receivedDate.value, context.value.usualPayDay)
}

async function confirmRollover() {
  errorMessage.value = ''

  try {
    if (!context.value) {
      throw new Error('No pudimos obtener el ciclo actual.')
    }

    if (salaryCents.value === null || salaryCents.value <= 0) {
      throw new Error('Ingresa el sueldo que realmente recibiste.')
    }

    if (totalBalanceCents.value === null || totalBalanceCents.value < 0) {
      throw new Error('Ingresa tu saldo total disponible.')
    }

    if (savingsTargetCents.value === null || savingsTargetCents.value < 0) {
      throw new Error('La meta de ahorro no es válida.')
    }

    if (!receivedDate.value) {
      throw new Error('Selecciona la fecha en que recibiste el sueldo.')
    }

    if (receivedDate.value > getToday()) {
      throw new Error('No puedes registrar un sueldo que todavía no has recibido.')
    }

    if (!nextPaydayDate.value) {
      throw new Error('Selecciona la próxima fecha de pago.')
    }

    if (nextPaydayDate.value <= receivedDate.value) {
      throw new Error('La próxima fecha de pago debe ser posterior.')
    }

    if (!confirmed.value) {
      throw new Error('Confirma que el sueldo ya fue recibido.')
    }

    saving.value = true

    const result = await rolloverFinancialCycle({
      salaryReceivedCents: salaryCents.value,

      totalBalanceCents: totalBalanceCents.value,

      receivedDate: receivedDate.value,

      nextPaydayDate: nextPaydayDate.value,

      savingsTargetCents: savingsTargetCents.value,
    })

    emit('completed', result)

    emit('update:modelValue', false)
  } catch (error: any) {
    console.error('ERROR CAMBIANDO CICLO:', error)

    errorMessage.value = error?.message || 'No pudimos iniciar el nuevo ciclo.'
  } finally {
    saving.value = false
  }
}

watch(receivedDate, (value) => {
  if (!value || !context.value) {
    return
  }

  nextPaydayDate.value = calculateNextPayday(value, context.value.usualPayDay)

  confirmed.value = false
})

watch(
  () => props.modelValue,

  async (open) => {
    if (!open) {
      return
    }

    resetForm()

    try {
      loading.value = true

      await loadContext()
    } catch (error: any) {
      console.error('ERROR CARGANDO CAMBIO DE CICLO:', error)

      errorMessage.value = error?.message || 'No pudimos cargar tu ciclo actual.'
    } finally {
      loading.value = false
    }
  },
)
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="650"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card rounded="xl" class="rollover-dialog">
      <div class="dialog-header">
        <div class="dialog-icon">
          <WalletCards :size="23" />
        </div>

        <div>
          <span> NUEVO CICLO </span>

          <h2>Recibí mi sueldo</h2>

          <p>Cierra el ciclo anterior y comienza uno nuevo usando tu saldo real.</p>
        </div>
      </div>

      <v-divider />

      <div v-if="loading" class="loading-state">
        <v-progress-circular indeterminate color="primary" />

        <span> Preparando tu nuevo ciclo... </span>
      </div>

      <div v-else class="dialog-content">
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <div v-if="context" class="current-cycle">
          <CalendarDays :size="17" />

          <div>
            <span> Ciclo que vas a cerrar </span>

            <strong>
              {{ formatDate(context.startDate) }}
              →
              {{ formatDate(context.endDate) }}
            </strong>
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label> Sueldo recibido </label>

            <v-text-field
              v-model="salaryReceived"
              prefix="$"
              inputmode="decimal"
              variant="outlined"
              density="comfortable"
              hide-details
            />

            <small> Lo que realmente te depositaron. </small>
          </div>

          <div class="field">
            <label> Saldo total disponible </label>

            <v-text-field
              v-model="totalBalance"
              prefix="$"
              placeholder="0.00"
              inputmode="decimal"
              variant="outlined"
              density="comfortable"
              hide-details
            />

            <small> Todo el dinero que tienes justo después de recibir el sueldo. </small>
          </div>

          <div class="field">
            <label> Fecha en que recibiste el sueldo </label>

            <v-text-field
              v-model="receivedDate"
              type="date"
              :max="getToday()"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>

          <div class="field">
            <label> Próxima fecha de pago </label>

            <v-text-field
              v-model="nextPaydayDate"
              type="date"
              :min="receivedDate"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>

          <div class="field full">
            <label> Meta de ahorro para el nuevo ciclo </label>

            <v-text-field
              v-model="savingsTarget"
              prefix="$"
              inputmode="decimal"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>
        </div>

        <section class="preview-card">
          <span class="preview-eyebrow"> VISTA PREVIA </span>

          <h3>Así quedará el cambio</h3>

          <div class="preview-grid">
            <div>
              <span> Saldo que quedó </span>

              <strong
                :class="{
                  negative: closingBalanceCents !== null && closingBalanceCents < 0,
                }"
              >
                {{ closingBalanceCents === null ? '—' : centsToCurrency(closingBalanceCents) }}
              </strong>

              <small> Ciclo anterior </small>
            </div>

            <div>
              <span> Nuevo saldo inicial </span>

              <strong class="primary-value">
                {{ totalBalanceCents === null ? '—' : centsToCurrency(totalBalanceCents) }}
              </strong>

              <small> Después de cobrar </small>
            </div>

            <div>
              <span> Nuevo ciclo </span>

              <strong class="date-value">
                {{ receivedDate ? formatDate(receivedDate) : '—' }}
              </strong>

              <small>
                hasta
                {{ newCycleEndDate ? formatDate(newCycleEndDate) : '—' }}
              </small>
            </div>
          </div>
        </section>

        <v-alert
          v-if="closingBalanceCents !== null && closingBalanceCents < 0"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-4"
        >
          El saldo total es menor que el sueldo recibido. Revisa que estés ingresando el saldo que
          tenías justo después de cobrar.
        </v-alert>

        <div class="confirmation-box">
          <AlertTriangle :size="19" />

          <div>
            <strong> Este cambio modifica tu ciclo real </strong>

            <span>
              El ciclo anterior será cerrado y Nivela comenzará a calcular desde el nuevo saldo.
            </span>
          </div>
        </div>

        <v-checkbox v-model="confirmed" color="primary" hide-details class="confirmation-check">
          <template #label>
            <span class="checkbox-label">
              Confirmo que ya recibí el sueldo y que el saldo ingresado es real.
            </span>
          </template>
        </v-checkbox>
      </div>

      <v-divider />

      <div class="dialog-actions">
        <v-btn variant="text" :disabled="saving" @click="closeDialog"> Cancelar </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="loading || !canSubmit"
          @click="confirmRollover"
        >
          <CheckCircle2 :size="16" class="mr-2" />

          Iniciar nuevo ciclo
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.rollover-dialog {
  display: flex;
  max-height: 92vh;
  flex-direction: column;
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
  width: 46px;
  height: 46px;
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
  font-size: 19px;
}

.dialog-header p {
  margin: 0;
  color: #64748b;
  font-size: 9px;
}

.dialog-content {
  padding: 21px 23px;
  overflow-y: auto;
}

.loading-state {
  display: flex;
  min-height: 300px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #64748b;
  font-size: 9px;
}

.current-cycle {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 19px;
  padding: 12px 14px;
  border-radius: 13px;
  background: #f8fafc;
  color: #64748b;
}

.current-cycle div {
  display: flex;
  flex-direction: column;
}

.current-cycle span {
  font-size: 8px;
}

.current-cycle strong {
  margin-top: 2px;
  color: #334155;
  font-size: 9px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 17px 13px;
}

.field {
  min-width: 0;
}

.field.full {
  grid-column: 1 / -1;
}

.field label {
  display: block;
  margin-bottom: 7px;
  color: #334155;
  font-size: 10px;
  font-weight: 700;
}

.field small {
  display: block;
  margin-top: 5px;
  color: #94a3b8;
  font-size: 7px;
  line-height: 1.5;
}

.preview-card {
  margin-top: 21px;
  padding: 16px;
  border: 1px solid #dbeafe;
  border-radius: 16px;
  background: #f8fbff;
}

.preview-eyebrow {
  color: #3b82f6;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1px;
}

.preview-card h3 {
  margin: 3px 0 13px;
  color: #1e293b;
  font-size: 13px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.preview-grid > div {
  display: flex;
  flex-direction: column;
  padding: 11px;
  border-radius: 12px;
  background: white;
}

.preview-grid span {
  color: #94a3b8;
  font-size: 7px;
}

.preview-grid strong {
  margin-top: 3px;
  color: #334155;
  font-size: 12px;
}

.preview-grid small {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 7px;
}

.primary-value {
  color: #2563eb !important;
}

.date-value {
  font-size: 9px !important;
}

.negative {
  color: #e11d48 !important;
}

.confirmation-box {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 17px;
  padding: 12px 14px;
  border-radius: 13px;
  background: #fff7ed;
  color: #d97706;
}

.confirmation-box div {
  display: flex;
  flex-direction: column;
}

.confirmation-box strong {
  color: #9a3412;
  font-size: 9px;
}

.confirmation-box span {
  margin-top: 2px;
  color: #a16207;
  font-size: 8px;
  line-height: 1.5;
}

.confirmation-check {
  margin-top: 7px;
}

.checkbox-label {
  color: #475569;
  font-size: 9px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
}

@media (max-width: 600px) {
  .form-grid,
  .preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
