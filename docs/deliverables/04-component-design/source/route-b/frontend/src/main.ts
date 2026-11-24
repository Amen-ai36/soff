import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'
import App from './App.vue'
import { createClient } from './api/createClient'
import { API_KEY } from './composables/useApi'
import { SESSION_KEY, createSessionStore } from './composables/useSession'
import { FEATURES_KEY, enabledFeatures } from './features/registry'
import { createAppRouter } from './router'
import './styles/main.css'

// ApiClient 在此注入，页面只依赖接口（ADR-M9-02）。
const api = createClient(import.meta.env, window.location)
const session = createSessionStore(api)
const features = enabledFeatures()
const router = createAppRouter({ history: createWebHistory(), features, session })

void session.ensureLoaded()

createApp(App)
  .provide(API_KEY, api)
  .provide(SESSION_KEY, session)
  .provide(FEATURES_KEY, features)
  .use(router)
  .mount('#app')
