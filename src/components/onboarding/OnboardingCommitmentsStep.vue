<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  CalendarDays,
  Check,
  ChevronRight,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
} from 'lucide-vue-next'

import {
  getExpenseCategories,
  saveOnboardingCommitments,
  type CommitmentInput,
  type ExpenseCategory,
} from '@/services/onboarding'

import { centsToCurrency, moneyToCents } from '@/utils/money'

const emit = defineEmits<{
  completed: []
}>()

interface CommitmentDraft {
  id: string

  name: string
  amount: string

  categoryId: string

  frequency: 'monthly' | 'weekly'

  dayOfMonth: string
  weekday: string

  isEssential: boolean
}

const categories = ref<ExpenseCategory[]>([])

const items = ref<CommitmentDraft[]>([])

const loading = ref(false)

const loadingCategories = ref(true)

const errorMessage = ref('')

const saved = ref(false)

const weekdays = [
  {
    value: '1',
    label: 'Lunes',
  },
  {
    value: '2',
    label: 'Martes',
  },
  {
    value: '3',
    label: 'Miércoles',
  },
  {
    value: '4',
    label: 'Jueves',
  },
  {
    value: '5',
    label: 'Viernes',
  },
  {
    value: '6',
    label: 'Sábado',
  },
  {
    value: '7',
    label: 'Domingo',
  },
]

function createId() {
  return `${Date.now()}-${Math.random()}`
}

function createEmptyItem(): CommitmentDraft {
  return {
    id: createId(),

    name: '',
    amount: '',

    categoryId: '',

    frequency: 'monthly',

    dayOfMonth: '1',
    weekday: '1',

    isEssential: true,
  }
}

function addItem() {
  items.value.push(createEmptyItem())
}

function removeItem(id: string) {
  items.value = items.value.filter((item) => item.id !== id)
}

const totalMonthlyEquivalent = computed(() => {
  let total = 0

  for (const item of items.value) {
    if (!item.amount.trim()) {
      continue
    }

    try {
      const cents = moneyToCents(item.amount)

      if (item.frequency === 'monthly') {
        total += cents
      } else {
        /*
         * Aproximación mensual solamente
         * para la vista previa.
         *
         * El motor definitivo calculará
         * ocurrencias reales dentro del ciclo.
         */
        total += Math.round(cents * 4.345)
      }
    } catch {
      // Campo aún incompleto.
    }
  }

  return total
})

const totalPreview = computed(() => centsToCurrency(totalMonthlyEquivalent.value))

async function loadCategories() {
  try {
    loadingCategories.value = true

    categories.value = await getExpenseCategories()
  } catch (error) {
    console.error('ERROR CATEGORÍAS:', error)

    errorMessage.value = 'No pudimos cargar las categorías.'
  } finally {
    loadingCategories.value = false
  }
}

function buildPayload(): CommitmentInput[] {
  return items.value.map((item) => {
    const name = item.name.trim()

    if (!name) {
      throw new Error('Escribe el nombre de todos los compromisos.')
    }

    if (!item.amount.trim()) {
      throw new Error(`Ingresa el monto de "${name}".`)
    }

    const amountCents = moneyToCents(item.amount)

    if (amountCents <= 0) {
      throw new Error(`El monto de "${name}" debe ser mayor a $0.`)
    }

    const dayOfMonth = item.frequency === 'monthly' ? Number(item.dayOfMonth) : null

    const weekday = item.frequency === 'weekly' ? Number(item.weekday) : null

    if (item.frequency === 'monthly' && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
      throw new Error(`Selecciona un día válido para "${name}".`)
    }

    if (item.frequency === 'weekly' && (!weekday || weekday < 1 || weekday > 7)) {
      throw new Error(`Selecciona un día válido para "${name}".`)
    }

    return {
      categoryId: item.categoryId || null,

      name,
      amountCents,

      frequency: item.frequency,

      dayOfMonth,
      weekday,

      isEssential: item.isEssential,
    }
  })
}

async function save() {
  errorMessage.value = ''

  try {
    const payload = buildPayload()

    loading.value = true

    await saveOnboardingCommitments(payload)

    saved.value = true
  } catch (error: any) {
    console.error('ERROR COMPROMISOS:', error)

    errorMessage.value = error?.message || 'No pudimos guardar tus compromisos.'
  } finally {
    loading.value = false
  }
}

