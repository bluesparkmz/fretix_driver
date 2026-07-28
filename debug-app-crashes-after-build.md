# Debug Session: app-crashes-after-build

## Problem Description
App crashes on splash screen after build (works fine in Expo Go). The issue started after adding Google auth.

## Session Info
- **Date**: 2026-06-11
- **Status**: [OPEN]
- **Project**: CargoLink

## Hypotheses
1. The Google.useIdTokenAuthRequest hook is causing a crash in production builds (missing config)
2. Constants.expoConfig?.extra?.googleClientId is undefined in production, causing an error
3. The AnimatedSplashOverlay is causing a crash
4. The authService.getMe() call is failing silently and causing an unhandled rejection

## Steps
1. [ ] Start Debug Server
2. [ ] Add instrumentation
3. [ ] Reproduce the issue
4. [ ] Analyze logs
5. [ ] Implement fix
6. [ ] Verify fix

## Logs
- [Pre-fix logs](#)
- [Post-fix logs](#)
