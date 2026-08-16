import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productAPI } from '../services/api';

export function useProducts(params = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productAPI.getAll(params),
    select: (data) => data,
  });
}

export function useProduct(slug) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => productAPI.getOne(slug),
    enabled: !!slug,
    select: (data) => data,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: productAPI.getFeatured,
    select: (data) => data?.products || [],
  });
}

export function useBestSellers() {
  return useQuery({
    queryKey: ['products', 'bestsellers'],
    queryFn: productAPI.getBestSellers,
    select: (data) => data?.products || [],
  });
}

export function useNewArrivals() {
  return useQuery({
    queryKey: ['products', 'new_arrivals'],
    queryFn: productAPI.getNewArrivals,
    select: (data) => data?.products || [],
  });
}

export default useProducts;
