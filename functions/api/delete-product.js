/**
 * Cloudflare Pages Function: Delete Product
 * 
 * Handles deleting products from Firebase Storage product JSON files
 * Supports DELETE requests to /api/delete-product
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS, POST',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Allow both DELETE and POST requests for compatibility
  if (request.method !== 'DELETE' && request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Only DELETE and POST methods allowed'
      }),
      { status: 405, headers }
    );
  }

  try {
    // Parse request body
    const requestData = await request.json();
    const { productId, category } = requestData;

    if (!productId || !category) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Product ID and category are required'
        }),
        { status: 400, headers }
      );
    }

    console.log(`[DELETE-PRODUCT] Deleting product ${productId} from ${category} category...`);

    // Get Firebase configuration from environment
    const storageBucket = env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app';

    // Load existing products from Firebase Storage
    const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/productData%2F${category}-products.json?alt=media`;
    
    let existingProducts = [];
    try {
      const fileResponse = await fetch(storageUrl);
      if (!fileResponse.ok) {
        if (fileResponse.status === 404) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Product category file not found'
            }),
            { status: 404, headers }
          );
        }
        throw new Error(`Failed to load products: ${fileResponse.status}`);
      }
      existingProducts = await fileResponse.json();
    } catch (error) {
      console.error('[DELETE-PRODUCT] Error loading products:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to load products from storage',
          error: error.message
        }),
        { status: 500, headers }
      );
    }

    // Find the product to delete
    const productIndex = existingProducts.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Product not found'
        }),
        { status: 404, headers }
      );
    }

    const productToDelete = existingProducts[productIndex];
    console.log(`[DELETE-PRODUCT] Found product to delete: ${productToDelete.name}`);

    // Remove the product from the array
    existingProducts.splice(productIndex, 1);

    // Save updated product list back to Firebase Storage
    const updatedData = JSON.stringify(existingProducts, null, 2);
    
    // Use Firebase Storage REST API to upload
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/productData%2F${category}-products.json?uploadType=media`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: updatedData
    });

    if (!uploadResponse.ok) {
      console.error('[DELETE-PRODUCT] Failed to save products:', uploadResponse.status, await uploadResponse.text());
      throw new Error(`Failed to save updated products: ${uploadResponse.status}`);
    }

    console.log(`[DELETE-PRODUCT] Product ${productId} deleted successfully. Remaining: ${existingProducts.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Product "${productToDelete.name}" deleted successfully`,
        deletedProduct: {
          id: productToDelete.id,
          name: productToDelete.name,
          category: category
        },
        remainingCount: existingProducts.length
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('[DELETE-PRODUCT] Error deleting product:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to delete product'
      }),
      { status: 500, headers }
    );
  }
}
