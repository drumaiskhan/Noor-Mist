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


      // Build the SET clause dynamically so a field that is simply absent
      // from the request (e.g. the "Active/Disabled" toggle only sends
      // { is_active }) leaves the existing value untouched, while a field
      // that IS present - including start_date/end_date sent as "" to
      // clear a schedule - actually gets written. The old COALESCE(value,
      // column) approach could never clear start_date/end_date, because
      // an empty string was coerced to null before it reached the query,
      // and COALESCE(null, column) just keeps the old value forever.

      const fields = [
        'title',
        'description',
        'image_url',
        'button_text',
        'button_link',
        'is_active',
        'start_date',
        'end_date',
      ];

      const setClauses = [];
      const values = [];
      let i = 1;

      for (const field of fields) {
        if (!Object.prototype.hasOwnProperty.call(req.body, field)) continue;

        let value = req.body[field];
        if ((field === 'start_date' || field === 'end_date') && value === '') {
          value = null; // explicit clear
        }

        setClauses.push(`${field} = $${i}`);
        values.push(value);
        i++;
      }

      if (setClauses.length === 0) {
        return res.status(400).json({
          message: 'No fields to update'
        });
      }

      setClauses.push('updated_at = NOW()');
      values.push(req.params.id);

      const result = await query(
        `
        UPDATE announcements
        SET ${setClauses.join(', ')}
        WHERE id = $${i}
        RETURNING *
        `,
        values
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
