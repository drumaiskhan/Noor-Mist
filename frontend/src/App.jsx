import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

import MainLayout from './components/Layout/MainLayout';
import AdminLayout from './components/Layout/AdminLayout';
import AdminRoute from './components/Auth/AdminRoute';
import Loader from './components/UI/Loader';

import useThemeStore from './store/themeStore';
import useAuthStore from './store/authStore';

import { settingsAPI } from './services/api';
import { applySiteIcon } from './utils/helpers';


// Public pages

const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Account = lazy(() => import('./pages/Account'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const FAQ = lazy(() => import('./pages/FAQ'));
const PolicyPage = lazy(() => import('./pages/PolicyPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Collections = lazy(() => import('./pages/Collections'));


// Admin pages

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));

const Products = lazy(() => import('./pages/admin/Products'));

const ProductForm = lazy(() => import('./pages/admin/ProductForm'));

const Categories = lazy(() => import('./pages/admin/Categories'));

const Orders = lazy(() => import('./pages/admin/Orders'));

const Customers = lazy(() => import('./pages/admin/Customers'));

const Reviews = lazy(() => import('./pages/admin/Reviews'));

const Coupons = lazy(() => import('./pages/admin/Coupons'));

const Inventory = lazy(() => import('./pages/admin/Inventory'));

const ThemeEditor = lazy(() => import('./pages/admin/ThemeEditor'));

const HomepageBuilder = lazy(() => import('./pages/admin/HomepageBuilder'));

const SEOManager = lazy(() => import('./pages/admin/SEOManager'));

const Settings = lazy(() => import('./pages/admin/Settings'));

const Analytics = lazy(() => import('./pages/admin/Analytics'));

const AdminCollections = lazy(() => import('./pages/admin/Collections'));

const Announcements = lazy(() => import('./pages/admin/Announcements'));

const EmailSettings = lazy(() => import('./pages/admin/EmailSettings'));

const PaymentShipping = lazy(() => import('./pages/admin/PaymentShipping'));

const PaymentSettings = lazy(() => import('./pages/admin/PaymentSettings'));

const MediaLibrary = lazy(() => import('./pages/admin/MediaLibrary'));

const PageEditor = lazy(() => import('./pages/admin/PageEditor'));

const BankSettings = lazy(() => import('./pages/admin/BankSettings'));





export default function App() {


  const fetchActiveTheme =
    useThemeStore((s)=>s.fetchActiveTheme);


  const checkAuth =
    useAuthStore((s)=>s.checkAuth);





  useEffect(()=>{


    fetchActiveTheme();

    checkAuth();


    settingsAPI.get()

      .then(({data})=>{

        applySiteIcon(
          data.settings || {}
        );

      })

      .catch(()=>{});


  }, []);






return (

<>


<AnimatePresence mode="wait">


<Suspense fallback={<Loader />}>


<Routes>


{/* PUBLIC */}

<Route element={<MainLayout />}>

<Route path="/" element={<Home />} />

<Route path="/shop" element={<Shop />} />

<Route path="/product/:slug" element={<ProductDetail />} />

<Route path="/cart" element={<Cart />} />

<Route path="/checkout" element={<Checkout />} />

<Route path="/wishlist" element={<Wishlist />} />

<Route path="/login" element={<Login />} />

<Route path="/register" element={<Register />} />

<Route path="/account/*" element={<Account />} />

<Route path="/about" element={<About />} />

<Route path="/contact" element={<Contact />} />

<Route path="/faq" element={<FAQ />} />


<Route
path="/privacy"
element={
<PolicyPage
pageKey="privacy"
defaultHeading="Privacy Policy"
/>
}
/>


<Route
path="/refund"
element={
<PolicyPage
pageKey="refund"
defaultHeading="Refund Policy"
/>
}
/>


<Route
path="/shipping-policy"
element={
<PolicyPage
pageKey="shipping_policy"
defaultHeading="Shipping Policy"
/>
}
/>


<Route
path="/terms"
element={
<PolicyPage
pageKey="terms"
defaultHeading="Terms & Conditions"
/>
}
/>


<Route
path="/collections"
element={<Collections />}
/>


<Route
path="*"
element={<NotFound />}
/>


</Route>






{/* ADMIN LOGIN */}

<Route
path="/admin/login"
element={<AdminLogin />}
/>







{/* ADMIN */}

<Route

path="/admin"

element={
<AdminRoute>
<AdminLayout />
</AdminRoute>
}

>


<Route index element={<Dashboard />} />

<Route path="products" element={<Products />} />

<Route path="products/new" element={<ProductForm />} />

<Route path="products/:id/edit" element={<ProductForm />} />

<Route path="categories" element={<Categories />} />

<Route path="collections" element={<AdminCollections />} />

<Route path="orders" element={<Orders />} />

<Route path="customers" element={<Customers />} />

<Route path="reviews" element={<Reviews />} />

<Route path="coupons" element={<Coupons />} />

<Route path="inventory" element={<Inventory />} />

<Route path="theme-editor" element={<ThemeEditor />} />

<Route path="homepage-builder" element={<HomepageBuilder />} />


{/* ⭐ NEW ANNOUNCEMENTS ROUTE */}

<Route
path="announcements"
element={<Announcements />}
/>


<Route path="seo-manager" element={<SEOManager />} />

<Route path="settings" element={<Settings />} />

<Route path="analytics" element={<Analytics />} />

<Route path="email-settings" element={<EmailSettings />} />

<Route path="payment-shipping" element={<PaymentShipping />} />

<Route path="payment-settings" element={<PaymentSettings />} />

<Route path="media-library" element={<MediaLibrary />} />

<Route path="page-editor" element={<PageEditor />} />

<Route path="bank-settings" element={<BankSettings />} />


</Route>



</Routes>


</Suspense>


</AnimatePresence>






<Toaster

position="top-right"

toastOptions={{

duration:4000,

style:{

background:'#1A1A1A',

color:'#D4AF37',

border:
'1px solid rgba(212,175,55,0.3)',

backdropFilter:'blur(20px)',

}

}}

/>



</>

);


}
