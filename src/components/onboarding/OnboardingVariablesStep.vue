<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { Check, ChevronRight, CircleHelp, Plus, ShoppingBasket, Trash2 } from 'lucide-vue-next'

import {
  getExpenseCategories,
  saveOnboardingVariables,
  type ExpenseCategory,
  type VariablePriority,
  type VariableSpendingInput,
} from '@/services/onboarding'

import { centsToCurrency, moneyToCents } from '@/utils/money'

const emit = defineEmits<{
  completed: []
}>()

interface VariableDraft {
  id: string

  title: string
  categoryId: string

  expectedAmount: string
  maxAmount: string

  priority: VariablePriority
}

const categories = ref<ExpenseCategory[]>([])

const items = ref<VariableDraft[]>([
  {
    id: 'snacks',
    title: 'Snacks',
    categoryId: '',
    expectedAmount: '',
    maxAmount: '',
    priority: 'flexible',
  },

  {
    id: 'mascota',
    title: 'Mascota',
    categoryId: '',
    expectedAmount: '',
    maxAmount: '',
    priority: 'necessary',
  },

  {
    id: 'casa',
    title: 'Compras para casa',
    categoryId: '',
    expectedAmount: '',
    maxAmount: '',
    priority: 'flexible',
  },
])

const loading = ref(false)

const loadingCategories = ref(true)

const errorMessage = ref('')

const saved = ref(false)

function createId() {
  return `${Date.now()}-${Math.random()}`
}

function addItem() {
  items.value.push({
    id: createId(),

    title: '',
    categoryId: '',

    expectedAmount: '',
    maxAmount: '',

    priority: 'flexible',
  })
}

function removeItem(id: string) {
  items.value = items.value.filter((item) => item.id !== id)
}

const expectedTotalCents = computed(() => {
  return items.value.reduce((total, item) => {
    if (!item.expectedAmount.trim()) {
      return total
    }

    try {
      return total + moneyToCents(item.expectedAmount)
    } catch {
      return total
    }
  }, 0)
})

const maximumTotalCents = computed(() => {
  return items.value.reduce((total, item) => {
    if (!item.maxAmount.trim()) {
      return total
    }

    try {
      return total + moneyToCents(item.maxAmount)
    } catch {
      return total
    }
  }, 0)
})

const expectedPreview = computed(() => centsToCurrency(expectedTotalCents.value))

const maximumPreview = computed(() => centsToCurrency(maximumTotalCents.value))

async function loadCategories() {
  try {
    loadingCategories.value = true

    categories.value = await getExpenseCategories()

    const categoryBySlug = new Map(categories.value.map((category) => [category.slug, category.id]))

    const snacks = items.value.find((item) => item.id === 'snacks')

    if (snacks) {
      snacks.categoryId = categoryBySlug.get('comida') || ''
    }

    const pet = items.value.find((item) => item.id === 'mascota')

    if (pet) {
      pet.categoryId = categoryBySlug.get('mascota') || ''
    }

    const home = items.value.find((item) => item.id === 'casa')

    if (home) {
      home.categoryId = categoryBySlug.get('compras') || categoryBySlug.get('casa') || ''
    }
  } catch (error) {
    console.error('ERROR CATEGORÍAS:', error)

    errorMessage.value = 'No pudimos cargar las categorías.'
  } finally {
    loadingCategories.value = false
  }
}

function buildPayload(): VariableSpendingInput[] {
  /*
   * Los elementos completamente vacíos
   * se ignoran para que puedas borrar
   * una sugerencia que no aplique.
   */
  const nonEmptyItems = items.value.filter(
    (item) => item.title.trim() || item.expectedAmount.trim() || item.maxAmount.trim(),
  )

  return nonEmptyItems.map((item) => {
    const title = item.title.trim()

    if (!title) {
      throw new Error('Todos los gastos variables necesitan un nombre.')
    }

    if (!item.expectedAmount.trim()) {
      throw new Error(`Ingresa el monto esperado de "${title}".`)
    }

    const expected = moneyToCents(item.expectedAmount)

    const maximum = item.maxAmount.trim() ? moneyToCents(item.maxAmount) : expected

    if (expected < 0) {
      throw new Error(`El monto esperado de "${title}" no puede ser negativo.`)
    }

    if (maximum < expected) {
      throw new Error(`El máximo de "${title}" no puede ser menor al esperado.`)
    }

    return {
      title,

      categoryId: item.categoryId || null,

      expectedAmountCents: expected,

      maxAmountCents: maximum,

      priority: item.priority,
    }
  })
}

async function save() {
  errorMessage.value = ''

  try {
    const payload = buildPayload()

    loading.value = true

    await saveOnboardingVariables(payload)

    saved.value = true
  } catch (error: any) {
    console.error('ERROR VARIABLES:', error)

    errorMessage.value = error?.message || 'No pudimos guardar tus gastos variables.'
  } finally {
    loading.value = false
  }
}

