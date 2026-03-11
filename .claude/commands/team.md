Create an agent team called "Mailtrap Desktop" to build/improve the project. Use delegate mode — you (the lead) should only coordinate, never write code.

### No-Arguments Mode

If `$ARGUMENTS` is empty (no work description provided), display the team roster and exit — do NOT ask for work or start any workflow:

```
Mailtrap Desktop — Agent Team

#   Role                   Scope                                          Model
──  ─────────────────────  ─────────────────────────────────────────────  ──────
1   product-manager        Requirements, BRIEF.md                         Sonnet
2   ux-expert              UX design, MTUI patterns                       Sonnet
3   architect              Architecture, IPC design, ADRs                 Sonnet
4   performance-engineer   Perf review (IPC, memory, polling)             Opus
5   scrum-master           Task breakdown, coordination                   Sonnet
6   main-process-dev-1     electron/ — IPC, store, tray, polling, API     Opus
7   main-process-dev-2     electron/ — API endpoints, types               Opus
8   renderer-dev-1         src/ — React, hooks, Zustand, routing          Opus
9   renderer-dev-2         src/ — components, UI                          Opus
10  code-reviewer          Code review gate (always involved)             Opus
11  tech-lead              Git, compile gate, dev server, PR              Opus
12  qa-engineer            Test cases, E2E plan                           Sonnet
13  manual-tester          Electron app testing                           Sonnet
14  documentator           AREA.md, patterns, cleanup                     Sonnet

Agent definitions: .claude/agents/*.md
Phases: Requirements → UX Design → Architecture → Planning → Build → Test → Docs → PR
Usage:  /team <description>   — spawn team for a task
        /team --retest <area/work-item> — retest an existing feature
```

Print the table above exactly and stop. Do not proceed to the startup sequence.

### Agent Definitions

Individual agent definitions live in `.claude/agents/`:

| File | Role(s) |
|------|---------|
| `.claude/agents/product-manager.md` | product-manager |
| `.claude/agents/ux-expert.md` | ux-expert |
| `.claude/agents/architect.md` | architect |
| `.claude/agents/performance-engineer.md` | performance-engineer |
| `.claude/agents/scrum-master.md` | scrum-master |
| `.claude/agents/main-process-dev.md` | main-process-dev-1, main-process-dev-2 |
| `.claude/agents/renderer-dev.md` | renderer-dev-1, renderer-dev-2 |
| `.claude/agents/code-reviewer.md` | code-reviewer |
| `.claude/agents/tech-lead.md` | tech-lead |
| `.claude/agents/qa-engineer.md` | qa-engineer |
| `.claude/agents/manual-tester.md` | manual-tester |
| `.claude/agents/documentator.md` | documentator |

When spawning an agent, read its definition from `.claude/agents/{role}.md` and include the role-specific instructions in the spawn prompt.

### Documentation Structure

All agent-generated documents live in `docs/agents/` organized by **area** (product domain):

```
docs/agents/
├── TECH_DECISIONS.md        # shared — ADRs (Architecture Decision Records)
│
├── patterns/                # reusable how-to knowledge
│   ├── adding-ipc-handler.md
│   ├── adding-new-route.md
│   └── ...
│
├── {area}/                  # product domain (dynamic, created as needed)
│   ├── AREA.md              # living architecture doc — accumulated knowledge
│   └── {work-item}/         # verb-noun slug (e.g., add-calendar, fix-loading)
│       ├── BRIEF.md         # always created — goals, scope, acceptance criteria
│       ├── REQUIREMENTS.md  # optional — for complex requirements
│       ├── UX-DESIGN.md     # optional — when UI changes are involved
│       ├── ARCHITECTURE.md  # optional — when technical design decisions needed
│       ├── IPC_SPEC.md      # optional — when new/changed IPC handlers
│       ├── TYPES_SPEC.md    # optional — when new/changed TypeScript types
│       ├── USER_STORIES.md  # optional — for medium+ work items
│       ├── E2E_TEST_PLAN.md # optional — when E2E testing is warranted
│       ├── PROGRESS.md      # optional — for medium+ work items
│       ├── TEST_RESULTS.md  # created by manual-tester when testing happens
│       ├── CHECKPOINT.md    # persistent task/phase state — survives team restarts
│       ├── screenshots/     # manual-tester evidence (gitignored, cleaned by documentator)
│       └── tests/           # test cases per user story
│           ├── US01-{story}.md
│           └── ...
```

