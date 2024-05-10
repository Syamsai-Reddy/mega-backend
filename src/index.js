import dotenv from "dotenv"

import connectDB from "../src/db/index.js"

dotenv.config({
    path:"./env"
})



connectDB()
.then(()=>{
    const PORT = process.env.PORT || 4000;
    app.on((error)=>{
        console.log("error in PORT NO or DB Connection", error);
        throw error;

        app.listen(PORT , ()=>{
            console.log(`Server is Running at PORT NO : ${PORT}`);
        })
    })
})
.catch((error)=>{
    console.log(`database connection failed issue !!!`, error);
    process.exit(1);
})