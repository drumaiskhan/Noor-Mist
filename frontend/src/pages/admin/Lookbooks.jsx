import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lookbooksAPI, uploadAPI, productAPI } from '../../services/api';
import {
  HiPlus, HiPencil, HiTrash, HiPhotograph, HiSparkles,
  HiSearch, HiX, HiCheck, HiEye, HiEyeOff,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const EMPTY_FORM = () => ({
  title: '',
  subtitle: '',
  excerpt: '',
  cover_image_url: '',
  sections: [],
  product_ids: [],
  is_published: false,
  position: 0,
  meta_title: '',
  meta_description: '',
});

function LookbookCard({ lookbook, index, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="luxury-card overflow-hidden group"
    >
      <div className="relative h-40 bg-noir-card overflow-hidden">
        {lookbook.cover_image_url ? (
          <img
            src={lookbook.cover_image_url}
            alt={lookbook.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <HiSparkles className="w-12 h-12 text-gray-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-noir-card via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          {lookbook.is_published ? (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
              <HiEye className="w-3 h-3" /> Published
            </span>
          ) : (
            <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
              <HiEyeOff className="w-3 h-3" /> Draft
            </span>
          )}
        </div>
      </div>
      <div className="p-4 space-y-1">
        <h3 className="text-white font-playfair font-bold truncate">{lookbook.title}</h3>
        {lookbook.subtitle && <p className="text-gray-500 text-xs truncate">{lookbook.subtitle}</p>}
        <div className="flex items-center gap-2 pt-2">
          <button onClick={() => onEdit(lookbook)} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-noir border border-gray-700 hover:border-gold text-gray-300 hover:text-gold rounded-lg py-2 transition-colors">
            <HiPencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => onDelete(lookbook.id, lookbook.title)} className="px-3 flex items-center justify-center text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-400/50 rounded-lg py-2 transition-colors">
            <HiTrash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ProductPicker({ selectedIds, onChange }) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['lookbookProductPicker', search],
    queryFn: async () => {
      const res = await productAPI.getAll({ search, limit: 20 });
      return res.data?.products || [];
    },
  });

  const products = data || [];
  const toggle = (id) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products to feature..."
          className="w-full bg-noir border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:border-gold outline-none"
        />
      </div>
      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
        {isLoading ? (
          <p className="text-gray-500 text-sm py-2">Searching…</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-sm py-2">No products found.</p>
        ) : (
          products.map((p) => (
            <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-noir cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.includes(p.id)}
                onChange={() => toggle(p.id)}
                className="accent-gold w-4 h-4"
              />
              <span className="text-sm text-gray-300">{p.name}</span>
            </label>
          ))
        )}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-gray-500">{selectedIds.length} product{selectedIds.length !== 1 ? 's' : ''} selected for "Shop the Look"</p>
      )}
    </div>
  );
}

