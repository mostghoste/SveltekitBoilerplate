import { fail } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
  const supabase = locals.supabase;

  // Fetch categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .order('id', { ascending: true }); // Sort categories by id

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    return { categories: [] };
  }

  return {
    categories,
  };
};

/** @type {import('./$types').Actions} */
export const actions = {
  createProduct: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const formData = await request.formData();
    const partName = formData.get('part_name');
    const partCode = formData.get('part_code');
    const categoryId = formData.get('category_id'); // Use category ID
    const image = formData.get('image') || null; // Optional
    const price = parseFloat(formData.get('price')) || 0.0; // Optional, default to 0.00

    if (!partName || !partCode || !categoryId) {
      return fail(400, { error: 'Part name, part code, and category are required' });
    }

    const { error } = await supabase
      .from('products')
      .insert({ part_name: partName, part_code: partCode, category_id: categoryId, image, price });

    if (error) {
      console.error('Error creating product:', error);
      return fail(500, { error: 'Failed to create product' });
    }

    return {
      success: true,
    };
  },
};
