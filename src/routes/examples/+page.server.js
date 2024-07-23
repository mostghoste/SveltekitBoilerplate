// Import the supabase client
import { supabase } from "$lib/supabaseClient";

/** @type {import('./$types').PageServerLoad} */
export async function load() {

    // Use it to fetch data from a table
    const { data } = await supabase.from("countries").select();

    // Return it in the data object passed to +page.svelte
    return {
      countries: data ?? [],
    };
  }