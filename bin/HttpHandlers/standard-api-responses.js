/**
 * Generates a default problem details object
 * @param {number} status - HTTP response code
 * @param {string} title - A human readable title of the problem
 * @param {string} detail - A human readable explanation of the problem
 * @param {Object[]} issues - Any specific issues with the request, these should be key, value pairs
 * @param {string} instance A URI reference that identifies the specific occurrence of the problem.
 */
const problemDetail = (status, title, detail = '', issues = [], instance = '') => {
  const problem = {
    status,
    type: `https://oneadvanced.com/problem/${status}`,
    title
  }

  if (detail !== '') problem.detail = detail
  if (issues.length > 0) problem.issues = issues
  if (instance !== '') problem.instance = instance

  return problem
}

/**
     * Generates a valid response JSON for HTTP response 400, Bad Request.
     * @exports
     * @param {string} detail - A human-readable explanation for the failure
     * @param {Object[]} issues - Any specific issues with the request. Objects are { error , fieldName }
     * @param {string} instance A URI reference that identifies the specific occurrence of the problem.
     */
module.exports.badRequest = function (detail = 'The request is invalid.', issues = [], instance = '') {
  return problemDetail(400, 'Bad Request', detail, issues, instance)
}

/**
     * Generate a valid response JSON for HTTP response 401, Unauthorized.
     */
module.exports.unauthorized = function () {
  return problemDetail(401, 'Unauthorized')
}

/**
     * Generate a valid response JSON for HTTP response 403, Forbidden.
     */
module.exports.forbidden = function (detail = '') {
  return problemDetail(403, 'Forbidden', detail)
}

/**
     * Generates a valid response JSON for HTTP response 404, Not Found.
     * @param {string} detail - A human-readable explanation for the status
     */
module.exports.notFound = function (detail = 'The requested resource cannot be located.') {
  return problemDetail(404, 'Not Found', detail)
}

/**
     * Generates a valid response JSON for HTTP response 406, Conflict.
     * @param {string} detail - A human-readable explanation for the status
     */
module.exports.notAcceptable = function (detail = 'The server is unable to produce a response matching the list of acceptable values. The following types are available: application/json, */*.') {
  return problemDetail(406, 'Not Acceptable', detail)
}

/**
     * Generates a valid response JSON for HTTP response 409, Conflict.
     * @param {string} detail - A human-readable explanation for the status
     * @param {Object[]} issues - Any specific issues with the request. Objects are { error , fieldName }
     */
module.exports.conflict = function (detail = 'The request could not be completed due to a conflict with the current state of the target resource.', issues = []) {
  return problemDetail(409, 'Conflict', detail, issues)
}

/**
     * Generate a valid response JSON for HTTP response 415, Unsupported Media Type
     * @param {string} detail - A human-readable explanation for the status
     */
module.exports.unsupportedMediaType = function (detail = 'The request could not be completed due to the request body being formed of an unsupported media type. Only application/json is accepted by this API.') {
  return problemDetail(415, 'Unsupported Media Type', detail)
}

/**
     * Generate a valid response JSON for HTTP response 422, Unprocessable entity
     * @param {string} detail - A human-readable explanation for the status
     */
module.exports.unprocessableEntity = function (detail = 'The request could not be completed due to the request body containing semantic error(s).') {
  return problemDetail(422, 'Unprocessable Entity', detail)
}

/**
     * Generates a valid response JSON for HTTP response 5xx, Internal Server Error.
     * @param {string} detail A human-readable explanation for the status
     * @param {string} instance A URI reference that identifies the specific occurrence of the problem.
     */
module.exports.internalServerError = function (detail = 'The server is unable to process the request.', instance = '') {
  return problemDetail(500, 'Internal Server Error', detail, [], instance)
}

/**
     * Generates a valid response JSON for HTTP response 503, Service Unavailable.
     * @param {string} detail A human-readable explanation for the status
     * @param {string} instance A URI reference that identifies the specific occurrence of the problem.
     */
module.exports.serviceUnavailable = function (detail = 'The service is down for maintenance or may be overloaded. Please try again later', instance = '') {
  return problemDetail(503, 'Service Unavailable', detail, [], instance)
}
