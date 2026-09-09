<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import {
  AlertCircle,
  CalendarDays,
  CircleDollarSign,
  Link2,
  ReceiptText,
  Sparkles,
} from 'lucide-vue-next'

import {
  getExpenseFormOptions,
  registerExpense,
  type ExpenseFormOptions,
} from '@/services/expenses'

import { moneyToCents } from '@/utils/money'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void

  (e: 'saved'): void
}>()

const isOpen = computed({
  get: () => props.modelValue,

  set: (value: boolean) => emit('update:modelValue', value),
})

const options = ref<ExpenseFormOptions>({
  categories: [],
  variableRules: [],
  recurringItems: [],
})

const loading = ref(false)

const saving = ref(false)

const errorMessage = ref('')

const amount = ref('')

const categoryId = ref<string | null>(null)

const description = ref('')

const expenseMode = ref<'normal' | 'exceptional'>('normal')

const isJustified = ref(false)

const justification = ref('')

const relationValue = ref('none')

function getTodayInputValue(): string {
  const now = new Date()

  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)

  return local.toISOString().slice(0, 10)
}

const today = ref(getTodayInputValue())

const occurredDate = ref(today.value)

const isExceptional = computed(() => expenseMode.value === 'exceptional')

interface RelationOption {
  title: string
  value: string
}

const relationOptions = computed<RelationOption[]>(() => {
  const result: RelationOption[] = [
    {
      title: 'Gasto libre · Sin reserva asociada',
      value: 'none',
    },
  ]

  if (!categoryId.value) {
    return result
  }

  for (const rule of options.value.variableRules) {
    if (rule.category_id !== categoryId.value) {
      continue
    }

    result.push({
      title: `${rule.title} · Variable`,
      value: `variable:${rule.id}`,
    })
  }

  for (const item of options.value.recurringItems) {
    if (item.category_id !== categoryId.value) {
      continue
    }

    result.push({
      title: `${item.name} · Compromiso`,
      value: `recurring:${item.id}`,
    })
  }

  return result
})

const hasRelations = computed(() => relationOptions.value.length > 1)

function resetForm() {
  today.value = getTodayInputValue()

  amount.value = ''
  categoryId.value = null
  description.value = ''

  expenseMode.value = 'normal'

  isJustified.value = false

  justification.value = ''

  occurredDate.value = today.value

  relationValue.value = 'none'

  errorMessage.value = ''
}

async function loadOptions() {
  try {
    loading.value = true

    options.value = await getExpenseFormOptions()
  } catch (error: any) {
    console.error('ERROR CARGANDO OPCIONES:', error)

    errorMessage.value = error?.message || 'No pudimos cargar las opciones del gasto.'
  } finally {
    loading.value = false
  }
}

function buildOccurredAt(dateValue: string): string {
  const [yearPart, monthPart, dayPart] = dateValue.split('-')

  if (!yearPart || !monthPart || !dayPart) {
    throw new Error('La fecha del gasto no es válida.')
  }

  const year = Number(yearPart)

  const month = Number(monthPart)

  const day = Number(dayPart)

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error('La fecha del gasto no es válida.')
  }

  const now = new Date()

  const localDate = new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    0,
  )

  if (Number.isNaN(localDate.getTime())) {
    throw new Error('La fecha del gasto no es válida.')
  }

  return localDate.toISOString()
}

function resolveRelation() {
  let variableRuleId: string | null = null

  let recurringItemId: string | null = null

  if (relationValue.value.startsWith('variable:')) {
    variableRuleId = relationValue.value.replace('variable:', '')
  }

  if (relationValue.value.startsWith('recurring:')) {
    recurringItemId = relationValue.value.replace('recurring:', '')
  }

  return {
    variableRuleId,
    recurringItemId,
  }
}

