<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { CheckCircle2, ReceiptText } from 'lucide-vue-next'

import { completePlannedExpense, type PlannedExpenseItem } from '@/services/planned-expenses'

import { getExpenseFormOptions, type ExpenseCategory } from '@/services/expenses'

import { centsToCurrency, moneyToCents } from '@/utils/money'

const props = defineProps<{
  modelValue: boolean
  plan: PlannedExpenseItem | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void

  (e: 'saved'): void
}>()

const categories = ref<ExpenseCategory[]>([])

const loading = ref(false)

const saving = ref(false)

const errorMessage = ref('')

const amount = ref('')

const categoryId = ref<string | null>(null)

const occurredDate = ref('')

const plannedAmountLabel = computed(() =>
  props.plan ? centsToCurrency(props.plan.amount_cents) : '$0.00',
)

function getToday(): string {
  const now = new Date()

  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)

  return local.toISOString().slice(0, 10)
}

function buildOccurredAt(value: string): string {
  const parts = value.split('-')

  if (parts.length !== 3) {
    throw new Error('La fecha del pago no es válida.')
  }

  const year = Number(parts[0])

  const month = Number(parts[1])

  const day = Number(parts[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error('La fecha del pago no es válida.')
  }

  /*
   * Si pagamos hoy, conservamos
   * la hora real actual.
   */
  if (value === getToday()) {
    return new Date().toISOString()
  }

  /*
   * Para otra fecha usamos mediodía
   * local para evitar problemas de
   * cambio de día por zona horaria.
   */
  const date = new Date(year, month - 1, day, 12, 0, 0)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('La fecha del pago no es válida.')
  }

  return date.toISOString()
}

function closeDialog() {
  emit('update:modelValue', false)
}

function resetForm() {
  errorMessage.value = ''

  amount.value = props.plan ? (props.plan.amount_cents / 100).toFixed(2) : ''

  categoryId.value = props.plan?.category_id ?? null

  occurredDate.value = getToday()
}

async function loadCategories() {
  const options = await getExpenseFormOptions()

  categories.value = options.categories
}

async function savePayment() {
  errorMessage.value = ''

  try {
    if (!props.plan) {
      throw new Error('No hay un gasto planificado seleccionado.')
    }

    const amountCents = moneyToCents(amount.value)

    if (amountCents <= 0) {
      throw new Error('El monto pagado debe ser mayor que cero.')
    }

    if (!categoryId.value) {
      throw new Error('Selecciona una categoría.')
    }

    if (!occurredDate.value) {
      throw new Error('Selecciona la fecha del pago.')
    }

    saving.value = true

    await completePlannedExpense({
      plannedExpenseId: props.plan.id,

      actualAmountCents: amountCents,

      categoryId: categoryId.value,

      occurredAt: buildOccurredAt(occurredDate.value),
    })

    emit('saved')

    closeDialog()
  } catch (error: any) {
    console.error('ERROR REGISTRANDO PAGO:', error)

    errorMessage.value = error?.message || 'No pudimos registrar el pago.'
  } finally {
    saving.value = false
  }
}

watch(
  () => props.modelValue,

  async (open) => {
    if (!open) {
      return
    }

    resetForm()

    try {
      loading.value = true

      await loadCategories()
    } catch (error: any) {
      console.error('ERROR CARGANDO CATEGORÍAS:', error)

      errorMessage.value = error?.message || 'No pudimos cargar las categorías.'
    } finally {
      loading.value = false
    }
  },
)
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card rounded="xl" class="payment-dialog">
      <div class="dialog-header">
        <div class="dialog-icon">
          <CheckCircle2 :size="22" />
        </div>

        <div>
          <span> GASTO REALIZADO </span>

          <h2>Ya lo pagué</h2>

          <p>Registra cuánto terminó costando realmente.</p>
        </div>
      </div>

      <v-divider />

      <div v-if="loading" class="loading-state">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div v-else class="dialog-content">
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <div v-if="plan" class="plan-preview">
          <div>
            <span> Gasto planificado </span>

            <strong>
              {{ plan.name }}
            </strong>
          </div>

          <div class="planned-value">
            <span> Planeado </span>

            <strong>
              {{ plannedAmountLabel }}
            </strong>
          </div>
        </div>

        <div class="field">
          <label>
            <ReceiptText :size="15" />

            ¿Cuánto pagaste realmente?
          </label>

          <v-text-field
            v-model="amount"
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
          <label> Categoría </label>

          <v-select
            v-model="categoryId"
            :items="categories"
            item-title="name"
            item-value="id"
            placeholder="Selecciona una categoría"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>

        <div class="field">
          <label> Fecha del pago </label>

          <v-text-field
            v-model="occurredDate"
            type="date"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>

        <div class="info-box">
          Al registrar el pago, Nivela marcará este gasto como completado y creará el movimiento
          real correspondiente.
        </div>
      </div>

      <v-divider />

      <div class="dialog-actions">
        <v-btn variant="text" :disabled="saving" @click="closeDialog"> Volver </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="loading"
          @click="savePayment"
        >
          Registrar pago
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.payment-dialog {
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

  width: 44px;
  height: 44px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 14px;

  background: #ecfdf3;
  color: #16a34a;
}

.dialog-header > div:last-child > span {
  color: #94a3b8;

  font-size: 8px;
  font-weight: 700;

  letter-spacing: 1px;
}

.dialog-header h2 {
  margin: 2px 0;

  color: #1e293b;

  font-size: 18px;
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
  display: grid;

  min-height: 240px;

  place-items: center;
}

.plan-preview {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 15px;

  margin-bottom: 19px;
  padding: 13px 15px;

  border-radius: 13px;

  background: #f8fafc;
}

.plan-preview > div {
  display: flex;
  flex-direction: column;
}

.plan-preview span {
  color: #94a3b8;

  font-size: 8px;
}

.plan-preview strong {
  margin-top: 3px;

  color: #334155;

  font-size: 11px;
}

.planned-value {
  flex-shrink: 0;

  text-align: right;
}

.planned-value strong {
  color: #2563eb;
}

.field {
  margin-bottom: 17px;
}

.field label {
  display: flex;

  align-items: center;

  gap: 6px;

  margin-bottom: 7px;

  color: #334155;

  font-size: 10px;
  font-weight: 700;
}

.amount-input :deep(input) {
  font-size: 18px;
  font-weight: 800;
}

.info-box {
  padding: 12px 14px;

  border: 1px solid #dbeafe;
  border-radius: 13px;

  background: #f8fbff;
  color: #64748b;

  font-size: 8px;
  line-height: 1.6;
}

.dialog-actions {
  display: flex;

  justify-content: flex-end;

  gap: 8px;

  padding: 14px 20px;
}
</style>