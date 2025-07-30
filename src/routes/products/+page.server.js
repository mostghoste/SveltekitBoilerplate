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
  let languageId = null;

  if (userLanguageCode === 'en') {
    // English: just pull the base names
    const { data: rawCats, error: catErr } = await supabase
      .from('categories')
      .select('id, parent_id, category_name');
    if (catErr) console.error('Error fetching categories:', catErr);

    categories = (rawCats || []).map(c => ({
      id: c.id,
      parent_id: c.parent_id,
      name: c.category_name
    }));
  } else {
    // Non‑English: look up the language ID
    const { data: lang, error: langErr } = await supabase
      .from('languages')
      .select('id')
      .eq('code', userLanguageCode)
      .single();

    if (langErr || !lang) {
      console.error('Error fetching language:', langErr);
      // fallback to English names
      const { data: rawCats, error: catErr } = await supabase
        .from('categories')
        .select('id, parent_id, category_name');
      if (catErr) console.error('Error fetching categories:', catErr);

      categories = (rawCats || []).map(c => ({
        id: c.id,
        parent_id: c.parent_id,
        name: c.category_name
      }));
    } else {
      languageId = lang.id;
      // Left‐join translations for that language
      const { data: rawCats, error: catErr } = await supabase
        .from('categories')
        .select(`
          id,
          parent_id,
          category_name,
          category_translations!left(language_id, category_name)
        `)
        .eq('category_translations.language_id', languageId);
      if (catErr) console.error('Error fetching translated categories:', catErr);

      categories = (rawCats || []).map(c => ({
        id: c.id,
        parent_id: c.parent_id,
        // prefer translated name, otherwise base name
        name: c.category_translations?.[0]?.category_name || c.category_name
      }));
    }
  }

  return {
    customerGroupId: userProfile.customer_group_id,
    categories,
    totalProductCount: totalProductCount || 0,
    languageId
  };
}
