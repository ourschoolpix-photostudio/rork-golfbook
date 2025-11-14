# Using Backend Storage - Developer Guide

This guide shows how to use the new backend-first storage system in the app.

## Overview

All data (members, events, registrations) is now stored in Supabase and accessed via tRPC.

## tRPC Routes Available

### Members

```typescript
import { trpc } from '@/lib/trpc';

// In a React component:
const members = trpc.members.getAll.useQuery();
const member = trpc.members.get.useQuery({ memberId: 'xxx' });
const memberByPin = trpc.members.getByPin.useQuery({ pin: '1234' });

const createMember = trpc.members.create.useMutation();
const updateMember = trpc.members.update.useMutation();
const deleteMember = trpc.members.delete.useMutation();

// Usage:
await createMember.mutateAsync({
  id: 'uuid',
  name: 'John Doe',
  pin: '1234',
  isAdmin: false,
  rolexPoints: 0,
  createdAt: new Date().toISOString(),
  // ... other fields
});

await updateMember.mutateAsync({
  memberId: 'uuid',
  updates: {
    handicap: 12,
    email: 'john@example.com',
  },
});
```

### Events

```typescript
import { trpc } from '@/lib/trpc';

// In a React component:
const events = trpc.events.getAll.useQuery();
const event = trpc.events.get.useQuery({ eventId: 'xxx' });

const createEvent = trpc.events.create.useMutation();
const updateEvent = trpc.events.update.useMutation();
const deleteEvent = trpc.events.delete.useMutation();

const registerForEvent = trpc.events.register.useMutation();
const unregisterFromEvent = trpc.events.unregister.useMutation();

// Usage:
await createEvent.mutateAsync({
  id: 'uuid',
  name: 'Spring Tournament',
  date: '2025-03-15',
  venue: 'Pebble Beach',
  status: 'draft',
  // ... other fields
});

await registerForEvent.mutateAsync({
  eventId: 'event-uuid',
  memberId: 'member-uuid',
});
```

### Sync Routes (Legacy - Still Available)

```typescript
import { trpc } from '@/lib/trpc';

// Groupings (event-specific)
const groupings = trpc.sync.groupings.get.useQuery({ eventId: 'xxx' });
const syncGroupings = trpc.sync.groupings.sync.useMutation();

// Scores (event-specific)
const scores = trpc.sync.scores.getAll.useQuery({ eventId: 'xxx' });
const playerScore = trpc.sync.scores.getPlayer.useQuery({ 
  eventId: 'xxx', 
  memberId: 'yyy', 
  day: 1 
});
const submitScore = trpc.sync.scores.submit.useMutation();
```

## Using Contexts (Recommended)

The contexts now use the backend automatically. You don't need to call tRPC directly in most cases.

### AuthContext

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { 
    members,       // All members from backend
    currentUser,   // Currently logged in user
    isLoading,
    login,         // Login with PIN
    logout,
    addMember,     // Add to backend
    updateMember,  // Update in backend
    deleteMember,  // Delete from backend
  } = useAuth();

  // Examples:
  const handleLogin = async () => {
    const success = await login('1234');
    if (success) {
      // User is logged in
    }
  };

  const handleAddMember = async () => {
    await addMember({
      id: generateId(),
      name: 'Jane Smith',
      pin: '5678',
      isAdmin: false,
      rolexPoints: 0,
      createdAt: new Date().toISOString(),
      membershipType: 'active',
    });
    // Member is now in backend, members list will auto-refresh
  };
}
```

### EventsContext

```typescript
import { useEvents } from '@/contexts/EventsContext';

function MyComponent() {
  const { 
    events,           // All events from backend
    isLoading,
    addEvent,         // Add to backend
    updateEvent,      // Update in backend
    deleteEvent,      // Delete from backend
    addRegistration,  // Register player for event
  } = useEvents();

  // Examples:
  const handleCreateEvent = async () => {
    await addEvent({
      id: generateId(),
      name: 'Summer Classic',
      date: '2025-06-20',
      venue: 'Augusta National',
      status: 'draft',
      registeredPlayers: [],
      createdAt: new Date().toISOString(),
    });
    // Event is now in backend, events list will auto-refresh
  };

  const handleRegister = async () => {
    await addRegistration({
      id: `${eventId}-${memberId}`,
      eventId: eventId,
      playerId: memberId,
      registeredAt: new Date().toISOString(),
    });
    // Registration saved to backend, event will refresh
  };
}
```

## Auto-Refresh on Mutations

All mutations automatically trigger a refetch of the related query:

```typescript
// When you call:
await createEvent.mutateAsync({ ... });

