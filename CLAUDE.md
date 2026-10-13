# Pawtner: rules for Claude Code

## Roles
- Advisor (separate chat) plans and writes tasks. CodeBuddy builds most features: it is the team's required build tool for judging. Claude Code does targeted, reviewable fixes only.
- Source of truth for product scope: docs/PRD.md (tiers in section 9). Architecture: docs/ARCHITECTURE.md. Interface between app and agent: shared/contract.ts.

## Before editing
Briefly explain: the current data flow, the smallest practical change, and assumptions that could change the implementation.

## Git
- Work only on branches named claude/<task>. Never commit to main. Never force-push. Revert, never rewrite history.
- Before touching a file, check open branches (git branch -r, git log --oneline origin/<branch> -5) for recent changes to the same file and report conflicts.
- Never commit secrets (.env). Commit freely on your branch; open a pull request for review.

## Code rules
- Clear top-level flow; clear ownership; one source of truth.
- Reusable primitives (buttons, cards, shells, empty/loading/error states).
- Shared logic in ONE helper, never duplicated in components. No business rules, thresholds or names hardcoded in components; names come from data.
- Side effects out of presentational components. Typed data shapes from shared/contract.ts.
- Responsive, not screenshot-fitted: no hardcoded pixel widths to pass a check; must work from 360px to 430px wide phones.
- Animate only transform and opacity. Every animation has a still fallback (prefers-reduced-motion).
- Do not modify shared/ or db/ unless the task says so.

## Verify and report
Run npm run typecheck and npm run build. Screenshot UI changes at 360x740, 390x844, 430x932 and 1280x800. Report: files changed, check results, screenshots, risks, decisions needed.

## Collaboration
Collaboration: team