async function skip() {
  errorMessage.value = ''

  try {
    loading.value = true

    await saveOnboardingCommitments([])

    saved.value = true
  } catch (error: any) {
    console.error('ERROR OMITIENDO COMPROMISOS:', error)

    errorMessage.value = error?.message || 'No pudimos continuar.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadCategories()

  if (items.value.length === 0) {
    addItem()
  }
})
</script>

<template>
  <main v-if="!saved" class="commitments-layout">
    <!-- FORMULARIO -->
    <section class="commitments-card">
      <span class="eyebrow"> PASO 2 · COMPROMISOS </span>

      <h1>¿Qué pagos debes cubrir sí o sí?</h1>

      <p class="description">
        Estos gastos tendrán prioridad antes de calcular cuánto puedes gastar cada día.
      </p>

      <div class="summary-strip">
        <div class="summary-strip__icon">
          <ReceiptText :size="20" />
        </div>

        <div>
          <span> Compromisos estimados </span>

          <strong>
            {{ totalPreview }}
          </strong>
        </div>

        <small> equivalente mensual </small>
      </div>

      <div class="commitment-list">
        <article v-for="(item, index) in items" :key="item.id" class="commitment-item">
          <header class="commitment-item__header">
            <div>
              <span> COMPROMISO {{ index + 1 }} </span>

              <strong>
                {{ item.name || 'Nuevo gasto fijo' }}
              </strong>
            </div>

            <button
              type="button"
              class="delete-button"
              title="Eliminar"
              @click="removeItem(item.id)"
            >
              <Trash2 :size="17" />
            </button>
          </header>

          <div class="fields-grid">
            <!-- NOMBRE -->
            <div class="field-group">
              <label> Nombre </label>

              <input v-model="item.name" class="field-input" placeholder="Ej. Internet" />
            </div>

            <!-- MONTO -->
            <div class="field-group">
              <label> Monto </label>

              <div class="amount-input">
                <span>$</span>

                <input v-model="item.amount" inputmode="decimal" placeholder="0.00" />
              </div>
            </div>

            <!-- CATEGORÍA -->
            <div class="field-group">
              <label> Categoría </label>

              <select v-model="item.categoryId" class="field-input" :disabled="loadingCategories">
                <option value="">Sin categoría</option>

                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>

            <!-- FRECUENCIA -->
            <div class="field-group">
              <label> Frecuencia </label>

              <select v-model="item.frequency" class="field-input">
                <option value="monthly">Mensual</option>

                <option value="weekly">Semanal</option>
              </select>
            </div>

            <!-- DÍA MENSUAL -->
            <div v-if="item.frequency === 'monthly'" class="field-group">
              <label> Día aproximado de pago </label>

              <div class="calendar-input">
                <CalendarDays :size="17" />

                <input v-model="item.dayOfMonth" type="number" min="1" max="31" />
              </div>
            </div>

            <!-- DÍA SEMANAL -->
            <div v-else class="field-group">
              <label> Día de pago </label>

              <select v-model="item.weekday" class="field-input">
                <option v-for="day in weekdays" :key="day.value" :value="day.value">
                  {{ day.label }}
                </option>
              </select>
            </div>

            <!-- PRIORIDAD -->
            <div class="field-group">
              <label> Prioridad </label>

              <button
                type="button"
                class="essential-toggle"
                :class="{
                  'essential-toggle--active': item.isEssential,
                }"
                @click="item.isEssential = !item.isEssential"
              >
                <ShieldCheck :size="17" />

                {{ item.isEssential ? 'Obligatorio' : 'Flexible' }}
              </button>
            </div>
          </div>
        </article>
      </div>

      <button type="button" class="add-button" @click="addItem">
        <Plus :size="18" />

        Agregar otro compromiso
      </button>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div class="footer-actions">
        <button type="button" class="skip-button" :disabled="loading" @click="skip">
          No tengo gastos fijos
        </button>

        <button type="button" class="continue-button" :disabled="loading" @click="save">
          {{ loading ? 'Guardando...' : 'Guardar y continuar' }}

          <ChevronRight v-if="!loading" :size="18" />
        </button>
      </div>
    </section>

    <!-- AYUDA -->
    <aside class="help-card">
      <div class="help-icon">
        <ShieldCheck :size="21" />
      </div>

      <span class="help-eyebrow"> ¿QUÉ VA AQUÍ? </span>

      <h3>Pagos previsibles</h3>

      <p>Registra aquellos gastos que sabes que probablemente tendrás que cubrir.</p>

      <div class="examples">
        <span>Universidad</span>
        <span>Novia</span>
        <span>Celular</span>
        <span>Servicios hogar</span>
        <span>Transporte trabajo</span>
        <span>Gastos personales</span>
      </div>

      <div class="help-note">
        Los gastos inesperados como snacks, compras ocasionales o baño de tu perro los trataremos
        después como variables.
      </div>
    </aside>
  </main>

  <!-- COMPLETADO -->
  <section v-else class="saved-state">
    <div class="saved-icon">
      <Check :size="30" />
    </div>

    <span class="eyebrow"> PASO 2 COMPLETADO </span>

    <h1>Tus compromisos están protegidos</h1>

    <p>Nivela reservará este dinero antes de calcular tu presupuesto disponible.</p>

    <button type="button" class="continue-button final-button" @click="emit('completed')">
      Continuar con mi rutina

      <ChevronRight :size="18" />
    </button>
  </section>
