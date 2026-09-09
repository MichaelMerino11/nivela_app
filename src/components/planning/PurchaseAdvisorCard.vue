<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  SearchCheck,
  ShieldAlert,
} from 'lucide-vue-next'
import { canIBuy, type PurchaseAdvice } from '@/services/purchase-advisor'
import { centsToCurrency, moneyToCents } from '@/utils/money'

const emit = defineEmits<{
  (e: 'plan', amountCents: number): void
}>()

const amount = ref('')
const analyzing = ref(false)
const errorMessage = ref('')
const advice = ref<PurchaseAdvice | null>(null)

const decisionTitle = computed(() => {
  if (!advice.value) {
    return ''
  }

  if (advice.value.decision === 'yes') {
    return 'Sí, puedes'
  }

  if (advice.value.decision === 'careful') {
    return 'Con cuidado'
  }

  return 'Mejor no'
})

async function analyzePurchase() {
  errorMessage.value = ''
  advice.value = null

  try {
    const amountCents = moneyToCents(amount.value)

    if (amountCents <= 0) {
      throw new Error('Ingresa un monto mayor que cero.')
    }

    analyzing.value = true

    advice.value = await canIBuy(amountCents)
  } catch (error: any) {
    console.error('ERROR ANALIZANDO COMPRA:', error)

    errorMessage.value = error?.message || 'No pudimos analizar esta compra.'
  } finally {
    analyzing.value = false
  }
}

watch(amount, () => {
  /*
   * Si cambia el monto,
   * el análisis anterior ya no aplica.
   */
  advice.value = null
  errorMessage.value = ''
})
</script>

<template>
  <section class="advisor-card">
    <div class="advisor-header">
      <div class="advisor-icon">
        <SearchCheck :size="22" />
      </div>

      <div>
        <span class="eyebrow"> ASISTENTE DE COMPRA </span>

        <h2>¿Puedo comprarlo?</h2>

        <p>
          Prueba un monto antes de gastar. Nivela analizará cómo afectaría tu planificación actual.
        </p>
      </div>
    </div>

    <div class="advisor-body">
      <div class="advisor-form">
        <div class="amount-section">
          <label>
            <CircleDollarSign :size="16" />

            ¿Cuánto quieres gastar?
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
            @keyup.enter="analyzePurchase"
          />
        </div>

        <v-btn
          color="primary"
          variant="flat"
          size="large"
          :loading="analyzing"
          @click="analyzePurchase"
        >
          Analizar compra
        </v-btn>
      </div>

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mt-4">
        {{ errorMessage }}
      </v-alert>

      <!-- RESULTADO -->
      <div v-if="advice" class="advice-result" :class="`advice-result--${advice.decision}`">
        <div class="advice-result__icon">
          <CheckCircle2 v-if="advice.decision === 'yes'" :size="26" />

          <AlertTriangle v-else-if="advice.decision === 'careful'" :size="26" />

          <ShieldAlert v-else :size="26" />
        </div>

        <div class="advice-result__content">
          <span> RECOMENDACIÓN DE NIVELA </span>

          <h3>
            {{ decisionTitle }}
          </h3>

          <p>
            {{ advice.message }}
          </p>

          <div class="impact-grid">
            <div>
              <span> Compra </span>

              <strong>
                {{ centsToCurrency(advice.amountCents) }}
              </strong>
            </div>

            <div>
              <span> Dinero tranquilo actual </span>

              <strong>
                {{ centsToCurrency(advice.currentAvailableCents) }}
              </strong>
            </div>

            <div>
              <span> Después de comprar </span>

              <strong
                :class="{
                  negative: advice.availableAfterPurchaseCents < 0,
                }"
              >
                {{ centsToCurrency(advice.availableAfterPurchaseCents) }}
              </strong>
            </div>

            <div>
              <span> Riesgo actual </span>

              <strong> {{ advice.currentRiskScore }}/100 </strong>
            </div>
          </div>

          <div class="advice-actions">
            <v-btn color="primary" variant="tonal" @click="emit('plan', advice.amountCents)">
              <strong>Planificar este gasto</strong>
            </v-btn>
          </div>
        </div>
      </div>

      <!-- ESTADO INICIAL -->
      <div v-else class="advisor-placeholder">
        <div>
          <CircleDollarSign :size="23" />
        </div>

        <p>Escribe un monto para simular la compra sin registrar ningún gasto.</p>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.advisor-card {
  margin-top: 16px;

  overflow: hidden;

  border: 1px solid #e8edf4;
  border-radius: 20px;

  background: radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.08), transparent 35%), white;
}

