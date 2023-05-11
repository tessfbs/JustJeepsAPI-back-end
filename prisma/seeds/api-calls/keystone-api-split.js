const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const { parseString } = require("xml2js");

// Create an instance of PrismaClient
const prisma = new PrismaClient();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getAllSkus = async (callNumber, numParts) => {
  const totalSkus = await prisma.product.count({
    where: {
      keystone_code: {
        not: "" // Exclude results where keystone_code is empty
      },
      brand_name: {
        // in:[ "Napier Sportz","N-Fab", "NGK", "NOCO", "ODYSSEY Battery", "Old Man Emu","Optima Batteries", "Oracle Lighting", "Smittybilt", "AMP Research"]
        // in:["NOCO"]
      },
      status: 1
    }
  });
  // console.log(`Total number of products with a Keystone Code: ${totalSkus}`);

  const itemsPerCall = Math.ceil(totalSkus / numParts); // Calculate number of items per call
  let skip = (callNumber - 1) * itemsPerCall; // Calculate skip based on callNumber
  let take = itemsPerCall;

  // Adjust take for last call if there are remaining items
  if (callNumber === numParts) {
    take = totalSkus - ((numParts - 1) * itemsPerCall);
  }

  const skus = await prisma.product.findMany({
    where: {
      keystone_code: {
        not: "", // Exclude results where keystone_code is empty
      },
      status: 1,
      brand_name: {
        // in:[ "Napier Sportz","N-Fab", "NGK", "NOCO", "ODYSSEY Battery", "Old Man Emu","Optima Batteries", "Oracle Lighting", "Smittybilt", "AMP Research"]
        // in:["NOCO"]
      },
    },
    select: {
      keystone_code: true,
    },
    skip, // Skip items based on callNumber
    take, // Take limited items per call
  });

  // console.log(`skus ${skus}`)

  return skus;
};


const KeystoneCost = async (callNumber, numParts) => {
  const skus = await getAllSkus(callNumber, numParts);
  // Create an array to store the items from all API calls
  const allItems = [];

  // Loop through each SKU and make individual API call for each SKU
  for (const sku of skus) {
    // Construct the SOAP XML request payload for each SKU
    let data = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
            <CheckPriceBulk xmlns="http://eKeystone.com">
                <Key>${process.env.KEYSTONE_KEY}</Key>
                <FullAccountNo>${process.env.KEYSTONE_ACCOUNT}</FullAccountNo>
                <FullPartNo>${sku.keystone_code}</FullPartNo>
            </CheckPriceBulk>
        </soap:Body>
    </soap:Envelope>`;

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "http://order.ekeystone.com/wselectronicorder/electronicorder.asmx",
      headers: {
        SOAPAction: "http://eKeystone.com/CheckPriceBulk",
        "Content-Type": "text/xml; charset=utf-8",
      },
      data: data,
    };

    try {
      const response = await axios.request(config);
      // Parse XML data into JavaScript object
      parseString(response.data, (err, result) => {
        if (err) {
          console.log(err);
        } else {
          // Extract Vendor, PartNumber, CustomerPrice, and Currency from the response
          const items = result["soap:Envelope"]["soap:Body"][0][
            "CheckPriceBulkResponse"
          ][0]["CheckPriceBulkResult"][0]["diffgr:diffgram"][0][
            "NewDataSet"
          ][0]["CheckPriceBulk"]
            .filter((item) => !item["ErrorMessage"]) // Filter out items with error messages
            .map((item) => ({
              keystone_code: sku.keystone_code,
              CustomerPrice: item["CustomerPrice"][0],
            }));
            // console.log(items);
          // Push the items into the array
          allItems.push(...items);
        }
      });
    } catch (error) {
      console.log(error.code);
    }

    // Delay for 1 second between each API request to avoid rate limiting or IP blocking
    await delay(2000);
  };
  // console.log(allItems);
  return allItems;
};

const CheckInventory = async (callNumber, numParts) => {

  const skus = await getAllSkus(callNumber, numParts);

  const results = {};
  for (const sku of skus) {
    const data = `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
              <CheckInventory xmlns="http://eKeystone.com">
              <Key>${process.env.KEYSTONE_KEY}</Key>
              <FullAccountNo>${process.env.KEYSTONE_ACCOUNT}</FullAccountNo>
                  <FullPartNo>${sku.keystone_code}</FullPartNo>
              </CheckInventory>
          </soap:Body>
      </soap:Envelope>`;

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "http://order.ekeystone.com/wselectronicorder/electronicorder.asmx",
      headers: {
        SOAPAction: "http://eKeystone.com/CheckInventory",
        "Content-Type": "text/xml; charset=utf-8",
      },
      data: data,
    };

    try {
      const response = await axios.request(config);
      // Parse XML data into JavaScript object
      parseString(response.data, (err, result) => {
        if (err) {
          console.log(err);
        } else {
          // Extract CheckInventoryResult from the response
          const checkInventoryResult =
            result["soap:Envelope"]["soap:Body"][0][
              "CheckInventoryResponse"
            ][0]["CheckInventoryResult"][0];
          // Check if the result is not 'Invalid part number' and not 'Part is Blocked'
          // console.log(checkInventoryResult);
          if (
            !checkInventoryResult.toLowerCase().includes("invalid") && !checkInventoryResult.toLowerCase().includes("blocked")
          ) {
            // Add the result to the results object with SKU as key
            results[sku.keystone_code] = {
              keystone_code: sku.keystone_code,
              checkInventoryResult: checkInventoryResult,
            };
          }
        }
      });
    } catch (error) {
      console.log(error.code);
    }
    await delay(2000);
  }

  // console.log("Results: ", results);
  return results;
};

async function getResultsFromCostAndInventoryKeystone(callNumber, numParts) {
  try {
    const resultsFromCheckInventory = await CheckInventory(callNumber, numParts);
    const resultsFromCost = await KeystoneCost(callNumber, numParts);
    console.log('callNumber',callNumber);
    // console.log("resultsFromCheckInventory: ", resultsFromCheckInventory);
    // console.log("resultsFromCost: ", resultsFromCost);

    //combine the results
    const combinedResult = {};
    // Merge results from CheckInventory
    for (const key in resultsFromCheckInventory) {
      if (resultsFromCheckInventory.hasOwnProperty(key)) {
        combinedResult[key] = {
          ...resultsFromCheckInventory[key],
          CustomerPrice: 0, // Placeholder for CustomerPrice
        };
      }
    }

    // Merge results from Cost
    resultsFromCost.forEach((costResult) => {
      const { keystone_code, CustomerPrice } = costResult;
      if (combinedResult.hasOwnProperty(keystone_code)) {
        combinedResult[keystone_code].CustomerPrice = CustomerPrice;
      }
    });

    console.log('combinedResult',combinedResult); // Output the combined result
    console.log(`API call completed for callNumber ${callNumber}/${numParts}`); // Log a message indicating the completion of the API call

    return combinedResult;
  } catch (error) {
    console.error("Error fetching results from CheckInventory: ", error.code);
  }
}

module.exports = getResultsFromCostAndInventoryKeystone;
// getResultsFromCostAndInventoryKeystone(1,1000);
// getResultsFromCostAndInventoryKeystone(400,1000);


