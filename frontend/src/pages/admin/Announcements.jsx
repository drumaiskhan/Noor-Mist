import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  HiPlus,
  HiTrash,
  HiBell,
  HiX,
  HiCheck
} from "react-icons/hi";

import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";

import { announcementsAPI } from "../../services/api";



export default function Announcements() {


  const queryClient = useQueryClient();


  const [showForm, setShowForm] = useState(false);



  const [form, setForm] = useState({

    title: "",
    description: "",
    image_url: "",
    button_text: "Shop Now",
    button_link: "/products",
    is_active: true,
    start_date: "",
    end_date: ""

  });





  // Fetch announcements

  const {
    data,
    isLoading
  } = useQuery({

    queryKey: ["announcements"],

    queryFn: async () => {

      const res = await announcementsAPI.getAll();

      return res.data;

    }

  });



  const announcements = data || [];







  // Create

  const createMutation = useMutation({

    mutationFn: (data) =>
      announcementsAPI.create(data),


    onSuccess: () => {

      queryClient.invalidateQueries([
        "announcements"
      ]);


      setShowForm(false);


      setForm({

        title: "",
        description: "",
        image_url: "",
        button_text: "Shop Now",
        button_link: "/products",
        is_active: true,
        start_date: "",
        end_date: ""

      });

    }

  });







  // Delete

  const deleteMutation = useMutation({

    mutationFn: (id) =>
      announcementsAPI.delete(id),


    onSuccess: () => {

      queryClient.invalidateQueries([
        "announcements"
      ]);

    }

  });







  const handleChange = (e) => {

    setForm({

      ...form,

      [e.target.name]: e.target.value

    });

  };







  const handleSubmit = () => {

    if (!form.title.trim()) return;


    createMutation.mutate(form);

  };







  if (isLoading) {

    return (

      <div className="p-6 text-white">

        Loading announcements...

      </div>

    );

  }








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

            Manage popup offers and promotions

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

          <HiPlus/>

          Add Announcement


        </button>


      </div>









      {/* Add Form */}


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


            <h2 className="text-xl font-semibold">

              Create Announcement

            </h2>



            <button

              onClick={() => setShowForm(false)}

              className="text-gray-400"

            >

              <HiX size={22}/>

            </button>


          </div>







          <input

            name="title"

            placeholder="Offer title"

            value={form.title}

            onChange={handleChange}

            className="
              w-full
              bg-black
              border
              border-gray-700
              rounded-xl
              p-3
              mb-3
            "

          />






          <textarea

            name="description"

            placeholder="Description"

            value={form.description}

            onChange={handleChange}

            className="
              w-full
              bg-black
              border
              border-gray-700
              rounded-xl
              p-3
              mb-3
            "

          />







          <input

            name="image_url"

            placeholder="Offer image URL"

            value={form.image_url}

            onChange={handleChange}

            className="
              w-full
              bg-black
              border
              border-gray-700
              rounded-xl
              p-3
              mb-3
            "

          />








          <input

            name="button_text"

            placeholder="Button text"

            value={form.button_text}

            onChange={handleChange}

            className="
              w-full
              bg-black
              border
              border-gray-700
              rounded-xl
              p-3
              mb-5
            "

          />







          <button

            onClick={handleSubmit}

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









      {/* List */}


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


                  <h3 className="font-semibold text-lg">

                    {item.title}

                  </h3>



                  <p className="text-gray-400">

                    {item.description}

                  </p>



                  <span className="
                    text-xs
                    text-gray-500
                  ">


                    {item.is_active
                      ? "Active"
                      : "Disabled"
                    }


                  </span>


                </div>



              </div>








              <button

                onClick={() =>
                  deleteMutation.mutate(item.id)
                }

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



        {
          announcements.length === 0 && (

            <div className="
              text-gray-400
              text-center
              py-10
            ">

              No announcements yet

            </div>

          )
        }



      </div>



    </div>

  );

}
