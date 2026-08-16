<script setup lang="ts">
import { z } from "zod";

definePageMeta({ layout: false });
useHead({ title: "Login" });

const auth = useAuthStore();
const username = ref("");
const password = ref("");
const error = ref("");
const isPasswordVisible = ref(false);

const schema = z.object({
  username: z.string().min(1, "Username wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});

async function submit(): Promise<void> {
  error.value = "";
  const parsed = schema.safeParse({ username: username.value, password: password.value });
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? "Form belum lengkap.";
    return;
  }
  try {
    await auth.login(parsed.data.username, parsed.data.password);
    await navigateTo("/");
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Login gagal. Periksa kembali kredensial Anda.";
  }
}

function togglePasswordVisibility() {
  isPasswordVisible.value = !isPasswordVisible.value;
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
    <!-- Background Decorators -->
    <div
      class="absolute -top-40 -left-40 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"
    />
    <div
      class="absolute top-40 -right-40 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"
    />
    <div
      class="absolute -bottom-40 left-20 w-96 h-96 bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"
    />

    <div
      class="relative w-full max-w-5xl flex rounded-2xl shadow-2xl bg-white overflow-hidden z-10 border border-gray-100 mx-4"
    >
      <!-- Left Panel: Illustration / Branding -->
      <div
        class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-800 p-12 text-white flex-col justify-between relative"
      >
        <div class="absolute inset-0 bg-black opacity-10" />
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />

        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <span class="text-2xl font-bold tracking-wider">SIMRS</span>
          </div>

          <h1 class="text-4xl font-extrabold leading-tight mb-4">SIMRS</h1>
          <p class="text-blue-100 text-lg max-w-sm leading-relaxed">
            Sistem Informasi Manajemen Rumah Sakit Terintegrasi. Mengelola IGD, Rawat Jalan, dan Rawat Inap secara
            komprehensif.
          </p>
        </div>

        <div class="relative z-10 flex items-center gap-4 text-sm font-medium text-blue-200">
          <div class="flex -space-x-2">
            <div
              class="w-8 h-8 rounded-full bg-blue-500 border-2 border-blue-700 flex items-center justify-center text-xs"
            >
              IGD
            </div>
            <div
              class="w-8 h-8 rounded-full bg-indigo-500 border-2 border-indigo-700 flex items-center justify-center text-xs"
            >
              RJ
            </div>
            <div
              class="w-8 h-8 rounded-full bg-purple-500 border-2 border-purple-700 flex items-center justify-center text-xs"
            >
              RI
            </div>
          </div>
          <span>Modul Medis Siap Digunakan</span>
        </div>
      </div>

      <!-- Right Panel: Login Form -->
      <div class="w-full lg:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-white relative">
        <div class="max-w-md w-full mx-auto">
          <div class="lg:hidden flex items-center gap-2 mb-8">
            <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <span class="text-xl font-bold text-gray-900">SIMRS</span>
          </div>

          <h2 class="text-2xl font-bold text-gray-900 mb-2">Selamat Datang!</h2>
          <p class="text-gray-500 text-sm mb-8">Silakan masuk menggunakan akun petugas medis Anda.</p>

          <form class="space-y-5" @submit.prevent="submit">
            <!-- Alert Error -->
            <div
              v-if="error"
              class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 animate-fade-in"
            >
              <svg class="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span class="text-sm text-red-700 font-medium">{{ error }}</span>
            </div>

            <!-- Username Field -->
            <div>
              <label for="username" class="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  id="username"
                  v-model.trim="username"
                  type="text"
                  class="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent sm:text-sm transition-shadow outline-none bg-gray-50 focus:bg-white"
                  placeholder="Masukkan username"
                  autocomplete="username"
                  required
                >
              </div>
            </div>

            <!-- Password Field -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="password" class="block text-sm font-semibold text-gray-700">Password</label>
              </div>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  id="password"
                  v-model="password"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  class="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent sm:text-sm transition-shadow outline-none bg-gray-50 focus:bg-white"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  required
                >
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  @click="togglePasswordVisibility"
                >
                  <svg v-if="!isPasswordVisible" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="auth.loading"
              class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors mt-6"
            >
              <svg
                v-if="auth.loading"
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {{ auth.loading ? "Memverifikasi..." : "Login" }}
            </button>
          </form>

          <div class="mt-8 pt-6 border-t border-gray-100">
            <p class="text-center text-xs text-gray-400">
              &copy; {{ new Date().getFullYear() }} SIMRS. Hak Cipta Dilindungi.
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}
.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
