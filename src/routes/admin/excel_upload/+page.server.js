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

    // The logs array we also return to the client side
    const logs = [];
    try {
      console.log('[parseFile] Reading file as text...');
      const contents = await file.text();
      console.log('[parseFile] File contents length:', contents.length);

      console.log('[parseFile] Parsing CSV with semicolon delimiter');
      const rows = parseCSV(contents);

      logs.push(`Parsed ${rows.length} rows successfully.`);
      if (rows.length > 0) {
        logs.push(`First row: ${JSON.stringify(rows[0])}`);
      }

      console.log(`[parseFile] Done. Rows: ${rows.length}`);
      // Return success + the rows so the Svelte page can preview them
      return {
        success: true,
        previewRows: rows,
        logs
      };
    } catch (err) {
      console.error('[parseFile] Error parsing CSV:', err);
      logs.push(`Error parsing CSV: ${err.message}`);
      return fail(400, { error: 'Failed to parse file', logs });
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
 * It validates the presence of required headers and logs warnings for unrecognized headers.
 */
function parseCSV(contents) {
  console.log('[parseCSV] Starting parse with semicolons');
  
  // Split contents by newline and filter out empty lines.
  const lines = contents.split('\n').filter((r) => r.trim() !== '');
  if (lines.length < 2) {
    throw new Error('No data rows found in CSV (or file is empty).');
  }

  // Parse the header row.
  const headers = lines[0].split(';').map((h) => h.trim());
  console.log('[parseCSV] Headers:', headers);

  // Define required headers.
  const requiredHeaders = ['category', 'part_name', 'part_code', 'price (without VAT)'];

  // Check if all required headers are present.
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  // Define a helper to test allowed optional header patterns.
  const isAllowedOptional = (header) => {
    // Matches part_name_* where * is exactly two letters (e.g., part_name_en)
    if (/^part_name_[a-zA-Z]{2}$/.test(header)) return true;
    // Matches price_* where * is any non-empty string (e.g., price_premium)
    if (/^price_.+/.test(header)) return true;
    // Explicitly allow 'image'
    if (header === 'image') return true;
    return false;
  };

  // Log a warning for each header that is neither required nor allowed as optional.
  headers.forEach(header => {
    if (!requiredHeaders.includes(header) && !isAllowedOptional(header)) {
      console.warn(`[parseCSV] Warning: Unexpected header found: '${header}'`);
    }
  });

  // Parse each subsequent data row.
  const dataRows = lines.slice(1).map((line, idx) => {
    const values = line.split(';').map((v) => v.trim());
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] ?? '';
    });
    return obj;
  });

  return dataRows;
}
