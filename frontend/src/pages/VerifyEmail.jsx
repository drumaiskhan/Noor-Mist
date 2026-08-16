import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { HiCheck, HiExclamationCircle } from 'react-icons/hi';
import useAuthStore from '../store/authStore';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const { verifyEmail } = useAuthStore();
  const [state, setState] = useState({ loading: true, error: '' });

  useEffect(() => {
    if (!token) { setState({ loading:false, error:'This verification link is missing or invalid.' }); return; }
    verifyEmail({ token })
      .then(() => { setState({ loading:false, error:'' }); setTimeout(() => navigate('/', { replace:true }), 900); })
      .catch((e) => setState({ loading:false, error:e.message }));
  }, [token]);

  return <>
    <Helmet><title>Verify Email</title></Helmet>
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-32">
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="w-full max-w-lg">
        <div className="luxury-card p-8 text-center">
          {state.loading ? <><div className="text-4xl mb-4">✉️</div><h1 className="text-2xl font-playfair font-bold mb-2">Verifying Your Email…</h1><p className="text-theme-muted">Please wait while we activate your account.</p></>
          : state.error ? <><HiExclamationCircle className="w-14 h-14 mx-auto text-danger mb-4"/><h1 className="text-2xl font-playfair font-bold mb-2">Verification Failed</h1><p className="text-theme-muted mb-6">{state.error}</p><Link to="/register" className="btn-gold inline-block">Create Account Again</Link></>
          : <><HiCheck className="w-16 h-16 mx-auto text-success mb-4"/><h1 className="text-3xl font-playfair font-bold mb-2">Email Verified!</h1><p className="text-theme-muted">Your account is verified and you are now signed in.</p></>}
        </div>
      </motion.div>
    </div>
  </>;
}
