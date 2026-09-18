# Phase 1 Fixes

**Date:** 2026-09-17
**Scope:** Critical bug fixes, security hardening, code quality improvements

---

## Fixes Applied

### 1. DashboardPage Error Variable Bug (HIGH)
**File:** `src/pages/DashboardPage.tsx:57-61`
**Bug:** `setError(lsResult.error)` used wrong variable when `dsResult.error` was truthy. Also, `lsResult.error` was never checked.
**Fix:** Replaced with proper error priority chain: `const firstError = lsResult.error || dsResult.error || actResult.error;`
**Impact:** Dashboard now correctly displays errors from any data source.

### 2. PublicLayout Authentication State (HIGH)
**File:** `src/components/layout/PublicLayout.tsx`
**Bug:** Always passed `isAuthenticated={false}` to Header, hiding role badge and dashboard link for authenticated users on public pages.
**Fix:** Added `useAuth()` hook to read actual authentication state and pass `isAuthenticated`, `userRole`, and `onSignOut` to Header.
**Impact:** Authenticated users now see their role badge and can navigate to dashboard from public pages.

### 3. Error Boundary Component (HIGH)
**File:** `src/components/common/ErrorBoundary.tsx` (new)
**Bug:** No React Error Boundary existed. Unhandled runtime errors would crash the entire app with no recovery.
**Fix:** Created `ErrorBoundary` class component with error display and recovery. Wrapped `<App>` in `App.tsx`.
**Impact:** Runtime errors now show a user-friendly error screen with retry capability.

### 4. Android Match Number Field (HIGH)
**File:** `android/.../model/DomainModels.kt:168-181`
**Bug:** `Match` data class missing `matchNumber` field, causing compile errors in `MatchesScreen.kt:69` and `MatchDetailScreen.kt:58`.
**Fix:** Added `@SerialName("match_number") val matchNumber: Int = 0` to `Match` data class.
**Impact:** Android app compiles without errors. Match screens display match numbers.

### 5. Android Supabase Credentials (HIGH)
**File:** `android/.../data/SupabaseConfig.kt`
**Bug:** Supabase URL and API key hardcoded as string constants in source code.
**Fix:** Moved to `BuildConfig` fields read from `local.properties`. Updated `app/build.gradle` with `buildConfigField` entries and `buildFeatures { buildConfig true }`. Created `local.properties.example` template.
**Impact:** Credentials no longer hardcoded. Developers configure via `local.properties` (gitignored).

### 6. Android Backup Security (MEDIUM)
**File:** `android/app/src/main/AndroidManifest.xml:9`
**Bug:** `android:allowBackup="true"` allowed user data extraction from device backups.
**Fix:** Changed to `android:allowBackup="false"` and added `android:fullBackupOnly="false"`.
**Impact:** App data cannot be extracted via adb backup or cloud backup.

### 7. Android Test Package Mismatch (MEDIUM)
**Files:** `android/.../ExampleInstrumentedTest.java`, `android/.../ExampleUnitTest.java`
**Bug:** Tests used `com.getcapacitor.myapp` package (Capacitor default) instead of `com.tmgl.league`. Instrumented test asserted wrong package name.
**Fix:** Changed package to `com.tmgl.league` and updated assertion to `assertEquals("com.tmgl.league", ...)`.
**Impact:** Tests now correctly target the actual application package.

### 8. Consolidated ServiceResult Type (LOW)
**Files:** `src/types/service.ts` (new), `src/lib/league.ts`, `src/lib/competition.ts`
**Bug:** Identical `ServiceResult<T>` type defined in both `league.ts` and `competition.ts`.
**Fix:** Created shared `src/types/service.ts` and updated both files to import from it.
**Impact:** Single source of truth for the service result type.

### 9. Extracted RoundCreatePage (LOW)
**Files:** `src/pages/RoundCreatePage.tsx` (new), `src/router/AppRouter.tsx`
**Bug:** `RoundCreatePageWrapper` defined inline in `AppRouter.tsx` with imports placed after the function definition.
**Fix:** Extracted to dedicated `src/pages/RoundCreatePage.tsx`. Updated router to import from new file.
**Impact:** Cleaner code organization, proper import ordering.

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/pages/DashboardPage.tsx` | Modified | Fixed error variable bug |
| `src/components/layout/PublicLayout.tsx` | Modified | Added auth context integration |
| `src/components/common/ErrorBoundary.tsx` | Created | New error boundary component |
| `src/App.tsx` | Modified | Wrapped with ErrorBoundary |
| `src/types/service.ts` | Created | Shared ServiceResult type |
| `src/lib/league.ts` | Modified | Import ServiceResult from shared type |
| `src/lib/competition.ts` | Modified | Import ServiceResult from shared type |
| `src/pages/RoundCreatePage.tsx` | Created | Extracted from AppRouter.tsx |
| `src/router/AppRouter.tsx` | Modified | Import RoundCreatePage, remove inline component |
| `android/.../DomainModels.kt` | Modified | Added matchNumber field to Match |
| `android/.../SupabaseConfig.kt` | Modified | Use BuildConfig instead of hardcoded values |
| `android/.../AndroidManifest.xml` | Modified | Set allowBackup=false |
| `android/.../ExampleInstrumentedTest.java` | Modified | Fixed package and assertion |
| `android/.../ExampleUnitTest.java` | Modified | Fixed package |
| `android/app/build.gradle` | Modified | Added buildConfig fields and feature |
| `android/local.properties.example` | Created | Template for local configuration |
| `docs/PHASE_1_AUDIT.md` | Created | Complete project audit |
| `docs/ARCHITECTURE.md` | Created | Architecture documentation |
| `docs/PHASE_1_FIXES.md` | Created | This file |

---

## Validation

| Check | Result |
|-------|--------|
| `npm install` | PASS (10 vulnerabilities, 8 moderate, 1 high, 1 critical — npm audit) |
| `npx tsc --noEmit` | PASS (no errors) |
| `npm run test` | PASS (197 tests, 7 files) |
| `npm run build` | PASS (built in 7.73s) |
| Bundle size | 640KB JS (gzip 156KB), 29KB CSS (gzip 6KB) |
| PWA manifest | Valid (8 precached entries) |
| Service worker | Generated (autoUpdate mode) |

---

## Decisions Requiring Approval

1. **Android Capacitor cleanup:** Vestigial Capacitor files (`activity_main.xml`, `capacitor.build.gradle`, `capacitor-cordova-android-plugins/`) are harmless but add confusion. Recommended to remove in Phase 2 after verifying build.
2. **JS bundle size:** 640KB exceeds 500KB warning. Recommended to implement code-splitting with `React.lazy()` in Phase 2.
3. **npm vulnerabilities:** 10 vulnerabilities reported. Run `npm audit fix --force` or update dependencies in Phase 2.
