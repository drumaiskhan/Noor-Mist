import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsAPI, uploadAPI } from '../../services/api';
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiPhotograph,
  HiCollection,
  HiSearch,
  HiX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const EMPTY_FORM = () => ({
  name: '',
  description: '',
  image_url: '',
  banner_url: '',
  show_on_homepage: false,
  is_active: true,
  meta_title: '',
  meta_description: '',
});

function CollectionCard({ collection, index, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="luxury-card overflow-hidden group"
    >
      <div className="relative h-40 bg-noir-card overflow-hidden">
        {collection.image_url ? (
          <img
            src={collection.image_url}
            alt={collection.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <HiCollection className="w-12 h-12 text-gray-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-noir-card via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          {collection.show_on_homepage && (
            <span className="text-xs bg-gold/20 text-gold px-2 py-1 rounded-full backdrop-blur-sm">
              Homepage
            </span>
          )}
          {!collection.is_active && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full backdrop-blur-sm">
              Inactive
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-playfair font-bold text-white text-lg mb-1">
          {collection.name}
        </h3>
        {collection.description && (
          <p className="text-gray-400 text-sm mb-3 line-clamp-2">
            {collection.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono">
            /{collection.slug}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(collection)}
              className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-400/10"
              title="Edit"
            >
              <HiPencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(collection.id, collection.name)}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
              title="Delete"
            >
              <HiTrash className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Collections() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM());
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const { data: collectionsData = [], isLoading } = useQuery({
    queryKey: ['adminCollections'],
    queryFn: async () => {
      const res = await collectionsAPI.getAll();
      return res.data?.collections ?? res.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let imageUrl = data.image_url;
      if (imageFile) {
        const uploadRes = await uploadAPI.image(imageFile);
        imageUrl = uploadRes.data.url;
      }
      const payload = { ...data, image_url: imageUrl };
      return editingCollection
        ? collectionsAPI.update(editingCollection.id, payload)
        : collectionsAPI.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCollections'] });
      toast.success(
        editingCollection ? 'Collection updated' : 'Collection created'
      );
      resetForm();
    },
    onError: (err) =>
      toast.error(err.response?.data?.error || 'Failed to save collection'),
  });

  const deleteMutation = useMutation({
    mutationFn: collectionsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCollections'] });
      toast.success('Collection deleted');
    },
    onError: (err) =>
      toast.error(err.response?.data?.error || 'Failed to delete collection'),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingCollection(null);
    setImageFile(null);
    setImagePreview(null);
    setForm(EMPTY_FORM());
  };

  const handleEdit = (col) => {
    setEditingCollection(col);
    setForm({
      name: col.name || '',
      description: col.description || '',
      image_url: col.image_url || '',
      banner_url: col.banner_url || '',
      show_on_homepage: col.show_on_homepage || false,
      is_active: col.is_active !== false,
      meta_title: col.meta_title || '',
      meta_description: col.meta_description || '',
    });
    setImagePreview(col.image_url || null);
    setShowForm(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Collection name is required');
      return;
    }
    saveMutation.mutate(form);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const filtered = collectionsData.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair font-bold mb-1">Collections</h1>
          <p className="text-gray-400 text-sm">
            {collectionsData.length} collections total
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn-gold flex items-center gap-2 text-sm"
        >
          <HiPlus className="w-4 h-4" /> Add Collection
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search collections..."
          className="w-full bg-noir border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-gold outline-none"
        />
      </div>

      {/* Collections Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="luxury-card p-6">
              <div className="skeleton h-40 w-full rounded-xl mb-4" />
              <div className="skeleton h-5 w-3/4 rounded mb-2" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <HiCollection className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-playfair font-bold mb-2">
            No Collections Found
          </h3>
          <p className="text-gray-400 mb-6">
            {search
              ? 'No collections match your search'
              : 'Start by creating your first collection'}
          </p>
          {!search && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="btn-gold text-sm"
            >
              Create Collection
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((col, index) => (
            <CollectionCard
              key={col.id}
              collection={col}
              index={index}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-noir-light border border-gold/10 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-playfair font-bold">
                  {editingCollection ? 'Edit Collection' : 'Add New Collection'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-white"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Image Upload */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-montserrat">
                    Collection Image
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-noir border border-gray-700 flex items-center justify-center flex-shrink-0">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <HiPhotograph className="w-8 h-8 text-gray-600" />
                      )}
                    </div>
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <span className="block text-center py-3 px-4 border-2 border-dashed border-gray-600 rounded-xl text-sm text-gray-400 hover:border-gold transition-colors">
                        Click to upload image
                      </span>
                    </label>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-montserrat">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none"
                    placeholder="e.g., Men's Collection"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-montserrat">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={3}
                    className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none resize-none"
                    placeholder="Describe this collection..."
                  />
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.show_on_homepage}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          show_on_homepage: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-600 text-gold focus:ring-gold bg-noir"
                    />
                    <span className="text-sm text-gray-300">
                      Show on Homepage
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm({ ...form, is_active: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-600 text-gold focus:ring-gold bg-noir"
                    />
                    <span className="text-sm text-gray-300">Active</span>
                  </label>
                </div>

                {/* SEO */}
                <div className="pt-4 border-t border-gray-800 space-y-3">
                  <h3 className="text-sm font-montserrat text-gray-400 uppercase tracking-wider">
                    SEO
                  </h3>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      value={form.meta_title}
                      onChange={(e) =>
                        setForm({ ...form, meta_title: e.target.value })
                      }
                      className="w-full bg-noir border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Meta Description
                    </label>
                    <textarea
                      value={form.meta_description}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          meta_description: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full bg-noir border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="btn-gold flex-1 text-sm"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending
                      ? 'Saving...'
                      : editingCollection
                      ? 'Update Collection'
                      : 'Create Collection'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-outline-gold flex-1 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
