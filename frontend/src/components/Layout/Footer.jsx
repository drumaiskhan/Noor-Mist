import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiMail, HiPhone, HiLocationMarker } from 'react-icons/hi';
import {
  FaInstagram, FaFacebook, FaTwitter, FaYoutube, FaTiktok,
  FaSnapchat, FaPinterest, FaWhatsapp, FaLinkedin, FaTelegram,
} from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { settingsAPI } from '../../services/api';

const SOCIAL_MAP = {
  instagram:  { icon: FaInstagram,  label: 'Instagram'  },
  facebook:   { icon: FaFacebook,   label: 'Facebook'   },
  twitter:    { icon: FaTwitter,    label: 'Twitter / X' },
  youtube:    { icon: FaYoutube,    label: 'YouTube'    },
  tiktok:     { icon: FaTiktok,     label: 'TikTok'     },
  snapchat:   { icon: FaSnapchat,   label: 'Snapchat'   },
  pinterest:  { icon: FaPinterest,  label: 'Pinterest'  },
  whatsapp:   { icon: FaWhatsapp,   label: 'WhatsApp'   },
  linkedin:   { icon: FaLinkedin,   label: 'LinkedIn'   },
  telegram:   { icon: FaTelegram,   label: 'Telegram'   },
};

const footerLinks = {
  shop: [
    { label: "All Perfumes",        path: '/shop' },
    { label: "Men's Collection",    path: '/shop?gender=male' },
    { label: "Women's Collection",  path: '/shop?gender=female' },
    { label: 'Unisex',              path: '/shop?gender=unisex' },
    { label: 'Oud Collection',      path: '/shop?fragrance_family=oud' },
    { label: 'Gift Sets',           path: '/shop?gift_set=true' },
  ],
  company: [
    { label: 'About Us',       path: '/about'   },
    { label: 'Collections',    path: '/collections' },
    { label: 'Contact',        path: '/contact' },
    { label: 'FAQ',            path: '/faq'     },
  ],
  account: [
    { label: 'My Account',  path: '/account'        },
    { label: 'My Orders',   path: '/account/orders' },
    { label: 'Wishlist',    path: '/wishlist'        },
    { label: 'Track Order', path: '/account/orders' },
  ],
};

export default function Footer() {
  const { data: settings = {} } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.settings ?? {};
    },
    staleTime: 5 * 60 * 1000,
  });

  // Build active social links from settings
  const socialLinks = Object.entries(SOCIAL_MAP)
    .map(([key, { icon, label }]) => ({
      icon, label, href: settings[`${key}_url`] || '',
    }))
    .filter((s) => s.href);

  const email   = settings.contact_email || 'contact@noormist.com';
  const phone   = settings.contact_phone || '+92 300 1234567';
  const address = settings.address       || 'Lahore, Pakistan';

  return (
    <footer className="bg-footer-theme border-t border-gold/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <span className="text-3xl font-playfair font-bold gold-text">
                {settings.site_name || 'Noor Mist'}
              </span>
            </Link>
            <p className="text-theme-muted mb-6 font-cormorant text-lg leading-relaxed max-w-sm">
              {settings.tagline || 'Where Luxury Meets Mystery. Discover our exclusive collection of premium fragrances crafted with the finest ingredients from around the world.'}
            </p>

            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 rounded-full bg-theme-card border border-theme-primary/10 flex items-center justify-center text-theme-muted hover:text-theme-primary hover:border-theme-primary/30 transition-all"
                    aria-label={social.label}
                  >
                    <social.icon className="w-4 h-4" />
                  </motion.a>
                ))}
              </div>
            )}

            {/* Fallback static icons when nothing saved yet */}
            {socialLinks.length === 0 && (
              <div className="flex gap-3">
                {[FaInstagram, FaFacebook, FaTwitter, FaYoutube, FaTiktok].map((Icon, i) => (
                  <span
                    key={i}
                    className="w-10 h-10 rounded-full bg-theme-card border border-theme-primary/10 flex items-center justify-center text-theme-muted opacity-60"
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="text-theme-primary font-montserrat text-sm uppercase tracking-wider mb-6">Shop</h3>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.label}>
                  <Link to={link.path} className="text-theme-muted hover:text-theme-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-theme-primary font-montserrat text-sm uppercase tracking-wider mb-6">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.path} className="text-theme-muted hover:text-theme-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h3 className="text-theme-primary font-montserrat text-sm uppercase tracking-wider mb-6">Account</h3>
            <ul className="space-y-3">
              {footerLinks.account.map((link) => (
                <li key={link.label}>
                  <Link to={link.path} className="text-theme-muted hover:text-theme-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-12 pt-8 border-t border-gold/5">
          <div className="flex flex-wrap gap-6 text-sm text-theme-muted">
            <div className="flex items-center gap-2">
              <HiMail className="w-4 h-4 text-theme-primary" />
              <span>{email}</span>
            </div>
            <div className="flex items-center gap-2">
              <HiPhone className="w-4 h-4 text-theme-primary" />
              <span>{phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <HiLocationMarker className="w-4 h-4 text-theme-primary" />
              <span>{address}</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-theme-primary/5 text-center">
          <p className="text-theme-muted opacity-60 text-sm">
            &copy; {new Date().getFullYear()} {settings.site_name || 'Noor Mist'}. All rights reserved.
            Crafted with passion for luxury fragrances.
          </p>
        </div>
      </div>
    </footer>
  );
}
