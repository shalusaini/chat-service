const { connect }  = require( "./infra/db/mongo.js");
const seeds  = require( './resources/seeds/index.js');
connect().then(async (db) => {
    await seeds(db.collections);
    db.client.close();
});