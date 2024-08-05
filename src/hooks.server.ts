import { i18n } from '$lib/i18n'
import { createServerClient } from '@supabase/ssr'
import { type Handle, redirect } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

const supabase: Handle = async ({ event, resolve }) => {
  /**
   * Creates a Supabase client specific to this server request.
   *
   * The Supabase client gets the Auth token from the request cookies.
   */
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      /**
       * SvelteKit's cookies API requires `path` to be explicitly set in
       * the cookie options. Setting `path` to `/` replicates previous/
       * standard behavior.
       */
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' })
        })
      },
    },
  })

  /**
   * Unlike `supabase.auth.getSession()`, which returns the session _without_
   * validating the JWT, this function also calls `getUser()` to validate the
   * JWT before returning the session.
   */
  event.locals.safeGetSession = async () => {
    const { data: { session } } = await event.locals.supabase.auth.getSession();
    if (!session) {
      return { session: null, user: null, role: null };
    }

    const { data: { user }, error } = await event.locals.supabase.auth.getUser();
    if (error) {
      return { session: null, user: null, role: null };
    }

    // Fetch the user role using the secure function
    const { data: roleData, error: roleError } = await event.locals.supabase
      .rpc('get_user_role', { user_id: user.id });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return { session, user, role: null };
    }

    return { session, user, role: roleData };
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      /**
       * Supabase libraries use the `content-range` and `x-supabase-api-version`
       * headers, so we need to tell SvelteKit to pass it through.
       */
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
}

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user, role } = await event.locals.safeGetSession();
  event.locals.session = session;
  event.locals.user = user;
  event.locals.role = role;

  // Supabase example code
  // if (!event.locals.session && event.url.pathname.startsWith('/private')) {
  //   redirect(303, '/auth')
  // }

  // if (event.locals.session && event.url.pathname === '/auth') {
  //   redirect(303, '/private')
  // }

  // Non-logged-in users are always redirected to the login page (/)
  if (!event.locals.session) {
    if (event.url.pathname !== '/' && !event.url.pathname.startsWith("/auth")) {
      throw redirect(303, '/');
    }
  }

  // Non-admin users are not allowed to reach the admin url's
  if (event.locals.session && event.locals.role !== 'admin' && event.url.pathname.startsWith('/admin')) {
    throw redirect(303, '/products');
  }

  // Logged-in users are redirected from the login page (/) to /products
  if (event.locals.session && event.url.pathname === '/') {
    throw redirect(303, '/products');
  }

  return resolve(event)
}

export const handle: Handle = sequence(i18n.handle(), supabase, authGuard)