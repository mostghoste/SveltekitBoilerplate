# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Check code with Prettier and ESLint
- `npm run format` - Format code with Prettier

## Architecture Overview

This is a SvelteKit boilerplate with the following key integrations:

### Authentication & Database

- **Supabase Integration**: Full-stack authentication using Supabase SSR client
- **Authentication Flow**: Server-side authentication with role-based access control
- **Role Management**: Uses `get_user_role` RPC function to fetch user roles from Supabase
- **Auth Guards**: Implemented in `src/hooks.server.ts` with automatic redirections:
  - Non-logged-in users → redirected to `/`
  - Non-admin users → blocked from `/admin` routes
  - Logged-in users → redirected from `/` to `/products`

### Styling & UI

- **TailwindCSS + DaisyUI**: Component styling with `corporate` theme
- **Layout Structure**: Main layout in `src/routes/+layout.svelte`

### Internationalization

- **Paraglide-SvelteKit**: Multi-language support (en, ru, lt, uk)
- **Implementation**: Messages in `src/lib/paraglide/messages/` with runtime in `src/lib/paraglide/runtime.js`

### Email & Analytics

- **Resend API**: Email functionality via `src/lib/sendOrderConfirmation.js`
- **Google Analytics**: GA4 integration with Vercel Analytics

### Route Structure

- `/` - Login page (public)
- `/auth/*` - Authentication routes (password reset, confirmation)
- `/products` - Main products page (authenticated users)
- `/admin/*` - Admin panel with subpages:
  - `/admin/products` - Product management with pagination
  - `/admin/categories` - Category management
  - `/admin/users` - User management
  - `/admin/customer_groups` - Customer group management
  - `/admin/excel_upload` - Bulk upload functionality

### Environment Setup

Configure `.env` file with:

- `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` - Supabase connection
- `SUPABASE_SERVICE_KEY` - Server-side operations
- `RESEND_API_KEY` and email sender configuration
- `PUBLIC_GA_MEASUREMENT_ID` - Google Analytics

### Key Files

- `src/hooks.server.ts` - Authentication and route protection
- `src/lib/supabaseClient.js` - Client-side Supabase instance
- `src/routes/+layout.server.ts` - Server-side session/role loading
- `src/lib/stores/cart.js` - Shopping cart state management
