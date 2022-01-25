const axios = require('axios');
const cheerio = require('cheerio');
const Tobacco = require('./tobacco');

const tobaccoOverviewPageRequestOptions = {
    url: '/navi.php',
    method: 'get', // default
    baseURL: 'https://www.shisha-deluxe.de',
    params: {
        k: 2422,
        Sortierung: 1,
        af: 90
    },
    responseType: 'document',
    responseEncoding: 'utf8',
    headers: {
        'X-Requested-With': 'XMLHttpRequest'
    },
    withCredentials: true,
};

const loadTobaccoCount = async () => {
    try {
        const response = await axios(tobaccoOverviewPageRequestOptions)
        let responseCookie = response.headers['set-cookie'][0];
        responseCookie = responseCookie.substring(0, responseCookie.indexOf(';'));
        // save headers from response in order to preserve sorting and products per page
        tobaccoOverviewPageRequestOptions.headers = {
            ...tobaccoOverviewPageRequestOptions.headers,
            Cookie: responseCookie
        };
        const $ = cheerio.load(response.data);
        const numRegEx = new RegExp('\\d+', 'g');
        const pageInfoStr = $('.page-current').text().trim();
        const {
            1: pages
        } = [...pageInfoStr.matchAll(numRegEx)];
        const maxCountInfoStr = $('.page-total').text().trim();
        const {
            1: perPage,
            2: maxCount
        } = [...maxCountInfoStr.matchAll(numRegEx)];
        const res = {
            productCount: Number(maxCount[0]),
            amountPerPage: Number(perPage[0]),
            pageCount: Number(pages[0])
        }
        return res;
    } catch (error) {
        console.error(error);
    }
}

const loadTobaccoLinksOnPage = (pageHtml) => {
    const $ = cheerio.load(pageHtml);
    const products = $('a.image-wrapper').toArray();
    return products.map(element => $(element).attr('href'));
}

const loadAllTobaccoLinks = async (maxPages) => {
    const productLinks = [];
    for (let page = 1; page <= maxPages; page++) {
        const pageRequestOptions = {
            ...tobaccoOverviewPageRequestOptions,
            url: `/Shisha-Tabak_s${page}`,
        };
        const response = await axios(pageRequestOptions);
        const productsOnPage = loadTobaccoLinksOnPage(response.data);
        productLinks.push(...productsOnPage);
    }
    return productLinks;
}

const loadTobacco = async (productLink) => {
    try {
        const detailRequestOptions = {
            ...tobaccoOverviewPageRequestOptions,
            url: `/${productLink}`,
            params: {},
        };
        const response = await axios(detailRequestOptions);
        const $ = cheerio.load(response.data);
        const {
            0: amount,
            1: unit
        } = $('td:contains("Inhalt")').next().text().split(' ');
        const tastes = $('td:contains("Geschmack")')
            .next()
            .find('a')
            .toArray()
            .map(node => $(node).attr('href').trim());
        const name = $('li:contains("Sorte")').text().trim().replace('Sorte:', '');
        const price = $('meta[itemprop=price]').attr('content');
        const currency = $('meta[itemprop=priceCurrency]').attr('content');

        let producer = $('div.manufacturer-row>a').attr('href');
        if (!producer) {
            let title = $('h1.product-title').text().trim();
            [amount, unit, name, '-', ',', ';']
            .forEach(s => title = title.replace(s, ''));
            producer = title.trim();
        } else {
            producer = producer.trim().replace('-', ' ');
        }
        const type = $('a[itemprop=category]').text().trim();
        return new Tobacco(
            producer,
            name,
            tastes,
            type,
            Number(amount),
            unit,
            Number(price),
            currency,
            `${detailRequestOptions.baseURL}/${productLink}`
        );
    } catch (error) {
        return {
            url: productLink,
            msg: error.message || 'Failed to load Details',
        };
    }
}

const loadAllTobaccos = async (links) => {
    return await Promise.all(
        links.map(async (link) => await loadTobacco(link)));
}

module.exports = {
    loadTobaccoCount,
    loadAllTobaccoLinks,
    loadAllTobaccos
};