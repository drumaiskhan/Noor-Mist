const express = require('express');
const router = express.Router();

const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');



// ============================================
// PUBLIC
// GET ACTIVE ANNOUNCEMENTS
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


    console.error(
      'Get announcements error:',
      error
    );


    res.status(500).json({
      message: 'Failed to fetch announcements'
    });


  }

});







// ============================================
// ADMIN
// GET ALL ANNOUNCEMENTS
// GET /api/announcements/admin
// ============================================

router.get(
  '/admin',
  authenticate,
  requireAdmin,
  async (req, res) => {

    try {


      const result = await query(
        `
        SELECT *
        FROM announcements
        ORDER BY created_at DESC
        `
      );


      res.json(result.rows);


    } catch(error) {


      console.error(
        'Admin announcements error:',
        error
      );


      res.status(500).json({
        message:'Failed to fetch announcements'
      });


    }

  }
);









// ============================================
// CREATE ANNOUNCEMENT
// POST /api/announcements
// ============================================

router.post(
  '/',
  authenticate,
  requireAdmin,
  async(req,res)=>{


    try {


      const {

        title,
        description,
        image_url,
        button_text,
        button_link,
        is_active,
        start_date,
        end_date

      } = req.body;




      if(!title){

        return res.status(400).json({

          message:'Title is required'

        });

      }





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

          description || '',

          image_url || null,

          button_text || 'Shop Now',

          button_link || '/shop',

          is_active ?? true,

          start_date || null,

          end_date || null

        ]

      );



      res.status(201).json(
        result.rows[0]
      );



    } catch(error) {


      console.error(
        'Create announcement error:',
        error
      );


      res.status(500).json({

        message:'Failed to create announcement'

      });


    }


  }
);









// ============================================
// UPDATE ANNOUNCEMENT
// PUT /api/announcements/:id
// ============================================

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  async(req,res)=>{


    try {


      const {

        title,
        description,
        image_url,
        button_text,
        button_link,
        is_active,
        start_date,
        end_date

      } = req.body;




      const result = await query(

        `
        UPDATE announcements

        SET

        title = COALESCE($1,title),

        description = COALESCE($2,description),

        image_url = COALESCE($3,image_url),

        button_text = COALESCE($4,button_text),

        button_link = COALESCE($5,button_link),

        is_active = COALESCE($6,is_active),

        start_date = COALESCE($7,start_date),

        end_date = COALESCE($8,end_date)


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

          req.params.id

        ]

      );





      if(result.rows.length === 0){

        return res.status(404).json({

          message:'Announcement not found'

        });

      }





      res.json(
        result.rows[0]
      );



    } catch(error){


      console.error(
        'Update announcement error:',
        error
      );


      res.status(500).json({

        message:'Failed to update announcement'

      });


    }


  }
);









// ============================================
// DELETE ANNOUNCEMENT
// DELETE /api/announcements/:id
// ============================================

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  async(req,res)=>{


    try {


      const result = await query(

        `
        DELETE FROM announcements

        WHERE id=$1

        RETURNING *

        `,

        [
          req.params.id
        ]

      );





      if(result.rows.length === 0){

        return res.status(404).json({

          message:'Announcement not found'

        });

      }




      res.json({

        message:'Announcement deleted'

      });



    } catch(error){


      console.error(

        'Delete announcement error:',

        error

      );



      res.status(500).json({

        message:'Failed to delete announcement'

      });


    }


  }
);





module.exports = router;
