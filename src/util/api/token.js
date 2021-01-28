import Req from 'request';
import config from '../../config';

export const validateToken = async(tokenParam)=>{
    const apiURLValidate = config.AUTHORIZATION_URL;
    // const parametros = Config.parametros;

    return new Promise((resolve, reject) => {
        Req.get({
            "headers": {
                "Content-Type": "application/json",
                "access-token": `${tokenParam}`
            },
            "url": apiURLValidate,
            /*"form": {
                "codigoAplicativo": parametros.codigoAplicativo,
                "entorno": parametros.entorno,
                "codigoServicio": "generateUrl"
            }*/
            }, (err, res, body) => {
               
                if (!isJSON(body)) {

                    return reject(new Error(body));
                }
                if (err){

                    return reject(err);
                }
                else{
                    var bodyObject = JSON.parse(body);
                    return resolve(bodyObject.token);
                }
            }
        );
    })
}

export const isJSON=(data)=>{
    try {
        JSON.parse(data)
    } catch (e) {
        return false;
    };
    return true;
}