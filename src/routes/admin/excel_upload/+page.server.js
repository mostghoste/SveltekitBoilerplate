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
  // ---------------------------------------------
  // A) Upload & Parse (no DB writes)
  // ---------------------------------------------
  parseFile: async ({ request }) => {
		console.log('[parseFile] Action triggered...');
		const formData = await request.formData();

		// Dump formData entries for debugging
		for (const [key, val] of formData.entries()) {
			console.log(`[parseFile] formData: key="${key}", value="${val}"`);
		}

		const file = formData.get('file');

		// Check that a file was provided and it's not empty.
		if (!file || (file instanceof File && file.size === 0)) {
			console.log('[parseFile] No file provided or file is empty!');
			return fail(400, { error: 'No file provided or file is empty' });
		}

		// Separate log arrays for info and developer levels.
		const infoLogs = [];
		const devLogs = [];

		try {
			console.log('[parseFile] Reading file as text...');
			infoLogs.push('[parseFile] Reading file as text...');
			devLogs.push('[parseFile] Reading file as text...');
			const contents = await file.text();
			console.log('[parseFile] File contents length:', contents.length);
			infoLogs.push(`[parseFile] File contents length: ${contents.length}`);
			devLogs.push(`[parseFile] File contents length: ${contents.length}`);

			console.log('[parseFile] Parsing CSV with semicolon delimiter');
			infoLogs.push('[parseFile] Parsing CSV with semicolon delimiter');
			devLogs.push('[parseFile] Parsing CSV with semicolon delimiter');

			// Pass both log arrays so that parseCSV() can log each row.
			const rows = parseCSV(contents, infoLogs, devLogs);

			infoLogs.push(`Parsed ${rows.length} rows successfully.`);
			devLogs.push(`Parsed ${rows.length} rows successfully.`);

			console.log(`[parseFile] Done. Rows: ${rows.length}`);
			// Return all parsed rows along with separate logs.
			return {
				success: true,
				previewRows: rows, // all parsed rows (frontend can slice to 10)
				logsInfo: infoLogs,
				logsDev: devLogs
			};
		} catch (err) {
			console.error('[parseFile] Error parsing CSV:', err);
			infoLogs.push(`Error parsing CSV: ${err.message}`);
			return fail(400, { error: 'Failed to parse file', logsInfo: infoLogs, logsDev: devLogs });
		}
	},

  // ---------------------------------------------
  // B) Confirm & Insert (writes to DB)
  // ---------------------------------------------
  confirmUpload: async ({ request, locals }) => {
    console.log('[confirmUpload] Action triggered...');
    const supabase = locals.supabase;
    const formData = await request.formData();

    // Dump formData for debugging
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

    // We’ll collect logs to show in the UI
    const logs = [];

    // Identify any columns that start with "price_"
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const priceHeaders = headers.filter((h) => h.startsWith('price_'));

    try {
      // 1) Ensure that all needed customer groups exist
      for (const header of priceHeaders) {
        const groupName = header.slice('price_'.length);
        console.log(`[confirmUpload] Checking group "${groupName}"`);

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
          logs.push(`Group "${groupName}" does not exist; creating...`);
          const { error: insertErr } = await supabase
            .from('customer_groups')
            .insert({ group_name: groupName });

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

      // 2) Insert/Update each row
      for (const row of rows) {
        try {
          const {
            category,
            part_name,
            part_name_lt,
            part_name_uk,
            part_code,
            price,
            image
          } = row;

          console.log(`[confirmUpload] Processing row => code:${part_code}, name:${part_name}`);

          // --- A) Find or create category
          let categoryId = null;
          if (category) {
            const { data: existingCat, error: catErr } = await supabase
              .from('categories')
              .select('id')
              .eq('category_name', category)
              .single();

            if (catErr && catErr.code !== 'PGRST116') {
              const msg = `Error checking category "${category}" for "${part_name}": ${catErr.message}`;
              logs.push(msg);
              console.error(msg);
              continue;
            }

            if (!existingCat) {
              // Insert new category
              logs.push(`Category "${category}" not found; creating...`);
              const { data: newCat, error: newCatErr } = await supabase
                .from('categories')
                .insert({ category_name: category })
                .select('id')
                .single();

              if (newCatErr) {
                const msg = `Error inserting category "${category}" for product "${part_name}": ${newCatErr.message}`;
                logs.push(msg);
                console.error(msg);
                continue;
              }
              categoryId = newCat.id;
              logs.push(`Created category "${category}"`);
            } else {
              categoryId = existingCat.id;
              logs.push(`Category "${category}" found (id=${categoryId})`);
            }
          }

          // --- B) Check if product already exists by part_code
          const { data: existingProduct, error: prodCheckErr } = await supabase
            .from('products')
            .select('id')
            .eq('part_code', part_code)
            .single();

          if (prodCheckErr && prodCheckErr.code !== 'PGRST116') {
            const msg = `Error checking product "${part_code}": ${prodCheckErr.message}`;
            logs.push(msg);
            console.error(msg);
            continue;
          }

          if (existingProduct) {
            logs.push(`Product "${part_code}" already exists; skipping insert.`);
            continue;
          }

          // --- C) Insert product
          const pPrice = parseFloat(String(price).replace(',', '.')) || 0;
          const productData = {
            part_name,
            part_code,
            price: pPrice,
            image,
            category_id: categoryId
          };
          logs.push(`Inserting product: ${JSON.stringify(productData)}`);
          const { data: newProduct, error: prodErr } = await supabase
            .from('products')
            .insert(productData)
            .select('id')
            .single();

          if (prodErr) {
            const msg = `Error inserting product "${part_name}": ${prodErr.message}`;
            logs.push(msg);
            console.error(msg);
            continue;
          }
          const productId = newProduct.id;
          logs.push(`Inserted product "${part_name}" (id=${productId})`);

          // --- D) Update translations
          if (part_name_lt) {
            const { error: ltErr } = await supabase
              .from('product_translations')
              .update({ part_name: part_name_lt })
              .eq('product_id', productId)
              .eq('language_id', 1);

            if (ltErr) {
              const msg = `Error updating LT name for "${part_name}": ${ltErr.message}`;
              logs.push(msg);
              console.error(msg);
            } else {
              logs.push(`Updated LT name for "${part_name}"`);
            }
          }

          if (part_name_uk) {
            const { error: ukErr } = await supabase
              .from('product_translations')
              .update({ part_name: part_name_uk })
              .eq('product_id', productId)
              .eq('language_id', 2);

            if (ukErr) {
              const msg = `Error updating UK name for "${part_name}": ${ukErr.message}`;
              logs.push(msg);
              console.error(msg);
            } else {
              logs.push(`Updated UK name for "${part_name}"`);
            }
          }

          // --- E) Insert/Update custom group prices
          for (const pHeader of priceHeaders) {
            const groupName = pHeader.slice('price_'.length);
            const rawVal = row[pHeader];
            if (!rawVal) continue;

            const groupPrice = parseFloat(String(rawVal).replace(',', '.')) || 0;
            logs.push(`Updating custom price for group="${groupName}", product="${part_name}", val=${groupPrice}`);

            // find group
            const { data: grp, error: grpErr } = await supabase
              .from('customer_groups')
              .select('id')
              .eq('group_name', groupName)
              .single();
            if (grpErr || !grp) {
              const msg = `Missing group "${groupName}" for product "${part_name}": ${grpErr?.message}`;
              logs.push(msg);
              console.error(msg);
              continue;
            }

            // update
            const { error: priceErr } = await supabase
              .from('prices')
              .update({ price: groupPrice })
              .eq('product_id', productId)
              .eq('customer_group_id', grp.id);

            if (priceErr) {
              const msg = `Error updating price for "${part_name}" + "${groupName}": ${priceErr.message}`;
              logs.push(msg);
              console.error(msg);
            } else {
              logs.push(`Set custom price for "${part_name}" + "${groupName}" to ${groupPrice}`);
            }
          }

        } catch (err) {
          const msg = `Unexpected row error: ${err.message}`;
          logs.push(msg);
          console.error(msg);
        }
      }

      return {
        success: true,
        logs,
        message: 'All rows processed!'
      };
    } catch (err) {
      console.error('[confirmUpload] Outer error:', err);
      logs.push(`Error: ${err.message}`);
      return fail(400, { error: 'Confirm upload failed', logs });
    }
  }
};