</template>

<style scoped lang="scss">
.commitments-layout {
  display: grid;
  grid-template-columns:
    minmax(0, 1.45fr)
    minmax(270px, 0.55fr);

  gap: 22px;

  margin-top: 34px;
}

.commitments-card,
.help-card {
  border: 1px solid #e5eaf1;
  background: #ffffff;
}

.commitments-card {
  padding: 36px;
  border-radius: 28px;
}

.eyebrow,
.help-eyebrow {
  display: block;

  color: #3b82f6;

  font-size: 9px;
  font-weight: 800;

  letter-spacing: 1.5px;
}

h1 {
  margin: 9px 0 0;

  color: #0f172a;

  font-size: 31px;
  font-weight: 800;

  letter-spacing: -1px;
}

.description {
  max-width: 560px;

  margin: 10px 0 0;

  color: #64748b;

  font-size: 11px;
  line-height: 1.7;
}

.summary-strip {
  display: flex;
  align-items: center;

  gap: 12px;

  margin-top: 27px;
  padding: 14px;

  border: 1px solid #dbeafe;
  border-radius: 16px;

  background: #f8fbff;
}

.summary-strip__icon {
  display: grid;

  width: 40px;
  height: 40px;

  place-items: center;

  border-radius: 12px;

  background: #edf5ff;
  color: #3b82f6;
}

.summary-strip > div:nth-child(2) {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.summary-strip span,
.summary-strip small {
  color: #94a3b8;
  font-size: 8px;
}

.summary-strip strong {
  margin-top: 2px;

  color: #1e293b;
  font-size: 14px;
}

.commitment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;

  margin-top: 20px;
}

.commitment-item {
  padding: 18px;

  border: 1px solid #e8edf4;
  border-radius: 18px;

  background: #fbfcfe;
}

.commitment-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 16px;
}

.commitment-item__header > div {
  display: flex;
  flex-direction: column;
}

.commitment-item__header span {
  color: #94a3b8;

  font-size: 8px;
  font-weight: 800;

  letter-spacing: 1px;
}

.commitment-item__header strong {
  margin-top: 3px;

  color: #334155;
  font-size: 11px;
}

.delete-button {
  display: grid;

  width: 34px;
  height: 34px;

  place-items: center;

  border: 0;
  border-radius: 10px;

  background: #fff1f2;
  color: #e11d48;

  cursor: pointer;
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 13px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-group label {
  color: #475569;

  font-size: 9px;
  font-weight: 700;
}

.field-input,
.amount-input,
.calendar-input {
  width: 100%;
  min-height: 43px;

  border: 1px solid #dce3ec;
  border-radius: 12px;

  background: #ffffff;
  color: #0f172a;

  font-family: inherit;
  font-size: 10px;

  outline: none;
}

.field-input {
  padding: 0 12px;
}

.amount-input,
.calendar-input {
  display: flex;
  align-items: center;
  gap: 8px;

  padding: 0 12px;

  color: #94a3b8;
}

.amount-input input,
.calendar-input input {
  width: 100%;

  border: 0;
  outline: 0;

  background: transparent;

  font-family: inherit;
  font-size: 10px;
}

.field-input:focus,
.amount-input:focus-within,
.calendar-input:focus-within {
  border-color: #93bdfb;

  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.07);
}