.advisor-header {
  display: flex;

  align-items: flex-start;

  gap: 13px;

  padding: 21px;

  border-bottom: 1px solid #edf1f5;
}

.advisor-icon {
  display: grid;

  width: 44px;
  height: 44px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 14px;

  background: #eff6ff;
  color: #3b82f6;
}

.eyebrow {
  display: block;

  margin-bottom: 4px;

  color: #94a3b8;

  font-size: 9px;
  font-weight: 700;

  letter-spacing: 1.2px;
}

.advisor-header h2 {
  margin: 0;

  color: #1e293b;

  font-size: 16px;
  font-weight: 800;
}

.advisor-header p {
  max-width: 570px;

  margin: 5px 0 0;

  color: #64748b;

  font-size: 9px;
  line-height: 1.6;
}

.advisor-body {
  padding: 21px;
}

.advisor-form {
  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    auto;

  align-items: flex-end;

  gap: 12px;
}

.amount-section label {
  display: flex;

  align-items: center;

  gap: 6px;

  margin-bottom: 7px;

  color: #334155;

  font-size: 10px;
  font-weight: 700;
}

.amount-input :deep(input) {
  font-size: 20px;
  font-weight: 800;
}

.advisor-placeholder {
  display: flex;

  min-height: 115px;

  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: 9px;

  margin-top: 18px;

  border: 1px dashed #dbe3ec;
  border-radius: 15px;

  background: #fbfcfe;
  color: #94a3b8;
}

.advisor-placeholder > div {
  display: grid;

  width: 42px;
  height: 42px;

  place-items: center;

  border-radius: 13px;

  background: #f1f5f9;
}

.advisor-placeholder p {
  max-width: 330px;

  margin: 0;

  font-size: 9px;
  line-height: 1.6;

  text-align: center;
}

.advice-result {
  display: flex;

  align-items: flex-start;

  gap: 14px;

  margin-top: 18px;
  padding: 17px;

  border-radius: 16px;
}

.advice-result--yes {
  border: 1px solid #bbf7d0;

  background: #f0fdf4;
  color: #16a34a;
}

.advice-result--careful {
  border: 1px solid #fed7aa;

  background: #fff7ed;
  color: #d97706;
}

.advice-result--no {
  border: 1px solid #fecaca;

  background: #fff5f5;
  color: #e11d48;
}

.advice-result__icon {
  display: grid;

  width: 46px;
  height: 46px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 14px;

  background: white;
}

.advice-result__content {
  min-width: 0;
  flex: 1;
}

.advice-result__content > span {
  color: currentColor;

  font-size: 8px;
  font-weight: 700;

  letter-spacing: 1px;
}

.advice-result__content h3 {
  margin: 2px 0 4px;

  color: #1e293b;

  font-size: 17px;
}

.advice-result__content p {
  margin: 0;

  color: #64748b;

  font-size: 9px;
  line-height: 1.6;
}

.impact-grid {
  display: grid;

  grid-template-columns: repeat(4, minmax(0, 1fr));

  gap: 10px;

  margin-top: 14px;
}

.impact-grid > div {
  display: flex;

  flex-direction: column;

  padding: 10px;

  border-radius: 11px;

  background: rgba(255, 255, 255, 0.78);
}

.impact-grid span {
  color: #94a3b8;

  font-size: 7px;
}

.impact-grid strong {
  margin-top: 3px;

  color: #334155;

  font-size: 11px;
}

.negative {
  color: #e11d48 !important;
}

.advice-actions {
  display: flex;

  justify-content: flex-end;

  margin-top: 13px;
}

@media (max-width: 700px) {
  .advisor-form {
    grid-template-columns: 1fr;
  }

  .advisor-form :deep(.v-btn) {
    width: 100%;
  }

  .impact-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 420px) {
  .advisor-header,
  .advisor-body {
    padding: 17px;
  }

  .impact-grid {
    grid-template-columns: 1fr;
  }
}
</style>
