const axios = require('axios');

async function getRecentOrder(order_qty) {

  const baseUrl = `https://www.justjeeps.com/rest/V1/orders/?searchCriteria[sortOrders][0][field]=created_at&fields=items[created_at,status,customer_email,customer_firstname,customer_lastname,entity_id,grand_total,increment_id,order_currency_code,total_qty_ordered,coupon_code,items[name,sku,order_id,base_price,base_price_incl_tax,discount_amount,discount_invoiced,discount_percent,original_price,price,price_incl_tax,product_id,qty_ordered]]&searchCriteria[pageSize]=${order_qty}`;
  
  const token = `Bearer ${process.env.MAGENTO_KEY}`;

  try {
    const response = await axios.get(baseUrl,
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          Cookie: "PHPSESSID=onbmjhijbl1p9q10f60ol68erm",
        },
      }
    );
    console.log(response.data.items);
    return response;
  } catch (error) {
    console.log(error);
  }
}


// getRecentOrder(200); 

module.exports = getRecentOrder;