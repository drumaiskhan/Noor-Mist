import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import { announcementsAPI } from "../../services/api";

export default function AnnouncementPopup() {

  const [announcements, setAnnouncements] = useState([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);


  useEffect(() => {

    const closed = sessionStorage.getItem(
      "noor_mist_announcement_closed"
    );

    if (closed) return;

    loadAnnouncements();

  }, []);



  const loadAnnouncements = async () => {

    try {

      const { data } = await announcementsAPI.getActive();

      console.log("Announcements:", data);


      if (Array.isArray(data) && data.length > 0) {

        setAnnouncements(data);

        setVisible(true);

      }


    } catch (err) {

      console.error(
        "Announcement loading failed:",
        err
      );

    }

  };





  // Auto slider

  useEffect(() => {

    if (announcements.length <= 1)
      return;


    const timer = setInterval(() => {

      setCurrent(
        (prev) =>
          (prev + 1) % announcements.length
      );

    }, 5000);



    return () => clearInterval(timer);


  }, [announcements]);







  const closePopup = () => {

    setVisible(false);


    sessionStorage.setItem(
      "noor_mist_announcement_closed",
      "true"
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





  const announcement =
    announcements[current];






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
            bg-black/80
            backdrop-blur-md
            flex
            items-center
            justify-center
            p-5
          "

        >





          <motion.div

            initial={{
              scale:0.85,
              y:40
            }}

            animate={{
              scale:1,
              y:0
            }}

            exit={{
              scale:0.85
            }}

            transition={{
              duration:0.3
            }}


            className="
              relative
              w-full
              max-w-2xl
              bg-noir
              rounded-3xl
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
                top-5
                right-5
                z-30
                bg-black/70
                rounded-full
                p-2
                text-white
                hover:text-gold
                transition
              "

            >

              <HiX size={26}/>

            </button>









            {/* Full Image */}

            {announcement.image_url && (


              <div

                className="
                  w-full
                  h-[450px]
                  bg-black
                  overflow-hidden
                "

              >


                <img

                  src={announcement.image_url}

                  alt={announcement.title}

                  className="
                    w-full
                    h-full
                    object-cover
                  "


                  onError={() => {

                    console.log(
                      "Broken image URL:",
                      announcement.image_url
                    );

                  }}

                />


              </div>


            )}









            {/* Content */}


            <div className="p-8 text-center">





              <h2 className="
                text-3xl
                font-playfair
                font-bold
                text-white
                mb-4
              ">

                {announcement.title}

              </h2>







              {announcement.description && (

                <p className="
                  text-gray-300
                  leading-relaxed
                  mb-6
                ">

                  {announcement.description}

                </p>

              )}









              {announcement.button_text && (


                <a

                  href={
                    announcement.button_link || "/"
                  }

                  className="
                    inline-block
                    bg-gold
                    text-black
                    px-8
                    py-3
                    rounded-xl
                    font-semibold
                    hover:scale-105
                    transition
                  "

                >

                  {announcement.button_text}

                </a>


              )}









              {announcements.length > 1 && (


                <div className="
                  flex
                  items-center
                  justify-between
                  mt-8
                ">



                  <button

                    onClick={previous}

                    className="
                      p-3
                      rounded-full
                      bg-gold/10
                      text-gold
                      hover:bg-gold/20
                    "

                  >

                    <HiChevronLeft size={26}/>

                  </button>







                  <span className="
                    text-gray-400
                    text-sm
                  ">

                    {current + 1}
                    /
                    {announcements.length}

                  </span>







                  <button

                    onClick={next}

                    className="
                      p-3
                      rounded-full
                      bg-gold/10
                      text-gold
                      hover:bg-gold/20
                    "

                  >

                    <HiChevronRight size={26}/>

                  </button>





                </div>


              )}







            </div>






          </motion.div>





        </motion.div>


      )}


    </AnimatePresence>

  );

}
