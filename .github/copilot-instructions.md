This project uses the Impeccable design skill pack for GitHub Copilot.

Impeccable provides a curated set of design-focused skills that help produce high-quality frontend UI. The following user-invocable skills are available: /adapt, /animate, /arrange, /audit, /bolder, /clarify, /colorize, /critique, /delight, /distill, /extract, /harden, /normalize, /onboard, /optimize, /overdrive, /polish, /quieter, /typeset.

When the user invokes one of these skills, load and apply its instructions from `.github/skills/`. When working on frontend UI without an explicit skill invocation, proactively suggest relevant skills if quality improvements are possible.

The `frontend-design` skill is loaded automatically when working on UI code. It provides anti-pattern guidance and design vocabulary — prefer its language and principles when proposing UI changes.

If something is unclear about the user's design intent, ask the user directly to clarify what you cannot infer.
