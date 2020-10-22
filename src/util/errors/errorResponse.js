const Datefun = require("../date/date");
exports.NewErrorResponse = function (code) {
    let error = {
        CodigoRespuesta: code,
        fecha: Datefun.getDateStringByFormat(new Date(), "YYYY-MM-DD"),
        hora: Datefun.getDateStringByFormat(new Date(), "HH:mm:ss")
    }
    switch (code) {
        case "11":
            error.MensajeRespuesta = "REQUEST INVÁLIDO";
            break
        case "13":
            error.MensajeRespuesta = "CLIENTE NO EXISTE";
            break
        case "14":
            error.MensajeRespuesta = "PROGRAMA NO EXISTE";
            break
        case "12":
            error.MensajeRespuesta = "TOKEN INVÁLIDO O EXPIRADO";
            break
        case "15":
            error.MensajeRespuesta = "NO EXISTEN DATOS";
            break
        case "16":
            error.MensajeRespuesta = "COMERCIO NO EXISTE";
            break
        case "10":
            error.MensajeRespuesta = "ERROR INTERNO";
            break
        case "17":
            error.MensajeRespuesta = "TOKEN DE CONTRATO INVÁLIDO";
            break
        case "20":
            error.MensajeRespuesta = "MONTO EXCEDE LÍMITE DE CONTRATO";
            break
        case "19":
            error.MensajeRespuesta = "ID DE TRANSACCIÓN ORIGINAL YA FUE REGISTRADO";
            break
        case "27":
            error.MensajeRespuesta = "FECHA FUERA DE LÍMITE DE CONTRATO";
            break
        case "21":
            error.MensajeRespuesta = "EL COMERCIO NO TIENE MONTO DISPONIBLE";
            break
        case "22":
            error.MensajeRespuesta = "EL MONTO DEL CONTRATO PASA EL LIMITE POR PROGRAMA";
            break
        case "23":
            error.MensajeRespuesta = "FECHA FINAL NO DEBE SER MENOR A LA FECHA INICIO";
            break
        case "24":
            error.MensajeRespuesta = "OPERACIONES BLOQUEADO. PROCESO DE CIERRE EN CURSO";
            break
        case "25":
            error.MensajeRespuesta = "ERROR CONSULTANDO ESTADO DE CIERRE";
            break
        case "26":
            error.MensajeRespuesta = "ID DE TRANSACCIÓN ORIGINAL NO EXISTE";
            break
        case "28":
            error.MensajeRespuesta = "NO EXISTEN SERVICIOS ACTIVOS, POR FAVOR INTENTE MÁS TARDE";
            break
        case "29":
            error.MensajeRespuesta = "TIPO DOCUMENTO INVÁLIDO";
            break
        case "30":
            error.MensajeRespuesta = "ERROR AL EXPORTAR ARCHIVO";
            break
        default:
            error.MensajeRespuesta = "ERROR DESCONOCIDO";
    }
    return error
}