---
name: grill-me
description: Interview the owner to clarify business requirements, challenge a plan, resolve trade-offs, and obtain explicit confirmation before affected implementation. Use for planning or material decisions needing owner input.
---

# Grill Me — project requirements interview

This skill is self-contained. Read and apply it directly; it does not require a `Skill` dispatcher or a separate `grilling` skill. `/grill-me` and `$grill-me` both refer to this file.

## Workflow

1. Read current project instructions and relevant source/specification evidence. Follow the project's graphify discovery rule. Separate verified facts, prior owner decisions and unresolved assumptions. Do not ask the owner technical questions that repository inspection can answer.
2. Identify decisions that materially affect scope, data integrity, permissions, workflows, acceptance criteria or delivery. Focus on the highest-impact unresolved decisions first. Do not repeat already answered questions or request permission already granted.
3. Ask in Vietnamese through the available interactive input tool. Prefer Nimbalyst `PromptForUserInput` for a grouped form or `AskUserQuestion` for one simple choice. Use another available interactive question tool if Nimbalyst is unavailable; if none exists, explain the limitation and ask concise questions in chat, subject to higher-priority instructions.
4. Group closely related decisions into a short round. Give concrete scenarios, a recommended default, meaningful alternatives and their consequences. Allow a custom answer. For richer forms, prefill known information. Avoid a long generic questionnaire.
5. Challenge ambiguous answers with examples: who acts, on which records, in what state, under which market/role, with what exceptions and failure behavior. For data design, clarify identity, ownership, uniqueness, relationships, lifecycle and audit expectations.
6. Continue independent authorized work while waiting. Pause implementation affected by Medium-or-higher uncertainty. A suggested/preselected default, silence or elapsed time is not approval. If an interactive call is still running, wait for its answer before ending the turn.
7. Summarize confirmed decisions and remaining questions. Produce a concrete plan using the project's required planning sections and observable acceptance criteria. Obtain explicit approval for material scope/approach before affected implementation or specification changes when project policy requires it.
8. After approval, update English technical artifacts and carry the decisions into implementation and verification. Record what was confirmed, what remains deferred and what was actually checked.

## Boundaries

- Permission to use this skill is separate from approval of a proposed business rule.
- Do not invent backend contracts, permissions, production data assumptions or migration authorization.
- Keep the interview proportional: one focused round may be sufficient for a small change.
