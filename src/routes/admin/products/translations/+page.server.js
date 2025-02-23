import { fail } from '@sveltejs/kit';
import { languageTag } from '$lib/paraglide/runtime.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, depends, url }) => {
	depends('paraglide:lang');
	const supabase = locals.supabase;

	// Read the page number from the query string, defaulting to 1
	const page = parseInt(url.searchParams.get('page') || '1');
	const pageSize = 100; // Number of products per page
	const start = (page - 1) * pageSize;
	const end = page * pageSize - 1;

	// 1) Fetch a page of products with an exact count
	const {
		data: products,
		count: productCount,
		error: productsError
	} = await supabase
		.from('products')
		.select('id, part_code, part_name', { count: 'exact' })
		.order('id', { ascending: true })
		.range(start, end);

	if (productsError) {
		console.error('Error fetching products:', productsError);
		return { products: [], languages: [], productTranslations: [], page, totalPages: 1 };
	}

	// 2) Fetch all languages (small table, so no pagination needed)
	const { data: languages, error: languagesError } = await supabase
		.from('languages')
		.select('id, name, code')
		.order('id', { ascending: true });

	if (languagesError) {
		console.error('Error fetching languages:', languagesError);
		return { products: [], languages: [], productTranslations: [], page, totalPages: 1 };
	}

	// 3) Fetch only the translations for the products on this page
	const productIds = products.map((p) => p.id);
	const { data: productTranslations, error: translationsError } = await supabase
		.from('product_translations')
		.select('*')
		.in('product_id', productIds);

	if (translationsError) {
		console.error('Error fetching translations:', translationsError);
		return { products: [], languages: [], productTranslations: [], page, totalPages: 1 };
	}

	// Calculate total pages from the product count
	const totalPages = Math.ceil(productCount / pageSize);

	return {
		products,
		languages,
		productTranslations,
		page,
		totalPages
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
