<script setup lang="ts">
import { computed, ref } from 'vue'

import { BriefcaseBusiness, Check, ChevronRight, Heart, House, Info } from 'lucide-vue-next'

import { saveOnboardingRoutine, type RoutineRuleInput } from '@/services/onboarding'

import { centsToCurrency, moneyToCents } from '@/utils/money'

const emit = defineEmits<{
  completed: []
}>()

interface RoutineDay {
  weekday: number
  day: string
  shortDay: string

  title: string

  normalAmount: string
  maxAmount: string

  type: 'work' | 'partner' | 'family'
}

const days = ref<RoutineDay[]>([
  {
    weekday: 1,
    day: 'Lunes',
    shortDay: 'LUN',
    title: 'Trabajo',
    normalAmount: '',
    maxAmount: '',
    type: 'work',
  },
  {
    weekday: 2,
    day: 'Martes',
    shortDay: 'MAR',
    title: 'Trabajo',
    normalAmount: '',
    maxAmount: '',
    type: 'work',
  },
  {
    weekday: 3,
    day: 'Miércoles',
    shortDay: 'MIÉ',
    title: 'Trabajo',
    normalAmount: '',
    maxAmount: '',
    type: 'work',
  },
  {
    weekday: 4,
    day: 'Jueves',
    shortDay: 'JUE',
    title: 'Trabajo + pareja',
    normalAmount: '20',
    maxAmount: '30',
    type: 'partner',
  },
  {
    weekday: 5,
    day: 'Viernes',
    shortDay: 'VIE',
    title: 'Trabajo + pareja',
    normalAmount: '20',
    maxAmount: '30',
    type: 'partner',
  },
  {
    weekday: 6,
    day: 'Sábado',
    shortDay: 'SÁB',
    title: 'Familia',
    normalAmount: '',
    maxAmount: '',
    type: 'family',
  },
  {
    weekday: 7,
    day: 'Domingo',
    shortDay: 'DOM',
    title: 'Familia',
    normalAmount: '',
    maxAmount: '',
    type: 'family',
  },
])

const loading = ref(false)
const errorMessage = ref('')
const saved = ref(false)

function iconFor(type: RoutineDay['type']) {
  if (type === 'partner') {
    return Heart
  }

  if (type === 'family') {
    return House
  }

  return BriefcaseBusiness
}

const weeklyNormalCents = computed(() => {
  return days.value.reduce((total, day) => {
    try {
      if (!day.normalAmount.trim()) {
        return total
      }

      return total + moneyToCents(day.normalAmount)
    } catch {
      return total
    }
  }, 0)
})

const weeklyMaxCents = computed(() => {
  return days.value.reduce((total, day) => {
    try {
      if (!day.maxAmount.trim()) {
        return total
      }

      return total + moneyToCents(day.maxAmount)
    } catch {
      return total
    }
  }, 0)
})

const normalPreview = computed(() => centsToCurrency(weeklyNormalCents.value))

const maxPreview = computed(() => centsToCurrency(weeklyMaxCents.value))

function buildPayload(): RoutineRuleInput[] {
  return days.value.map((day) => {
    const title = day.title.trim()

    if (!title) {
      throw new Error(`${day.day} necesita una descripción.`)
    }

    const normal = day.normalAmount.trim() ? moneyToCents(day.normalAmount) : 0

    const maximum = day.maxAmount.trim() ? moneyToCents(day.maxAmount) : normal

    if (normal < 0) {
      throw new Error(`El gasto normal de ${day.day} no puede ser negativo.`)
    }

    if (maximum < normal) {
      throw new Error(`El máximo de ${day.day} no puede ser menor al gasto normal.`)
    }

    return {
      weekday: day.weekday,
      title,

      normalAmountCents: normal,

      maxAmountCents: maximum,
    }
  })
}

