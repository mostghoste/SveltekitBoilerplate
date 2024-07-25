import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_KEY } from '$env/static/private'


export const actions = {
  invite: async ({ request }) => {
    console.log("Attempting to invite")
    const data = await request.formData();
    const email = data.get('email');
    const first_name = data.get('first_name');
    const last_name = data.get('last_name');
    const company = data.get('company');
    const phone = data.get('phone');

    if (!email) {
        console.log("Error: No email provided")
      return fail(400, { error: 'Email is required' });
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

    const { data: user, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      first_name,
      last_name,
      company,
      phone,
    });

    if (error) {
        console.log("Error: " + error.message);
        console.log(JSON.stringify(error))
      return fail(500, { error: error.message });
    } else {
        console.log("User: " + user)
    }

    return { success: true };
  }
};

export const load = async ({ locals }) => {
    const supabase = locals.supabase;
  
    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, company, customer_group, role');
  
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return { users: [] };
    }
  
    // Map profiles to the expected format
    const usersWithProfiles = profiles.map(profile => ({
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      company: profile.company,
      customer_group: profile.customer_group,
      role: profile.role,
      status: profile.status
    }));
  
    return {
      users: usersWithProfiles,
    };
  };
  