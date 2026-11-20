# AGENTS.md — Master Agent Instructions

## Project Overview
Lambda Manager is a resilient POS, inventory, and retail management system tailored for Argentine grocery stores with produce sections (*despensas y verdulerías*).

## Stack & Architecture
- **Core:** React 19, TypeScript (strict mode), Vite, Tailwind CSS v4, Zustand (persist), TanStack Query, Lucide React, Vitest.
- **Key Paths:** `src/features/*` (domain features), `src/lib/*` (pure functions & domain rules), `src/stores/*` (persisted state), `src/types/*` (contracts), `src/db/schema.sql` (PostgreSQL reference), `specs/*` (SDD specifications).

## Operational Commands
- Dev Server: `pnpm run dev`
- Build & Typecheck (`tsc -b && vite build`): `pnpm run build`
- Typecheck Only: `pnpm run typecheck`
- Lint: `pnpm run lint`
- Test Suite: `pnpm test`

## Core Conventions
- **Language:** English for source code, types, variables, functions, and Git commits. Argentine Spanish (`es-AR`) for user-facing UI and technical documentation.
- **Domain Logic:** Business rules (pricing, packaging, weights, cash calculations) MUST reside in pure, deterministic, side-effect-free functions.

## Forma de trabajar (Spec-Driven Development Workflow)
- Para cualquier desarrollo o cambio de funcionalidades, carga y sigue estrictamente la skill `.agents/skills/sdd/SKILL.md`.
1. MANDATORY: Read `docs/constitution.md` and the active specification (`specs/NNN-*/`) before touching or writing code.
2. The spec is law: if a scenario or decision is missing, STOP and ask the user; never assume.
3. Zero-defect gate: tests and typecheck must be 100% green before completing any task. Never advance on failing tests.

## Boundaries & Operational Limits
- **Always:** Read `MEMORY.md` before starting; separate pure logic from UI; enforce strict typing; update `MEMORY.md` upon task completion.
- **Ask Before:** Adding third-party packages, altering database schema, or changing the scope of an approved spec.
- **Never:** Commit broken builds or failing tests; embed domain calculations directly in UI components; store secrets or PII in files.

## Verification
Before marking any task as done, run `pnpm test` (100% green) and `pnpm run build` (zero type/lint errors).

## Memory Protocol
- Read `MEMORY.md` at the beginning of each session to align with the current state.
- Update `MEMORY.md` at the end of each task with recent decisions, status, and progress (never log secrets or PII).