// The events query automatically refetches:
// trpc.events.getAll.useQuery() ← will refresh
```

This means your UI stays in sync automatically!

## Error Handling

```typescript
const createEvent = trpc.events.create.useMutation({
  onSuccess: (data) => {
    console.log('Event created!', data);
    // Show success message
  },
  onError: (error) => {
    console.error('Failed to create event:', error);
    // Show error message to user
  },
});

// Or use try/catch:
try {
  await createEvent.mutateAsync({ ... });
  // Success!
} catch (error) {
  // Handle error
  console.error(error);
}
```

## Loading States

```typescript
function MyComponent() {
  const eventsQuery = trpc.events.getAll.useQuery();

  if (eventsQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (eventsQuery.error) {
    return <ErrorMessage error={eventsQuery.error} />;
  }

  return <EventsList events={eventsQuery.data} />;
}
```

## Manual Refetch

```typescript
const eventsQuery = trpc.events.getAll.useQuery();

// Later, manually refresh:
await eventsQuery.refetch();
```

## Non-React Code (Outside Components)

```typescript
import { trpcClient } from '@/lib/trpc';

// Use trpcClient instead of trpc in non-React code
async function doSomething() {
  const members = await trpcClient.members.getAll.query();
  
  await trpcClient.members.create.mutate({
    id: 'uuid',
    name: 'Test User',
    // ...
  });
}
```

## Best Practices

1. **Use Contexts** - Always use `useAuth()` and `useEvents()` instead of calling tRPC directly
2. **Let Auto-Refresh Work** - Don't manually refetch unless necessary
3. **Handle Errors** - Always show error messages to users
4. **Loading States** - Show loading indicators during mutations
5. **Optimistic Updates** - Consider adding optimistic updates for better UX (advanced)

## Migration from Old Code

### Before (AsyncStorage):
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const events = JSON.parse(await AsyncStorage.getItem('events') || '[]');
const updated = [...events, newEvent];
await AsyncStorage.setItem('events', JSON.stringify(updated));
```

### After (Backend):
```typescript
import { useEvents } from '@/contexts/EventsContext';

const { addEvent } = useEvents();
await addEvent(newEvent);
// Done! Data saved to backend and auto-refreshed
```

## Common Patterns

### Create with ID Generation
```typescript
import { generateId } from '@/utils/helpers'; // or use uuid library

const newMember = {
  id: generateId(),
  name: 'New Member',
  // ... other fields
};

await addMember(newMember);
```

### Update Partial Fields
```typescript
// Only update what changed
await updateEvent(eventId, {
  status: 'active', // Only this field updates
});
```

### Check Registration Status
```typescript
const { events } = useEvents();
const event = events.find(e => e.id === eventId);

const isRegistered = event?.registeredPlayers?.includes(currentUser.id);
```

## Debugging

Enable tRPC logging:
```typescript
// In lib/trpc.ts, the links array:
links: [
  loggerLink(), // Add this for detailed logging
  httpLink({
    url: `${getBaseUrl()}/api/trpc`,
  }),
],
```

Check backend logs:
- All tRPC procedures log to console
- Look for ✅ (success) and ❌ (error) emojis in logs

## Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { trpc } from '@/lib/trpc';

test('creates member', async () => {
  const { result } = renderHook(() => trpc.members.create.useMutation());
  
  await result.current.mutateAsync({
    id: 'test-id',
    name: 'Test User',
    // ...
  });
  
  expect(result.current.isSuccess).toBe(true);
});
```

## Summary

- ✅ Use `useAuth()` and `useEvents()` contexts
- ✅ Data automatically syncs to backend
- ✅ Auto-refresh on mutations
- ✅ No more AsyncStorage for data
- ✅ Internet connection required
- ✅ Multi-device support built-in
