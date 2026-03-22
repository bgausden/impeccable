---
applyTo: "scripts/**/*.js,lib/**/*.js,functions/api/download/**/*.js,server/lib/**/*.js"
---

Provider additions are cross-cutting in this repo. When you add or change a provider, review all of these surfaces together:

- `scripts/lib/transformers/index.js`
- `scripts/build.js`
- `lib/download-providers.js`
- `server/lib/api-handlers.js`
- `functions/api/download/**`
- README and website installation copy

If the provider emits files under `.github`, sync only the generated Copilot files. Never remove unrelated `.github` contents such as workflows, issue templates, pull request templates, or CODEOWNERS.
