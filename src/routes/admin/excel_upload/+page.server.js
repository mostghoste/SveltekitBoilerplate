import { fail } from '@sveltejs/kit';

/**
 * We'll create two actions:
 *  (A) parseFile: reads the uploaded CSV, no DB writes, just logs + parsed rows
 *  (B) confirmUpload: actually writes to the DB
 */
export const actions = {
	// ---------------------------------------------
	// A) Upload & Parse (no DB writes)
	// ---------------------------------------------
	parseFile: async ({ request }) => {
		console.log('[parseFile] Action triggered...');
		const formData = await request.formData();
		const infoLogs = [];
		const devLogs = [];

		// Log formData keys
		for (const [key, val] of formData.entries()) {
			console.log(`[parseFile] formData: key="${key}", value="${val}"`);
		}

		const file = formData.get('file');
		if (!file || (file instanceof File && file.size === 0)) {
			infoLogs.push(`[Error] No file was provided!`);
			devLogs.push(`[Error] No file was provided!`);
			console.log('[parseFile] No file provided or file is empty!');
			return fail(400, {
				error: 'No file provided or file is empty',
				logsInfo: infoLogs,
				logsDev: devLogs
			});
		}

		try {
			console.log('[parseFile] Reading file as text...');
			infoLogs.push('[parseFile] Reading file as text...');
			devLogs.push('[parseFile] Reading file as text...');
			const contents = await file.text();
			console.log('[parseFile] File contents length:', contents.length);
			devLogs.push(`[parseFile] File contents length: ${contents.length}`);

			console.log('[parseFile] Parsing CSV with semicolon delimiter');
			infoLogs.push('[parseFile] Parsing CSV with semicolon delimiter');
			devLogs.push('[parseFile] Parsing CSV with semicolon delimiter');

			const parseResult = parseCSV(contents, infoLogs, devLogs);
			if (!parseResult.success) {
				infoLogs.push(`Parsing encountered errors: ${parseResult.message}`);
				devLogs.push(`Parsing encountered errors: ${parseResult.message}`);
				return fail(400, {
					error: 'Failed to parse file',
					previewRows: parseResult.rows,
					logsInfo: infoLogs,
					logsDev: devLogs,
					message: parseResult.message
				});
			}
			const rows = parseResult.rows;

			// Validate images for each row using a for...of loop
			for (const row of rows) {
				let imageError = false;
				if (row.image && row.image.trim() !== '') {
					const isValidImage = await validateImage(row.image, infoLogs, devLogs);
					if (!isValidImage) {
						infoLogs.push(
							`Warning: Image "${row.image}" is missing or invalid for product "${row.part_code ?? 'unknown'}".`
						);
						imageError = true;
					}
				}
				// Mark the row as errored if it already had CSV errors or if image validation failed.
				row.errored = (row.errors && row.errors.length > 0) || imageError;
				row.imageError = imageError;
			}

			infoLogs.push(`Parsed ${rows.length} rows successfully.`);
			devLogs.push(`Parsed ${rows.length} rows successfully.`);
			console.log(`[parseFile] Done. Rows: ${rows.length}`);
			return {
				success: true,
				previewRows: rows,
				logsInfo: infoLogs,
				logsDev: devLogs
			};
		} catch (err) {
			console.error('[parseFile] Error parsing CSV:', err);
			infoLogs.push(`Error parsing CSV: ${err.message}`);
			return fail(400, {
				error: 'Failed to parse file',
				logsInfo: infoLogs,
				logsDev: devLogs
			});
		}
	},

	// ---------------------------------------------
	// B) Confirm & Insert (writes to DB)
	// ---------------------------------------------
	confirmUpload: async ({ request, locals }) => {
		console.log('[confirmUpload] Action triggered...');
		const supabase = locals.supabase;
		const formData = await request.formData();

		// Dump formData keys for debugging
		for (const [key, val] of formData.entries()) {
			console.log(`[confirmUpload] formData: key="${key}", value.length="${String(val).length}"`);
		}

		const previewJson = formData.get('previewJson');
		if (!previewJson) {
			console.log('[confirmUpload] No preview data found!');
			return fail(400, { error: 'No preview data to confirm' });
		}

		const rows = JSON.parse(previewJson);
		console.log(`[confirmUpload] Received ${rows.length} rows to insert...`);
		const logs = [];

		// Identify columns from the CSV
		const headers = rows.length ? Object.keys(rows[0]) : [];

		// 1) Make sure we have any needed customer groups (price_* columns)
		const priceHeaders = headers.filter((h) => h.startsWith('price_'));
		for (const header of priceHeaders) {
			const groupName = header.slice('price_'.length);
			console.log(`Checking/creating customer group: ${groupName}`);
			logs.push(`Checking/creating customer group: ${groupName}`);
			const { data: existingGroup, error: groupErr } = await supabase
				.from('customer_groups')
				.select('id')
				.eq('group_name', groupName)
				.single();

			if (groupErr && groupErr.code !== 'PGRST116') {
				const msg = `Error checking group "${groupName}": ${groupErr.message}`;
				logs.push(msg);
				console.error(msg);
				continue;
			}
			if (!existingGroup) {
				console.log(`Group "${groupName}" does not exist; creating...`);
				logs.push(`Group "${groupName}" does not exist; creating...`);
				const { error: insertErr } = await supabase
					.from('customer_groups')
					.upsert({ group_name: groupName, group_description: `Auto-created group: ${groupName}` });
				if (insertErr) {
					const msg = `Error inserting group "${groupName}": ${insertErr.message}`;
					logs.push(msg);
					console.error(msg);
				} else {
					logs.push(`Created new group "${groupName}"`);
				}
			} else {
				logs.push(`Group "${groupName}" already exists`);
			}
		}

		// 2) Identify category/product translation columns
		//    (We skip 'en' for categories, because it's the default in categories.category_name)
		const categoryLangHeaders = headers.filter((h) => h.startsWith('category_name_'));
		const productLangHeaders = headers.filter((h) => h.startsWith('part_name_'));

		// For category translations, we'll skip the 'en' suffix because we store that in categories.category_name
		function isNonEnglishCategoryHeader(header) {
			// e.g. "category_name_lt", "category_name_ru"
			if (!header.startsWith('category_name_')) return false;
			const suffix = header.replace('category_name_', '').toLowerCase();
			return suffix !== 'en'; // skip the 'en' column
		}
		const categoryTranslationHeaders = categoryLangHeaders.filter(isNonEnglishCategoryHeader);

		// 3) We may need languages for the product translations or the non-English category columns
		//    e.g. 'lt', 'ru'
		const allLangCodes = [];
		for (const h of categoryTranslationHeaders) {
			// e.g. "category_name_lt" => "lt"
			allLangCodes.push(h.replace('category_name_', '').toLowerCase());
		}
		for (const h of productLangHeaders) {
			// e.g. "part_name_lt" => "lt"
			const code = h.replace('part_name_', '').toLowerCase();
			// If it's exactly "part_name", we skip.
			if (code !== 'name') {
				allLangCodes.push(code);
			}
		}
		// Unique set of language codes
		const uniqueLangCodes = [...new Set(allLangCodes)];

		// We'll store { [code]: languageId } for quick lookups
		const langMap = {};

		async function getOrCreateLanguage(code) {
			if (langMap[code]) return langMap[code];
			const { data: existingLang, error: langErr } = await supabase
				.from('languages')
				.select('id')
				.eq('code', code)
				.single();

			if (langErr && langErr.code !== 'PGRST116') {
				logs.push(`Error checking language "${code}": ${langErr.message}`);
				console.error(`Error checking language "${code}":`, langErr);
				return null;
			}
			if (!existingLang) {
				logs.push(`Language "${code}" does not exist; creating...`);
				const { data: newLang, error: newLangErr } = await supabase
					.from('languages')
					.insert({ code, name: `Auto-created ${code}` })
					.select('id')
					.single();
				if (newLangErr) {
					logs.push(`Error inserting language "${code}": ${newLangErr.message}`);
					console.error(`Error inserting language "${code}":`, newLangErr);
					return null;
				}
				langMap[code] = newLang.id;
				logs.push(`Created language "${code}" (id=${newLang.id})`);
				return newLang.id;
			} else {
				langMap[code] = existingLang.id;
				logs.push(`Language "${code}" already exists (id=${existingLang.id})`);
				return existingLang.id;
			}
		}

		// Create or fetch each language code we need
		for (const code of uniqueLangCodes) {
			await getOrCreateLanguage(code);
		}

		// ─── Step 2: set up parent‑category cache ────────────────────────────────
		const parentCache = {};
		async function getParentId(altId) {
			if (parentCache[altId] != null) return parentCache[altId];
			const { data: p, error } = await supabase
				.from('categories')
				.select('id')
				.eq('id_alt', altId)
				.single();
			if (error || !p) {
				logs.push(`Parent not found for parent_altid="${altId}"`);
				return null;
			}
			parentCache[altId] = p.id;
			return p.id;
		}
		// ────────────────────────────────────────────────────────────────────────

		// 4) Process each CSV row
		for (const row of rows) {
			try {
				// --- A) Category: store row.category => categories.id_alt
				//                 store row.category_name_en => categories.category_name
				const altId = row.category?.trim(); // sub‑category alt id
				const parentAlt = row.parent_altid?.trim(); // NEW: the parent’s alt id
				if (!altId) {
					logs.push(`Skipping row with no category code: ${JSON.stringify(row)}`);
					continue;
				}
				const parentId = parentAlt && parentAlt.length ? await getParentId(parentAlt) : null;
				if (parentAlt && !parentId) {
					logs.push(`Skipping row: unknown parent_altid="${parentAlt}"`);
					continue;
				}

				// We'll store the English name in categories.category_name or fallback if empty
				let catNameEn = row.category_name_en?.trim() || '';
				if (!catNameEn) catNameEn = `Category ${altId}`; // fallback

				// 1) find or create the category by id_alt (only filter parent_id if we have one)
				let catQuery = supabase.from('categories').select('id').eq('id_alt', altId);

				if (parentAlt) {
					// only apply when parentAlt was provided
					catQuery = catQuery.eq('parent_id', parentId);
				}

				const { data: existingCat, error: catErr } = await catQuery.single();

				let categoryId;
				if (catErr && catErr.code !== 'PGRST116') {
					const msg = `Error checking category id_alt="${altId}": ${catErr.message}`;
					logs.push(msg);
					console.error(msg);
					continue;
				}

				if (!existingCat) {
					// Insert new category
					logs.push(`Creating category with id_alt="${altId}", name="${catNameEn}"`);
					// Insert new category (attach parent_id only if present)
					const payload = {
						id_alt: altId,
						category_name: catNameEn
					};

					if (parentAlt) {
						payload.parent_id = parentId;
					}

					const { data: newCat, error: newCatErr } = await supabase
						.from('categories')
						.insert(payload)
						.select('id')
						.single();

					if (newCatErr) {
						const msg = `Error inserting category id_alt="${altId}": ${newCatErr.message}`;
						logs.push(msg);
						console.error(msg);
						continue;
					}
					categoryId = newCat.id;
					logs.push(`Created category (id=${categoryId}) with id_alt="${altId}"`);
				} else {
					categoryId = existingCat.id;
					logs.push(`Found existing category with id_alt="${altId}" (id=${categoryId})`);
				}

				// 2) For each non-English column (category_name_lt, category_name_ru, etc.),
				//    create or update a row in category_translations if there's a value
				for (const catHeader of categoryTranslationHeaders) {
					// e.g. "category_name_lt" => "lt"
					const code = catHeader.replace('category_name_', '').toLowerCase();
					const translationVal = row[catHeader]?.trim() || '';
					if (!translationVal) continue; // skip empty
					const langId = langMap[code];
					if (!langId) {
						logs.push(`Skipping category translation: no langId for code="${code}"`);
						continue;
					}

					// Check if translation already exists
					const { data: existingCT, error: ctErr } = await supabase
						.from('category_translations')
						.select('id')
						.eq('category_id', categoryId)
						.eq('language_id', langId)
						.single();

					if (ctErr && ctErr.code !== 'PGRST116') {
						const msg = `Error checking category_translations for cat_id=${categoryId}, lang_id=${langId}: ${ctErr.message}`;
						logs.push(msg);
						console.error(msg);
						continue;
					}

					if (!existingCT) {
						logs.push(`Inserting category translation for id_alt="${altId}", lang="${code}"`);
						const { error: insertCTErr } = await supabase.from('category_translations').insert({
							category_id: categoryId,
							language_id: langId,
							category_name: translationVal
						});
						if (insertCTErr) {
							const msg = `Error inserting category translation: ${insertCTErr.message}`;
							logs.push(msg);
							console.error(msg);
						} else {
							logs.push(`Created category translation for id_alt="${altId}", lang="${code}"`);
						}
					} else {
						logs.push(`Updating category translation for id_alt="${altId}", lang="${code}"`);
						const { error: updateCTErr } = await supabase
							.from('category_translations')
							.update({ category_name: translationVal })
							.eq('id', existingCT.id);

						if (updateCTErr) {
							const msg = `Error updating category translation: ${updateCTErr.message}`;
							logs.push(msg);
							console.error(msg);
						} else {
							logs.push(`Updated category translation for id_alt="${altId}", lang="${code}"`);
						}
					}
				}

				// --- B) Product creation
				const basePartName = row.part_name?.trim() || '(unnamed product)';
				const partCode = row.part_code?.trim() || '';
				if (!partCode) {
					const msg = `Skipping row: no part_code. row=${JSON.stringify(row)}`;
					logs.push(msg);
					console.warn(msg);
					continue;
				}

				// Check if product exists
				const { data: existingProduct, error: prodCheckErr } = await supabase
					.from('products')
					.select('id')
					.eq('part_code', partCode)
					.single();

				let productId = null;
				if (prodCheckErr && prodCheckErr.code !== 'PGRST116') {
					const msg = `Error checking product "${partCode}": ${prodCheckErr.message}`;
					logs.push(msg);
					console.error(msg);
					continue;
				}

				if (existingProduct) {
					productId = existingProduct.id;
					logs.push(`Product "${partCode}" already exists (id=${productId}).`);
				} else {
					const pPrice =
						parseFloat(String(row['price (without VAT)'] || '').replace(',', '.')) || 0;
					const productData = {
						part_name: basePartName,
						part_code: partCode,
						price: pPrice,
						image: row.image,
						category_id: categoryId
					};
					logs.push(`Inserting product: ${JSON.stringify(productData)}`);
					const { data: newProduct, error: prodErr } = await supabase
						.from('products')
						.insert(productData)
						.select('id')
						.single();
					if (prodErr) {
						const msg = `Error inserting product "${basePartName}": ${prodErr.message}`;
						logs.push(msg);
						console.error(msg);
						continue;
					}
					productId = newProduct.id;
					logs.push(`Inserted product "${basePartName}" (id=${productId})`);
				}
				if (!productId) continue;

				// Product translations for part_name_lt, part_name_ru, etc.
				for (const pHeader of productLangHeaders) {
					// e.g. "part_name_lt" => "lt"
					const code = pHeader.replace('part_name_', '').toLowerCase();
					if (code === 'name') continue; // skip the base "part_name" itself
					const translationVal = row[pHeader]?.trim() || '';
					if (!translationVal) continue;
					const langId = langMap[code];
					if (!langId) continue;

					// Upsert translation
					const { data: existingPT, error: ptErr } = await supabase
						.from('product_translations')
						.select('id')
						.eq('product_id', productId)
						.eq('language_id', langId)
						.single();

					if (ptErr && ptErr.code !== 'PGRST116') {
						const msg = `Error checking product_translations for product_id=${productId}, lang=${code}: ${ptErr.message}`;
						logs.push(msg);
						console.error(msg);
						continue;
					}

					if (!existingPT) {
						logs.push(`Inserting product translation for part_code="${partCode}", lang="${code}"`);
						const { error: insertPTErr } = await supabase.from('product_translations').insert({
							product_id: productId,
							language_id: langId,
							part_name: translationVal
						});
						if (insertPTErr) {
							const msg = `Error inserting product translation: ${insertPTErr.message}`;
							logs.push(msg);
							console.error(msg);
						} else {
							logs.push(`Created product translation for part_code="${partCode}", lang="${code}"`);
						}
					} else {
						logs.push(`Updating product translation for part_code="${partCode}", lang="${code}"`);
						const { error: updatePTErr } = await supabase
							.from('product_translations')
							.update({ part_name: translationVal })
							.eq('id', existingPT.id);

						if (updatePTErr) {
							const msg = `Error updating product translation: ${updatePTErr.message}`;
							logs.push(msg);
							console.error(msg);
						} else {
							logs.push(`Updated product translation for part_code="${partCode}", lang="${code}"`);
						}
					}
				}

				// --- C) Custom group prices
				for (const pHeader of priceHeaders) {
					const groupName = pHeader.slice('price_'.length);
					const rawVal = row[pHeader];
					if (!rawVal) continue;
					const groupPrice = parseFloat(String(rawVal).replace(',', '.')) || 0;
					logs.push(
						`Updating custom price for group="${groupName}", product="${partCode}", val=${groupPrice}`
					);
					const { data: grp, error: grpErr } = await supabase
						.from('customer_groups')
						.select('id')
						.eq('group_name', groupName)
						.single();
					if (grpErr || !grp) {
						const msg = `Missing group "${groupName}" for product "${partCode}": ${grpErr?.message}`;
						logs.push(msg);
						console.error(msg);
						continue;
					}
					// Try update first
					const { data: updatedPrice, error: priceErr } = await supabase
						.from('prices')
						.update({ price: groupPrice })
						.eq('product_id', productId)
						.eq('customer_group_id', grp.id)
						.select('*');
					if (priceErr) {
						const msg = `Error updating price for product "${partCode}" + group="${groupName}": ${priceErr.message}`;
						logs.push(msg);
						console.error(msg);
						continue;
					}
					if (updatedPrice.length === 0) {
						// Insert if no row found
						const { error: insertPriceErr } = await supabase.from('prices').insert({
							product_id: productId,
							customer_group_id: grp.id,
							price: groupPrice
						});
						if (insertPriceErr) {
							const msg = `Error inserting price for product "${partCode}" + group="${groupName}": ${insertPriceErr.message}`;
							logs.push(msg);
							console.error(msg);
						} else {
							logs.push(`Inserted custom price for "${partCode}" + "${groupName}" = ${groupPrice}`);
						}
					} else {
						logs.push(`Updated custom price for "${partCode}" + "${groupName}" to ${groupPrice}`);
					}
				}
			} catch (err) {
				const msg = `Unexpected row error: ${err.message}`;
				logs.push(msg);
				console.error(msg);
			}
		}

		// All done
		return {
			success: true,
			logs,
			message: 'All rows processed!'
		};
	}
};

