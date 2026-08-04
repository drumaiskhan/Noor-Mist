import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  HiPlus,
  HiTrash,
  HiPencil,
  HiBell,
  HiX
} from "react-icons/hi";


export default function Announcements() {

  const [showForm, setShowForm] = useState(false);

  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: "Summer Sale",
      description: "Get 20% OFF on selected perfumes",
      image_url: "",
      button_text: "Shop Now",
      is_active: true
    }
  ]);


  const [form, setForm] = useState({
    title: "",
    description: "",
    image_url: "",
    button_text: "Shop Now",
    button_link: "/products",
    is_active: true
  });



  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };



  const addAnnouncement = () => {

    if (!form.title) return;


    setAnnouncements([
      ...announcements,
      {
        id: Date.now(),
        ...form
      }
    ]);


    setForm({
      title:"",
      description:"",
      image_url:"",
      button_text:"Shop Now",
      button_link:"/products",
      is_active:true
    });


    setShowForm(false);

  };



  const deleteAnnouncement = (id) => {

    setAnnouncements(
      announcements.filter(
        item => item.id !== id
      )
    );

  };




  return (

    <div className="p-6 text-white">


      {/* Header */}

      <div className="
        flex 
        justify-between 
        items-center 
        mb-8
      ">


        <div>

          <h1 className="
            text-3xl 
            font-playfair 
            font-bold
          ">
            Announcements
          </h1>


          <p className="
            text-gray-400 
            mt-2
          ">
            Manage website popup offers and promotions
          </p>


        </div>



        <button

          onClick={() => setShowForm(true)}

          className="
            flex 
            items-center 
            gap-2
            bg-gold
            text-black
            px-5
            py-3
            rounded-xl
            font-semibold
          "

        >

          <HiPlus />

          Add Announcement

        </button>



      </div>







      {/* Create Form */}


      {showForm && (

        <motion.div

          initial={{
            opacity:0,
            y:-20
          }}

          animate={{
            opacity:1,
            y:0
          }}

          className="
            bg-noir-card
            border
            border-gray-800
            rounded-2xl
            p-6
            mb-8
          "

        >


          <div className="
            flex
            justify-between
            mb-5
          ">

            <h2 className="
              text-xl
              font-semibold
            ">
              New Announcement
            </h2>


            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-white"
            >

              <HiX size={22}/>

            </button>


          </div>






          <input

            name="title"

            value={form.title}

            onChange={handleChange}

            placeholder="Offer title"

            className="
              w-full
              mb-3
              bg-black
              border
              border-gray-700
              rounded-xl
              p-3
            "

          />




          <textarea

            name="description"

            value={form.description}

            onChange={handleChange}

            placeholder="Offer description"

            className="
              w-full
              mb-3
              bg-black
              border
              border-gray-700
              rounded-xl
              p-3
            "

          />






          <input

            name="image_url"

            value={form.image_url}

            onChange={handleChange}

            placeholder="Image URL"

            className="
              w-full
              mb-3
              bg-black
              border
              border-gray-700
              rounded-xl
              p-3
            "

          />





          <input

            name="button_text"

            value={form.button_text}

            onChange={handleChange}

            placeholder="Button text"

            className="
              w-full
              mb-5
              bg-black
              border
              border-gray-700
              rounded-xl
              p-3
            "

          />





          <button

            onClick={addAnnouncement}

            className="
              bg-gold
              text-black
              px-6
              py-3
              rounded-xl
              font-semibold
            "

          >

            Save Announcement

          </button>



        </motion.div>

      )}









      {/* Announcement List */}


      <div className="space-y-5">


        {
          announcements.map((item)=>(


            <motion.div

              key={item.id}

              initial={{
                opacity:0
              }}

              animate={{
                opacity:1
              }}

              className="
                bg-noir-card
                border
                border-gray-800
                rounded-2xl
                p-5
                flex
                justify-between
                items-center
              "

            >



              <div className="
                flex
                items-center
                gap-4
              ">


                <div className="
                  w-12
                  h-12
                  rounded-xl
                  bg-gold/10
                  flex
                  items-center
                  justify-center
                ">

                  <HiBell 
                    className="text-gold"
                    size={25}
                  />

                </div>





                <div>

                  <h3 className="
                    font-semibold
                    text-lg
                  ">

                    {item.title}

                  </h3>


                  <p className="
                    text-gray-400
                  ">

                    {item.description}

                  </p>


                </div>


              </div>







              <button

                onClick={() => deleteAnnouncement(item.id)}

                className="
                  text-red-400
                  hover:text-red-300
                "

              >

                <HiTrash size={22}/>

              </button>



            </motion.div>


          ))
        }


      </div>


    </div>

  );

}
