'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { uploadProductImage } from '@/infrastructure/storage/supabase-client';
import { Package, Search, Edit2, X, UploadCloud, Loader2, CheckCircle2 } from 'lucide-react';

interface Product {
  sku: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  inStock: boolean;
  brand: string;
  currency: string;
  category?: string;
}

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
                    <th className="px-6 py-4 font-medium">Price</th>
                    <th className="px-6 py-4 font-medium">Stock Status</th>
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
                      <td className="px-6 py-4 font-medium">${product.price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.inStock ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {product.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
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
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
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
                <form id="edit-form" onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Image Upload Area */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Product Image</label>
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

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                      <input 
                        type="text" 
                        name="name"
                        required
                        value={formData.name || ''} 
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" 
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Brand</label>
                      <input 
                        type="text" 
                        name="brand"
                        value={formData.brand || ''} 
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" 
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                    <textarea 
                      name="description"
                      rows={3}
                      required
                      value={formData.description || ''} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none resize-none" 
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Price ($)</label>
                      <input 
                        type="number" 
                        name="price"
                        step="0.01"
                        required
                        value={formData.price || 0} 
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" 
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                      <input 
                        type="text" 
                        name="category"
                        value={formData.category || ''} 
                        onChange={handleInputChange}
                        placeholder="e.g. Apparel"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" 
                        disabled={isSubmitting}
                      />
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
