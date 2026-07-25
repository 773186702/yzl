---
name: vercel-firebase-app-recovery
description: Diagnose and fix Vercel deployment issues, authentication failures, and runtime errors for Vite + React + Firebase apps.
---

# Vercel + Firebase App Recovery

Use this skill when a deployed Vite/React app is failing to load, cannot log in, or shows runtime errors after deployment.

## Goal
Produce a stable production build and resolve the most common deployment blockers for a frontend app hosted on Vercel with Firebase services.

## Workflow
1. Inspect project configuration
   - Check package scripts, build output, and deployment config.
   - Verify Vercel settings such as build command, output directory, and SPA rewrites.

2. Build locally and capture errors
   - Run the production build and fix any compile or bundling errors first.
   - Reproduce runtime issues in the browser if possible.

3. Investigate authentication and runtime fallbacks
   - Identify whether login failures stem from Firebase Auth, blocked OAuth domains, missing environment variables, or frontend routing issues.
   - Add safe fallback behavior so the app remains usable even when Firebase is unavailable.

4. Harden frontend routing and browser APIs
   - Ensure protected routes handle loading and unauthenticated states gracefully.
   - Guard browser-only APIs such as localStorage, navigator, and service workers.

5. Verify production readiness
   - Confirm the app builds successfully.
   - Validate that the deployment config handles client-side routing correctly.
   - Check that the app no longer shows blank/error pages after login or navigation.

## Decision points
- If the app fails to build, fix compilation issues before addressing runtime behavior.
- If login fails but the UI should still work, implement a local fallback session and keep the user in the app.
- If deployment shows a blank page or broken routes on refresh, ensure SPA rewrites are configured for Vercel.
- If browser APIs fail in non-browser contexts, guard them with environment checks.

## Completion checklist
- Production build succeeds.
- Login flow works or degrades gracefully with fallback handling.
- Protected routes render without crashing.
- Vercel config supports SPA routing and static asset output.
- No obvious runtime error appears when navigating between pages.
