import { fail } from '@sveltejs/kit';

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

/** @type {import('./$types').Actions} */
export const actions = {
    addCustomerGroup: async ({ request, locals }) => {
      const supabase = locals.supabase;
      const formData = await request.formData();
      const groupName = formData.get('group_name');
      const groupDescription = formData.get('group_description');
  
      if (!groupName) {
        return fail(400, { error: 'Group name is required' });
      }
  
      const { error } = await supabase
        .from('customer_groups')
        .insert({ group_name: groupName, group_description: groupDescription });
  
      if (error) {
        console.error('Error adding customer group:', error);
        return fail(500, { error: 'Failed to add customer group' });
      }
  
      return {
        success: true,
      };
    },
  };