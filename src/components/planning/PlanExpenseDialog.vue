<script setup lang="ts">
import { ref, watch } from 'vue'

import { CalendarDays, PiggyBank } from 'lucide-vue-next'

import { createPlannedExpense } from '@/services/planned-expenses'

import { getExpenseFormOptions, type ExpenseCategory } from '@/services/expenses'

import { centsToCurrency } from '@/utils/money'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    initialAmountCents?: number
  }>(),
  {
    initialAmountCents: 0,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void

  (e: 'saved'): void
}>()

const categories = ref<ExpenseCategory[]>([])

const loading = ref(false)

const saving = ref(false)

const errorMessage = ref('')

const name = ref('')

const categoryId = ref<string | null>(null)

const plannedDate = ref('')

const reserveFunds = ref(true)

const isExceptional = ref(false)

const justification = ref('')

const notes = ref('')

function getToday(): string {
  const now = new Date()

  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)

  return local.toISOString().slice(0, 10)
}

const today = ref(getToday())

function closeDialog() {
  emit('update:modelValue', false)
}

function resetForm() {
  today.value = getToday()

  name.value = ''
  categoryId.value = null
  plannedDate.value = today.value

  reserveFunds.value = true
  isExceptional.value = false

  justification.value = ''
  notes.value = ''

  errorMessage.value = ''
}

async function loadCategories() {
  const options = await getExpenseFormOptions()

  categories.value = options.categories
}

async function savePlan() {
  errorMessage.value = ''

  try {
    if (!name.value.trim()) {
      throw new Error('Escribe qué gasto estás planificando.')
    }

    if (!plannedDate.value) {
      throw new Error('Selecciona una fecha.')
    }

    if (plannedDate.value < today.value) {
      throw new Error('La fecha no puede estar en el pasado.')
    }

    saving.value = true

    await createPlannedExpense({
      name: name.value,

      amountCents: props.initialAmountCents,

      plannedDate: plannedDate.value,

      categoryId: categoryId.value,

      reserveFunds: reserveFunds.value,

      isExceptional: isExceptional.value,

      justification: justification.value,

      notes: notes.value,
    })

    emit('saved')

    closeDialog()
  } catch (error: any) {
    console.error('ERROR PLANIFICANDO GASTO:', error)

    errorMessage.value = error?.message || 'No pudimos planificar este gasto.'
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
    max-width="540"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card rounded="xl" class="plan-dialog">
      <div class="dialog-header">
        <div class="dialog-icon">
          <CalendarDays :size="22" />
        </div>

        <div>
          <span> PLANIFICACIÓN </span>

          <h2>Planificar gasto</h2>

          <p>Nivela tendrá este gasto presente antes de que ocurra.</p>
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

        <div class="amount-preview">
          <span> Monto analizado </span>

          <strong>
            {{ centsToCurrency(initialAmountCents) }}
          </strong>
        </div>

        <div class="field">
          <label> ¿Qué estás planeando? </label>

          <v-text-field
            v-model="name"
            placeholder="Ej. Cumpleaños, zapatos, viaje..."
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>

        <div class="field">
          <label>
            Categoría
            <span>Opcional</span>
          </label>

          <v-select
            v-model="categoryId"
            :items="categories"
            item-title="name"
            item-value="id"
            clearable
            placeholder="Selecciona una categoría"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>

        <div class="field">
          <label> Fecha prevista </label>

          <v-text-field
            v-model="plannedDate"
            type="date"
            :min="today"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>

        <div class="reserve-box">
          <PiggyBank :size="19" />

          <div class="reserve-text">
            <strong> Reservar este dinero </strong>

            <span>
              Si está activo, el monto dejará de considerarse dinero tranquilo mientras siga
              pendiente.
            </span>
          </div>

          <v-switch v-model="reserveFunds" color="primary" hide-details density="compact" />
        </div>

        <v-switch
          v-model="isExceptional"
          color="warning"
          hide-details
          density="compact"
          label="Es un gasto excepcional"
        />

        <v-textarea
          v-if="isExceptional"
          v-model="justification"
          placeholder="¿Por qué es excepcional?"
          rows="2"
          auto-grow
          variant="outlined"
          density="comfortable"
          hide-details
          class="mt-3"
        />

        <div class="field mt-4">
          <label>
            Notas
            <span>Opcional</span>
          </label>

          <v-textarea
            v-model="notes"
            placeholder="Información adicional..."
            rows="2"
            auto-grow
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>
      </div>

      <v-divider />

      <div class="dialog-actions">
        <v-btn variant="text" :disabled="saving" @click="closeDialog"> Cancelar </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="loading || initialAmountCents <= 0"
          @click="savePlan"
        >
          Planificar gasto
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.plan-dialog {
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

  background: #eff6ff;
  color: #3b82f6;
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

  min-height: 250px;

  place-items: center;
}

.amount-preview {
  display: flex;

  align-items: center;
  justify-content: space-between;

  margin-bottom: 18px;
  padding: 13px 15px;

  border-radius: 13px;

  background: #f8fafc;
}

.amount-preview span {
  color: #64748b;

  font-size: 9px;
}

.amount-preview strong {
  color: #2563eb;

  font-size: 18px;
}

.field {
  margin-bottom: 17px;
}

.field label {
  display: block;

  margin-bottom: 7px;

  color: #334155;

  font-size: 10px;
  font-weight: 700;
}

.field label span {
  color: #94a3b8;

  font-size: 8px;
  font-weight: 500;
}

.reserve-box {
  display: flex;

  align-items: center;

  gap: 10px;

  margin-bottom: 10px;
  padding: 12px 14px;

  border: 1px solid #dbeafe;
  border-radius: 14px;

  background: #f8fbff;
  color: #3b82f6;
}

.reserve-text {
  display: flex;

  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.reserve-text strong {
  color: #334155;

  font-size: 10px;
}

.reserve-text span {
  margin-top: 2px;

  color: #64748b;

  font-size: 8px;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;

  justify-content: flex-end;

  gap: 8px;

  padding: 14px 20px;
}
</style>