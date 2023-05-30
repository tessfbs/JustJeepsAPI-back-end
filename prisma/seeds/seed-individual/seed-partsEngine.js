const { PrismaClient } = require("@prisma/client");
// const data = require("../hard-code_data/partsEngine_data.js");
const partsEngine = require("../api-calls/partsEngine-api.js");



const prisma = new PrismaClient();

async function seedPartsEngine() {
  let counter = 0; // Counter variable to keep track of added and updated products

  try {
    const data = await partsEngine();
    console.log("data from partsEngine >>>>", data);

    // Loop through the data from data.js
    for (const link of data.links) {
      try {
        if (!link.sku) {
          continue; // Skip to the next iteration if link.sku is missing
        }

        console.log("sku from partsEngine >>>>", link.sku);

        const searchableSku = link.sku;

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
              competitor_id: 3,
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
                competitor_price: parseFloat(link.price.replace(/[^0-9.-]+/g,"")),
                product_url: link.link,
              },
            });

            // Increment the counter for updated products
            counter++;

            // console.log(
            //   `SKU: ${sku} -> searchableSku: ${searchableSku} -> jj_prefix: ${jjPrefix} -> productSku: ${productSku} -> CompetitorProduct updated`
            // );
          } else {
            // If the CompetitorProduct does not exist, create a new one
            await prisma.competitorProduct.create({
              data: {
                competitor_id: 3,
                product_sku: productSku,
                competitor_price: parseFloat(link.price.replace(/[^0-9.-]+/g,"")),
                product_url: link.link,
              },
            });

            // Increment the counter for added products
            counter++;

            // console.log(
            //   `SKU: ${sku} -> searchableSku: ${searchableSku} -> jj_prefix: ${jjPrefix} -> productSku: ${productSku} -> CompetitorProduct created`
            // );
          }
        } else {
          // console.log(
          // `SKU: ${sku} -> No corresponding Product found for searchableSku: ${searchableSku}`
          // );
        }
      } catch (error) {
        console.error(error);
        continue; // Skip to the next iteration if an error occurs
      }
    }

    console.log(`${counter} competitor products were added and updated successfully`);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}



module.exports = seedPartsEngine;
seedPartsEngine();
