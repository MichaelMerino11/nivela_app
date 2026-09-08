<script setup lang="ts">
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Heart,
  Home,
  PiggyBank,
  ShoppingBasket,
  TrendingUp,
  Wallet,
} from 'lucide-vue-next'

const upcomingExpenses = [
  {
    title: 'Salida',
    description: 'Jueves · Pareja',
    amount: 20,
    icon: Heart,
  },
  {
    title: 'Salida',
    description: 'Viernes · Pareja',
    amount: 20,
    icon: Heart,
  },
  {
    title: 'Compras de casa',
    description: 'Domingo · Hogar',
    amount: 25,
    icon: ShoppingBasket,
  },
  {
    title: 'Internet',
    description: '18 septiembre · Servicio',
    amount: 31,
    icon: Home,
  },
]
</script>

<template>
  <div class="page-container dashboard">
    <!-- BIENVENIDA -->
    <section class="dashboard-header">
      <div>
        <span class="eyebrow"> MARTES, 8 DE SEPTIEMBRE </span>

        <h1>Buenos días, Michael</h1>

        <p>Tu planificación está bajo control.</p>
      </div>

      <div class="cycle-pill">
        <CalendarDays :size="17" />

        <div>
          <span>Ciclo actual</span>
          <strong>1 sep — 30 sep</strong>
        </div>
      </div>
    </section>

    <!-- GRID PRINCIPAL -->
    <section class="hero-grid">
      <!-- PRESUPUESTO HOY -->
      <article class="today-card">
        <div class="today-card__header">
          <div>
            <span class="card-eyebrow"> PRESUPUESTO DE HOY </span>

            <h2>Puedes gastar</h2>
          </div>

          <div class="status-badge status-badge--success">
            <span class="status-dot" />
            Todo bien
          </div>
        </div>

        <div class="today-money">
          <span class="today-money__currency">$</span>
          <strong>24</strong>
          <span class="today-money__decimals">.50</span>
        </div>

        <p class="today-description">
          Puedes gastar esta cantidad tranquilamente sin afectar tus compromisos ni tu meta de
          ahorro.
        </p>

        <div class="today-progress">
          <div class="today-progress__labels">
            <span>Gastado hoy</span>

            <strong>
              $16.40
              <span>de $24.50</span>
            </strong>
          </div>

          <v-progress-linear
            model-value="67"
            height="8"
            rounded
            color="primary"
            bg-color="#E8EEF7"
          />
        </div>

        <div class="today-footer">
          <div>
            <span>Disponible normal</span>
            <strong>$8.10</strong>
          </div>

          <div class="today-footer__divider" />

          <div>
            <span>Máximo adicional</span>
            <strong>$14.80</strong>
          </div>
        </div>
      </article>

      <!-- RIESGO -->
      <article class="risk-card">
        <div class="risk-card__top">
          <div>
            <span class="card-eyebrow"> NIVEL DE RIESGO </span>

            <h3>Situación financiera</h3>
          </div>

          <TrendingUp :size="21" class="risk-icon" />
        </div>

        <div class="risk-gauge">
          <div class="risk-gauge__circle">
            <div class="risk-gauge__inner">
              <strong>14</strong>
              <span>/100</span>
            </div>
          </div>
        </div>

        <div class="risk-state">
          <span class="status-dot" />
          Riesgo bajo
        </div>

        <p>Manteniendo este ritmo llegarás al próximo sueldo sin comprometer tu ahorro.</p>
      </article>
    </section>

    <!-- MÉTRICAS -->
    <section class="metrics-grid">
      <article class="metric-card">
        <div class="metric-icon metric-icon--blue">
          <Wallet :size="20" />
        </div>

        <div class="metric-content">
          <span>Dinero tranquilo</span>
          <strong>$483.60</strong>

          <small class="positive">
            <ArrowUpRight :size="14" />
            Disponible para el ciclo
          </small>
        </div>
      </article>

      <article class="metric-card">
        <div class="metric-icon metric-icon--green">
          <PiggyBank :size="20" />
        </div>

        <div class="metric-content">
          <span>Ahorro protegido</span>
          <strong>$100.00</strong>

          <small class="positive"> Meta protegida </small>
        </div>
      </article>

      <article class="metric-card">
        <div class="metric-icon metric-icon--orange">
          <CalendarDays :size="20" />
        </div>

        <div class="metric-content">
          <span>Días restantes</span>
          <strong>22 días</strong>

          <small> Hasta tu próximo sueldo </small>
        </div>
      </article>

      <article class="metric-card">
        <div class="metric-icon metric-icon--purple">
          <TrendingUp :size="20" />
        </div>

        <div class="metric-content">
          <span>Proyección final</span>
          <strong>+$128.40</strong>

          <small class="positive">
            <ArrowUpRight :size="14" />
            Sobre tu ahorro objetivo
          </small>
        </div>
      </article>
    </section>

    <!-- CONTENIDO SECUNDARIO -->
    <section class="content-grid">
      <!-- PRÓXIMOS GASTOS -->
      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="card-eyebrow"> PLANIFICACIÓN </span>

            <h3>Próximos gastos</h3>
          </div>

          <button class="text-action">
            Ver calendario
            <ChevronRight :size="16" />
          </button>
        </div>

        <div class="expense-list">
          <div
            v-for="expense in upcomingExpenses"
            :key="`${expense.title}-${expense.description}`"
            class="expense-item"
          >
            <div class="expense-item__icon">
              <component :is="expense.icon" :size="19" />
            </div>

            <div class="expense-item__description">
              <strong>{{ expense.title }}</strong>
              <span>{{ expense.description }}</span>
            </div>

            <strong class="expense-item__amount"> ${{ expense.amount.toFixed(2) }} </strong>
          </div>
        </div>
      </article>

      <!-- RESUMEN -->
      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="card-eyebrow"> ESTE CICLO </span>

            <h3>Resumen financiero</h3>
          </div>
        </div>

        <div class="summary-list">
          <div class="summary-row">
            <div>
              <span class="summary-dot summary-dot--income" />

              <div>
                <strong>Ingresos</strong>
                <span>Total del ciclo</span>
              </div>
            </div>

            <strong class="summary-amount positive"> +$1,250.00 </strong>
          </div>

          <div class="summary-row">
            <div>
              <span class="summary-dot summary-dot--expense" />

              <div>
                <strong>Gastado</strong>
                <span>Hasta hoy</span>
              </div>
            </div>

            <strong class="summary-amount"> -$396.40 </strong>
          </div>

          <div class="summary-row">
            <div>
              <span class="summary-dot summary-dot--committed" />

              <div>
                <strong>Comprometido</strong>
                <span>Gastos pendientes</span>
              </div>
            </div>

            <strong class="summary-amount"> -$270.00 </strong>
          </div>

          <div class="summary-divider" />

          <div class="summary-row summary-row--total">
            <div>
              <span class="summary-dot summary-dot--available" />

              <div>
                <strong>Dinero tranquilo</strong>
                <span>Disponible real</span>
              </div>
            </div>

            <strong class="summary-amount"> $483.60 </strong>
          </div>
        </div>
      </article>
    </section>

    <!-- MENSAJE INTELIGENTE -->
    <section class="insight-card">
      <div class="insight-card__icon">
        <CircleAlert :size="21" />
      </div>

      <div class="insight-card__content">
        <strong>Consejo de Nivela</strong>

        <p>
          Tus gastos están dentro de lo previsto. El jueves tienes una salida planificada de $20.00,
          por lo que te recomendamos mantener el gasto de hoy debajo de $24.50.
        </p>
      </div>

      <div class="insight-trend">
        <ArrowDownRight :size="17" />
        Riesgo estable
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  animation: dashboard-enter 0.45s ease-out;
}

