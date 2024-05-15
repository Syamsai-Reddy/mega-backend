const asyncHandler = (requestHandler)=>{
    return (req,res,next)=>{
        promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }
}

export {asyncHandler}

// const asyncHandler = (fn)=>async(req,res,next)=>{
//      try{
//         await fn(req,res,next)
//      }
//      catch(error){
//         res.status(error.code ||500).json({   //here we are writing function inside an async function
//             success:false,
//             messahe:error.message
//         })
//      }
// }
// export {asyncHandler}