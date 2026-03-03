# Verityn - European News App

## Original Problem Statement
Mobile news application aggregating European news from RSS feeds, with personalization features and Inshorts-style card interface.

## Core Requirements
1. **Platform**: Expo-based Mobile App (iOS/Android)
2. **UI/UX**: "Inshorts-style" vertical swipe cards, European Elegance theme
3. **News Sources**: European RSS feeds with content scraping
4. **Personalization**: Category selection, keyword-based "For You", location-based filtering
5. **Features**: Bookmarks, search, dark mode, offline reading, shake-to-refresh

## Architecture
```
/app
├── backend/
│   └── server.py              # FastAPI with RSS parsing, scraping, location news
├── frontend/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── home.tsx       # Main news feed (Inshorts-style)
│   │   │   ├── foryou.tsx     # Location + Keyword personalization
│   │   │   ├── search.tsx
│   │   │   ├── bookmarks.tsx
│   │   │   └── profile.tsx    # Settings
│   │   └── index.tsx          # Onboarding
│   └── src/
│       └── utils/
│           ├── theme.tsx      # European Elegance theme
│           ├── locations.ts   # Country/city data
│           └── ...
```

## API Endpoints
- `GET /api/news?categories=...` - Main news feed
- `GET /api/location-news?countries=uk,germany&cities=london` - Location-based news
- `GET /api/locations/available` - Available countries/cities
- `GET /api/search?q=...` - Search articles

## What's Implemented (March 2026)

### ✅ Completed
- [x] Full European Elegance theme (warm white, amber primary)
- [x] Location-based news feature with 18 European countries
- [x] Regional RSS feeds (BBC, Guardian, DW, France24, etc.)
- [x] City-level filtering with 30+ cities
- [x] "For You" tab with Region/Keywords toggle
- [x] Dark mode support
- [x] Inshorts-style vertical swipe cards
- [x] Category selection onboarding
- [x] Bookmarking system
- [x] Content scraping for full articles
- [x] Web-compatible storage (localStorage fallback)

### 🔲 In Progress
- [ ] App Store asset generation (screenshots, icons)
- [ ] Offline reading (save button needed on cards)
- [ ] Shake-to-refresh (hook exists, needs wiring)

### 📋 Backlog
- [ ] Real push notifications (requires backend service)
- [ ] AI article summaries
- [ ] View-mode toggle in Settings

## Tech Stack
- **Frontend**: React Native, Expo SDK 54, TypeScript, Expo Router
- **Backend**: Python, FastAPI
- **Libraries**: feedparser, beautifulsoup4, httpx, @shopify/flash-list

## Known Issues
- Image loading fails in web preview (ORB blocking) - works on native
- Storage clears in preview - persists on real devices

## Credentials
- No authentication required
- News from public RSS feeds
