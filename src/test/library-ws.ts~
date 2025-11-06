import { App, serve } from '../lib/library-ws.js';

import STATUS from 'http-status';

import supertest from 'supertest';


import { LibraryDao, LendingLibrary, makeLendingLibrary, Lib }
  from 'lending-library';
import { MemDao, makeMemDao } from './mem-dao.js';

import { BOOKS, } from './test-data.js';

import { assert, expect } from 'chai';


//use assert(result.isOk === true) and assert(result.isOk === false)
//to ensure that typescript narrows result correctly

const BASE = '/api';

describe('lending library web services', () => {

  let memDao : MemDao;
  let ws: ReturnType<typeof supertest>;
  
  beforeEach(async function () {
    const daoResult = await makeMemDao();
    assert(daoResult.isOk === true);
    memDao = daoResult.val;
    const libraryResult = await makeLendingLibrary(memDao.dao);
    assert(libraryResult.isOk === true);
    const library = libraryResult.val;
    const app: App = serve(library, { base: BASE}).app;
    ws = supertest(app);
  });

  //mocha runs this after each test; we use this to clean up the DAO.
  afterEach(async function () {
    await memDao.tearDown();
  });


  describe('Add Book Web Service', () => {

    const NUMERIC_FIELDS = [ 'pages', 'year', 'nCopies' ];

    it('must add valid book', async () => {
      const url = `${BASE}/books`;
      for (const book of BOOKS) {
	const res =
	  await ws.put(url)
	    .set('Content-Type', 'application/json')
	    .send(book);
	expect(res.status).to.equal(STATUS.CREATED);
	expect(res.body?.isOk).to.equal(true);
	const links = res.body?.links;
	expect(links?.self?.method).to.equal('PUT');
	expect(links?.self?.href).to.equal(url);
	expect(res.body.result).to.deep.equal(book);
	expect(res.headers.location).to.equal(`${url}/${book.isbn}`);
      }
    });

    it('must catch missing required fields', async () => {
      const url = `${BASE}/books`;
      const book = BOOKS[0];
      for (const key of Object.keys(book)) {
	if (key === 'nCopies') continue;
	const book1: Record<string, any> = { ...book };
	delete book1[key];
	const res =
	  await ws.put(url)
	    .set('Content-Type', 'application/json')
	    .send(book1);
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors.length).to.be.gt(0);
      }
    });

    it('must catch badly typed numeric fields', async () => {
      const url = `${BASE}/books`;
      const book = BOOKS[0];
      for (const key of NUMERIC_FIELDS) {
	const book1: Record<string, any> = { ...book };
	book1[key] = 'hello';
	const res =
	  await ws.put(url)
	    .set('Content-Type', 'application/json')
	    .send(book1);
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors.length).to.be.gt(0);
      }
    });

    it('must catch nCopies field <= 0', async () => {
      const url = `${BASE}/books`;
      for (const [i, book] of BOOKS.entries()) {
	const book1 = { ...book, nCopies: -i };
	const res =
	  await ws.put(url)
	    .set('Content-Type', 'application/json')
	    .send(book1);
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors.length).to.be.gt(0);
      }
    });


    it('must catch non-integer nCopies field', async () => {
      const url = `${BASE}/books`;
      for (const book of BOOKS) {
	const book1 = { ...book, nCopies: 2.001 };
	const res =
	  await ws.put(url)
	    .set('Content-Type', 'application/json')
	    .send(book1);
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors.length).to.be.gt(0);
      }
    });

    it('must catch badly typed string fields', async () => {
      const url = `${BASE}/books`;
      const book = BOOKS[0];
      for (const key of Object.keys(book)) {
	if (NUMERIC_FIELDS.includes(key) || key === 'authors') continue;
	const book1: Record<string, any> = { ...book };
	book1[key] = 11;
	const res =
	  await ws.put(url)
	    .set('Content-Type', 'application/json')
	    .send(book1);
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors.length).to.be.gt(0);
      }
    });


    it('must catch badly typed authors field', async () => {
      const url = `${BASE}/books`;
      const book = BOOKS[0];
      const book1: Record<string, any> = { ...book };
      book1.authors = 'hello';
      const res =
	await ws.put(url)
	  .set('Content-Type', 'application/json')
	  .send(book1);
      expect(res.status).to.equal(STATUS.BAD_REQUEST);
      expect(res.body?.isOk).to.equal(false);
      expect(res.body.errors.length).to.be.gt(0);
    });

    it('must catch badly typed author', async () => {
      const url = `${BASE}/books`;
      const book = BOOKS[0];
      const book1: Record<string, any> = { ...book };
      book1.authors = ['hello', 22];
      const res =
	await ws.put(url)
	  .set('Content-Type', 'application/json')
	  .send(book1);
      expect(res.status).to.equal(STATUS.BAD_REQUEST);
      expect(res.body?.isOk).to.equal(false);
      expect(res.body.errors.length).to.be.gt(0);
    });

    it('must catch empty authors', async () => {
      const url = `${BASE}/books`;
      const book = BOOKS[0];
      const book1 = { ...book };
      book1.authors = [];
      const res =
	await ws.put(url)
	  .set('Content-Type', 'application/json')
	  .send(book1);
      expect(res.status).to.equal(STATUS.BAD_REQUEST);
      expect(res.body?.isOk).to.equal(false);
      expect(res.body.errors.length).to.be.gt(0);
    });


  });  //describe('addBooks()', ...)

  describe('Get Book Web Service', async () => {

    beforeEach(async () => {
      await loadAllBooks(ws);
    });

    it('must get a book with specified isbn', async () => {
      const book = BOOKS[BOOKS.length/2];
      const isbn = book.isbn;
      const url = `${BASE}/books/${isbn}`;
      const res = await ws.get(url);
      expect(res.status).to.equal(STATUS.OK);
      expect(res.body.isOk).to.equal(true);
      expect(res.body.result).to.deep.equal(book);
    });
    
    it('must get a 404 for a book having a bad isbn', async () => {
      const isbn = 'xxx';
      const url = `${BASE}/books/${isbn}`;
      const res = await ws.get(url);
      expect(res.status).to.equal(STATUS.NOT_FOUND);
      expect(res.body.isOk).to.equal(false);
    });

    it('must retrieve an added book from its Location header', async () => {
      const url = `${BASE}/books`;
      const book = BOOKS[0];
      const res1 =
	await ws.put(url)
	  .set('Content-Type', 'application/json')
	  .send(book);
      expect(res1.status).to.equal(STATUS.CREATED);
      expect(res1.body?.isOk).to.equal(true);
      const isbn = res1.body.result.isbn;
      expect(isbn).to.equal(book.isbn);
      const loc = res1.headers.location;
      expect(loc).to.equal(`${url}/${isbn}`);
      const res2 = await ws.get(loc);
      expect(res2.status).to.equal(STATUS.OK);
      expect(res2.body?.isOk).to.equal(true);
      const book1 = { ...book, nCopies: 2 * book.nCopies };
      expect(res2.body.result).to.deep.equal(book1);
    });
    
  });
  
  describe('Clear Web Service', async () => {

    beforeEach(async () => {
      await loadAllBooks(ws);
    });

    it('must clear out all data', async () => {
      const book = BOOKS[0];
      const isbn = book.isbn;
      const url = `${BASE}/books/${isbn}`;
      const res1 = await ws.get(url);
      expect(res1.status).to.equal(STATUS.OK);
      expect(res1.body.isOk).to.equal(true);
      const res2 = await ws.delete(BASE);
      expect(res1.status).to.equal(STATUS.OK);
      expect(res1.body.isOk).to.equal(true);
      const res3 = await ws.get(url);
      expect(res3.status).to.equal(STATUS.NOT_FOUND);
      expect(res3.body.isOk).to.equal(false);
    });
    
  });
  
  describe('Find Books Web Service', async () => {

    beforeEach(async () => {
      await loadAllBooks(ws);
    });

    it('must error on a missing search string error', async () => {
      const url = `${BASE}/books`;
      const res = await ws.get(url);
      expect(res.status).to.equal(STATUS.BAD_REQUEST);
      expect(res.body?.isOk).to.equal(false);
      expect(res.body.errors.length).to.be.gt(0);
    });
	       
    it('must error on an empty search string error', async () => {
      const url = urlString(`${BASE}/books`, { search: '     '});
      const res = await ws.get(url);
      expect(res.status).to.equal(STATUS.BAD_REQUEST);
      expect(res.body?.isOk).to.equal(false);
      expect(res.body.errors.length).to.be.gt(0);
    });
	       
    it('must error on a search string without any words error', async () => {
      const search = 'a #b  ';
      const url = urlString(`${BASE}/books`, { search });
      const res = await ws.get(url);
      expect(res.status).to.equal(STATUS.BAD_REQUEST);
      expect(res.body?.isOk).to.equal(false);
      expect(res.body.errors.length).to.be.gt(0);
    });

    it('must error on a search field with bad index/count', async () => {
      const search = 'hello';
      for (const k of [ 'index', 'count' ]) {
	for (const v of [ 'xx', -2]) {
	  const url = urlString(`${BASE}/books`, { search, [k]: v});
	  const res = await ws.get(url);
	  expect(res.status).to.equal(STATUS.BAD_REQUEST);
	  expect(res.body?.isOk).to.equal(false);
	  expect(res.body.errors.length).to.be.gt(0);
	}
      }
    });

    it('must find all results', async () => {
      const count = 9999;
      for (const lang of [ 'javascript', 'ruby', 'scala' ]) {
	const url = urlString(`${BASE}/books`, { search: lang, count });
	const res = await ws.get(url);
	expect(res.status).to.equal(STATUS.OK);
	expect(res.body?.isOk).to.equal(true);	
	expect(res.body.result).to.have.length(LANG_BOOKS[lang].length);
	const expected = LANG_BOOKS[lang].map(b => ({nCopies: 1, ...b}));
	const result: Record<string, any>[] = res.body.result;
	expect(result.map(r => r.result)).to.deep.equal(expected);
      }
    });
	       
    it('must find multiple results', async () => {
      const count = 9999;
      const search = 'a #definitive ';
      const url = urlString(`${BASE}/books`, { search, count });
      const res = await ws.get(url);
      expect(res.status).to.equal(STATUS.OK);
      expect(res.body?.isOk).to.equal(true);	
      const expected = BOOKS
	.filter(b => b.title.match(/definitive/i))
	.sort((b1, b2) => b1.title.localeCompare(b2.title))
        .map(b => ({ nCopies: 1, ...b }));
      const result: Record<string, any>[] = res.body.result;
      expect(result.map(r => r.result)).to.deep.equal(expected);
    });

    it('must find results for multi-word searches', async () => {
      const count = 9999;
      const search = 'a #definitive @JAVASCRIPT';
      const url = urlString(`${BASE}/books`, { search, count });
      const res = await ws.get(url);
      expect(res.status).to.equal(STATUS.OK);
      expect(res.body?.isOk).to.equal(true);	
      const expected = BOOKS
	.filter(b => b.title.match(/definitive/i))
	.filter(b => b.title.match(/javascript/i))
	.sort((b1, b2) => b1.title.localeCompare(b2.title))
        .map(b => ({ nCopies: 1, ...b }));
      const result: Record<string, any>[] = res.body.result;
      expect(result.map(r => r.result)).to.deep.equal(expected);
    });

    it('must find a subsequence of JavaScript books', async () => {
      const js = 'javascript';
      const [index, count] = [2, 4];
      const url = urlString(`${BASE}/books`, { search: js, index, count });
      const res = await ws.get(url);
      expect(res.status).to.equal(STATUS.OK);
      expect(res.body?.isOk).to.equal(true);	
      const jsBooks = BOOKS.filter(b => b.title.toLowerCase().indexOf(js) >= 0)
	.sort((b1, b2) => b1.title.localeCompare(b2.title))
	.slice(index, index + count);
      const result: Record<string, any>[] = res.body.result;
      const foundBooks = result.map(r => r.result);
      expect(foundBooks.length).to.be.lte(count);
      expect(foundBooks).to.deep.equal(jsBooks);
    });

    it('must find no results', async () => {
      const search = 'a #definitive1 ';
      const url = urlString(`${BASE}/books`, { search });
      const res = await ws.get(url);
      expect(res.status).to.equal(STATUS.OK);
      expect(res.body?.isOk).to.equal(true);
      expect(res.body.result).to.have.length(0);
    });
    
  });

  describe('Checkout Book Web Service with empty library', async () => {

    it('must error on missing field', async () => {
      for (const f of [ 'isbn', 'patronId' ]) {
	const v = (f === 'isnb') ? BOOKS[0].isbn : PATRONS[0];
	const req = { [f]: v };
	const res = await ws.put(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send(req);
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors.length).to.be.gt(0);
      }
    });


    it('must error on bad book', async () => {
      const [ patronId, isbn ] = [ PATRONS[0], BOOKS[0].isbn ];
      const res = await ws.put(`${BASE}/lendings`)
	.set('Content-Type', 'application/json')
	.send( { patronId, isbn });
      expect(res.status).to.equal(STATUS.BAD_REQUEST);
      expect(res.body?.isOk).to.equal(false);
      expect(res.body.errors.length).to.be.gt(0);
    });

  });    

  describe('Checkout Book Web Service with populated library', async () => {
    
    beforeEach(async () => {
      await loadAllBooks(ws);
    });

    it('must allow checkout of multiple books by same patron', async () => {
      for (const book of BOOKS) {
	const [ patronId, isbn ] = [ PATRONS[0], book.isbn ];
	const res = await ws.put(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res.status).to.equal(STATUS.OK);
	expect(res.body?.isOk).to.equal(true);
      }
    });

    it('must error on repeated checkout of same book by same patron', async () => {
      const [ patronId, isbn ] = [ PATRONS[0], BOOK_nCopies2.isbn ];
      const res1 = await ws.put(`${BASE}/lendings`)
	.set('Content-Type', 'application/json')
	.send( { patronId, isbn });
      expect(res1.status).to.equal(STATUS.OK);
      expect(res1.body?.isOk).to.equal(true);
      const res2 = await ws.put(`${BASE}/lendings`)
	.set('Content-Type', 'application/json')
	.send( { patronId, isbn });
      expect(res2.status).to.equal(STATUS.BAD_REQUEST);
      expect(res2.body?.isOk).to.equal(false);
      expect(res2.body?.errors).to.have.length.gt(0);
    });

    it('must error on exhausting all copies of a book', async () => {
      const isbn = BOOK_nCopies2.isbn;
      for (const [i, patronId] of PATRONS.entries()) {
	const res1 = await ws.put(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	assert(res1.body?.isOk === i < 2, `copy ${i} checkout ${i < 2}`);
      }
    });

  });

  describe('Checkout and Return Book Web Services', async () => {

    beforeEach(async () => {
      await loadAllBooks(ws);
    });


    it('must allow checkout/return of single book by same patron', async () => {
      for (const book of BOOKS) {
	const [ patronId, isbn ] = [ PATRONS[0], book.isbn ];
	const res1 = await ws.put(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
	const res2 = await ws.delete(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
      }
    });

    it('must allow checkout/return of many books by same patron', async () => {
      for (const book of BOOKS) {
	const [ patronId, isbn ] = [ PATRONS[0], book.isbn ];
	const res1 = await ws.put(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
      }
      for (const book of BOOKS) {
	const [ patronId, isbn ] = [ PATRONS[0], book.isbn ];
	const res1 = await ws.delete(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
      }
    });

    it('must allow any order checkout/return of books by patron', async () => {
      for (const book of BOOKS) {
	const [ patronId, isbn ] = [ PATRONS[0], book.isbn ];
	const res1 = await ws.put(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
      }
      for (const book of BOOKS.toReversed()) {
	const [ patronId, isbn ] = [ PATRONS[0], book.isbn ];
	const res1 = await ws.delete(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
      }
    });
    
    it('must allow checkout/return of books by multiple patrons', async () => {
      for (const [i, book] of BOOKS.entries()) {
	const [ patronId, isbn ] = [ PATRONS[i%PATRONS.length], book.isbn ];
	const res1 = await ws.put(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
      }
      for (const [i, book]  of BOOKS.entries()) {
	const [ patronId, isbn ] = [ PATRONS[i%PATRONS.length], book.isbn ];
	const res1 = await ws.delete(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
      }
    });
    
    it('must not allow return of books by different patrons', async () => {
      for (const [i, book] of BOOKS.entries()) {
	const [ patronId, isbn ] = [ PATRONS[i%PATRONS.length], book.isbn ];
	const res1 = await ws.put(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
      }
      for (const [i, book]  of BOOKS.entries()) {
	const j = (i + 1)%(PATRONS.length);
	const [ patronId, isbn ] = [ PATRONS[j], book.isbn ];
	const res1 = await ws.delete(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.BAD_REQUEST);
	expect(res1.body?.isOk).to.equal(false);
	expect(res1.body?.errors.length).to.be.gt(0);
      }
    });


    it('must not allow repeated return of books by a patron', async () => {
      for (const book of BOOKS) {
	const [ patronId, isbn ] = [ PATRONS[0], book.isbn ];
	const res1 = await ws.put(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
      }
      for (const book  of BOOKS.toReversed()) {
	const [ patronId, isbn ] = [ PATRONS[0], book.isbn ];
	const res1 = await ws.delete(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res1.status).to.equal(STATUS.OK);
	expect(res1.body?.isOk).to.equal(true);
	const res2 = await ws.delete(`${BASE}/lendings`)
	  .set('Content-Type', 'application/json')
	  .send( { patronId, isbn });
	expect(res2.status).to.equal(STATUS.BAD_REQUEST);
	expect(res2.body?.isOk).to.equal(false);
	expect(res2.body?.errors.length).to.be.gt(0);
      }
    });    
    
  });    

});

function urlString(basePath: string, qParams: Record<string, any>) {
  const url = new URL(`http://example.com/${basePath}`);
  for (const [k, v] of Object.entries(qParams)) {
    url.searchParams.set(k, String(v));
  }
  return `${url.pathname.slice(1)}${url.search}`;
}

async function loadAllBooks(ws: ReturnType<typeof supertest>) {
  const url = `${BASE}/books`;
  for (const book of BOOKS) {
    const res =
      await ws.put(url)
	.set('Content-Type', 'application/json')
	.send(book);
    expect(res.status).to.equal(STATUS.CREATED);
    expect(res.body?.isOk).to.equal(true);
  }
}

const PATRONS = [ 'joe', 'sue', 'ann' ];


function findLangBooks(books: (typeof BOOKS[0])[], lang: string) {
  return books.filter(b => b.title.toLowerCase().includes(lang))!
    .sort((b1, b2) => b1.title.localeCompare(b2.title));
}

const LANG_BOOKS: Record<string, (typeof BOOKS[0])[]> = {
  javascript: findLangBooks(BOOKS, 'javascript'),
  ruby: findLangBooks(BOOKS, 'ruby'),
  scala: findLangBooks(BOOKS, 'scala'),
}

const BOOK_nCopies1 = BOOKS.find(b => b.nCopies === 1)!;
const BOOK_nCopies2 = BOOKS.find(b => b.nCopies === 2)!;
const BOOK_nCopies3 = BOOKS.find(b => b.nCopies === 3)!;

assert(BOOK_nCopies1, 'no book with # of copies === 1');
assert(BOOK_nCopies2, 'no book with # of copies === 2');
assert(BOOK_nCopies3, 'no book with # of copies === 3');

