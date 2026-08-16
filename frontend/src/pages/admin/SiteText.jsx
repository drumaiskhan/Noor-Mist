import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../../services/api';
import { DEFAULT_SITE_TEXT, parseSiteText } from '../../utils/siteText';
import { HiCheck, HiAnnotation, HiRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';

const FIELD_GROUPS = [
  {
    title: 'Buttons',
    fields: [
      { key: 'add_to_cart', label: 'Add to Cart button' },
      { key: 'buy_now', label: 'Buy Now button' },
      { key: 'out_of_stock', label: 'Out of stock badge' },
    ],
  },
  {
    title: 'Empty States',
    fields: [
      { key: 'no_products_title', label: 'No products found — title' },
      { key: 'no_products_subtitle', label: 'No products found — subtitle' },
      { key: 'empty_cart_title', label: 'Empty cart title' },
      { key: 'empty_wishlist_title', label: 'Empty wishlist title' },
      { key: 'product_not_found_title', label: 'Product not found title' },
    ],
  },
];

export default function SiteText() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_SITE_TEXT);
  const [loaded, setLoaded] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['adminSiteTextSettings'],
    queryFn: async () => {
      const res = await settingsAPI.get();
      return res.data?.settings ?? {};
    },
  });

  useEffect(() => {
    if (!settings || loaded) return;
    setForm(parseSiteText(settings));
    setLoaded(true);
  }, [settings, loaded]);

  const saveMutation = useMutation({
    mutationFn: () => settingsAPI.update({ site_text: JSON.stringify(form) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      queryClient.invalidateQueries({ queryKey: ['adminSiteTextSettings'] });
      toast.success('Site text updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  const resetField = (key) => setForm((f) => ({ ...f, [key]: DEFAULT_SITE_TEXT[key] }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-playfair font-bold mb-1 flex items-center gap-2">
            <HiAnnotation className="w-7 h-7 text-gold" /> Site Text
          </h1>
          <p className="text-gray-400 text-sm">Edit button labels and empty-state messages shown across the storefront.</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="btn-gold flex items-center gap-2 text-sm flex-shrink-0"
        >
          <HiCheck className="w-4 h-4" /> {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {FIELD_GROUPS.map((group) => (
        <div key={group.title} className="luxury-card p-6 space-y-4">
          <h2 className="text-lg font-playfair font-bold">{group.title}</h2>
          <div className="space-y-4">
            {group.fields.map(({ key, label }) => (
              <div key={key}>
                <label className="text-sm text-gray-400 mb-2 block font-montserrat">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="flex-1 bg-noir border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold outline-none"
                  />
                  {form[key] !== DEFAULT_SITE_TEXT[key] && (
                    <button
                      type="button"
                      onClick={() => resetField(key)}
                      title={`Reset to "${DEFAULT_SITE_TEXT[key]}"`}
                      className="text-gray-500 hover:text-gold p-2"
                    >
                      <HiRefresh className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
