import { supabase } from "$lib/supabaseClient";

/** @type {import('./$types').PageServerLoad} */
export async function load() {

    let { data: products, error } = await supabase
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