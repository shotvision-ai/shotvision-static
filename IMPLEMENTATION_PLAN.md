# Shot-Vision Implementation Plan - Phase 1 (UI)

## Overview

Building a minimal, premium sports match tracking mobile app with refined UI/UX and complete mock data support.

## Design Aesthetic

- **Style**: Premium Minimal Sport-Tech
- **Typography**: DM Sans (geometric sans-serif for refined, modern look)
- **Primary Color**: Emerald Green (#059669 / hsl(160 84% 39%))
- **Background**: Pure white (#FFFFFF)
- **Shadows**: Soft, elevation-based (subtle depth)
- **Spacing**: Generous padding and margins
- **Borders**: Minimal, rounded corners throughout
- **Feel**: Professional, uncluttered, sophisticated

## Technical Implementation

### 1. Theme & Typography Setup

- Add DM Sans font family via expo-google-fonts
- Update light theme with emerald green primary color
- Configure typography scale with DM Sans
- Update theme colors for status badges (live/completed/scheduled)

### 2. Route Structure (Expo Router)

```
app/
├── _layout.tsx (root shell, no tabs config here)
├── index.tsx (redirect logic only → /dashboard)
├── (tabs)/
│   ├── _layout.tsx (bottom tab navigator config)
│   ├── dashboard.tsx
│   ├── explore.tsx
│   └── profile.tsx
├── create-match.tsx (modal/stack screen)
└── match/
    └── [id].tsx (match detail view)
```

### 3. Core UI Components

Build reusable, themed components:

#### MatchCard (`components/match/MatchCard.tsx`)

- Props: match data object
- Circular profile image (40x40)
- Player names in bold
- Status badge (Live=orange, Completed=green, Scheduled=blue)
- Match date (grey, small)
- Location (if available)
- Winner display (for completed)
- Soft shadow, rounded corners
- Tap to navigate to detail

#### StatusBadge (`components/match/StatusBadge.tsx`)

- Props: status type
- Color coding:
  - Live: hsl(25 95% 53%) - orange
  - Completed: hsl(160 84% 39%) - emerald
  - Scheduled: hsl(217 91% 60%) - blue
- Rounded pill shape
- Small text

#### FloatingActionButton (`components/ui/FloatingActionButton.tsx`)

- Bottom-right position (16px margins)
- Circular (56x56)
- Emerald green background
- Plus icon (white)
- Elevation shadow
- Navigate to /create-match

#### ProfileAvatar (`components/ui/ProfileAvatar.tsx`)

- Props: imageUrl, size, editable
- Circular image
- Fallback to initials if no image
- Edit overlay icon for profile page

### 4. Screens

#### Dashboard (`app/(tabs)/dashboard.tsx`)

- Header: "My Matches" title, filter icon (right)
- SafeAreaView wrapper
- FlatList of match cards
- Mock data: 5-8 matches with varied statuses
- Sort by match date (newest first)
- FloatingActionButton overlay
- Empty state: "No matches yet" with create CTA

#### Create Match (`app/create-match.tsx`)

- ScrollView layout
- Sectioned form:
  1. Players (TextInput × 2)
  2. Match Details (date picker, location, scheduled toggle)
  3. Score (conditional, up to 5 sets, numeric inputs)
  4. Notes (multiline)
  5. Privacy (toggle: Private/Public)
- Bottom buttons:
  - "Live" (primary, full-width)
  - "Match Complete" (secondary, full-width, conditional enable)
- Validation state (local UI state)
- Navigation: navigate back on action
- Mock actions (TODO comments)

#### Explore (`app/(tabs)/explore.tsx`)

- Header: "Explore Matches"
- FlatList of public match cards
- Show creator profile + name
- No edit/delete actions
- Mock data: 8-10 public matches
- Tap to view detail (read-only)

#### Profile (`app/(tabs)/profile.tsx`)

- Large circular profile image (120x120) at top
- Edit icon overlay
- Form fields:
  - Name (TextInput, editable)
  - Email (Text, read-only)
  - Bio (TextArea, optional)
  - Location (TextInput, optional)
- "Save Profile" button (primary, full-width)
- Mock profile data
- Mock save action

#### Match Detail (`app/match/[id].tsx`)

- Full match information display
- Profile images
- Player names
- Score breakdown (set by set)
- Match date & location
- Notes
- Winner highlight
- Back navigation

### 5. Bottom Tab Navigator

Configure in `app/(tabs)/_layout.tsx`:

- 3 tabs: Dashboard, Explore, Profile
- Icons: list/scoreboard, globe, user (via LucideIcon)
- Active tab: emerald green
- Inactive: grey
- Tab bar: white background, soft top shadow
- No extra padding/height
- Human-friendly titles

### 6. Mock Data Structure

```typescript
// types/match.ts
type MatchStatus = "live" | "completed" | "scheduled";

interface Match {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorImage: string;
  playerA: string;
  playerB: string;
  status: MatchStatus;
  matchDate: string; // ISO date
  location?: string;
  isPublic: boolean;
  sets: Set[];
  notes?: string;
  winner?: "playerA" | "playerB";
  scheduledDate?: string; // ISO date
}

interface Set {
  playerAScore: number;
  playerBScore: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string;
  bio?: string;
  location?: string;
}
```

Mock data files:

- `data/mockMatches.ts` - sample matches (user + public)
- `data/mockProfile.ts` - sample user profile

### 7. Date Handling

- Use native DatePicker or simple TextInput with date format
- Display dates in friendly format (e.g., "Jan 15, 2025")
- Sort matches by matchDate (newest first)

### 8. Form Validation (Local UI State)

Create Match screen:

- Enable "Match Complete" only when:
  - playerA && playerB
  - sets.length > 0 && all sets have scores
  - winner is calculable
- Use React state for form values
- Use React state for validation flags
- No persistence (Phase 2)

### 9. Navigation Flows

- Dashboard → tap card → Match Detail
- Dashboard → FAB → Create Match
- Create Match → "Live" or "Match Complete" → navigate back to Dashboard
- Explore → tap card → Match Detail (read-only)
- Profile → "Save" → show success message (mock)
- Bottom tabs → switch between Dashboard, Explore, Profile

### 10. Icon Usage

All icons via `LucideIcon` component:

- Dashboard tab: "List" or "Trophy"
- Explore tab: "Globe"
- Profile tab: "User"
- FAB: "Plus"
- Filter: "Filter"
- Edit profile: "PenSquare"
- Back: (handled by Stack navigator)

Validate all icon names against LucideIcon registry.

### 11. Light/Dark Mode

- Design primarily for light mode (white background)
- Ensure readable contrast in dark mode
- Use themed color tokens (background, foreground, primary, etc.)

### 12. Quality Assurance

After each screen implementation:

- Check preview status
- Verify navigation works
- Test light/dark contrast
- Confirm no TypeScript errors
- Smoke test touch interactions

## Out of Scope (Phase 2)

- Backend integration (Supabase, Firebase, etc.)
- Real data persistence
- Authentication & user sessions
- React Query setup
- Zustand stores for state
- Real form submission & validation logic
- Image upload functionality
- Push notifications
- Analytics

## Implementation Order

1. Update theme & add DM Sans font
2. Create types & mock data
3. Build reusable UI components (MatchCard, StatusBadge, FAB, ProfileAvatar)
4. Set up tab navigator structure
5. Implement Dashboard screen
6. Implement Create Match screen
7. Implement Explore screen
8. Implement Profile screen
9. Implement Match Detail screen
10. Final QA pass
