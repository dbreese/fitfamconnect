---
name: fitfam-page
description: >-
  Use when building, modifying, or routing any web page or UI component in the fitfamconnect Vue 3 SPA — new pages
  under src/views/, reusable components in src/components/, route entries in src/router/index.js, sidebar navigation
  in src/layout/AppMenu.vue, layouts, i18n strings, or CSS/Tailwind/PrimeVue styling. Triggers on: "add a page",
  "create a view", "new screen for owners/members/coaches/root users", "add a route", "wire up navigation",
  "build a component", "make this reusable", "where does this Vue file go", questions about the difference between
  src/components, src/layout, src/views, and src/router, public vs authenticated pages, role-gated routes, dark mode,
  localizing strings, or PrimeVue/Tailwind styling conventions. Use it even when the user just says "page", "screen",
  or "frontend" loosely — fitfamconnect has specific conventions (a single route table with role meta, AppMenu nav
  registration, auto-imported src/components, i18n-only strings, a Tailwind + PrimeVue + styles.scss CSS layering)
  that are easy to get wrong without it. Pairs with the fitfam-datamodel skill, which covers the server/db/service
  layers a page talks to.
---

# Building pages and components in fitfamconnect (Vue 3 SPA)

`fitfamconnect/` is a Vue 3 + TypeScript SPA built on Vite, PrimeVue (auto-imported, themed via `definePreset`),
Tailwind (`tailwindcss-primeui`), `vue-router`, `vue-i18n`, and Clerk for auth. The directory layout is a lightly
customized PrimeVue/Sakai template, so it's easy to put a file in the wrong place. This skill explains where each
kind of file lives, how routing and roles work, the page conventions to copy, how strings get localized, and how CSS
is layered.

When a page also needs a new backend endpoint, Mongoose schema, or client service class, use the **fitfam-datamodel**
skill for that part — this skill assumes the data layer exists and focuses on the view/route/i18n/CSS side.

> Note: `src/views/tools/` was a leftover from a different app we copied in and has been **deleted**. Don't recreate
> it; new pages go in `src/views/pages/`.

## Directory map — what goes where

```
src/
  main.js                  app bootstrap: Clerk plugin, i18n, PrimeVue theme preset, global stylesheet imports. Rarely touched.
  App.vue                  root component — just <router-view/>. Don't touch.
  router/index.js           THE single route table. Every page must be registered here. See "Routing" below.
  layout/                   the chrome around pages (topbar, sidebar, nav menu, footer). You usually only edit AppMenu.vue.
    AppLayout.vue           shell for authenticated pages: <app-topbar> + <app-sidebar> + <router-view/> + <app-footer> + <Toast/>
    PublicLayout.vue        shell for public/marketing pages: landing TopbarWidget + <router-view/> + FooterWidget
    AppMenu.vue             the sidebar navigation menu — ADD NEW AUTHENTICATED PAGES HERE (see "Routing")
    AppMenuItem.vue, AppTopbar.vue, AppSidebar.vue, AppFooter.vue, AppConfigurator.vue   app-shell pieces; rarely touched
    composables/layout.js   dark-mode toggle + menu open/close state (useLayout())
  views/                    the PAGE components — one component per route
    Dashboard.vue           the /app landing page
    pages/*.vue             almost everything: GymManagement, ClassManagement, PlanManagement, LocationManagement,
                            MembershipManagement, CoachManagement, ProductManagement, ScheduleManagement,
                            BillingManagement, MyGyms, MyCharges, Signups (authenticated); Home, PrivacyPolicy,
                            TermsOfService, ComingSoon, Landing, NotFound (public); UsersManagement, GymsManagement,
                            RestExplorer, TestDataController (root). NEW PAGES GO HERE.
    pages/auth/*.vue        Login, Access (access-denied screen), Error — auth-flow pages, rendered without a layout
    user/Profile.vue        the user profile page
  components/               REUSABLE, AUTO-IMPORTED components used inside pages (see "Components" below)
    AddressEditor.vue, Editor.vue (tiptap rich text), AIInputEditor.vue (textarea + file upload), BillingPreview.vue,
    NameValuePair.vue, ProfileButton.vue, LoginButton.vue, FloatingConfigurator.vue
    landing/*.vue           marketing-page section widgets: HeroWidget, FeaturesWidget, AboutWidget, HighlightsWidget,
                            PricingWidget, FooterWidget, TopbarWidget
  service/*Service.ts       client API wrappers (NetworkUtil.submit under the hood). Pages call these — never fetch directly.
                            user + SessionUtils live here too. See the fitfam-datamodel skill.
  i18n/                     i18n.ts (vue-i18n setup) + en/messages.ts, es/messages.ts, fr/messages.ts
  assets/                   styles.scss (global custom CSS), tailwind.css (the @tailwind directives),
                            layout/*.scss (vendored Sakai layout theme — DON'T edit unless changing the app shell),
                            demo/* (template leftovers)
  server/                   the Express API + Mongoose schemas. The SPA imports server db/* interface types directly
                            (e.g. `import type { IProduct } from '@/server/db/product'`) — that's intentional and fine.
```

