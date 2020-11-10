import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { isValidObjectId } from 'mongoose';
import multiparty from 'multiparty';

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
        || !req.body.autor
        || req.body.userType === undefined
        || !req.body.userType){
            return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));       
        }
    const blogResult = await Blog.find({$and:[
                                       { $or: [{titulo: req.body.titulo.toString()},
                                               {autor: req.body.autor.toString()}
                                              ]},
                                       { $or:[{estado:true}]}
                                      ]})
    if(blogResult.length === 0){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));    
    }

    const response = await Promise.all(

        blogResult.map(async(element)=>{
            let arrayResult = [];
            let jsonResult = {};
            const images = await getImageBlog(element);
            arrayResult.push(images);
            jsonResult.blog = element;
            jsonResult.imagenes = arrayResult;
            element.resultado = jsonResult;

            return element.resultado;
            
         })

    );
    if(!response || response.length ===0){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));     
    }

    return res.json(response); 
    
}

export const getBlog = async(req,res)=>{
    console.log(req.body)
    if(req.body.userType === undefined
        || !req.body.userType){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));       
    }
    let blogResult;
    if(req.body.userType===DomainConstant.USER_TYPE.ADMIN){
        blogResult = await Blog.find();
    }else if(req.body.userType===DomainConstant.USER_TYPE.USER){
        blogResult = await Blog.find({estado: true})
    }else{
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));
    } 
    if(!blogResult || blogResult.length === 0){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));     
    }

    const response = await Promise.all(
        blogResult.map(async(element)=>{
            let arrayResult = [];
            let jsonResult = {};
            const images = await getImageBlog(element);
            arrayResult.push(images);
            jsonResult.blog = element;
            jsonResult.imagenes = arrayResult;
            element.resultado = jsonResult;

            return element.resultado;
        })
    );
    if(!response || response.length ===0){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));     
    }
    return res.json(response);
}



export const getBlogAll = async(req,res)=>{
    if(req.params.userType === undefined
        || !req.params.userType){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));       
    }
    let blogResult;
    if(req.params.userType===DomainConstant.USER_TYPE.ADMIN){
        blogResult = await Blog.find();
    }else if(req.params.userType===DomainConstant.USER_TYPE.USER){
        blogResult = await Blog.find({estado: true})
    }else{
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));
    } 
    if(!blogResult || blogResult.length === 0){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));     
    }

    const response = await Promise.all(
        blogResult.map(async(element)=>{
            let arrayResult = [];
            let jsonResult = {};
            const images = await getImageBlog(element);
            arrayResult.push(images);
            jsonResult.blog = element;
            jsonResult.imagenes = arrayResult;
            element.resultado = jsonResult;

            return element.resultado;
        })
    );
    if(!response || response.length ===0){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));     
    }
    return res.json(response);
}

