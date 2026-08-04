import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { homepageAPI } from '../services/api';

import HeroBanner from '../components/Home/HeroBanner';
import PerfumeFinder from '../components/Home/PerfumeFinder';
import Collections from '../components/Home/Collections';
import BestSellers from '../components/Home/BestSellers';
import NewArrivals from '../components/Home/NewArrivals';
import BrandStory from '../components/Home/BrandStory';
import Testimonials from '../components/Home/Testimonials';
import InstagramFeed from '../components/Home/InstagramFeed';
import Newsletter from '../components/Home/Newsletter';
import TrustBadges from '../components/Home/TrustBadges';

export default function Home() {
  const { data: sectionsData } = useQuery({
    queryKey: ['homepageSections'],
    queryFn: homepageAPI.getSections,
    staleTime: 5 * 60 * 1000,
  });

  const sections = Array.isArray(sectionsData)
    ? sectionsData
    : Array.isArray(sectionsData?.data)
      ? sectionsData.data
      : [];

  const getSectionData = (type) => {
    const section = sections.find(
      (s) => s.section_type === type && s.is_enabled
    );

    return section?.content_data || {};
  };

  return (
    <>
      <Helmet>
        <title>
          Noor Mist - Luxury Perfumes | Where Luxury Meets Mystery
        </title>

        <meta
          name="description"
          content="Discover Noor Mist's exclusive collection of luxury perfumes. Premium fragrances crafted with the finest ingredients for men and women."
        />

        <meta
          property="og:title"
          content="Noor Mist - Luxury Perfumes"
        />

        <meta
          property="og:description"
          content="Where Luxury Meets Mystery. Discover our exclusive collection of premium fragrances."
        />
      </Helmet>

      <HeroBanner data={getSectionData('hero')} />

      <TrustBadges />

      <Collections data={getSectionData('collections')} />

      <BestSellers data={getSectionData('bestsellers')} />

      <NewArrivals data={getSectionData('new_arrivals')} />

      <PerfumeFinder data={getSectionData('perfume_finder')} />

      <BrandStory data={getSectionData('brand_story')} />

      <Testimonials data={getSectionData('testimonials')} />

      <InstagramFeed data={getSectionData('instagram')} />

      <Newsletter data={getSectionData('newsletter')} />
    </>
  );
}