**Decision guide:**

- New full page / screen → a `.vue` file in `src/views/pages/` (or `src/views/pages/auth/` for sign-in/error flows),
  registered in `src/router/index.js`.
- New marketing/landing section → a widget in `src/components/landing/`, composed into `src/views/pages/Home.vue`
  (or `Landing.vue`).
- A chunk of UI used by 2+ pages, or a self-contained editor/picker/preview widget → a component in `src/components/`.
  It will be **globally auto-registered** (see "Components"), so pages can use it without an import.
- Changing the topbar, sidebar, footer, or app-shell behavior → `src/layout/`. Adding a nav link → `src/layout/AppMenu.vue`.
- Talking to the backend → a method on a `src/service/*Service.ts` class. New endpoint needed? → fitfam-datamodel skill.
- A user-visible string → `src/i18n/en/messages.ts`.
- A reusable CSS class → `src/assets/styles.scss`. One-off layout → Tailwind utilities in the template (or `<style scoped>`).

## Auth, roles, and routing

### The two route trees (`src/router/index.js`)

There is exactly one route table. It has two layout-wrapped trees plus a few standalone auth pages:

1. **Public** — children of the `/` route, which renders `PublicLayout.vue`. `meta: { requiresAuth: false }`.
   Pages: Home (`/`), ComingSoon (`/comingsoon`), PrivacyPolicy (`/privacy`), TermsOfService (`/terms`).
   Plus standalone (no layout): `/auth/login`, `/auth/access`, `/auth/error`, `/pages/notfound`.
2. **Authenticated** — children of the `/app` route, which renders `AppLayout.vue`.
   `meta: { requiresAuth: true, roles: ['member', 'owner', 'root'] }` on the parent.
   Pages: Dashboard (`/app`), Profile (`/user/profile`), Feedback, MyGyms, Signups, MyCharges (any signed-in user);
   GymManagement (`/gym`), ClassManagement (`/classes`), PlanManagement, LocationManagement, MembershipManagement,
   ScheduleManagement, BillingManagement, CoachManagement, ProductManagement (`meta: { roles: ['owner'] }`);
   RestExplorer, UsersManagement, GymsManagement, TestDataController (`meta: { roles: ['root'] }`).

Always lazy-load: `component: () => import('@/views/pages/Foo.vue')`.

### Adding a route

```js
// inside the children array of the '/app' route, in src/router/index.js:
{
    path: '/foo',
    name: 'foo',
    component: () => import('@/views/pages/FooManagement.vue'),
    meta: { roles: ['owner'] }   // omit meta.roles entirely if any signed-in user may see it
},
```

- Don't set `requiresAuth` per child — it's inherited from the `/app` parent.
- A child's `meta.roles` *replaces* the inherited one for that route. Use `['owner']`, `['root']`, `['owner','root']`,
  or omit it to inherit `['member','owner','root']`.
- The global `router.beforeEach` guard already enforces all of this: not signed in → redirect to `home`; signed in but
  wrong role → redirect to the `app` dashboard. You never write per-page navigation guards.

### Roles vs. member types — important distinction

- `user.roles` is an array of `'member' | 'owner' | 'root'` — these are the **route-level roles**. Get the reactive
  user with `import { user } from '@/service/SessionUtils'`. Server endpoints gate the same way via
  `authorizeRoles(...)`.
- `coach` is **not** a route role. It's a *member type* (`owner | coach | member`) stored on the `Member` record. A
  "gym coach" is a signed-in user whose `Member.memberType === 'coach'`. So:
  - To gate a whole page to owners/root, use route `meta.roles`.
  - To show/hide coach-specific UI *within* a page, check the member record (whatever the page already loads / the
    relevant service exposes) — not `meta.roles`, and not `user.roles`.
- The dashboard at `/app` and `'Access Denied'` page (`src/views/pages/auth/Access.vue`) are the redirect targets, so
  you don't need to build "you can't see this" states yourself for route-gated pages.

