# Workspace

## Overview

MUFAZ Kitchen POS — cloud kitchen point-of-sale system. Bilingual (English/Urdu) with RTL support. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui
- **Charts**: Recharts
- **Forms**: react-hook-form + zod
- **Routing**: wouter
- **State**: TanStack Query

## Artifacts

### API Server (`artifacts/api-server`)
Express/PostgreSQL backend. 14-table schema, 50+ endpoints, JWT auth (owner/staff roles).
- Dev: `pnpm --filter @workspace/api-server run dev`
- Auth: POST /api/auth/login → `{ token }`, stored in `localStorage["mufaz_token"]`
- Dev credentials: `owner@mufaz.com / owner123`, `staff@mufaz.com / staff123`

### Web Portal (`artifacts/web-portal`, previewPath: `/`)
Full-featured POS dashboard.
- **Pages**: Dashboard, Orders, New Order, Menu (categories + items), Customers, Inventory (ingredients + logs), Recipes, Scheduled Orders, Bills, Reports, Settings
- **Auth guard**: Layout component redirects to /login on 401
- **Role-based nav**: Bills/Reports/Settings hidden for `staff` role
- **i18n**: English/Urdu toggle, RTL support via `src/lib/i18n.tsx`
- **Theme**: Terracotta/rust primary (`--primary: 15 76% 48%`), warm cream background, dark mode support
- **Font**: Noto Nastaliq Urdu for Urdu script

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Design Decisions

- JWT stored in `localStorage["mufaz_token"]`; `setAuthTokenGetter` called at app startup in App.tsx
- All API hooks from `@workspace/api-client-react` (never relative paths)
- Query hooks: `useListXxx`, `useGetXxx` (use `query: { enabled: !!id, queryKey: [...] }` for conditional fetching)
- Mutation hooks: `useCreateXxx`, `useUpdateXxx`, `useDeleteXxx` — mutate({ data: ... }) or mutate({ id, data: ... })
- Bill generation: `useGenerateBill` (not useCreateBill)
- Payment methods: cash, jazzcash, easypaisa
- Order types: dine-in, takeaway, delivery
- Soft deletes on all tables

### Mobile App (`artifacts/mobile-app`, previewPath: `/mobile-app/`)
Expo React Native app for kitchen staff on mobile.
- **Tabs**: Dashboard, Orders, New Order (cart), Menu, Profile
- **Auth**: JWT stored in `AsyncStorage["mufaz_token"]`; `setAuthTokenGetter` + `setBaseUrl` called at module level in `context/AuthContext.tsx`
- **Screens**: Login screen with email/password, 5 tab screens
- **Features**: Dashboard KPIs, order status pipeline, cart-based order creation, menu availability toggle, user profile
- **Design tokens**: Synced from web portal — terracotta `#d44e1a` (light) / `#d95e28` (dark), cream `#faf9f7`
- **Hooks**: All from `@workspace/api-client-react`; params passed directly (not wrapped in `{ params: ... }`)
- **DashboardSummary fields**: `todayOrderCount`, `activeOrderCount`, `pendingOrderCount`, `todayRevenue`, `lowStockCount`, `totalCustomers`
- **CreateOrderItemInput** requires: `menuItemId`, `itemName`, `itemPrice`, `quantity`
- **Order** type fields: `id`, `customerId`, `customerName`, `status`, `totalAmount`, `paymentMethod`, `createdAt`

## Menu & Order Enhancements (Task #6)

### Menu Items (new fields)
- `unit` (text, default "qty"): unit of measure per item — displayed on item card and in cart
- `internalCost` (numeric, nullable): owner-only cost for margin tracking
- `defaultDiscountPct` (numeric, default 0): auto-applied per-item discount at checkout
- Margin badge shown to owners: color-coded (green ≥50%, yellow ≥25%, red <25%)

### Orders (new fields)
- `discountAmount` (numeric, default 0): order-level discount amount
- `discountType` (text, default "pkr"): "pkr" or "pct"
- `order_items.unit` (text, default "qty"): unit per item line
- `order_items.discountAmount` (numeric, default 0): per-item discount applied

### New Order Flow
- Category badges filter the menu grid
- Cart rows show unit label and per-item default discount (auto-applied)
- Checkout discount panel: PKR/% toggle + amount input with live preview
- After placing order, a receipt preview dialog pops up with Close + Print buttons

### Orders Page
- Status advance button replaced with a full status dropdown allowing any non-terminal transition
- Terminal orders (delivered/cancelled) show a static colored badge

### Bills Auto-Generation
- `POST /api/orders` now auto-creates a bill immediately and returns `{ ...order, items, bill }`
- `POST /api/bills` no longer requires order status to be "delivered"
- Inventory deduction happens when status transitions to "delivered"

## All Tasks Complete
