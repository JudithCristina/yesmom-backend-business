import { Schema, model } from 'mongoose';

const imageSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    tag:{
        type:String,
        required:true
    },
    typeImage:{
        type:String,
        required:true
    },
    fecha:{
        type:Date,
        required:true
    },
})

export default model('Image',imageSchema);
