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
    const form = new multiparty.Form();
    form.parse(req,async(error, fields, files)=>{
        console.log('**********fields', fields);
        console.log('**********files', files);
        console.log('*********error', error);
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
                      
                // let url = valor.url;
                let name = valor.name;
                let typeImage = valor.typeImage;
             
                let tagString = valor.response.ETag;
                const tag = await Util.findString(tagString);
        
                let result = {};
                
                result.name = name;
                result.tag = tag;
                // result.url = url;
                result.typeImage = typeImage;
                result.fecha = new Date().toISOString();
        
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
                    paramsBlog.eliminado = false;
            
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
        const newImages = await Promise.all(
            images.map(async(element)=>{
                let newUrlImage = {};
                const urlImage = await getBucketImage(element.name);
                
                if(urlImage.result){
                    newUrlImage._id = element._id;
                    newUrlImage.name = element.name;
                    newUrlImage.url = urlImage.url;
                    newUrlImage.typeImage = element.typeImage;
                }else if(!urlImage.result){
                    newUrlImage._id = element._id;
                    newUrlImage.name = element.name;
                    newUrlImage.url = "";
                    newUrlImage.typeImage = element.typeImage;
                }

                return newUrlImage;
            })
        );

        return newImages;

}

export const getBlogByParameters = async(req, res)=>{
    if(req.body.titulo === undefined
        || !req.body.titulo
        || req.body.autor === undefined
        || !req.body.autor
        || req.params.userType === undefined
        || !req.params.userType){
            return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));       
        }
    let blogResult;

    if(req.params.userType===DomainConstant.USER_TYPE.ADMIN){
        blogResult = await Blog.find({$and:[
            { $or: [{titulo: req.body.titulo.toString()},
                    {autor: req.body.autor.toString()}
                   ]},
            { $or:[{eliminado:false}]}
           ]})
    }else if(req.params.userType===DomainConstant.USER_TYPE.USER){
        blogResult = await Blog.find({$and:[
            { $or: [{titulo: req.body.titulo.toString()},
                    {autor: req.body.autor.toString()}
                   ]},
            { $or:[{estado:true}]}
           ]})
    }else{
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));
    }

    if(blogResult.length === 0){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));    
    }
    console.log('*********blogResult', blogResult);

    const response = await Promise.all(

        blogResult.map(async(element)=>{
            let arrayResult = [];
            let jsonResult = {};
            const images = await getImageBlog(element);
            arrayResult.push(images);
            jsonResult.blog = element;
            jsonResult.imagenes = arrayResult[0];
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
  console.log(req.query, ":)")
    if(req.params.userType === undefined
        || !req.params.userType){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));       
    }
    let blogResult;
    if(req.params.userType===DomainConstant.USER_TYPE.ADMIN){
        blogResult = await Blog.find({eliminado: false});
    }else if(req.params.userType===DomainConstant.USER_TYPE.USER){
        if(req.query.limit === "all"){
            blogResult = await Blog.find({estado: true})
        } else {
            const limit= parseInt(req.query.limit)
            blogResult = await Blog.find({estado: true}).limit(limit)
        }
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
            jsonResult.imagenes = arrayResult[0];
            element.resultado = jsonResult;

            return element.resultado;
        })
    );
    if(!response || response.length ===0){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));     
    }
    return res.json(response);
}

