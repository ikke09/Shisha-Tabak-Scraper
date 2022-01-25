const fs = require('fs');
const {
    loadAllTobaccos,
    loadAllTobaccoLinks,
    loadTobaccoCount
} = require('./shisha-world-scraper');

const scrape = async () => {
    const {pageCount, maxCount} = await loadTobaccoCount();
    const productLinks = await loadAllTobaccoLinks(pageCount);
    const products = await loadAllTobaccos(productLinks);
    const successCount = products.filter(p => !p.msg).length;
    fs.writeFile('./tobaccos.json', JSON.stringify(products), 'utf8', (err) => {
        if (err) {
            console.log(`Error writing file: ${err}`);
        }
    });
    console.log(`Loading products done. ${successCount}/${maxCount} successfull!`);
}

scrape();