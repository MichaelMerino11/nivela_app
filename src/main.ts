import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'

import { useAuthStore } from '@/stores/auth'

import './assets/main.scss'

async function bootstrap() {
  const app = createApp(App)

  const pinia = createPinia()

  app.use(pinia)
  app.use(vuetify)

  const authStore = useAuthStore(pinia)

  await authStore.initialize()

  app.use(router)

  await router.isReady()

  app.mount('#app')
}

bootstrap()