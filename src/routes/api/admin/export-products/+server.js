import { error } from '@sveltejs/kit';
import ExcelJS from 'exceljs';
import sharp from 'sharp';

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
	try {
		const { session, role } = await locals.safeGetSession();

		// Check if user is admin
		if (!session || role !== 'admin') {
			throw error(403, 'Admin access required');
		}

		const supabase = locals.supabase;

		// First fetch all categories to build the hierarchy
		const { data: categories, error: categoriesError } = await supabase
			.from('categories')
			.select('id, category_name, parent_id')
			.order('id', { ascending: true });

		if (categoriesError) {
			console.error('Error fetching categories:', categoriesError);
			throw error(500, 'Failed to fetch categories');
		}

		// Build category hierarchy map for breadcrumbs
		const categoryMap = new Map();

		categories.forEach((cat) => {
			categoryMap.set(cat.id, cat);
		});

		// Function to build category breadcrumb path
		function getCategoryPath(categoryId) {
			if (!categoryId) return '';

			const path = [];
			let currentId = categoryId;

			while (currentId) {
				const category = categoryMap.get(currentId);
				if (category) {
					path.unshift(category.category_name);
					currentId = category.parent_id;
				} else {
					break;
				}
			}

			return path.join(' › ');
		}

		// Fetch ALL products without pagination limit
		let allProducts = [];
		const batchSize = 1000;
		let from = 0;
		let hasMore = true;

		while (hasMore) {
			const { data: productsBatch, error: productsError } = await supabase
				.from('products')
				.select(
					`
					id,
					part_name,
					part_code,
					image,
					category_id,
					prices(price, customer_groups(group_name))
				`
				)
				.order('id', { ascending: true })
				.range(from, from + batchSize - 1);

			if (productsError) {
				console.error('Error fetching products:', productsError);
				throw error(500, 'Failed to fetch products');
			}

			if (productsBatch && productsBatch.length > 0) {
				allProducts = allProducts.concat(productsBatch);
				from += batchSize;
				hasMore = productsBatch.length === batchSize;
			} else {
				hasMore = false;
			}
		}

		console.log(`Fetched ${allProducts.length} products for export`);

		// Fetch all customer groups to ensure consistent column order
		const { data: customerGroups, error: groupsError } = await supabase
			.from('customer_groups')
			.select('id, group_name')
			.order('id', { ascending: true });

		if (groupsError) {
			console.error('Error fetching customer groups:', groupsError);
			throw error(500, 'Failed to fetch customer groups');
		}

		// Create workbook and worksheet using ExcelJS
		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet('Products');

		// Build headers
		const headers = ['Product ID', 'Product Image', 'Category', 'Part Name (English)', 'Part Code'];

		// Add customer group price columns
		customerGroups.forEach((group) => {
			headers.push(`Price - ${group.group_name}`);
		});

		// Add header row
		worksheet.addRow(headers);

		// Style the header row
		const headerRow = worksheet.getRow(1);
		headerRow.font = { bold: true };
		headerRow.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFE0E0E0' }
		};

		// Set column widths
		worksheet.columns = headers.map((header, index) => ({
			width: index === 1 ? 70 : 20 // Image column much wider for 512px images, others normal
		}));

		// Process products and add images
		for (let i = 0; i < allProducts.length; i++) {
			const product = allProducts[i];
			const rowIndex = i + 2; // +2 because Excel is 1-indexed and we have headers

			// Build the data row
			const row = [
				product.id,
				'', // Image placeholder - will be replaced with actual image
				getCategoryPath(product.category_id),
				product.part_name,
				product.part_code
			];

			// Add customer group prices
			customerGroups.forEach((group) => {
				const priceObj = product.prices?.find(
					(p) => p.customer_groups?.group_name === group.group_name
				);
				row.push(priceObj?.price || 0);
			});

			// Add the row to worksheet
			const excelRow = worksheet.addRow(row);
			excelRow.height = 384; // Set row height for 512px images (512px * 0.75 = 384 points)

			// Add image if exists
			if (product.image) {
				try {
					// Download image from Supabase storage
					const { data: imageData } = await supabase.storage
						.from('product_images')
						.download(product.image);

					if (imageData) {
						// Convert image to buffer and resize
						const imageBuffer = await imageData.arrayBuffer();
						const resizedImage = await sharp(Buffer.from(imageBuffer))
							.resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
							.jpeg({ quality: 90 })
							.toBuffer();

						// Add image to workbook
						const imageId = workbook.addImage({
							buffer: resizedImage,
							extension: 'jpeg'
						});

						// Insert the image in the cell
						worksheet.addImage(imageId, {
							tl: { col: 1, row: rowIndex - 1 }, // Top-left position (0-indexed)
							ext: { width: 200, height: 200 },
							editAs: 'oneCell'
						});
					}
				} catch (imageError) {
					console.warn(`Failed to process image for product ${product.id}:`, imageError);
					// Add just the filename as fallback
					excelRow.getCell(2).value = `Image: ${product.image}`;
				}
			}

			// Progress logging for large datasets
			if ((i + 1) % 100 === 0) {
				console.log(`Processed ${i + 1}/${allProducts.length} products`);
			}
		}

		// Generate Excel file buffer
		const buffer = await workbook.xlsx.writeBuffer();

		// Generate filename with current date and product count
		const now = new Date();
		const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
		const filename = `products-export-${dateStr}-${allProducts.length}-products.xlsx`;

		console.log(`Export completed: ${filename}`);

		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (err) {
		console.error('Export error:', err);
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Export failed');
	}
}
