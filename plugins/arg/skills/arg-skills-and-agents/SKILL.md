---
name: arg-skills-and-agents
version: "1.3.0"
description: Create and edit Arg workspace skills (SKILL.md files under .skills), subagents (markdown files under .agents) and saved prompts (markdown files under .prompts). Load when asked to save a prompt, workflow, or set of instructions as a reusable skill or prompt template, or to define a specialist subagent for a recurring task in an Arg workspace.
---

# Workspace skills, subagents & prompts

Three ways to make the Arg assistant smarter inside a workspace:

- **Skills** — reusable how-to instructions the assistant pulls in when a task matches.
- **Subagents** — specialists you define once and hand a focused job to, each with its own clean context.
- **Prompts** — a message a person sends again and again, saved with fill-in fields.

All three are just files in the workspace, so they're reviewed, versioned, and shared like any other document. They're **scoped to the workspace** they live in — copy the file to another workspace to reuse it.

In Slack and Marge chats (never in a public Slack channel), the user's assistant workspace also supplies its `.skills/` instructions, root `AGENTS.md` and the persona files beside it (`SOUL.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md`, `BOOTSTRAP.md`) - edit those to change who the assistant is and what it remembers. Select that private workspace per organization in Settings. Its `AGENTS.md` follows Arg's system instructions and precedes the active workspace's local instructions; all compatible instructions apply. `load_skill` reads a skill there, while file tools still target the chat workspace; resources beside an assistant skill are available only when that workspace is also the chat workspace. If both workspaces define the same skill name, the assistant workspace's skill wins.

## CRUD

All three are plain Markdown-with-frontmatter text files — use the standard MCP tools and shared rules in the `arg-files` skill (`write_file` to create, `read_file`/`grep` to find, `edit_file` to update, `run_bash` `rm` to delete).

## Skills — `.skills/<name>/SKILL.md`

A skill is a short, single-purpose playbook. It lives in a per-skill folder at the workspace root: `.skills/<name>/SKILL.md` (e.g. `.skills/release-notes/SKILL.md`). The assistant reads the **`description`** to decide whether a skill is relevant, then follows the body when it picks it up.

**Frontmatter**

- `name` _(required)_ — identifier, kebab-case recommended.
- `description` _(required)_ — one line that names the trigger ("when the user asks for X"). This is what the assistant matches on — make it specific.
- `tools` _(optional)_ — comma-separated allowlist (e.g. `read_file, write_file, run_bash`). Omit to allow all.

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

- `name` _(required)_ — what the main assistant calls the agent (used in `run_agent`).
- `description` _(required)_ — one line on when to hand off to this agent.
- `tools` _(optional)_ — comma-separated allowlist; restrict for read-only reviewers or no-shell summarizers. Omit to inherit the parent's tools.
- `model` _(optional)_ — `sonnet`, `opus`, `haiku`, `inherit`, or a full OpenRouter slug. Omit to inherit from the parent chat. Pick a smaller model for quick lookups, a stronger one for hard reasoning.

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

## Prompts — `.prompts/<name>.md`

A saved prompt is the words a person would type to start a chat, kept so they don't retype them. It lives at `.prompts/<name>.md` at the workspace root (e.g. `.prompts/weekly-recap.md`). Optional frontmatter (`description`) comes first; the body is the prompt itself, written to the assistant in the second person. Mark each part that changes per run as a `{{field name}}` - whoever runs it fills those in first.

```markdown
---
description: Summarize a team's week from its board.
---

Read board.kanban and summarize what {{team}} shipped this week, what slipped and what is blocked. Finish with the three cards most at risk for {{next milestone}}.
```

A prompt file is also what a **prompt template** in the Arg template catalog is published from (publish type **Prompt**). From the catalog, **Use in chat** fills its fields and starts a new chat with it - on Arg, or on desktop on an installed Claude Code or Codex - and **Save to workspace** copies the file into `.prompts/`.

## When to use which

- Reach for a **skill** when you keep re-explaining the _same procedure_. Skills are lightweight nudges the assistant reads when relevant.
- Reach for a **subagent** when the work is a clearly separable subtask with its own personality or toolset (a reviewer, researcher, planner). Heavier, but keeps the main conversation clean.
- Reach for a **prompt** when the person asks for the _same thing_ repeatedly with small changes (a weekly recap, a triage pass). It is their message, not instructions to you.
- They compose: a "release manager" agent can pick up a "release-notes" skill without repeating the instructions.
