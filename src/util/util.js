const crypto = require('crypto');

export const encryptAES256 = async(data,password)=>{
    try {
        const passwordHash =  await createMD5Hash(password);
        const iv = await createIV();
        const cipher = crypto.createCipheriv('aes-256-cbc', passwordHash, iv);
        const encryptedData = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
        return encryptedData;
      } catch (error) {
        console.error(error);
        return null;
      }
}

export const decryptAES256 = async(data,password)=>{
    try {
        const passwordHash = await createMD5Hash(password);
        const iv = await createIV();
        const decipher = crypto.createDecipheriv('aes-256-cbc', passwordHash, iv);
        const decryptedData = decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
        return decryptedData;
      } catch (error) {
        console.error(error);
        return null;
      }
}

export const createMD5Hash = async(data)=>{
    try {
        return crypto.createHash('md5').update(data, 'utf-8').digest('hex');
      } catch (error) {
        console.error(error);
        return null;
      }
}

export const createIV = async()=>{
    try {
        const iv = new Buffer.alloc(16);
        return iv;
      } catch (error) {
        console.error(error);
        return null;
      }
}

export const findString = async (value)=>{
  const matches = value.split('"');
  return matches[1] ? matches[1] : value;
}