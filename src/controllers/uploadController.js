import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import * as Util from '../util/util';
import * as DomainConstant from '../constant/domain/domain'
import config from '../config';

import Image from '../models/image.model';
import Blog from '../models/blog.model';

export const uploadImage = async (value)=>{
    let input = value;
  
    const BUCKET = config.BUCKET;
    const REGION = config.REGION;
    const ACCESS_KEY = config.ACCESS_KEY;
    const SECRET_KEY = config.SECRET_KEY;
    
    let pathImage = input.file;

    let extension = path.extname(pathImage);
    let file = path.basename(pathImage,extension);
      
    let imageRemoteName = file + '_' + new Date().getTime() + DomainConstant.EXTENSION_IMAGE.PNG;
    
    AWS.config.update({
        accessKeyId:ACCESS_KEY,
        secretAccessKey:SECRET_KEY,
        region:REGION
    });
    
    
    return new Promise((resolve, reject)=>{
        const  s3 = new AWS.S3();
        s3.putObject({
            Bucket: BUCKET,
            Body: fs.readFileSync(pathImage),
            Key:imageRemoteName
        },function(err, response){
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
    let parameters =  req.body;
    
    let arrayFiles = [];

    let imgJsonBlog = {};
    imgJsonBlog.type = DomainConstant.TYPE_IMAGE.PRINCIPAL;
    imgJsonBlog.file = parameters.payload.imgBlog;

    arrayFiles.push(imgJsonBlog);

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
                paramsBlog.titulo = parameters.payload.titulo;
                paramsBlog.autor = parameters.payload.autor;
                paramsBlog.contenido = parameters.payload.contenido;
                paramsBlog.estado = DomainConstant.ESTADO_BLOG.ACTIVO;
                paramsBlog.fecha = new Date(Date.now()).toISOString();
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
        })
    }

}




