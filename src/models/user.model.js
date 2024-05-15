import mongoose  ,{Schema} from "mongoose";

const userSchema = new Schema({
    username:{
        type:String,
        required:true,
        lowercase:true,
        unique:true,
        index:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        lowercase:true,
        unique:true,
        trim:true
    },
    fullName:{
        type:String,
        required:true,
        index:true,
        trim:true
    },
    avatar:{
        type:String, //cloudinary url,
        required:true
    },
    coverImage:{
        type:String
    },
    watchHistory:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    password:{
        type:String,
        required:[true,"Password is Required"]
    },
    refreshToken:{
        type:String
    }

},{timestamps:true})

userSchema.pre("save",async function(next){
    if(!this.isModified("password"))return next(); //if password not modified it will automatically call next fun

    this.password = await bcrypt.hash(this.password, 10)  //here bcrypt will encrypt our password
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            fullName:this.fullName,
            username:this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }

    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id:this._id,
           
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }

    )
}

export const User = mongoose.model("User",userSchema);