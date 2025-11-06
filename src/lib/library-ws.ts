import cors from 'cors';
import Express from 'express';
import bodyparser from 'body-parser';
import assert from 'assert';
import STATUS from 'http-status';

import { Lib, LendingLibrary, } from 'lending-library';
import { Errors } from 'cs544-js-utils';
import { DEFAULT_INDEX, DEFAULT_COUNT } from './params.js';

import { Link, SelfLinks, NavLinks,
	 SuccessEnvelope, PagedEnvelope, ErrorEnvelope }
  from './response-envelopes.js';

type RequestWithQuery = Express.Request
  & { query: { [_: string]: string|string[]|number } };

export type App = Express.Application;

type ServeRet = {
  app: App,
  close: () => void,
};

type SERVER_OPTIONS = {
  base?: string,
};

export function serve(model: LendingLibrary, options: SERVER_OPTIONS={})
  : ServeRet
{
  const app = Express();
  app.locals.model = model;
  const { base = '/api',  } = options;
  app.locals.base = base;
  setupRoutes(app);
  const close = () => app.locals.sessions.close();
  return { app, close };
}


function setupRoutes(app: Express.Application) {
  const base = app.locals.base;

  //allow cross-origin resource sharing
  app.use(cors(CORS_OPTIONS));

  //assume that all request bodies are parsed as JSON
  app.use(Express.json());

  //if uncommented, all requests are traced on the console
  //app.use(doTrace(app));
  
  //set up application routes
  //TODO: set up application routes
 // Add-Book: PUT {BASE}/books
  app.put(`${base}/books`, async (req: Express.Request, res: Express.Response): Promise<void> => {
    try {
      // forward the request body to the domain model
      const addBookResult = await req.app.locals.model.addBook(req.body);

      // if the model returned an error Result, throw to be handled below
      if (!addBookResult.isOk) throw addBookResult;

      // on success, get the created/updated book
      const book = addBookResult.val;

      // current route + /{isbn}
      res.set('Location', selfHref(req, book.isbn));

      // 201 Created with standard success envelope
      res.status(STATUS.CREATED).json(selfResult(req, book));
    } catch (err) {
      // map model Result (or unexpected error) to an HTTP error envelope
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  });
  
// Get-Book: GET {BASE}/books/:isbn
  app.get(`${base}/books/:isbn`, async (req: Express.Request, res: Express.Response): Promise<void> => {
    try {
      // extract isbn from route parameters
      const { isbn } = req.params;

      // delegate to domain model to fetch book
      const getBookResult = await req.app.locals.model.getBook(isbn);

      // domain error from model
      if (!getBookResult.isOk) {
        throw getBookResult;
      }

      // unwrap book value from successful Result
      const book = getBookResult.val;

      // no book found - 404 error envelope
      if (!book) {
        const errResult = new Errors.ErrResult([
          new Errors.Err(`no book found with isbn ${isbn}`, { code: 'NOT_FOUND' }),
        ]);

        const mapped = mapResultErrors(errResult);
        res.status(mapped.status).json(mapped);
        return;
      }

      // success - standard success envelope
      res.status(STATUS.OK).json(selfResult(req, book));
    } catch (err) {
      // map model Result (or unexpected error) to an HTTP error envelope
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  });

  // Find-Books: GET {BASE}/books?search=SEARCH&index=INDEX&count=COUNT
app.get(`${base}/books`, async (req: Express.Request, res: Express.Response): Promise<void> => {
  try {
    
    const model: LendingLibrary = req.app.locals.model;

    // Extract query parameters
    const search = String(req.query.search ?? '');
    const index = Number(req.query.index ?? DEFAULT_INDEX);
    const count = Number(req.query.count ?? DEFAULT_COUNT);

    // Validate index and count
    if (index < 0 || count < 0 || !Number.isInteger(index) || !Number.isInteger(count)) {
      const errorResult = Errors.errResult('index and count must be non-negative integers', 'BAD_REQ');
      throw errorResult;
    }

    // Prepare the find request object with ALL parameters
    const findRequest = {
      search: search,
      index: index,
      count: count + 1  // Request one more to check if there's a next page
    };

    // Call findBooks with the complete request object
    const findResult = await model.findBooks(findRequest);
    if (!findResult.isOk) throw findResult;

    const books = findResult.val;

    // Use the pagedResult utility function with the actual results
    const envelope = pagedResult(req, 'isbn' as keyof Lib.XBook, books);
    res.status(envelope.status).json(envelope);
  } catch (err) {
    const mapped = mapResultErrors(err);
    res.status(mapped.status).json(mapped);
  }
});


 //must be last
  app.use(do404(app));  //custom handler for page not found
  app.use(doErrors(app)); //custom handler for internal errors
}

//TODO: set up route handlers


/** log request on stdout */
function doTrace(app: Express.Application) {
  return (async function(req: Express.Request, res: Express.Response, 
			 next: Express.NextFunction) {
    console.log(req.method, req.originalUrl, req.body ?? {});
    next();
  });
}

/** Default handler for when there is no route for a particular method
 *  and path.
 */
function do404(app: Express.Application) {
  return async function(req: Express.Request, res: Express.Response) {
    const message = `${req.method} not supported for ${req.originalUrl}`;
    const result = {
      status: STATUS.NOT_FOUND,
      errors: [	{ options: { code: 'NOT_FOUND' }, message, }, ],
    };
    res.status(404).json(result);
  };
}

/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */ 
function doErrors(app: Express.Application) {
  return async function(err: Error, req: Express.Request, res: Express.Response,
			next: Express.NextFunction) {
    const message = err.message ?? err.toString();
    const [status, code] = (err instanceof SyntaxError)
      ? [STATUS.BAD_REQUEST, 'SYNTAX' ]
      : [STATUS.INTERNAL_SERVER_ERROR, 'INTERNAL'];
    const result = {
      status: STATUS[status],
      errors: [ { options: { code }, message } ],
    };
    res.status(status).json(result);
    if (status === STATUS.INTERNAL_SERVER_ERROR) console.error(result.errors);
  };
}



/************************* HATEOAS Utilities ***************************/

/** Return original URL for req */
function requestUrl(req: Express.Request) {
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
}

/** Return path for req.  If id specified extend with /id, otherwise add in
 *  any query params. 
 */
function selfHref(req: Express.Request, id: string = '') {
  const url = new URL(requestUrl(req));
  return url.pathname + (id ? `/${id}` : url.search);
}

/** Produce paging link for next (dir === 1), prev (dir === -1)
 *  for req having nResults results.  Return undefined if there
 *  is no such link.  Note that no next link is produced if
 *  nResults <= req.query.count.
 */
function pageLink(req: Express.Request, nResults: number, dir: 1|-1) {
  const url = new URL(requestUrl(req));
  const count = Number(req.query?.count ?? DEFAULT_COUNT);
  const index0 = Number(url.searchParams.get('index') ?? 0);
  if (dir > 0 ? nResults <= count : index0 <= 0) return undefined;
  const index = dir > 0 ? index0 + count : count > index0 ? 0 : index0 - count;
  url.searchParams.set('index', String(index));
  url.searchParams.set('count', String(count));
  return url.pathname + url.search;
}

/** Return a success envelope for a single result. */
function selfResult<T>(req: Express.Request, result: T,
		       status: number = STATUS.OK)
  : SuccessEnvelope<T>
{
  const method = req.method;
  return { isOk: true,
	   status,
	   links: { self: { rel: 'self', href: selfHref(req), method } },
	   result,
	 };
}


/** Return a paged envelope for multiple results for type T. 
 *  No next link is produced if results.length <= req.query.count
 *  (this will be correct, if results[] was requested for count + 1).
 */
function pagedResult<T>(req: Express.Request, idKey: keyof T, results: T[])
  : PagedEnvelope<T>
{
  const nResults = results.length;
  const result = //(T & {links: { self: string } })[]  =
    results.map(r => {
      const selfLinks : SelfLinks =
      { self: { rel: 'self', href: selfHref(req, r[idKey] as string),
		method: 'GET' } };
	return { result: r, links: selfLinks };
    });
  const links: NavLinks =
    { self: { rel: 'self', href: selfHref(req), method: 'GET' } };
  const next = pageLink(req, nResults, +1);
  if (next) links.next = { rel: 'next', href: next, method: 'GET', };
  const prev = pageLink(req, nResults, -1);
  if (prev) links.prev = { rel: 'prev', href: prev, method: 'GET', };
  const count = req.query.count ? Number(req.query.count) : DEFAULT_COUNT;
  return { isOk: true, status: STATUS.OK, links,
	   result: result.slice(0, count), };
}
 
/*************************** Mapping Errors ****************************/

//map from domain errors to HTTP status codes.  If not mentioned in
//this map, an unknown error will have HTTP status BAD_REQUEST.
const ERROR_MAP: { [code: string]: number } = {
  EXISTS: STATUS.CONFLICT,
  NOT_FOUND: STATUS.NOT_FOUND,
  BAD_REQ: STATUS.BAD_REQUEST,
  AUTH: STATUS.UNAUTHORIZED,
  DB: STATUS.INTERNAL_SERVER_ERROR,
  INTERNAL: STATUS.INTERNAL_SERVER_ERROR,
}

/** Return first status corresponding to first options.code in
 *  errors, but INTERNAL_SERVER_ERROR dominates other statuses.  Returns
 *  BAD_REQUEST if no code found.
 */
function getHttpStatus(errors: Errors.Err[]) : number {
  let status: number = 0;
  for (const err of errors) {
    if (err instanceof Errors.Err) {
      const code = err?.options?.code;
      const errStatus = (code !== undefined) ? ERROR_MAP[code] : -1;
      if (errStatus > 0 && status === 0) status = errStatus;
      if (errStatus === STATUS.INTERNAL_SERVER_ERROR) status = errStatus;
    }
  }
  return status !== 0 ? status : STATUS.BAD_REQUEST;
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapResultErrors(err: any) : ErrorEnvelope {
  const errors = err instanceof Errors.ErrResult
    ? err.errors
    : [ new Errors.Err(err.message ?? err.toString(), {code: 'UNKNOWN'}), ];
  const status = getHttpStatus(errors);
  if (status === STATUS.INTERNAL_SERVER_ERROR)  console.error(errors);
  return { isOk: false, status, errors, };
} 

/**************************** CORS Options *****************************/

/** options which affect whether cross-origin (different scheme, domain or port)
 *  requests are allowed
 */
const CORS_OPTIONS = {
  //if localhost origin, reflect back in Access-Control-Allow-Origin res hdr
  // origin: /localhost:\d{4}/,
  
  // simple reflect req origin hdr back to Access-Control-Allow-Origin res hdr
  origin: true,

  //methods allowed for cross-origin requests
  methods: [ 'GET', 'PUT', ],

  //request headers allowed on cross-origin requests
  //used to allow JSON content
  allowedHeaders: [ 'Content-Type', ],

  //response headers exposed to cross-origin requests
  exposedHeaders: [  'Location', 'Content-Type', ],
};



