import { fail } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
  const supabase = locals.supabase;

  // Fetch categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .order('id', { ascending: true });

  // Fetch languages
  const { data: languages, error: languagesError } = await supabase
    .from('languages')
    .select('*')
    .order('id', { ascending: true });

  // Fetch category translations
  const { data: categoryTranslations, error: translationsError } = await supabase
    .from('category_translations')
    .select('*');

  if (categoriesError || languagesError || translationsError) {
    console.error('Error fetching data:', categoriesError, languagesError, translationsError);
    return { categories: [], languages: [], categoryTranslations: [] };
  }

  return {
    categories,
    languages,
    categoryTranslations,
  };
};

/** @type {import('./$types').Actions} */
export const actions = {
  addCategory: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const formData = await request.formData();
    const categoryName = formData.get('category_name');
    
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
