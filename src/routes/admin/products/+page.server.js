import { fail } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, url }) => {
  const supabase = locals.supabase;
  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = 50; // Number of products per page
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Fetch the total count of products
  const { count: totalCount, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error fetching product count:', countError);
    return { products: [], prices: [], totalCount: 0, page, totalPages: 0 };
  }

  // Fetch products with pagination using range
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, group_name, part_name, part_code, image')
    .range(from, to);

  if (productsError) {
    console.error('Error fetching products:', productsError);
    return { products: [], prices: [], totalCount, page, totalPages: Math.ceil(totalCount / limit) };
  }

  // Fetch all prices including the related customer group and product details
  const { data: prices, error: pricesError } = await supabase
    .from('prices')
    .select('id, product_id, customer_group_id, price, customer_groups (group_name)');

  if (pricesError) {
    console.error('Error fetching prices:', pricesError);
    return { products, prices: [], totalCount, page, totalPages: Math.ceil(totalCount / limit) };
  }

  return {
    products,
    prices,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
  };
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
