const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const omixCost = require("../api-calls/omix-excel.js");

// // seed Omix products
const seedOmix = async () => {
  try {
    // Call OmixAPI and get the processed responses
    const vendorProductsData = await omixCost();
    let vendorProductCreatedCount = 0;
    let vendorProductUpdatedCount = 0;

    // Loop through the vendorProductsData array and create vendor products
    for (const data of vendorProductsData) {
      // console.log("data", data);

      // Check if a vendor product with the same vendor_sku already exists
      const existingCompetitorProduct = await prisma.vendorProduct.findFirst({
        where: {
          vendor_sku: data["Part Number"], // Update: Access 'Part Number' key from data object
        },
      });

      // console.log("existingCompetitorProduct", existingCompetitorProduct);

      if (existingCompetitorProduct) {
        vendorProductUpdatedCount++;
        // console.log(
        //   `Vendor product with vendor_sku: ${data['Part Number']} already exists, updating...`
        // );

        // Update the existing vendor product with new data
        await prisma.vendorProduct.update({
          where: {
            id: existingCompetitorProduct.id, // assuming there's an 'id' field as the primary key
          },
          data: {
            vendor_sku: data["Part Number"], // Update with new vendor_sku
            vendor_cost: data["Quoted Price"], // Update with new vendor_cost
            // Add any other fields that you want to update
          },
        });

        // console.log(
        //   `Vendor product with vendor_sku: ${data['Part Number']} updated successfully`
        // );
        continue; // Move to next iteration
      }

      // Retrieve the product_sku from the Product table using meyer_code as reference
      let product; // Update: Declare product variable here
      product = await prisma.product.findFirst({
        where: {
          omix_code: data["Part Number"], // Update: Access 'Part Number' key from data object
        },
      });
      // console.log("product", product);

      if (!product) {
        // console.error(
        //   `Product not found for omix_code: ${data['Part Number']}`
        // );
        continue;
      }

      // Update the data with the retrieved product_sku and vendor_id
      const vendorProductData = {
        product_sku: product.sku, // Updated with the correct product SKU',
        vendor_id: 3, // Updated with the correct vendor ID
        vendor_sku: data["Part Number"], // Extracted from API response
        vendor_cost: data["Quoted Price"], // Extracted from API response
        // Add any other fields that you want to create
      };

      // Create the vendor product
      await prisma.vendorProduct.create({
        data: vendorProductData,
      });
      vendorProductCreatedCount++;
    }

    // console.log("Vendor products from Omix seeded successfully!");
    // console.log(`Total vendor products created: ${vendorProductCreatedCount}`);
    // console.log(`Total vendor products updated: ${vendorProductUpdatedCount}`);
    console.log(`Vendor products from Omix seeded successfully! 
      Total vendor products created: ${vendorProductCreatedCount}, 
      Total vendor products updated: ${vendorProductUpdatedCount}`);
  } catch (error) {
    console.error("Error seeding vendor products from Omix:", error);
  } finally {
    await prisma.$disconnect();
  }
};

seedOmix();
module.exports = seedOmix;