import { NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database/mongodb-client';
import { getEmbedding } from '@/infrastructure/nvidia/nvidia-client';
import { UNIFIED_NODES_COLLECTION, SEMANTIC_CACHE_COLLECTION } from '@/config/constants';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    const { sku } = await params;
    if (!sku) {
      return NextResponse.json({ error: 'SKU is required' }, { status: 400 });
    }

    const payload = await request.json();
    const { name, brand, description, price, inStock, category, imageUrl } = payload;

    // Validate required fields
    if (!name || !description || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Construct the dense string for the vector embedding
    const safeBrand = brand || 'Unknown Brand';
    const safeCategory = category || 'Apparel';
    const denseString = `Brand: ${safeBrand}. Product: ${name}. Category: ${safeCategory}. Description: ${description}.`;

    // Generate new embeddings
    let embedding: number[];
    try {
      embedding = await getEmbedding(denseString, 'passage');
    } catch (err: any) {
      console.error('Failed to generate embedding:', err);
      return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
    }

    const db = await getDatabase();
    const collection = db.collection(UNIFIED_NODES_COLLECTION);

    // Prepare update document
    const updateDoc = {
      $set: {
        name,
        brand,
        description,
        price: Number(price),
        inStock: Boolean(inStock),
        imageUrl,
        embedding,
        updatedAt: new Date().toISOString(),
      },
    };

    // Perform the update
    const result = await collection.updateOne(
      { sku, type: 'product' },
      updateDoc
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Clear semantic cache to prevent stale AI answers
    const cacheCollection = db.collection(SEMANTIC_CACHE_COLLECTION);
    await cacheCollection.deleteMany({});

    return NextResponse.json({ 
      success: true, 
      message: 'Product updated successfully and semantic cache cleared',
      modifiedCount: result.modifiedCount
    });

  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