async function skip() {
  errorMessage.value = ''

  try {
    loading.value = true

    await saveOnboardingVariables([])

    saved.value = true
  } catch (error: any) {
    console.error('ERROR OMITIENDO VARIABLES:', error)

    errorMessage.value = error?.message || 'No pudimos continuar.'
  } finally {
    loading.value = false
  }
}

onMounted(loadCategories)
</script>

<template>
  <main v-if="!saved" class="variables-layout">
    <section class="variables-card">
      <span class="eyebrow"> PASO 4 · GASTOS VARIABLES </span>

      <h1>¿En qué sueles gastar sin una fecha fija?</h1>

      <p class="description">
        Estos gastos no son obligaciones, pero Nivela debe tenerlos presentes para no darte un
        presupuesto diario demasiado optimista.
      </p>

      <div class="variable-summary">
        <div>
          <span> Esperado en el ciclo </span>

          <strong>
            {{ expectedPreview }}
          </strong>
        </div>

        <div>
          <span> Máximo tolerable </span>

          <strong>
            {{ maximumPreview }}
          </strong>
        </div>
      </div>

      <div class="variables-list">
        <article v-for="(item, index) in items" :key="item.id" class="variable-item">
          <header class="variable-item__header">
            <div>
              <span> VARIABLE {{ index + 1 }} </span>

              <strong>
                {{ item.title || 'Nuevo gasto variable' }}
              </strong>
            </div>

            <button type="button" class="delete-button" @click="removeItem(item.id)">
              <Trash2 :size="17" />
            </button>
          </header>

          <div class="fields-grid">
            <div class="field-group">
              <label> Nombre </label>

              <input v-model="item.title" class="field-input" placeholder="Ej. Snacks" />
            </div>

            <div class="field-group">
              <label> Categoría </label>

              <select v-model="item.categoryId" class="field-input" :disabled="loadingCategories">
                <option value="">Sin categoría</option>

                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>

            <div class="field-group">
              <label> Gasto esperado por ciclo </label>

              <div class="amount-input">
                <span>$</span>

                <input v-model="item.expectedAmount" inputmode="decimal" placeholder="0.00" />
              </div>
            </div>

            <div class="field-group">
              <label> Máximo razonable </label>

              <div class="amount-input">
                <span>$</span>

                <input v-model="item.maxAmount" inputmode="decimal" placeholder="0.00" />
              </div>
            </div>

            <div class="field-group priority-field">
              <label> Prioridad </label>

              <div class="priority-options">
                <button
                  type="button"
                  :class="{
                    active: item.priority === 'necessary',
                  }"
                  @click="item.priority = 'necessary'"
                >
                  Necesario
                </button>

                <button
                  type="button"
                  :class="{
                    active: item.priority === 'flexible',
                  }"
                  @click="item.priority = 'flexible'"
                >
                  Flexible
                </button>

                <button
                  type="button"
                  :class="{
                    active: item.priority === 'optional',
                  }"
                  @click="item.priority = 'optional'"
                >
                  Opcional
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <button type="button" class="add-button" @click="addItem">
        <Plus :size="18" />

        Agregar otro gasto variable
      </button>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div class="footer-actions">
        <button type="button" class="skip-button" :disabled="loading" @click="skip">
          Omitir por ahora
        </button>

        <button type="button" class="continue-button" :disabled="loading" @click="save">
          {{ loading ? 'Guardando...' : 'Guardar y continuar' }}

          <ChevronRight v-if="!loading" :size="18" />
        </button>
      </div>
    </section>

    <aside class="help-card">
      <div class="help-icon">
        <CircleHelp :size="21" />
      </div>

      <span class="help-eyebrow"> CÓMO FUNCIONA </span>

      <h3>Esperado vs. máximo</h3>

      <p>El monto esperado es lo que normalmente crees que gastarás durante el ciclo.</p>

      <p>El máximo representa el punto en el que ese gasto empieza a salirse de lo normal.</p>

      <div class="example">
        <ShoppingBasket :size="18" />

        <div>
          <span> Snacks </span>

          <strong> $25 esperado · $40 máximo </strong>
        </div>
      </div>

      <div class="priority-help">
        <div>
          <strong>Necesario</strong>
          <span> Nivela intentará protegerlo. </span>
        </div>

        <div>
          <strong>Flexible</strong>
          <span> Puede reducirse si hace falta. </span>
        </div>

        <div>
          <strong>Opcional</strong>
          <span> Será lo primero que Nivela recorte. </span>
        </div>
      </div>
    </aside>
  </main>

  <section v-else class="saved-state">
    <div class="saved-icon">
      <Check :size="30" />
    </div>

    <span class="eyebrow"> PASO 4 COMPLETADO </span>

    <h1>Ya conocemos tus gastos variables</h1>

    <p>Nivela podrá ajustar estos presupuestos cuando tengas semanas más caras o más económicas.</p>

    <button type="button" class="continue-button final-button" @click="emit('completed')">
      Revisar mi planificación

      <ChevronRight :size="18" />
    </button>
  </section>
