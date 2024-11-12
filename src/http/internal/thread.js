const { Router } = require('repulser');
const  secret  = require('./middleware.js');
const router = new Router({ prefix: '/threads' });
router.post('/', [secret(), async ctx => {}]);
module.exports = router;