### Adding the nav link (`src/layout/AppMenu.vue`)

If the page should be reachable from the sidebar, add an item to the right section of the `model` computed in
`AppMenu.vue`:

- `isOwner.value` block → the **Management** section (or the **Reports** section for report pages)
- `isMember.value` block → the **Member** section
- `isRoot.value` block → the **Root** section
- the always-present **System** section → things every user gets (Profile, Feedback, Help, Logout)

```js
{ label: translate('foo.menuTitle'), icon: 'pi pi-building', to: '/foo' },
```

Labels come from i18n via `translate(...)` (note: `AppMenu.vue` is `<script setup>` but uses the standalone
`translate` from `@/i18n/i18n`, plus PrimeIcons (`pi pi-*`) for icons. Match the existing entries.

## Page conventions — copy an existing page

The canonical CRUD page is **`src/views/pages/ProductManagement.vue`** (also `ClassManagement.vue`,
`PlanManagement.vue`). Open one and mirror its shape rather than inventing a new structure. The pattern:

- `<script setup lang="ts">`.
- Import the client service: `import { ProductService } from '@/service/ProductService'`. Import the entity type from
  the server schema: `import type { IProduct } from '@/server/db/product'`.
- Import the PrimeVue components you use **explicitly** from `primevue/*` (`Card`, `Dialog`, `Button`, `DataTable`,
  `Column`, `InputText`, `InputNumber`, `Textarea`, `Select`, `Toast`, `ConfirmDialog`, `ProgressSpinner`, `Tag`, …).
  PrimeVue components *can* be auto-imported (the Vite `PrimeVueResolver` is wired up), but the existing pages import
  them explicitly — follow that for consistency.
- `const { t } = useI18n();` · `const toast = useToast();` · `const confirm = useConfirm();` (the last two only if you
  show toasts / confirm dialogs).
- Reactive state: `const items = ref<IProduct[]>([])`, `const loading = ref(false)`, `showDialog`, `editMode`,
  `selectedX`, `formData` (a plain ref object holding the form fields).
- `async function loadItems()` calls the service inside a `try/catch/finally`, sets `loading`, and on error does
  `toast.add({ severity: 'error', summary: t('feedback.errorTitle'), detail: t('foo.error.loadFailed'), life: 3000 })`.
  `onMounted(loadItems)`.
- Money is stored in **cents** on the server (see fitfam-datamodel). Pages display/edit dollars and convert at the
  boundary: `price / 100` to show, `Math.round(price * 100)` to send.
- `console.log(...)` lines around load/save are the house style — they're in every existing page; keep adding them.
- Template: wrap content in `<Card class="card-style">` (a dashboard-style page can use `<Fluid>` instead, like
  `Dashboard.vue`); list with `<DataTable>` + `<Column>`; create/edit in a `<Dialog v-model:visible="showDialog">`;
  put `<Toast />` and `<ConfirmDialog />` at the end of the template. Action buttons get `class="compact-button"`.
- Use `<router-link>` / `<Button as="router-link" to="...">` for in-app navigation, never raw `<a href>`.

For a **public/marketing** page, copy `src/views/pages/Home.vue`: a `bg-surface-0 dark:bg-surface-900` wrapper around
a few `components/landing/*` widgets. New sections become new widgets in `src/components/landing/`.

## Components (`src/components/`)

- Components placed directly in `src/components/` are **auto-registered globally** by `unplugin-vue-components` — a
  page can write `<AddressEditor>` or `<NameValuePair>` in its template **without importing it**. (You'll see existing
  pages and `AppTopbar.vue` use `<ProfileButton>`, `<AboutWidget>`, etc. unimported — that's why.) You *may* still
  import them explicitly; both work. PrimeVue components are auto-importable the same way via the resolver.
- Put a component here when markup is shared by 2+ pages, or when it's a self-contained editor/picker/preview that a
  page embeds (`Editor.vue` rich text, `AIInputEditor.vue` textarea-with-upload, `AddressEditor.vue`,
  `BillingPreview.vue`). Don't leave such things inline in a page.
- `src/components/landing/` is specifically for marketing-page sections — keep app/feature components out of there.
- `props`/`emits` via `defineProps`/`defineEmits` with TS types; `v-model:foo` two-way binding via
  `update:foo` emits (see `AIInputEditor.vue`, `AddressEditor.vue`).

## i18n — every user-visible string

- `src/i18n/i18n.ts` sets up `vue-i18n` with locales `en`, `es`, `fr`; it auto-detects the browser locale and falls
  back to `en`. It exports the `i18n` instance and a standalone `translate(key)` for use outside components.
- **All end-user-visible text lives in `src/i18n/en/messages.ts`**, nested under one top-level key per feature:
  `products: { menuTitle: 'Products', title: '...', subTitle: '...', error: { loadFailed: '...' }, ... }`. Reuse
  existing shared keys before adding new ones — e.g. `buttons.*` (`ok`, `getStarted`, `logout`, `fileUpload`),
  `feedback.errorTitle` / `feedback.successTitle`, `editor.*`, `membershipStatus.*`, `menu.*`.
- Read strings with `useI18n()`'s `t('products.title')` in `<script setup>`, `$t('products.title')` in templates, or
  `translate('products.title')` in non-component modules (routers, services).
- **Only add the English entries.** The `es/messages.ts` and `fr/messages.ts` files exist but you don't need to update
  them — the user does translations manually later, and vue-i18n falls back to `en` in the meantime.
- Never hardcode a literal string in a template, a `toast.add({...})` call, a label, a placeholder, or a confirm
  message. If you're typing English prose into a `.vue` file, it belongs in `messages.ts`.

## CSS — three layers, in this order of preference

1. **Tailwind utility classes** — the default for layout, spacing, sizing, flex/grid, and colors. Use the
   `tailwindcss-primeui` color tokens so things track the PrimeVue theme: `bg-surface-0`, `bg-surface-50`,
   `dark:bg-surface-900`, `text-surface-900 dark:text-surface-0`, `text-muted-color`, `border-surface`, `primary-*`,
   etc. Custom screens are `sm 576 / md 768 / lg 992 / xl 1200 / 2xl 1920` and base font size is bumped to 16px
   (`tailwind.config.js`).
2. **PrimeVue components + theme** — `main.js` builds a theme via `definePreset(Lara, …)` with a sky-blue `primary`
   palette and `darkModeSelector: '.app-dark'`. PrimeVue components are styled automatically; tune them with their
   props (`severity="warn"`, `outlined`, `size`, `:pt`) rather than overriding their internals. Don't fight the theme.
3. **Global SCSS in `src/assets/styles.scss`** — for reusable custom classes Tailwind can't express cleanly. Notable
   existing ones: `compact-button` (the project's standard button sizing — **put it on every Button**), `card-style`
   (full-width card), `.progresscontainer` / `.progressoverlay`, the `.ProseMirror` / editor button classes, the
   `cl-*` Clerk overrides. Add new shared classes here, not scattered in components.

Other rules:

- **Dark mode**: the toggle (`useLayout().toggleDarkMode`) adds/removes `app-dark` on `<html>`. Always pair color
  utilities with a `dark:` variant (`bg-surface-0 dark:bg-surface-900`). `tailwind.config.js` uses
  `darkMode: ['selector', '[class*="app-dark"]']`.
- **`cc-font`** is the brand font class (used on the app name and brand headings). Reuse it for brand-styled headings;
  don't introduce new font classes.
- **Don't edit `src/assets/layout/*.scss`** (`_topbar.scss`, `_menu.scss`, `variables/*`, etc.) — that's the vendored
  Sakai layout theme that styles the app shell. Only touch it if you're deliberately re-skinning the topbar/sidebar.
- Component-local one-offs can go in a `<style scoped>` block, but try Tailwind utilities first.

## Checklist for a new page

- [ ] `.vue` file created in `src/views/pages/` (or `pages/auth/`), structured like `ProductManagement.vue` /
      `Home.vue`.
- [ ] Route added to `src/router/index.js` under the right layout (`/` public vs `/app` authenticated), lazy-imported,
      with `meta.roles` if it should be restricted (omit to allow any signed-in user).
- [ ] If navigable, a nav entry added to the correct role section of `src/layout/AppMenu.vue` with an i18n label and a
      `pi pi-*` icon.
- [ ] Backend access goes through a `src/service/*Service.ts` method, never raw `fetch` (new endpoint? → fitfam-datamodel).
- [ ] Repeated markup extracted into `src/components/`; embedded editors/pickers reused from there.
- [ ] Every visible string in `src/i18n/en/messages.ts` (English only), accessed via `t()` / `$t()` / `translate()` —
      reusing existing keys where possible.
- [ ] Tailwind utilities + PrimeVue theme tokens for styling; `compact-button` on buttons, `card-style` on cards;
      `dark:` variants on colors; new reusable CSS in `src/assets/styles.scss`.
- [ ] `cd fitfamconnect && yarn type-check && yarn build` pass; `yarn lint` / `yarn format` clean.
