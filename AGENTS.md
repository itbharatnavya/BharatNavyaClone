# Bharat Navya design-branch guardrails

- Active product-design implementation belongs in `frontend/` on the `design` branch.
- `Design/` is a frozen Vite reference. Do not implement new product work there or treat its fixture state as a production contract.
- Push only to `origin/design`. Do not merge, rebase, force-push, or otherwise modify `main`, `develop`, `feature/ui-phase`, or any other remote branch without explicit approval in the current conversation.
- Preserve the existing backend and unrelated modules unless the user explicitly authorizes backend or module work.
- Bharat Navya's public product structure is Home, Directory, and Recruitment. Consultations, Credit Card, Mutual Fund, catalogue-first commerce, and RFQ-first journeys are not public navigation priorities.
- Reuse existing API and authentication contracts where they align. Document missing or conflicting backend behavior instead of simulating a successful persisted action.

