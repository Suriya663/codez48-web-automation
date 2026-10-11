# Codez48 Real E2E Test Suite & Harness

This directory contains the non-production, test-only fixtures, harnesses, and evidence packages for the Codez48 Computer-Use Engine.

## Structure
- `fixtures/`: Local test servers (bound strictly to `127.0.0.1`) and sample files.
- `harness/`: Test execution scripts and negative control drivers.
- `evidence/`: Generated execution evidence packages (`TEST-<n>/<timestamp>/`).

## Harness Commands
- `node tests/e2e/harness/test8_drag_drop.js`: Executes TEST 8 (Dynamic Drag & Drop).
- `node tests/e2e/harness/test9_upload.js`: Executes TEST 9 (Real Server Upload).
- `node tests/e2e/harness/test11_unseen_site.js`: Executes TEST 11 (Unseen Website).
- `node tests/e2e/harness/test12_unseen_app.js`: Executes TEST 12 (Unseen Desktop Application).
- `node tests/e2e/harness/test14_long_running.js`: Executes TEST 14 (Long-Running Task).
- `node tests/e2e/harness/test15_mt5_demo.js`: Executes TEST 15 (MetaTrader 5 Demo Trade).
- `node tests/e2e/harness/test16_permissions.js`: Executes TEST 16 (Permission Flow).
