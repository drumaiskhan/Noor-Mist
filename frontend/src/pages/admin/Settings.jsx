import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI, authAPI, uploadAPI } from '../../services/api';
import { HiCheck, HiEye, HiEyeOff, HiShieldCheck, HiUpload, HiX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { applySiteIcon, toBool } from '../../utils/helpers';

const inputCls = 'w-full bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-gold outline-none transition-colors';

// Small square upload control for the site favicon — mirrors the pattern
// used for image fields elsewhere in the admin (e.g. HomepageBuilder).
function IconUploadField({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await uploadAPI.image(file);
      onChange(data.url);
      toast.success('Icon uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-700 bg-noir flex items-center justify-center flex-shrink-0">
        {value ? (
          <img src={value} alt="Site icon" className="w-full h-full object-contain" />
        ) : (
          <span className="text-gray-600 text-xs">None</span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors"
        >
          {uploading ? <span className="animate-spin">⟳</span> : <HiUpload className="w-3.5 h-3.5" />}
          {uploading ? 'Uploading…' : 'Upload Icon'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-red-900/60 text-gray-400 hover:text-red-300 rounded-lg text-xs transition-colors"
          >
            <HiX className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/x-icon,image/svg+xml,image/jpeg" className="hidden" onChange={handleFile} />
    </div>
  );
}

// Defined at module scope (not inside Settings) so its identity is stable
// across renders — otherwise React remounts the <input> on every keystroke
// and the field loses focus after a single character.
function PasswordInput({ value, onChange, label, visKey, showPasswords, toggleVis }) {
  return (
    <div>
      <label className="text-sm text-gray-400 mb-2 block font-montserrat">{label}</label>
      <div className="relative">
        <input
          type={showPasswords[visKey] ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className={`${inputCls} pr-11`}
        />
        <button
          type="button"
          onClick={() => toggleVis(visKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          {showPasswords[visKey] ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});

  // Admin credential state
  const [emailForm, setEmailForm] = useState({ email: '' });
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const { data: settings } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.settings ?? {};
    },
  });

  // Prefill email from profile
  const { data: profileData } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: async () => {
      const { data } = await authAPI.getProfile();
      return data.user;
    },
  });

  useEffect(() => {
    // announcement_enabled / maintenance_mode come back from the API as the
    // string "true"/"false" (settings are stored as TEXT) — coerce to real
    // booleans so the checkboxes below reflect the saved value correctly
    // instead of always rendering checked once a value has been saved.
    // announcement_messages is stored as a JSON string; parse it into the
    // editable list the form works with. Older data only has a single
    // announcement_text string — migrate that into a one-item list so it
    // isn't silently dropped the first time this page is saved.
    if (settings) {
      let messagesList = [];
      if (settings.announcement_messages) {
        try {
          const parsed = JSON.parse(settings.announcement_messages);
          if (Array.isArray(parsed)) messagesList = parsed;
        } catch {
          // ignore malformed stored JSON, fall through to legacy text below
        }
      }
      if (messagesList.length === 0 && settings.announcement_text) {
        messagesList = [{ text: settings.announcement_text, link: '' }];
      }
      // Always start with at least one editable row — otherwise a first-
      // time admin sees the "Enable" checkbox with nothing to type into
      // until they notice and click "+ Add message" first, which reads as
      // the whole feature being broken/dead.
      if (messagesList.length === 0) {
        messagesList = [{ text: '', link: '' }];
      }
      setForm({
        ...settings,
        announcement_enabled: toBool(settings.announcement_enabled),
        maintenance_mode: toBool(settings.maintenance_mode),
        announcement_messages_list: messagesList,
      });
    }
  }, [settings]);

  const addAnnouncementMessage = () => {
    setForm((f) => ({
      ...f,
      announcement_messages_list: [...(f.announcement_messages_list || []), { text: '', link: '' }],
    }));
  };

  const removeAnnouncementMessage = (index) => {
    setForm((f) => ({
      ...f,
      announcement_messages_list: (f.announcement_messages_list || []).filter((_, i) => i !== index),
    }));
  };

  const updateAnnouncementMessage = (index, field, value) => {
    setForm((f) => ({
      ...f,
      announcement_messages_list: (f.announcement_messages_list || []).map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  };

  useEffect(() => {
    if (profileData?.email) setEmailForm((f) => ({ ...f, email: profileData.email }));
  }, [profileData]);

  const updateMutation = useMutation({
    mutationFn: settingsAPI.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      applySiteIcon(form);
      toast.success('Settings updated');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const emailMutation = useMutation({
    mutationFn: ({ email }) => authAPI.changeEmail({ email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProfile'] });
      toast.success('Admin email updated');
      setEmailForm((f) => ({ ...f, email: '' }));
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to update email'),
  });

  const passMutation = useMutation({
    mutationFn: ({ current_password, new_password }) =>
      authAPI.changePassword({ current_password, new_password }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPassForm({ current_password: '', new_password: '', confirm_password: '' });
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to change password'),
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // announcement_messages_list is the editable in-memory shape; the API
    // stores every setting as a flat TEXT value, so it goes over the wire
    // as announcement_messages (JSON string) instead. Drop empty rows so a
    // blank "+ Add message" click that was never filled in doesn't get saved.
    const { announcement_messages_list, ...rest } = form;
    const cleanMessages = (announcement_messages_list || []).filter((m) => m.text?.trim());
    updateMutation.mutate({
      ...rest,
      announcement_messages: JSON.stringify(cleanMessages),
    });
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!emailForm.email.trim()) { toast.error('Email cannot be empty'); return; }
    emailMutation.mutate(emailForm);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passForm.new_password.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (passForm.new_password !== passForm.confirm_password) { toast.error('Passwords do not match'); return; }
    if (!passForm.current_password) { toast.error('Current password is required'); return; }
    passMutation.mutate(passForm);
  };

  const toggleVis = (key) => setShowPasswords((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">Site Settings</h1>
        <p className="text-gray-400 text-sm">Manage general website settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General */}
        <div className="luxury-card p-6 space-y-4">
          <h2 className="text-xl font-playfair font-bold">General</h2>
          <div>
            <label className="text-sm text-gray-400 mb-2 block font-montserrat">Site Name</label>
            <input type="text" name="site_name" value={form.site_name || ''} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block font-montserrat">Site Logo</label>
            <IconUploadField
              value={form.site_logo_url}
              onChange={(url) => setForm({ ...form, site_logo_url: url })}
            />
            <p className="text-xs text-gray-600 mt-2">
              Shown in the header on every page, in place of the "Noor Mist" text logo. Leave empty to keep the text
              logo. A transparent PNG/SVG of your full lockup (mark + wordmark) works best.
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block font-montserrat">Tagline</label>
            <input type="text" name="tagline" value={form.tagline || ''} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block font-montserrat">Site Icon (Favicon)</label>
            <IconUploadField
              value={form.favicon_url}
              onChange={(url) => setForm({ ...form, favicon_url: url })}
            />
            <p className="text-xs text-gray-600 mt-2">Shown in the browser tab. Square PNG, ICO or SVG works best.</p>
          </div>
        </div>

        {/* Contact */}
        <div className="luxury-card p-6 space-y-4">
          <h2 className="text-xl font-playfair font-bold">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Email</label>
              <input type="email" name="contact_email" value={form.contact_email || ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">Phone</label>
              <input type="text" name="contact_phone" value={form.contact_phone || ''} onChange={handleChange} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block font-montserrat">Address</label>
            <textarea name="address" value={form.address || ''} onChange={handleChange} rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>

        {/* Social Links */}
        <div className="luxury-card p-6 space-y-4">
          <h2 className="text-xl font-playfair font-bold">Social Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['instagram', 'facebook', 'twitter', 'youtube', 'tiktok'].map((platform) => (
              <div key={platform}>
                <label className="text-sm text-gray-400 mb-2 block font-montserrat capitalize">{platform} URL</label>
                <input
                  type="url"
                  name={`${platform}_url`}
                  value={form[`${platform}_url`] || ''}
                  onChange={handleChange}
                  placeholder={`https://${platform}.com/noormist`}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Shipping */}
        <div className="luxury-card p-6 space-y-3">
          <h2 className="text-xl font-playfair font-bold">Shipping</h2>
          <p className="text-sm text-gray-400">
            Shipping rates, free-shipping threshold, and regional zones are managed on the{' '}
            <a href="/admin/payment-settings" className="text-gold hover:underline">Payment &amp; Shipping</a> page.
          </p>
        </div>

        {/* Announcement */}
        <div className="luxury-card p-6 space-y-4">
          <h2 className="text-xl font-playfair font-bold">Announcement Bar</h2>
          <label className="flex items-center gap-3 cursor-pointer mb-2">
            <input type="checkbox" name="announcement_enabled" checked={form.announcement_enabled || false} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 text-gold focus:ring-gold bg-noir" />
            <span className="text-sm text-gray-300">Enable announcement bar</span>
          </label>
          <p className="text-xs text-gray-500 -mt-2">
            The bar rotates through the messages below. Add more than one and they'll cycle automatically, same as the default marketing messages shown when this is disabled.
            This is the thin scrolling text bar at the very top of the site — for the image + button banner shown above the homepage hero, see{' '}
            <a href="/admin/announcements" className="text-gold hover:underline">Promo Banners</a> under Content &amp; Design.
          </p>
          <div className="space-y-3">
            {(form.announcement_messages_list || []).map((msg, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-noir border border-gray-700 rounded-lg p-3">
                <input
                  type="text"
                  placeholder="Message text"
                  value={msg.text}
                  onChange={(e) => updateAnnouncementMessage(i, 'text', e.target.value)}
                  className="flex-1 w-full bg-transparent border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none"
                />
                <input
                  type="text"
                  placeholder="Link (optional, e.g. /shop)"
                  value={msg.link}
                  onChange={(e) => updateAnnouncementMessage(i, 'link', e.target.value)}
                  className="w-full sm:w-48 bg-transparent border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeAnnouncementMessage(i)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                  aria-label="Remove message"
                >
                  <HiX className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAnnouncementMessage}
              className="text-sm text-gold hover:underline"
            >
              + Add message
            </button>
          </div>
        </div>

        {/* Maintenance */}
        <div className="luxury-card p-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="maintenance_mode" checked={form.maintenance_mode || false} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 text-gold focus:ring-gold bg-noir" />
            <span className="text-sm text-gray-300">Enable maintenance mode</span>
          </label>
          <p className="text-xs text-gray-500 mt-2">
            When enabled, visitors see a "we'll be right back" page instead of the storefront. You'll still be able to browse and manage everything here in the admin panel while it's on.
          </p>
        </div>

        <button type="submit" className="btn-gold" disabled={updateMutation.isPending}>
          <HiCheck className="w-4 h-4 inline mr-2" />
          {updateMutation.isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      {/* ── Admin Credentials ──────────────────────────────────────── */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <HiShieldCheck className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 className="text-xl font-playfair font-bold">Admin Credentials</h2>
            <p className="text-sm text-gray-500">Change the admin login email or password</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Change Email */}
          <form onSubmit={handleEmailSubmit} className="luxury-card p-6 space-y-4">
            <h3 className="font-montserrat text-sm uppercase tracking-wider text-gray-400">Change Email</h3>
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-montserrat">New Email Address</label>
              <input
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                required
                className={inputCls}
                placeholder="admin@example.com"
              />
            </div>
            <button type="submit" className="btn-gold w-full text-sm" disabled={emailMutation.isPending}>
              {emailMutation.isPending ? 'Updating…' : 'Update Email'}
            </button>
          </form>

          {/* Change Password */}
          <form onSubmit={handlePasswordSubmit} className="luxury-card p-6 space-y-4">
            <h3 className="font-montserrat text-sm uppercase tracking-wider text-gray-400">Change Password</h3>
            <PasswordInput
              label="Current Password"
              value={passForm.current_password}
              onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
              visKey="current"
              showPasswords={showPasswords}
              toggleVis={toggleVis}
            />
            <PasswordInput
              label="New Password"
              value={passForm.new_password}
              onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
              visKey="new"
              showPasswords={showPasswords}
              toggleVis={toggleVis}
            />
            <PasswordInput
              label="Confirm New Password"
              value={passForm.confirm_password}
              onChange={(e) => setPassForm({ ...passForm, confirm_password: e.target.value })}
              visKey="confirm"
              showPasswords={showPasswords}
              toggleVis={toggleVis}
            />
            {passForm.new_password && passForm.confirm_password && passForm.new_password !== passForm.confirm_password && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
            <button type="submit" className="btn-gold w-full text-sm" disabled={passMutation.isPending}>
              {passMutation.isPending ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
