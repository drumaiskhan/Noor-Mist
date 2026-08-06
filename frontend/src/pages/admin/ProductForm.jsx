import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productAPI, categoryAPI, collectionsAPI, uploadAPI } from '../../services/api';
import { HiArrowLeft, HiPlus, HiTrash, HiPhotograph, HiCheckCircle, HiStar, HiInformationCircle } from 'react-icons/hi';
import {
  GENDERS, FRAGRANCE_FAMILIES, CONCENTRATIONS,
  LONGEVITY_OPTIONS, PROJECTION_OPTIONS, SEASONS, OCCASIONS,
} from '../../utils/constants';
import toast from 'react-hot-toast';

const emptyVariant = { size_ml: 50, sku: '', price: '', sale_price: '', quantity: '' };

const TABS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'fragrance', label: 'Fragrance Details' },
  { id: 'flags', label: 'Flags' },
  { id: 'variants', label: 'Variants & Pricing' },
  { id: 'images', label: 'Images' },
  { id: 'seo', label: 'SEO' },
];

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    // Which storefront collection (e.g. "Men", "Women", "Azadi Sale") this
    // product belongs to, so ?collection=<slug> shop links and collection
    // tiles only surface products the admin has actually assigned. Optional
    // - unlike category, a product doesn't have to belong to a collection.
    collection_id: '',
    description: '',
    short_description: '',
    gender: '',
    fragrance_family: '',
    concentration: '',
    top_notes: [],
    middle_notes: [],
    base_notes: [],
    longevity: '',
    projection: '',
    season: [],
    occasion: [],
    status: 'draft',
    is_featured: false,
    is_bestseller: false,
    is_new_arrival: false,
    is_limited_edition: false,
    is_gift_set: false,
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
  });

  const [variants, setVariants] = useState([{ ...emptyVariant }]);
  const [images, setImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [noteInput, setNoteInput] = useState({ top: '', middle: '', base: '' });
  const [activeTab, setActiveTab] = useState('basic');
  const [uploadingImages, setUploadingImages] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: async () => {
      const { data } = await categoryAPI.getAll();
      return data.categories ?? [];
    },
  });

  const { data: collectionsData } = useQuery({
    queryKey: ['adminCollectionsForProductForm'],
    queryFn: async () => {
      const { data } = await collectionsAPI.getAll();
      return data.collections ?? [];
    },
  });

  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['adminProduct', id],
    queryFn: async () => {
      const { data } = await productAPI.getOneAdmin(id);
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (productData?.product && isEditing) {
      const p = productData.product;
      setForm({
        name: p.name || '',
        category_id: p.category_id || '',
        collection_id: p.collection_id || '',
        description: p.description || '',
        short_description: p.short_description || '',
        gender: p.gender || '',
        fragrance_family: p.fragrance_family || '',
        concentration: p.concentration || '',
        top_notes: p.top_notes || [],
        middle_notes: p.middle_notes || [],
        base_notes: p.base_notes || [],
        longevity: p.longevity || '',
        projection: p.projection || '',
        season: p.season || [],
        occasion: p.occasion || [],
        status: p.status || 'draft',
        is_featured: p.is_featured || false,
        is_bestseller: p.is_bestseller || false,
        is_new_arrival: p.is_new_arrival || false,
        is_limited_edition: p.is_limited_edition || false,
        is_gift_set: p.is_gift_set || false,
        meta_title: p.meta_title || '',
        meta_description: p.meta_description || '',
        meta_keywords: p.meta_keywords || '',
      });
      if (p.variants?.length > 0) {
        setVariants(p.variants.map((v) => ({
          id: v.id,
          size_ml: v.size_ml,
          sku: v.sku || '',
          price: v.price || '',
          sale_price: v.sale_price || '',
          quantity: v.quantity || '',
        })));
      }
      if (p.images?.length > 0) {
        setImages(p.images);
      }
    }
  }, [productData, isEditing]);

  const saveMutation = useMutation({
    mutationFn: (data) => isEditing ? productAPI.update(id, data) : productAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminProducts']);
      toast.success(isEditing ? 'Product updated!' : 'Product created!');
      navigate('/admin/products');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save product'),
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleArrayChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const addNote = (type) => {
    const val = noteInput[type].trim();
    if (!val) return;
    const field = type === 'top' ? 'top_notes' : type === 'middle' ? 'middle_notes' : 'base_notes';
    setForm({ ...form, [field]: [...form[field], val] });
    setNoteInput({ ...noteInput, [type]: '' });
  };

  const removeNote = (type, index) => {
    const field = type === 'top' ? 'top_notes' : type === 'middle' ? 'middle_notes' : 'base_notes';
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== index) });
  };

  const addVariant = () => setVariants([...variants, { ...emptyVariant }]);
  const removeVariant = (index) => setVariants(variants.filter((_, i) => i !== index));
  const updateVariant = (index, field, value) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(files);
    setUploadingImages(true);
    try {
      const { data } = await uploadAPI.images(files);
      // Backend responds with { images: [...] } — spreading `data` itself
      // (an object, not an array) used to throw and silently fail the upload.
      setImages([...images, ...(data.images || [])]);
      toast.success('Images uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => setImages(images.filter((_, i) => i !== index));

  // The storefront always treats images[0] as the primary/cover photo
  // (see getImageUrl in utils/helpers.js) — this lets admin choose which
  // uploaded image that is, instead of it being whichever was uploaded first.
  const setPrimaryImage = (index) => {
    if (index === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [chosen] = next.splice(index, 1);
      return [chosen, ...next];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setActiveTab('basic');
      return toast.error('Product name is required');
    }
    if (!form.category_id) {
      setActiveTab('basic');
      return toast.error('Category is required');
    }
    if (variants.length === 0) {
      setActiveTab('variants');
      return toast.error('At least one variant is required');
    }

    saveMutation.mutate({
      ...form,
      variants: variants.map((v) => ({
        ...v,
        price: parseFloat(v.price) || 0,
        sale_price: v.sale_price ? parseFloat(v.sale_price) : null,
        quantity: parseInt(v.quantity) || 0,
      })),
      images: images.map((img) => (
        typeof img === 'string' ? { url: img } : { url: img.url, public_id: img.public_id }
      )),
    });
  };

  if (isEditing && isLoadingProduct) {
    return <div className="p-8 text-center text-gray-400">Loading product...</div>;
  }

  const categories = categoriesData || [];
  const collections = collectionsData || [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/products" className="text-gray-400 hover:text-gold">
          <HiArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-playfair font-bold">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isEditing ? 'Update product details and variants' : 'Create a new perfume product'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-montserrat whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-gold text-gold'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.id === 'images' && images.length > 0 && (
              <span className="ml-1.5 text-xs text-gray-500">({images.length})</span>
            )}
            {tab.id === 'variants' && (
              <span className="ml-1.5 text-xs text-gray-500">({variants.length})</span>
            )}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        {activeTab === 'basic' && (
        <div className="luxury-card p-6 space-y-4">
          <h2 className="text-xl font-playfair font-bold mb-4">Basic Information</h2>
          
          <div>
            <label className="text-sm text-gray-400 mb-2 block font-montserrat">Product Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none"
              placeholder="e.g., Noor Mist Royal Oud"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Category *</label>
              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
                className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange} className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none">
                <option value="">Select gender</option>
                {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Collection</label>
              <select
                name="collection_id"
                value={form.collection_id}
                onChange={handleChange}
                className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none"
              >
                <option value="">No collection</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Controls which collection page (e.g. Men, Women, Azadi Sale) this product shows up on.
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block font-montserrat">Short Description</label>
            <input
              type="text"
              name="short_description"
              value={form.short_description}
              onChange={handleChange}
              className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none"
              placeholder="Brief description for product cards"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block font-montserrat">Full Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none resize-none"
              placeholder="Detailed product description"
            />
          </div>
        </div>
        )}

        {/* Fragrance Details */}
        {activeTab === 'fragrance' && (
        <div className="luxury-card p-6 space-y-4">
          <h2 className="text-xl font-playfair font-bold mb-4">Fragrance Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Fragrance Family</label>
              <select name="fragrance_family" value={form.fragrance_family} onChange={handleChange} className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none">
                <option value="">Select</option>
                {FRAGRANCE_FAMILIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Concentration</label>
              <select name="concentration" value={form.concentration} onChange={handleChange} className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none">
                <option value="">Select</option>
                {CONCENTRATIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Longevity</label>
              <select name="longevity" value={form.longevity} onChange={handleChange} className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none">
                <option value="">Select</option>
                {LONGEVITY_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Projection</label>
              <select name="projection" value={form.projection} onChange={handleChange} className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none">
                <option value="">Select</option>
                {PROJECTION_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Fragrance Notes */}
          {['top', 'middle', 'base'].map((type) => {
            const label = type === 'top' ? 'Top Notes' : type === 'middle' ? 'Heart/Middle Notes' : 'Base Notes';
            const field = type === 'top' ? 'top_notes' : type === 'middle' ? 'middle_notes' : 'base_notes';
            return (
              <div key={type}>
                <label className="text-sm text-gray-400 mb-2 block font-montserrat">{label}</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={noteInput[type]}
                    onChange={(e) => setNoteInput({ ...noteInput, [type]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNote(type))}
                    className="flex-1 bg-noir border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-gold outline-none"
                    placeholder={`Add ${label.toLowerCase()}`}
                  />
                  <button type="button" onClick={() => addNote(type)} className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-sm hover:bg-gold/20">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form[field].map((note, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-noir border border-gray-700 rounded-full text-sm text-gray-300">
                      {note}
                      <button type="button" onClick={() => removeNote(type, i)} className="text-gray-500 hover:text-red-400">
                        <HiTrash className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Seasons & Occasions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Seasons</label>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => handleArrayChange('season', s.value)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      form.season.includes(s.value)
                        ? 'bg-gold/10 border-gold text-gold'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Occasions</label>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleArrayChange('occasion', o.value)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      form.occasion.includes(o.value)
                        ? 'bg-gold/10 border-gold text-gold'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Product Flags */}
        {activeTab === 'flags' && (
        <div className="luxury-card p-6">
          <h2 className="text-xl font-playfair font-bold mb-4">Product Flags</h2>
          <div className="flex flex-wrap gap-6">
            {[
              { name: 'is_featured', label: 'Featured' },
              { name: 'is_bestseller', label: 'Best Seller' },
              { name: 'is_new_arrival', label: 'New Arrival' },
              { name: 'is_limited_edition', label: 'Limited Edition' },
              { name: 'is_gift_set', label: 'Gift Set' },
            ].map((flag) => (
              <label key={flag.name} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name={flag.name}
                  checked={form[flag.name]}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-600 text-gold focus:ring-gold bg-noir"
                />
                <span className="text-sm text-gray-300">{flag.label}</span>
              </label>
            ))}
          </div>
        </div>
        )}

        {/* Variants (Sizes) */}
        {activeTab === 'variants' && (
        <div className="luxury-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-playfair font-bold">Variants (Sizes)</h2>
            <button type="button" onClick={addVariant} className="flex items-center gap-1 text-sm text-gold hover:underline">
              <HiPlus className="w-4 h-4" /> Add Variant
            </button>
          </div>

          {variants.map((variant, index) => (
            <div key={index} className="grid grid-cols-5 gap-3 p-4 bg-noir rounded-xl border border-gray-800">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Size (ml)</label>
                <input
                  type="number"
                  min="1"
                  value={variant.size_ml}
                  onChange={(e) => updateVariant(index, 'size_ml', parseInt(e.target.value) || '')}
                  className="w-full bg-noir-card border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none"
                  placeholder="e.g. 75"
                  list={`ml-suggestions-${index}`}
                />
                <datalist id={`ml-suggestions-${index}`}>
                  <option value="10" />
                  <option value="15" />
                  <option value="20" />
                  <option value="25" />
                  <option value="30" />
                  <option value="50" />
                  <option value="75" />
                  <option value="100" />
                  <option value="150" />
                  <option value="200" />
                  <option value="250" />
                </datalist>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">SKU</label>
                <input
                  type="text"
                  value={variant.sku}
                  onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                  className="w-full bg-noir-card border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none"
                  placeholder="NM-XXX-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Price (₨)</label>
                <input
                  type="number"
                  value={variant.price}
                  onChange={(e) => updateVariant(index, 'price', e.target.value)}
                  className="w-full bg-noir-card border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none"
                  placeholder="4999"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Sale Price</label>
                <input
                  type="number"
                  value={variant.sale_price}
                  onChange={(e) => updateVariant(index, 'sale_price', e.target.value)}
                  className="w-full bg-noir-card border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none"
                  placeholder="3999"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Stock</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={variant.quantity}
                    onChange={(e) => updateVariant(index, 'quantity', e.target.value)}
                    className="flex-1 bg-noir-card border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-gold outline-none"
                    placeholder="50"
                  />
                  {variants.length > 1 && (
                    <button type="button" onClick={() => removeVariant(index)} className="p-2 text-red-400 hover:text-red-300">
                      <HiTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Images */}
        {activeTab === 'images' && (
        <div className="luxury-card p-6 space-y-4">
          <div>
            <h2 className="text-xl font-playfair font-bold">Product Images</h2>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
              <HiInformationCircle className="w-3.5 h-3.5" />
              The first image is the cover photo shown on product cards. Hover an image to make it the cover.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {images.map((img, i) => (
              <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden group">
                <img src={img.url || img} alt="" className="w-full h-full object-cover" />
                {i === 0 ? (
                  <span className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    <HiStar className="w-2.5 h-2.5" /> Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPrimaryImage(i)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-montserrat transition-opacity"
                  >
                    Set as Cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                >
                  ×
                </button>
              </div>
            ))}
            <label className={`w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
              uploadingImages ? 'border-gold/50 cursor-wait' : 'border-gray-600 cursor-pointer hover:border-gold'
            }`}>
              {uploadingImages ? (
                <>
                  <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400 mt-1.5">Uploading…</span>
                </>
              ) : (
                <>
                  <HiPhotograph className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Upload</span>
                </>
              )}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImages}
                className="hidden"
              />
            </label>
          </div>
        </div>
        )}

        {/* SEO */}
        {activeTab === 'seo' && (
        <div className="luxury-card p-6 space-y-4">
          <h2 className="text-xl font-playfair font-bold">SEO Settings</h2>
          <div>
            <label className="text-sm text-gray-400 mb-2 block font-montserrat">Meta Title</label>
            <input type="text" name="meta_title" value={form.meta_title} onChange={handleChange} className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none" />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block font-montserrat">Meta Description</label>
            <textarea name="meta_description" value={form.meta_description} onChange={handleChange} rows={2} className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none resize-none" />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block font-montserrat">Meta Keywords</label>
            <input type="text" name="meta_keywords" value={form.meta_keywords} onChange={handleChange} className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none" />
          </div>
        </div>
        )}

        {/* Submit — always visible regardless of active tab, sticky so it
            doesn't require scrolling back down on long tabs like Fragrance Details */}
        <div className="sticky bottom-0 flex gap-4 p-4 -mx-4 bg-noir/95 backdrop-blur-sm border-t border-gray-800">
          <button type="submit" className="btn-gold" disabled={saveMutation.isLoading || uploadingImages}>
            {saveMutation.isLoading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
          </button>
          <Link to="/admin/products" className="btn-outline-gold">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
