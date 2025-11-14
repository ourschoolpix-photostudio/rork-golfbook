# Architecture Diagram

## Current System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile App (React Native + Expo)          │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Login Screen    │  │   Event Screens  │  │ Admin Screens │ │
│  │  (PIN Entry)     │  │   (View/Register)│  │ (Manage Data) │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
│           │                     │                      │         │
│           └─────────────────────┼──────────────────────┘         │
│                                 │                                │
│  ┌──────────────────────────────▼──────────────────────────────┐│
│  │                    React Contexts                            ││
│  │  ┌─────────────────────┐  ┌──────────────────────────────┐ ││
│  │  │   AuthContext       │  │      EventsContext           │ ││
│  │  │  - members          │  │      - events                │ ││
│  │  │  - currentUser      │  │      - registrations         │ ││
│  │  │  - login/logout     │  │      - CRUD operations       │ ││
│  │  └──────────┬──────────┘  └──────────────┬───────────────┘ ││
│  │             │                             │                  ││
│  │             └─────────────────┬───────────┘                  ││
│  └───────────────────────────────┼──────────────────────────────┘│
│                                  │                                │
│  ┌───────────────────────────────▼──────────────────────────────┐│
│  │                     tRPC Client                               ││
│  │  - Type-safe API calls                                        ││
│  │  - React Query integration                                    ││
│  │  - Auto-refresh on mutations                                  ││
│  └───────────────────────────────┬──────────────────────────────┘│
└────────────────────────────────────┼────────────────────────────┘
                                    │
                                    │ HTTPS/JSON
                                    │
┌────────────────────────────────────▼────────────────────────────┐
│                    Backend Server (Hono + tRPC)                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    tRPC Router                            │   │
│  │                                                            │   │
│  │  ┌──────────────────┐  ┌──────────────────────────────┐ │   │
│  │  │  Members Routes  │  │      Events Routes           │ │   │
│  │  │  - getAll        │  │      - getAll                │ │   │
│  │  │  - get           │  │      - get                   │ │   │
│  │  │  - getByPin      │  │      - create                │ │   │
│  │  │  - create        │  │      - update                │ │   │
│  │  │  - update        │  │      - delete                │ │   │
│  │  │  - delete        │  │      - register              │ │   │
│  │  └────────┬─────────┘  │      - unregister            │ │   │
│  │           │             └──────────────┬───────────────┘ │   │
│  │           └────────────────────────────┘                 │   │
│  └────────────────────────────┬───────────────────────────────┘   │
│                               │                                   │
│  ┌────────────────────────────▼───────────────────────────────┐  │
│  │              Supabase JavaScript Client                     │  │
│  │  - Connection pooling                                       │  │
│  │  - Query building                                           │  │
│  └────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────────┘
                                 │ PostgreSQL Protocol
                                 │
┌─────────────────────────────────▼───────────────────────────────┐
│                  Supabase (PostgreSQL Database)                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │   members    │  │    events    │  │ event_registrations │    │
│  │              │  │              │  │                     │    │
│  │  - id        │  │  - id        │  │  - event_id  ────┐ │    │
│  │  - name      │  │  - name      │  │  - member_id ──┐ │ │    │
│  │  - pin       │  │  - date      │  │  - status      │ │ │    │
│  │  - isAdmin   │  │  - venue     │  │  - registered  │ │ │    │
│  │  - email     │  │  - status    │  │                │ │ │    │
│  │  - handicap  │  │  - ...       │  └────────────────┼─┼─┘    │
│  │  - ...       │  └───▲──────────┘                   │ │      │
│  └───▲──────────┘      │                              │ │      │
│      │                 └──────────────────────────────┘ │      │
│      └────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  groupings   │  │    scores    │  │  financial_records   │  │
│  │  - event_id  │  │  - event_id  │  │  - event_id          │  │
│  │  - day       │  │  - member_id │  │  - member_id         │  │
│  │  - hole      │  │  - day       │  │  - amount            │  │
│  │  - slots     │  │  - holes[]   │  │  - type              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### 1. User Login
```
User enters PIN
    ↓
AuthContext.login(pin)
    ↓
trpc.members.getAll.useQuery()
    ↓
Backend: GET /api/trpc/members.getAll
    ↓
Supabase: SELECT * FROM members
    ↓
Backend: Return members array
    ↓
AuthContext: Find member with matching PIN
    ↓
User logged in ✓
```