@keyframes dashboard-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;

  margin-bottom: 26px;
}

.eyebrow,
.card-eyebrow {
  display: block;

  margin-bottom: 7px;

  color: #94a3b8;

  font-size: 10px;
  font-weight: 700;

  letter-spacing: 1.2px;
}

.dashboard-header h1 {
  margin: 0;

  color: #0f172a;

  font-size: clamp(25px, 3vw, 34px);
  font-weight: 800;

  letter-spacing: -1px;
}

.dashboard-header p {
  margin: 7px 0 0;

  color: #64748b;

  font-size: 13px;
}

.cycle-pill {
  display: flex;
  align-items: center;
  gap: 11px;

  padding: 11px 15px;

  border: 1px solid #e6ebf2;
  border-radius: 15px;

  background: #ffffff;

  color: #64748b;
}

.cycle-pill div {
  display: flex;
  flex-direction: column;
}

.cycle-pill span {
  font-size: 9px;
  font-weight: 500;
}

.cycle-pill strong {
  margin-top: 2px;

  color: #334155;

  font-size: 11px;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.7fr);

  gap: 18px;
}

.today-card,
.risk-card,
.metric-card,
.panel {
  border: 1px solid #e8edf4;
  background: #ffffff;
}

.today-card {
  overflow: hidden;
  padding: 26px;

  border-radius: 24px;

  background: radial-gradient(circle at 95% 0%, rgba(59, 130, 246, 0.11), transparent 36%), #ffffff;
}

