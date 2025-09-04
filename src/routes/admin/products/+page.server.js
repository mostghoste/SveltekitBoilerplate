import { fail } from '@sveltejs/kit';
import { languageTag } from '$lib/paraglide/runtime.js';
import { v4 as uuidv4 } from 'uuid';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, depends }) => {
	depends('paraglide:lang');
	const supabase = locals.supabase;
	const userLanguageCode = languageTag(); // e.g. 'en' | 'lt' | 'ru'

	// 1) Always fetch categories (with parent_id for nesting)
	const { data: categories, error: categoriesError } = await supabase
		.from('categories')
		.select('id, category_name, parent_id')
		.order('id', { ascending: true });

	if (categoriesError || !categories) {
		console.error('Error fetching categories:', categoriesError);
		return { categoriesOptions: [] };
	}

	// 2) Build an optional translation map — only if we can resolve a language id AND it isn’t 'en'
	let translationMap = new Map();
	if (userLanguageCode && userLanguageCode.toLowerCase() !== 'en') {
		const { data: language, error: languageError } = await supabase
			.from('languages')
			.select('id')
			.eq('code', userLanguageCode)
			.single();

		if (!languageError && language?.id) {
			const { data: categoryTranslations, error: translationsError } = await supabase
				.from('category_translations')
				.select('category_id, category_name')
				.eq('language_id', language.id);

			if (!translationsError && categoryTranslations) {
				translationMap = new Map(categoryTranslations.map((t) => [t.category_id, t.category_name]));
			} else if (translationsError) {
				console.warn(
					'No category translations for language:',
					userLanguageCode,
					translationsError?.message
				);
			}
		} else if (languageError) {
			console.warn('Language not found for code:', userLanguageCode, languageError?.message);
		}
	}
	// If 'en' or language not found, we’ll just use categories.category_name

	// 3) Build nodes, tree, and flatten with breadcrumb labels
	const byId = new Map();
	const children = new Map(); // parent_id -> child nodes
	const roots = [];

	categories.forEach((c) => {
		const node = {
			id: c.id,
			parent_id: c.parent_id,
			name: translationMap.get(c.id) || c.category_name
		};
		byId.set(c.id, node);
	});

	byId.forEach((node) => {
		if (node.parent_id == null) {
			roots.push(node);
		} else {
			if (!children.has(node.parent_id)) children.set(node.parent_id, []);
			children.get(node.parent_id).push(node);
		}
	});

	const sortKids = (arr) =>
		arr?.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

	sortKids(roots);
	children.forEach(sortKids);

	/** @type {{id:number, label:string, depth:number, isLeaf:boolean}[]} */
	const categoriesOptions = [];
	function walk(node, trail) {
		const currentTrail = [...trail, node.name];
		const kids = children.get(node.id) || [];
		const isLeaf = kids.length === 0;

		categoriesOptions.push({
			id: node.id,
			label: currentTrail.join(' › '),
			depth: currentTrail.length - 1,
			isLeaf
		});

		kids.forEach((k) => walk(k, currentTrail));
	}
	roots.forEach((r) => walk(r, []));

	return { categoriesOptions };
};

/** @type {import('./$types').Actions} */
export const actions = {
	createProduct: async ({ request, locals }) => {
		const supabase = locals.supabase;
		const formData = await request.formData();
		const partName = formData.get('part_name');
		const partCode = formData.get('part_code');
		const categoryId = formData.get('category_id');
		const price = parseFloat(formData.get('price')) || 0.0;
		const imageFile = formData.get('image');

		if (!partName || !partCode || !categoryId) {
			return fail(400, { error: 'Part name, part code, and category are required' });
		}

		let imageName = null;
		if (imageFile && imageFile.size > 0) {
			const ext = imageFile.name.split('.').pop();
			imageName = `${uuidv4()}.${ext}`;
			const { error: uploadError } = await supabase.storage
				.from('product_images')
				.upload(imageName, imageFile.stream(), {
					contentType: imageFile.type,
					duplex: 'half'
				});

			if (uploadError) {
				console.error('Error uploading image:', uploadError);
				return fail(500, { error: 'Failed to upload image' });
			}
		}

		const { error: insertError } = await supabase.from('products').insert({
			part_name: partName,
			part_code: partCode,
			category_id: categoryId,
			image: imageName,
			price
		});

		if (insertError) {
			console.error('Error creating product:', insertError);
			return fail(500, { error: 'Failed to create product' });
		}

		return { success: true };
	},

	updateImage: async ({ request, locals }) => {
		const supabase = locals.supabase;
		const formData = await request.formData();
		const productId = formData.get('product_id');
		const imageFile = formData.get('image');

		if (!productId || !imageFile) return fail(400, { error: 'Product ID and image are required' });

		const ext = imageFile.name.split('.').pop();
		const imageName = `${uuidv4()}.${ext}`;

		const { error: uploadError } = await supabase.storage
			.from('product_images')
			.upload(imageName, imageFile.stream(), {
				contentType: imageFile.type,
				duplex: 'half'
			});

		if (uploadError) {
			console.error('Error uploading image:', uploadError);
			return fail(500, { error: 'Failed to upload image' });
		}

		const { error: updateError } = await supabase
			.from('products')
			.update({ image: imageName })
			.eq('id', productId);

		if (updateError) {
			console.error('Error updating product image:', updateError);
			return fail(500, { error: 'Failed to update product image' });
		}

		return { success: true, imageName };
	}
};
