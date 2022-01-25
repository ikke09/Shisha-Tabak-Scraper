const cheerio = require('cheerio');
const axios = require("axios");
const Tobacco = require('./tobacco');

const nameWithAmountAndUnitRegExp = new RegExp('(.+) (\\d+)(g|ml|kg)', 'gi');

const tobaccoOverviewRequestOptions = {
    url: '/tabak',
    method: 'get', // default
    baseURL: 'https://shisha-world.com',
    params: {
        n: 160,
    },
    responseType: 'document',
    responseEncoding: 'utf8'
}

const loadTobaccoCount = async () => {
    try {
        const response = await axios(tobaccoOverviewRequestOptions);
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

const loadTobaccoLinksOnPage = (pageHtml) => {
    const $ = cheerio.load(pageHtml);
    const products = $('a.product--title').toArray();
    return products.map(element => $(element).attr('href'));
}

const loadAllTobaccoLinks = async(maxPages) => {
    const productLinks = [];
    for(let page = 1; page <= maxPages; page++) {
        const tobaccoOverviewPagedRequestOptions = {...tobaccoOverviewRequestOptions, ...{params: {p: page}}};
        const response = await axios(tobaccoOverviewPagedRequestOptions);
        const productsOnPage = loadTobaccoLinksOnPage(response.data);
        productLinks.push(...productsOnPage);
    }
    return productLinks;
}

const loadTobacco = async(productLink) => {
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
        return new Tobacco(
            producer,
            name,
            [],
            type,
            Number(amount), 
            unit,
            0.0,
            "EUR",
            productLink
        );
    } catch (error) {
        return {
            url: productLink,
            msg: error.message || 'Failed to load Details',
        };
    }
}

const loadAllTobaccos = async(links) => {
    return await Promise.all(links.map(async(link) => await loadTobacco(link)));
}

module.exports = {
    loadAllTobaccos,
    loadAllTobaccoLinks,
    loadTobaccoCount
}