async function save() {
  errorMessage.value = ''

  try {
    const payload = buildPayload()

    loading.value = true

    await saveOnboardingRoutine(payload)

    saved.value = true
  } catch (error: any) {
    console.error('ERROR RUTINA:', error)

    errorMessage.value = error?.message || 'No pudimos guardar tu rutina.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main v-if="!saved" class="routine-layout">
    <section class="routine-card">
      <span class="eyebrow"> PASO 3 · TU RUTINA </span>

      <h1>¿Cómo suele ser tu semana?</h1>

      <p class="description">
        Define cuánto normalmente puedes gastar cada día y cuál sería un máximo razonable. Nivela
        utilizará esto como referencia, no como una regla rígida.
      </p>

      <div class="info-box">
        <Info :size="18" />

        <p>
          Si un día gastas más del máximo, Nivela no bloqueará el gasto. Simplemente recalculará el
          resto de tu ciclo.
        </p>
      </div>

      <div class="weekly-summary">
        <div>
          <span> Semana habitual </span>

          <strong>
            {{ normalPreview }}
          </strong>
        </div>

        <div>
          <span> Máximo semanal </span>

          <strong>
            {{ maxPreview }}
          </strong>
        </div>
      </div>

      <div class="days-list">
        <article v-for="day in days" :key="day.weekday" class="day-card">
          <div class="day-badge" :class="`day-badge--${day.type}`">
            <component :is="iconFor(day.type)" :size="18" />

            <span>
              {{ day.shortDay }}
            </span>
          </div>

          <div class="day-main">
            <div class="day-heading">
              <strong>
                {{ day.day }}
              </strong>

              <input v-model="day.title" class="activity-input" placeholder="Actividad del día" />
            </div>

            <div class="budget-grid">
              <div>
                <label> Gasto normal </label>

                <div class="amount-input">
                  <span>$</span>

                  <input v-model="day.normalAmount" inputmode="decimal" placeholder="0.00" />
                </div>
              </div>

              <div>
                <label> Máximo razonable </label>

                <div class="amount-input">
                  <span>$</span>

                  <input v-model="day.maxAmount" inputmode="decimal" placeholder="0.00" />
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <button type="button" class="continue-button" :disabled="loading" @click="save">
        {{ loading ? 'Guardando...' : 'Guardar mi rutina' }}

        <ChevronRight v-if="!loading" :size="18" />
      </button>
    </section>

    <aside class="help-card">
      <span class="help-eyebrow"> EJEMPLO </span>

      <h3>Jueves con tu pareja</h3>

      <div class="example-budget">
        <div>
          <span>Normal</span>
          <strong>$20</strong>
        </div>

        <div>
          <span>Máximo</span>
          <strong>$30</strong>
        </div>
      </div>

      <p>Si gastas $20, estás exactamente dentro de tu rutina.</p>

      <p>Si gastas $25, sigues dentro del margen permitido.</p>

      <p>
        Si gastas $40, Nivela detectará $10 sobre tu máximo y redistribuirá ese exceso entre los
        días restantes.
      </p>

      <div class="help-note">
        Cumpleaños, viajes o eventos especiales podrán marcarse después como gastos excepcionales
        justificados.
      </div>
    </aside>
  </main>

  <section v-else class="saved-state">
    <div class="saved-icon">
      <Check :size="30" />
    </div>

    <span class="eyebrow"> PASO 3 COMPLETADO </span>

    <h1>Nivela ya conoce tu semana</h1>

    <p>Ahora podrá distinguir entre un día normal, un día con tu pareja y tus días familiares.</p>

    <button type="button" class="continue-button final-button" @click="emit('completed')">
      Continuar

      <ChevronRight :size="18" />
    </button>
  </section>
</template>

<style scoped lang="scss">
.routine-layout {
  display: grid;
  grid-template-columns:
    minmax(0, 1.5fr)
    minmax(270px, 0.5fr);

  gap: 22px;
  margin-top: 34px;
}

.routine-card,
.help-card {
  border: 1px solid #e5eaf1;
  background: white;
}

.routine-card {
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
  max-width: 620px;

  margin: 10px 0 0;

  color: #64748b;

  font-size: 11px;
  line-height: 1.7;
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;

  margin-top: 22px;
  padding: 13px;

  border: 1px solid #dbeafe;
  border-radius: 14px;

  background: #f8fbff;
  color: #3b82f6;
}

.info-box p {
  margin: 0;

  color: #64748b;

  font-size: 9px;
  line-height: 1.6;
}

.weekly-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);

  gap: 10px;

  margin-top: 18px;
}

