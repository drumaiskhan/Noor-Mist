import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { api } from '../../services/api';

export default function AnnouncementPopup() {

  const [announcements, setAnnouncements] = useState([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);


  useEffect(() => {

    const closed = sessionStorage.getItem(
      'noor_mist_announcement_closed'
    );

    if (closed) return;


    const loadAnnouncements = async () => {

      try {

        const { data } = await api.get('/announcements');

        const activeAnnouncements = data.filter(
          (item) => item.active
        );


        if (activeAnnouncements.length > 0) {

          setAnnouncements(activeAnnouncements);

          setVisible(true);

        }


      } catch (error) {

        console.error(
          'Announcement loading failed',
          error
        );

      }

    };


    loadAnnouncements();


  }, []);




  const closePopup = () => {

    setVisible(false);

    sessionStorage.setItem(
      'noor_mist_announcement_closed',
      'true'
    );

  };




  const next = () => {

    setCurrent(
      (prev) =>
        (prev + 1) % announcements.length
    );

  };



  const previous = () => {

    setCurrent(
      (prev) =>
        (prev - 1 + announcements.length)
        % announcements.length
    );

  };



  if (!visible || announcements.length === 0)
    return null;



  const announcement = announcements[current];



  return (

    <AnimatePresence>

    {visible && (

      <motion.div

        initial={{
          opacity:0
        }}

        animate={{
          opacity:1
        }}

        exit={{
          opacity:0
        }}

        className="
          fixed
          inset-0
          z-[9999]
          flex
          items-center
          justify-center
          bg-black/70
          backdrop-blur-sm
          p-4
        "

      >


        <motion.div

          initial={{
            scale:0.8,
            y:30
          }}

          animate={{
            scale:1,
            y:0
          }}

          exit={{
            scale:0.8
          }}

          className="
            relative
            w-full
            max-w-lg
            bg-noir-card
            rounded-2xl
            overflow-hidden
            border
            border-gold/20
            shadow-2xl
          "

        >



          {/* Close Button */}

          <button

            onClick={closePopup}

            className="
              absolute
              top-3
              right-3
              z-10
              bg-black/60
              rounded-full
              p-2
              text-white
              hover:text-gold
            "

          >

            <HiX size={22}/>

          </button>





          {/* Image */}

          {
            announcement.image_url && (

              <img

                src={announcement.image_url}

                alt={announcement.title}

                className="
                  w-full
                  h-64
                  object-cover
                "

              />

            )
          }







          <div className="p-6 text-center">


            <h2 className="
              text-2xl
              font-playfair
              font-bold
              text-white
              mb-3
            ">

              {announcement.title}

            </h2>




            <p className="
              text-gray-300
              leading-relaxed
            ">

              {announcement.message}

            </p>





            {
              announcements.length > 1 && (

                <div className="
                  flex
                  items-center
                  justify-between
                  mt-6
                ">


                  <button

                    onClick={previous}

                    className="
                      p-2
                      rounded-full
                      bg-gold/10
                      text-gold
                    "

                  >

                    <HiChevronLeft size={24}/>

                  </button>





                  <span className="
                    text-sm
                    text-gray-400
                  ">

                    {current + 1} / {announcements.length}

                  </span>





                  <button

                    onClick={next}

                    className="
                      p-2
                      rounded-full
                      bg-gold/10
                      text-gold
                    "

                  >

                    <HiChevronRight size={24}/>

                  </button>



                </div>

              )
            }



          </div>



        </motion.div>



      </motion.div>

    )}

    </AnimatePresence>

  );

}
