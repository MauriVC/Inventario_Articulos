<template>
  <div class="login-wrapper">
    <!-- Left Panel -->
    <div class="login-left">
      <div class="login-left-content">
        <img :src="logoUrl" alt="U.E. Corazón Nuevo" class="login-logo" />
        <h1 class="login-brand">Sistema de Control<br/>de Inventario</h1>
        <p class="login-brand-sub">Gestión de Almacenes</p>
        <div class="login-decorative">
          <div class="login-line"></div>
          <span>U.E. Corazón Nuevo</span>
          <div class="login-line"></div>
        </div>
        <p class="login-community">Comunidad Encuentro</p>
      </div>
      <div class="login-left-footer">
        <p>© 2026 — Todos los derechos reservados</p>
      </div>
    </div>

    <!-- Right Panel -->
    <div class="login-right">
      <div class="login-form-wrapper">
        <div class="login-welcome">
          <h2>Iniciar Sesión</h2>
          <p>Ingresa tus credenciales para acceder al sistema</p>
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="login-error" v-if="errorMsg">
            <span>⚠ {{ errorMsg }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">Carnet de Identidad</label>
            <div class="form-input-icon">
              <UserCircle :size="18" />
              <input
                v-model="form.carnet"
                type="text"
                class="form-input"
                :class="{ 'input-error': errorMsg }"
                placeholder="Ingrese su carnet"
                required
                :disabled="auth.state.loading"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <div class="form-input-icon">
              <Lock :size="18" />
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input"
                :class="{ 'input-error': errorMsg }"
                placeholder="Ingrese su contraseña"
                required
                :disabled="auth.state.loading"
                style="padding-right: 2.5rem;"
              />
              <button
                type="button"
                class="login-eye-btn"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-lg w-full login-btn" :disabled="auth.state.loading">
            <LogIn :size="20" />
            {{ auth.state.loading ? 'Ingresando...' : 'Ingresar al Sistema' }}
          </button>
        </form>

        <p class="login-version">v1.0.7</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { UserCircle, Lock, Eye, EyeOff, LogIn } from 'lucide-vue-next'
import { auth } from '@/auth'
import logoSrc from '@/assets/logo.png'

const router = useRouter()
const logoUrl = computed(() => logoSrc)
const showPassword = ref(false)

const form = ref({
  carnet: '',
  password: ''
})

const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''

  if (!form.value.carnet.trim() || !form.value.password.trim()) {
    errorMsg.value = 'Por favor ingrese su carnet y contraseña'
    return
  }

  const success = await auth.login(form.value.carnet.trim(), form.value.password)

  if (success) {
    router.push('/')
  } else {
    errorMsg.value = auth.state.loginError
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ---- Left Panel ---- */
.login-left {
  width: 45%;
  background: linear-gradient(145deg, var(--color-primary-darkest) 0%, var(--color-primary-dark) 50%, var(--color-primary) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.login-left::before {
  content: '';
  position: absolute;
  top: -30%;
  right: -20%;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
}
.login-left::after {
  content: '';
  position: absolute;
  bottom: -20%;
  left: -15%;
  width: 350px;
  height: 350px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
}
.login-left-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}
.login-logo {
  width: 130px;
  height: 130px;
  border-radius: var(--radius-full);
  border: 3px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  margin-bottom: var(--space-6);
  animation: logoFloat 3s ease-in-out infinite;
}
@keyframes logoFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.login-brand {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: var(--color-white);
  text-align: center;
  line-height: 1.3;
  margin-bottom: var(--space-2);
}
.login-brand-sub {
  font-size: var(--font-size-md);
  color: rgba(255, 255, 255, 0.6);
  font-weight: 300;
  margin-bottom: var(--space-6);
}
.login-decorative {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: rgba(255, 255, 255, 0.35);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 500;
}
.login-line {
  width: 50px;
  height: 1px;
  background: rgba(255, 255, 255, 0.25);
}
.login-community {
  margin-top: var(--space-2);
  color: rgba(255, 255, 255, 0.3);
  font-size: var(--font-size-sm);
  font-style: italic;
}
.login-left-footer {
  position: absolute;
  bottom: var(--space-5);
  color: rgba(255, 255, 255, 0.25);
  font-size: var(--font-size-xs);
  z-index: 1;
}

/* ---- Right Panel ---- */
.login-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-gray-50);
}
.login-form-wrapper {
  width: 100%;
  max-width: 400px;
  padding: var(--space-8);
}
.login-welcome {
  margin-bottom: var(--space-8);
}
.login-welcome h2 {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: var(--color-gray-800);
  margin-bottom: var(--space-2);
}
.login-welcome p {
  color: var(--color-gray-500);
  font-size: var(--font-size-base);
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.login-form .form-input {
  padding: var(--space-3) var(--space-3);
  padding-left: 2.75rem;
  font-size: var(--font-size-md);
  border-radius: var(--radius-lg);
}
.login-form .form-input-icon > svg:first-child {
  left: var(--space-3);
  width: 20px;
  height: 20px;
}
.login-btn {
  margin-top: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-md);
  font-weight: 600;
  border-radius: var(--radius-lg);
}
.login-eye-btn {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-gray-400);
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-eye-btn:hover {
  color: var(--color-gray-600);
}
.login-version {
  text-align: center;
  margin-top: var(--space-8);
  color: var(--color-gray-400);
  font-size: var(--font-size-xs);
}

/* Error message */
.login-error {
  background: rgba(229, 62, 62, 0.1);
  border: 1px solid rgba(229, 62, 62, 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  color: #E53E3E;
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-align: center;
  animation: shakeError 0.4s ease-in-out;
}
@keyframes shakeError {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.input-error {
  border-color: rgba(229, 62, 62, 0.5) !important;
}
</style>
