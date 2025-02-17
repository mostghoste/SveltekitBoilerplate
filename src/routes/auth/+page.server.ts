// +page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const actions: Actions = {
  signup: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error(error);
      // Instead of redirect, return a failure with an error message
      return fail(400, { message: 'Sign-up failed. ' + error.message });
    }
    // success: redirect to homepage
    throw redirect(303, '/');
  },

  login: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    console.log('Attempting log in');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error(error);
      if (error.message == "missing email or phone") {
        return fail(400, { message: 'Login failed. ' + m.auth_email_missing() });
      }
      if (error.message == "Invalid login credentials") {
        return fail(400, { message: 'Login failed. ' + m.invalid_login_credentials() });
      }
      return fail(400, { message: 'Login failed. ' + error.message });
    }

    // If successful, redirect to /products
    throw redirect(303, '/products');
  }
};
