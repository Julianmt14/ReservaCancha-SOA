import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Dos reglas nuevas de React 19 que el codigo heredado del frontend incumple en 15 lugares.
    // Reescribir esos efectos sin pruebas de interfaz es mas riesgoso que dejarlos, asi que van como
    // aviso. El tope de avisos del script "lint" garantiza que la deuda solo pueda bajar.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
