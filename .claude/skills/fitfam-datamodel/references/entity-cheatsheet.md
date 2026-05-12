# Entity cheatsheet

One-line summaries of every entity in fitfamconnect, plus their key fields and relationships. For full semantics see [DATAMODEL.md](../../../../DATAMODEL.md). For the canonical schema shape see the file in `src/server/db/`.

## User
**File:** `src/server/db/user.ts` · **Auth-attached:** yes · **Pattern exception:** uses `Document &` interface (only entity that does)
- `remoteId` (Clerk user id, unique), `email` (unique), `username`, `roles[]` (`member|owner|root`), `preferences`, `isActive`, `lastLoginAt`
- One User per Clerk identity, *not* per gym. Created lazily by `auth.ts` on first sign-in.

## Member
**File:** `src/server/db/member.ts` · **Per-gym** (one Member row per User per Gym)
- Profile: `firstName`, `lastName`, `email`, `phone`, `address`, optional `pinCode` (4–6 digits)
- Relationship: `gymId`, `memberType` (`owner|coach|member`), `status` (`pending|approved|denied|inactive`), `approvedBy`, `approvedAt`, `joinRequestDate`
- Hooks: phone & pinCode stripped to digits; `approvedAt` auto-set when status flips to approved.
- **Does not** hold start dates — those live on Membership.

## Membership
**File:** `src/server/db/membership.ts` · **Member ↔ Plan join with billing tracking**
- `memberId`, `planId`, `startDate` (midnight UTC), `endDate?` (null = active), `lastBilledDate?`, `nextBillDate?`
- One row per plan-assignment. A member can have several active rows (e.g., recurring plan + workshop plan).
- Date getters snap to midnight UTC; this matters for billing math.

## Plan
**File:** `src/server/db/plan.ts` · **Owner-only mutation** · Always recurring
- `name`, `description?`, `price` (cents), `currency` (default USD), `startDateTime`, `endDateTime?`, `recurringPeriod` (`weekly|monthly|quarterly|yearly`), `gymId`, `isActive`
- Virtual `formattedPrice`, instance method `isCurrentlyActive()`.

## Charge
**File:** `src/server/db/charge.ts` · **Audit row for billing**
- `memberId`, `amount` (cents), `note?`, `chargeDate`, `isBilled`, `billedDate?`, `billingId?`
- Either `membershipId` (plan-based) **xor** `productId` (product-based) — pre-validate enforces. Plain free-form charges have neither.
- Compound indexes for `memberId+chargeDate` and `billingId+isBilled`.

## Billing
**File:** `src/server/db/billing.ts` · **Billing run record**
- `memberId` (the user who ran billing — the field name is misleading; there's a TODO to rename to `userId`), `billingDate`, `startDate`, `endDate`
- Validated `endDate > startDate`. Charges link back via `Charge.billingId`.

## Gym
**File:** `src/server/db/gym.ts` · **Top-level tenant** · Owned by one Member
- `name`, `description?`, `gymCode` (6-char alphanumeric, unique, auto-generated), `ownerId` (Member._id), `billingAddress`, `contact`, `isActive`, `lastBillingRunDate?`
- `lastBillingRunDate` is the watermark for accumulation billing — see `BILLING.md`.

## Location
**File:** `src/server/db/location.ts` · **Belongs to a Gym** · "Rooms" within a gym
- Each gym auto-created with a "main" location. Optional address, operating hours, max member count.
- Schedule conflicts are per-location, not per-gym.

## Class
**File:** `src/server/db/class.ts` · **Owner-only mutation** · Definition only (no when/where)
- `name`, `description?`, `duration` (min), `maxMembers?`, `category?`, `equipment[]?`, `gymId`, `coachId?`, `isActive`

## Schedule
**File:** `src/server/db/schedule.ts` · **Owner-only mutation** · Class → Location → time
- `classId`, `locationId`, `coachId?`, `startDateTime`, `endDate?`, `maxAttendees?`, `notes?`, `isRecurring`, `recurringPattern?` (`frequency`, `interval`, `daysOfWeek[]`)
- Conflict checker is per-location. See `SCHEDULING.md`.
- Pre-validate: weekly recurring requires `daysOfWeek`; `endDate` must be after `startDateTime`.

## Signup
**File:** `src/server/db/signup.ts` · **Member ↔ Schedule for a specific date**
- Not an ongoing subscription — one row per attendance commitment.

## Product
**File:** `src/server/db/product.ts` · **One-time saleable thing** (LMNT, T-shirt, squat clinic)
- `name`, `description?`, `status` (`active|inactive`), `price` (cents), `cost?` (cents)

## ClassAttendance, Result, Feedback
- `classattendance.ts` — per-member attendance audit, isolated for sharding/reporting.
- `result.ts` — workout results.
- `feedback.ts` — user-submitted feedback.
