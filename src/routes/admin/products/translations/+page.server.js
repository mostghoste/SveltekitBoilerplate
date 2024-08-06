import { fail } from '@sveltejs/kit';
import { languageTag } from '$lib/paraglide/runtime.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, depends }) => {
  depends("paraglide:lang");
  const supabase = locals.supabase;

  // Fetch products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, part_code, part_name')
    .order('id', { ascending: true });

  // Fetch languages
  const { data: languages, error: languagesError } = await supabase
    .from('languages')
    .select('id, name, code')
    .order('id', { ascending: true });

  // Fetch product translations
  const { data: productTranslations, error: translationsError } = await supabase
    .from('product_translations')
    .select('*');

  if (productsError || languagesError || translationsError) {
    console.error('Error fetching data:', productsError, languagesError, translationsError);
    return { products: [], languages: [], productTranslations: [] };
  }

  return {
    products,
    languages,
    productTranslations,
  };
};

/** @type {import('./$types').Actions} */
export const actions = {
  updateTranslation: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const formData = await request.formData();
    const productId = formData.get('product_id');
    const languageId = formData.get('language_id');
    const partName = formData.get('part_name');

    if (!productId || !languageId || !partName) {
      return fail(400, { error: 'All fields are required' });
    }

    const { error } = await supabase.from('product_translations').upsert(
      {
        product_id: productId,
        language_id: languageId,
        part_name: partName
      },
      { onConflict: ['product_id', 'language_id'] }
    );

    if (error) {
      console.error('Error updating translation:', error);
      return fail(500, { error: 'Failed to update translation' });
    }

    return { success: true };
  }
};
