// Static checks for the pixel friends (fun/) and the test runner: undefined names, imports that do not
// exist, import cycles, shadowed names and variables used before they are declared.
import globals from "globals";
import importPlugin from "eslint-plugin-import";

const rules = {
  "no-undef": "error",
  "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
  "no-redeclare": "error",
  "no-use-before-define": ["error", { functions: false, classes: false, variables: false }],
  "no-shadow": "error",
  "no-dupe-keys": "error",
  "no-unreachable": "error",
  "import/named": "error",
  "import/no-unresolved": "error",
  "import/no-cycle": "error",
  "import/export": "error",
};
export default [
  { ignores: ["node_modules/**", "tests/page/**"] },
  {
    files: ["fun/**/*.js"],
    plugins: { import: importPlugin },
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.browser } },
    rules,
  },
  {
    files: ["tests/*.mjs", "build.mjs", "eslint.config.mjs"],
    plugins: { import: importPlugin },
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.node } },
    rules: { ...rules, "import/no-unresolved": "off" },
  },
];
