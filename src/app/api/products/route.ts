import { NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database/mongodb-client';
import { UNIFIED_NODES_COLLECTION } from '@/config/constants';

export async function GET() {
  try {
    const db = await getDatabase();
    const collection = db.collection(UNIFIED_NODES_COLLECTION);

    // Fetch all products, excluding the vector embeddings to save bandwidth
    const products = await collection.find(
      { type: 'product' },
      { projection: { embedding: 0 } } // Do not send dense vectors to the frontend!
    ).toArray();

    // Map _id to string and pass through all product fields except internal DB/vector fields
    const formattedProducts = products.map((p: any) => {
      const { _id, type, embedding, ...productFields } = p;
      return {
        ...productFields,
        currency: p.currency || 'USD',
      };
    });

    return NextResponse.json({ products: formattedProducts });
  } catch (error: any) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}