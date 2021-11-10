const mongoose = require('mongoose');

const dbConnection = async() => {
    try{
        await mongoose.connect("mongodb+srv://admin:admin@cluster0.k7kzl.mongodb.net/meet", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // useCreateIndex: true,
            // useFindAndModify: false
        });
        console.log("Base de datos online");
    }catch(error){
        console.log(error);
        throw new Error("Error a la hora de iniciar la base de datos");
    }
}

module.exports = {dbConnection}