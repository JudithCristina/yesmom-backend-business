import mongoose from 'mongoose';
import config from './config';

mongoose.connect( config.MONGODB_URI,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true
    })
    .then(db => console.log('Mongo Atlas Conectado'))
    .catch(err => console.log(err))