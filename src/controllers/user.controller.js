import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js" 
import {User} from "../models/user.model.js"
import {uplodeOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser  = asyncHandler(async(req,res)=>{
    const {email , fullname ,username , password} = req.body;  //taking details frm user
    console.log(email);

    //validatin on user details
    if([username , email , password , fullname].some((fild)=>fild?.trim()==="")){
        throw new ApiError(400 , "All Fields are Required")
    }

    //checking on cloudinary if user is alredy exist or not
    const existedUser = User.findOne({
        $or:[{email},
            {username}]
    })
    if(existedUser){
        throw new ApiError(409  , "User with email or username Alredy Exist ")
    }

    // getting  localfilepath
    const avatarLocalPath  = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is Required")
    }

    //uplode on cloudinary
    const avatar = await uplodeOnCloudinary(avatarLocalPath)
    const coverImage = await uplodeOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400 , "Avatar is Required")
    }

    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage.url || "",
        username:username.toLowerCase(),
        email,
        password
    })

        const createdUser =await User.findById(user._id).select(
            "-password -refreshToken"                             //-password means removing password frm response
        )

        if(!createdUser){
            throw new ApiError(500 , "SomeThing Went Wrong While Registering User .Please Try Again !")
        }

        res.status(201).json((
            new ApiResponse(200 , createdUser , "User Registered Successfully")
        ))

})
 

export {registerUser}