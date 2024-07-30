// import { fail } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
  const supabase = locals.supabase;

  // Fetch all products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, group_name, part_name, part_code, image');

  if (productsError) {
    console.error('Error fetching products:', productsError);
    return { products: [] };
  }

  // Fetch all prices including the related customer group and product details
  const { data: prices, error: pricesError } = await supabase
    .from('prices')
    .select('id, product_id, customer_group_id, price, customer_groups (group_name)');

  if (pricesError) {
    console.error('Error fetching prices:', pricesError);
    return { products, prices: [] };
  }

  return {
    products,
    prices,
  };
};