.today-card__header,
.risk-card__top,
.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.today-card h2,
.risk-card h3,
.panel h3 {
  margin: 0;

  color: #1e293b;

  font-size: 16px;
  font-weight: 700;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 7px;

  padding: 7px 10px;

  border-radius: 999px;

  font-size: 10px;
  font-weight: 700;
}

.status-badge--success {
  background: #ecfdf3;
  color: #15803d;
}

.status-dot {
  width: 7px;
  height: 7px;

  border-radius: 50%;

  background: currentColor;

  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
}

.today-money {
  display: flex;
  align-items: flex-start;

  margin-top: 18px;

  color: #0f172a;
}

.today-money__currency {
  margin-top: 10px;
  margin-right: 4px;

  color: #64748b;

  font-size: 23px;
  font-weight: 700;
}

.today-money strong {
  font-size: clamp(54px, 8vw, 76px);
  font-weight: 800;

  line-height: 0.96;
  letter-spacing: -4px;
}

.today-money__decimals {
  margin-top: 9px;

  color: #64748b;

  font-size: 25px;
  font-weight: 700;
}

.today-description {
  max-width: 540px;

  margin: 15px 0 22px;

  color: #64748b;

  font-size: 12px;
  line-height: 1.7;
}

.today-progress__labels {
  display: flex;
  justify-content: space-between;

  margin-bottom: 8px;

  color: #64748b;

  font-size: 10px;
}

.today-progress__labels strong {
  color: #334155;

  font-size: 11px;
}

.today-progress__labels strong span {
  color: #94a3b8;
  font-weight: 500;
}

.today-footer {
  display: flex;
  align-items: center;
  gap: 26px;

  margin-top: 21px;
}

.today-footer > div:not(.today-footer__divider) {
  display: flex;
  flex-direction: column;
}

.today-footer span {
  color: #94a3b8;
  font-size: 9px;
}

.today-footer strong {
  margin-top: 3px;

  color: #334155;

  font-size: 14px;
}

.today-footer__divider {
  width: 1px;
  height: 30px;

  background: #e8edf4;
}

.risk-card {
  padding: 24px;

  border-radius: 24px;
}

.risk-icon {
  color: #22c55e;
}

.risk-gauge {
  display: flex;
  justify-content: center;

  margin: 20px 0 12px;
}

.risk-gauge__circle {
  display: grid;
  width: 126px;
  height: 126px;
  place-items: center;

  border-radius: 50%;

  background: conic-gradient(#22c55e 0deg 50deg, #edf1f5 50deg 360deg);
}

.risk-gauge__inner {
  display: flex;
  width: 98px;
  height: 98px;
  align-items: baseline;
  justify-content: center;

  padding-top: 31px;

  border-radius: 50%;

  background: #ffffff;
}

.risk-gauge__inner strong {
  color: #0f172a;

  font-size: 29px;
  font-weight: 800;
}

.risk-gauge__inner span {
  margin-left: 2px;

  color: #94a3b8;

  font-size: 10px;
}

.risk-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  color: #15803d;

  font-size: 11px;
  font-weight: 700;
}

.risk-card p {
  margin: 12px 0 0;

  color: #64748b;

  font-size: 10px;
  line-height: 1.65;

  text-align: center;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  gap: 14px;

  margin-top: 18px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 14px;

  padding: 17px;

  border-radius: 18px;
}

.metric-icon {
  display: grid;
  width: 43px;
  height: 43px;
  place-items: center;

  flex-shrink: 0;

  border-radius: 13px;
}

.metric-icon--blue {
  background: #eef5ff;
  color: #3b82f6;
}

.metric-icon--green {
  background: #ecfdf3;
  color: #22c55e;
}

.metric-icon--orange {
  background: #fff7ed;
  color: #f59e0b;
}

.metric-icon--purple {
  background: #f5f3ff;
  color: #8b5cf6;
}

.metric-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.metric-content > span {
  color: #94a3b8;

  font-size: 9px;
  font-weight: 500;
}

