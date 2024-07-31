/** @type {import('./$types').PageServerLoad} */
export async function load( {locals} ) {

    let { data: products, error } = await locals.supabase
    .from('products')
    .select('*')
    .range(0, 29)
    
    if (error !== null) {
      console.log(JSON.stringify(error))
    }

    return {
      products: products ?? null,
    };
}