### Area & Naming Rules

**Areas** are product domains — not tech layers, not pages. They map to both main process and renderer:

- Areas are **dynamic** — the architect creates a new area when nothing existing fits
- Each area has a living `AREA.md` that accumulates architectural knowledge

**Work items** use `{verb}-{subject}` naming:

- Features: `add-calendar`, `add-bulk-tagging`
- Improvements: `improve-filters`, `update-chart`
- Fixes: `fix-widget-loading`, `fix-filter-reset`
- Removals: `remove-legacy-exports`
- Refactors: `refactor-import-pipeline`

**Deciding where something goes:**

1. Architect checks existing areas in `docs/agents/` (list directories)
2. If an area fits → use it, read its AREA.md first
3. If nothing fits → create a new area with AREA.md
4. If work touches multiple areas → primary area owns the work item, documentator adds cross-references to other AREA.md files

### AREA.md Template

```markdown
# {Area Name}

## Key Files

### Main Process (electron/)

- (list relevant main process files)

### Renderer (src/)

- (list relevant renderer files)

## Architectural Constraints

- [Things the next developer MUST know]
- [Patterns to follow in this area]
- [IPC bridge considerations]
- [Dependencies or gotchas]

## Cross-references

- [Links to work items in other areas that affect this one]

## History

- [Date]: [Brief description] (see {work-item}/)
```

### Document Requirements

Only `BRIEF.md` is always required. All other documents are optional — agents decide what's needed based on the scope of work:

- **BRIEF.md** — Always. Goals, scope, acceptance criteria. Even for bug fixes (repro steps + root cause + fix approach).
- **REQUIREMENTS.md** — When there are complex functional/non-functional requirements to enumerate
- **UX-DESIGN.md** — When UI changes are involved (React components, tray menu, system tray behavior)
- **ARCHITECTURE.md** — When technical design decisions are needed (new IPC patterns, store schema changes, polling changes)
- **IPC_SPEC.md** — When new or changed IPC handlers exist (preload.ts interface + handlers.ts implementation)
- **TYPES_SPEC.md** — When new or changed TypeScript types exist (electron/api/types.ts)
- **USER_STORIES.md** — For medium+ work items that benefit from structured breakdown
- **E2E_TEST_PLAN.md** — When E2E testing is warranted
- **PROGRESS.md** — For medium+ work items with multiple phases
- **CHECKPOINT.md** — Always created by scrum-master. Persists task and phase state to disk so teams can resume after restart.

The product-manager, architect, and scrum-master should assess the scope and decide which docs are needed. Don't create docs for the sake of process — create them when they add value.

### Tech Stack Context

This is an **Electron desktop app** with this architecture:

- **Main Process** (`electron/`): Node.js — IPC handlers, encrypted JSON store, background API polling, system tray, Axios HTTP client
- **Renderer** (`src/`): React 18, React Router, Zustand, Tailwind CSS with MTUI design tokens, Recharts
- **IPC Bridge** (`electron/preload.ts`): Typed `ElectronAPI` interface exposed via `contextBridge` — ALL main↔renderer communication goes through this
- **Shared Types** (`electron/api/types.ts`): TypeScript interfaces for API responses, cache entries, settings
- **Build**: electron-vite (Vite-based), TypeScript strict mode
- **Tests**: Vitest + @testing-library/react

**Critical patterns all agents must follow:**
- IPC handlers use `withAuth()` wrapper for authenticated endpoints
- Cache-first data loading via `useCacheFetch` hook in renderer
- Dual polling: main process polls API on intervals, renderer polls via `usePollingInterval`
- Settings stored in encrypted JSON store, UI in `src/components/settings/Settings.tsx`
- Tray menu dynamically rebuilt from polling data + settings
- File ownership is strict: main-process-dev never edits `src/`, renderer-dev never edits `electron/`
- The shared interface boundary is `electron/preload.ts` (ElectronAPI type) and `electron/api/types.ts` (shared types)

### Execution Flow

```
Phase 1 (Requirements + Research):  product-manager + ux-expert (parallel)
Phase 2 (UX Design):               ux-expert (if UI involved) → HUMAN OWNER CHECKPOINT
Phase 3 (Architecture):            architect + performance-engineer → HUMAN OWNER CHECKPOINT
Phase 4 (Planning + Git):          scrum-master + tech-lead (feature branch)
Phase 5 (Build + Review):          devs + code-reviewer + perf-engineer + qa-engineer + tech-lead
Phase 6 (Integration + Test):      tech-lead starts Electron → manual-tester tests → E2E specs decision
Phase 7 (Documentation):           MANDATORY — documentator cleans up + updates AREA.md + extracts patterns
Phase 8 (Ship):                    tech-lead creates PR (docs are already clean and included)
```

