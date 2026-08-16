import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryAPI } from '../../services/api';
import { HiPlus, HiPencil, HiTrash, HiPhotograph } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Categories() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', parent_id: '' });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: async () => {
      const { data } = await categoryAPI.getAll();
      return data.categories ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingCategory ? categoryAPI.update(editingCategory.id, data) : categoryAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      toast.success(editingCategory ? 'Category updated' : 'Category created');
      resetForm();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: categoryAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      toast.success('Category deleted');
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setForm({ name: '', description: '', parent_id: '' });
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setForm({ name: category.name, description: category.description || '', parent_id: category.parent_id || '' });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Category name is required');
    saveMutation.mutate(form);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete category "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-playfair font-bold mb-1">Categories</h1>
          <p className="text-gray-400 text-sm">{categories.length} categories</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-gold flex items-center gap-2 text-sm">
          <HiPlus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={resetForm} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-noir-light border border-gold/10 rounded-2xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-playfair font-bold mb-6">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-montserrat">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none"
                  placeholder="e.g., Men's Collection"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-montserrat">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-montserrat">Parent Category</label>
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none"
                >
                  <option value="">None (Top Level)</option>
                  {categories.filter((c) => c.id !== editingCategory?.id).map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-gold flex-1 text-sm" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={resetForm} className="btn-outline-gold flex-1 text-sm">Cancel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Categories List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="luxury-card p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-playfair font-bold text-white text-lg">{category.name}</h3>
              <span className="text-xs text-gray-500">{category.slug}</span>
            </div>
            {category.description && (
              <p className="text-gray-400 text-sm mb-4">{category.description}</p>
            )}
            {category.parent_name && (
              <p className="text-xs text-gray-500 mb-3">Parent: {category.parent_name}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => handleEdit(category)} className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                <HiPencil className="w-4 h-4 inline mr-1" /> Edit
              </button>
              <button onClick={() => handleDelete(category.id, category.name)} className="text-sm text-gray-400 hover:text-red-400 transition-colors">
                <HiTrash className="w-4 h-4 inline mr-1" /> Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
