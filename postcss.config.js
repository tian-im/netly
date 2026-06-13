// Skip loading PostCSS in test environments to avoid native binding issues.
// Vitest/Vite loads this config automatically, but the @tailwindcss/postcss
// plugin has native bindings that may not match the host Node.js version
// when running outside Docker.
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

const plugins = isTest
  ? {} // Skip PostCSS processing in test env
  : { '@tailwindcss/postcss': {} };

module.exports = {
  plugins,
};
