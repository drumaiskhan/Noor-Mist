import React, { useState, useRef } from 'react';
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
  HiLibrary,
  HiPhotograph,
  HiDocumentText,
  HiBell,
} from 'react-icons/hi';

import useAuthStore from '../../store/authStore';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';



const sidebarLinks = [

  {
    path: '/admin',
    label: 'Dashboard',
    icon: HiHome,
    exact: true
  },

  {
    path: '/admin/products',
    label: 'Products',
    icon: HiCube
  },

  {
    path: '/admin/categories',
    label: 'Categories',
    icon: HiTag
  },

  {
    path: '/admin/collections',
    label: 'Collections',
    icon: HiCollection
  },

  {
    path: '/admin/orders',
    label: 'Orders',
    icon: HiClipboardList
  },

  {
    path: '/admin/customers',
    label: 'Customers',
    icon: HiUsers
  },

  {
    path: '/admin/reviews',
    label: 'Reviews',
    icon: HiStar
  },

  {
    path: '/admin/coupons',
    label: 'Coupons',
    icon: HiTicket
  },

  {
    path: '/admin/inventory',
    label: 'Inventory',
    icon: HiArchive
  },

  {
    path: '/admin/analytics',
    label: 'Analytics',
    icon: HiChartBar
  },


  {
    path: '/admin/theme-editor',
    label: 'Theme Editor',
    icon: HiColorSwatch
  },

  {
    path: '/admin/homepage-builder',
    label: 'Homepage Builder',
    icon: HiTemplate
  },


  // ⭐ NEW
  {
    path: '/admin/announcements',
    label: 'Announcements',
    icon: HiBell
  },


  {
    path: '/admin/page-editor',
    label: 'Page Editor',
    icon: HiDocumentText
  },

  {
    path: '/admin/media-library',
    label: 'Media Library',
    icon: HiPhotograph
  },

  {
    path: '/admin/seo-manager',
    label: 'SEO Manager',
    icon: HiSearchCircle
  },

  {
    path: '/admin/email-settings',
    label: 'Email Settings',
    icon: HiMail
  },

  {
    path: '/admin/payment-settings',
    label: 'Payments',
    icon: HiCreditCard
  },

  {
    path: '/admin/bank-settings',
    label: 'Bank Settings',
    icon: HiLibrary
  },

  {
    path: '/admin/settings',
    label: 'Settings',
    icon: HiCog
  },

];





export default function AdminLayout() {


  const location = useLocation();

  const navigate = useNavigate();

  const {
    user,
    logout,
    checkAuth
  } = useAuthStore();



  const [sidebarOpen,setSidebarOpen] = useState(false);

  const [editingName,setEditingName] = useState(false);

  const [nameValue,setNameValue] = useState('');

  const nameInputRef = useRef(null);





  const handleLogout = () => {

    logout();

    navigate('/admin/login');

  };






  const startEditName = () => {

    setNameValue(
      `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
    );

    setEditingName(true);


    setTimeout(()=>{

      nameInputRef.current?.focus();

    },50);

  };







  const saveName = async()=>{


    const parts = nameValue.trim().split(/\s+/);


    const first_name = parts[0] || '';

    const last_name = parts.slice(1).join(' ') || '';



    try {


      await authAPI.updateProfile({
        first_name,
        last_name
      });



      const stored =
      JSON.parse(
        localStorage.getItem('noor_mist_user') || '{}'
      );



      localStorage.setItem(

        'noor_mist_user',

        JSON.stringify({
          ...stored,
          first_name,
          last_name
        })

      );


      checkAuth();

      toast.success('Name updated');


    }
    catch{

      toast.error('Failed to update name');

    }



    setEditingName(false);


  };






  const handleNameKey = (e)=>{

    if(e.key === 'Enter')
      saveName();


    if(e.key === 'Escape')
      setEditingName(false);

  };







  const initials =
  `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`;






return (

<div className="min-h-screen bg-noir flex">



<AnimatePresence>

{
sidebarOpen && (

<motion.div

initial={{opacity:0}}

animate={{opacity:1}}

exit={{opacity:0}}

onClick={()=>setSidebarOpen(false)}

className="
fixed inset-0
bg-black/60
z-40
lg:hidden
"

/>

)

}

</AnimatePresence>






<aside

className={`
fixed lg:sticky top-0 left-0
h-screen w-64
bg-noir-light
border-r border-gold/10
z-50
flex flex-col
transition-transform
duration-300
lg:translate-x-0
${sidebarOpen ? 'translate-x-0':'-translate-x-full'}
`}

>



<div className="flex flex-col h-full">



<div className="p-6 border-b border-gold/10">

<Link
to="/admin"
className="
text-2xl
font-playfair
font-bold
gold-text
"
>

Noor Mist

</Link>


<p className="
text-xs
text-gray-500
mt-1
uppercase
tracking-widest
">

Admin Panel

</p>


</div>








<nav className="flex-1 overflow-y-auto p-4">

<ul className="space-y-1">


{
sidebarLinks.map((link)=>{


const active = link.exact
?
location.pathname === link.path
:
location.pathname.startsWith(link.path);



const Icon = link.icon;



return (

<li key={link.path}>


<Link

to={link.path}

onClick={()=>setSidebarOpen(false)}

className={`
flex
items-center
gap-3
px-4
py-3
rounded-lg
text-sm
transition-all

${
active
?
'bg-gold/10 text-gold'
:
'text-gray-400 hover:text-gold hover:bg-gold/5'
}

`}

>


<Icon className="w-5 h-5"/>


<span>

{link.label}

</span>


</Link>


</li>


);


})


}



</ul>

</nav>







<div className="border-t border-gold/10 p-4">


<button

onClick={handleLogout}

className="
flex
items-center
gap-3
text-danger
"

>


<HiLogout/>


Logout


</button>


</div>





</div>



</aside>







<div className="flex-1">


<header className="
h-16
border-b
border-gold/10
flex
items-center
px-4
">


<button

className="lg:hidden"

onClick={()=>setSidebarOpen(!sidebarOpen)}

>


{
sidebarOpen
?
<HiX/>
:
<HiMenu/>
}

</button>


</header>





<main className="p-4 lg:p-8">

<Outlet/>

</main>


</div>




</div>


);


}