### 2. Create Event
```
Admin clicks "Create Event"
    ↓
EventsContext.addEvent(newEvent)
    ↓
trpc.events.create.mutateAsync(newEvent)
    ↓
Backend: POST /api/trpc/events.create
    ↓
Supabase: INSERT INTO events VALUES (...)
    ↓
Backend: Return success
    ↓
tRPC: Auto-refetch events.getAll
    ↓
UI updates with new event ✓
```

### 3. Register for Event
```
Player clicks "Register"
    ↓
EventsContext.addRegistration({eventId, memberId})
    ↓
trpc.events.register.mutateAsync({eventId, memberId})
    ↓
Backend: POST /api/trpc/events.register
    ↓
Supabase: INSERT INTO event_registrations (event_id, member_id)
    ↓
Backend: Return success
    ↓
tRPC: Auto-refetch events.getAll
    ↓
UI shows player as registered ✓
```

### 4. Multi-Device Sync
```
Device A: Create event
    ↓
Saved to Supabase
    
Device B: Opens event list
    ↓
trpc.events.getAll.useQuery()
    ↓
Fetches from Supabase
    ↓
Device B sees new event ✓
```

## Storage Comparison

### Before (Local Storage)
```
Device A                    Device B
┌─────────────┐            ┌─────────────┐
│ AsyncStorage│            │ AsyncStorage│
│  - events[] │            │  - events[] │
│  - members[]│            │  - members[]│
└─────────────┘            └─────────────┘
      ↓                           ↓
  Different data              Different data
  Must sync manually          Must sync manually
```

### After (Backend Storage)
```
Device A                    Device B
┌─────────────┐            ┌─────────────┐
│   tRPC      │            │   tRPC      │
│   Client    │            │   Client    │
└──────┬──────┘            └──────┬──────┘
       │                          │
       └─────────┬────────────────┘
                 │
         ┌───────▼────────┐
         │   Supabase     │
         │  (PostgreSQL)  │
         │  - events[]    │
         │  - members[]   │
         └────────────────┘
              ↓
        Single source of truth
        Always in sync
        Real-time updates
```

## Authentication Flow
```
┌─────────────────────────────────────────────────────────┐
│ 1. User enters PIN                                      │
│    ↓                                                     │
│ 2. App fetches all members from backend                 │
│    ↓                                                     │
│ 3. Find member with matching PIN                        │
│    ↓                                                     │
│ 4. If found: Store in AsyncStorage (session only)       │
│    ↓                                                     │
│ 5. User logged in, can access app                       │
│    ↓                                                     │
│ 6. On app restart: Load user from AsyncStorage          │
│    (No need to re-enter PIN)                            │
└─────────────────────────────────────────────────────────┘

Note: Only the logged-in user session is stored locally.
All member data is fetched from backend.
```

## Technology Stack

```
Frontend:
- React Native (Cross-platform mobile)
- Expo (Development tools)
- tRPC Client (API calls)
- React Query (Caching & state)
- TypeScript (Type safety)

Backend:
- Hono (Web framework)
- tRPC (Type-safe API)
- Supabase JS Client (Database)
- Zod (Validation)

Database:
- Supabase (PostgreSQL)
- Row Level Security
- Foreign Keys
- Indexes
```

## Benefits of New Architecture

```
✓ Real-time data across devices
✓ Type-safe API calls
✓ Auto-refresh on changes
✓ Single source of truth
✓ Scalable to unlimited users
✓ Prepared for payments
✓ Cloud backup
✓ Multi-device support
✓ No manual sync needed
✓ Professional architecture
```

## Trade-offs

```
Before:
+ Works offline
+ No internet required
+ Fast (local storage)
- Manual sync required
- Data can be out of sync
- Single device only
- No cloud backup

After:
+ Always up-to-date
+ Multi-device support
+ Cloud backup
+ Real-time sync
- Requires internet
- Slightly slower (network)
- Cannot work offline
```
