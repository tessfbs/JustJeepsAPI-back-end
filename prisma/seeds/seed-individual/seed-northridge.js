const { PrismaClient } = require("@prisma/client");
const data = require("../hard-code_data/northridge_data.js");
const northridgeData = require("../api-calls/northridge-api.js");



const prisma = new PrismaClient();

async function seedCompetitorProducts() {
  
  try {
    const data = await northridgeData();
    console.log("data from northridge >>>>", data);
    // Loop through the data from data.js
    for (const link of data.links) {
  
      console.log("link from northridge >>>>", link);
      //if link.selection1 exists, loop through it
      if (link.selection1) {
        for (const selection of link.selection1) {
          
          console.log("link.selection from northridge >>>>", link.selection1);
          const sku = selection.SKU; // SKU from data.js
          // console.log("sku from northridge >>>>", sku);
          const searchableSku = sku.substring(10);
          // console.log("searchable sku from JJ >>>>>", searchableSku);
  
          // Fetch the corresponding Product model based on the searchableSku
          const product = await prisma.product.findFirst({
            where: {
              searchableSku: searchableSku,
            },
          });
  
          if (product) {
            const jjPrefix = product.jj_prefix; // Fetch jj_prefix from Product model
            const productSku = `${jjPrefix}-${searchableSku}`; // Construct productSku by adding jj_prefix to searchableSku
  
            // Check if the CompetitorProduct already exists in the database
            const competitorProduct = await prisma.competitorProduct.findFirst({
              where: {
                competitor_id: 1,
                product_sku: productSku,
              },
            });
  
            if (competitorProduct) {
              // If the CompetitorProduct already exists, update its data
              await prisma.competitorProduct.update({
                where: {
                  id: competitorProduct.id,
                },
                data: {
                  competitor_price: parseFloat(selection.Price.replace('CA$', '')),
                  product_url: selection.Price_url,
                },
              });
  
              // console.log(
              //   `SKU: ${sku} -> searchableSku: ${searchableSku} -> jj_prefix: ${jjPrefix} -> productSku: ${productSku} -> CompetitorProduct updated`
              // );
            } else {
              // If the CompetitorProduct does not exist, create a new one
              await prisma.competitorProduct.create({
                data: {
                  competitor_id: 1,
                  product_sku: productSku,
                  competitor_price: parseFloat(selection.Price.replace('CA$', '')),
                  product_url: selection.Price_url,
                },
              });
  
              // console.log(
              //   `SKU: ${sku} -> searchableSku: ${searchableSku} -> jj_prefix: ${jjPrefix} -> productSku: ${productSku} -> CompetitorProduct created`
              // );
            }
          } else {
            // console.log(
              // `SKU: ${sku} -> No corresponding Product found for searchableSku: ${searchableSku}`
            // );
          }
        }
      }
      
    }
    console.log("Northridge competitor products seeded successfully");
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = seedCompetitorProducts;
seedCompetitorProducts();
