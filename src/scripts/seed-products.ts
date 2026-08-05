import { MongoClient } from 'mongodb';
// import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';

// Bootstrap Next.js environment variables from the project root
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'ecrs_apparel';
const COLLECTION_NAME = 'unified_nodes';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in your environment variables.');
  process.exit(1);
}

// Helper to generate a 2048-dimensional embedding array
function generatePlaceholderEmbedding(): number[] {
  return Array.from({ length: 2048 }, () => Math.random() * 2 - 1);
}

export const mockProducts = [
  // --- T-SHIRTS & TOPS ---
  {
    sku: 'SKU-TEE-001',
    name: 'Classic Cotton Crew T-Shirt',
    brand: 'Everlane',
    price: 35.00,
    currency: 'USD',
    category: 'Apparel',
    subcategory: 'T-Shirts',
    gender: 'Unisex',
    material: '100% Cotton',
    inStock: true,
    rating: 4.8,
    reviewCount: 342,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'A timeless, comfortable crew neck t-shirt made from organic cotton.',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    tags: ['casual', 'summer', 'basics', 'crewneck'],
  },
  {
    sku: 'SKU-TEE-002',
    name: 'V-Neck Pima Cotton Tee',
    brand: 'Everlane',
    price: 38.00,
    currency: 'USD',
    category: 'Apparel',
    subcategory: 'T-Shirts',
    gender: 'Women',
    material: 'Pima Cotton',
    inStock: true,
    rating: 4.6,
    reviewCount: 198,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'Ultra-soft relaxed fit V-neck tee crafted from premium long-staple cotton.',
    imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80',
    tags: ['casual', 'basics', 'vneck'],
  },
  
  // --- PANTS & JOGGERS ---
  {
    sku: 'SKU-PNT-001',
    name: 'Athletic Performance Joggers',
    brand: 'Nike',
    price: 85.00,
    currency: 'USD',
    category: 'Apparel',
    subcategory: 'Pants',
    gender: 'Men',
    material: 'Polyester Blend',
    inStock: true,
    rating: 4.5,
    reviewCount: 890,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'Lightweight, moisture-wicking joggers perfect for training or lounging.',
    imageUrl: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=800&q=80',
    tags: ['athletic', 'workout', 'lounge', 'dri-fit'],
  },
  {
    sku: 'SKU-PNT-002',
    name: 'High-Rise Skinny Jeans',
    brand: 'Levi\'s',
    price: 98.00,
    currency: 'USD',
    category: 'Apparel',
    subcategory: 'Jeans',
    gender: 'Women',
    material: 'Denim',
    inStock: true,
    rating: 4.7,
    reviewCount: 1250,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'Flattering high-rise jeans with a perfect amount of stretch.',
    imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
    tags: ['denim', 'casual', 'everyday', 'skinny'],
  },
  {
    sku: 'SKU-PNT-003',
    name: '501 Original Fit Straight Jeans',
    brand: 'Levi\'s',
    price: 108.00,
    currency: 'USD',
    category: 'Apparel',
    subcategory: 'Jeans',
    gender: 'Men',
    material: '100% Denim Cotton',
    inStock: true,
    rating: 4.4,
    reviewCount: 3110,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'The historic classic straight leg jean with signature button fly.',
    imageUrl: 'https://vrfbakltqaupsrrjhrht.supabase.co/storage/v1/object/public/Products/501%20Original%20Fit%20Straight%20Jeans.jpg',
    tags: ['denim', 'classic', 'vintage'],
  },

  // --- SWEATERS & OUTERWEAR ---
  {
    sku: 'SKU-OUT-001',
    name: 'Merino Wool V-Neck Sweater',
    brand: 'Uniqlo',
    price: 49.90,
    currency: 'USD',
    category: 'Apparel',
    subcategory: 'Sweaters',
    gender: 'Men',
    material: '100% Merino Wool',
    inStock: true,
    rating: 4.9,
    reviewCount: 512,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'Extra fine merino wool sweater, ideal for layering.',
    imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80',
    tags: ['winter', 'layering', 'formal', 'wool'],
  },
  {
    sku: 'SKU-OUT-002',
    name: 'Waterproof Trench Coat',
    brand: 'Burberry',
    price: 1200.00,
    currency: 'USD',
    category: 'Outerwear',
    subcategory: 'Coats',
    gender: 'Women',
    material: 'Cotton Gabardine',
    inStock: true,
    rating: 4.9,
    reviewCount: 156,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'Iconic waterproof trench coat with vintage plaid heritage detailing.',
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80',
    tags: ['luxury', 'rain', 'outerwear', 'trench'],
  },
  {
    sku: 'SKU-OUT-003',
    name: 'Down-Insulated Puffer Jacket',
    brand: 'The North Face',
    price: 280.00,
    currency: 'USD',
    category: 'Outerwear',
    subcategory: 'Jackets',
    gender: 'Unisex',
    material: 'Nylon / Goose Down',
    inStock: true,
    rating: 4.8,
    reviewCount: 945,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'Ultra-warm winter puffer coat filled with 700-fill goose down insulation.',
    imageUrl: 'https://vrfbakltqaupsrrjhrht.supabase.co/storage/v1/object/public/Products/Down-Insulated%20Puffer%20Jacket.jpg',
    tags: ['winter', 'heavy', 'outdoor', 'cold'],
  },

  // --- ACTIVEWEAR ---
  {
    sku: 'SKU-ACT-001',
    name: 'Align High-Rise Yoga Pants',
    brand: 'Lululemon',
    price: 98.00,
    currency: 'USD',
    category: 'Activewear',
    subcategory: 'Leggings',
    gender: 'Women',
    material: 'Nulu Fabric Nylon Blend',
    inStock: true,
    rating: 4.9,
    reviewCount: 4210,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'Butter-soft weightless yoga pants engineered to feel like a second skin.',
    imageUrl: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=800&q=80',
    tags: ['yoga', 'workout', 'athleisure', 'soft'],
  },
  {
    sku: 'SKU-ACT-002',
    name: 'Pace Breaker Athletic Shorts',
    brand: 'Lululemon',
    price: 68.00,
    currency: 'USD',
    category: 'Activewear',
    subcategory: 'Shorts',
    gender: 'Men',
    material: 'Recycled Polyester Blend',
    inStock: true,
    rating: 4.5,
    reviewCount: 612,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'Lightweight running and training shorts featuring sweat-wicking multi-way stretch.',
    imageUrl: 'https://vrfbakltqaupsrrjhrht.supabase.co/storage/v1/object/public/Products/Pace%20Breaker%20Athletic%20Shorts.jpg',
    tags: ['running', 'gym', 'shorts', 'breathable'],
  },

  // --- FOOTWEAR & SNEAKERS ---
  {
    sku: 'SKU-FTR-001',
    name: 'Air Max 90 Lifestyle Sneakers',
    brand: 'Nike',
    price: 130.00,
    currency: 'USD',
    category: 'Footwear',
    subcategory: 'Sneakers',
    gender: 'Unisex',
    material: 'Leather/Mesh Upper',
    inStock: true,
    rating: 4.7,
    reviewCount: 2340,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'Classic retro running shoe design with visible Air cushioning unit inside heel.',
    imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=800&q=80',
    tags: ['sneakers', 'streetwear', 'retro', 'cushion'],
  },
  {
    sku: 'SKU-FTR-002',
    name: 'Stan Smith Sustainable Shoes',
    brand: 'Puma',
    price: 100.00,
    currency: 'USD',
    category: 'Footwear',
    subcategory: 'Sneakers',
    gender: 'Unisex',
    material: 'Synthetic Eco Leather',
    inStock: false,
    rating: 4.4,
    reviewCount: 1890,
    embedding: generatePlaceholderEmbedding(),
    type : "product",
    description: 'Minimalist clean white tennis sneaker finished with iconic green heel tab accents.',
    imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80',
    tags: ['sneakers', 'minimalist', 'classic', 'white'],
  },
];


