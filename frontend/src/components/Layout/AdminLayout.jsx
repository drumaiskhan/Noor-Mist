import React, { useState, useRef, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import {
  HiHome,
  HiCube,
  HiCollection,
  HiTag,
  HiClipboardList,
  HiUsers,
  HiStar,
  HiTicket,
  HiArchive,
  HiColorSwatch,
  HiTemplate,
  HiSearchCircle,
  HiCog,
  HiChartBar,
  HiMenu,
  HiX,
  HiLogout,
  HiPencil,
  HiMail,
  HiCreditCard,
  HiTruck,
  HiPhotograph,
  HiDocumentText,
  HiBell,
  HiSparkles,
  HiAnnotation,
  HiMenuAlt3,
  HiShoppingCart,
  HiSpeakerphone,
  HiChevronDown,
  HiChevronRight,
} from 'react-icons/hi';

import useAuthStore from '../../store/authStore';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────
// Navigation model
//
// Three levels: standalone links (Dashboard), groups (Catalog, Sales, ...),
// and — for the one group that genuinely needs it — subgroups (Content &
// Design). Smaller groups stay flat rather than inventing subcategories
// that don't earn their keep.
// ─────────────────────────────────────────────────────────────────────────

const NAV = [
  {
    type: 'link',
    path: '/admin',
    label: 'Dashboard',
    icon: HiHome,
    exact: true,
  },

  {
    type: 'group',
    key: 'catalog',
    label: 'Catalog',
    icon: HiCube,
    items: [
      { path: '/admin/products', label: 'Products', icon: HiCube },
      { path: '/admin/categories', label: 'Categories', icon: HiTag },
      { path: '/admin/collections', label: 'Collections', icon: HiCollection },
      { path: '/admin/inventory', label: 'Inventory', icon: HiArchive },
      { path: '/admin/reviews', label: 'Reviews', icon: HiStar },
    ],
  },

  {
    type: 'group',
    key: 'sales',
    label: 'Sales',
    icon: HiShoppingCart,
    items: [
      { path: '/admin/orders', label: 'Orders', icon: HiClipboardList },
      { path: '/admin/shipments', label: 'Shipments', icon: HiTruck },
      { path: '/admin/customers', label: 'Customers', icon: HiUsers },
      { path: '/admin/coupons', label: 'Coupons', icon: HiTicket },
      { path: '/admin/messages', label: 'Messages', icon: HiMail },
    ],
  },

  {
    type: 'group',
    key: 'content',
    label: 'Content & Design',
    icon: HiTemplate,
    subgroups: [
      {
        key: 'builders',
        label: 'Page Builders',
        items: [
          { path: '/admin/homepage-builder', label: 'Homepage Builder', icon: HiTemplate },
          { path: '/admin/product-page-builder', label: 'Product Page', icon: HiCube },
          { path: '/admin/lookbooks', label: 'Lookbooks', icon: HiSparkles },
        ],
      },
      {
        key: 'site-content',
        label: 'Site Content',
        items: [
          { path: '/admin/site-content', label: 'Nav & Footer', icon: HiMenuAlt3 },
          { path: '/admin/site-text', label: 'Site Text', icon: HiAnnotation },
          { path: '/admin/page-editor', label: 'Static Pages', icon: HiDocumentText },
          { path: '/admin/media-library', label: 'Media Library', icon: HiPhotograph },
        ],
      },
      {
        key: 'appearance',
        label: 'Appearance',
        items: [
          { path: '/admin/theme-editor', label: 'Theme Editor', icon: HiColorSwatch },
          { path: '/admin/announcements', label: 'Promo Banners', icon: HiSpeakerphone },
        ],
      },
    ],
  },

  {
    type: 'group',
    key: 'marketing',
    label: 'Marketing & SEO',
    icon: HiChartBar,
    items: [
      { path: '/admin/seo-manager', label: 'SEO Manager', icon: HiSearchCircle },
      { path: '/admin/analytics', label: 'Analytics', icon: HiChartBar },
    ],
  },

  {
    type: 'group',
    key: 'settings',
    label: 'Settings',
    icon: HiCog,
    items: [
      { path: '/admin/settings', label: 'General', icon: HiCog },
      { path: '/admin/settings', label: 'Announcement Bar', icon: HiBell },
      { path: '/admin/email-settings', label: 'Email', icon: HiMail },
      { path: '/admin/whatsapp-settings', label: 'WhatsApp Notifications', icon: HiAnnotation },
      { path: '/admin/payment-settings', label: 'Payment & Shipping', icon: HiCreditCard },
    ],
  },
];

// Note on naming: the site-wide scrolling "Announcement Bar" (toggle +
// messages) lives inside the General settings form, not on its own route —
// it's listed under Settings so it isn't confused with "Promo Banners"
// (Content & Design → Appearance), which is a different feature: an image
// + CTA banner shown above the homepage hero. The two used to share almost
// the same name ("Announcement Bar" vs "Announcements") which was the
// actual source of confusion; they've been relabeled here to read as
// clearly distinct.

function flatItemsOf(group) {
  if (group.items) return group.items;
  if (group.subgroups) return group.subgroups.flatMap((s) => s.items);
  return [];
}

function isItemActive(item, pathname) {
  return item.exact ? pathname === item.path : pathname.startsWith(item.path);
}

function NavLink({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
        active ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:text-gold hover:bg-gold/5'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SubgroupBlock({ subgroup, pathname, open, onToggle, onLinkClick }) {
  const hasActive = subgroup.items.some((i) => isItemActive(i, pathname));
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold transition-colors ${
          hasActive ? 'text-gold/80' : 'text-gray-600 hover:text-gray-400'
        }`}
      >
        <span>{subgroup.label}</span>
        {open ? <HiChevronDown className="w-3 h-3" /> : <HiChevronRight className="w-3 h-3" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 pb-1">
              {subgroup.items.map((item) => (
                <NavLink
                  key={item.path}
                  item={item}
                  active={isItemActive(item, pathname)}
                  onClick={onLinkClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GroupBlock({ group, pathname, open, onToggle, openSub, onToggleSub, onLinkClick }) {
  const items = flatItemsOf(group);
  const hasActive = items.some((i) => isItemActive(i, pathname));
  const GroupIcon = group.icon;

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          hasActive ? 'text-gold' : 'text-gray-300 hover:text-gold'
        }`}
      >
        <span className="flex items-center gap-3">
          <GroupIcon className="w-4 h-4 flex-shrink-0" />
          {group.label}
        </span>
        {open ? <HiChevronDown className="w-3.5 h-3.5" /> : <HiChevronRight className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="pl-2 border-l border-gold/10 ml-4 mt-0.5">
              {group.items &&
                group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    item={item}
                    active={isItemActive(item, pathname)}
                    onClick={onLinkClick}
                  />
                ))}

              {group.subgroups &&
                group.subgroups.map((sg) => (
                  <SubgroupBlock
                    key={sg.key}
                    subgroup={sg}
                    pathname={pathname}
                    open={openSub[sg.key] ?? sg.items.some((i) => isItemActive(i, pathname))}
                    onToggle={() => onToggleSub(sg.key)}
                    onLinkClick={onLinkClick}
                  />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout, checkAuth } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const nameInputRef = useRef(null);

  // Groups start expanded only if they contain the current route — keeps
  // the sidebar short and scannable instead of dumping 24 links at once.
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    NAV.forEach((entry) => {
      if (entry.type === 'group') {
        initial[entry.key] = flatItemsOf(entry).some((i) => isItemActive(i, location.pathname));
      }
    });
    return initial;
  });
  const [openSubgroups, setOpenSubgroups] = useState({});

  const toggleGroup = (key) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));
  const toggleSubgroup = (key) => setOpenSubgroups((p) => ({ ...p, [key]: !p[key] }));
  const closeMobileSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const startEditName = () => {
    setNameValue(`${user?.first_name || ''} ${user?.last_name || ''}`.trim());
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const saveName = async () => {
    const parts = nameValue.trim().split(/\s+/);
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ') || '';

    try {
      await authAPI.updateProfile({ first_name, last_name });
      const stored = JSON.parse(localStorage.getItem('noor_mist_user') || '{}');
      localStorage.setItem('noor_mist_user', JSON.stringify({ ...stored, first_name, last_name }));
      checkAuth();
      toast.success('Name updated');
    } catch {
      toast.error('Failed to update name');
    }
    setEditingName(false);
  };

  const handleNameKey = (e) => {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') setEditingName(false);
  };

  const initials = `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}` || 'A';

  const activeLabel = useMemo(() => {
    for (const entry of NAV) {
      if (entry.type === 'link' && isItemActive(entry, location.pathname)) return entry.label;
      if (entry.type === 'group') {
        const match = flatItemsOf(entry).find((i) => isItemActive(i, location.pathname));
        if (match) return match.label;
      }
    }
    return 'Admin';
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-noir flex">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileSidebar}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:sticky top-0 left-0 h-dvh max-h-dvh lg:h-screen lg:max-h-screen w-72 flex-shrink-0 self-stretch bg-noir-light border-r border-gold/10 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Brand */}
          <div className="p-6 border-b border-gold/10 flex items-center justify-between flex-shrink-0">
            <div>
              <Link to="/admin" className="text-2xl font-playfair font-bold gold-text">
                Noor Mist
              </Link>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Admin Panel</p>
            </div>
            <button className="lg:hidden text-gray-400 hover:text-white" onClick={closeMobileSidebar}>
              <HiX className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation — its own contained scroll area, independent of the
              main page's scroll, so the sidebar never shrinks/collapses as
              the admin page underneath scrolls. */}
          <nav className="flex-1 min-h-0 overflow-y-auto p-3">
            {NAV.map((entry) =>
              entry.type === 'link' ? (
                <div key={entry.path} className="mb-1">
                  <NavLink
                    item={entry}
                    active={isItemActive(entry, location.pathname)}
                    onClick={closeMobileSidebar}
                  />
                </div>
              ) : (
                <GroupBlock
                  key={entry.key}
                  group={entry}
                  pathname={location.pathname}
                  open={!!openGroups[entry.key]}
                  onToggle={() => toggleGroup(entry.key)}
                  openSub={openSubgroups}
                  onToggleSub={toggleSubgroup}
                  onLinkClick={closeMobileSidebar}
                />
              )
            )}
          </nav>

          {/* Profile + logout — pinned to the bottom of the sidebar, always visible */}
          <div className="border-t border-gold/10 p-4 space-y-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-gold text-xs font-semibold uppercase flex-shrink-0">
                {initials}
              </div>

              {editingName ? (
                <input
                  ref={nameInputRef}
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={handleNameKey}
                  className="flex-1 min-w-0 bg-noir border border-gold/30 rounded-lg px-2 py-1 text-sm text-white outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={startEditName}
                  className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left group"
                >
                  <span className="text-sm text-gray-200 truncate">
                    {user?.first_name || user?.last_name
                      ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
                      : 'Admin'}
                  </span>
                  <HiPencil className="w-3.5 h-3.5 text-gray-600 group-hover:text-gold flex-shrink-0" />
                </button>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 text-danger text-sm hover:opacity-80 transition-opacity"
            >
              <HiLogout className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="h-16 border-b border-gold/10 flex items-center gap-3 px-4 sticky top-0 bg-noir z-30">
          <button className="lg:hidden text-gray-300" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <HiX className="w-5 h-5" /> : <HiMenu className="w-5 h-5" />}
          </button>
          <span className="text-sm text-gray-500 font-montserrat">
            Admin <span className="text-gray-700 mx-1.5">/</span>
            <span className="text-gray-300">{activeLabel}</span>
          </span>
        </header>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
