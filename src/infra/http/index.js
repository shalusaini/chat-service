const { createServer } = require( 'node:http');
const Koa = require( 'koa');
const logger = require( 'koa-logger');
const bodyParser = require( 'koa-body');
const niv = require( 'node-input-validator');
const cors = require( './cors.js');
const app = new Koa({
    proxy: true,
});
app.use(async (ctx, next) => {
    try {
        await next();
    }
    catch (e) {
        // if (ctx.url === '/admin') {
        //   return;
        // }
        console.error(e);
        ctx.type = e.type || 'application/json';
        ctx.status = e.status || 500;
        const body = {
            error: ctx.status >= 500 ? 'Something went wrong' : e.message,
        };
        if (e.meta) {
            body.meta = e.meta;
        }
        ctx.body = body;
    }
});
// attach logger
app.use(logger());
// cors
app.use(cors());
// NIV
app.use(niv.koa());
// @ts-ignore
app.context.reply = function reply(data, { meta, message } = {}) {
    this.body = { data, message, meta };
};
app.use(bodyParser({
    includeUnparsed: true,
    multipart: true,
    formidable: {
        keepExtensions: true,
        allowEmptyFiles: false,
    },
}));
app.server = createServer(app.callback());
// const listener = (app as any).server.listen.bind((app as any).server);
// (app as any).server.listen = async (...args: any) => {
//   await hooks.prestart();
//   listener(...args);
//   await hooks.poststart();
// }
module.exports = app;
//# sourceMappingURL=index.js.map