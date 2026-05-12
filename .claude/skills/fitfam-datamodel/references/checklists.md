# Checklists

Copy-paste checklists to self-verify before declaring work done. The point is to catch the easy-to-miss steps (router registration, client wrapper, type-check) that turn a "done" into a 404 or a TS error.

## Adding a new entity

Schema (`src/server/db/<entity>.ts`):
- [ ] `export interface IEntity { ... }` — plain interface, **not** `Document &`
- [ ] All `_id?` and `Id` reference fields typed as `string`
- [ ] Optional fields use `?` in interface and omit `required: true` in schema
- [ ] Money fields are integers in cents with `min: 0`
- [ ] `{ timestamps: true }` passed as second arg to `new mongoose.Schema(...)`
- [ ] `createdAt` and `updatedAt` in the interface
- [ ] `isActive: boolean` field for soft delete (if entity is mutable)
- [ ] Single-field index for every commonly filtered field
- [ ] Compound indexes for frequent query patterns
- [ ] Pre-save hooks for normalization (digits, lowercase, trim, midnight UTC)
- [ ] Pre-validate hooks for cross-field invariants
- [ ] `const Entity = mongoose.model<IEntity>('Entity', schema); export { Entity };`

Server router (`src/server/<entity>/<entity>Service.ts`):
- [ ] `import { authenticateUser, authorizeRoles } from '../auth/auth'`
- [ ] Every route has `authenticateUser, authorizeRoles(...)` middleware
- [ ] Owner-scoped reads: resolve `gym = Gym.findOne({ ownerId: user._id, isActive: true })` then filter by `gymId: gym._id`
- [ ] Create handler strips client-supplied `gymId`, `isActive`, `_id`, `createdAt`, `updatedAt`
- [ ] Update handler strips the same fields
- [ ] Delete handler does soft delete (`isActive: false`), not `findByIdAndDelete`
- [ ] Successful responses wrapped in `ServerResponse` (`{ responseCode, body: { message, data } }`)
- [ ] Error responses use `res.status(NNN).json({ message: '...' })`
- [ ] `console.log` at entry, payload, outcome of each handler
- [ ] Helper functions named `findXByOwner`, `createXForOwner`, `updateXByIdAndOwner`, `deleteXByIdAndOwner`

Router registration (`src/server/index.ts`):
- [ ] `import { router as <entity>Router } from './<entity>/<entity>Service';`
- [ ] `app.use(<entity>Router);`

Client service (`src/service/<Entity>Service.ts`):
- [ ] `import { submit } from './NetworkUtil';`
- [ ] `import type { IEntity } from '@/server/db/<entity>';`
- [ ] `import type { ServerResponse } from '@/shared/ServerResponse';`
- [ ] Exported as `export const EntityService = { ... }`
- [ ] `create*` uses `Omit<IEntity, 'gymId' | 'isActive' | 'createdAt' | 'updatedAt' | '_id'>`
- [ ] `update*` uses `Partial<IEntity>`
- [ ] All methods log entry, response status, outcome

Final:
- [ ] Run `yarn type-check` in `fitfamconnect/` — passes
- [ ] If billing-adjacent (Charge / Membership / Plan / Billing), run `yarn test` — billing tests pass
- [ ] DATAMODEL.md updated with new entity's purpose and key fields

## Adding a field to an existing entity

- [ ] Add to interface (usually `optional?`)
- [ ] Add to schema with appropriate `type`/validation
- [ ] Index if it'll be queried
- [ ] Update DATAMODEL.md if user-facing
- [ ] Router create/update destructuring — accepted, or intentionally stripped?
- [ ] Client service `Omit<>` / `Partial<>` will pick it up via `IEntity`, but check if any explicit input type needs updating
- [ ] `yarn type-check` passes
- [ ] If billing-adjacent, `yarn test` passes

## Adding cross-field validation

- [ ] Goes in `pre('validate', ...)`, not in the router or business code
- [ ] Calls `next(new Error('...'))` on failure with a clear message
- [ ] If the rule has nuance, add a one-line comment above the hook explaining *why*

## Adding field normalization

- [ ] Goes in `pre('save', ...)`
- [ ] Don't put business logic here — only string trimming, casing, digit-stripping, auto-stamping fields like `approvedAt` on status transition
- [ ] For date-only fields where time-of-day must not matter (e.g., billing `startDate`), use a `set:` getter on the field, mirroring `membership.ts`