</template>

<style scoped lang="scss">
.variables-layout {
  display: grid;
  grid-template-columns:
    minmax(0, 1.5fr)
    minmax(270px, 0.5fr);

  gap: 22px;
  margin-top: 34px;
}

.variables-card,
.help-card {
  border: 1px solid #e5eaf1;
  background: white;
}

.variables-card {
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
  max-width: 600px;

  margin: 10px 0 0;

  color: #64748b;

  font-size: 11px;
  line-height: 1.7;
}

.variable-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);

  gap: 10px;

  margin-top: 22px;
}

.variable-summary > div {
  display: flex;
  flex-direction: column;

  padding: 14px;

  border-radius: 14px;

  background: #f8fafc;
}

.variable-summary span {
  color: #94a3b8;
  font-size: 8px;
}

.variable-summary strong {
  margin-top: 3px;

  color: #1e293b;

  font-size: 16px;
}

.variables-list {
  display: flex;
  flex-direction: column;

  gap: 13px;

  margin-top: 20px;
}

.variable-item {
  padding: 18px;

  border: 1px solid #e8edf4;
  border-radius: 18px;

  background: #fbfcfe;
}

.variable-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 16px;
}

.variable-item__header > div {
  display: flex;
  flex-direction: column;
}

.variable-item__header span {
  color: #94a3b8;

  font-size: 8px;
  font-weight: 800;

  letter-spacing: 1px;
}

.variable-item__header strong {
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
.amount-input {
  width: 100%;
  min-height: 43px;

  border: 1px solid #dce3ec;
  border-radius: 12px;

  background: white;
  color: #0f172a;

  font-family: inherit;
  font-size: 10px;

  outline: none;
}

.field-input {
  padding: 0 12px;
}

.amount-input {
  display: flex;
  align-items: center;
  gap: 7px;

  padding: 0 12px;

  color: #94a3b8;
}

.amount-input input {
  width: 100%;

  border: 0;
  outline: 0;

  background: transparent;

  font-family: inherit;
  font-size: 10px;
}

.field-input:focus,
.amount-input:focus-within {
  border-color: #93bdfb;

  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.07);
}

.priority-field {
  grid-column: 1 / -1;
}

.priority-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);

  gap: 7px;
}

.priority-options button {
  min-height: 39px;

  border: 1px solid #dce3ec;
  border-radius: 11px;

  background: white;
  color: #64748b;

  cursor: pointer;

  font-family: inherit;
  font-size: 8px;
  font-weight: 700;
}

.priority-options button.active {
  border-color: #bfdbfe;

  background: #edf5ff;
  color: #2563eb;
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

  background: white;
  color: #64748b;
}

.continue-button {
  display: flex;

  align-items: center;
  justify-content: center;

  gap: 7px;

  border: 0;

  background: #3b82f6;
  color: white;

  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.18);
}

.continue-button:disabled,
.skip-button:disabled {
  opacity: 0.6;
  cursor: wait;
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

  background: #fff7ed;
  color: #f59e0b;
}

.help-card h3 {
  margin: 8px 0 0;

  color: #1e293b;

  font-size: 16px;
}

.help-card > p {
  margin: 12px 0 0;

  color: #64748b;

  font-size: 9px;
  line-height: 1.65;
}

.example {
  display: flex;
  align-items: center;
  gap: 10px;

  margin-top: 18px;
  padding: 12px;

  border-radius: 12px;

  background: #f8fafc;
  color: #f59e0b;
}

.example > div {
  display: flex;
  flex-direction: column;
}

.example span {
  color: #64748b;
  font-size: 8px;
}

.example strong {
  margin-top: 2px;

  color: #334155;
  font-size: 9px;
}

.priority-help {
  display: flex;
  flex-direction: column;

  gap: 8px;

  margin-top: 18px;
}

.priority-help > div {
  display: flex;
  flex-direction: column;

  padding: 10px;

  border-radius: 10px;

  background: #f8fafc;
}

.priority-help strong {
  color: #334155;
  font-size: 8px;
}

.priority-help span {
  margin-top: 2px;

  color: #94a3b8;
  font-size: 8px;
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
  .variables-layout {
    grid-template-columns: 1fr;
  }

  .help-card {
    position: static;
  }
}

@media (max-width: 600px) {
  .variables-card,
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

  .priority-field {
    grid-column: auto;
  }

  .priority-options {
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

@media (max-width: 380px) {
  .variable-summary {
    grid-template-columns: 1fr;
  }
}
</style>