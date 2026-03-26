/** ESLint 8 — escopo só da API (root evita subir até a home no CI). */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist/**", "node_modules/**", "coverage/**"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-explicit-any": "off",
    // Base legada: evitar falha do CI até refino incremental
    "no-var": "off",
    "@typescript-eslint/no-namespace": "off",
    "no-inner-declarations": "off",
    "no-case-declarations": "off",
    "prefer-const": "warn",
    "@typescript-eslint/ban-ts-comment": "warn",
    "no-empty": "warn",
    "no-useless-escape": "off",
  },
};
