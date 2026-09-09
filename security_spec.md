# Firestore Security Specification & Invariants

## Architecture & Source of Truth
Persistent financial data is authoritative ONLY within Firestore. The browser's `localStorage` is strictly restricted to ephemeral non-critical client preferences (such as dark/light UI theme and widget dashboard layout). Trade journals, monthly goals, user accounts, subscription state, and AI usage counts must never be persisted to or trusted from `localStorage`.

### Document Hierarchy & Scope
1. **User Profile**: `/users/{userId}`
   - *Client-Editable Fields*: `username`, `displayName`, `email`, `updatedAt`
   - *Immutable Fields*: `userId`, `createdAt`
   - *Disallowed Fields*: `tier`, `usageCount`, `subscriptionExpiry` (migrated to subscription subcollection to prevent client privilege escalation)
2. **Trade Records**: `/users/{userId}/trades/{tradeId}`
   - *Client-Editable Fields*: `pair`, `type`, `entryPrice`, `exitPrice`, `lotSize`, `pnl`, `status`, `session`, `timestamp`, `notes`, `riskPercent`, `aiFeedback`, `isAnalyzing`, `updatedAt`
   - *Immutable Fields*: `userId`, `tradeId`, `createdAt`
   - *Strict Enums*: `type` ('BUY' | 'SELL'), `status` ('WIN' | 'LOSS' | 'BE'), `session` ('LONDON' | 'NEW_YORK' | 'ASIAN' | 'OVERLAP')
3. **User Goals**: `/users/{userId}/goals/settings`
   - Fixed document ID: `settings`
   - *Client-Editable Fields*: `monthlyProfitTarget`, `winRateTarget`, `tradesPerMonthTarget`, `updatedAt`
   - *Immutable Fields*: `userId`, `createdAt`
4. **User Subscription & Usage**: `/users/{userId}/subscription/current`
   - Fixed document ID: `current`
   - *Server-Controlled Protected Fields*: `tier`, `subscriptionExpiry`, `userId`, `balance`
   - *Monotonic Fields*: `usageCount.vision`, `usageCount.audit` (client can only increment, never decrease)
   - *Initial Creation*: Only `tier: 'FREE'` and initial zeroed counters `{ vision: 0, audit: 0 }` allowed.

---

## Core Security Invariants
1. **Authentication Boundary**: Unauthenticated requests are rejected on all paths.
2. **User Isolation**: Authenticated users can only read and write documents inside their own subtree (`request.auth.uid == userId`). Cross-user reads or writes are rejected.
3. **Collection Listing Prohibition**: The root `/users` collection cannot be listed or queried by any client (`allow list: if false`).
4. **Document ID Hardening**: All dynamic document IDs (`tradeId`, `userId`) must be strictly alphanumeric (plus `_` and `-`), non-empty, and maximum 128 characters. Singletons must match fixed paths (`settings`, `current`).
5. **Anti-Ghost Field (Zero Shadow Fields)**: Every document write (`create` and `update`) validates that incoming fields are an exact subset of the allowlisted schema keys. Any extra or ghost fields (e.g. `isAdmin`, `isPro`, `role`) immediately fail.
6. **Tier Privilege Escalation Defense**: Clients cannot create documents with `tier: 'PRO'` or `tier: 'ELITE'`. Updates to subscription documents cannot change `tier` or `subscriptionExpiry`.
7. **Usage Monotonicity**: Decreasing AI usage counters via client updates is blocked by rule `incoming().usageCount[x] >= existing().usageCount[x]`.
8. **Ownership Immutability**: On update, `incoming().userId == existing().userId` ensures that ownership cannot be transferred or spoofed.

---

## The Dirty Dozen Test Suite Matrix
The test runner (`firestore.rules.test.ts`) verifies that every malicious or malformed payload is rejected with `PERMISSION_DENIED`:

1. **Unauthenticated Read**: Anonymous client attempts to read `/users/{uid}`, `/users/{uid}/trades/{tradeId}`, `/users/{uid}/goals/settings`, or `/users/{uid}/subscription/current`.
2. **Cross-User Trade Access**: User B attempts to read or write `/users/userA/trades/trade1`.
3. **Cross-User Goal Access**: User B attempts to read or write `/users/userA/goals/settings`.
4. **Spoofed User ID**: User A attempts to write a trade document with `userId: 'userB'`.
5. **Spoofed Tier on Create**: User A attempts to create `/users/userA/subscription/current` with `tier: 'PRO'`.
6. **Spoofed Tier on Update**: User A attempts to update existing `FREE` tier to `PRO` or `ELITE`.
7. **Spoofed Usage Decrease**: User A attempts to decrease usage counters from `{ vision: 3 }` to `{ vision: 0 }`.
8. **Ghost Fields Injection**: User A attempts to include unexpected fields like `{ isAdmin: true }` in their user profile or trade document.
9. **Invalid Data Types**: User A attempts to write a non-numeric `balance` or non-numeric `pnl` string.
10. **Invalid Enum Values**: User A attempts to write a trade with `type: 'SHORT'` or `status: 'DRAW'` or `session: 'TOKYO'`.
11. **Oversized Strings**: User A attempts to write a trade with a 30-character `pair` or notes exceeding 2000 characters.
12. **Invalid Document IDs**: User A attempts to write to `/users/userA/trades/../../bad$id` or a tradeId exceeding 128 characters, or non-singleton goal/subscription paths.
