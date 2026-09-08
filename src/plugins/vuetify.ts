import 'vuetify/styles'

import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'nivelaLight',

    themes: {
      nivelaLight: {
        dark: false,

        colors: {
          background: '#F7F9FC',
          surface: '#FFFFFF',

          primary: '#3B82F6',
          'primary-darken-1': '#2563EB',

          secondary: '#64748B',

          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#0EA5E9',

          'surface-soft': '#F1F5F9',
          'text-primary': '#0F172A',
          'text-secondary': '#64748B',
        },
      },
    },
  },

  defaults: {
    VCard: {
      elevation: 0,
      rounded: 'xl',
    },

    VBtn: {
      rounded: 'lg',
      elevation: 0,
    },

    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
    },

    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
    },
  },
})