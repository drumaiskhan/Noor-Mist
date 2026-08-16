import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productPageSectionsAPI } from '../../services/api';
import { HiEye, HiEyeOff, HiSwitchVertical, HiLockClosed, HiCube } from 'react-icons/hi';
import toast from 'react-hot-toast';

const SECTION_ICONS = {
  gallery: '🖼️', info: '💰', trust_badges: '🚚',
  description: '📝', notes: '🌸', details: '📋', reviews: '⭐', related: '🔗',
};

const LOCKED_KEYS = new Set(['gallery', 'info']);

export default function ProductPageBuilder() {
  const queryClient = useQueryClient();
  const [ordered, setOrdered] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ['productPageSections'],
    queryFn: () => productPageSectionsAPI.getSections(),
  });
  const sections = data?.data || [];

  useEffect(() => { setOrdered(sections); }, [data]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data: body }) => productPageSectionsAPI.updateSection(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productPageSections'] });
      toast.success('Product page updated');
    },
    onError: () => toast.error('Failed to update section'),
  });

  const reorderMutation = useMutation({
    mutationFn: (payload) => productPageSectionsAPI.reorder({ sections: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productPageSections'] }),
    onError: () => toast.error('Failed to save order'),
  });

  const toggle = (section) => {
    if (LOCKED_KEYS.has(section.section_key)) return;
    updateMutation.mutate({ id: section.id, data: { is_enabled: !section.is_enabled } });
  };

  const handleReorder = (reordered) => {
    setOrdered(reordered);
    reorderMutation.mutate(reordered.map((s, i) => ({ id: s.id, position: i + 1 })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HiCube className="w-6 h-6 text-gold" />
        <div>
          <h1 className="text-2xl font-playfair font-bold">Product Page Builder</h1>
          <p className="text-sm text-gray-400 mt-1">
            Controls the layout every product detail page uses — drag to reorder, toggle to show or hide.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            The image gallery and buy box are always shown (only their position can change) — everything else, including
            each description/notes/details/reviews tab, can be reordered or hidden.
          </p>
          <Reorder.Group axis="y" values={ordered} onReorder={handleReorder} className="space-y-2">
            {ordered.map((section) => {
              const locked = LOCKED_KEYS.has(section.section_key);
              return (
                <Reorder.Item key={section.id} value={section} className="select-none">
                  <motion.div layout className="luxury-card p-4 flex items-center gap-3">
                    <div className="cursor-grab text-gray-600 hover:text-gray-400 touch-none">
                      <HiSwitchVertical className="w-5 h-5" />
                    </div>
                    <span className="text-xl">{SECTION_ICONS[section.section_key] || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{section.label || section.section_key}</p>
                      <p className="text-xs text-gray-500 capitalize">{section.section_key.replace(/_/g, ' ')}</p>
                    </div>
                    {locked ? (
                      <div className="p-2 text-gray-600" title="Always shown">
                        <HiLockClosed className="w-4 h-4" />
                      </div>
                    ) : (
                      <button
                        onClick={() => toggle(section)}
                        className={`p-2 rounded-lg transition-colors ${
                          section.is_enabled ? 'text-green-400 bg-green-400/10' : 'text-gray-600 hover:text-gray-400'
                        }`}
                        title={section.is_enabled ? 'Hide on product page' : 'Show on product page'}
                      >
                        {section.is_enabled ? <HiEye className="w-4 h-4" /> : <HiEyeOff className="w-4 h-4" />}
                      </button>
                    )}
                  </motion.div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </>
      )}
    </div>
  );
}
