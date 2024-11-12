const { connect }  = require( "./infra/db/mongo.js");
const argv = process.argv.slice(2);
connect().then(async (db) => {
    for (const arg of argv) {
        const module = await require(`./resources/updates/${arg}/index.js`);
        await module.init(db.collections);
    }
    db.client.close();
});