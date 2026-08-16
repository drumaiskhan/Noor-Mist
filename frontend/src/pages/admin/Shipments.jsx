import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderAPI } from '../../services/api';
import { HiTruck, HiSearch, HiExternalLink } from 'react-icons/hi';
import { formatPrice, formatDate } from '../../utils/helpers';

export default function Shipments(){
  const {data,isLoading,error}=useQuery({queryKey:['shipments'],queryFn:()=>orderAPI.getAll({status:'shipped',page:1,limit:100})});
  const orders=data?.data?.orders||[];
  const deliveredQ=useQuery({queryKey:['deliveredShipments'],queryFn:()=>orderAPI.getAll({status:'delivered',page:1,limit:100})});
  const all=[...orders,...(deliveredQ.data?.data?.orders||[])];
  return <div className="space-y-6"><div><h1 className="text-3xl font-playfair font-bold">Shipments</h1><p className="text-gray-400 text-sm">Track shipped and delivered orders and their carrier information.</p></div>
  {isLoading||deliveredQ.isLoading?<div className="text-gray-400">Loading shipments…</div>:error?<div className="luxury-card p-6 text-red-400">{error.response?.data?.error||'Failed to load shipments'}</div>:<div className="luxury-card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-gray-500 border-b border-gray-800"><th className="text-left p-4">Order</th><th className="text-left">Customer</th><th className="text-left">Status</th><th className="text-left">Carrier</th><th className="text-left">Tracking</th><th className="text-left">Total</th><th></th></tr></thead><tbody>{all.map(o=><tr key={o.id} className="border-b border-gray-800/60"><td className="p-4 text-gold font-mono">{o.order_number}</td><td>{o.email||[o.first_name,o.last_name].filter(Boolean).join(' ')||'Guest'}</td><td className="capitalize">{o.status}</td><td>{o.tracking_carrier||'—'}</td><td className="font-mono">{o.tracking_number||'—'}</td><td>{formatPrice(o.total_amount)}</td><td>{o.tracking_url&&<a href={o.tracking_url} target="_blank" rel="noreferrer" className="text-gold"><HiExternalLink/></a>}</td></tr>)}{!all.length&&<tr><td colSpan="7" className="p-10 text-center text-gray-500">No shipments yet.</td></tr>}</tbody></table></div>}</div>
}
