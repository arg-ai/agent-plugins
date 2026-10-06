---
name: arg-code
version: "1.0.0"
description: Drive Arg Code from inside it with the `arg code` CLI - create worktrees (with an agent and a first message, or a plain shell), file them into Projects, start an agent in an existing worktree, and read back worktrees, Projects and pull request state. Load when working in an Arg Code terminal pane, when the user asks for a new worktree, or when a task splits into separate threads of work that should each become their own pull request. Covers this machine's local worktrees only.
---

# Arg Code: orchestrating worktrees with `arg code`

Arg Code is the coding workspace in the Arg desktop app: repositories, their worktrees, Projects that group worktrees, and terminal panes running coding agents. The `arg code` commands let an agent (or a script) do from a terminal what a person does in the Code sidebar, on the same machine.

## The rules

- **If the user asks for a worktree in Arg Code, create it with `arg code worktree create`.** Never run `git worktree add` yourself: Arg Code only tracks worktrees it created or imported, so a raw git worktree never appears in the sidebar, gets no setup script, and cannot be targeted by the other commands.
- **Split separate threads of work into separate worktrees.** When a task has parts that should land as independent pull requests or merge requests, give each its own worktree (and usually its own agent) rather than doing them one after another in one checkout. Local worktrees are cheap and easy to throw away, so you do not need to ask permission to create them.
- **This is local only.** Every command acts on the machine you are running on. Remote boxes cost money and will come with their own rules; nothing here reaches them.
- **Agents cannot message each other yet.** There is no command to send a message to a running agent or to wait on one. Start an agent with everything it needs in its first message, and check on its work by reading its worktree or its pull request.

## Am I in an Arg Code pane?

Arg Code sets these variables in every pane that belongs to a worktree. None of them is a credential.

| Variable                 | Meaning                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `ARG_CODE_DAEMON_SOCKET` | Where this machine's terminal daemon listens. Loose terminals (not in a worktree) get only this one. |
| `ARG_CODE_WORKTREE_ID`   | The worktree this pane belongs to. Commands that take a worktree default to it.                      |
| `ARG_CODE_REPOSITORY_ID` | That worktree's repository. Commands that need a repository default to it.                           |

`arg code ping` confirms it: it reaches the daemon the other commands would use and reports its address, protocol and this machine's `environment` id. Pass `--json` to see `orchestration`, which is `true` only while the Arg app is running and will act on requests.

Inside a pane the commands reach the pane's own daemon through `ARG_CODE_DAEMON_SOCKET`. Outside a pane they still work from any terminal on the machine: name the repository and worktree explicitly, and if more than one Arg install is running on the machine (for example the desktop app and a code server), pass `--install <name>`; `arg code daemons` lists them.

## Commands

Every command accepts `--json` (and `--ndjson` for lists), and prints JSON whenever its output is piped. Each command prints the ids it created or touched, so one command's output can feed the next.

| Command                                                                      | What it does                                                        | Prints                                                                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `arg code worktree list [repo flag]`                                         | This machine's worktrees, all or one repository's                   | `id`, `repositoryId`, `projectId`, `title`, `path`, `branch`, `lifecycle`, `agent` per row                |
| `arg code worktree create ...`                                               | Creates a worktree (see below)                                      | `worktree` (the row above), `newProjectId` when it made a Project, and `project` (`id`, `from`, `reason`) |
| `arg code worktree set-project [worktree-id] --project <id> \| --no-project` | Moves a worktree into a Project, or out of any                      | the worktree                                                                                              |
| `arg code worktree pr [worktree-id]`                                         | The worktree's pull request as Arg Code last polled it              | `worktreeId`, `pullRequest` (or `null`)                                                                   |
| `arg code project list [repo flag]`                                          | This machine's Projects                                             | `id`, `repositoryId`, `name` per row                                                                      |
| `arg code project create --name <name> [repo flag]`                          | Creates a Project in a repository                                   | `id`, `repositoryId`, `name`                                                                              |
| `arg code agent start [worktree-id] --agent <agent> --prompt <text>`         | Starts an agent in an existing worktree                             | `worktreeId`, `sessionId`                                                                                 |
| `arg code ping`                                                              | Checks the daemon this machine's commands reach                     | `install`, `address`, `protocol`, `environmentId`, `orchestration`, `sessions`                            |
| `arg code daemons`                                                           | Lists the Arg installs on this machine and whether each daemon runs | one row per install                                                                                       |

A `[worktree-id]` left out means the pane's own worktree (`ARG_CODE_WORKTREE_ID`).

### Creating a worktree

Start it either with an agent and its first message, or with a name and a plain shell - not both:

```bash
# An agent working on its own branch from the start
arg code worktree create --repo-name arg --agent claude \
  --prompt "Add retry to the upload client, with tests" --json

# A shell, named
arg code worktree create --repo-name arg --name spike-upload-retry --json
```