export const updateBlog = async(req,res)=>{
    const form = new multiparty.Form();
    form.parse(req, async(error, fields, files)=>{
        console.log("🚀 ~ file: uploadController.js ~ line 341 ~ form.parse ~  fields,",  fields,)
        if(error){
            return res.json(ErrResponse.NewErrorResponse(ErrConst.codTransaccionError));
        }
        if( !req.params.idBlog
            || !fields.titulo
            || !fields.autor
            || !fields.contenido
            || !fields.estado
            || !fields.fecha
            
            || req.params.idBlog === undefined
            || fields.titulo.includes('')
            || fields.autor.includes('')
            || fields.contenido.includes('')
            || fields.estado.includes('')
            || fields.fecha.includes('')){

                return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
        }
            // VALIDAR ID
            if(!isValidObjectId(req.params.idBlog)){
                const result =  (ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
                return result;
            };

            // VALIDO SI SE ACTUALIZA IMAGEN PRINCIPAL, IMAGEN AUTOR
            let parameters = {};
            parameters.files = files;
            parameters.fields = fields;
            
     
            let arrayFiles = [];
     
            if(files.imgBlog){
                let imgJsonBlog = {};
                imgJsonBlog.type = DomainConstant.TYPE_IMAGE.PRINCIPAL;
                imgJsonBlog.file = parameters.files.imgBlog[0].path;
                imgJsonBlog.originalFilename = parameters.files.imgBlog[0].originalFilename;
            
                arrayFiles.push(imgJsonBlog);
            }

            if(files.imgAutor){
                let imgJsonAutor = {};
        
                imgJsonAutor.type = DomainConstant.TYPE_IMAGE.AUTHOR;
                imgJsonAutor.file = parameters.files.imgAutor[0].path;
                imgJsonAutor.originalFilename = parameters.files.imgAutor[0].originalFilename;
            
                arrayFiles.push(imgJsonAutor);
            }

            console.log('****arrayFiles', arrayFiles);

            // OBTENGO EL BLOG POR ID
            const blogResult = await getBlogById(req.params.idBlog);
            console.log('****blogResult', blogResult);

            // DETERMINAR SI BORRO 1 O TODAS LAS IMAGENES
            let countDelete=0;

            switch(arrayFiles.length){
                case 0:
                    countDelete = 0;
                    break;
                case 1:
                    countDelete = 1;
                    break;
                case 2:
                    countDelete = 2;
                    break;
                default:
                    countDelete = 0;
                    
            }

            switch(countDelete){
                case 0:
                    // SÓLO HAY VALORES STRING
                    // ACTUALIZAR
                    console.log('**********case0');
                    const result = await Blog.updateOne(
                        {"_id": req.params.idBlog},
                        {$set:{"titulo":parameters.fields.titulo[0],
                                "autor":parameters.fields.autor[0],
                                "contenido":parameters.fields.contenido[0],
                                "estado":(parameters.fields.estado[0] === DomainConstant.ESTADOS_BLOG.ACTIVO)?true:false,
                                "fecha":new Date(parameters.fields.fecha[0]).toISOString(),
                                "eliminado":false
                                }
                        }
                    );
                    if(!result){
                        return res.json(ErrResponse.NewErrorResponse(ErrConst.codTransaccionError));
                    }
                    console.log('*********parameters', parameters);
                    return res.json(parameters);

                case 1:
                    // FILTRO LA IMAGEN A BORRAR
                    let filterImage = blogResult[0].imagenes.find((item) => item.typeImage === arrayFiles[0].type);
                    console.log('*******filerImage', filterImage);
                    
                    // BORRO LA IMAGEN DEL S3
                    await deleteImage(filterImage.name);

                    // BORRO LA IMAGEN DE LA COLLECTION IMAGE-MONGODB
                    await deleteImageOfCollection(filterImage._id);

                    // SUBO LA IMAGEN A S3
                    let principalImage;
                    let authorImage;

                    let parametersTransaction = {};
                    
                    const resultUpdate = await Promise.all(
                            arrayFiles.map(async(element)=>{
                                const valor = await uploadImage(element);

                                let name = valor.name;
                                let typeImage = valor.typeImage;
                                let tagString = valor.response.ETag;
                                const tag = await Util.findString(tagString);

                                // SETEO VALORES PARA GUARDAR EN COLLECTION DE IMAGENES
                                let paramsImages = {};
                                paramsImages.name = name;
                                paramsImages.tag = tag;
                                paramsImages.typeImage = typeImage;
                                paramsImages.fecha = new Date().toISOString();
                                
                                // GUARDO LA IMAGEN EN MONGO DB
                                const newImage = new Image(paramsImages);
                                const image = await newImage.save();

                                if(principalImage==undefined){
                                    principalImage = (typeImage===DomainConstant.TYPE_IMAGE.PRINCIPAL)?image._id:undefined;
                                }
                                if(authorImage===undefined){
                                    authorImage =  (typeImage===DomainConstant.TYPE_IMAGE.AUTHOR)?image._id:undefined;
                        
                                }

                                // ACTUALIZO EL BLOG
                                
                                parametersTransaction._id = req.params.idBlog;
                                parametersTransaction.titulo = parameters.fields.titulo[0];
                                parametersTransaction.autor = parameters.fields.autor[0]
                                parametersTransaction.contenido = parameters.fields.contenido[0];
                                parametersTransaction.estado =(parameters.fields.estado[0] === DomainConstant.ESTADOS_BLOG.ACTIVO)?true:false;
                                parametersTransaction.fecha = new Date(parameters.fields.fecha[0]).toISOString();
                                parametersTransaction.imgPrincipal = (filterImage.typeImage === DomainConstant.TYPE_IMAGE.PRINCIPAL)?principalImage:blogResult[0].blog.imgPrincipal;
                                parametersTransaction.imgAutor = (filterImage.typeImage === DomainConstant.TYPE_IMAGE.AUTHOR)?authorImage:blogResult[0].blog.imgAutor;
                                parametersTransaction.eliminado = false;

                                resultTransaction = await updatBlogTransaction(parametersTransaction);

                                parametersTransaction.update = true;
                                parametersTransaction.code = DomainConstant.SUCCESS;
                                
                                element.update = parametersTransaction;
                                return element.update;
                            })
                    )
                    console.log('*******resultUpdate', resultUpdate)

                    if(!resultUpdate){
                        return res.json(ErrResponse.NewErrorResponse(ErrConst.codTransaccionError));
                    }
                    return res.json(resultUpdate);

                case 2:
                    // ALMACENO LAS IMAGENES EN UNA VARIABLE
                    let imagesList = blogResult[0].imagenes;

                    console.log('*******imagesList', imagesList);

                    // BORRO DEL S3
                    await Promise.all(
                            imagesList.map(async(element)=>{
                                const deleteElement = await deleteImage(element.name);
                                element.deleteItemS3 = deleteElement;
                                return element.deleteItemS3;
                            })
                        )
                    // BORRO DEL MONGO DB
                    await Promise.all(
                            imagesList.map(async(element)=>{
                                const deleteImageMongo = await deleteImageOfCollection(element._id);
                                element.deleteImageMongo = deleteImageMongo;
                                return element.deleteImageMongo;
                            })
                    )
                    // SUBO LA IMAGEN A S3
                    let principalImageCase2;
                    let authorImageCase2;

                    let parametersTransactionCase2 = {};
                    let resultTransactionCase2;
                    let count =0;

                    //const resultUpdateCase2 = await Promise.all(
                        arrayFiles.forEach(async(element)=>{
                            const valor = await uploadImage(element);

                            let name = valor.name;
                            let typeImage = valor.typeImage;
                            let tagString = valor.response.ETag;
                            const tag = await Util.findString(tagString);

                            // SETEO VALORES PARA GUARDAR EN COLLECTION DE IMAGENES
                            let paramsImages = {};
                            paramsImages.name = name;
                            paramsImages.tag = tag;
                            paramsImages.typeImage = typeImage;
                            paramsImages.fecha = new Date().toISOString();
                            
                            // GUARDO LA IMAGEN EN MONGO DB
                            const newImage = new Image(paramsImages);
                            const image = await newImage.save();

                            if(principalImageCase2==undefined){
                                principalImageCase2 = (typeImage===DomainConstant.TYPE_IMAGE.PRINCIPAL)?image._id:undefined;
                            }
                            if(authorImageCase2===undefined){
                                authorImageCase2 =  (typeImage===DomainConstant.TYPE_IMAGE.AUTHOR)?image._id:undefined;
                    
                            }
                            count = count + 1
                            // ACTUALIZO EL BLOG
                            if(count == 2 && principalImageCase2!== undefined && authorImageCase2!==undefined){
                                parametersTransactionCase2._id = req.params.idBlog;
                                parametersTransactionCase2.titulo = parameters.fields.titulo[0];
                                parametersTransactionCase2.autor = parameters.fields.autor[0]
                                parametersTransactionCase2.contenido = parameters.fields.contenido[0]
                                parametersTransactionCase2.estado =(parameters.fields.estado[0] === DomainConstant.ESTADOS_BLOG.ACTIVO)?true:false,
                                parametersTransactionCase2.fecha = new Date(parameters.fields.fecha[0]).toISOString(),
                                parametersTransactionCase2.imgPrincipal = principalImageCase2;
                                parametersTransactionCase2.imgAutor = authorImageCase2;
                                parametersTransactionCase2.eliminado = false;

                                resultTransactionCase2 = await updatBlogTransaction(parametersTransactionCase2);

                                parametersTransactionCase2.update = true;
                                parametersTransactionCase2.code = DomainConstant.SUCCESS;
                                
                                console.log('*******parametersTransactionCase2', parametersTransactionCase2)

                                if(!resultTransactionCase2){
                                    return res.json(ErrResponse.NewErrorResponse(ErrConst.codTransaccionError));
                                }
                                return res.json(parametersTransactionCase2);
                                
                            }
                            
                            
                        })
                    //)
                    

                default:
                    break;
                
            }
        
    });
}

export const deleteBlog = async(req,res)=>{

    // CAMBIAR DE POST A GET -> cambiar a req.params
    //const form = new multiparty.Form();
    //form.parse(req, async(error,fields,files)=>{
        let response = {};
        if(!req.params.idBlog || req.params.idBlog === undefined){
            return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));  
        }
        // VALIDAR ID
        if(!isValidObjectId(req.params.idBlog)){
            return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
        };
        try{
            // DELETE LÓGICO (UPDATE estado = false)
            const result = await Blog.updateOne(
                {"_id":req.params.idBlog},
                {$set:{"estado":false,
                       "eliminado": true}}
                // TO DO: AGREGAR CAMPO A LA COLECCION 'ELIMINADO: TRUE OR FALSE'
            )
            response.idBlog = req.params.idBlog
            response.delete = true;
            response.code = DomainConstant.SUCCESS;

            if(!result){
                return res.json(ErrResponse.NewErrorResponse(ErrConst.codTransaccionError));
            }
            return res.json(response);
        }catch(err){
            console.log('[Error]', err);
            response.delete = false;
            response.message = DomainConstant.ERROR_INTERNO;
            res.json({
                response
            });
        }


    //})
}

