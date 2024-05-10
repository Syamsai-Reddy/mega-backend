import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"})) // this will alow us to upload imges and videos etc upto 16kb 
app.use(express.urlencoded({extended:true , limit:"16kb"})) //express.urlencoded means it will give % in url when ever we give space in searching place (syam sai->syam%sai) ,extended->if we searching nested search then also it will work so we use extended true
app.use(express.static("public")) // static public means it will give acesses freely to see and dwld imges and  stuff frm website 
app.use(cookieParser()) //server will store users important data on server side only
export {app}