export default function Lookbooks() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM());
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [sectionUploading, setSectionUploading] = useState(null);

  const { data: lookbooksData = [], isLoading } = useQuery({
    queryKey: ['adminLookbooks'],
    queryFn: async () => {
      const res = await lookbooksAPI.getAdmin();
      return res.data?.lookbooks ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let cover_image_url = data.cover_image_url;
      if (coverFile) {
        const uploadRes = await uploadAPI.image(coverFile);
        cover_image_url = uploadRes.data.url;
      }
      const payload = { ...data, cover_image_url };
      return editing ? lookbooksAPI.update(editing.id, payload) : lookbooksAPI.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminLookbooks'] });
      toast.success(editing ? 'Lookbook updated' : 'Lookbook created');
      resetForm();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save lookbook'),
  });

  const deleteMutation = useMutation({
    mutationFn: lookbooksAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminLookbooks'] });
      toast.success('Lookbook deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete lookbook'),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setCoverFile(null);
    setCoverPreview(null);
    setForm(EMPTY_FORM());
  };

  const handleEdit = (lb) => {
    setEditing(lb);
    setForm({
      title: lb.title || '',
      subtitle: lb.subtitle || '',
      excerpt: lb.excerpt || '',
      cover_image_url: lb.cover_image_url || '',
      sections: lb.sections || [],
      product_ids: lb.product_ids || [],
      is_published: lb.is_published || false,
      position: lb.position || 0,
      meta_title: lb.meta_title || '',
      meta_description: lb.meta_description || '',
    });
    setCoverPreview(lb.cover_image_url || null);
    setShowForm(true);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const addSection = () => setForm((f) => ({ ...f, sections: [...f.sections, { image_url: '', caption: '' }] }));
  const removeSection = (i) => setForm((f) => ({ ...f, sections: f.sections.filter((_, idx) => idx !== i) }));
  const updateSection = (i, key, val) => setForm((f) => ({
    ...f, sections: f.sections.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)),
  }));

  const handleSectionImage = async (i, file) => {
    if (!file) return;
    setSectionUploading(i);
    try {
      const res = await uploadAPI.image(file);
      updateSection(i, 'image_url', res.data.url);
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setSectionUploading(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    saveMutation.mutate(form);
  };

  const handleDelete = (id, title) => {
    if (window.confirm(`Delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const filtered = lookbooksData.filter((lb) => lb.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair font-bold mb-1">Lookbooks</h1>
          <p className="text-gray-400 text-sm">{lookbooksData.length} stories — editorial pages with "Shop the Look"</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-gold flex items-center gap-2 text-sm">
          <HiPlus className="w-4 h-4" /> Add Lookbook
        </button>
      </div>

      <div className="relative">
        <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lookbooks..."
          className="w-full bg-noir border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-gold outline-none"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="luxury-card p-6">
              <div className="skeleton h-40 w-full rounded-xl mb-4" />
              <div className="skeleton h-5 w-3/4 rounded mb-2" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <HiSparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No lookbooks yet. Create your first editorial story.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lb, i) => (
            <LookbookCard key={lb.id} lookbook={lb} index={i} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={resetForm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-noir-card border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-noir-card border-b border-gray-800 p-5 flex items-center justify-between z-10">
                <h2 className="text-xl font-playfair font-bold text-white">{editing ? 'Edit Lookbook' : 'New Lookbook'}</h2>
                <button onClick={resetForm} className="text-gray-500 hover:text-white"><HiX className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block font-montserrat">Title *</label>
                    <input
                      type="text" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold outline-none"
                      placeholder="Golden Hour"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block font-montserrat">Subtitle</label>
                    <input
                      type="text" value={form.subtitle}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                      className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold outline-none"
                      placeholder="Autumn Edit"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-montserrat">Excerpt</label>
                  <textarea
                    value={form.excerpt} rows={3}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold outline-none resize-none"
                    placeholder="A short editorial intro shown under the hero."
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-montserrat">Cover Image</label>
                  <div className="flex items-center gap-4">
                    {coverPreview ? (
                      <img src={coverPreview} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-700" />
                    ) : (
                      <div className="w-24 h-24 rounded-lg border border-dashed border-gray-700 flex items-center justify-center">
                        <HiPhotograph className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                    <label className="btn-outline-gold text-sm cursor-pointer">
                      Upload
                      <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Editorial sections */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-400 block font-montserrat">Editorial Sections</label>
                    <button type="button" onClick={addSection} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80">
                      <HiPlus className="w-3.5 h-3.5" /> Add Section
                    </button>
                  </div>
                  {form.sections.length === 0 && (
                    <p className="text-gray-500 text-sm py-2">No sections yet — add full-bleed images with captions to tell the story.</p>
                  )}
                  <div className="space-y-3">
                    {form.sections.map((section, i) => (
                      <div key={i} className="p-3 bg-noir rounded-xl border border-gray-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">Section {i + 1}</p>
                          <button type="button" onClick={() => removeSection(i)} className="text-gray-600 hover:text-red-400">
                            <HiTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          {section.image_url ? (
                            <img src={section.image_url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg border border-dashed border-gray-700 flex items-center justify-center flex-shrink-0">
                              <HiPhotograph className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                          <label className="btn-outline-gold text-xs cursor-pointer">
                            {sectionUploading === i ? 'Uploading…' : 'Upload Image'}
                            <input type="file" accept="image/*" onChange={(e) => handleSectionImage(i, e.target.files?.[0])} className="hidden" />
                          </label>
                        </div>
                        <input
                          type="text" value={section.caption || ''}
                          onChange={(e) => updateSection(i, 'caption', e.target.value)}
                          placeholder="Caption (optional)"
                          className="w-full bg-noir-card border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shop the look */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-montserrat">Shop the Look</label>
                  <ProductPicker
                    selectedIds={form.product_ids}
                    onChange={(ids) => setForm({ ...form, product_ids: ids })}
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer py-2">
                  <div
                    className={`w-11 h-6 rounded-full cursor-pointer transition-colors flex-shrink-0 ${form.is_published ? 'bg-gold' : 'bg-gray-700'}`}
                    onClick={() => setForm({ ...form, is_published: !form.is_published })}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${form.is_published ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm text-gray-300">Published (visible on storefront)</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-800">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block font-montserrat">Meta Title</label>
                    <input
                      type="text" value={form.meta_title}
                      onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                      className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block font-montserrat">Meta Description</label>
                    <input
                      type="text" value={form.meta_description}
                      onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                      className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={saveMutation.isPending} className="btn-gold flex items-center gap-2 flex-1 justify-center">
                    <HiCheck className="w-4 h-4" /> {saveMutation.isPending ? 'Saving…' : editing ? 'Update Lookbook' : 'Create Lookbook'}
                  </button>
                  <button type="button" onClick={resetForm} className="btn-outline-gold px-6">Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