.essential-toggle {
  display: flex;
  min-height: 43px;

  align-items: center;
  justify-content: center;

  gap: 7px;

  border: 1px solid #dce3ec;
  border-radius: 12px;

  background: white;
  color: #94a3b8;

  cursor: pointer;

  font-size: 9px;
  font-weight: 700;
}

.essential-toggle--active {
  border-color: #bbf7d0;

  background: #f0fdf4;
  color: #16a34a;
}

.add-button {
  display: flex;
  width: 100%;
  min-height: 44px;

  align-items: center;
  justify-content: center;

  gap: 7px;

  margin-top: 14px;

  border: 1px dashed #bfdbfe;
  border-radius: 13px;

  background: #f8fbff;
  color: #3b82f6;

  cursor: pointer;

  font-size: 9px;
  font-weight: 700;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;

  gap: 10px;

  margin-top: 22px;
}

.skip-button,
.continue-button {
  min-height: 46px;

  padding: 0 18px;

  border-radius: 13px;

  cursor: pointer;

  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
}

.skip-button {
  border: 1px solid #e2e8f0;

  background: #ffffff;
  color: #64748b;
}

.continue-button {
  display: flex;

  align-items: center;
  justify-content: center;

  gap: 6px;

  border: 0;

  background: #3b82f6;
  color: white;

  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.18);
}

.skip-button:disabled,
.continue-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.error-message {
  margin-top: 15px;
  padding: 11px 13px;

  border: 1px solid #fecaca;
  border-radius: 12px;

  background: #fff5f5;
  color: #dc2626;

  font-size: 9px;
}

.help-card {
  position: sticky;
  top: 25px;

  align-self: start;

  padding: 24px;

  border-radius: 22px;
}

.help-icon {
  display: grid;

  width: 42px;
  height: 42px;

  margin-bottom: 19px;

  place-items: center;

  border-radius: 13px;

  background: #ecfdf3;
  color: #16a34a;
}

.help-card h3 {
  margin: 7px 0 0;

  color: #1e293b;
  font-size: 16px;
}

.help-card > p {
  margin: 8px 0 0;

  color: #64748b;

  font-size: 9px;
  line-height: 1.7;
}

.examples {
  display: flex;
  flex-wrap: wrap;

  gap: 7px;

  margin-top: 18px;
}

.examples span {
  padding: 6px 9px;

  border-radius: 999px;

  background: #f1f5f9;
  color: #64748b;

  font-size: 8px;
  font-weight: 600;
}

.help-note {
  margin-top: 21px;
  padding: 12px;

  border-radius: 12px;

  background: #fff7ed;
  color: #9a6b31;

  font-size: 8px;
  line-height: 1.65;
}

.saved-state {
  max-width: 650px;

  margin: 70px auto 0;
  padding: 44px;

  border: 1px solid #e5eaf1;
  border-radius: 28px;

  background: white;

  text-align: center;

  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.07);
}

.saved-icon {
  display: grid;

  width: 62px;
  height: 62px;

  place-items: center;

  margin: 0 auto 22px;

  border-radius: 20px;

  background: #ecfdf3;
  color: #16a34a;
}

.saved-state h1 {
  font-size: 28px;
}

.saved-state > p {
  margin: 10px auto 0;

  color: #64748b;

  font-size: 10px;
}

.final-button {
  margin: 25px auto 0;
}

@media (max-width: 900px) {
  .commitments-layout {
    grid-template-columns: 1fr;
  }

  .help-card {
    position: static;
  }
}

@media (max-width: 600px) {
  .commitments-card,
  .saved-state {
    padding: 22px 18px;
    border-radius: 21px;
  }

  h1 {
    font-size: 25px;
  }

  .fields-grid {
    grid-template-columns: 1fr;
  }

  .footer-actions {
    flex-direction: column-reverse;
  }

  .skip-button,
  .continue-button {
    width: 100%;
  }
}
</style>