### Phase 5 Flow (Build + Review)

```
Developers complete tasks → atomic commits
       |
       v
Code-reviewer reviews each task individually
       |
       v
Performance-engineer reviews approved tasks for perf issues
       |
       v
QA-engineer writes test cases organized by user story (parallel with devs)
```

### Phase 6 Flow (Integration + Test + E2E)

```
Tech-lead: starts Electron dev server (npm run dev)
       |
       v
Tech-lead: compile gate (tsc --noEmit + vitest run)
       |
       v
Tech-lead: messages manual-tester "app is running"
       |
       v
ALL tasks reviewed + test cases ready
       |
       v
Manual-tester tests using QA test cases (story by story, through the Electron app)
       |
       +-- fail → bug task → developer fixes → code-reviewer reviews → manual-tester retests
       +-- pass ↓
       |
       v
DECISION REQUIRED: Tech-lead decides if E2E/integration specs are needed
       |
       +-- YES (user-facing changes) → tech-lead triggers dev to write specs
       |     +-- flaky after 3-5 attempts → skip with TODO, move on
       |     +-- pass → Phase 7 (Documentation)
       |
       +-- NO (perf task, refactor, config, cosmetic) → tech-lead states reason, proceeds to Phase 7
       |
       +-- Silent omission is a process bug — tech-lead MUST explicitly announce the decision
```

### Git Strategy

- **Feature branch**: `{ticket-id}/{work-item}` created at Phase 4 by tech-lead (e.g., `PROJ-42/add-user-search` or `no-ticket/fix-widget-loading`)
- **Atomic commits**: Each completed task = one commit with descriptive message
- **Commit format**: `<scope>: <description>` where scope is `main`, `renderer`, `types`, `docs`, etc.
- **PR**: Created at Phase 8 by tech-lead after all verification passes

### Progress Tracking

For medium+ work items, the scrum-master creates PROGRESS.md at `docs/agents/{area}/{work-item}/PROGRESS.md`. For small work items, skip it — the shared TaskList is sufficient.

### Key Rules

- **Dynamic areas**: Architect creates new areas as needed — no fixed list
- **AREA.md first**: Architect ALWAYS reads the area's AREA.md before designing
- **Only BRIEF.md is mandatory**: All other docs created only when they add value
- **Feature branches**: `{ticket-id}/{work-item}`
- **Branch awareness**: All agents MUST verify they're on the feature branch before committing (`git branch --show-current`). QA engineer and devs are especially prone to committing on the wrong branch.
- **Explicit branch in spawn messages**: When spawning agents, always include the exact feature branch name in the initial message so they know where to commit.
- **Atomic commits**: One commit per completed task, format: `<scope>: <description>`
- **Task tracking**: Developers MUST mark tasks as `done` via TaskUpdate AND update CHECKPOINT.md
- **Checkpoint persistence**: All agents update `docs/agents/{area}/{work-item}/CHECKPOINT.md` after completing their work. This is the team's resume point if restarted.
- **Code review gate**: All dev tasks must be code-reviewed before manual testing begins
- **Tests always involved**: Code reviewer and testing agents are never skipped, regardless of scope
- **App testing is mandatory**: Manual-tester must test through the running Electron app — code review is NOT an acceptable substitute
- **Quality gates**: Require human owner approval after UX design (Phase 2) and architecture (Phase 3)
- **Communication**: Teammates message each other directly — don't relay through the lead
- **No shortcuts**: Developers must read specs before coding, tester must read test cases before testing
- **Right-size the team**: Team lead assesses scope and spawns only needed agents. Don't spawn 14 agents for a bug fix.
- **File ownership is strict**: main-process-dev never edits `src/`, renderer-dev never edits `electron/`. The boundary is the IPC bridge (`preload.ts`) and shared types (`types.ts`).
- **IPC-first design**: When a feature needs main↔renderer communication, design the IPC interface first (IPC_SPEC.md), then implement both sides.
- **E2E specs require explicit decision**: After manual testing passes, the tech-lead MUST decide whether E2E specs are needed and announce the decision.
- **Phase 7 (Documentation) is MANDATORY**: The documentator must always run BEFORE PR creation (Phase 8). Never skip it.
- **Shut down idle agents**: Shut down agents immediately after their phase completes. Don't let them sit idle consuming context. Respawn when needed for later phases. Exception: tech-lead stays active phases 4-8.
- **Dev server for compile checks**: Use the running dev server for fast incremental compile checks instead of full production builds. Only run full build (`npm run build`) as the final gate before PR.
- **HANDOFF.md**: Any agent can optionally append notes to `docs/agents/{area}/{work-item}/HANDOFF.md` for the documentator.

