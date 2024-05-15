import dotenv from "dotenv"

import connectDB from "../src/db/index.js"
import {app} from './app.js'

dotenv.config({
    path:"./env"
})



connectDB()
.then(()=>{
    const PORT = process.env.PORT || 8000;

    try{
        app.listen(PORT , ()=>{
            console.log(`Server is Running at PORT NO : ${PORT}`);
        })
    
    }
    catch(error){
        console.log("error in PORT NO or DB Connection", error);
        throw error;
    }


})
.catch((error)=>{
    console.log(`database connection failed issue !!!`, error);
    process.exit(1);
})