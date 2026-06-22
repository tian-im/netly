# Changelog

All notable changes to Netly Ledger are documented in this file.

## Unreleased

- Added Japanese (ja), Korean (ko), and Traditional Chinese (zh-TW) locale support with full UI translations and localized onboarding categories.
- Added GitHub Actions CI pipeline: test-coverage gate (100% required), manual Docker build test, and automated build-and-push to GHCR (multi-arch linux/amd64 + linux/arm64).
- Changed: build-and-push workflow now triggers only on VERSION file changes to main (or manual dispatch), instead of chaining from test-coverage CI status.
- Added: AI Installation Prompt in README — one-click copy-paste setup for AI coding assistants (Claude Code, OpenCode, OpenClaw) including MCP auto-configuration.
- Fixed: Replaced `npm`/`npx` references in README with `yarn` to match the project's package manager.
