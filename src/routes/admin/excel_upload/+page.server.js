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
    // Separate log arrays for info and developer levels.
    const infoLogs = [];
    const devLogs = [];

    // Dump formData entries for debugging
    for (const [key, val] of formData.entries()) {
      console.log(`[parseFile] formData: key="${key}", value="${val}"`);
    }

    const file = formData.get('file');

    // Check that a file was provided and it's not empty.
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

      // Get the parse result (an object with success and rows)
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

      infoLogs.push(`Parsed ${rows.length} rows successfully.`);
      devLogs.push(`Parsed ${rows.length} rows successfully.`);
      console.log(`[parseFile] Done. Rows: ${rows.length}`);
      // Return all parsed rows along with separate logs.
      return {
        success: true,
        previewRows: rows, // rows is now an array
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

  // Log detected optional headers.
  // Language groups: columns like part_name_ru, part_name_en, part_name_gb.
  const languageGroups = headers.filter(header => /^part_name_(ru|en|gb)$/i.test(header));
  devLogs.push(`[parseCSV] Detected language groups: ${JSON.stringify(languageGroups)}`);
  languageGroups.forEach(lang => {
    devLogs.push(`[parseCSV] Adding language group: ${lang}`);
  });
  // Customer groups: any column starting with price_
  const customerGroups = headers.filter(header => /^price_.+/i.test(header));
  devLogs.push(`[parseCSV] Detected customer groups: ${JSON.stringify(customerGroups)}`);
  customerGroups.forEach(group => {
    devLogs.push(`[parseCSV] Adding customer group: ${group}`);
  });

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
  let globalHasErrors = false; // flag if any row fails validation

  // Process each data line.
  lines.slice(1).forEach((line, idx) => {
    const rowNumber = idx + 2; // +2 because headers are on line 1
    const values = line.split(';').map((v) => v.trim());
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] ?? '';
    });

    // Validate row:
    const rowErrors = [];

    // 1. Required fields must be nonempty.
    requiredHeaders.forEach((r) => {
      if (!row[r] || row[r].trim() === '') {
        rowErrors.push(`Missing value for '${r}'`);
      }
    });

    // 2. Validate price: must be parsed as a double.
    const priceVal = row['price (without VAT)'];
    const parsedPrice = parseFloat(priceVal.replace(',', '.'));
    if (isNaN(parsedPrice)) {
      rowErrors.push(`Invalid price value '${priceVal}' in 'price (without VAT)'`);
    } else {
      // Save parsed number.
      row['price (without VAT)'] = parsedPrice;
    }

    // 3. Validate image: if provided, must end in .jpg, .jpeg, or .png.
    if (row['image'] && row['image'].trim() !== '') {
      if (!/\.(jpe?g|png)$/i.test(row['image'])) {
        rowErrors.push(
          `Invalid image format '${row['image']}'. Must end with .jpg, .jpeg, or .png`
        );
      }
    }

    // Log row errors if any.
    if (rowErrors.length > 0) {
      globalHasErrors = true;
      const errorMsg = `[parseCSV] [Error] Row ${rowNumber} failed validation: ${rowErrors.join('; ')}`;
      infoLogs.push(errorMsg);
      devLogs.push(errorMsg);
      // Attach errors to the row so the frontend can see them.
      row.errors = rowErrors;
    }

    devLogs.push(`[parseCSV] Parsed row ${rowNumber}: ${JSON.stringify(row)}`);

    // Filter row: keep only keys that are required or allowed optional.
    const filteredRow = {};
    Object.keys(row).forEach((key) => {
      if (requiredHeaders.includes(key) || isAllowedOptional(key)) {
        filteredRow[key] = row[key];
      }
    });
    // Attach errors if any.
    if (row.errors) {
      filteredRow.errors = row.errors;
    }

    dataRows.push(filteredRow);
  });

  // If any row had errors, mark the overall parse as failed.
  if (globalHasErrors) {
    const msg = `[parseCSV] Failed parse. One or more rows failed validation.`;
    infoLogs.push(msg);
    devLogs.push(msg);
    return { success: false, rows: dataRows, message: msg };
  }

  return { success: true, rows: dataRows };
}
