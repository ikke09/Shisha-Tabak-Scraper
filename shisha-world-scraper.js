const cheerio = require('cheerio');
const axios = require("axios");
const Tobacco = require('./tobacco');
const PageInfo = require('./page-info');

const baseURL = 'https://www.shisha-world.com';
const tobaccoOverviewRequestOptions = {
    url: '/shisha-tabak',
    method: 'get',
    baseURL,
    params: {
        n: 160,
        p: 1,
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
        return new PageInfo(
            maxCount,
            amountPerPage,
            pageCount
        );
    } catch (error) {
        console.error(error);
    }
}

const loadTobaccoLinksOnPage = (page) => {
    const $ = cheerio.load(page);
    const products = $('a.product--title').toArray();
    return products.map(element => {
        const uri = $(element).attr('href');
        const path = uri.replace(baseURL, '');
        return path;
    });
}

const loadAllTobaccoLinks = async(maxPages) => {
    const productLinks = [];
    for(let page = 1; page <= maxPages; page++) {
        const tobaccoOverviewPagedRequestOptions = {...tobaccoOverviewRequestOptions};
        tobaccoOverviewPagedRequestOptions.params.p = page;
        
        const response = await axios(tobaccoOverviewPagedRequestOptions);
        const productsOnPage = loadTobaccoLinksOnPage(response.data);
        productLinks.push(...productsOnPage);
    }
    return productLinks;
}

const loadTobacco = async(productLink) => {
    try {
        
        const detailRequestOptions = {
            ...tobaccoOverviewRequestOptions, 
            url: productLink, 
            params: {}
        };

        const response = await axios(detailRequestOptions);
        const $ = cheerio.load(response.data);
        
        const amountWithUnit = $('td.product--properties-label:contains("Inhalt")').next().text();
        const {1: amount, 2: unit } = amountWithUnit.split(new RegExp('(\\d+)', 'g'));

        const ean = $('td.product--properties-label:contains("EAN")').next().text();

        const tastesString = $('td.product--properties-label:contains("Aroma")').next().text();
        const tastes = tastesString.split(',').map(t => t.trim());

        const priceWithCurrency = $('span.price--content').text().trim();
        const {0: price, 2: currency} = priceWithCurrency.split(new RegExp('(\\s)','g'));

        let title = $('h1.product--title').text().trim();
        const categoryElement = $("span[itemprop='category']");
        let type = 'Shisha Tabak';
        if(categoryElement){
            const category = categoryElement.attr('content');
            type = category.substring(category.lastIndexOf('>')+1).trim();
        }
        let producerElement = $("span[itemprop='manufacturer']");
        let producer = '';
        let name = '';
        const itemsToFindTobaccoName = [amount, unit, ...type.split(' '), '-', ',', ';'];
        if(producerElement) {
            producer = producerElement.attr('content').trim();
            itemsToFindTobaccoName.push(producer);
            itemsToFindTobaccoName.forEach(s => title = title.replace(s, ''));
            name = title.trim();
        } else {
            itemsToFindTobaccoName.forEach(s => title = title.replace(s, ''));
            const producerAndName = title.split(' ');
            producer = producerAndName[0];
            name = producerAndName[1];
        }

        return new Tobacco(
            producer,
            name,
            tastes,
            type,
            Number(amount), 
            unit,
            Number(price.replace(',', '.')),
            currency,
            baseURL + productLink,
            ean
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