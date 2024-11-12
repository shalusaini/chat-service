const { CreateError }  = require( "./error.js");
class Result {
    constructor(success, _error = null, value) {
        this.success = success;
        this._error = _error;
        if (success && _error) {
            throw new Error("InvalidOperation: A result cannot be successful and contain an error");
        }
        if (!success && !_error) {
            throw new Error("InvalidOperation: A failing result needs to contain an error message");
        }
        this._error = _error;
        this._value = value;
        Object.freeze(this);
    }
    get ok() {
        return this.success;
    }
    value() {
        if (!this.success) {
            return this._error;
        }
        return this._value;
    }
    static ok(value) {
        return new Result(true, null, value);
    }
    static fail(error) {
        return new Result(false, error);
    }
    static error(message, status = 400) {
        return new Result(false, CreateError(message, status));
    }
    error() {
        return this._error;
    }
}
module.exports = Result
//# sourceMappingURL=result.js.map