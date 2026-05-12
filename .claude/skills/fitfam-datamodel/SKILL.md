---
name: fitfam-datamodel
description: Use when working on the fitfamconnect data model — adding, modifying, or maintaining entities (Gym, Member, Membership, Plan, Charge, Billing, Class, Schedule, Signup, Location, Product, etc.), their Mongoose schemas in src/server/db/, the matching Express routers in src/server/<entity>/, or the client TypeScript services in src/service/. Triggers on: "add a new entity / collection", "add a field to <entity>", "create a Mongoose schema", "wire up a new REST endpoint for <entity>", questions about entity relationships or DATAMODEL.md, owner/coach/member role enforcement, money-in-cents conventions, billing or membership logic, gym/location/plan/charge semantics. Use it even when the user says "model" or "schema" loosely — fitfamconnect has strict three-layer conventions (db schema → server router → client service) and specific rules (interface pattern, optional-by-default, owner-only mutation, indexes, pre-save hooks, soft delete via isActive) that are easy to violate without this skill.
---

# fitfam-datamodel

This skill captures how the fitfamconnect data model is structured and how to extend it. It exists because the project has strict conventions that aren't obvious from any single file: the entities live across three layers (Mongoose schema → Express router → client service), are gated by owner-role auth, store money in cents, soft-delete via `isActive`, and have a few non-obvious patterns (the `IUser` exception, midnight-UTC date setters, etc.) that you'll only learn by reading several files at once. The point of this skill is to give you that context up-front.

The codebase is the source of truth — when in doubt, **read an existing entity end-to-end** (Plan is the cleanest example) and mirror it. This skill describes the patterns and pitfalls; the actual templates are the existing files.

## When this skill applies

It applies whenever the user wants to change the shape of data the app stores — adding a new entity, adding fields to an existing one, changing relationships, adjusting validation, adding indexes, or asking conceptual questions about how Members/Memberships/Plans/Charges fit together. It also applies when the user is editing `DATAMODEL.md` itself.

If the user is just querying existing data (writing aggregations, debugging a query, reading docs), this skill is overkill — point them at MongoDB tools instead.

## The three layers

Every persisted entity in fitfamconnect lives in three places, in this order:

1. **`src/server/db/<entity>.ts`** — Mongoose schema + TypeScript interface. This is the canonical shape.
2. **`src/server/<entity>/<entity>Service.ts`** — Express router with REST endpoints, gated by `authenticateUser` + `authorizeRoles(...)`. Registered in `src/server/index.ts`.
3. **`src/service/<Entity>Service.ts`** — Client-side TypeScript wrapper that calls the REST endpoints via `submit()` from `NetworkUtil.ts`. Imports the same `IEntity` interface from the server schema (yes, the client imports server types — that's intentional in this repo).

When adding a new entity, you'll touch all three. When adding a field, you'll touch the schema, possibly the router (if it's filtered/validated), and the client service (if it's part of a typed payload).

**Worked example**: read [src/server/db/plan.ts](../../../src/server/db/plan.ts), [src/server/plan/planService.ts](../../../src/server/plan/planService.ts), and [src/service/PlanService.ts](../../../src/service/PlanService.ts) together. Plan is the cleanest, most-conventional entity; mirror it for new work.

## Schema conventions (`src/server/db/`)

These conventions matter — most of them encode either a security boundary or a foot-gun the team has already stepped on.

**Interface pattern** — use a plain interface, not the `Document &` pattern:

```ts
export interface IPlan {
    _id?: string;
    name: string;
    // ...
    createdAt: Date;
    updatedAt: Date;
}
```

The `export type IUser = Document & {...}` form is reserved for `User` only, because `User` is attached to `Request` via the auth middleware and needs Mongoose's `Document` methods. Any other entity using that pattern leaks Mongoose types into places they shouldn't be.

**ID references are `string`, not `ObjectId`** — every `<entity>Id` field uses `{ type: String, required: true }`. The server hands these around as strings; using `Schema.Types.ObjectId` creates serialization friction with the client.

**Optional-by-default** — fields are optional unless DATAMODEL.md says otherwise or there's a clear invariant. Use `?` in the interface and omit `required: true` in the schema. Address fields are *always* optional (per DATAMODEL.md).

**Money in cents** — prices, charge amounts, and any currency value are integers in cents (`{ type: Number, required: true, min: 0 }`). Avoids floating-point drift in billing math. If you need a formatted display, use a virtual:

```ts
planSchema.virtual('formattedPrice').get(function () {
    return (this.price / 100).toFixed(2);
});
```

**Timestamps** — always pass `{ timestamps: true }` as the second arg to `new mongoose.Schema(...)`. This adds `createdAt`/`updatedAt` automatically. Reflect both in the interface.

**Indexes** — every commonly-filtered field gets a single-field index, plus compound indexes for the common query patterns. Look at how `membership.ts` indexes both single fields and pairs like `{ memberId: 1, endDate: 1 }` for "active memberships for a member" — that pattern (active = `endDate: null`) is worth replicating when an entity has the same shape.

**Pre-save / pre-validate hooks** — used for normalization and cross-field validation, not business logic. Examples worth knowing:
- `member.ts` strips non-digits from `phone` and `pinCode`, and stamps `approvedAt` when `status` flips to `approved`.
- `gym.ts` auto-generates a 6-char alphanumeric `gymCode` if missing.
- `plan.ts` validates `endDateTime > startDateTime`.
- `charge.ts` validates that a charge has *either* `membershipId` *or* `productId`, not both.
- `membership.ts` snaps `startDate`/`endDate` to midnight UTC via the `set:` getter — date-only fields shouldn't carry a time component.

**Soft delete** — entities have an `isActive: boolean` field that defaults to `true`. "Delete" endpoints flip this to `false` and return — they don't actually remove the document. Queries filter on `isActive: true`.

**Model export** — always `const X = mongoose.model<IX>('X', xSchema); export { X };`. Both the model and the interface are exported.

## Server router conventions (`src/server/<entity>/<entity>Service.ts`)

**Owner-scoping** — for entities that belong to a gym (Plan, Class, Charge, Membership, Schedule, Coach, Member, Product, Location), every route resolves the user's gym first via `Gym.findOne({ ownerId: user._id, isActive: true })` and uses that gym's `_id` to scope the query. This is the security model: an owner can only see/touch entities for their own gym. Never trust a `gymId` coming from the client body — strip it and replace with the resolved gym's `_id`.

**Role guards** — every route uses `authenticateUser` followed by `authorizeRoles(...roles)`. The roles are owner/coach/member/root. Per DATAMODEL.md: plans, classes, charges, schedules, coaches, memberships are owner-only for create/update.

```ts
router.post('/plans', authenticateUser, authorizeRoles('owner', 'root'), async (req, res) => { ... });
```

`authorizeRoles` lives in [src/server/auth/auth.ts](../../../src/server/auth/auth.ts) — it lazily creates a local `User` record on first sign-in from Clerk. Do not import Clerk anywhere except `auth.ts`.

**Response shape** — every successful response returns a `ServerResponse` (from `src/shared/ServerResponse.ts`):

```ts
const response: ServerResponse = {
    responseCode: 200,
    body: { message: 'Plans retrieved successfully', data: plans }
};
res.status(200).json(response);
```

Errors return `res.status(NNN).json({ message: '...' })` — they don't wrap in `ServerResponse`.

**Logging** — log API entry, payload, and outcome. The pattern is `console.log('<service>.<method>: <event>')`. This is intentional — server logs in production are how the team debugs. Don't strip them.

**Field stripping on write** — on create/update, destructure off fields that should never come from the client (`gymId`, `isActive`, `createdAt`, `updatedAt`, `_id`) and reassign them server-side. See `createPlanForOwner` in `planService.ts`.

**Helper functions** — the route handler is a thin shell; the actual work goes in named helpers (`findPlansByOwner`, `createPlanForOwner`, `updatePlanByIdAndOwner`, `deletePlanByIdAndOwner`). This keeps routes readable and helpers reusable.

**Router registration** — every new router needs to be imported and mounted in [src/server/index.ts](../../../src/server/index.ts). Easy to forget — without it, the routes 404.

## Client service conventions (`src/service/<Entity>Service.ts`)

**One file per entity, exported as a const object** with method properties:

```ts
export const PlanService = {
    async getMyPlans(): Promise<IPlan[] | undefined> { ... },
    async createPlan(planData: Omit<IPlan, 'gymId' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<ServerResponse | undefined> { ... },
    // ...
};
```

**Always go through `submit()`** from `NetworkUtil.ts` — it attaches the Clerk bearer token via `SessionUtils`. Never use `fetch` directly.

**Type the payload tightly** — create methods use `Omit<IPlan, ...>` to strip server-managed fields from the input shape, mirroring what the server strips. Update methods use `Partial<IPlan>`.

**Logging mirrors the server** — every method logs entry, response status, and outcome with the entity name in scope. Helps diagnose client/server mismatches.

**Return types** — read methods return `IEntity[] | undefined` or `IEntity | undefined`; write methods return `ServerResponse | undefined`. `undefined` means "request failed in a known way" (e.g., 404, network error caught); the caller decides how to surface that.

## DATAMODEL.md is the source of truth for semantics

When the user asks *what an entity means* or how relationships work — read [DATAMODEL.md](../../../DATAMODEL.md). It documents:

- **User vs Member**: a User is one Clerk identity; a Member is a User's membership in a specific Gym. One User can have many Member records (one per gym).
- **Membership ≠ Member**: Membership is the join row between a Member and a Plan, with start/end and billing dates. A member can have multiple active memberships (e.g., recurring + one-time workshop).
- **Plans are always recurring** — no one-time plans. One-time things are Products.
- **Charge** is the audit row for billing. It has *either* a `membershipId` (plan-based) *or* a `productId` (product-based), never both. The pre-validate hook enforces this.
- **Billing** is the run record (who ran billing, when, for what period).
- **Schedule** belongs to a Location (a room within a Gym), not directly to the Gym. Conflict detection is per-location: same time, different location = no conflict.
- **Signup** is a member's signup for a specific scheduled instance, not an ongoing subscription.

When updating DATAMODEL.md itself, keep its style: bulleted entity sections, security notes called out explicitly, "TODO" / "Ignore this section" markers preserved.

## Workflow for common tasks

### Adding a new entity end-to-end

1. **Read DATAMODEL.md** to understand or define the entity's semantics. If it's truly new, propose an addition to DATAMODEL.md as part of the work.
2. **Read [src/server/db/plan.ts](../../../src/server/db/plan.ts)** — your schema template.
3. **Write the schema** in `src/server/db/<entity>.ts`. Apply the conventions above (interface, optional-by-default, indexes, money-in-cents if applicable, soft delete, timestamps).
4. **Read [src/server/plan/planService.ts](../../../src/server/plan/planService.ts)** — your router template.
5. **Write the router** in `src/server/<entity>/<entity>Service.ts`. Owner-scoped, `authorizeRoles`, helper functions, `ServerResponse` shape, logging.
6. **Register the router** in `src/server/index.ts` (import + `app.use(<entity>Router)`).
7. **Read [src/service/PlanService.ts](../../../src/service/PlanService.ts)** — your client template.
8. **Write the client service** in `src/service/<Entity>Service.ts`. `submit()`-based, `Omit<>` for create payloads, `Partial<>` for updates, mirrored logging.
9. **Run `yarn type-check`** in `fitfamconnect/` and fix any errors.
10. If the new entity touches billing (Charge, Membership, Plan, Billing), **run `yarn test`** — the billing engines have integration tests in `src/server/billing/__tests__` using `mongodb-memory-server`. Those tests are the regression net.

### Adding a field to an existing entity

1. **Add to the interface** in `src/server/db/<entity>.ts` — usually optional unless there's a hard reason.
2. **Add to the schema definition** with appropriate type/validation.
3. **Add an index** if the field is queryable.
4. **Update DATAMODEL.md** if the field has user-facing meaning.
5. **Check the router** — is the field accepted on create/update? Is it stripped intentionally? Update the destructuring in the helper functions if needed.
6. **Check the client service** — `Omit<>` and `Partial<>` types pick this up automatically since they reference `IEntity`, but if the create endpoint expects a specific shape, update the input type.
7. **Type-check.**

### Modifying validation or relationships

- Cross-field validation goes in a `pre('validate', ...)` hook, not in the router. See `charge.ts` (mutually-exclusive `membershipId` / `productId`) and `schedule.ts` (recurring requires `recurringPattern`).
- Field normalization (trimming, lowercasing, digit-stripping) goes in a `pre('save', ...)` hook. See `member.ts`.
- Time-of-day stripping for date-only fields goes in a `set:` getter on the field itself. See `membership.ts`.

### Updating DATAMODEL.md

DATAMODEL.md describes intent, not implementation — it's how the team agrees on what an entity is *for*. When updating it:

- Keep entity sections in the existing bulleted style.
- Call out security rules in a **Security:** bullet at the top of the section.
- Don't remove the "TODO" or "Ignore this section" headers — those are intentional.
- Don't paste in TypeScript — DATAMODEL.md is conceptual; the schema files are authoritative for syntax.

## Things to be careful about

**Don't import Clerk outside `auth.ts`.** The auth middleware materializes a local `User` from Clerk, attaches it to `req.user`, and that's the only Clerk surface the rest of the server should know about.

**Don't trust `gymId` from the client.** Always re-resolve from the authenticated user.

**Don't hard-delete.** Set `isActive: false`. Other parts of the code (especially billing) assume historical records remain.

**Don't put business logic in pre-save hooks.** Hooks are for normalization and validation only. The billing engine and the schedule conflict checker live in their own modules for a reason.

**Don't break the billing tests when changing Charge/Membership/Plan/Billing.** The tests use a real Mongo instance via `mongodb-memory-server` — they're not mocked, and they're the real spec for billing behavior. Update them in the same change.

**Don't reach for `Schema.Types.ObjectId` for references.** Use `String`. The pattern is consistent across every existing entity.

## Reference files

For more depth on specific topics, see:

- [references/entity-cheatsheet.md](references/entity-cheatsheet.md) — one-line summary of every existing entity and its key fields/relationships, useful when you need to recall what's already there before adding something new.
- [references/checklists.md](references/checklists.md) — copy-paste checklists for "add a new entity" and "add a field" so you can self-verify before reporting done.
