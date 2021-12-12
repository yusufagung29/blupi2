const { Client } = require('pg');


const client = new Client({
    user: 'postgres',
    host: '34.135.100.49',
    database: 'blupidb',
    password: 'i5popg1ebF2Chin3',
    port: 5432,
    multipleStatements:true
});

client.connect((err) =>{
    if (err) {
        console.error(err);
        return;
    }
    console.log('Database Connected');
});


module.exports = {client};