/**
 * Функция для расчета выручки
 * @param purchase запись о покупке — это одна из записей в поле items из чека в data.purchase_records
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // @TODO: Расчет выручки от операции
   const { discount, sale_price, quantity } = purchase;
   const discountFactor =   1 - (purchase.discount / 100);
   return purchase.sale_price * purchase.quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const { profit } = seller; //деструктуризация объекта seller для получения свойства profit.извлекаем значение свойства profit из объекта seller.
    if (index === 0) {
        return (profit * 0.15);//первый
    } else if (index === 1 || index === 2) {
        return (profit * 0.10);//второй или третий
    } else if (index === total - 1) {
        return 0; //последний
    } else { // Для всех остальных
        return (profit * 0.05);
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray (data.products)
        || !Array.isArray (data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    } //проверяем корректность входных данных. метод Array.isArray() возвращает true, если переданный аргумент является массивом, и false в противном случае

    // @TODO: Проверка наличия опций
    const { calculateRevenue, calculateBonus } = options; // Сюда передадим функции для расчётов

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Одна или обе переменные не являются функциями');
    } //проверяем, являются ли переменные функцией

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        first_name: seller.first_name,
        last_name: seller.last_name,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    })); //маппинг по коллекции продавцов - перебрать массив и вернуть данные для каждого элемента . В products_sold будем накапливать количество всех проданных товаров

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = sellerStats.reduce((record, seller) => {
        record[seller.id] = seller;
        return record;
    }, {}); // Ключом будет id, значением — запись из sellerStats

    const productIndex = data.products.reduce((record, product) => {
        record[product.sku] = product;
        return record;
    }, {}); // Ключом будет sku, значением — запись из data.products

    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Чек 
        const seller = sellerIndex[record.seller_id]; // Продавец
        seller.sales_count += 1; // Увеличить количество продаж 
        seller.revenue += record.total_amount; // Увеличить общую сумму всех продаж

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар
            const cost = product.purchase_price * item.quantity// Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
            const revenue = calculateRevenue(item, product); // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            const profit = revenue - cost; // Посчитать прибыль: выручка минус себестоимость
            seller.profit += profit; // Увеличить общую накопленную прибыль (profit) у продавца

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += 1
            // По артикулу товара увеличить его проданное количество у продавца
        });
    });
    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // @TODO: Назначение премий на основе ранжирования
    const total = sellerStats.length;
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, total, seller);// Считаем бонус
        seller.top_products = Object.entries(seller.products_sold) //Преобразуем объект в массив массивов
            .map(([sku, quantity]) => ({ sku, quantity })) // Трансформируем массив в массив объектов
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0,10);// Формируем топ-10 товаров
    });
    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id,// Строка, идентификатор продавца
        name: `${seller.first_name} ${seller.last_name}`,// Строка, имя продавца
        revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
        profit: +seller.profit.toFixed(2),// Число с двумя знаками после точки, прибыль продавца
        sales_count: seller.sales_count, // Целое число, количество продаж продавца
        top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
        bonus: +seller.bonus.toFixed(2) // Число с двумя знаками после точки, бонус продавца
    }));
}