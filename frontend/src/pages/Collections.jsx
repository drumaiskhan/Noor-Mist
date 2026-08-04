import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { collectionsAPI } from "../services/api";
import { HiArrowRight, HiCollection } from "react-icons/hi";

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
    },
  }),
};

export default function Collections() {

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ["publicCollections"],
    queryFn: collectionsAPI.getAll,
  });


  const collections = (
    data?.data?.collections ||
    data?.data ||
    []
  ).filter(
    (c) => c.is_active !== false
  );


  return (
    <>
      <Helmet>
        <title>
          Collections — Noor Mist
        </title>

        <meta
          name="description"
          content="Explore Noor Mist luxury fragrance collections."
        />
      </Helmet>


      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-theme-background overflow-hidden">

        <div className="absolute inset-0 bg-gradient-to-b from-theme-primary/10 to-transparent" />


        <div className="max-w-7xl mx-auto px-4 text-center relative">

          <motion.p
            initial={{opacity:0,y:10}}
            animate={{opacity:1,y:0}}
            className="
              text-theme-primary
              text-xs
              uppercase
              tracking-[0.3em]
              mb-4
            "
          >
            Noor Mist
          </motion.p>


          <motion.h1
            initial={{opacity:0,y:20}}
            animate={{opacity:1,y:0}}
            transition={{delay:0.1}}
            className="
              text-4xl
              md:text-6xl
              font-heading
              font-bold
              text-theme-text
              mb-6
            "
          >
            Our Collections
          </motion.h1>


          <motion.p
            initial={{opacity:0,y:20}}
            animate={{opacity:1,y:0}}
            transition={{delay:0.2}}
            className="
              text-theme-muted
              font-body
              text-xl
              max-w-2xl
              mx-auto
            "
          >
            Carefully curated fragrance collections, each telling a unique
            story of luxury and mystery.
          </motion.p>

        </div>

      </section>



      {/* Collections */}
      <section className="py-16 bg-theme-background">

        <div className="max-w-7xl mx-auto px-4">


          {isLoading ? (

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

              {[...Array(6)].map((_,i)=>(
                <div
                  key={i}
                  className="
                    aspect-[4/5]
                    rounded-2xl
                    bg-theme-card
                    animate-pulse
                  "
                />
              ))}

            </div>


          ) : collections.length === 0 ? (

            <div className="text-center py-24">

              <HiCollection
                className="
                  w-16
                  h-16
                  text-theme-muted
                  mx-auto
                  mb-4
                "
              />

              <h3
                className="
                  text-2xl
                  font-heading
                  font-bold
                  text-theme-text
                  mb-2
                "
              >
                No Collections Yet
              </h3>


              <p className="text-theme-muted mb-8">
                Check back soon for our curated collections.
              </p>


              <Link
                to="/shop"
                className="btn-theme inline-flex items-center gap-2"
              >
                Browse All Perfumes
                <HiArrowRight />
              </Link>

            </div>


          ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">


              {collections.map((collection,i)=>(

                <motion.div
                  key={collection.id}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{once:true}}
                  variants={cardVariants}
                >

                  <Link
                    to={`/shop?collection=${collection.slug}`}
                    className="
                      group
                      block
                      relative
                      overflow-hidden
                      rounded-2xl
                      aspect-[4/5]
                      bg-theme-card
                      border
                      border-theme-primary/20
                      hover:border-theme-primary/50
                      transition-all
                    "
                  >


                    {collection.image_url ? (

                      <img
                        src={collection.image_url}
                        alt={collection.name}
                        className="
                          absolute
                          inset-0
                          w-full
                          h-full
                          object-cover
                          transition-transform
                          duration-700
                          group-hover:scale-105
                        "
                      />

                    ) : (

                      <div
                        className="
                          absolute
                          inset-0
                          flex
                          items-center
                          justify-center
                          bg-theme-card
                        "
                      >
                        <HiCollection className="w-20 h-20 text-theme-primary/20"/>
                      </div>

                    )}



                    <div
                      className="
                        absolute
                        inset-0
                        bg-gradient-to-t
                        from-black/90
                        via-black/40
                        to-transparent
                      "
                    />



                    <div className="absolute bottom-0 p-6">

                      <h3
                        className="
                          text-2xl
                          font-heading
                          font-bold
                          text-white
                          group-hover:text-theme-primary
                        "
                      >
                        {collection.name}
                      </h3>


                      {collection.description && (

                        <p className="text-white/70 text-sm mt-2 line-clamp-2">
                          {collection.description}
                        </p>

                      )}



                      <span
                        className="
                          flex
                          items-center
                          gap-2
                          mt-4
                          text-theme-primary
                          uppercase
                          text-sm
                        "
                      >
                        Explore
                        <HiArrowRight />

                      </span>

                    </div>


                  </Link>


                </motion.div>

              ))}


            </div>

          )}

        </div>

      </section>

    </>
  );
}
