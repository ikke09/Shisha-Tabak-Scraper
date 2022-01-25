class Tobacco {

    constructor(
        producer,
        name,
        tastes,
        type,
        amount, 
        unit,
        price,
        currency,
        url,
        ean
    ) {
        this.producer = producer;
        this.name = name;
        this.tastes = tastes;
        this.type = type;
        this.amount = amount;
        this.unit = unit || "g";
        this.price = price;
        this.currency = currency || "€";
        this.source = url;
        this.ean = ean;
    }

    toString() {
        return `${this.producer} - ${this.name}`;
    }

}

module.exports = Tobacco;