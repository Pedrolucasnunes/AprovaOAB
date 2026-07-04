// Config de lint do PROJETO (flat config, ESLint 9). Precisa existir aqui:
// sem ele, o ESLint sobe a árvore de diretórios e acaba usando um
// eslint.config.js perdido fora do repo (ex.: na home do usuário), com
// regras de outro ecossistema e varrendo o .next/ inteiro.
//
// eslint-config-next@16 já exporta flat config nativo — não usar FlatCompat.
import coreWebVitals from "eslint-config-next/core-web-vitals"
import typescript from "eslint-config-next/typescript"

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Regras novas do react-hooks v7 (era React Compiler): boas sinalizações,
      // mas o codebase antecede elas — rebaixadas pra warn até a dívida ser paga.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // 11 `any` legados catalogados no backlog — sinaliza sem bloquear o lint.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]

export default eslintConfig
