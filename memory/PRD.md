# Verityn - News Aggregator App

## Product Overview
A mobile news aggregator for the European market with Flipboard/Inshorts-style UI.

### Target Audience
European news readers who want quick, elegant news consumption on mobile.

### Core Requirements
1. **Platform**: Expo-based Mobile App (iOS/Android)
2. **UI/UX**: Flipboard/Inshorts style - full-screen cards, serif headlines, vertical swipe
3. **Personalization**: Category selection, "For You" feed
4. **Legal**: GDPR compliant with checkbox consent

---

## Tech Stack
- **Frontend**: Expo (SDK 54), React Native, TypeScript
- **Backend**: FastAPI, Python
- **Storage**: On-device via expo-secure-store (no external DB)

---

## Implemented Features (as of March 9, 2026)

### ✅ Bug Fixes (Latest Session - March 9, 2026)
- **CRITICAL FIX**: "No Stories Found" bug on home screen after category selection
  - Root cause: Race conditions in useNews hook category change detection
  - Fixed: useNews hook now properly detects category changes
  - Fixed: home.tsx initial fetch logic with proper preferencesLoaded check
  - Verified: Testing agent confirmed 100% pass rate

- **Content Enhancement**: Fuller article descriptions
  - Increased backend description limit from 500 to 700 characters
  - Increased content scraping from 3 to 6 articles per feed
  - Added comprehensive junk character cleaning (unicode, HTML entities, etc.)
  - Frontend now displays up to 100 words instead of 55

### Onboarding Flow
- [x] 3 intro slides (Swipe Through News, Your Feed Your Way, Read Anywhere)
- [x] Category selection screen (7 categories)
- [x] GDPR checkbox with Terms & Privacy Policy popup
- [x] Feature overlay on first home visit

### News Feed (Flipboard/Inshorts Style)
- [x] Full-bleed hero images (55% of card)
- [x] Serif headlines (Georgia font)
- [x] Source badge (top-left)
- [x] Bookmark & Share buttons (top-right)
- [x] Category pills (horizontal scroll) - For You, Politics, Business, Technology
- [x] Dark theme (Inshorts-style) for news cards
- [x] Gradient overlay for text readability

### Network & Reliability
- [x] NetworkManager for connection monitoring
- [x] NewsService with 3 retries + exponential backoff
- [x] OfflineNewsCache (100 articles, 24h expiry)
- [x] Auto-refresh on reconnection
- [x] Shake to refresh

### Other Features
- [x] Bookmarks (local storage)
- [x] Search
- [x] Settings/Profile
- [x] Tab refresh on icon tap

---

## Pending Tasks

### P0 (Critical)
- [ ] Test APK build with new UI
- [ ] Verify no white rectangle bug in standalone build

### P1 (High Priority)
- [ ] Social Share Card feature
- [ ] App Store screenshots
- [ ] Local timezone display

### P2 (Medium Priority)
- [ ] Push notifications (Firebase was removed due to build issues)
- [ ] AI article summaries
- [ ] Audio news (TTS)

### P3 (Low Priority)
- [ ] List/card view toggle
- [ ] Social features (comments, reactions)

---

## Key Files
- `/app/frontend/app/index.tsx` - Onboarding (intro + category selection)
- `/app/frontend/app/(tabs)/home.tsx` - Main news feed (Flipboard style)
- `/app/frontend/src/services/NetworkManager.ts` - Network monitoring
- `/app/frontend/src/services/NewsService.ts` - API calls with retry
- `/app/frontend/src/services/OfflineNewsCache.ts` - Offline support
- `/app/frontend/src/components/OnboardingIntro.tsx` - Intro slides
- `/app/frontend/src/components/FeatureOverlay.tsx` - First-time feature tips
- `/app/backend/server.py` - FastAPI backend

---

## API Endpoints
- `GET /api/news?categories=...&limit=15&offset=0` - Paginated news
- `GET /api/search?q=...` - Search articles
- `GET /api/health` - Health check

---

## Design Guidelines
See `/app/design_guidelines.json` for full design system including:
- Color palette (light/dark)
- Typography (serif for headlines, sans for body)
- Component specifications
- Motion/animations

---

## Known Issues
- Firebase was completely removed due to build failures
- Some news sources (WashingtonPost) block image scraping - handled with fallback

---

## Build Instructions
```bash
cd frontend
rm -rf node_modules/.cache .expo .metro-cache
yarn install
eas build --platform android --profile preview
```
