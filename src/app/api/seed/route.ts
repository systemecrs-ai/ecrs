import { NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database/mongodb-client';
import { getEmbedding } from '@/infrastructure/nvidia/nvidia-client';
import { UNIFIED_NODES_COLLECTION } from '@/config/constants';

// 1. High-Resolution Base Catalog (Beautiful Unsplash Images)
const baseCatalog = [
  { brand: 'Everlane', name: 'Organic Cotton Crew', category: 'Apparel', subcategory: 'T-Shirts', gender: 'Unisex', price: 35, material: '100% Organic Cotton', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80', desc: 'A timeless, comfortable crew neck t-shirt engineered for everyday wear.' },
  { brand: 'Levi\'s', name: '501 Original Jeans', category: 'Apparel', subcategory: 'Jeans', gender: 'Men', price: 108, material: '100% Non-Stretch Denim', imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80', desc: 'The blueprint for all denim. Classic straight leg and iconic styling.' },
  { brand: 'Nike', name: 'Air Max 90', category: 'Footwear', subcategory: 'Sneakers', gender: 'Unisex', price: 130, material: 'Leather and Mesh', imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=800&q=80', desc: 'Lace up and feel the legacy. Featuring the iconic Waffle sole and Max Air cushioning.' },
  { brand: 'Lululemon', name: 'Align High-Rise Pant', category: 'Activewear', subcategory: 'Leggings', gender: 'Women', price: 98, material: 'Nulu™ Fabric', imageUrl: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=800&q=80', desc: 'Powered by weightless, buttery-soft Nulu fabric. Designed for yoga and low-impact movement.' },
  { brand: 'The North Face', name: 'Nuptse Puffer', category: 'Outerwear', subcategory: 'Jackets', gender: 'Unisex', price: 280, material: 'Ripstop Nylon & 700-Fill Down', imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80', desc: 'Built for extreme cold. The iconic Nuptse jacket features oversized baffles for unmatched warmth.' },
  { brand: 'Burberry', name: 'Heritage Trench Coat', category: 'Outerwear', subcategory: 'Coats', gender: 'Women', price: 1200, material: 'Cotton Gabardine', imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80', desc: 'The definitive luxury trench. Crafted in England featuring vintage check lining.' },
  { brand: 'Patagonia', name: 'Synchilla Snap-T', category: 'Outerwear', subcategory: 'Fleece', gender: 'Unisex', price: 129, material: 'Recycled Polyester', imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80', desc: 'The fleece that started it all. A warm, double-faced pullover with a classic snap placket.' },
  { brand: 'Vans', name: 'Classic Slip-On', category: 'Footwear', subcategory: 'Sneakers', gender: 'Unisex', price: 60, material: 'Canvas Upper', imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80', desc: 'No laces, no problems. Low profile canvas upper and signature rubber waffle outsoles.' },
  { brand: 'Zara', name: 'Oversized Linen Shirt', category: 'Apparel', subcategory: 'Shirts', gender: 'Women', price: 49.90, material: '100% Linen', imageUrl: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=800&q=80', desc: 'A breezy, lightweight linen shirt cut for an effortlessly relaxed fit.' },
  { brand: 'Uniqlo', name: 'Merino Wool V-Neck', category: 'Apparel', subcategory: 'Sweaters', gender: 'Men', price: 49.90, material: 'Extra Fine Merino Wool', imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80', desc: 'Woven from ultra-fine 19.5 micron merino wool for a glossy sheen and smooth feel.' },
  { brand: 'Adidas', name: 'Ultraboost Running Shoes', category: 'Footwear', subcategory: 'Sneakers', gender: 'Unisex', price: 190, material: 'Primeknit & Boost', imageUrl: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?auto=format&fit=crop&w=800&q=80', desc: 'Unmatched energy return. A responsive Boost midsole makes every step feel like walking on clouds.' },
  { brand: 'Champion', name: 'Reverse Weave Hoodie', category: 'Apparel', subcategory: 'Sweatshirts', gender: 'Unisex', price: 65, material: 'Heavyweight Cotton Fleece', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80', desc: 'Cut on the cross-grain to resist vertical shrinkage, this heavyweight hoodie gets softer with every wash.' },
];

const colors = ['Black', 'White', 'Navy Blue', 'Olive Green', 'Maroon', 'Heather Grey', 'Mustard Yellow', 'Beige'];
const sizes = ['S', 'M', 'L', 'XL'];

// 2. Mock Data Generators for Rich Schema
const generateMockReviews = () => {
  const reviews = [];
  const count = Math.floor(Math.random() * 5) + 1; // 1 to 5 reviews
  const comments = ["Great fit!", "A bit snug, size up.", "Amazing quality.", "Color faded after one wash.", "Perfect, exactly as described.", "Highly recommend!"];
  
  for(let i=0; i<count; i++) {
    reviews.push({
      rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars mostly
      comment: comments[Math.floor(Math.random() * comments.length)],
      reviewerName: `Customer_${Math.floor(Math.random() * 9999)}`,
      date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString()
    });
  }
  return reviews;
};

// 3. The Synthetic Factory Engine
function generateSyntheticCatalog() {
  const catalog: any[] = [];
  let skuCounter = 1;

  for (const base of baseCatalog) {
    for (const color of colors) {
      const sku = `SKU-${base.brand.substring(0,3).toUpperCase()}-${skuCounter.toString().padStart(4, '0')}`;
      const reviews = generateMockReviews();
      const avgRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;

      catalog.push({
        // --- 1. THE DATABASE PAYLOAD (Rich UI Data) ---
        type: 'product',
        sku: sku,
        name: `${base.name}`,
        brand: base.brand,
        price: base.price,
        currency: 'USD',
        category: base.category,
        subcategory: base.subcategory,
        gender: base.gender,
        material: base.material,
        colors: [color],
        sizes: sizes,
        inStock: Math.random() > 0.15, // 85% in stock
        stockCount: Math.floor(Math.random() * 150),
        rating: Number(avgRating.toFixed(1)),
        reviewCount: reviews.length + Math.floor(Math.random() * 200),
        reviews: reviews, // Array of mock review objects!
        dimensions: { width: Math.floor(Math.random()*10+10), height: Math.floor(Math.random()*20+15), unit: 'cm' },
        shippingInformation: 'Ships in 1-2 business days',
        returnPolicy: '30 days free returns',
        tags: [color.toLowerCase(), base.subcategory.toLowerCase(), base.gender.toLowerCase(), 'trending'],
        imageUrl: base.imageUrl,
        description: base.desc,
        
        // --- 2. THE VECTOR DENSE STRING (Clean text for the AI) ---
        textToEmbed: `Brand: ${base.brand}. Product: ${base.name}. Category: ${base.category} > ${base.subcategory}. Designed for: ${base.gender}. Color: ${color}. Material: ${base.material}. Features: ${base.desc}`
      });
      skuCounter++;
    }
  }
  return catalog;
}

export async function POST(req: Request) {
  try {
    const db = await getDatabase();
    const collection = db.collection(UNIFIED_NODES_COLLECTION);

    console.log('🧬 2. Generating Synthetic Catalog...');
    const products = generateSyntheticCatalog();
    console.log(`Generated exactly ${products.length} unique SKUs.`);

    console.log('🧠 3. Generating Vector Embeddings...');
    const productsToInsert = [];
    
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      console.log(`[${i+1}/${products.length}] Embedding: ${p.sku} (${p.colors[0]})`);
      
      // We embed ONLY the clean text string!
      const embedding = await getEmbedding(p.textToEmbed, 'passage');
      
      // Remove textToEmbed before saving to MongoDB to keep DB clean, add embedding
      const { textToEmbed, ...cleanPayload } = p;
      productsToInsert.push({ ...cleanPayload, embedding });
      
      // 250ms delay to prevent Nvidia API Rate Limiting (429 errors)
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    console.log('💾 4. Saving to MongoDB...');
    await collection.insertMany(productsToInsert);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully seeded ${productsToInsert.length} products with stunning images and rich metadata!`,
    });

  } catch (error: any) {
    console.error('Seeding failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}