import { App, serve } from '../lib/library-ws.js';

import STATUS from 'http-status';

import supertest from 'supertest';

import * as TestUtils from './test-utils.js';

import { LibraryDao, LendingLibrary, makeLendingLibrary, Lib }
  from 'lending-library';
import { MemDao, makeMemDao } from './mem-dao.js';

import { BOOKS, } from './test-data.js';

import { assert, expect } from 'chai';


const BASE = '/api';

describe('lending library web services: extra tests', () => {

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

    it('must catch adding book with inconsistent info', async () => {
      const url = `${BASE}/books`;
      const book1: Record<string, any> = { ...BOOKS[0], };
      const res1 =
	await ws.put(url)
	  .set('Content-Type', 'application/json')
	  .send(book1);
      expect(res1.status).to.equal(STATUS.CREATED);
      expect(res1.body?.isOk).to.equal(true);
      expect(res1.body.result).to.deep.equal(book1);
      const book2: Record<string, any> = { ...BOOKS[0], title: 'xxx', };
      const res2 =
	await ws.put(url)
	  .set('Content-Type', 'application/json')
	  .send(book2);
      expect(res2.status).to.equal(STATUS.BAD_REQUEST);
      expect(res2.body?.isOk).to.equal(false);
      expect(res2.body.errors.length).to.be.gt(0);
    });

    it('must catch non-integer numeric fields', async () => {
      const url = `${BASE}/books`;
      const book = BOOKS[0];
      for (const key of NUMERIC_FIELDS) {
	const val = book[key] as number;
	const book1: Record<string, any> = { ...book, [key]: val + 0.1, };
	const res =
	  await ws.put(url)
	    .set('Content-Type', 'application/json')
	    .send(book1);
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors.length).to.be.gt(0);
      }
    });

    it('must catch negative numeric fields', async () => {
      const url = `${BASE}/books`;
      const book = BOOKS[0];
      for (const key of NUMERIC_FIELDS) {
	const val = book[key] as number;
	const book1: Record<string, any> = { ...book, [key]: -val, };
	const res =
	  await ws.put(url)
	    .set('Content-Type', 'application/json')
	    .send(book1);
	expect(res.status).to.equal(STATUS.BAD_REQUEST);
	expect(res.body?.isOk).to.equal(false);
	expect(res.body.errors.length).to.be.gt(0);
      }
    });

  });  //describe('addBooks()', ...)

  describe('Find Books Web Service', async () => {

    beforeEach(async () => {
      await loadAllBooks(ws);
    });

    it('must allow paging through results', async () => {
      const links = [];
      let pages = [];
      const count = 3;
      const nPages = 3;
      const search = 'javascript'; //assuming full set of results
      const url = urlString(`${BASE}/books`, { search, count });
      let res = await ws.get(url);
      expect(res.status).to.equal(STATUS.OK);
      expect(res.body?.isOk).to.equal(true);	
      expect(res.body.result.length).to.equal(count);
      pages.push(res.body.result);
      for (let i = 0; i < nPages; i++) {
	//page forward
	const next = TestUtils.relativeUrl(res.body.links.next.href);
	res = await ws.get(next);
	expect(res.status).to.equal(STATUS.OK);
	expect(res.body?.isOk).to.equal(true);	
	expect(res.body.result.length).to.equal(count);
	pages.push(res.body.result);
      }
      for (let i = 0; i < nPages; i++) {
	//page backward
	const prev = TestUtils.relativeUrl(res.body.links.prev.href);
	res = await ws.get(prev);
	expect(res.status).to.equal(STATUS.OK);
	expect(res.body?.isOk).to.equal(true);	
	expect(res.body.result.length).to.equal(count);
	const rmLinks = (linked: Record<string, any>) => linked.result;
	const pageResult = res.body.result.map(rmLinks);
	const earlierPageResult = pages[nPages - i - 1].map(rmLinks);
	//expect(res.body.result).to.deep.equal(pages[nPages - i - 1]);
	expect(pageResult).to.deep.equal(earlierPageResult);
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

