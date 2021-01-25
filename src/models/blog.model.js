import { Schema, model } from 'mongoose';

const blogSchema = new Schema({
    titulo:{
        type:String,
        required:true
    },
    autor:{
        type:String,
        required:true
    },
    descripcion:{
        type:String,
        required:true
    },
    contenido:{
        type:String,
        required:true
    },
    estado:{
        type:Boolean,
        required:true
    },
    fecha:{
        type:Date,
        required:true
    },
    imgPrincipal:{
        type: String,
        required:false
    },
    imgAutor:{
        type:String,
        required:false
    },
    eliminado:{
        type:Boolean,
        required:true
    }
})

export default model('Blog',blogSchema);
