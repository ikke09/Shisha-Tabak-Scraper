const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const nameWithAmountAndUnitRegExp = new RegExp('(.+) (\\d+)(g|ml|kg)', 'gi');

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

const loadProductDetails = async(productLink) => {
    try {
        const response = await axios.get(productLink, {
            responseType: 'document',
            responseEncoding: 'utf8'
        });
        const $ = cheerio.load(response.data);
        const fullTitle = $('h1.product--title').text().trim();
        const producer = $("span[itemprop='manufacturer']").attr('content').trim();
        const category = $("span[itemprop='category']").attr('content')
        const type = category.substring(category.lastIndexOf('>')+1).trim();
        const title = fullTitle.replaceAll(new RegExp([producer, ...type.split(" ")].join("|"), "gi"), "").trim();
        const {1: name, 2: amount, 3: unit} = [...title.matchAll(nameWithAmountAndUnitRegExp)][0];
        const res = {
            producer,
            name: String(name), 
            type,
            amount: Number(amount), 
            unit,
            url: productLink
        };
        return res;
    } catch (error) {
        return {
            url: productLink,
            msg: error.message || 'Failed to load Details',
        };
    }
}

const scrape = async () => {
    const {pageCount, maxCount} = await loadProductCount();
    const productLinks = await loadAllProductLinks(pageCount);
    const products = await Promise.all(productLinks.map(async(link) => await loadProductDetails(link)));
    const successCount = products.filter(p => !p.msg).length;
    fs.writeFile('./tobaccos.json', JSON.stringify(products), 'utf8', (err) => {
        if (err) {
            console.log(`Error writing file: ${err}`);
        }
    });
    console.log(`Loading products done. ${successCount}/${maxCount} successfull!`);
}

scrape();