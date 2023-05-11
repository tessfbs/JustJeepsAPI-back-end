const { PrismaClient } = require("@prisma/client");
const keystoneAPI = require("../api-calls/keystone-api-split.js");

const prisma = new PrismaClient();

// Seed Keystone  products
const seedKeystoneVendorProducts = async (callNumber, numParts) => {
  try {
    let vendorProductCreatedCount = 0;
    let vendorProductUpdatedCount = 0;

    // Call Keystone API and get the processed responses
    const vendorProductsData = await keystoneAPI(callNumber, numParts);

    // Loop through the vendorProductsData object and create/update vendor products
    for (const [keystoneCode, data] of Object.entries(vendorProductsData)) {

      // Check if a vendor product with the same vendor_sku already exists
      const existingVendorProduct = await prisma.vendorProduct.findFirst({
        where: {
          vendor_sku: keystoneCode,
          vendor_id: 1,
        },
      });

      if (existingVendorProduct) {
        // Vendor product already exists, update it
        const [
          greatLakes,
          greatLakesQty,
          pacificNorthwest,
          pacificNorthwestQty,
          east,
          eastQty,
        ] = data.checkInventoryResult.split(",");

        // Update the existing vendor product with the retrieved values and other data
        const updatedVendorProductData = {
          product_sku: existingVendorProduct.product_sku,
          vendor_id: 1,
          vendor_sku: keystoneCode,
          vendor_cost: parseFloat(data.CustomerPrice),
          vendor_inventory:
            parseInt(greatLakesQty) +
            parseInt(pacificNorthwestQty) +
            parseInt(eastQty),
        };

        await prisma.vendorProduct.update({
          where: { id: existingVendorProduct.id },
          data: updatedVendorProductData,
        });

        vendorProductUpdatedCount++; // Increment the updated count

        //console.log to show the updated vendor product
        // console.log(`Vendor product with vendor_sku ${keystoneCode} updated successfully!`);

      } else {
        // Vendor product doesn't exist, create it
        const product = await prisma.product.findFirst({
          where: {
            keystone_code: keystoneCode,
          },
        });

        const [
          greatLakes,
          greatLakesQty,
          pacificNorthwest,
          pacificNorthwestQty,
          east,
          eastQty,
        ] = data.checkInventoryResult.split(",");
        // console.log("PRODUCT", product);

        const newVendorProductData = {
          product_sku: product.sku,
          vendor_id: 1,
          vendor_sku: keystoneCode,
          vendor_cost: parseFloat(data.CustomerPrice),
          vendor_inventory:
            parseInt(greatLakesQty) +
            parseInt(pacificNorthwestQty) +
            parseInt(eastQty),
        };

        await prisma.vendorProduct.create({
          data: newVendorProductData,
        });

        vendorProductCreatedCount++; // Increment the created count

        //console.log to show the created vendor product
        // console.log(`Vendor product with vendor_sku ${keystoneCode} created successfully!`);
      }
    }

    console.log(`Keystone vendor products seeded successfully! 
      Total vendor products created: ${vendorProductCreatedCount}
      Total vendor products updated: ${vendorProductUpdatedCount}`);

  } catch (error) {
    console.error("Error seeding Keystone vendor products:", error);
  } finally {
    await prisma.$disconnect();
  }
};

// module.exports = seedKeystoneVendorProducts;

const allKeystoneSeeds = async (numParts) => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    console.time("all keystone api calls"); // Start the timer for all keystone api calls

    for (let i = 1; i <= numParts; i++) {
      await seedKeystoneVendorProducts(i, numParts); // Call seedKeystoneVendorProducts() for each part sequentially and wait for it to resolve before moving to the next iteration
    }
    await delay(6000);
    
    console.timeEnd("all keystone api calls"); // End the timer for all keystone api calls
    console.log("All API calls completed."); // Log a message indicating that all API calls are completed

  } catch (error) {
    console.error("Error seeding data:", error);
  }
};

module.exports = allKeystoneSeeds;

allKeystoneSeeds(2000);

