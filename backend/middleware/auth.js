const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'noor-mist-secret-key';


// ================================
// Authenticate User
// ================================
const authenticate = async (req, res, next) => {

  try {

    const authHeader = req.headers.authorization;


    if (!authHeader || !authHeader.startsWith('Bearer ')) {

      return res.status(401).json({
        error: 'No token provided'
      });

    }


    const token = authHeader.split(' ')[1];


    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );


    const result = await query(
      `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        role,
        phone
      FROM users
      WHERE id = $1
      `,
      [decoded.id]
    );


    if (!result.rows.length) {

      return res.status(401).json({
        error: 'User not found'
      });

    }


    req.user = result.rows[0];


    next();


  } catch (error) {

    console.log("AUTH ERROR:", error.message);


    return res.status(401).json({
      error: 'Invalid or expired token'
    });

  }

};



// ================================
// Admin Authentication
// ================================
const requireAdmin = async (req, res, next) => {

  try {


    const authHeader = req.headers.authorization;


    if (!authHeader || !authHeader.startsWith('Bearer ')) {

      return res.status(401).json({
        error: 'No token provided'
      });

    }


    const token = authHeader.split(' ')[1];


    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );



    const result = await query(
      `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        role,
        phone
      FROM users
      WHERE id = $1
      `,
      [decoded.id]
    );



    if (!result.rows.length) {

      return res.status(401).json({
        error: 'User not found'
      });

    }



    req.user = result.rows[0];



    if (req.user.role !== 'admin') {

      return res.status(403).json({
        error: 'Admin access required'
      });

    }



    next();



  } catch(error) {


    console.log(
      "ADMIN AUTH ERROR:",
      error.message
    );


    return res.status(401).json({
      error:'Invalid or expired token'
    });


  }

};



// ================================
// Optional Authentication
// Used for guest checkout + logged users
// ================================
const optionalAuth = async (req, res, next) => {


  try {


    const authHeader = req.headers.authorization;



    if (
      authHeader &&
      authHeader.startsWith('Bearer ')
    ) {


      const token = authHeader.split(' ')[1];



      const decoded = jwt.verify(
        token,
        JWT_SECRET
      );



      const result = await query(
        `
        SELECT 
          id,
          email,
          first_name,
          last_name,
          role,
          phone
        FROM users
        WHERE id = $1
        `,
        [decoded.id]
      );



      if (result.rows.length) {

        req.user = result.rows[0];

      }


    }


  } catch(error) {

    // Ignore invalid token for optional auth

  }



  next();


};




// ================================
// Generate JWT Token
// ================================
const generateToken = (userId) => {


  return jwt.sign(

    {
      id:userId
    },

    JWT_SECRET,

    {
      expiresIn:'30d'
    }

  );


};



module.exports = {

  authenticate,
  requireAdmin,
  optionalAuth,
  generateToken

};
