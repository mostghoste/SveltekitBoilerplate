/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals: { supabase } }) => {
  const { data: countries } = await supabase.from('countries').select('name').limit(5).order('name')
  return { countries: countries ?? [] }
}