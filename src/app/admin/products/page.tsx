'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { uploadProductImage } from '@/infrastructure/storage/supabase-client';
import { Package, Search, Edit2, X, UploadCloud, Loader2, CheckCircle2, ChevronDown, Star } from 'lucide-react';

// ─── Full Product Interface (matches database payload exactly) ───────────────

interface Review {
  rating: number;
  comment: string;
  reviewerName: string;
  date: string;
}

interface Dimensions {
  width: number;
  height: number;
  unit: string;
}

interface Product {
  sku: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  category: string;
  subcategory: string;
  gender: string;
  material: string;
  colors: string[];
  sizes: string[];
  inStock: boolean;
  stockCount: number;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  dimensions: Dimensions;
  shippingInformation: string;
  returnPolicy: string;
  tags: string[];
  imageUrl: string;
  description: string;
}

// ─── Styled Input Components ─────────────────────────────────────────────────

const inputClass = 'w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors';
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5';
const sectionTitleClass = 'text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Edit Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Array-as-string helper state for comma-separated inputs
  const [colorsStr, setColorsStr] = useState('');
  const [sizesStr, setSizesStr] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData(product);
    setColorsStr(Array.isArray(product.colors) ? product.colors.join(', ') : '');
    setSizesStr(Array.isArray(product.sizes) ? product.sizes.join(', ') : '');
    setTagsStr(Array.isArray(product.tags) ? product.tags.join(', ') : '');
    setImageFile(null);
    setSubmitSuccess(false);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedProduct(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handler for nested dimensions object
  const handleDimensionChange = (field: 'width' | 'height' | 'unit', value: string) => {
    setFormData(prev => ({
      ...prev,
      dimensions: {
        width: prev.dimensions?.width ?? 0,
        height: prev.dimensions?.height ?? 0,
        unit: prev.dimensions?.unit ?? 'cm',
        [field]: field === 'unit' ? value : Number(value),
      }
    }));
  };

  // Sync comma-separated strings back to arrays in formData
  const handleColorsChange = (val: string) => {
    setColorsStr(val);
    setFormData(prev => ({ ...prev, colors: val.split(',').map(s => s.trim()).filter(Boolean) }));
  };
  const handleSizesChange = (val: string) => {
    setSizesStr(val);
    setFormData(prev => ({ ...prev, sizes: val.split(',').map(s => s.trim()).filter(Boolean) }));
  };
  const handleTagsChange = (val: string) => {
    setTagsStr(val);
    setFormData(prev => ({ ...prev, tags: val.split(',').map(s => s.trim()).filter(Boolean) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    setIsSubmitting(true);
    try {
      let finalImageUrl = formData.imageUrl;

      // 1. Upload new image if selected
      if (imageFile) {
        finalImageUrl = await uploadProductImage(imageFile);
      }

      // 2. Submit to API
      const payload = {
        ...formData,
        imageUrl: finalImageUrl,
      };

      const res = await fetch(`/api/admin/products/${selectedProduct.sku}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to update product');
      }

      // 3. Handle success
      setSubmitSuccess(true);
      setTimeout(() => {
        closeEditModal();
        fetchProducts(); // Refresh list
      }, 1500);

    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update product. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200">
      {/* ── Sidebar ── */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" />
            Store Admin
          </h1>
        </div>
        <nav className="p-4 flex-1">
          <ul className="space-y-2">
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg font-medium border border-indigo-500/20">
                <Package className="w-4 h-4" />
                Products
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold text-white">Product Catalog</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search SKU or Name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64"
            />
          </div>
        </header>

        {/* Data Table Area */}
        <div className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Product</th>
                    <th className="px-6 py-4 font-medium">SKU</th>
                    <th className="px-6 py-4 font-medium">Category</th>
                    <th className="px-6 py-4 font-medium">Gender</th>
                    <th className="px-6 py-4 font-medium">Price</th>
                    <th className="px-6 py-4 font-medium">Stock</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredProducts.map(product => (
                    <tr key={product.sku} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-md overflow-hidden bg-slate-800 border border-slate-700">
                            {product.imageUrl ? (
                              <Image src={product.imageUrl} alt={product.name} fill sizes="48px" className="object-cover" />
                            ) : (
                              <Package className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white">{product.name}</div>
                            <div className="text-xs text-slate-500">{product.brand}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-400 text-xs">{product.sku}</td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300 text-xs">{product.category || '—'}</div>
                        {product.subcategory && (
                          <div className="text-slate-500 text-[10px]">{product.subcategory}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                          product.gender === 'Men' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          product.gender === 'Women' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' :
                          'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                        }`}>
                          {product.gender || 'Unisex'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">${product.price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.inStock ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {product.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                        {product.stockCount !== undefined && product.inStock && (
                          <span className="ml-2 text-[10px] text-slate-500">{product.stockCount} units</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openEditModal(product)}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No products found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Edit Modal Overlay ── */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/30">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Edit {selectedProduct.sku}
              </h3>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-white transition-colors p-1" disabled={isSubmitting}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {submitSuccess ? (
                <div className="flex flex-col items-center justify-center h-64 text-emerald-400">
                  <CheckCircle2 className="w-16 h-16 mb-4" />
                  <h4 className="text-xl font-medium text-white mb-2">Update Successful</h4>
                  <p className="text-slate-400 text-sm">Vectors re-embedded and cache cleared.</p>
                </div>
              ) : (
                <form id="edit-form" onSubmit={handleSubmit} className="space-y-8">
                  
                  {/* ═══ Section 1: Product Image ═══ */}
                  <div>
                    <div className={sectionTitleClass}>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      Product Image
                    </div>
                    <div className="flex items-start gap-6">
                      <div className="relative w-32 h-40 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                        {(imageFile ? URL.createObjectURL(imageFile) : formData.imageUrl) ? (
                          <Image 
                            src={imageFile ? URL.createObjectURL(imageFile) : (formData.imageUrl as string)} 
                            alt="Preview" 
                            fill 
                            sizes="128px"
                            className="object-cover" 
                          />
                        ) : (
                          <Package className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-800/30 hover:bg-slate-800 hover:border-indigo-500/50 transition-all">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
                            <p className="text-sm text-slate-400"><span className="font-semibold text-indigo-400">Click to upload</span> a new image</p>
                            <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</p>
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isSubmitting} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* ═══ Section 2: Core Info ═══ */}
                  <div>
                    <div className={sectionTitleClass}>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      Core Information
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Name</label>
                        <input type="text" name="name" required value={formData.name || ''} onChange={handleInputChange} className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>Brand</label>
                        <input type="text" name="brand" value={formData.brand || ''} onChange={handleInputChange} className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>SKU</label>
                        <input type="text" name="sku" value={formData.sku || ''} readOnly className={`${inputClass} opacity-50 cursor-not-allowed`} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className={labelClass}>Description</label>
                      <textarea name="description" rows={3} required value={formData.description || ''} onChange={handleInputChange} className={`${inputClass} resize-none`} disabled={isSubmitting} />
                    </div>
                  </div>

                  {/* ═══ Section 3: Pricing & Inventory ═══ */}
                  <div>
                    <div className={sectionTitleClass}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Pricing & Inventory
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className={labelClass}>Price</label>
                        <input type="number" name="price" step="0.01" required value={formData.price ?? 0} onChange={handleInputChange} className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>Currency</label>
                        <select name="currency" value={formData.currency || 'USD'} onChange={handleInputChange} className={inputClass} disabled={isSubmitting}>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="INR">INR</option>
                          <option value="JPY">JPY</option>
                          <option value="CAD">CAD</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Stock Count</label>
                        <input type="number" name="stockCount" min="0" value={formData.stockCount ?? 0} onChange={handleInputChange} className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-3 cursor-pointer py-2">
                          <input 
                            type="checkbox" 
                            name="inStock"
                            checked={formData.inStock || false} 
                            onChange={handleInputChange}
                            className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" 
                            disabled={isSubmitting}
                          />
                          <span className="text-sm font-medium text-slate-300">In Stock</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* ═══ Section 4: Classification ═══ */}
                  <div>
                    <div className={sectionTitleClass}>
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      Classification
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Category</label>
                        <input type="text" name="category" value={formData.category || ''} onChange={handleInputChange} placeholder="e.g. Apparel" className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>Subcategory</label>
                        <input type="text" name="subcategory" value={formData.subcategory || ''} onChange={handleInputChange} placeholder="e.g. T-Shirts" className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>Gender</label>
                        <select name="gender" value={formData.gender || 'Unisex'} onChange={handleInputChange} className={inputClass} disabled={isSubmitting}>
                          <option value="Men">Men</option>
                          <option value="Women">Women</option>
                          <option value="Unisex">Unisex</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ═══ Section 5: Product Specifications ═══ */}
                  <div>
                    <div className={sectionTitleClass}>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      Product Specifications
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Material</label>
                        <input type="text" name="material" value={formData.material || ''} onChange={handleInputChange} placeholder="e.g. 100% Cotton" className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>Colors <span className="text-slate-500 normal-case font-normal">(comma-separated)</span></label>
                        <input type="text" value={colorsStr} onChange={(e) => handleColorsChange(e.target.value)} placeholder="e.g. Black, White, Navy" className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>Sizes <span className="text-slate-500 normal-case font-normal">(comma-separated)</span></label>
                        <input type="text" value={sizesStr} onChange={(e) => handleSizesChange(e.target.value)} placeholder="e.g. S, M, L, XL" className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>Tags <span className="text-slate-500 normal-case font-normal">(comma-separated)</span></label>
                        <input type="text" value={tagsStr} onChange={(e) => handleTagsChange(e.target.value)} placeholder="e.g. casual, summer, basics" className={inputClass} disabled={isSubmitting} />
                      </div>
                    </div>
                  </div>

                  {/* ═══ Section 6: Dimensions ═══ */}
                  <div>
                    <div className={sectionTitleClass}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Dimensions
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Width</label>
                        <input type="number" min="0" value={formData.dimensions?.width ?? 0} onChange={(e) => handleDimensionChange('width', e.target.value)} className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>Height</label>
                        <input type="number" min="0" value={formData.dimensions?.height ?? 0} onChange={(e) => handleDimensionChange('height', e.target.value)} className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>Unit</label>
                        <select value={formData.dimensions?.unit ?? 'cm'} onChange={(e) => handleDimensionChange('unit', e.target.value)} className={inputClass} disabled={isSubmitting}>
                          <option value="cm">cm</option>
                          <option value="in">in</option>
                          <option value="mm">mm</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ═══ Section 7: Shipping & Returns ═══ */}
                  <div>
                    <div className={sectionTitleClass}>
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      Shipping & Returns
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Shipping Information</label>
                        <input type="text" name="shippingInformation" value={formData.shippingInformation || ''} onChange={handleInputChange} placeholder="e.g. Ships in 1-2 business days" className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>Return Policy</label>
                        <input type="text" name="returnPolicy" value={formData.returnPolicy || ''} onChange={handleInputChange} placeholder="e.g. 30 days free returns" className={inputClass} disabled={isSubmitting} />
                      </div>
                    </div>
                  </div>

                  {/* ═══ Section 8: Ratings & Reviews ═══ */}
                  <div>
                    <div className={sectionTitleClass}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Ratings & Reviews
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={labelClass}>Rating <span className="text-slate-500 normal-case font-normal">(0 – 5)</span></label>
                        <input type="number" name="rating" min="0" max="5" step="0.1" value={formData.rating ?? 0} onChange={handleInputChange} className={inputClass} disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className={labelClass}>Review Count</label>
                        <input type="number" name="reviewCount" min="0" value={formData.reviewCount ?? 0} onChange={handleInputChange} className={inputClass} disabled={isSubmitting} />
                      </div>
                    </div>
                    {/* Reviews Read-Only List */}
                    {formData.reviews && formData.reviews.length > 0 && (
                      <div>
                        <label className={labelClass}>Customer Reviews <span className="text-slate-500 normal-case font-normal">(read-only)</span></label>
                        <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/30 p-3">
                          {formData.reviews.map((review, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                              <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                                ))}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/70 truncate">{review.comment}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{review.reviewerName} · {new Date(review.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </form>
              )}
            </div>

            {/* Modal Footer */}
            {!submitSuccess && (
              <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeEditModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  form="edit-form"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Saving & Re-embedding...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