.metric-content > strong {
  margin-top: 3px;

  overflow: hidden;

  color: #1e293b;

  font-size: 17px;
  font-weight: 800;

  letter-spacing: -0.3px;

  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-content small {
  display: flex;
  align-items: center;
  gap: 3px;

  margin-top: 3px;

  color: #94a3b8;

  font-size: 8px;
}

.positive {
  color: #16a34a !important;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 18px;

  margin-top: 18px;
}

.panel {
  padding: 22px;

  border-radius: 22px;
}

.text-action {
  display: flex;
  align-items: center;
  gap: 2px;

  border: 0;

  background: transparent;
  color: #3b82f6;

  cursor: pointer;

  font-size: 10px;
  font-weight: 600;
}

.expense-list {
  margin-top: 16px;
}

.expense-item {
  display: flex;
  align-items: center;
  gap: 12px;

  padding: 12px 0;

  border-bottom: 1px solid #f0f3f7;
}

.expense-item:last-child {
  border-bottom: 0;
}

.expense-item__icon {
  display: grid;
  width: 39px;
  height: 39px;
  place-items: center;

  flex-shrink: 0;

  border-radius: 12px;

  background: #f4f7fb;
  color: #64748b;
}

.expense-item__description {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.expense-item__description strong {
  color: #334155;

  font-size: 11px;
  font-weight: 600;
}

.expense-item__description span {
  margin-top: 2px;

  color: #94a3b8;

  font-size: 9px;
}

.expense-item__amount {
  color: #334155;

  font-size: 12px;
}

.summary-list {
  margin-top: 16px;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 11px 0;
}

.summary-row > div {
  display: flex;
  align-items: center;
  gap: 11px;
}

.summary-row > div > div {
  display: flex;
  flex-direction: column;
}

.summary-row strong {
  color: #334155;

  font-size: 11px;
}

.summary-row span:not(.summary-dot) {
  margin-top: 2px;

  color: #94a3b8;

  font-size: 9px;
}

.summary-dot {
  display: block;
  width: 9px;
  height: 9px;

  flex-shrink: 0;

  border-radius: 50%;
}

.summary-dot--income {
  background: #22c55e;
}

.summary-dot--expense {
  background: #ef4444;
}

.summary-dot--committed {
  background: #f59e0b;
}

.summary-dot--available {
  background: #3b82f6;
}

.summary-amount {
  font-size: 12px !important;
}

.summary-divider {
  height: 1px;

  margin: 6px 0;

  background: #edf1f5;
}

.summary-row--total {
  padding-top: 15px;
}

.summary-row--total .summary-amount {
  color: #2563eb;

  font-size: 15px !important;
  font-weight: 800;
}

.insight-card {
  display: flex;
  align-items: center;
  gap: 14px;

  margin-top: 18px;
  padding: 17px 19px;

  border: 1px solid #dbeafe;
  border-radius: 18px;

  background: linear-gradient(90deg, #eff6ff, #f8fbff);
}

.insight-card__icon {
  display: grid;
  width: 41px;
  height: 41px;
  place-items: center;

  flex-shrink: 0;

  border-radius: 13px;

  background: #ffffff;
  color: #3b82f6;
}

.insight-card__content {
  flex: 1;
}

.insight-card__content strong {
  color: #1e3a5f;

  font-size: 11px;
}

.insight-card__content p {
  margin: 3px 0 0;

  color: #64748b;

  font-size: 10px;
  line-height: 1.6;
}

.insight-trend {
  display: flex;
  align-items: center;
  gap: 5px;

  flex-shrink: 0;

  color: #16a34a;

  font-size: 9px;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .dashboard-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .cycle-pill {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .dashboard-header {
    margin-bottom: 18px;
  }

  .dashboard-header h1 {
    font-size: 25px;
  }

  .hero-grid {
    gap: 13px;
  }

  .today-card,
  .risk-card,
  .panel {
    padding: 19px;

    border-radius: 20px;
  }

  .today-money strong {
    font-size: 60px;
  }

  .metrics-grid {
    grid-template-columns: 1fr 1fr;

    gap: 10px;

    margin-top: 13px;
  }

  .metric-card {
    align-items: flex-start;
    flex-direction: column;

    gap: 10px;

    padding: 15px;
  }

  .content-grid {
    gap: 13px;
    margin-top: 13px;
  }

  .today-footer {
    gap: 15px;
  }

  .insight-card {
    align-items: flex-start;

    margin-top: 13px;
  }

  .insight-trend {
    display: none;
  }
}

@media (max-width: 380px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
