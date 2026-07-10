/**
 * Product Data Seeding Script
 * 
 * Seeds MongoDB Atlas with sample apparel products and generates
 * embeddings for each product via the Nvidia NIM API.
 * 
 * Usage:
 *   npx tsx scripts/seed-products.ts
 * 
 * Prerequisites:
 *   - .env.local with MONGODB_URI and NVIDIA_API_KEY configured
 *   - MongoDB Atlas cluster with vector search index configured
 * 
 * Atlas Vector Search Index Configuration:
 * Create an index named "product_vector_index" with the following JSON:
 * {
 *   "fields": [
 *     {
 *       "type": "vector",
 *       "path": "embedding",
 *       "numDimensions": 1024,
 *       "similarity": "cosine"
 *     },
 *     { "type": "filter", "path": "category" },
 *     { "type": "filter", "path": "gender" },
 *     { "type": "filter", "path": "inStock" },
 *     { "type": "filter", "path": "price" }
 *   ]
 * }
 * 
 * @module scripts/seed-products
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local before any other imports
config({ path: resolve(process.cwd(), '.env.local') });

import { MongoClient } from 'mongodb';
import type { ProductSeedData } from '../src/core/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const COLLECTION_NAME = 'products';
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY!;
const NVIDIA_EMBED_MODEL = process.env.NVIDIA_EMBED_MODEL || 'nvidia/llama-nemotron-embed-1b-v2';
const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'ecrs_apparel';

// ─── Sample Apparel Products ────────────────────────────────────────────────

const PRODUCTS: ProductSeedData[] = [
  {
    name: "Classic Fit Oxford Button-Down Shirt",
    description: "A timeless oxford cloth button-down shirt crafted from premium 100% cotton. Features a classic fit silhouette, button-down collar, and chest pocket. Perfect for business casual or smart weekend outfits.",
    category: "Shirts",
    subcategory: "Dress Shirts",
    brand: "Brooks & Co",
    price: 68.00,
    currency: "USD",
    colors: ["White", "Light Blue", "Pink", "Navy"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    material: "100% Cotton Oxford Cloth",
    gender: "men",
    imageUrl: "/images/oxford-shirt.jpg",
    inStock: true,
    rating: 4.5,
    reviewCount: 342,
    tags: ["formal", "business-casual", "classic", "cotton", "button-down"]
  },
  {
    name: "Floral Wrap Midi Dress",
    description: "A stunning floral print wrap dress in lightweight georgette fabric. Features a flattering V-neckline, adjustable wrap tie, and flowing midi-length skirt. Ideal for garden parties, brunches, and summer dates.",
    category: "Dresses",
    subcategory: "Midi Dresses",
    brand: "Petale",
    price: 89.00,
    currency: "USD",
    colors: ["Rose Garden", "Sage Botanical", "Midnight Bloom"],
    sizes: ["XS", "S", "M", "L", "XL"],
    material: "100% Polyester Georgette",
    gender: "women",
    imageUrl: "/images/floral-dress.jpg",
    inStock: true,
    rating: 4.7,
    reviewCount: 218,
    tags: ["summer", "floral", "wrap-dress", "midi", "elegant"]
  },
  {
    name: "Performance Running Shorts",
    description: "Ultra-lightweight running shorts with built-in compression liner. Features moisture-wicking DryFit technology, reflective accents for night runs, and a zippered back pocket for keys and cards.",
    category: "Activewear",
    subcategory: "Shorts",
    brand: "AeroStride",
    price: 42.00,
    currency: "USD",
    colors: ["Black", "Navy", "Storm Grey", "Neon Green"],
    sizes: ["S", "M", "L", "XL"],
    material: "88% Polyester, 12% Spandex",
    gender: "unisex",
    imageUrl: "/images/running-shorts.jpg",
    inStock: true,
    rating: 4.6,
    reviewCount: 567,
    tags: ["running", "athletic", "moisture-wicking", "performance", "gym"]
  },
  {
    name: "Cashmere Crew Neck Sweater",
    description: "Luxuriously soft 100% Grade-A Mongolian cashmere sweater with a relaxed crew neck. Fine-gauge knit for a smooth, lightweight feel. Perfect layering piece for fall and winter.",
    category: "Sweaters",
    subcategory: "Crew Neck",
    brand: "Maison Laine",
    price: 195.00,
    currency: "USD",
    colors: ["Camel", "Charcoal", "Ivory", "Burgundy", "Forest Green"],
    sizes: ["XS", "S", "M", "L", "XL"],
    material: "100% Grade-A Mongolian Cashmere",
    gender: "unisex",
    imageUrl: "/images/cashmere-sweater.jpg",
    inStock: true,
    rating: 4.8,
    reviewCount: 156,
    tags: ["luxury", "cashmere", "winter", "layering", "premium"]
  },
  {
    name: "High-Rise Sculpt Leggings",
    description: "Body-sculpting high-rise leggings with four-way stretch and compression technology. Features a hidden waistband pocket, flat seams to prevent chafing, and squat-proof opacity. From yoga studio to coffee shop.",
    category: "Activewear",
    subcategory: "Leggings",
    brand: "FlexForm",
    price: 64.00,
    currency: "USD",
    colors: ["Black", "Deep Navy", "Olive", "Plum", "Rust"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    material: "75% Nylon, 25% Spandex",
    gender: "women",
    imageUrl: "/images/sculpt-leggings.jpg",
    inStock: true,
    rating: 4.7,
    reviewCount: 891,
    tags: ["workout", "yoga", "compression", "squat-proof", "activewear"]
  },
  {
    name: "Slim Fit Stretch Chinos",
    description: "Modern slim fit chinos with just the right amount of stretch for all-day comfort. Garment-washed for a lived-in feel. Features a zip fly, button closure, and classic five-pocket styling.",
    category: "Pants",
    subcategory: "Chinos",
    brand: "Urban Thread",
    price: 56.00,
    currency: "USD",
    colors: ["Khaki", "Navy", "Olive", "Stone", "Slate Blue"],
    sizes: ["28", "30", "32", "34", "36", "38"],
    material: "98% Cotton, 2% Elastane",
    gender: "men",
    imageUrl: "/images/chinos.jpg",
    inStock: true,
    rating: 4.4,
    reviewCount: 423,
    tags: ["business-casual", "slim-fit", "stretch", "chinos", "everyday"]
  },
  {
    name: "Oversized Linen Blazer",
    description: "An effortlessly chic oversized blazer in breathable pure linen. Features a relaxed drop-shoulder silhouette, single-button closure, and patch pockets. The perfect smart-casual layering piece for warm weather.",
    category: "Outerwear",
    subcategory: "Blazers",
    brand: "Atelier Moderne",
    price: 145.00,
    currency: "USD",
    colors: ["Sand", "White", "Pale Blue", "Sage"],
    sizes: ["XS", "S", "M", "L"],
    material: "100% European Linen",
    gender: "women",
    imageUrl: "/images/linen-blazer.jpg",
    inStock: true,
    rating: 4.6,
    reviewCount: 89,
    tags: ["blazer", "linen", "summer", "smart-casual", "oversized"]
  },
  {
    name: "Retro High-Top Canvas Sneakers",
    description: "Vintage-inspired high-top sneakers with vulcanized rubber sole and heavy-duty canvas upper. Features classic toe cap, metal eyelets, and cushioned insole. A street-style staple since 1965.",
    category: "Footwear",
    subcategory: "Sneakers",
    brand: "Heritage Kicks",
    price: 75.00,
    currency: "USD",
    colors: ["Classic White", "Black", "Red", "Navy", "Olive Drab"],
    sizes: ["6", "7", "8", "9", "10", "11", "12", "13"],
    material: "Canvas Upper, Rubber Sole",
    gender: "unisex",
    imageUrl: "/images/high-top-sneakers.jpg",
    inStock: true,
    rating: 4.5,
    reviewCount: 1204,
    tags: ["sneakers", "casual", "retro", "street-style", "canvas"]
  },
  {
    name: "Quilted Puffer Jacket",
    description: "Warm yet lightweight quilted puffer jacket filled with responsibly sourced 700-fill-power down. Features a detachable hood, two-way zip, and elastic cuffs. Packs down into its own pocket for travel.",
    category: "Outerwear",
    subcategory: "Jackets",
    brand: "NordShield",
    price: 189.00,
    currency: "USD",
    colors: ["Matte Black", "Deep Forest", "Burgundy", "Midnight Blue"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    material: "Recycled Nylon Shell, 700-Fill Down",
    gender: "unisex",
    imageUrl: "/images/puffer-jacket.jpg",
    inStock: true,
    rating: 4.8,
    reviewCount: 312,
    tags: ["winter", "puffer", "down-jacket", "warmth", "packable"]
  },
  {
    name: "Silk Camisole Top",
    description: "Delicate silk camisole with adjustable spaghetti straps and a subtle V-neckline. Made from lustrous 100% mulberry silk with French seam finishing. Layer under blazers or wear solo for elegant evenings.",
    category: "Tops",
    subcategory: "Camisoles",
    brand: "Soie Studio",
    price: 82.00,
    currency: "USD",
    colors: ["Champagne", "Black", "Dusty Rose", "Ivory"],
    sizes: ["XS", "S", "M", "L"],
    material: "100% Mulberry Silk",
    gender: "women",
    imageUrl: "/images/silk-camisole.jpg",
    inStock: true,
    rating: 4.6,
    reviewCount: 167,
    tags: ["silk", "elegant", "evening", "layering", "premium"]
  },
  {
    name: "Selvedge Denim Jeans",
    description: "Premium Japanese selvedge denim jeans with a straight-leg cut. Made on vintage shuttle looms for an authentic, textured weave. Raw unwashed denim that develops a unique patina over time.",
    category: "Pants",
    subcategory: "Jeans",
    brand: "Indigo Craft",
    price: 148.00,
    currency: "USD",
    colors: ["Raw Indigo", "Washed Black"],
    sizes: ["28", "30", "32", "34", "36"],
    material: "14oz Japanese Selvedge Denim",
    gender: "men",
    imageUrl: "/images/selvedge-jeans.jpg",
    inStock: true,
    rating: 4.7,
    reviewCount: 203,
    tags: ["denim", "selvedge", "premium", "raw-denim", "japanese"]
  },
  {
    name: "Bamboo Fiber Essential T-Shirt",
    description: "Ultra-soft everyday t-shirt made from sustainable bamboo viscose blend. Naturally temperature-regulating, hypoallergenic, and odor-resistant. The perfect minimalist wardrobe staple.",
    category: "Tops",
    subcategory: "T-Shirts",
    brand: "EcoBasics",
    price: 34.00,
    currency: "USD",
    colors: ["White", "Black", "Heather Grey", "Navy", "Sage", "Terracotta"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    material: "70% Bamboo Viscose, 30% Organic Cotton",
    gender: "unisex",
    imageUrl: "/images/bamboo-tshirt.jpg",
    inStock: true,
    rating: 4.5,
    reviewCount: 678,
    tags: ["sustainable", "bamboo", "basics", "everyday", "eco-friendly"]
  },
  {
    name: "Tailored Wool Trousers",
    description: "Impeccably tailored trousers in fine Italian virgin wool. Featuring a mid-rise waist, straight leg, and pressed front crease. Fully lined for comfort. Perfect for the modern professional wardrobe.",
    category: "Pants",
    subcategory: "Dress Pants",
    brand: "Sartoria Milano",
    price: 175.00,
    currency: "USD",
    colors: ["Charcoal", "Navy", "Black", "Light Grey"],
    sizes: ["28", "30", "32", "34", "36", "38"],
    material: "100% Italian Virgin Wool",
    gender: "men",
    imageUrl: "/images/wool-trousers.jpg",
    inStock: true,
    rating: 4.7,
    reviewCount: 134,
    tags: ["formal", "tailored", "wool", "professional", "italian"]
  },
  {
    name: "Ribbed Knit Turtleneck",
    description: "Cozy ribbed knit turtleneck in a soft merino wool blend. Slim fit with a fold-over neck and extended cuffs. A winter essential that pairs beautifully with everything from jeans to tailored trousers.",
    category: "Sweaters",
    subcategory: "Turtleneck",
    brand: "Nordic Knits",
    price: 79.00,
    currency: "USD",
    colors: ["Cream", "Black", "Camel", "Deep Red", "Forest Green"],
    sizes: ["XS", "S", "M", "L", "XL"],
    material: "80% Merino Wool, 20% Nylon",
    gender: "unisex",
    imageUrl: "/images/turtleneck.jpg",
    inStock: true,
    rating: 4.6,
    reviewCount: 245,
    tags: ["winter", "turtleneck", "merino", "knit", "layering"]
  },
  {
    name: "Satin Slip Midi Skirt",
    description: "Elegant bias-cut satin slip skirt in a flattering midi length. Features a concealed elastic waistband for a smooth silhouette. Flows beautifully with movement. Dress up with heels or down with sneakers.",
    category: "Skirts",
    subcategory: "Midi Skirts",
    brand: "Soie Studio",
    price: 72.00,
    currency: "USD",
    colors: ["Champagne", "Black", "Emerald", "Burgundy"],
    sizes: ["XS", "S", "M", "L"],
    material: "100% Polyester Satin",
    gender: "women",
    imageUrl: "/images/satin-skirt.jpg",
    inStock: true,
    rating: 4.5,
    reviewCount: 189,
    tags: ["elegant", "satin", "midi", "versatile", "evening"]
  },
  {
    name: "Waterproof Trail Running Shoes",
    description: "All-terrain trail running shoes with Gore-Tex waterproof membrane. Features aggressive Vibram outsole grip, rock plate protection, and responsive cushioning. Conquer any trail in any weather.",
    category: "Footwear",
    subcategory: "Athletic Shoes",
    brand: "TrailBeast",
    price: 159.00,
    currency: "USD",
    colors: ["Shadow Black/Orange", "Moss Green/Tan", "Navy/Silver"],
    sizes: ["7", "8", "9", "10", "11", "12", "13"],
    material: "Synthetic Mesh, Gore-Tex, Vibram Sole",
    gender: "unisex",
    imageUrl: "/images/trail-shoes.jpg",
    inStock: true,
    rating: 4.8,
    reviewCount: 456,
    tags: ["trail-running", "waterproof", "outdoor", "hiking", "gore-tex"]
  },
  {
    name: "Relaxed Linen Shirt",
    description: "Breezy relaxed-fit linen shirt perfect for hot summer days. Features a camp collar, chest pocket, and coconut shell buttons. Garment-dyed for a lived-in, vacation-ready look.",
    category: "Shirts",
    subcategory: "Casual Shirts",
    brand: "Côte d'Azur",
    price: 58.00,
    currency: "USD",
    colors: ["Sky Blue", "White", "Sage", "Terracotta", "Sand"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    material: "100% French Linen",
    gender: "men",
    imageUrl: "/images/linen-shirt.jpg",
    inStock: true,
    rating: 4.4,
    reviewCount: 298,
    tags: ["summer", "linen", "casual", "vacation", "resort"]
  },
  {
    name: "Sports Bra - High Impact",
    description: "Engineered high-impact sports bra with encapsulated support technology. Features moisture-wicking fabric, mesh back panel for ventilation, and adjustable straps. Rated for running, HIIT, and CrossFit.",
    category: "Activewear",
    subcategory: "Sports Bras",
    brand: "FlexForm",
    price: 48.00,
    currency: "USD",
    colors: ["Black", "White", "Coral", "Slate"],
    sizes: ["XS", "S", "M", "L", "XL"],
    material: "85% Nylon, 15% Elastane",
    gender: "women",
    imageUrl: "/images/sports-bra.jpg",
    inStock: true,
    rating: 4.7,
    reviewCount: 534,
    tags: ["sports-bra", "high-impact", "running", "gym", "support"]
  },
  {
    name: "Leather Chelsea Boots",
    description: "Handcrafted Italian leather Chelsea boots with elastic side panels and pull tab. Features a Goodyear welted construction, leather lining, and rubber-studded sole. Built to last a lifetime.",
    category: "Footwear",
    subcategory: "Boots",
    brand: "Artisan & Co",
    price: 225.00,
    currency: "USD",
    colors: ["Cognac", "Black", "Dark Brown"],
    sizes: ["7", "8", "9", "10", "11", "12"],
    material: "Full-Grain Italian Leather",
    gender: "men",
    imageUrl: "/images/chelsea-boots.jpg",
    inStock: true,
    rating: 4.8,
    reviewCount: 178,
    tags: ["boots", "leather", "italian", "handcrafted", "chelsea"]
  },
  {
    name: "Wide-Leg Palazzo Pants",
    description: "Flowing wide-leg palazzo pants in lightweight crepe fabric. Features a comfortable high-rise elastic waist, side pockets, and dramatic wide-leg silhouette. Effortlessly chic for both office and weekend.",
    category: "Pants",
    subcategory: "Wide Leg",
    brand: "Atelier Moderne",
    price: 88.00,
    currency: "USD",
    colors: ["Black", "Ivory", "Navy", "Terracotta"],
    sizes: ["XS", "S", "M", "L", "XL"],
    material: "95% Polyester, 5% Elastane Crepe",
    gender: "women",
    imageUrl: "/images/palazzo-pants.jpg",
    inStock: true,
    rating: 4.5,
    reviewCount: 267,
    tags: ["wide-leg", "palazzo", "elegant", "office", "comfortable"]
  },
  {
    name: "Graphic Print Hoodie",
    description: "Premium heavyweight hoodie with exclusive artist-collaboration graphic print. Made from brushed French terry cotton, featuring a kangaroo pocket, ribbed cuffs, and adjustable drawstring hood.",
    category: "Sweaters",
    subcategory: "Hoodies",
    brand: "StreetVault",
    price: 85.00,
    currency: "USD",
    colors: ["Washed Black", "Vintage White", "Sage Green"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    material: "100% Organic French Terry Cotton",
    gender: "unisex",
    imageUrl: "/images/graphic-hoodie.jpg",
    inStock: true,
    rating: 4.6,
    reviewCount: 445,
    tags: ["streetwear", "hoodie", "graphic", "casual", "organic-cotton"]
  },
  {
    name: "Pleated Tennis Skirt",
    description: "Classic pleated tennis skirt with built-in shorts and ball pocket. Lightweight, breathable fabric with UPF 50+ sun protection. From the court to brunch — athleisure at its finest.",
    category: "Skirts",
    subcategory: "Mini Skirts",
    brand: "AeroStride",
    price: 52.00,
    currency: "USD",
    colors: ["White", "Black", "Blush Pink", "Lavender"],
    sizes: ["XS", "S", "M", "L", "XL"],
    material: "92% Polyester, 8% Spandex",
    gender: "women",
    imageUrl: "/images/tennis-skirt.jpg",
    inStock: true,
    rating: 4.5,
    reviewCount: 312,
    tags: ["tennis", "athleisure", "sporty", "pleated", "active"]
  },
  {
    name: "Heavyweight Flannel Shirt",
    description: "Rugged heavyweight flannel shirt in classic buffalo check. Brushed both sides for supreme softness. Features reinforced elbow patches, dual chest pockets, and adjustable cuffs. A cold-weather essential.",
    category: "Shirts",
    subcategory: "Casual Shirts",
    brand: "Timber & Co",
    price: 65.00,
    currency: "USD",
    colors: ["Red/Black Check", "Green/Navy Check", "Grey/White Check"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    material: "100% Brushed Cotton Flannel",
    gender: "men",
    imageUrl: "/images/flannel-shirt.jpg",
    inStock: true,
    rating: 4.5,
    reviewCount: 387,
    tags: ["flannel", "winter", "casual", "plaid", "rugged"]
  },
  {
    name: "Structured Crossbody Bag",
    description: "Minimalist structured crossbody bag in premium pebbled leather. Features adjustable strap, magnetic closure, interior zip pocket, and card slots. Compact yet fits phone, wallet, and essentials.",
    category: "Accessories",
    subcategory: "Bags",
    brand: "Maison Laine",
    price: 135.00,
    currency: "USD",
    colors: ["Black", "Tan", "Sage", "Burgundy"],
    sizes: ["One Size"],
    material: "Full-Grain Pebbled Leather",
    gender: "women",
    imageUrl: "/images/crossbody-bag.jpg",
    inStock: true,
    rating: 4.7,
    reviewCount: 201,
    tags: ["bag", "leather", "crossbody", "minimalist", "everyday"]
  },
  {
    name: "UV Protection Swim Shorts",
    description: "Quick-drying swim shorts with UPF 50+ sun protection and built-in mesh liner. Features an elastic waistband with drawstring, side pockets, and back zip pocket. From beach to bar effortlessly.",
    category: "Activewear",
    subcategory: "Swimwear",
    brand: "Côte d'Azur",
    price: 45.00,
    currency: "USD",
    colors: ["Navy", "Coral", "Tropical Print", "Olive"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    material: "100% Recycled Polyester",
    gender: "men",
    imageUrl: "/images/swim-shorts.jpg",
    inStock: true,
    rating: 4.4,
    reviewCount: 189,
    tags: ["swim", "beach", "summer", "quick-dry", "sustainable"]
  },
];

// ─── Embedding Generation ───────────────────────────────────────────────────

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${NVIDIA_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: NVIDIA_EMBED_MODEL,
      input_type: 'passage',
      encoding_format: 'float',
      truncate: 'END',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Builds a rich text representation of a product for embedding.
 * This captures all searchable attributes in a natural language format.
 */
