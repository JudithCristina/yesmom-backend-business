import axios from "axios";

const  clienteAxiosSecurity = axios.create({
    baseURL : process.env.YESMOM_SECURITY_URL
})
export default clienteAxiosSecurity;