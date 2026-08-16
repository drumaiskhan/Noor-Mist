const multer = require("multer");
const path = require("path");
const fs = require("fs");


// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}




const storage = multer.diskStorage({

  destination:(req,file,cb)=>{

    cb(null, uploadDir);

  },


  filename:(req,file,cb)=>{

    const unique =
      Date.now() +
      "-" +
      Math.round(Math.random()*1e9);


    cb(
      null,
      unique + path.extname(file.originalname).toLowerCase()
    );

  }

});





const fileFilter=(req,file,cb)=>{


  const allowedExtensions =
  /\.(jpeg|jpg|png|gif|webp|svg|ico)$/i;


  const allowedMime =
  /^(image\/jpeg|image\/jpg|image\/png|image\/gif|image\/webp|image\/svg\+xml|image\/x-icon)$/i;



  const ext =
  allowedExtensions.test(
    path.extname(file.originalname)
  );


  const mime =
  allowedMime.test(
    file.mimetype
  );



  if(ext && mime){

    cb(null,true);

  }

  else{

    cb(
      new Error(
        "Only image files are allowed"
      )
    );

  }


};





const upload = multer({

  storage,

  fileFilter,

  limits:{
    fileSize:10 * 1024 * 1024
  }

});





module.exports = upload;
