import mongoose,{Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,  //one who is subscribe 
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,  //one to whome 'subscriber' is subscribing
        ref:"User"
    }
})

export const subscription = mongoose.model("subscription" , subscriptionSchema)