import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { isValidObjectId } from 'mongoose';
<<<<<<< HEAD
const fileType = require('file-type');
const multiparty = require('multiparty')
=======
import multiparty from 'multiparty';
>>>>>>> 2a84a92dc481c668c7aa07549dfb4758e8640db3

import * as Util from '../util/util';
import * as DomainConstant from '../constant/domain/domain'
import config from '../config';
import * as ErrConst from '../constant/errors/codes';
import * as ErrResponse from '../util/errors/errorResponse';

import Image from '../models/image.model';
import Blog from '../models/blog.model';

export const uploadImage = async (value)=>{
    let input = value;

    const BUCKET = config.BUCKET;
    const REGION = config.REGION;
    const ACCESS_KEY = config.ACCESS_KEY;
    const SECRET_KEY = config.SECRET_KEY;
    
    let pathImage = input.file;
    console.log(pathImage, "narda")

    let extension = path.extname(pathImage);
    let file = path.basename(pathImage,extension);
      
    let imageRemoteName = file + '_' + new Date().getTime() + extension;
    
    AWS.config.update({
        accessKeyId:ACCESS_KEY,
        secretAccessKey:SECRET_KEY,
        region:REGION
    });
    
    
    return new Promise((resolve, reject)=>{
        const  s3 = new AWS.S3();
        // console.log('**************', AWS)
        s3.putObject({
            Bucket: BUCKET,
            Body: fs.readFileSync(pathImage),
            Key:imageRemoteName
        }, function(err, response){
            if(err){
                console.log("[AWSModel.upload.ERROR]", err);
                return resolve({
                    "result": false,
                });

            }
            return resolve({
                "result":true,
                "name": imageRemoteName,
                "typeImage": input.type,
                "response": response,
                "url": s3.getSignedUrl('getObject', { Bucket: BUCKET, Key: imageRemoteName })
            })
        })
    });

}

