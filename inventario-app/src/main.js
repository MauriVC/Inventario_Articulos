import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/styles/global.css'

import { auth } from './auth'

const app = createApp(App)

// Directiva global v-permission
app.directive('permission', {
  mounted(el, binding) {
    if (!auth.hasPermission(binding.value)) {
      el.parentNode && el.parentNode.removeChild(el)
    }
  }
})

app.use(router)
app.mount('#app')
