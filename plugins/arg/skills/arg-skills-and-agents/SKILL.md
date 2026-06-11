---
name: arg-skills-and-agents
description: Create and edit Arg workspace skills (SKILL.md files under .skills) and subagents (markdown files under .agents). Load when asked to save a prompt, workflow, or set of instructions as a reusable skill, or to define a specialist subagent for a recurring task in an Arg workspace.
---

# Workspace skills & subagents

Two ways to make the Arg assistant smarter inside a workspace:

- **Skills** — reusable how-to instructions the assistant pulls in when a task matches.
- **Subagents** — specialists you define once and hand a focused job to, each with its own clean context.

Both are just files in the workspace, so they're reviewed, versioned, and shared like any other document. They're **scoped to the workspace** they live in — copy the file to another workspace to reuse it.

## CRUD

Both are plain Markdown-with-frontmatter text files — use the standard MCP tools and shared rules in the `arg-core` skill (`write_file` to create, `read_file`/`grep` to find, `edit_file` to update, `run_bash` `rm` to delete).

## Skills — `.skills/<name>/SKILL.md`

A skill is a short, single-purpose playbook. It lives in a per-skill folder at the workspace root: `.skills/<name>/SKILL.md` (e.g. `.skills/release-notes/SKILL.md`). The assistant reads the **`description`** to decide whether a skill is relevant, then follows the body when it picks it up.

**Frontmatter**

- `name` *(required)* — identifier, kebab-case recommended.
- `description` *(required)* — one line that names the trigger ("when the user asks for X"). This is what the assistant matches on — make it specific.
- `tools` *(optional)* — comma-separated allowlist (e.g. `read_file, write_file, run_bash`). Omit to allow all.

```markdown
---
name: release-notes
description: Write release notes when the user asks for a changelog or summary of recent commits.
tools: read_file, write_file, run_bash
---

When asked for release notes:

1. Run `git log --since="last release"` to gather commits.
2. Group commits by type (feat, fix, docs, chore).
3. Write a short summary at the top, then bullets per group.
4. Save the result to `RELEASE_NOTES.md`.
```

**Good skills:** one job each (split big procedures), a description that names the trigger, concrete executable steps (not vague advice), and example inputs/outputs when the procedure isn't obvious.

> Write skill instructions to `.skills/<name>/SKILL.md` — **not** to an `.mdx` note, and not as an `.agents/*.md` file.

## Subagents — `.agents/<name>.md`

A subagent is a specialist with its own instructions, tools, and (optionally) model. The main assistant hands off a focused task with `run_agent(name, prompt)` and gets back a clean result; the agent works in its own context, so subtasks don't pollute the main conversation. An agent can use the workspace's skills the same way the main assistant does.

It lives at `.agents/<name>.md` at the workspace root (e.g. `.agents/code-reviewer.md`). The body is the agent's system prompt.

**Frontmatter**

- `name` *(required)* — what the main assistant calls the agent (used in `run_agent`).
- `description` *(required)* — one line on when to hand off to this agent.
- `tools` *(optional)* — comma-separated allowlist; restrict for read-only reviewers or no-shell summarizers. Omit to inherit the parent's tools.
- `model` *(optional)* — `sonnet`, `opus`, `haiku`, `inherit`, or a full OpenRouter slug. Omit to inherit from the parent chat. Pick a smaller model for quick lookups, a stronger one for hard reasoning.

```markdown
---
name: code-reviewer
description: Review a pull request or set of changed files and flag bugs, smells, and risks.
tools: read_file, grep, run_bash
model: sonnet
---

You are a senior reviewer. For each change you look at:

- Call out correctness issues first, then maintainability, then style.
- Quote the exact lines you're concerned about.
- Suggest a concrete fix wherever possible.
- End with a one-line verdict: "ship", "ship with fixes", or "block".
```

## When to use which

- Reach for a **skill** when you keep re-explaining the *same procedure*. Skills are lightweight nudges the assistant reads when relevant.
- Reach for a **subagent** when the work is a clearly separable subtask with its own personality or toolset (a reviewer, researcher, planner). Heavier, but keeps the main conversation clean.
- They compose: a "release manager" agent can pick up a "release-notes" skill without repeating the instructions.