.weekly-summary > div {
  display: flex;
  flex-direction: column;

  padding: 14px;

  border-radius: 14px;

  background: #f8fafc;
}

.weekly-summary span {
  color: #94a3b8;

  font-size: 8px;
}

.weekly-summary strong {
  margin-top: 3px;

  color: #1e293b;

  font-size: 16px;
}

.days-list {
  display: flex;
  flex-direction: column;

  gap: 11px;

  margin-top: 20px;
}

.day-card {
  display: flex;
  align-items: flex-start;

  gap: 14px;

  padding: 15px;

  border: 1px solid #e8edf4;
  border-radius: 17px;

  background: #fbfcfe;
}

.day-badge {
  display: flex;
  width: 52px;
  min-width: 52px;
  height: 58px;

  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: 4px;

  border-radius: 14px;
}

.day-badge span {
  font-size: 8px;
  font-weight: 800;
}

.day-badge--work {
  background: #eef5ff;
  color: #3b82f6;
}

.day-badge--partner {
  background: #fff1f5;
  color: #ec4899;
}

.day-badge--family {
  background: #ecfdf3;
  color: #16a34a;
}

.day-main {
  flex: 1;
  min-width: 0;
}

.day-heading {
  display: flex;
  align-items: center;

  gap: 12px;
}

.day-heading strong {
  width: 76px;

  flex-shrink: 0;

  color: #334155;

  font-size: 10px;
}

.activity-input {
  width: 100%;
  min-height: 36px;

  padding: 0 11px;

  border: 1px solid #dce3ec;
  border-radius: 10px;

  outline: none;

  background: white;

  font-family: inherit;
  font-size: 9px;
}

.budget-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);

  gap: 10px;

  margin-top: 11px;
}

.budget-grid > div {
  display: flex;
  flex-direction: column;

  gap: 5px;
}

.budget-grid label {
  color: #94a3b8;

  font-size: 8px;
  font-weight: 700;
}

.amount-input {
  display: flex;
  min-height: 38px;

  align-items: center;
  gap: 6px;

  padding: 0 10px;

  border: 1px solid #dce3ec;
  border-radius: 10px;

  background: white;

  color: #94a3b8;
}

.amount-input input {
  width: 100%;

  border: 0;
  outline: 0;

  background: transparent;

  font-family: inherit;
  font-size: 9px;
}

.activity-input:focus,
.amount-input:focus-within {
  border-color: #93bdfb;

  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.07);
}

.continue-button {
  display: flex;
  min-height: 48px;

  align-items: center;
  justify-content: center;

  gap: 7px;

  margin-top: 22px;
  padding: 0 20px;

  border: 0;
  border-radius: 13px;

  background: #3b82f6;
  color: white;

  cursor: pointer;

  font-family: inherit;
  font-size: 10px;
  font-weight: 700;

  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.18);
}

.routine-card > .continue-button {
  width: 100%;
}

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

.help-card h3 {
  margin: 8px 0 0;

  color: #1e293b;

  font-size: 16px;
}

.example-budget {
  display: grid;
  grid-template-columns: 1fr 1fr;

  gap: 8px;

  margin-top: 18px;
}

.example-budget > div {
  display: flex;
  flex-direction: column;

  padding: 12px;

  border-radius: 12px;

  background: #f8fafc;
}

.example-budget span {
  color: #94a3b8;
  font-size: 8px;
}

.example-budget strong {
  margin-top: 3px;

  color: #1e293b;

  font-size: 15px;
}

.help-card > p {
  margin: 14px 0 0;

  color: #64748b;

  font-size: 9px;
  line-height: 1.65;
}

.help-note {
  margin-top: 20px;
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
  .routine-layout {
    grid-template-columns: 1fr;
  }

  .help-card {
    position: static;
  }
}

@media (max-width: 600px) {
  .routine-card,
  .saved-state {
    padding: 22px 18px;

    border-radius: 21px;
  }

  h1 {
    font-size: 25px;
  }

  .day-card {
    flex-direction: column;
  }

  .day-badge {
    width: 100%;
    height: 42px;

    flex-direction: row;
  }

  .day-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .day-heading strong {
    width: auto;
  }

  .budget-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 380px) {
  .budget-grid,
  .weekly-summary {
    grid-template-columns: 1fr;
  }
}
</style>