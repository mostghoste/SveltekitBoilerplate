// src/routes/admin/categories/+page.server.js
import { fail } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
  const supabase = locals.supabase;

  // Fetch categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*');

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
  addCategory: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const formData = await request.formData();
    const categoryName = formData.get('category_name');
    // const categoryDescription = formData.get('category_description');

    if (!categoryName) {
      return fail(400, { error: 'Category name is required' });
    }

    const { error } = await supabase
      .from('categories')
      .insert({ category_name: categoryName });

    if (error) {
      console.error('Error adding category:', error);
      return fail(500, { error: 'Failed to add category' });
    }

    return {
      success: true,
    };
  },
  deleteCategory: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const formData = await request.formData();
    const categoryId = formData.get('category_id');

    if (!categoryId) {
      return fail(400, { error: 'Category ID is required' });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting category:', error);
      return fail(500, { error: 'Failed to delete category' });
    }

    return {
      success: true,
    };
  },
};