async function saveExpense() {
  errorMessage.value = ''

  try {
    if (!occurredDate.value) {
      throw new Error('Selecciona la fecha del gasto.')
    }

    const amountCents = moneyToCents(amount.value)

    if (amountCents <= 0) {
      throw new Error('Ingresa un monto mayor que cero.')
    }

    if (!categoryId.value) {
      throw new Error('Selecciona una categoría.')
    }

    if (occurredDate.value > today.value) {
      throw new Error('No puedes registrar un gasto en una fecha futura.')
    }

    if (isExceptional.value && isJustified.value && !justification.value.trim()) {
      throw new Error('Escribe la justificación del gasto.')
    }

    saving.value = true

    const { variableRuleId, recurringItemId } = resolveRelation()

    await registerExpense({
      amountCents,

      categoryId: categoryId.value,

      description: description.value,

      isExceptional: isExceptional.value,

      isJustified: isExceptional.value && isJustified.value,

      justification: justification.value,

      occurredAt: buildOccurredAt(occurredDate.value),

      variableRuleId,
      recurringItemId,

      plannedExpenseId: null,
    })

    emit('saved')

    isOpen.value = false

    resetForm()
  } catch (error: any) {
    console.error('ERROR REGISTRANDO GASTO:', error)

    errorMessage.value = error?.message || 'No pudimos registrar el gasto.'
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

    await loadOptions()
  },
)

watch(categoryId, () => {
  relationValue.value = 'none'

  const relations = relationOptions.value.filter((item) => item.value !== 'none')

  /*
   * Si solo existe una reserva
   * relacionada con esa categoría,
   * Nivela la selecciona
   * automáticamente.
   */
  if (relations.length === 1) {
    relationValue.value = relations[0]!.value
  }
})

watch(expenseMode, (mode) => {
  if (mode === 'normal') {
    isJustified.value = false

    justification.value = ''
  }
})
</script>

<template>
  <v-dialog v-model="isOpen" max-width="560">
    <v-card class="expense-dialog" rounded="xl">
      <div class="dialog-header">
        <div class="dialog-header__icon">
          <ReceiptText :size="22" />
        </div>

        <div>
          <span> MOVIMIENTO </span>

          <h2>Registrar gasto</h2>

          <p>Nivela recalculará tu planificación automáticamente.</p>
        </div>
      </div>

      <v-divider />

      <div v-if="loading" class="dialog-loading">
        <v-progress-circular indeterminate color="primary" :size="30" :width="3" />

        <span> Preparando formulario... </span>
      </div>

      <div v-else class="dialog-content">
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <!-- MONTO -->
        <div class="field-section">
          <label>
            <CircleDollarSign :size="16" />

            ¿Cuánto gastaste?
          </label>

          <v-text-field
            v-model="amount"
            prefix="$"
            placeholder="0.00"
            inputmode="decimal"
            variant="outlined"
            density="comfortable"
            hide-details
            autofocus
            class="amount-field"
          />
        </div>

        <!-- CATEGORÍA -->
        <div class="field-section">
          <label> Categoría </label>

          <v-select
            v-model="categoryId"
            :items="options.categories"
            item-title="name"
            item-value="id"
            placeholder="Selecciona una categoría"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>

        <!-- RELACIÓN -->
        <div v-if="categoryId && hasRelations" class="relation-box">
          <div class="relation-box__title">
            <Link2 :size="16" />

            <div>
              <strong> ¿Este gasto corresponde a algo que ya planeaste? </strong>

              <span> Esto evita que Nivela descuente el dinero dos veces. </span>
            </div>
          </div>

          <v-select
            v-model="relationValue"
            :items="relationOptions"
            item-title="title"
            item-value="value"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>

        <!-- DESCRIPCIÓN -->
        <div class="field-section">
          <label>
            Descripción
            <span>Opcional</span>
          </label>

          <v-text-field
            v-model="description"
            placeholder="Ej. Almuerzo, Uber, cena..."
            variant="outlined"
            density="comfortable"
            maxlength="120"
            hide-details
          />
        </div>

        <!-- FECHA -->
        <div class="field-section">
          <label>
            <CalendarDays :size="16" />

            Fecha
          </label>

          <v-text-field
            v-model="occurredDate"
            type="date"
            :max="today"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>

        <!-- NORMAL / EXCEPCIONAL -->
        <div class="field-section">
          <label> ¿Cómo fue este gasto? </label>

          <v-btn-toggle v-model="expenseMode" mandatory divided class="expense-mode">
            <v-btn value="normal" variant="text"> Normal </v-btn>

            <v-btn value="exceptional" variant="text">
              <Sparkles :size="15" class="mr-1" />

              Excepcional
            </v-btn>
          </v-btn-toggle>

          <p class="field-help">
            Un gasto excepcional sí afecta tu dinero, pero quedará identificado para diferenciarlo
            en tus análisis.
          </p>
        </div>

        <!-- JUSTIFICACIÓN -->
        <div v-if="isExceptional" class="exception-box">
          <v-switch
            v-model="isJustified"
            color="primary"
            density="compact"
            hide-details
            label="Este gasto tenía una razón necesaria"
          />

          <v-textarea
            v-if="isJustified"
            v-model="justification"
            rows="2"
            auto-grow
            maxlength="250"
            placeholder="Ej. Emergencia veterinaria"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mt-3"
          />
        </div>

        <div class="impact-note">
          <AlertCircle :size="17" />

          <span>
            El gasto se descontará de tu saldo real y Nivela recalculará tu presupuesto y nivel de
            riesgo.
          </span>
        </div>
      </div>

      <v-divider />

      <div class="dialog-actions">
        <v-btn variant="text" :disabled="saving" @click="isOpen = false"> Cancelar </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="loading"
          @click="saveExpense"
        >
          Guardar gasto
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.expense-dialog {
  display: flex;

  max-height: 92vh;

  flex-direction: column;

  overflow: hidden;
}

