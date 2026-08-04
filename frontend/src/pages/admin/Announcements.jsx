import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  HiPlus,
  HiTrash,
  HiX,
  HiUpload,
} from "react-icons/hi";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import toast from "react-hot-toast";

import {
  announcementsAPI,
  uploadAPI,
} from "../../services/api";



export default function Announcements() {


  const queryClient = useQueryClient();



  const emptyForm = {

    title:"",
    description:"",
    image_url:"",
    button_text:"Shop Now",
    button_link:"/shop",
    is_active:true,
    start_date:"",
    end_date:"",

  };



  const [showForm,setShowForm] = useState(false);

  const [form,setForm] = useState(emptyForm);

  const [uploading,setUploading] = useState(false);





  const {
    data,
    isLoading
  } = useQuery({

    queryKey:["announcements"],

    queryFn:async()=>{

      const res =
        await announcementsAPI.getAll();

      return res.data;

    }

  });



  const announcements = data || [];






  const createMutation = useMutation({

    mutationFn:(data)=>
      announcementsAPI.create(data),


    onSuccess:()=>{


      queryClient.invalidateQueries({
        queryKey:["announcements"]
      });


      toast.success(
        "Announcement created"
      );


      setForm(emptyForm);

      setShowForm(false);


    },


    onError:(error)=>{

      console.error(error);

      toast.error(
        "Failed creating announcement"
      );

    }

  });






  const deleteMutation = useMutation({

    mutationFn:(id)=>
      announcementsAPI.delete(id),


    onSuccess:()=>{


      queryClient.invalidateQueries({
        queryKey:["announcements"]
      });


      toast.success(
        "Announcement deleted"
      );


    }

  });







  const toggleMutation = useMutation({

    mutationFn:({id,status})=>

      announcementsAPI.update(
        id,
        {
          is_active:status
        }
      ),


    onSuccess:()=>{


      queryClient.invalidateQueries({
        queryKey:["announcements"]
      });


    }

  });







  const handleChange=(e)=>{


    setForm(prev=>({

      ...prev,

      [e.target.name]:
        e.target.value

    }));


  };






  const handleImageUpload = async(e)=>{


    const file =
      e.target.files[0];


    if(!file) return;



    try{


      setUploading(true);



      const res =
        await uploadAPI.image(file);



      console.log(
        "UPLOAD:",
        res.data
      );



      const imageUrl =
        res.data.url;



      if(!imageUrl){


        toast.error(
          "No image URL returned"
        );


        return;

      }





      setForm(prev=>({

        ...prev,

        image_url:imageUrl

      }));



      toast.success(
        "Image uploaded"
      );



    }
    catch(error){


      console.error(
        error.response?.data || error
      );


      toast.error(
        "Image upload failed"
      );


    }
    finally{


      setUploading(false);


    }


  };






  const handleSubmit=()=>{


    if(!form.title.trim()){


      toast.error(
        "Title required"
      );


      return;

    }



    console.log(
      "SEND:",
      form
    );



    createMutation.mutate(form);


  };





  if(isLoading){

    return (

      <div className="p-6 text-white">

        Loading announcements...

      </div>

    );

  }
  return (

    <div className="p-6 text-white">


      {/* HEADER */}

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

          onClick={()=>setShowForm(true)}

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









      {/* CREATE FORM */}

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
              font-bold
            ">

              New Announcement

            </h2>




            <button

              onClick={()=>setShowForm(false)}

              className="text-gray-400"

            >

              <HiX/>

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









          {/* IMAGE UPLOAD */}


          <label className="
            flex
            items-center
            gap-3
            bg-black
            border
            border-gray-700
            rounded-xl
            p-3
            cursor-pointer
            mb-4
          ">


            <HiUpload/>


            {

              uploading

              ?

              "Uploading..."

              :

              "Upload Offer Image"

            }




            <input

              type="file"

              accept="image/*"

              hidden

              onChange={handleImageUpload}

            />


          </label>









          {/* IMAGE PREVIEW */}


          {

            form.image_url && (

              <img

                src={form.image_url}

                alt="preview"

                className="
                  w-48
                  h-48
                  object-cover
                  rounded-xl
                  mb-4
                "

              />

            )

          }









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
              mb-4
            "

          />










          <input

            name="button_link"

            placeholder="Button link"

            value={form.button_link}

            onChange={handleChange}

            className="
              w-full
              bg-black
              border
              border-gray-700
              rounded-xl
              p-3
              mb-4
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
              font-bold
            "

          >

            Save Announcement

          </button>




        </motion.div>


      )}      {/* ANNOUNCEMENT LIST */}

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




                {
                  item.image_url && (

                    <img

                      src={item.image_url}

                      alt={item.title}

                      className="
                        w-20
                        h-20
                        object-cover
                        rounded-xl
                      "

                    />

                  )
                }







                <div>


                  <h3 className="
                    text-lg
                    font-bold
                  ">

                    {item.title}

                  </h3>





                  <p className="
                    text-gray-400
                  ">

                    {item.description}

                  </p>





                  <button

                    onClick={()=>


                      toggleMutation.mutate({

                        id:item.id,

                        status:
                          !item.is_active

                      })


                    }


                    className="
                      mt-2
                      text-sm
                      text-gold
                    "

                  >

                    {

                      item.is_active

                      ?

                      "Active ✓"

                      :

                      "Disabled"

                    }


                  </button>




                </div>



              </div>









              <button

                onClick={()=>


                  deleteMutation.mutate(
                    item.id
                  )


                }

                className="
                  text-red-400
                  hover:text-red-300
                "

              >

                <HiTrash size={24}/>


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