/**
 * Robust CSV parser using semicolons as the delimiter.
 * Logs every line to devLogs and only logs validation issues (with reasons) to infoLogs.
 * Also filters each row to include only required and allowed optional headers.
 *
 * @param {string} contents - The CSV file contents.
 * @param {Array<string>} infoLogs - Array for info-level logs.
 * @param {Array<string>} devLogs - Array for developer-level logs.
 * @returns {Array<object>} The filtered data rows.
 */
function parseCSV(contents, infoLogs = [], devLogs = []) {
	devLogs.push('[parseCSV] Starting parse with semicolons');
	// Split file into nonempty lines.
	const lines = contents.split('\n').filter((r) => r.trim() !== '');
	if (lines.length < 2) {
		const msg = 'No data rows found in CSV (or file is empty).';
		infoLogs.push(`[parseCSV] ${msg}`);
		throw new Error(msg);
	}

	// Parse the header row.
	const headers = lines[0].split(';').map((h) => h.trim());
	devLogs.push(`[parseCSV] Headers: ${JSON.stringify(headers)}`);

	// Define required headers.
	const requiredHeaders = ['category', 'part_name', 'part_code', 'price (without VAT)'];
	const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
	if (missingHeaders.length > 0) {
		const msg = `Missing required headers: ${missingHeaders.join(', ')}`;
		infoLogs.push(`[parseCSV] ${msg}`);
		throw new Error(msg);
	}

	// Helper: allowed optional headers.
	const isAllowedOptional = (header) => {
		if (/^part_name_[a-zA-Z]{2}$/.test(header)) return true;
		if (/^price_.+/.test(header)) return true;
		if (header === 'image') return true;
		return false;
	};

	// Log warnings for any headers that aren’t allowed.
	headers.forEach((header) => {
		if (!requiredHeaders.includes(header) && !isAllowedOptional(header)) {
			const warnMsg = `[parseCSV] Warning: Unexpected header found: '${header}'`;
			infoLogs.push(warnMsg);
			devLogs.push(warnMsg);
		}
	});

	const dataRows = [];
	// Process each data line.
	lines.slice(1).forEach((line, idx) => {
		const rowNumber = idx + 2; // +2 because headers are line 1
		const values = line.split(';').map((v) => v.trim());
		const row = {};
		headers.forEach((header, i) => {
			row[header] = values[i] ?? '';
		});

		// Validate row: check that each required header has a value.
		const rowErrors = [];
		requiredHeaders.forEach((r) => {
			if (!row[r] || row[r].trim() === '') {
				rowErrors.push(`Missing value for '${r}'`);
			}
		});
		if (rowErrors.length > 0) {
			infoLogs.push(`[parseCSV] Row ${rowNumber} failed validation: ${rowErrors.join('; ')}`);
		}
		devLogs.push(`[parseCSV] Parsed row ${rowNumber}: ${JSON.stringify(row)}`);

		// Filter row: keep only keys that are required or allowed optional.
		const filteredRow = {};
		Object.keys(row).forEach((key) => {
			if (requiredHeaders.includes(key) || isAllowedOptional(key)) {
				filteredRow[key] = row[key];
			}
		});
		dataRows.push(filteredRow);
	});

	return dataRows;
}
