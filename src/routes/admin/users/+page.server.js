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
  