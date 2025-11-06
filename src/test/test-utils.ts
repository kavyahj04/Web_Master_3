/** Return url with protocol, server and port removed */
// necessary since superagent seems to use a different ephemeral port for
// each request; so this function needs to be used to issue requests
// to absolute urls returned in response.
export function relativeUrl(url: string) {
    return url.replace(/http:\/\/[^/:]+:\d+/, '');
}  