export const getBlogById = async(idBlog)=>{
    
    if( !idBlog
        || idBlog === undefined){
            return (ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
    }
    
    const blogResult = await Blog.find({_id:idBlog});
    if(blogResult.length === 0){
        return (ErrResponse.NewErrorResponse(ErrConst.codNoDatos));    
    }
    const response = await Promise.all(
        blogResult.map(async(element)=>{
            let arrayResult = [];
            let jsonResult = {};
            const images = await getImageBlog(element);
            arrayResult.push(images);
            jsonResult.blog = element;
            jsonResult.imagenes = arrayResult[0];
            element.resultado = jsonResult;

            return element.resultado;
        })
    )
    if(!response || response.length === 0){
        return (ErrResponse.NewErrorResponse(ErrConst.codNoDatos));    
    }
    return response;
}

// export const updateTest = async(req,res)=>{

//     if( !req.params.idBlog
//         || !req.body.imgBlog
//         || !req.body.imgAutor
//         || !req.body.titulo
//         || !req.body.autor
//         || !req.body.contenido
//         || !req.body.estado
//         || !req.body.fecha
        
//         || req.params.idBlog === undefined
//         || req.body.imgBlog.length === undefined
//         || req.body.imgAutor.length ===undefined
//         || req.body.titulo.length ===undefined
//         || req.body.autor.length ===undefined
//         || req.body.contenido.length ===undefined
//         || req.body.estado.length ===undefined
//         || req.body.fecha.length ===undefined){

//             return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
//     }
//     // VALIDAR ID
//     if(!isValidObjectId(req.params.idBlog)){
//         const result =  (ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
//         return result;
//     };
//     // SUBIR IMAGEN A AWS
//     // TO DO: VALIDAR SI HAY CAMBIO DE IMGS
//         let parameters = req.body
//         let arrayFiles = [];
     
//     let imgJsonBlog = {};
//     imgJsonBlog.type = DomainConstant.TYPE_IMAGE.PRINCIPAL;
//     imgJsonBlog.file = parameters.imgBlog;
//     // imgJsonBlog.originalFilename = parameters.files.imgBlog[0].originalFilename;
        
//     arrayFiles.push(imgJsonBlog);
        
//     let imgJsonAutor = {};
        
//     imgJsonAutor.type = DomainConstant.TYPE_IMAGE.AUTHOR;
//     imgJsonAutor.file = parameters.imgAutor;
//     // imgJsonAutor.originalFilename = parameters.files.imgAutor[0].originalFilename;
        
//     arrayFiles.push(imgJsonAutor);
        
//     let count = 0;
//     let principalImage;
//     let authorImage;
//     let response = {};
    
//     const blogResult = await getBlogById(req.params.idBlog);

//     //BORRO LAS IMAGENES ACTUALES DEL S3
//     try{
//         const responseDelete = await Promise.all(
//             blogResult.map(async (element)=>{
//                 const mapImage = await Promise.all(
//                     element.imagenes.map(async(item)=>{
//                         let arrayDel = [];
//                         let jsonDel = {};
//                         const delImage = await deleteImage(item.name)

//                         if(delImage.result){
//                             arrayDel.push(delImage.response)
//                             jsonDel.name = arrayDel[0];
//                             item.deleteItem = jsonDel;
//                         }

//                         return item.deleteItem;
//                     })
//                 )
                
//                 if(mapImage.length > 0){
//                    element.imagenes = mapImage;
//                 }

//                 return element;
//             })
//         );
 
//         if(responseDelete[0].imagenes.length < 2){
//             return res.json(ErrResponse.NewErrorResponse(ErrConst.codTransaccionError));        
//         }
//         // BORRO IMAGEN DE LA COLLECTION
//        const resultDeleteImage = await Promise.all(
//                 blogResult.map(async (element)=>{
//                     let arrayDel = [];
//                     let jsonDel = {};
//                     const responseDelImgPrincipal = await deleteImageOfCollection(element.blog.imgPrincipal);
//                     const responseDelImgAuthor = await deleteImageOfCollection(element.blog.imgAutor); 
//                     arrayDel.push(responseDelImgPrincipal);
//                     arrayDel.push(responseDelImgAuthor);
//                     jsonDel.imgPrincipalDel = responseDelImgPrincipal;
//                     jsonDel.imgAutorDel = responseDelImgAuthor;

//                     element.imagesDelCollection = [jsonDel];
//                     return element;
//                 })
//         );

//         // CONTINUO EL FLUJO
//         arrayFiles.forEach(async (element)=>{
//             const valor = await uploadImage(element);
           
//             // let url = valor.url;
//             let name = valor.name;
//             let typeImage = valor.typeImage;

//             let tagString = valor.response.ETag;
//             const tag = await Util.findString(tagString);
    
//             let result = {};
            
//             result.name = name;
//             result.tag = tag;
//             // result.url = url;
//             result.typeImage = typeImage;
//             result.fecha = new Date().toISOString();
    
//             const newImage = new Image(result);
//             const image = await newImage.save();

//             if(principalImage==undefined){
//                 principalImage = (typeImage===DomainConstant.TYPE_IMAGE.PRINCIPAL)?image._id:undefined;
//             }
//             if(authorImage===undefined){
//                 authorImage =  (typeImage===DomainConstant.TYPE_IMAGE.AUTHOR)?image._id:undefined;
    
//             }
      
//             count = count +1
  
//             if(count == 2 && principalImage!== undefined && authorImage!==undefined){

//                 // ACTUALIZAR
//                 const result = await Blog.updateOne(
//                     {"_id": req.params.idBlog},
//                     {$set:{"titulo":parameters.titulo,
//                             "autor":parameters.autor,
//                             "contenido":parameters.contenido,
//                             "estado":(parameters.estado === DomainConstant.ESTADOS_BLOG.ACTIVO)?true:false,
//                             "fecha":new Date(parameters.fecha).toISOString(),
//                             "imgPrincipal":principalImage,
//                             "imgAutor":authorImage,
//                             "eliminado":false
//                             }
//                     }
//                 );
//                 response.update = true;
//                 response.code = DomainConstant.SUCCESS;
//                 response.content = resultDeleteImage
                
//                 if(!result){
//                     return res.json(ErrResponse.NewErrorResponse(ErrConst.codTransaccionError));
//                 }
//                 return res.json(response);

//             }

//         })

//         //res.json(responseDelete);
//     }catch(err){
//         console.log('[Error]', err);
//         response.update = false;
//         response.message = DomainConstant.ERROR_INTERNO;
//         res.json({
//             response
//         });
//     }

// }

export const validateBucketImage = async(value)=>{
    let input = value;
    const BUCKET = config.BUCKET;
    const REGION = config.REGION;
    const ACCESS_KEY = config.ACCESS_KEY;
    const SECRET_KEY = config.SECRET_KEY;
    
    let pathImage = input.file;

    let extension = path.extname(pathImage);
    let file = path.basename(pathImage,extension);
      
    //let imageRemoteName = file + '_' + new Date().getTime() + extension;
    
    AWS.config.update({
        accessKeyId:ACCESS_KEY,
        secretAccessKey:SECRET_KEY,
        region:REGION
    });

    let result = {};
    const params = {
        Bucket: BUCKET,
        Key:file
    }
    const s3 = new AWS.S3();

    try{
        const headCode = await s3.headObject(params).promise();
        console.log('***************headCode', headCode);
        const signedUrl = await s3.getSignedUrl('getObject', params).promise();
        console.log('***************signedUrl', signedUrl);
        if(!signedUrl){
            result.response = true;
            result.message = 'Existe'
            return result; //EXISTE
        }      
    }catch(headErr){
        console.log('***********', headErr)
        if (headErr.code === 'NotFound') {
            // Handle no object on cloud here
            result.response = false;
            result.message = 'No Existe'
            return result; //NO EXISTE
          }
    }
}

export const deleteImage = async(fileName)=>{
    console.log('********fileName', fileName);
  
    return new Promise((resolve,reject)=>{
        const s3 = new AWS.S3({
            accessKeyId: config.ACCESS_KEY,
            secretAccessKey: config.SECRET_KEY
        });
        let params = {
            Bucket: config.BUCKET,
            Key: fileName
        }
        s3.deleteObject(params, function(err,data){
            if(err){
                console.log("[S3Service.deleteObject.ERROR",err, err.stack);
                return resolve({
                    "result": false,
                    "message": "ERROR DELETE"
                });
            }else{
                console.log("[Delete Object OK]", data);
                return resolve({
                    "result":true,
                    "message": "OK",
                    "response": "DEL" + '-' + fileName
                })
            }
        })
    })
    

}

// export const getImageBlogTest = async(req, res)=>{

//     if(req.body.imgPrincipal === undefined 
//         || req.body.imgAutor === undefined
//         || !req.body.imgPrincipal
//         || !req.body.imgAutor){
//         return res.json(ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
//     }
//     // VALIDAR ID
//     if(!isValidObjectId(req.body.imgPrincipal) || !isValidObjectId(req.body.imgAutor)){
//         const result =  (ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
//         return res.json(result);
//     };

//     //REALIZAR BUSQUEDA

//         const images = await Image.find({
//             "_id" : { "$in":[req.body.imgPrincipal, req.body.imgAutor]}
//         }) 
//         if(images.length === 0){
//             const result = (ErrResponse.NewErrorResponse(ErrConst.codNoDatos));
//             return res.json(result);
//         }
    
//         return res.json(images);

// }

export const deleteImageOfCollection = async (idImage)=>{
    let response = {};
    const deleteImage = await Image.findOneAndDelete(
        {_id: idImage}
    );
    if(!deleteImage){
        response.result = false;
        response.message = "ERROR DELETE IMAGE";
        response.idImage = idImage;
    }else{
        response.result = true;
        response.message = "DELETE IMAGE OK";
        response.idImage = idImage;
    }
return response;

}

export const getBucketImageTest = async(req, res)=>{
    const parameters = req.body;
    
    const response = await getBucketImage(parameters.fileName);
    return res.json(response);
    
}

export const getBucketImage = async(fileName)=>{
    return new Promise((resolve,reject)=>{
        const s3 = new AWS.S3({
            accessKeyId: config.ACCESS_KEY,
            secretAccessKey: config.SECRET_KEY,
            region:config.REGION
        });
        let params = {
            Bucket: config.BUCKET,
            Key: fileName.toString()
        }
        s3.getObject(params, function(err, data) {
            if (err){
                console.log("[S3Service.getObject.ERROR]",err);
                return resolve(
                    {"result":false,
                    "responseCode": ErrConst.codTransaccionError
                });
            }
            
            // let objectData = data.Body.toString('base64');
            // console.log("[S3Service.getObject.SUCCESS]");
            return resolve({
                "result":true,
                // "data": objectData,
                "url": s3.getSignedUrl('getObject', { Bucket: config.BUCKET, Key: fileName })
            });

        });        
    })
}

export const getBlogByIdTest = async(req, res)=>{
    
    if( !req.params.idBlog
        || req.params.idBlog === undefined){
            return (ErrResponse.NewErrorResponse(ErrConst.codReqInvalido));
    }
    
    const blogResult = await Blog.find({_id:req.params.idBlog});
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
            jsonResult.imagenes = arrayResult[0];
            element.resultado = jsonResult;

            return element.resultado;
        })
    )
    if(!response || response.length === 0){
        return res.json(ErrResponse.NewErrorResponse(ErrConst.codNoDatos));    
    }
    return res.json(response);
}

export const updatBlogTransaction = async(payload)=>{
    const result = await Blog.updateOne(
        {"_id": payload._id},
        {$set:{"titulo":payload.titulo,
                "autor":payload.autor,
                "contenido":payload.contenido,
                "estado":(payload.estado === DomainConstant.ESTADOS_BLOG.ACTIVO)?true:false,
                "fecha":new Date(payload.fecha).toISOString(),
                "imgPrincipal":payload.imgPrincipal, // TO DO:VALIDAR CAMPO
                "imgAutor":payload.imgAutor, //TO DO: VALIDAR CAMPO
                "eliminado":payload.eliminado
                }
        }
    );

    return result;
}

