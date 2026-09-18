# TMGL QA Checklist

## 1. Web Application

### Authentication
- [ ] User can sign up with email/password
- [ ] User receives email confirmation (if required)
- [ ] User can sign in with valid credentials
- [ ] Invalid credentials show error message
- [ ] Session persists on page refresh
- [ ] Sign out clears session
- [ ] Protected routes redirect to login
- [ ] Unauthorized routes redirect to /unauthorized

### Navigation
- [ ] Desktop nav shows all public links
- [ ] Mobile hamburger menu opens/closes
- [ ] Mobile menu closes on Escape key
- [ ] Mobile menu closes on outside click
- [ ] Focus returns to trigger button on menu close
- [ ] Bottom nav shows on authenticated pages
- [ ] Bottom nav highlights active route
- [ ] Brand link navigates to home/dashboard

### Responsive Design
- [ ] No horizontal overflow on mobile (320px+)
- [ ] Cards stack properly on small screens
- [ ] Forms are usable on mobile
- [ ] Touch targets are at least 44px
- [ ] Tables scroll horizontally on mobile
- [ ] Bottom nav doesn't overlap content

### Forms
- [ ] All inputs have associated labels
- [ ] Required fields are marked
- [ ] Validation errors are announced
- [ ] Submit buttons show loading state
- [ ] Forms can be submitted with Enter key
- [ ] Password show/hide toggle works

### Error Handling
- [ ] Network errors show user-friendly message
- [ ] API errors show meaningful feedback
- [ ] Loading states show during async operations
- [ ] Empty states show when no data
- [ ] Error boundary catches runtime errors
- [ ] Toast notifications appear for actions

## 2. PWA

### Installation
- [ ] Install prompt appears on supported browsers
- [ ] App installs successfully
- [ ] App icon appears on home screen
- [ ] App opens in standalone mode

### Service Worker
- [ ] Service worker registers on first visit
- [ ] Service worker updates when new version available
- [ ] Static assets are precached
- [ ] API calls use NetworkFirst strategy
- [ ] Offline fallback page shows when network unavailable

### Manifest
- [ ] App name displays correctly
- [ ] Theme color matches design
- [ ] Icons display at correct sizes
- [ ] Display mode is standalone
- [ ] Orientation is portrait

## 3. Android Application

### Build
- [ ] Debug APK builds successfully
- [ ] Release APK builds (with keystore)
- [ ] AAB builds for Play Store
- [ ] App installs on Android 7.0+
- [ ] App installs on Android 15

### Screens
- [ ] Splash screen displays
- [ ] Login screen works
- [ ] Register screen works
- [ ] Home screen shows data
- [ ] Tournaments list loads
- [ ] Tournament detail loads
- [ ] Matches list loads
- [ ] Match detail loads
- [ ] Scoring screen loads
- [ ] Leaderboard loads
- [ ] Players list loads
- [ ] Player detail loads
- [ ] Teams list loads
- [ ] Team detail loads
- [ ] Profile screen loads
- [ ] Settings screen loads

### Scoring
- [ ] Scorecard loads from database
- [ ] Existing scores populate fields
- [ ] Scores save to Supabase
- [ ] Total strokes calculate correctly
- [ ] To-par calculates correctly
- [ ] Submission updates status

### Navigation
- [ ] Back button works correctly
- [ ] Bottom navigation works
- [ ] Screen transitions are smooth
- [ ] Deep links work (if configured)

## 4. Database & Security

### RLS Policies
- [ ] Public users can read active seasons
- [ ] Public users can read players
- [ ] Public users can read teams
- [ ] Managers can create/edit seasons
- [ ] Managers can create/edit tournaments
- [ ] Players can only access own scorecards
- [ ] No cross-user data access

### Auth
- [ ] Auto profile creation on signup
- [ ] Role assignment works correctly
- [ ] Session tokens refresh properly
- [ ] No service-role key in client code

## 5. Performance

### Web
- [ ] Initial load < 3 seconds on 3G
- [ ] Bundle size < 500KB (main chunk)
- [ ] Lighthouse performance > 90
- [ ] No layout shift (CLS < 0.1)

### Android
- [ ] Cold start < 2 seconds
- [ ] Screen transitions < 300ms
- [ ] No ANR (Application Not Responding)
- [ ] Memory usage < 150MB

## 6. Accessibility

### Keyboard
- [ ] All interactive elements focusable
- [ ] Focus indicators visible
- [ ] Tab order logical
- [ ] Escape key closes modals/menus

### Screen Readers
- [ ] Images have alt text
- [ ] Forms have labels
- [ ] Errors are announced
- [ ] Loading states announced
- [ ] ARIA attributes correct

### Visual
- [ ] Color contrast > 4.5:1
- [ ] Text resizable to 200%
- [ ] Touch targets >= 44px
- [ ] No information by color alone

## 7. Cross-Browser

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] Chrome Android
- [ ] Safari iOS
- [ ] Samsung Internet
- [ ] PWA installable on all

## 8. Regression Testing

- [ ] Phase 1 fixes still work
- [ ] No broken routes
- [ ] No TypeScript errors
- [ ] All 197 tests pass
- [ ] Build succeeds
