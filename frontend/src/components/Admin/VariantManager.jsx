import React, { useState } from 'react';
import { HiPlus, HiTrash, HiPencil } from 'react-icons/hi';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { formatPrice } from '../../utils/helpers';

export default function VariantManager({ variants = [], productId, onChange }) {
  const [editing, setEditing] = useState(null);
  const [newVariant, setNewVariant] = useState({
    size_ml: '', price: '', sale_price: '', sku: '', quantity: '0',
  });

  const handleAdd = () => {
    if (!newVariant.size_ml || !newVariant.price) return;
    const updated = [...variants, { ...newVariant, id: `new_${Date.now()}`, is_new: true }];
    onChange(updated);
    setNewVariant({ size_ml: '', price: '', sale_price: '', sku: '', quantity: '0' });
  };

  const handleDelete = (id) => {
    onChange(variants.filter((v) => v.id !== id));
  };

  const handleEdit = (id, field, value) => {
    onChange(variants.map((v) => v.id === id ? { ...v, [field]: value } : v));
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {['Size (ml)', 'Price', 'Sale Price', 'SKU', 'Stock', ''].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-montserrat uppercase text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="border-b border-gray-800">
                <td className="px-3 py-2">
                  <Input inputClassName="w-20 py-1.5 px-2 text-xs" value={v.size_ml} onChange={(e) => handleEdit(v.id, 'size_ml', e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <Input inputClassName="w-24 py-1.5 px-2 text-xs" value={v.price} onChange={(e) => handleEdit(v.id, 'price', e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <Input inputClassName="w-24 py-1.5 px-2 text-xs" value={v.sale_price || ''} placeholder="Optional" onChange={(e) => handleEdit(v.id, 'sale_price', e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <Input inputClassName="w-28 py-1.5 px-2 text-xs" value={v.sku || ''} onChange={(e) => handleEdit(v.id, 'sku', e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <Input inputClassName="w-20 py-1.5 px-2 text-xs" value={v.quantity} onChange={(e) => handleEdit(v.id, 'quantity', e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => handleDelete(v.id)} className="text-red-400/60 hover:text-red-400 transition-colors">
                    <HiTrash className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new variant */}
      <div className="border border-dashed border-gray-700 rounded-xl p-4">
        <p className="text-xs font-montserrat text-gray-400 uppercase tracking-wider mb-3">Add Variant</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Input placeholder="Size ml" value={newVariant.size_ml} onChange={(e) => setNewVariant({...newVariant, size_ml: e.target.value})} inputClassName="py-2 px-3 text-xs" />
          <Input placeholder="Price" value={newVariant.price} onChange={(e) => setNewVariant({...newVariant, price: e.target.value})} inputClassName="py-2 px-3 text-xs" />
          <Input placeholder="Sale Price" value={newVariant.sale_price} onChange={(e) => setNewVariant({...newVariant, sale_price: e.target.value})} inputClassName="py-2 px-3 text-xs" />
          <Input placeholder="SKU" value={newVariant.sku} onChange={(e) => setNewVariant({...newVariant, sku: e.target.value})} inputClassName="py-2 px-3 text-xs" />
          <Input placeholder="Stock" value={newVariant.quantity} onChange={(e) => setNewVariant({...newVariant, quantity: e.target.value})} inputClassName="py-2 px-3 text-xs" />
        </div>
        <Button onClick={handleAdd} variant="outline" size="sm" className="mt-3">
          <HiPlus className="w-4 h-4" /> Add Variant
        </Button>
      </div>
    </div>
  );
}
