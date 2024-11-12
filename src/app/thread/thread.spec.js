// const path  = require( 'path';
// const { config }  = require( 'dotenv';
// config(path.resolve(process.cwd(), '.env.test'));
const Conf  = require( '../../config.js');
const t  = require( 'tap');
const { connect }  = require( "../../infra/db/mongo.js");
const { CreateOneToOneThread }  = require( "./thread.js");
const { GetUserProvider }  = require( "../../infra/services/user.js");
const { EventService }  = require( "../../infra/services/events.js");
let db;
const providers = {
    userProvider: GetUserProvider(),
    events: new EventService(),
};
t.before(async () => {
    db = await connect(`${Conf.mongo.url}_thread`);
});
t.teardown(async () => {
    await db.client.db().dropDatabase();
    await db.client.close();
});
t.test('thread.CreateOneToOneThread()', t => {
    t.plan(1);
    t.test('should create one to one thread', async (t) => {
        const [user1r, user2r] = await Promise.all([
            providers.userProvider.token('1'),
            providers.userProvider.token('2'),
        ]);
        t.ok(user1r.ok);
        t.ok(user2r.ok);
        const [user1, user2] = [user1r.value(), user2r.value()];
        let result = await CreateOneToOneThread('1', db.collections, providers.userProvider, providers.events, user1, { receiverUserId: '2' });
        t.equal(result.ok, true, 'thread initiated');
        let { thread, created } = result.value();
        t.ok(thread, 'has thread model');
        t.equal(created, true, 'thread created');
        t.hasOwnProp(thread, '_id', 'thread model has _id');
        t.type(thread.ownerId, 'string', 'thread owner id is string');
        t.equal(thread.ownerId, '1', 'thread has expected owner');
        t.type(thread.receiverUserId, 'string', 'thread receiver id is string');
        t.equal(thread.receiverUserId, '2', 'thread has expected receiver');
        const threadId = thread._id.toString();
        result = await CreateOneToOneThread('2', db.collections, providers.userProvider, providers.events, user2, { receiverUserId: '1' }, user1);
        t.equal(result.ok, true, 'thread initiated');
        ({ thread, created } = result.value());
        t.ok(thread, 'has thread model');
        t.equal(created, false, 'thread found');
        t.hasOwnProp(thread, '_id', 'thread model has _id');
        t.equal(thread._id.toString(), threadId, 'thread is expected one');
        t.type(thread.ownerId, 'string', 'thread owner id is string');
        t.equal(thread.ownerId, '1', 'thread has expected owner');
        t.type(thread.receiverUserId, 'string', 'thread receiver id is string');
        t.equal(thread.receiverUserId, '2', 'thread has expected receiver');
    });
});
//# sourceMappingURL=thread.spec.js.map