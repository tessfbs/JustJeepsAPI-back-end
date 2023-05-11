const { PrismaClient } = require("@prisma/client");
const magentoAllProducts = require("../api-calls/magento-allProducts.js");
const vendorsPrefix = require("../hard-code_data/vendors_prefix");

const prisma = new PrismaClient();

const seedAllProducts = async () => {
  try {
    const allProducts = await magentoAllProducts();
    // console.log("allProducts", allProducts);

    // Initialize counters for created and updated products
    let createdCount = 0;
    let updatedCount = 0;

    for (const item of allProducts) {
      const {
        sku,
        status,
        name,
        price,
        weight,
        media_gallery_entries,
        custom_attributes,
      } = item;
      // console.log("item", item);

      // Extract jj_prefix from sku by splitting at the first hyphen and taking the first element
      const jjPrefix = item.sku.split("-")[0];

      // Extract searchable_sku from sku by removing characters before the first hyphen
      const searchable_sku = item.sku.slice(item.sku.indexOf("-") + 1);

      // Get the vendor data based on jj_prefix
      const vendorData = vendorsPrefix.find(
        (vendor) => vendor.jj_prefix === jjPrefix
      );

      // Generate meyer_code, keystone_code, and brand_name based on vendor data
      const meyerCode =
        vendorData && vendorData.meyer_code
          ? vendorData.meyer_code + searchable_sku
          : "";

      //Generate keystone_code based on vendor data
      const keystoneCode =
        vendorData && vendorData.keystone_code
          ? vendorData.keystone_code + searchable_sku.replace(/-/g, "")
          : "";

      //Generate brand_name based on vendor data
      const brandName = vendorData ? vendorData.brand_name : "";

      // Generate vendors based on vendor data
      const vendors = vendorData ? vendorData.vendors : "";

      const searchableSku =
        custom_attributes &&
        Object.keys(custom_attributes).reduce((acc, key) => {
          if (custom_attributes[key].attribute_code === "searchable_sku") {
            return custom_attributes[key].value || "";
          }
          return acc;
        }, "");

      const url_path =
        custom_attributes &&
        Object.keys(custom_attributes).reduce((acc, key) => {
          if (custom_attributes[key].attribute_code === "url_path") {
            return custom_attributes[key].value || "";
          }
          return acc;
        }, "");

        console.log("url_path", url_path);

      // console.log("check sku", sku);
      //console.log the product when sku is undefined
      if (sku === undefined) {
        // console.log("check item", item);
      }
      // Check if product with given SKU already exists in the database
      const existingProduct = await prisma.product.findUnique({
        where: { sku },
      });

      if (existingProduct) {
        // Update existing product
        await prisma.product.update({
          where: { sku },
          data: {
            name,
            status,
            price,
            weight,
            searchableSku,
            searchable_sku,
            jj_prefix: jjPrefix,
            meyer_code: meyerCode,
            keystone_code: keystoneCode,
            omix_code:
              jjPrefix === "OA" || jjPrefix === "ALY" || jjPrefix === "RR"
                ? searchable_sku
                : null,
            brand_name: brandName,
            vendors: vendors,
            // manufacturer_code: manufacturerCode,
            image:
              media_gallery_entries && media_gallery_entries.length > 0
                ? `https://www.justjeeps.com/pub/media/catalog/product/${
                    media_gallery_entries[0]?.file || null
                  }`
                : null,
            url_path: `https://www.justjeeps.com/${url_path || null}`,
          },
        });
        // console.log(`Product with SKU ${sku} updated.`);
        updatedCount++; // Increment updated product counter
      } else {
        // Create new product
        // console.log("check sku", sku);
        await prisma.product.create({
          data: {
            sku,
            status,
            name,
            
            price,
            weight,
            searchableSku,
            searchable_sku,
            jj_prefix: jjPrefix,
            meyer_code: meyerCode,
            keystone_code: keystoneCode,
            omix_code:
              jjPrefix === "OA" || jjPrefix === "ALY" || jjPrefix === "RR"
                ? searchable_sku
                : null,
            brand_name: brandName,
            vendors: vendors,
            // manufacturer_code: manufacturerCode,
            image:
              media_gallery_entries && media_gallery_entries.length > 0
                ? `https://www.justjeeps.com/pub/media/catalog/product/${
                    media_gallery_entries[0]?.file || null
                  }`
                : null,
            url_path: `https://www.justjeeps.com/${url_path || null}`,
          },
        });
        // console.log(`Product with SKU ${sku} created.`);
        createdCount++; // Increment created product counter
      }
    }

    console.log(`Products seeded successfully!! 
    Total products created: ${createdCount}
    Total products updated: ${updatedCount}`);
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = seedAllProducts;

seedAllProducts();
