/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
    const supabase = locals.supabase;
  
    // Fetch customer groups
    const { data: customerGroups, error: customerGroupsError } = await supabase
      .from('customer_groups')
      .select('*');
  
    if (customerGroupsError) {
      console.error('Error fetching customer groups:', customerGroupsError);
      return { customerGroups: [] };
    }
  
    return {
      customerGroups,
    };
  };
  