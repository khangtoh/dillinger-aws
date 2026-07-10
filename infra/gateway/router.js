// CloudFront Function (viewer-request, runtime cloudfront-js-2.0).
//
// Single entry gateway for multiple single-tenant Dillinger instances
// (see spec/10-gateway.md). Extracts the tenant id from the request's
// subdomain, looks up that tenant's Lambda Function URL in the attached
// CloudFront KeyValueStore, and dynamically rewrites the request's origin
// to it. Unknown subdomains get a 404 instead of reaching any origin.
//
// Expected Host header shape: <tenant-id>.dillinger.<domain>
// KeyValueStore entries: key = tenant-id, value = Function URL domain
// (e.g. "abc123xyz.lambda-url.us-east-1.on.aws", no scheme/path).

import cf from "cloudfront";

const kvsHandle = cf.kvs();

function notFound(message) {
  return {
    statusCode: 404,
    statusDescription: "Not Found",
    headers: {
      "content-type": { value: "text/plain" },
    },
    body: {
      encoding: "text",
      data: message,
    },
  };
}

async function handler(event) {
  const request = event.request;
  const hostHeader = request.headers.host;

  if (!hostHeader || !hostHeader.value) {
    return notFound("Missing Host header");
  }

  const tenantId = hostHeader.value.split(".")[0];
  if (!tenantId) {
    return notFound("Could not determine tenant from Host header");
  }

  let tenantOrigin;
  try {
    tenantOrigin = await kvsHandle.get(tenantId);
  } catch (err) {
    return notFound(`Unknown tenant: ${tenantId}`);
  }

  request.origin = {
    custom: {
      domainName: tenantOrigin,
      port: 443,
      protocol: "https",
      path: "",
      sslProtocols: ["TLSv1.2"],
      readTimeout: 30,
      keepaliveTimeout: 5,
      customHeaders: {},
    },
  };
  request.headers.host = { value: tenantOrigin };

  return request;
}
