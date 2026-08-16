import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../../services/api';
import { HiPlus, HiTrash, HiCheck, HiMenuAlt3, HiTemplate, HiArrowUp, HiArrowDown } from 'react-icons/hi';
import toast from 'react-hot-toast';

const DEFAULT_NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'The Edit', path: '/lookbook' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

const DEFAULT_FOOTER_LINKS = {
  shop: [
    { label: 'All Perfumes', path: '/shop' },
    { label: "Men's Collection", path: '/shop?gender=male' },
    { label: "Women's Collection", path: '/shop?gender=female' },
    { label: 'Unisex', path: '/shop?gender=unisex' },
    { label: 'Oud Collection', path: '/shop?fragrance_family=oud' },
    { label: 'Gift Sets', path: '/shop?gift_set=true' },
  ],
  company: [
    { label: 'About Us', path: '/about' },
    { label: 'The Edit', path: '/lookbook' },
    { label: 'Collections', path: '/collections' },
    { label: 'Contact', path: '/contact' },
    { label: 'FAQ', path: '/faq' },
  ],
  account: [
    { label: 'My Account', path: '/account' },
    { label: 'My Orders', path: '/account/orders' },
    { label: 'Wishlist', path: '/wishlist' },
    { label: 'Track Order', path: '/account/orders' },
  ],
};

function parseColumn(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function LinkListEditor({ title, description, links, onChange }) {
  const update = (i, key, val) => onChange(links.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)));
  const remove = (i) => onChange(links.filter((_, idx) => idx !== i));
  const add = () => onChange([...links, { label: '', path: '' }]);
  const move = (i, dir) => {
    const next = [...links];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="luxury-card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-playfair font-bold">{title}</h2>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>

      <div className="space-y-2">
        {links.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex flex-col">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-600 hover:text-gold disabled:opacity-20 disabled:hover:text-gray-600">
                <HiArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === links.length - 1} className="text-gray-600 hover:text-gold disabled:opacity-20 disabled:hover:text-gray-600">
                <HiArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="text"
              value={link.label}
              onChange={(e) => update(i, 'label', e.target.value)}
              placeholder="Label"
              className="flex-1 bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none"
            />
            <input
              type="text"
              value={link.path}
              onChange={(e) => update(i, 'path', e.target.value)}
              placeholder="/path"
              className="flex-1 bg-noir border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none"
            />
            <button type="button" onClick={() => remove(i)} className="text-gray-600 hover:text-red-400 p-1">
              <HiTrash className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={add} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80">
        <HiPlus className="w-3.5 h-3.5" /> Add Link
      </button>
    </div>
  );
}

export default function SiteContent() {
  const queryClient = useQueryClient();
  const [navLinks, setNavLinks] = useState(DEFAULT_NAV_LINKS);
  const [footerShop, setFooterShop] = useState(DEFAULT_FOOTER_LINKS.shop);
  const [footerCompany, setFooterCompany] = useState(DEFAULT_FOOTER_LINKS.company);
  const [footerAccount, setFooterAccount] = useState(DEFAULT_FOOTER_LINKS.account);
  const [loaded, setLoaded] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['adminSiteContentSettings'],
    queryFn: async () => {
      const res = await settingsAPI.get();
      return res.data?.settings ?? {};
    },
  });

  useEffect(() => {
    if (!settings || loaded) return;
    setNavLinks(parseColumn(settings.nav_links, DEFAULT_NAV_LINKS));
    setFooterShop(parseColumn(settings.footer_shop_links, DEFAULT_FOOTER_LINKS.shop));
    setFooterCompany(parseColumn(settings.footer_company_links, DEFAULT_FOOTER_LINKS.company));
    setFooterAccount(parseColumn(settings.footer_account_links, DEFAULT_FOOTER_LINKS.account));
    setLoaded(true);
  }, [settings, loaded]);

  const saveMutation = useMutation({
    mutationFn: () => settingsAPI.update({
      nav_links: JSON.stringify(navLinks.filter((l) => l.label && l.path)),
      footer_shop_links: JSON.stringify(footerShop.filter((l) => l.label && l.path)),
      footer_company_links: JSON.stringify(footerCompany.filter((l) => l.label && l.path)),
      footer_account_links: JSON.stringify(footerAccount.filter((l) => l.label && l.path)),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      queryClient.invalidateQueries({ queryKey: ['adminSiteContentSettings'] });
      toast.success('Site content updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-playfair font-bold mb-1 flex items-center gap-2">
            <HiTemplate className="w-7 h-7 text-gold" /> Site Content
          </h1>
          <p className="text-gray-400 text-sm">Edit the header navigation and footer link columns shown across the whole storefront.</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="btn-gold flex items-center gap-2 text-sm flex-shrink-0"
        >
          <HiCheck className="w-4 h-4" /> {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <LinkListEditor
        title="Header Navigation"
        description="Shown at the top of every page (desktop menu bar and mobile menu)."
        links={navLinks}
        onChange={setNavLinks}
      />

      <div className="flex items-center gap-2 pt-2">
        <HiMenuAlt3 className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm text-gray-400 uppercase tracking-wider">Footer Columns</h2>
      </div>

      <LinkListEditor title="Shop" links={footerShop} onChange={setFooterShop} />
      <LinkListEditor title="Company" links={footerCompany} onChange={setFooterCompany} />
      <LinkListEditor title="Account" links={footerAccount} onChange={setFooterAccount} />
    </div>
  );
}
