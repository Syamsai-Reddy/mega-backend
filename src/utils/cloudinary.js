import { v2 as cloudinary } from "cloudinary";
import fs from "fs"


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRRET
});


const uplodeOnCloudinary = async(localFilePath)=>{
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        //fs.unlinkSync(localFilePath)                                     //not working for me see once
        return response;

    } 
    catch(error){
        fs.unlinkSync(localFilePath)//remove the locally saved file as the uplode operation get failed
        return null;
    }
}
const deleteOnCloudinary = async (url)=>{
    try {
        const response = await cloudinary.uploader.destroy(url);
        return response;
    } catch (error) {
        console.log("Something went wrong"+error);
    }
}


export {uplodeOnCloudinary , deleteOnCloudinary}