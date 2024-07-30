import { fail } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async () => {

};

/** @type {import('./$types').Actions} */
export const actions = {
  createProduct: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const formData = await request.formData();
    const partName = formData.get('part_name');
    const partCode = formData.get('part_code');
    const groupName = formData.get('group_name') || null; // Optional
    const image = formData.get('image') || null; // Optional
    const price = parseFloat(formData.get('price')) || 0.00; // Optional, default to 0.00

    if (!partName || !partCode) {
      return fail(400, { error: 'Part name and part code are required' });
    }

    const { error } = await supabase
      .from('products')
      .insert({ part_name: partName, part_code: partCode, group_name: groupName, image, price });

    if (error) {
      console.error('Error creating product:', error);
      return fail(500, { error: 'Failed to create product' });
    }

    return {
      success: true,
    };
  }
};
