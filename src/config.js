import { config } from 'dotenv';
config({path:".env"});


module.exports = {
    MONGODB_URI: process.env.MONGODB_URI || '',
    APP_KEY: process.env.APP_KEY || '',
    SECURITY_KEY: process.env.SECURITY_KEY || '',
    BUCKET: process.env.BUCKET || '',
    REGION: process.env.REGION || '',
    ACCESS_KEY: process.env.ACCESS_KEY || '',
    SECRET_KEY: process.env.SECRET_KEY || '',
}