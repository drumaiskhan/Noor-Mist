const express = require('express');
const router = express.Router();

const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');


// ============================================
// GET ACTIVE ANNOUNCEMENTS (STOREFRONT)
// GET /api/announcements
// ============================================

router.get('/', async (req, res) => {

  try {

    const result = await query(
      `
      SELECT *
      FROM announcements
      WHERE is_active = true
      AND (
        start_date IS NULL
        OR start_date <= NOW()
      )
      AND (
        end_date IS NULL
        OR end_date >= NOW()
      )
      ORDER BY created_at DESC
      `
    );


    res.json(result.rows);


  } catch (error) {

    console.error('Get announcements error:', error);

    res.status(500).json({
      message: 'Failed to fetch announcements'
    });

  }

});





// ============================================
// ADMIN GET ALL ANNOUNCEMENTS
// GET /api/announcements/admin
// ============================================

router.get(
  '/admin',
  authenticate,
  requireAdmin,
  async (req,res)=>{


    try {


      const result = await query(
        `
        SELECT *
        FROM announcements
        ORDER BY created_at DESC
        `
      );


      res.json(result.rows);


    } catch(error){


      console.error(error);


      res.status(500).json({
        message:'Failed to fetch announcements'
      });


    }


});







// ============================================
// CREATE ANNOUNCEMENT
// POST /api/announcements
// ============================================

router.post(
'/',
authenticate,
requireAdmin,
async(req,res)=>{


try{


const {
 title,
 description,
 image_url,
 button_text,
 button_link,
 is_active,
 start_date,
 end_date
}=req.body;



const result = await query(

`
INSERT INTO announcements
(
 title,
 description,
 image_url,
 button_text,
 button_link,
 is_active,
 start_date,
 end_date
)

VALUES
($1,$2,$3,$4,$5,$6,$7,$8)

RETURNING *
`,

[
 title,
 description,
 image_url,
 button_text,
 button_link,
 is_active ?? true,
 start_date || null,
 end_date || null
]

);



res.status(201).json(result.rows[0]);



}

catch(error){

console.error(
'Create announcement error:',
error
);


res.status(500).json({
message:'Failed to create announcement'
});


}



});









// ============================================
// UPDATE ANNOUNCEMENT
// PUT /api/announcements/:id
// ============================================


router.put(
'/:id',
authenticate,
requireAdmin,
async(req,res)=>{


try{


const {id}=req.params;


const {
 title,
 description,
 image_url,
 button_text,
 button_link,
 is_active,
 start_date,
 end_date

}=req.body;



const result = await query(

`
UPDATE announcements

SET

title=$1,
description=$2,
image_url=$3,
button_text=$4,
button_link=$5,
is_active=$6,
start_date=$7,
end_date=$8

WHERE id=$9

RETURNING *

`,

[
 title,
 description,
 image_url,
 button_text,
 button_link,
 is_active,
 start_date || null,
 end_date || null,
 id
]


);



if(result.rows.length===0){

return res.status(404).json({
message:'Announcement not found'
});

}



res.json(result.rows[0]);



}

catch(error){


console.error(
'Update announcement error:',
error
);


res.status(500).json({
message:'Failed to update announcement'
});


}


});









// ============================================
// DELETE ANNOUNCEMENT
// DELETE /api/announcements/:id
// ============================================


router.delete(
'/:id',
authenticate,
requireAdmin,
async(req,res)=>{


try{


const {id}=req.params;



const result = await query(

`
DELETE FROM announcements
WHERE id=$1
RETURNING *
`,

[id]

);



if(result.rows.length===0){

return res.status(404).json({
message:'Announcement not found'
});

}



res.json({

message:'Announcement deleted'

});



}


catch(error){


console.error(
'Delete announcement error:',
error
);


res.status(500).json({
message:'Failed to delete announcement'
});


}



});



module.exports = router;
