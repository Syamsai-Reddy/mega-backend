import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
     
      cb(null, file.originalname) //why original name duplication may occur if we uplode same name file again and again .but no prblm becz , we are unlinking also if any error occur in cloudinary so no prblm 
    }
  })
  
  export const upload = multer({
     storage, 
    })