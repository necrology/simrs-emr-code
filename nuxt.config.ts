export default defineNuxtConfig({
  compatibilityDate: '2026-07-15',
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/tailwindcss', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  typescript: { strict: true, typeCheck: true },
  runtimeConfig: {
    apiBaseUrl: 'http://127.0.0.1:8000/api',
    public: {
      appName: 'SIMRS EMR',
      apiBaseUrl: 'http://127.0.0.1:8000/api/v1',
      mobileApiBaseUrl: 'http://127.0.0.1:8000/api/v1/mobile',
    },
  },
  app: {
    head: {
      titleTemplate: '%s · SIMRS EMR',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'noindex,nofollow' },
      ],
    },
  },
  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
  },
})
