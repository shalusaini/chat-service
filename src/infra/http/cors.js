// cors
const cors = async (ctx, next) => {
    const defaultOptions = {
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        origin: '*',
        credentials: false,
        maxAge: 86400,
        allowHeaders: [
            'Content-Type',
            'Authorization',
            'Accept',
            'Referer',
            'User-Agent',
            'Content-Disposition',
            'Content-Transfer-Encoding',
            'x-token',
            'x-content-type',
            'x-ver',
            'x-os',
            'x-entity',
            'x-thread-id',
            'x-request-id',
        ],
    };
    ctx.set('Access-Control-Allow-Origin', defaultOptions.origin);
    if (ctx.method === 'OPTIONS') {
        // Preflight Request
        if (!ctx.get('Access-Control-Request-Method')) {
            await next();
            return;
        }
        // Access-Control-Max-Age
        if (defaultOptions.maxAge) {
            ctx.set('Access-Control-Max-Age', String(defaultOptions.maxAge));
        }
        // Access-Control-Allow-Credentials
        if (defaultOptions.credentials === true) {
            // When used as part of a response to a preflight request,
            // this indicates whether or not the actual request can be made using credentials.
            ctx.set('Access-Control-Allow-Credentials', 'true');
        }
        // Access-Control-Allow-Methods
        if (defaultOptions.allowMethods) {
            ctx.set('Access-Control-Allow-Methods', defaultOptions.allowMethods.join(','));
        }
        // Access-Control-Allow-Headers
        if (defaultOptions.allowHeaders) {
            ctx.set('Access-Control-Allow-Headers', defaultOptions.allowHeaders.join(','));
        }
        else {
            ctx.set('Access-Control-Allow-Headers', ctx.get('Access-Control-Request-Headers'));
        }
        ctx.status = 204; // No Content
        return;
    }
    // Request
    // Access-Control-Allow-Credentials
    if (defaultOptions.credentials === true) {
        // eslint-disable-next-line no-undef
        if (origin === '*') {
            // `credentials` can't be true when the `origin` is set to `*`
            ctx.remove('Access-Control-Allow-Credentials');
        }
        else {
            ctx.set('Access-Control-Allow-Credentials', 'true');
        }
    }
    // Access-Control-Expose-Headers
    if (defaultOptions.exposeHeaders) {
        ctx.set('Access-Control-Expose-Headers', defaultOptions.exposeHeaders.join(','));
    }
    await next();
};
module.exports = () => cors;
//# sourceMappingURL=cors.js.map