.dialog-content {
  padding: 22px 24px;
  overflow-y: auto;
}

.dialog-header {
  display: flex;

  align-items: flex-start;

  gap: 14px;

  padding: 22px 24px;
}

.dialog-header__icon {
  display: grid;

  width: 44px;
  height: 44px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 14px;

  background: #eff6ff;
  color: #3b82f6;
}

.dialog-header span {
  color: #94a3b8;

  font-size: 9px;
  font-weight: 700;

  letter-spacing: 1.2px;
}

.dialog-header h2 {
  margin: 2px 0 3px;

  color: #172033;

  font-size: 19px;
  font-weight: 800;
}

.dialog-header p {
  margin: 0;

  color: #64748b;

  font-size: 10px;
}

.dialog-content {
  padding: 22px 24px;
}

.dialog-loading {
  display: flex;

  min-height: 260px;

  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: 12px;

  color: #64748b;

  font-size: 11px;
}

.field-section {
  margin-bottom: 18px;
}

.field-section > label {
  display: flex;

  align-items: center;

  gap: 6px;

  margin-bottom: 7px;

  color: #334155;

  font-size: 10px;
  font-weight: 700;
}

.field-section > label > span {
  margin-left: 2px;

  color: #94a3b8;

  font-size: 8px;
  font-weight: 500;
}

.amount-field :deep(input) {
  font-size: 22px;
  font-weight: 800;
}

.relation-box {
  margin-bottom: 18px;
  padding: 14px;

  border: 1px solid #dbeafe;
  border-radius: 14px;

  background: #f8fbff;
}

.relation-box__title {
  display: flex;

  align-items: flex-start;

  gap: 9px;

  margin-bottom: 12px;

  color: #3b82f6;
}

.relation-box__title div {
  display: flex;
  flex-direction: column;
}

.relation-box__title strong {
  color: #334155;

  font-size: 10px;
}

.relation-box__title span {
  margin-top: 2px;

  color: #64748b;

  font-size: 9px;
}

.expense-mode {
  width: 100%;

  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.expense-mode :deep(.v-btn) {
  flex: 1;

  font-size: 10px;
  text-transform: none;
}

.field-help {
  margin: 7px 0 0;

  color: #94a3b8;

  font-size: 8px;
  line-height: 1.55;
}

.exception-box {
  margin-top: -6px;
  margin-bottom: 18px;

  padding: 12px 14px;

  border: 1px solid #fed7aa;
  border-radius: 14px;

  background: #fffaf5;
}

.impact-note {
  display: flex;

  align-items: flex-start;

  gap: 8px;

  padding: 11px 13px;

  border-radius: 12px;

  background: #f8fafc;
  color: #64748b;

  font-size: 9px;
  line-height: 1.55;
}

.impact-note svg {
  flex-shrink: 0;

  color: #64748b;
}

.dialog-actions {
  display: flex;

  justify-content: flex-end;

  gap: 8px;

  padding: 15px 20px;
}

@media (max-width: 600px) {
  .dialog-header,
  .dialog-content {
    padding-left: 18px;
    padding-right: 18px;
  }

  .dialog-actions {
    padding: 13px 15px max(13px, env(safe-area-inset-bottom));
  }
}
</style>
