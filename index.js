const fs = require('fs');
//const { loadTobaccoCount, loadAllTobaccoLinks, loadAllTobaccos } = require('./shisha-deluxe-scraper');
const { loadTobaccoCount, loadAllTobaccoLinks, loadAllTobaccos } = require('./shisha-world-scraper');

const writeObjectToJsonFile = (object, fileName) => {
    fs.writeFile(`./${fileName}.json`, JSON.stringify(object), 'utf8', (err) => {
        if (err) {
            console.log(`Error writing file: ${err}`);
        }
    });
}

const scrape = async () => {
    console.time('all-product-links');
    const {
        pageCount,
        productCount
    } = await loadTobaccoCount();
    const productLinks = await loadAllTobaccoLinks(pageCount);
    console.log(`Found ${productLinks.length} links in total`);
    console.timeEnd('all-product-links');
    console.time('all-product-details');
    writeObjectToJsonFile(productLinks, 'shisha-world-links');
    const products = await loadAllTobaccos(productLinks);
    const successCount = products.filter(p => !p.msg).length;
    writeObjectToJsonFile(products, 'shisha-world-tabak');
    console.log(`Loading products done. ${successCount}/${productCount} successfull!`);
    console.timeEnd('all-product-details');
}

scrape();