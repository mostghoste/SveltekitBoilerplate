import { fail } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
  const supabase = locals.supabase;

  // Fetch categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .order('id', { ascending: true }); // Sort categories by id

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    return { categories: [] };
  }

  return {
    categories,
  };
};

/** @type {import('./$types').Actions} */
export const actions = {
  createProduct: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const formData = await request.formData();
    const partName = formData.get('part_name');
    const partCode = formData.get('part_code');
    const categoryId = formData.get('category_id'); // Use category ID
    const price = parseFloat(formData.get('price')) || 0.0; // Optional, default to 0.00
    const imageFile = formData.get('image');

    if (!partName || !partCode || !categoryId) {
      return fail(400, { error: 'Part name, part code, and category are required' });
    }

    let imageName = null;
    if (imageFile && imageFile.size > 0) {
      // Sanitize the image name and create a unique name
      const ext = imageFile.name.split('.').pop();
      imageName = `${uuidv4()}.${ext}`;

      // Upload the image to the Supabase storage bucket
      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(imageName, imageFile.stream(), {
          contentType: imageFile.type, // Set the content type
          duplex: 'half' // Explicitly set duplex option
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return fail(500, { error: 'Failed to upload image' });
      }
    }

    // Insert the new product into the database
    const { error: insertError } = await supabase
      .from('products')
      .insert({ part_name: partName, part_code: partCode, category_id: categoryId, image: imageName, price });

    if (insertError) {
      console.error('Error creating product:', insertError);
      return fail(500, { error: 'Failed to create product' });
    }

    return {
      success: true,
    };
  },
  updateImage: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const formData = await request.formData();
    const productId = formData.get('product_id');
    const imageFile = formData.get('image');

    if (!productId || !imageFile) {
      return fail(400, { error: 'Product ID and image are required' });
    }

    // Sanitize the image name and create a unique name
    const ext = imageFile.name.split('.').pop();
    const imageName = `${uuidv4()}.${ext}`;

    // Upload the image to the Supabase storage bucket
    const { error: uploadError } = await supabase.storage
      .from('product_images')
      .upload(imageName, imageFile.stream(), {
        contentType: imageFile.type,
        duplex: 'half', // Explicitly set duplex option
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return fail(500, { error: 'Failed to upload image' });
    }

    // Update the product with the new image name
    const { error: updateError } = await supabase
      .from('products')
      .update({ image: imageName })
      .eq('id', productId);

    if (updateError) {
      console.error('Error updating product image:', updateError);
      return fail(500, { error: 'Failed to update product image' });
    }

    return {
      success: true,
      imageName,
    };
  },
};
