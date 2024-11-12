const Result = require( "../../base/result.js");
const Conf = require( "../../config.js");
const  request  = require( "./5starapi.js");
class GroupProvider {
    get(token, group) {
        return request('POST', '/group-exist', { group }, { token });
    }
}
class MockGroupProvider {
    async get(token, group) {
        const gid = parseInt(group);
        if (gid < 1) {
            Result.error('Group not found', 404);
        }
        return Result.ok({ id: group, name: `Group ${group}` });
    }
}
function GetGroupProvider() {
    return Conf.env.name == 'mock' ? new MockGroupProvider : new GroupProvider;
}
module.exports = {
    GroupProvider,
    MockGroupProvider,
    GetGroupProvider
}