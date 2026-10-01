# Implementation Plan - AI Mode + Pilot Mode Skill Training Pack

Implementing the AI Mode + Pilot Mode Skill Training Pack across conversational AI skills (message drafting, code writing) and Pilot mode skills (PowerPoint, Word, Text files, Calculator, and Additional Apps), along with golden evaluation sets and acceptance tests TP-R through TP-Z.

## Proposed Changes

### 1. Skill Framework & Mode Router (`src/pilot/ai/skill-framework.js`)
- Unified mode classification (AI / PILOT / HYBRID) and data-driven skill specifications (spec, prompt template, exemplars, validator, rubric).

### 2. AI-Mode & Pilot-Mode Skills
- Message drafting, code writing, PowerPoint presentations, Word documents, text file manipulation, and two-path calculator arithmetic.

### 3. Comprehensive Acceptance Test Suite (`tests/skill_training_acceptance_test.js`)
- Implements test suites TP-R1–R3, TP-M1–M5, TP-C1–C6, TP-P1–P5, TP-W1–W6, TP-X1–X5, TP-K1–K8, TP-G1, TP-E1–E9, TP-S1–S3, and TP-Z1.

---

## Verification Plan

### Automated & Runtime Tests
1. Run `node tests/skill_training_acceptance_test.js` to execute all acceptance tests and generate `FINAL_REPORT.md`.
