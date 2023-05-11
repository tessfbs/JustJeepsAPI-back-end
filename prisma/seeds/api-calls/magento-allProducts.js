const axios = require('axios');

async function getProductsFromPages() {
  const results = [];
  const baseUrl = 'https://www.justjeeps.com/rest/V1/products';
  const token = `Bearer ${process.env.MAGENTO_KEY}`;

  try {
    // Loop through 9 pages
    for (let page = 1; page <= 9; page++) {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${baseUrl}?fields=items[sku,status,name,price,weight,media_gallery_entries[file],custom_attributes[searchable_sku,url_path]]&searchCriteria[PageSize]=5000&searchCriteria[CurrentPage]=${page}`,
        headers: { 
          'Authorization': token, 
          'Content-Type': 'application/json', 
          'Accept': 'application/json', 
          'Cookie': 'PHPSESSID=nnhu3rl2qk69t18auce339csa1'
        },
      };
      const response = await axios.request(config);
      results.push(...response.data.items); // Concatenate items into results array
      // Introduce a delay of 1 second between each request
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // console.log(JSON.stringify(results));
    return results;
  } catch (error) {
    console.log(error);
  }
}


// getProductsFromPages();

module.exports = getProductsFromPages;