export const saveData = async(req, res)=>{
<<<<<<< HEAD

    if(req.body.payload.titulo === undefined 
        || req.body.payload.autor === undefined
        || req.body.payload.contenido === undefined
        || req.body.payload.imgBlog === undefined
        || req.body.payload.imgAutor === undefined
        || !req.body.payload.titulo
        || !req.body.payload.autor
        || !req.body.payload.contenido
        || !req.body.payload.imgBlog
        || !req.body.payload.imgAutor){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
    }


    let parameters =  req.body;
    
    let arrayFiles = [];

    let imgJsonBlog = {};
    imgJsonBlog.type = DomainConstant.TYPE_IMAGE.PRINCIPAL;
    imgJsonBlog.file = parameters.payload.imgBlog;

    arrayFiles.push(imgJsonBlog);

    console.log(imgJsonBlog, "lili")
    let imgJsonAutor = {};

    imgJsonAutor.type = DomainConstant.TYPE_IMAGE.AUTHOR;
    imgJsonAutor.file = parameters.payload.imgAutor;

    arrayFiles.push(imgJsonAutor);

    let count = 0;
    let principalImage;
    let authorImage;
    let response = {};

    try{
        arrayFiles.forEach(async (element)=>{
            const valor = await uploadImage(element);
                  
            let url = valor.url;
            let name = valor.name;
            let typeImage = valor.typeImage;
         
            let tagString = valor.response.ETag;
            const tag = await Util.findString(tagString);
    
            let result = {};
=======
    const form = new multiparty.Form();
    form.parse(req,async(error, fields, files)=>{
        if(error){
            return res.json(ErrResponse.NewErrorResponse(ErrConst.codTransaccionError));
        }
        if(!files.imgBlog
            || !files.imgAutor
            || !fields.titulo
            || !fields.autor
            || !fields.contenido
            || !fields.estado
            || !fields.fecha
>>>>>>> 2a84a92dc481c668c7aa07549dfb4758e8640db3
            
            || files.imgBlog.length ===0
            || files.imgAutor.length ===0
            || fields.titulo.length ===0
            || fields.autor.length ===0
            || fields.contenido.length ===0
            || fields.estado.length ===0
            || fields.fecha.length ===0){

                return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
        }
        // CONTINUO CON EL FLUJO
        let parameters = {};
        parameters.files = files;
        parameters.fields = fields;
 
        let arrayFiles = [];
 
        let imgJsonBlog = {};
        imgJsonBlog.type = DomainConstant.TYPE_IMAGE.PRINCIPAL;
        imgJsonBlog.file = parameters.files.imgBlog[0].path;
        imgJsonBlog.originalFilename = parameters.files.imgBlog[0].originalFilename;
    
        arrayFiles.push(imgJsonBlog);
    
        let imgJsonAutor = {};
    
        imgJsonAutor.type = DomainConstant.TYPE_IMAGE.AUTHOR;
        imgJsonAutor.file = parameters.files.imgAutor[0].path;
        imgJsonAutor.originalFilename = parameters.files.imgAutor[0].originalFilename;
    
        arrayFiles.push(imgJsonAutor);
    
        let count = 0;
        let principalImage;
        let authorImage;
        let response = {};
    
        try{
            arrayFiles.forEach(async (element)=>{
                const valor = await uploadImage(element);
                      
                let url = valor.url;
                let name = valor.name;
                let typeImage = valor.typeImage;
             
                let tagString = valor.response.ETag;
                const tag = await Util.findString(tagString);
        
                let result = {};
                
                result.name = name;
                result.tag = tag;
                result.url = url;
                result.typeImage = typeImage;
        
                const newImage = new Image(result);
                const image = await newImage.save();
               
                if(principalImage==undefined){
                principalImage = (typeImage===DomainConstant.TYPE_IMAGE.PRINCIPAL)?image._id:undefined;
                }
                if(authorImage===undefined){
                    authorImage =  (typeImage===DomainConstant.TYPE_IMAGE.AUTHOR)?image._id:undefined;
        
                }
          
                count = count +1
        
                if(count == 2 && principalImage!== undefined && authorImage!==undefined){
        
                    // LUEGO INSERTAR EN BLOG
                    let paramsBlog = {};
                    paramsBlog.titulo = parameters.fields.titulo[0];
                    paramsBlog.autor = parameters.fields.autor[0];
                    paramsBlog.contenido = parameters.fields.contenido[0];
                    paramsBlog.estado = (parameters.fields.estado[0] === DomainConstant.ESTADOS_BLOG.ACTIVO)?true:false;
                    paramsBlog.fecha = new Date(parameters.fields.fecha[0]).toISOString();
                    paramsBlog.imgPrincipal = principalImage
                    paramsBlog.imgAutor = authorImage;
            
                    const newBlog = new Blog(paramsBlog);
                    await newBlog.save();
    
                    response.subida = true;
                    response.code = DomainConstant.SUCCESS;
    
                    res.json({
                        response
                    })
                }
                
            });
        
    
        }catch(err){
            console.log('[Error]', err);
            response.subida = false;
            response.message = DomainConstant.ERROR_INTERNO;
            res.json({
                response
            });
        }
    
    });

}

export const getImageBlog = async(element)=>{

    if(element.imgPrincipal === undefined 
        || element.imgAutor === undefined
        || !element.imgPrincipal
        || !element.imgAutor){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
    }
    // VALIDAR ID
    if(!isValidObjectId(element.imgPrincipal) || !isValidObjectId(element.imgAutor)){
        const result =  (ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
        return result;
    };

    //REALIZAR BUSQUEDA

        const images = await Image.find({
            "_id" : { "$in":[element.imgPrincipal, element.imgAutor]}
        }) 
        if(images.length === 0){
            const result = (ErrResponse.NewErrorResponse(ErrConst.codNoDatos));
            return result;
        }
    
        return images;

}

export const getBlogByParameters = async(req, res)=>{

    
    if(req.body.titulo === undefined
        || !req.body.titulo
        || req.body.autor === undefined
        || !req.body.autor){
            return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));       
        }
    const blogResult = await Blog.find({$and:[
                                       { $or: [{titulo: req.body.titulo},
                                               {autor: req.body.autor}
                                              ]},
                                       { $or:[{estado:true}]}
                                      ]})
      
    if(blogResult.length === 0){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));    
    }

    let arrayResult = [];
    let count = 0;

    blogResult.forEach(async (element,index)=>{
        const images = await getImageBlog(element);
        arrayResult.push(images);
        count = count +1;
        if (count > index){

            if(arrayResult.length === 0){
                return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));   
            }

            return res.json(arrayResult);
        }
    });
    
}


export const obtenerFormData = async(request, response)=>{
    const form = new multiparty.Form();
    form.parse(request, async (error, fields, files) => {
        console.log(files,"prueba")
        console.log(fields,"judith")
      });
}