- `--agent` is one of `claude`, `codex`, `cursor`, `opencode`, `grok`, `hermes`. `grok` and `hermes` cannot take a first message on their command line, so when you hand over a prompt use one of the others.
- `--prompt <text>` or `--prompt-file <path>` (`-` reads standard input) gives the first message. Put everything the agent needs in it: the goal, constraints, and what "done" means.
- `--start-ref <ref>` branches from that ref instead of the repository's base branch.
- The worktree runs the repository's setup script first, then the agent starts on its own, as a tab behind whatever the user is looking at - nobody has to open the worktree. Until then its `lifecycle` is `provisioning`; it becomes `active` when it is ready (the other values are `archived`, `expired`, `failed` and `missing`).

**Projects.** Created from inside a pane, the new worktree joins the pane's worktree's Project when both are in the same repository. Created anywhere else, it joins no Project. Override with exactly one of:

- `--project <id>` - an existing Project in the same repository.
- `--new-project <name>` - create a Project and put the worktree in it (`newProjectId` in the output).
- `--no-project` - no Project, even inside a pane whose worktree has one.

The `project.from` field in the output says which happened: `named`, `created`, `inherited` or `none`, with a `reason` when inheriting was not possible.

### Starting an agent in an existing worktree

```bash
arg code agent start --agent codex --prompt-file brief.md --json
```

The agent runs interactively, exactly as if a person had launched it, and opens as a tab in that worktree behind whatever the user is looking at - it never takes their focus. The output gives its `sessionId`. `--agent` is one of `claude`, `codex`, `cursor` or `opencode`: `grok` and `hermes` cannot take a first message on their command line, so the command refuses them before sending anything. The worktree must be `active` and the agent installed on this machine; otherwise the answer is `failed`.

### Pull request state

`arg code worktree pr` reads what Arg Code already knows. It never calls the forge on your behalf, so the answer is as fresh as Arg Code's last poll of that repository. `pullRequest` carries `id` (an opaque string - never parse it), `title`, `url`, `lifecycle` (`draft`, `open`, `merged`, `closed`), `checks`, `review`, `mergeable`, `headBranch`, `baseBranch` and `updatedAt`. `null` means the last poll found no pull request for the branch, or none has run yet.

## Naming a repository

Commands that act in a repository take exactly one of:

- `--repo-name <name>` - the name Arg Code lists it under, matched exactly.
- `--repo-origin <remote>` - its remote, such as `github.com/owner/repo`; https and ssh spellings of the same remote match, ignoring case. A repository whose remote Arg Code has not read yet does not match by origin.
- `--repo-id <id>` - its id on this machine. Lead with a name or origin; use the id when those match more than one repository.

With none of them, `worktree create` and `project create` use the pane's repository, and the list commands list everything.

Two clones of one repository can exist on a machine. When a name or origin matches more than one, the command is refused and lists each candidate's id, name and path. Pick one and pass `--repo-id`. Ids are only meaningful on the machine that minted them.

## When a command fails

There are two kinds of failure, and both exit with status 1 - branch on the JSON, never on the exit code or the message text. With `--json` (or when output is piped) the error goes to standard error as `{kind, message, retryable, data}`.

**Arg Code refused the request.** Arg Code on this machine understood it and said no. `data.outcome` says why:

| `data.outcome`         | Meaning                                                                                             | What to do                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `ambiguous-repository` | More than one repository matches                                                                    | Pass `--repo-id` with one of `data.candidates`                             |
| `unknown-repository`   | Nothing on this machine matches                                                                     | Check `arg code worktree list`, or ask the user which repository they mean |
| `unknown-worktree`     | No such worktree here                                                                               | List worktrees; the id may be from another machine                         |
| `unknown-project`      | No such Project in that repository                                                                  | List Projects, or use `--new-project`                                      |
| `unavailable`          | Arg Code cannot act on it right now, for example while it is starting                               | Wait a moment and try once more; tell the user if it persists              |
| `wrong-destination`    | The daemon reached is not the machine the request names                                             | Re-run `arg code ping`; you may have reached a different install           |
| `failed`               | Arg Code tried and could not, for example an inactive worktree or a Project from another repository | Read `message`, fix the cause, and try once more                           |

**The request never reached Arg Code.** These have no `data.outcome`; read `message`:

- "nothing on this machine acts on orchestration requests right now" - the Arg app is closed. Ask the user to open it; do not retry in a loop.
- "this Arg is too old to be orchestrated" - the app or code server needs updating.
- "no Arg daemon is running here", or "more than one Arg install is running here" - no daemon was found, or several were and you need `--install`.
- A mistake in the command's own flags, such as `--name` together with `--agent`, is reported before anything is sent.

## A worked example

Split a task into two independent pull requests, each with its own agent, in a new Project:

```bash
project=$(arg code project create --repo-name arg --name "Upload hardening" --json | jq -r .id)

arg code worktree create --repo-name arg --project "$project" --agent claude \
  --prompt "Add retry with backoff to the upload client. Open a PR when the tests pass." --json

arg code worktree create --repo-name arg --project "$project" --agent codex \
  --prompt "Add a size limit to uploads, with a clear error. Open a PR when the tests pass." --json

# Later: has either landed?
arg code worktree list --repo-name arg --json | jq -r '.[] | select(.projectId == "'"$project"'") | .id' \
  | while read -r id; do arg code worktree pr "$id" --json; done
```