/**
 * Robust CSV parser using semicolons as the delimiter.
 * Logs every line to devLogs and only logs validation issues (with reasons) to infoLogs.
 * Also logs which optional headers (language groups and customer groups) are being added,
 * and filters each row to include only required and allowed optional headers.
 *
 * Validation rules:
 *  - Each required header must have a nonempty value.
 *  - The 'price (without VAT)' column must be parsed as a number.
 *  - If provided, the 'image' column must end with .jpg, .jpeg, or .png.
 *
 * If any row fails validation, errors are logged (with "[Error]") and attached to that row.
 * The overall parse result will have success: false and include the failed rows.
 *
 * @param {string} contents - The CSV file contents.
 * @param {Array<string>} infoLogs - Array for info-level logs.
 * @param {Array<string>} devLogs - Array for developer-level logs.
 * @returns {object} An object containing:
 *    - success: {boolean} Overall success flag.
 *    - rows: {Array<object>} The filtered data rows (each row may include an "errors" property).
 *    - message: {string} A message if the parse failed.
 */
function parseCSV(contents, infoLogs = [], devLogs = []) {
	devLogs.push('[parseCSV] Starting parse with semicolons');
	const lines = contents.split('\n').filter((r) => r.trim() !== '');
	if (lines.length < 2) {
		const msg = 'No data rows found in CSV (or file is empty).';
		infoLogs.push(`[parseCSV] ${msg}`);
		throw new Error(msg);
	}
	const headers = lines[0].split(';').map((h) => h.trim());
	devLogs.push(`[parseCSV] Headers: ${JSON.stringify(headers)}`);
	const requiredHeaders = ['category', 'part_name', 'part_code', 'price (without VAT)'];
	const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
	if (missingHeaders.length > 0) {
		const msg = `Missing required headers: ${missingHeaders.join(', ')}`;
		infoLogs.push(`[parseCSV] ${msg}`);
		throw new Error(msg);
	}
	const languageGroups = headers.filter((header) => /^part_name_(ru|en|gb)$/i.test(header));
	devLogs.push(`[parseCSV] Detected language groups: ${JSON.stringify(languageGroups)}`);
	languageGroups.forEach((lang) => {
		devLogs.push(`[parseCSV] Adding language group: ${lang}`);
	});
	const customerGroups = headers.filter((header) => /^price_.+/i.test(header));
	devLogs.push(`[parseCSV] Detected customer groups: ${JSON.stringify(customerGroups)}`);
	customerGroups.forEach((group) => {
		devLogs.push(`[parseCSV] Adding customer group: ${group}`);
	});
	const isAllowedOptional = (header) => {
		if (/^part_name_[a-zA-Z]{2}$/.test(header)) return true;
		if (/^price_.+/.test(header)) return true;
		if (header === 'image') return true;
		if (header === 'parent_altid') return true;
		if (/^category_name_.+/.test(header)) return true;
		return false;
	};
	headers.forEach((header) => {
		if (!requiredHeaders.includes(header) && !isAllowedOptional(header)) {
			const warnMsg = `[parseCSV] Warning: Unexpected header found: '${header}'`;
			infoLogs.push(warnMsg);
			devLogs.push(warnMsg);
		}
	});
	const dataRows = [];
	let globalHasErrors = false;
	lines.slice(1).forEach((line, idx) => {
		const rowNumber = idx + 2;
		const values = line.split(';').map((v) => v.trim());
		const row = {};
		headers.forEach((header, i) => {
			row[header] = values[i] ?? '';
		});
		const rowErrors = [];
		requiredHeaders.forEach((r) => {
			if (!row[r] || row[r].trim() === '') {
				rowErrors.push(`Missing value for '${r}'`);
			}
		});
		const priceVal = row['price (without VAT)'];
		const parsedPrice = parseFloat(priceVal.replace(',', '.'));
		if (isNaN(parsedPrice)) {
			rowErrors.push(`Invalid price value '${priceVal}' in 'price (without VAT)'`);
		} else {
			row['price (without VAT)'] = parsedPrice;
		}
		if (row['image'] && row['image'].trim() !== '') {
			if (!/\.(jpe?g|png)$/i.test(row['image'])) {
				rowErrors.push(
					`Invalid image format '${row['image']}'. Must end with .jpg, .jpeg, or .png`
				);
			}
		}
		if (rowErrors.length > 0) {
			globalHasErrors = true;
			const errorMsg = `[parseCSV] [Error] Row ${rowNumber} failed validation: ${rowErrors.join('; ')}`;
			infoLogs.push(errorMsg);
			devLogs.push(errorMsg);
			row.errors = rowErrors;
		}
		devLogs.push(`[parseCSV] Parsed row ${rowNumber}: ${JSON.stringify(row)}`);
		const filteredRow = {};
		Object.keys(row).forEach((key) => {
			if (requiredHeaders.includes(key) || isAllowedOptional(key)) {
				filteredRow[key] = row[key];
			}
		});
		if (row.errors) {
			filteredRow.errors = row.errors;
		}
		dataRows.push(filteredRow);
	});
	if (globalHasErrors) {
		const msg = `[parseCSV] Failed parse. One or more rows failed validation.`;
		infoLogs.push(msg);
		devLogs.push(msg);
		return { success: false, rows: dataRows, message: msg };
	}
	return { success: true, rows: dataRows };
}

