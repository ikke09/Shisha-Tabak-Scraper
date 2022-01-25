class PageInfo {
    constructor(productCount, amountPerPage, pageCount) {
        this.productCount = productCount;
        this.amountPerPage = amountPerPage; 
        this.pageCount = pageCount;
    }
}

module.exports.default = PageInfo;