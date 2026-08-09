'use client';

/**
 * CartPanel
 * 
 * Slide-out cart panel triggered by the shopping cart icon in the Header.
 * Lists all items in the cart with quantity controls, remove buttons,
 * and a total price summary.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartPanel({ isOpen, onClose }: CartPanelProps) {
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-[420px] flex-col border-l border-white/[0.08] bg-[#0a0a14]/95 shadow-2xl backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/20">
                  <ShoppingBag className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">Shopping Cart</h2>
                  <p className="text-xs text-white/40">{totalItems} {totalItems === 1 ? 'item' : 'items'}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <ShoppingBag className="h-7 w-7 text-white/15" />
                  </div>
                  <h3 className="text-sm font-medium text-white/60 mb-1">Your cart is empty</h3>
                  <p className="text-xs text-white/30 max-w-[200px] leading-relaxed">
                    Ask the AI assistant to find products, then add them to your cart.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-white/[0.04]">
                  {items.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group flex gap-4 px-6 py-4 transition-colors hover:bg-white/[0.02]"
                    >
                      {/* Image */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name || item.sku}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-white/20 font-mono">
                            {item.sku}
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div>
                          <h4 className="text-sm font-medium text-white/90 truncate">
                            {item.name || item.sku}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/40">
                            <span className="font-mono">{item.sku}</span>
                            {item.size && (
                              <>
                                <span className="text-white/15">·</span>
                                <span>Size {item.size}</span>
                              </>
                            )}
                            {item.variant && (
                              <>
                                <span className="text-white/15">·</span>
                                <span>{item.variant}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02]">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-l-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-medium text-white/80">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-r-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Price */}
                            {item.price != null && (
                              <span className="text-sm font-semibold text-white">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            )}

                            {/* Remove */}
                            <button
                              onClick={() => removeItem(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/25 transition-colors hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-white/[0.08] px-6 py-5 space-y-4">
                {/* Totals */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Subtotal ({totalItems} items)</span>
                  <span className="text-lg font-bold text-white tracking-tight">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>

                {/* Action Buttons */}
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98]">
                  Checkout
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={clearCart}
                  className="w-full text-center text-xs text-white/30 transition-colors hover:text-red-400"
                >
                  Clear entire cart
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
