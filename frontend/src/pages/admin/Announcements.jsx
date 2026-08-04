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

    const closed =
      sessionStorage.getItem(
        "noor_mist_announcement_closed"
      );


    if (closed) return;


    fetchAnnouncements();


  }, []);



  const fetchAnnouncements = async()=>{

    try{

      const response =
        await announcementsAPI.getActive();


      console.log(
        "Announcements:",
        response.data
      );


      if(
        Array.isArray(response.data) &&
        response.data.length > 0
      ){

        setAnnouncements(response.data);

        setVisible(true);

      }


    }catch(error){

      console.error(
        "Announcement error:",
        error
      );

    }

  };




  // Auto change slides

  useEffect(()=>{

    if(announcements.length <= 1)
      return;


    const timer=setInterval(()=>{

      setCurrent(
        (prev)=>
          (prev + 1) %
          announcements.length
      );


    },5000);



    return ()=>clearInterval(timer);


  },[announcements]);







  const closePopup=()=>{


    setVisible(false);


    sessionStorage.setItem(
      "noor_mist_announcement_closed",
      "true"
    );


  };







  const next=()=>{


    setCurrent(
      (prev)=>
      (prev+1)%announcements.length
    );


  };





  const previous=()=>{


    setCurrent(
      (prev)=>
      (prev-1+announcements.length)
      % announcements.length
    );


  };





  if(
    !visible ||
    announcements.length===0
  )
  return null;





  const announcement =
    announcements[current];



  console.log(
    "Current image:",
    announcement.image_url
  );







  return (


    <AnimatePresence>


    {
      visible && (


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
        bg-black/70
        backdrop-blur-sm
        flex
        items-center
        justify-center
        p-5
        "


      >



        <motion.div


          initial={{
            scale:0.85,
            y:30
          }}


          animate={{
            scale:1,
            y:0
          }}


          exit={{
            scale:0.85
          }}


          className="
          relative
          w-full
          max-w-xl
          bg-noir-card
          rounded-3xl
          overflow-hidden
          border
          border-gold/30
          shadow-2xl
          "


        >





        {/* CLOSE */}

        <button


          onClick={closePopup}


          className="
          absolute
          top-4
          right-4
          z-20
          bg-black/70
          rounded-full
          p-2
          text-white
          hover:text-gold
          "


        >

          <HiX size={25}/>


        </button>









        {/* IMAGE */}


        {
          announcement.image_url && (


          <img


            src={
              announcement.image_url
            }


            alt={
              announcement.title
            }


            className="
            w-full
            h-72
            object-cover
            "


            onError={(e)=>{


              console.error(
                "Image failed:",
                announcement.image_url
              );


              e.currentTarget.style.display=
              "none";


            }}


          />


          )
        }









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





          <p className="
          text-gray-300
          mb-6
          ">


            {announcement.description}


          </p>






          {
            announcement.button_text && (


            <a


              href={
                announcement.button_link || "/shop"
              }


              className="
              inline-block
              bg-gold
              text-black
              px-8
              py-3
              rounded-xl
              font-bold
              "


            >


              {
                announcement.button_text
              }


            </a>


            )
          }









          {
            announcements.length > 1 && (


            <div className="
            flex
            items-center
            justify-between
            mt-8
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

                <HiChevronLeft size={25}/>


              </button>






              <span className="
              text-gray-400
              ">


                {current+1}
                /
                {announcements.length}


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

                <HiChevronRight size={25}/>


              </button>




            </div>


            )
          }







        </div>




        </motion.div>




      </motion.div>


      )
    }


    </AnimatePresence>


  );

}
