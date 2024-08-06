import { languageTag } from '$lib/paraglide/runtime.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, depends }) {
  depends("paraglide:lang");
  const supabase = locals.supabase;
  const userId = locals.user?.id;
  const userLanguageCode = languageTag(); // Get the user's selected language code

  // Ensure the user is authenticated
  if (!userId) {
    return {
      customerGroupId: null,
      categories: [],
      totalProductCount: 0,
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
      totalProductCount: 0,
      error: 'Failed to fetch user profile or user not found'
    };
  }

  // Fetch total product count
  const { count: totalProductCount, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error fetching total product count:', countError);
  }

  let categories = [];
  let language_id;

  if (userLanguageCode === 'en') {
    // Fetch categories directly if the language is English
    const { data: categoryData, error: categoriesError } = await supabase
      .from('categories')
      .select('id, category_name');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
    }

    categories = categoryData || [];
  } else {
    // Fetch the language ID based on the user's language code
    const { data: language, error: languageError } = await supabase
      .from('languages')
      .select('id')
      .eq('code', userLanguageCode)
      .single();

    if (languageError || !language) {
      console.error('Error fetching language:', languageError);
      return {
        customerGroupId: userProfile.customer_group_id,
        categories: [],
        totalProductCount,
        error: 'Failed to fetch language data'
      };
    }

    const languageId = language.id;
    language_id = languageId;

    // Fetch categories with translations for the specified language ID
    const { data: categoryData, error: categoriesError } = await supabase
      .from('categories')
      .select(`
        id,
        category_translations!inner(language_id, category_name)
      `)
      .eq('category_translations.language_id', languageId);

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
    }

    categories = categoryData.map(category => ({
      id: category.id,
      category_name: category.category_translations[0]?.category_name || category.category_name,
    })) || [];
  }

  return {
    customerGroupId: userProfile.customer_group_id,
    categories,
    totalProductCount: totalProductCount || 0,
    languageId: language_id
  };
}