/**
 * Validate the product image by sending a HEAD request to the Supabase storage URL.
 * - Success -> devLogs
 * - Error/Invalid -> infoLogs
 *
 * @param {string} imageName - The image filename.
 * @param {Array<string>} infoLogs - Info logs array for errors/invalid messages.
 * @param {Array<string>} devLogs - Dev logs array for successful messages.
 * @returns {Promise<boolean>} - Returns true if the image is valid, false otherwise.
 */
async function validateImage(imageName, infoLogs, devLogs) {
	if (!imageName || imageName.trim() === '') {
		// If the name is empty or null, treat as invalid
		infoLogs.push('Image validation failed: no image name provided.');
		return false;
	}

	const imageUrl = `https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/${imageName}`;

	try {
		// Use HEAD so we don't download the entire file
		const response = await fetch(imageUrl, { method: 'HEAD' });
		if (!response.ok) {
			// If the HEAD request fails or returns a non-OK status, log to infoLogs
			console.error(`Image validation failed for ${imageUrl}: Status ${response.status}`);
			return false;
		}
		// On success, log to devLogs
		devLogs.push(`Image validated successfully: ${imageUrl}`);
		return true;
	} catch (error) {
		// Any fetch error also goes to infoLogs
		infoLogs.push(`Error fetching image ${imageUrl}: ${error.message}`);
		console.error(`Error fetching image ${imageUrl}: ${error.message}`);
		return false;
	}
}