### Agent Execution

**EVERY agent spawn MUST include `mode: "bypassPermissions"`** — without it, agents will prompt for file write permissions and block. The ONLY exception is architect which uses `mode: "plan"`. If you forget this parameter, the agent cannot work autonomously. This is the #1 cause of agents getting stuck.

**Startup sequence:**

1. **Ticket ID**: Check if $ARGUMENTS includes a ticket ID (e.g., `PROJ-42`). If not provided, ask the human owner via AskUserQuestion: "What's the ticket ID for this work?" with an option for "No ticket". Store the result — this becomes `{ticket-id}` used in the branch name. If confirmed no ticket, use `no-ticket` as the prefix.
2. Assess the scope of work described in $ARGUMENTS
3. Determine the area (check existing areas in `docs/agents/`, create new if needed)
4. Choose a work-item slug (verb-noun format)
5. **Check for existing CHECKPOINT.md** at `docs/agents/{area}/{work-item}/CHECKPOINT.md`:
   - **If found**: Read it. Determine current phase and which tasks are done/in-progress/pending. Resume from that point — skip completed phases and only spawn agents needed for remaining work. Tell spawned agents to read CHECKPOINT.md before starting.
   - **If not found**: Fresh start — proceed normally.
6. Decide which agents to spawn based on scope (code-reviewer and testing always included)
7. **Read the agent definition** from `.claude/agents/{role}.md` before spawning each agent — include its instructions in the spawn prompt
8. Spawn product-manager first (and ux-expert in parallel if UI is involved)
9. Wait for requirements before spawning the rest of the team
10. Pass `{ticket-id}` and `{work-item}` to the tech-lead so it creates the correct branch name

### Retest Mode

If `$ARGUMENTS` starts with `--retest`, enter retest mode instead of the full workflow:

1. **Parse arguments**: Extract the area and work-item slug (e.g., `--retest dashboard/add-calendar`)
2. **Skip Phases 1-4 entirely** — do NOT spawn product-manager, ux-expert, architect, scrum-master, or qa-engineer
3. **Read existing context**:
   - Test cases from `docs/agents/{area}/{work-item}/tests/`
   - Feature docs from `docs/agents/{area}/{work-item}/`
   - CHECKPOINT.md if it exists
4. **Spawn ALL these agents in parallel** (all with `mode: "bypassPermissions"`):

| Name              | Agent Type         | Retest Role                                                  |
| ----------------- | ------------------ | ------------------------------------------------------------ |
| tech-lead         | `tech-lead`        | Starts Electron, compile gate, verifies app runs             |
| code-reviewer     | `code-reviewer`    | Reviews any fixes made during retest                         |
| manual-tester     | `manual-tester`    | Tests ALL scenarios from existing test cases                  |
| main-process-dev  | `main-process-dev` | Ready to fix main process bugs immediately                   |
| renderer-dev      | `renderer-dev`     | Ready to fix renderer bugs immediately                       |

**Retest phases:**

```
Phase R1: All 5 agents spawn in parallel
          Tech-lead starts Electron dev server (npm run dev)
          Tech-lead runs compile gate (tsc --noEmit + vitest run)
              |
              v
Phase R2: Manual-tester tests ALL scenarios from existing test cases
          Developers stand by for bug tasks
              |
              v
Phase R3 (loop): manual-tester files bugs → developer fixes → code-reviewer reviews
                 → manual-tester retests → repeat until all test cases pass
              |
              v
Done: manual-tester confirms all test cases pass with no remaining bugs
```

**Retest rules:**

- No new docs are created — retest uses existing BRIEF.md, test cases, etc.
- Bug fixes get atomic commits on the existing feature branch
- If the feature branch doesn't exist, ask the human owner for the branch name
- Update CHECKPOINT.md at the end with retest results
- Skip Phase 7 (documentator) and Phase 8 (PR) — retest is verification only

The work to do: $ARGUMENTS