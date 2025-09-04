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
			let code = '';
			if (error.message === 'missing email or phone') {
				code = 'EMAIL_REQUIRED';
			} else if (error.message === 'Invalid login credentials') {
				code = 'INVALID_CREDENTIALS';
			} else {
				code = 'UNKNOWN_ERROR';
			}
			// Redirect back to root with error code as query parameter
			throw redirect(303, '/?error=' + encodeURIComponent(code));
		}

		// On success, redirect to /products
		throw redirect(303, '/products');
	}
};
