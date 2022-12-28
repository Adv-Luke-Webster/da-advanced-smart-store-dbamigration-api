const responses = require("./standard-api-responses.js");
/**
 * Generate a valid response JSON for lambda proxy integration
 * @param {number} status - A valid HTTP response code
 * @param {string} body - A string representation of the response
 * @param {string} location - A URL used to identify location of a newly created resource
 */
const res = (status, body = "", location = "") => {
  const contentType =
    status < 400 ? "application/json" : "application/problem+json";
  const lambdaRes = {
    isBase64Encoded: false,
    statusCode: status,
    headers: {
      "Content-Type": contentType,
    },
    body,
  };
  if (location) lambdaRes.headers.Location = location;
  return lambdaRes;
};

/**
 * Generate a valid response JSON for HTTP response 200, OK.
 * @param {Object} body - JSON object to be returned as the response
 */
module.exports.ok = function (body) {
  //return res(200, JSON.stringify(body));
  return res(200, body);
};

/**
 * Generate a valid response JSON for HTTP response 201, Created.
 * @exports
 * @param {Object} body - JSON object to be returned as the response
 * @param {string} location - A URL used to identify location of the newly created resource
 */
module.exports.created = function (body, location = "") {
  if (!location)
    console.warn(
      "201 response should provide a location of newly created resource"
    );
  return res(201, JSON.stringify(body), location);
};

/**
 * Generates a valid response JSON for HTTP response 202, Accepted.
 * @exports
 * @param {Object} body - JSON object to be returned as the response
 * @param {string} location -  A URL that can be used to track the progress of the initiated action
 */
module.exports.accepted = function (body, location = "") {
  return res(202, JSON.stringify(body), location);
};

/**
 * Generates a valid response JSON for HTTP response 204, No Content.
 * @exports
 */
module.exports.noContent = function () {
  return res(204);
};

/**
 * Generates a valid response JSON for HTTP response 400, Bad Request.
 * @exports
 * @param {string} detail - A human-readable explanation for the failure
 * @param {Object[]} issues - Any specific issues with the request. Objects are { error , fieldName }
 * @param {string} instance A URI reference that identifies the specific occurrence of the problem.
 */
module.exports.badRequest = function (detail = "", issues = [], instance) {
  const problem = responses.badRequest(detail, issues, instance);
  return res(problem.status, problem);
};

/**
 * Generate a valid response JSON for HTTP response 401, Unauthorized.
 * @exports
 */
module.exports.unauthorized = function () {
  const problem = responses.unauthorized();
  return res(problem.status, JSON.stringify(problem));
};

/**
 * Generate a valid response JSON for HTTP response 403, Forbidden.
 * @exports
 * @param {string} detail - A human-readable explanation for the status
 */
module.exports.forbidden = function (detail = "") {
  const problem = responses.forbidden(detail);
  return res(problem.status, JSON.stringify(problem));
};

/**
 * Generates a valid response JSON for HTTP response 404, Not Found.
 * @exports
 * @param {string} detail - A human-readable explanation for the status
 */
module.exports.notFound = function (detail = "") {
  const problem = responses.notFound(detail);
  return res(problem.status, JSON.stringify(problem));
};

/**
 * Generates a valid response JSON for HTTP response 406, Not Acceptable.
 * @exports
 * @param {string} detail - A human-readable explanation for the status
 */
module.exports.notAcceptable = function (detail = "") {
  const problem = responses.notAcceptable(detail);
  return res(problem.status, JSON.stringify(problem));
};

/**
 * Generates a valid response JSON for HTTP response 409, Conflict.
 * @exports
 * @param {string} detail - A human-readable explanation for the status
 * @param {Object[]} issues - Any specific issues with the request. Objects are { error , fieldName }
 */
module.exports.conflict = function (detail = "", issues = []) {
  const problem = responses.conflict(detail, issues);
  return res(problem.status, JSON.stringify(problem));
};

/**
 * Generates a valid response JSON for HTTP response 415, Unsupported Media Type
 * @param {string} detail - A human-readable explanation for the status
 */
module.exports.unsupportedMediaType = function (detail = "") {
  const problem = responses.unsupportedMediaType(detail);
  return res(problem.status, JSON.stringify(problem));
};

/**
 * Generates a valid response JSON for HTTP response 422, Unprocessable Entity
 * @param {string} detail - A human-readable explanation for the status
 */
module.exports.unprocessableEntity = function (detail = "") {
  const problem = responses.unprocessableEntity(detail);
  return res(problem.status, JSON.stringify(problem));
};

/**
 * Generates a valid response JSON for HTTP response 5xx, Internal Server Error.
 * @exports
 * @param {string} detail A human-readable explanation for the status
 * @param {string} instance A URI reference that identifies the specific occurrence of the problem.
 */
module.exports.internalServerError = function (detail = "", instance = "") {
  const problem = responses.internalServerError(detail, instance);
  return res(problem.status, JSON.stringify(problem));
};

/**
 * Generates a valid response JSON for HTTP response 503, Service Unavailable.
 * @exports
 * @param {string} detail A human-readable explanation for the status
 * @param {string} instance A URI reference that identifies the specific occurrence of the problem.
 */
module.exports.serviceUnavailable = function (detail = "", instance = "") {
  const problem = responses.serviceUnavailable(detail, instance);
  return res(problem.status, JSON.stringify(problem));
};
