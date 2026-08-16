import React from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { homepageAPI, collectionsAPI, settingsAPI } from "../services/api";

import HeroBanner from "../components/Home/HeroBanner";
import AnnouncementCarousel from "../components/Home/AnnouncementCarousel";
import PerfumeFinder from "../components/Home/PerfumeFinder";
import Collections from "../components/Home/Collections";
import BestSellers from "../components/Home/BestSellers";
import NewArrivals from "../components/Home/NewArrivals";
import BrandStory from "../components/Home/BrandStory";
import Testimonials from "../components/Home/Testimonials";
import InstagramFeed from "../components/Home/InstagramFeed";
import Newsletter from "../components/Home/Newsletter";
import TrustBadges from "../components/Home/TrustBadges";

export default function Home() {

  const { data: siteSettings = {} } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: async () => (await settingsAPI.get()).data.settings || {},
    staleTime: 5 * 60 * 1000,
  });

  // Homepage Builder Sections
  const { data: sectionsData } = useQuery({
    queryKey: ["homepageSections"],
    queryFn: homepageAPI.getSections,
    // Admin-edited content — 5 minutes was too long a "fresh" window;
    // 60s still avoids refetching on every render but lets admin edits
    // and post-sleep revalidation show up quickly.
    staleTime: 60 * 1000,
  });


  // Dynamic Collections CMS
  const { data: collectionsData } = useQuery({
    queryKey: ["homepageCollections"],
    queryFn: () => collectionsAPI.getAll({ homepage: true }),
    staleTime: 60 * 1000,
  });


  const sections = Array.isArray(sectionsData)
    ? sectionsData
    : Array.isArray(sectionsData?.data)
      ? sectionsData.data
      : [];


  const collections = (
    collectionsData?.data?.collections ||
    collectionsData?.data ||
    []
  ).filter(
    (collection) => collection.is_active !== false
  );


  const getSection = (type) => sections.find((s) => s.section_type === type);
  const getSectionData = (type) => getSection(type)?.content_data || {};
  const isSectionEnabled = (type) => getSection(type)?.is_enabled !== false;


  return (
    <>
      <Helmet>

        <title>{siteSettings.site_name || "Noor Mist"}{siteSettings.tagline ? ` - ${siteSettings.tagline}` : ""}</title>

        <meta
          name="description"
          content={siteSettings.meta_description || `Discover ${siteSettings.site_name || "Noor Mist"} luxury fragrances.`}
        />

        <meta
          property="og:title"
          content={`${siteSettings.site_name || "Noor Mist"} - Luxury Perfumes`}
        />

        <meta
          property="og:description"
          content={siteSettings.tagline || "Luxury fragrances crafted for you."}
        />

      </Helmet>


      {/* Announcements — swipeable strip, admin-managed */}
      <AnnouncementCarousel />

      {/* Hero */}
      {isSectionEnabled("hero") && <HeroBanner data={getSectionData("hero")} />}


      {/* Trust */}
      {isSectionEnabled("trust_badges") && <TrustBadges data={getSectionData("trust_badges")} />}



      {/* Dynamic Collections CMS */}
      {isSectionEnabled("collections") && <Collections data={{ ...getSectionData("collections"), collections }} />}



      {/* Products */}
      {isSectionEnabled("bestsellers") && <BestSellers data={getSectionData("bestsellers")} />}


      {isSectionEnabled("new_arrivals") && <NewArrivals data={getSectionData("new_arrivals")} />}


      {isSectionEnabled("perfume_finder") && <PerfumeFinder data={getSectionData("perfume_finder")} />}


      {isSectionEnabled("brand_story") && <BrandStory data={getSectionData("brand_story")} />}


      {isSectionEnabled("testimonials") && <Testimonials data={getSectionData("testimonials")} />}


      {isSectionEnabled("instagram") && <InstagramFeed data={getSectionData("instagram")} />}


      {isSectionEnabled("newsletter") && <Newsletter data={getSectionData("newsletter")} />}

    </>
  );
}
