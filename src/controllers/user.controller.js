import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js" 
import {User} from "../models/user.model.js"
import {uplodeOnCloudinary ,deleteOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { application } from "express";
import mongoose from "mongoose";


//delete file on cloudinary
const deleteURLonCloudinary = async(url) =>{
    cloudinary.uploader.destroy(publicId, function(error, result) {
      if (error) {
        throw new ApiError(500 ,"Error while deleting file:" , error )
      } 

      return res
      .status(200)
      .json(
        new ApiResponse(200 , result , "File deleted successfull")
      )
    });
  }


//generate access and refresh token
const generateAccessAndRefreshToken = async(userId)=>{
    try{

        const user =await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken= user.generateRefreshToken()
        //update refresh token in user
        user.refreshToken= refreshToken;

        //update refresh token in  database
        await user.save({validateBeforeSave:false}) //means i will save refresh token in saved user in database . Actually validation is required means password is req but in inside paranthesis we are giving validatebeforesave means it will save in user model in datsbase
        return {accessToken , refreshToken}
        

    }
    catch(error){
        throw new ApiError(500 , "Something went wrong while generating access and refresh token")
    }
}

//user registration
const registerUser  = asyncHandler(async(req,res)=>{
    const {email , fullName ,username , password} = req.body;  //taking details frm user
    console.log(email);

    //validatin on user details
    if([username , email , password , fullName].some((fild)=>fild?.trim()==="")){
        throw new ApiError(400 , "All Fields are Required")
    }

    //checking on cloudinary if user is alredy exist or not
    const existedUser =await User.findOne({
        $or:[{email},
            {username}]
    })
    if(existedUser){
        throw new ApiError(409  , "User with email or username Alredy Exist ")
    }

    // getting  localfilepath
    const avatarLocalPath  = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


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
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
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

//user login
const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, username, password} = req.body
    //console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})



const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1 //this removes the field from document
            }
        },
        {
            new : true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
        
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
            
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !==user?.refreshToken){
            throw new ApiError(401 , "Refresh Token is Expired or Used")
        }
    
        //again generating new accesstoken
        const options = {
            httpOnly:true,
            secure:true
        }
        const {accessToken, refreshToken:newRefreshToken} = await generateAccessAndRefreshToken(user._id)
        
            return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, 
                    {accessToken, refreshToken: newRefreshToken},
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword , newPassword} = req.body;
    
    if([oldPassword , newPassword].some((fild)=>fild?.trim()==="")){
        throw new ApiError(400 , "All Fields are Required")
    }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect =await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old Password")
    }

    user.password=newPassword;
    await user.save({validateBeforeSave:false})
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.User?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")
    //console.log(req.user._id);
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const user = await User.findById(req.user._id);
    const oldImageUrl = user.avatar;

    const deleteOldImage = await deleteOnCloudinary(oldImageUrl);
    console.log(deleteOldImage);

    const avatar = await uplodeOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")

    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedUser, "Avatar image updated successfully")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    const user = await User.findById(req.user?._id);
    //TODO: delete old image - assignment
    const oldImageUrl = user?.coverImage;

    const deleteOldImage = await deleteOnCloudinary(oldImageUrl);
    console.log(deleteOldImage);

    const coverImage = await uplodeOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")

    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedUser, "Cover image updated successfully")
        )
})



//getting user details
const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params;
    
    //console.log(username);

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }
    const channel = await User.aggregate([
        {
            $match:{
                    username:username?.toLowerCase()
                }
        },
        {
            $lookup:{
                from:"subscriptions",         //why s in last means in database given names are stored in lowercase with additional adding of s term 
                localField:"_id",            //search based on what we have given in datafiles/documents in databases
                foreignField:"channel",      //telling what term we ave to search
                as:"subscribers"             //our wish we'll give any name
            }
        },
        {
            $lookup:{
                from:"subscriptions",         //why s in last means in database given names are stored in lowercase with additional adding of s term 
                localField:"_id",            //search based on what we have given in datafiles/documents in databases
                foreignField:"subscriber",      //telling what term we ave to search
                as:"subscribedTo"             //our wish we'll give any name
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size:"$subscribers"          //here y $ symbol is bcoz it is a field
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {                   // tells about wethere we are subscribed our self or not
                    $cond: {                      // in this if if cond is exicuted then . then and else are  moreover like try and catch
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},  
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
    
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)  //wrote in notebook with a tag of interview-2 about why we are using new mongoose like this 
            }
        },{
            $lookup:{
                from: "videos",       //s becoz of mangodb rules(of storage of user data )
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[                //this sub-pipline is becz of finding owner of videos that are in our watchHistory
                    {
                        $lookup:{
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline:[   //this sub-sub-pipline is becz of getting that owner details 
                                    {
                                        $project: {   
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        }
                    },
                    {
                        $addFields:{      //this one ios becz of easyness of frontend dev . here we are doing reduction of loop for taking owner data . for that we are doing this , so frontend dev / user will get easy to axcess for owner value by just using dot(.) operator
                            owner:{
                                $first: "$owner" 
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}