function buildProductText(product: ProductSeedData): string {
  return [
    product.name,
    product.description,
    `Category: ${product.category} - ${product.subcategory}`,
    `Brand: ${product.brand}`,
    `Material: ${product.material}`,
    `Colors: ${product.colors.join(', ')}`,
    `For: ${product.gender}`,
    `Price: $${product.price}`,
    `Tags: ${product.tags.join(', ')}`,
  ].join('. ');
}

// ─── Main Seeding Function ──────────────────────────────────────────────────

async function seedProducts() {
  console.log('🚀 Starting product seeding...\n');

  // Validate env vars
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set. Please configure .env.local');
    process.exit(1);
  }
  if (!NVIDIA_API_KEY) {
    console.error('❌ NVIDIA_API_KEY is not set. Please configure .env.local');
    process.exit(1);
  }

  // Connect to MongoDB
  console.log('📦 Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  // Clear existing products
  const deleteResult = await collection.deleteMany({});
  console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing products\n`);

  // Process each product
  console.log(`📝 Processing ${PRODUCTS.length} products...\n`);

  const productsWithEmbeddings = [];
  const batchDelay = 1500; // 1.5s between requests to respect rate limits

  for (let i = 0; i < PRODUCTS.length; i++) {
    const product = PRODUCTS[i];
    const productText = buildProductText(product);

    try {
      console.log(`  [${i + 1}/${PRODUCTS.length}] Embedding: ${product.name}...`);
      const embedding = await generateEmbedding(productText);

      productsWithEmbeddings.push({
        ...product,
        embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`  ✅ Done (${embedding.length} dimensions)\n`);
    } catch (error) {
      console.error(`  ❌ Failed: ${(error as Error).message}`);
      console.log(`  ⏳ Waiting 5s before retrying...`);
      await sleep(5000);

      // Retry once
      try {
        const embedding = await generateEmbedding(productText);
        productsWithEmbeddings.push({
          ...product,
          embedding,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`  ✅ Retry successful\n`);
      } catch (retryError) {
        console.error(`  ❌ Retry failed: ${(retryError as Error).message}. Skipping.\n`);
        continue;
      }
    }

    // Rate limit protection
    if (i < PRODUCTS.length - 1) {
      await sleep(batchDelay);
    }
  }

  // Insert all products
  if (productsWithEmbeddings.length > 0) {
    console.log(`\n📥 Inserting ${productsWithEmbeddings.length} products into MongoDB...`);
    const insertResult = await collection.insertMany(productsWithEmbeddings);
    console.log(`✅ Inserted ${insertResult.insertedCount} products\n`);
  }

  // Print summary
  console.log('━'.repeat(50));
  console.log('📊 Seeding Summary:');
  console.log(`   Total products:   ${PRODUCTS.length}`);
  console.log(`   Successfully embedded: ${productsWithEmbeddings.length}`);
  console.log(`   Failed:           ${PRODUCTS.length - productsWithEmbeddings.length}`);
  console.log(`   Database:         ${MONGODB_DB_NAME}`);
  console.log(`   Collection:       ${COLLECTION_NAME}`);
  console.log('━'.repeat(50));

  console.log('\n⚠️  IMPORTANT: Create a Vector Search Index in MongoDB Atlas:');
  console.log('   Index Name: product_vector_index');
  console.log('   Collection: products');
  console.log('   Configuration:');
  console.log('   {');
  console.log('     "fields": [');
  console.log('       {');
  console.log('         "type": "vector",');
  console.log('         "path": "embedding",');
  console.log('         "numDimensions": 1024,');
  console.log('         "similarity": "cosine"');
  console.log('       },');
  console.log('       { "type": "filter", "path": "category" },');
  console.log('       { "type": "filter", "path": "gender" },');
  console.log('       { "type": "filter", "path": "inStock" },');
  console.log('       { "type": "filter", "path": "price" }');
  console.log('     ]');
  console.log('   }');

  await client.close();
  console.log('\n✅ Seeding complete! MongoDB connection closed.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Execute ────────────────────────────────────────────────────────────────

seedProducts().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
