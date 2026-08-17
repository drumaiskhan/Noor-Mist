import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiHome,
  HiCube,
  HiTag,
  HiCollection,
  HiShoppingBag,
  HiUsers,
  HiStar,
  HiTicket,
  HiArchive,
  HiColorSwatch,
  HiTemplate,
  HiGlobe,
  HiCog,
  HiChartBar,
  HiX,
  HiLogout,
  HiBell,
  HiDocumentText,
  HiPhotograph,
  HiMail,
  HiCreditCard,
  HiBadgeCheck,
  HiLibrary,
  HiSparkles,
  HiAnnotation,
} from 'react-icons/hi';

import useAuthStore from '../../store/authStore';


const navItems = [
  { path: '/admin', label: 'Dashboard', icon: HiHome, exact: true },

  { path: '/admin/products', label: 'Products', icon: HiCube },
  { path: '/admin/categories', label: 'Categories', icon: HiTag },
  { path: '/admin/collections', label: 'Collections', icon: HiCollection },
  { path: '/admin/lookbooks', label: 'Lookbooks', icon: HiSparkles },
  { path: '/admin/site-content', label: 'Site Content', icon: HiTemplate },
  { path: '/admin/site-text', label: 'Site Text', icon: HiAnnotation },

  { path: '/admin/orders', label: 'Orders', icon: HiShoppingBag },
  { path: '/admin/customers', label: 'Customers', icon: HiUsers },
  { path: '/admin/reviews', label: 'Reviews', icon: HiStar },
  { path: '/admin/messages', label: 'Messages', icon: HiMail },
  { path: '/admin/coupons', label: 'Coupons', icon: HiTicket },
  { path: '/admin/inventory', label: 'Inventory', icon: HiArchive },
  { path: '/admin/analytics', label: 'Analytics', icon: HiChartBar },


  { separator: true },


  { path: '/admin/theme-editor', label: 'Theme Builder', icon: HiColorSwatch },
  { path: '/admin/homepage-builder', label: 'Homepage', icon: HiTemplate },
  { path: '/admin/product-page-builder', label: 'Product Page', icon: HiCube },

  // NEW
  { path: '/admin/announcements', label: 'Announcements', icon: HiBell },

  { path: '/admin/page-editor', label: 'Page Editor', icon: HiDocumentText },
  { path: '/admin/media-library', label: 'Media Library', icon: HiPhotograph },
  { path: '/admin/seo-manager', label: 'SEO Manager', icon: HiGlobe },


  { separator: true },


  { path: '/admin/email-settings', label: 'Email Settings', icon: HiMail },
  { path: '/admin/whatsapp-settings', label: 'WhatsApp Notifications', icon: HiAnnotation },
  { path: '/admin/payment-settings', label: 'Payment Settings', icon: HiBadgeCheck },
  { path: '/admin/bank-settings', label: 'Bank Settings', icon: HiLibrary },
  { path: '/admin/payment-shipping', label: 'Shipping', icon: HiCreditCard },

  { path: '/admin/settings', label: 'Settings', icon: HiCog },
];



export default function Sidebar({ isOpen, onClose }) {

  const navigate = useNavigate();

  const logout = useAuthStore((state) => state.logout);



  const handleLogout = () => {

    logout();

    navigate('/login');

  };



  const SidebarContent = () => (

    <div className="h-full flex flex-col">


      {/* Logo */}

      <div className="
        p-6 
        border-b 
        border-gold/10 
        flex 
        items-center 
        justify-between
      ">

        <div>

          <h2 className="
            text-xl 
            font-playfair 
            font-bold 
            gold-text
          ">
            Noor Mist
          </h2>


          <p className="
            text-xs 
            text-gray-500 
            font-montserrat 
            tracking-widest 
            mt-0.5
          ">
            ADMIN PANEL
          </p>

        </div>



        {onClose && (

          <button

            onClick={onClose}

            className="
              lg:hidden 
              text-gray-400 
              hover:text-white 
              p-1
            "

          >

            <HiX className="w-5 h-5"/>

          </button>

        )}

      </div>





      {/* Navigation */}


      <nav className="
        flex-1 
        overflow-y-auto 
        p-4 
        space-y-1
      ">


        {navItems.map((item,index)=>(


          item.separator ? (

            <div
              key={index}
              className="
                h-px 
                bg-gray-800 
                my-3
              "
            />

          ) : (


          <NavLink

            key={item.path}

            to={item.path}

            end={item.exact}

            onClick={onClose}

            className={({isActive}) =>

              `
              flex 
              items-center 
              gap-3 
              px-4 
              py-3 
              rounded-xl 
              text-sm 
              font-montserrat 
              transition-all

              ${
                isActive

                ? 
                'bg-gold/10 text-gold border border-gold/20'

                :

                'text-gray-400 hover:bg-white/5 hover:text-white'
              }

              `
            }

          >


            <item.icon className="
              w-5 
              h-5 
              flex-shrink-0
            "/>


            {item.label}


          </NavLink>


          )


        ))}


      </nav>






      {/* Footer */}


      <div className="
        p-4 
        border-t 
        border-gray-800
      ">



        <NavLink

          to="/"

          className="
            flex 
            items-center 
            gap-3 
            px-4 
            py-3 
            rounded-xl 
            text-sm 
            text-gray-400 
            hover:text-white 
            hover:bg-white/5 
            transition-all 
            mb-1
          "

        >

          <HiHome className="w-5 h-5"/>

          View Store


        </NavLink>






        <button

          onClick={handleLogout}

          className="
            w-full 
            flex 
            items-center 
            gap-3 
            px-4 
            py-3 
            rounded-xl 
            text-sm 
            text-gray-400 
            hover:text-red-400 
            hover:bg-red-500/5 
            transition-all
          "

        >

          <HiLogout className="w-5 h-5"/>

          Sign Out


        </button>


      </div>



    </div>

  );





  return (

    <>


      {/* Desktop Sidebar */}

      <aside className="
        hidden 
        lg:flex 
        w-64 
        flex-shrink-0 
        bg-noir-card 
        border-r 
        border-gray-800 
        h-screen 
        sticky 
        top-0 
        flex-col
      ">

        <SidebarContent/>

      </aside>







      {/* Mobile Drawer */}

      <AnimatePresence>


        {isOpen && (

          <>


            <motion.div

              initial={{opacity:0}}

              animate={{opacity:1}}

              exit={{opacity:0}}

              onClick={onClose}

              className="
                fixed 
                inset-0 
                bg-black/60 
                z-40 
                lg:hidden
              "

            />





            <motion.aside

              initial={{x:-300}}

              animate={{x:0}}

              exit={{x:-300}}

              transition={{
                type:'spring',
                damping:30
              }}

              className="
                fixed 
                left-0 
                top-0 
                h-full 
                w-72 
                bg-noir-card 
                border-r 
                border-gray-800 
                z-50 
                lg:hidden
              "

            >

              <SidebarContent/>

            </motion.aside>



          </>

        )}


      </AnimatePresence>



    </>

  );

}