async function seedProducts() {
  console.log('🚀 Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log(`🧹 Clearing existing elements in "${COLLECTION_NAME}" collection...`);
    await collection.deleteMany({});

    console.log(`🌱 Seeding ${mockProducts.length} high-fidelity products into database...`);
    const result = await collection.insertMany(mockProducts);
    
    console.log(`✅ Successfully inserted ${result.insertedCount} items.`);

    console.log('\n======================================================');
    console.log('   IMPORTANT: ATLAS SEARCH INDEX CONFIGURATION REQUIRED   ');
    console.log('======================================================\n');
    console.log('Ensure the following index configuration maps precisely in your Atlas console:\n');
    
    console.log('1. HYBRID SEARCH VECTOR ROUTE (HNSW)');
    console.log('   Index Name: product_vector_index');
    console.log(`   JSON Map:
    {
      "fields": [
        {
          "numDimensions": 2048,
          "path": "embedding",
          "similarity": "cosine",
          "type": "vector"
        }
      ]
    }`);

    console.log('\n2. HYBRID SEARCH TEXT ROUTE (BM25 Inverted Index)');
    console.log('   Index Name: product_text_index');
    console.log(`   JSON Map:
    {
      "mappings": {
        "dynamic": false,
        "fields": {
          "sku": { "type": "string" },
          "name": { "type": "string" },
          "brand": { "type": "string" },
          "category": { "type": "string" },
          "subcategory": { "type": "string" },
          "tags": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    }`);
    console.log('\n======================================================\n');

  } catch (error) {
    console.error('❌ Error executing database seeding process:', error);
  } finally {
    await client.close();
    console.log('🔌 Database connection pool closed safely.');
  }
}

seedProducts().catch(console.error);