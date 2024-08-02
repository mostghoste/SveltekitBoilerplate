/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
  const supabase = locals.supabase;
  const userId = locals.user?.id;

  // Ensure the user is authenticated
  if (!userId) {
    return {
      customerGroupId: null,
      categories: [],
      error: 'User not authenticated'
    };
  }

  // Fetch the user's profile to get the customer_group_id
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('customer_group_id')
    .eq('id', userId)
    .single();

  if (profileError || !userProfile) {
    return {
      customerGroupId: null,
      categories: [],
      error: 'Failed to fetch user profile or user not found'
    };
  }

  // Fetch categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, category_name');

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    return {
      customerGroupId: userProfile.customer_group_id,
      categories: [],
    };
  }

  return {
    customerGroupId: userProfile.customer_group_id,
    categories,
  };
}
