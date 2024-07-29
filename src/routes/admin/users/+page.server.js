import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/public';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
  const supabase = locals.supabase;

  // Fetch profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, company, customer_groups (group_name), role, account_status, phone_number')
    .order('email', { ascending: true });

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return { users: [] };
  }

  // Fetch customer groups
  const { data: customerGroups, error: customerGroupsError } = await supabase
    .from('customer_groups')
    .select('*');

  if (customerGroupsError) {
    console.error('Error fetching customer groups:', customerGroupsError);
    return { customerGroups: [] };
  }

  // Map profiles to the expected format
  const usersWithProfiles = profiles.map(profile => ({
    id: profile.id,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    company: profile.company,
    customer_group: profile.customer_groups.group_name,
    role: profile.role,
    status: profile.account_status,
    phone_number: profile.phone_number
  }));

  return {
    users: usersWithProfiles,
    customerGroups,
  };
};

/** @type {import('./$types').Actions} */
export const actions = {
  invite: async ({ request, locals }) => {
    console.log("Attempting to invite");
    const data = await request.formData();
    const email = data.get('email');
    const first_name = data.get('first_name');
    const last_name = data.get('last_name');
    const company = data.get('company');
    const phone = data.get('phone');

    if (!email) {
      console.log("Error: No email provided");
      return fail(400, { error: 'Email is required' });
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Log the optional data
    console.log("Optional data being passed:", {
      first_name,
      last_name,
      company,
      phone
    });

    // Invite user with additional metadata
    const { data: user, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name,
        last_name,
        company,
        phone_number: phone
      }
    });

    if (error) {
      console.log("Error: " + error.message);
      console.log(JSON.stringify(error));
      return fail(500, { error: error.message });
    } else {
      console.log("User: " + JSON.stringify(user));
    }

    return { success: true };
  },

  updateCustomerGroups: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const formData = await request.formData();
    const customerGroupId = formData.get('customer_group_id');
    const userIds = formData.get('user_ids').split(',');

    if (!customerGroupId || userIds.length === 0) {
      return fail(400, { error: 'Customer group ID and user IDs are required' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ customer_group_id: customerGroupId })
      .in('id', userIds);

    if (error) {
      console.error('Error updating customer groups:', error);
      return fail(500, { error: 'Failed to update customer groups' });
    }

    return {
      success: true,
    };
  }
};
