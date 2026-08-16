import React from 'react';
import { Link } from 'react-router-dom';
import { HiTrash, HiMinus, HiPlus } from 'react-icons/hi';
import useCartStore from '../../store/cartStore';
import { formatPrice } from '../../utils/helpers';

export default function CartItem({ item }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeFromCart = useCartStore((s) => s.removeFromCart);

  return (
    <div className="flex gap-4 p-3 rounded-xl bg-noir-card">
      <Link to={`/product/${item.product_slug}`} className="flex-shrink-0">
        <img
          src={item.product_image || '/images/placeholder-perfume.jpg'}
          alt={item.product_name}
          className="w-20 h-20 object-cover rounded-lg"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={`/product/${item.product_slug}`}
          className="text-theme-text font-medium hover:text-theme-primary transition-colors truncate block text-sm"
        >
          {item.product_name}
        </Link>
        <p className="text-xs text-theme-muted mb-3">Size: {item.variant_size}</p>

        <div className="flex items-center justify-between">
          <span className="text-gold font-bold text-sm">{formatPrice(item.price * item.quantity)}</span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="w-7 h-7 border border-theme-border rounded flex items-center justify-center text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-all"
            >
              <HiMinus className="w-3 h-3" />
            </button>
            <span className="w-6 text-center text-sm font-montserrat">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="w-7 h-7 border border-theme-border rounded flex items-center justify-center text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-all"
            >
              <HiPlus className="w-3 h-3" />
            </button>
            <button
              onClick={() => removeFromCart(item.id)}
              className="w-7 h-7 border border-theme-border rounded flex items-center justify-center text-theme-muted hover:border-danger hover:text-danger transition-all ml-1"
            >
              <HiTrash className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
