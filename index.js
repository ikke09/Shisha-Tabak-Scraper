const axios = require('axios');
const cheerio = require('cheerio');

const loadHTML = async (pageNumber = 1) => {
    try {
        const response = await axios({
            url: '/tabak',
            method: 'get', // default
            baseURL: 'https://shisha-world.com',
            params: {
                p: pageNumber,
                n: 60,
            },
            responseType: 'document',
            responseEncoding: 'utf8'
        })
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

const loadProductCount = async () => {
    try {
        const response = await axios({
            url: '/tabak',
            method: 'get', // default
            baseURL: 'https://shisha-world.com',
            responseType: 'document',
            responseEncoding: 'utf8'
        })
        const $ = cheerio.load(response.data);
        const maxCountElement = $('.number-articles');
        const maxCountString = maxCountElement.text().trim();
        const maxCount = Number(maxCountString.substring(maxCountString.indexOf('(') + 1, maxCountString.lastIndexOf(' ')));
        const amountPerPageElement = $('.per-page--field option:selected');
        const amountPerPage = Number(amountPerPageElement.val());
        const pageCount = Math.ceil(maxCount / amountPerPage);
        const res = {
            maxCount,
            amountPerPage,
            pageCount
        }
        return res;
    } catch (error) {
        console.error(error);
    }
}

const loadProductLinksOnPage = (pageHtml) => {
    const $ = cheerio.load(pageHtml);
    const products = $('a.product--title').toArray();
    return products.map(element => $(element).attr('href'));
}

const loadAllProductLinks = async(maxPages) => {
    const productLinks = [];
    for(let page = 1; page <= maxPages; page++) {
        const pageHtml = await loadHTML(page);
        const productsOnPage = loadProductLinksOnPage(pageHtml);
        productLinks.push(...productsOnPage);
    }
    return productLinks;
}

const scrape = async () => {
    const {pageCount} = await loadProductCount();
    const productLinks = await loadAllProductLinks(pageCount);
}

scrape();