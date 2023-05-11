const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

// Create an instance of PrismaClient
const prisma = new PrismaClient();

const MeyerCost = async () => {
  try {
    // Get total number of products with a meyer_code and status=1
    const totalSkus = await prisma.product.count({
      where: {
        meyer_code: {
          not: "", // Exclude results where meyer_code is empty
        },
        brand_name: {
          // in:[ "Napier Sportz","N-Fab", "NGK", "NOCO", "ODYSSEY Battery", "Old Man Emu","Optima Batteries", "Oracle Lighting", "Smittybilt", "AMP Research"]
          // in: ["ARB"],
        },
        status: 1,
      },
    });

    console.log(`Total number of products with a Meyer Code: ${totalSkus}`);

    const skus = await prisma.product.findMany({
      where: {
        meyer_code: {
          not: "", // Exclude results where meyer_code is empty
        },
        brand_name: {
          // in:[ "Napier Sportz","N-Fab", "NGK", "NOCO", "ODYSSEY Battery", "Old Man Emu","Optima Batteries", "Oracle Lighting", "Smittybilt", "AMP Research"]
          // in: ["ARB"],
        },
        status: 1,
      },
      select: {
        meyer_code: true,
      },
    });

    const chunkedSkus = [];
    for (let i = 0; i < skus.length; i += 100) {
      chunkedSkus.push(skus.slice(i, i + 100));
    }

    const makeRequests = async (chunk, chunkIndex) => {
      console.log(`Starting chunk ${chunkIndex}...`);
      const responses = [];
      for (let i = 0; i < chunk.length; i++) {
        const sku = chunk[i].meyer_code;
        try {
          let data = JSON.stringify({
            username: process.env.MEYER_USERNAME,
            password: process.env.MEYER_PASSWORD,
            ItemNumber: sku,
          });

          let config = {
            method: "get",
            maxBodyLength: Infinity,
            url: `https://meyerapi.meyerdistributing.com/http/default/ProdAPI/v2/ItemInformation?ItemNumber=${sku}`,
            headers: {
              Authorization: `Espresso ${process.env.MEYER_KEY}`,
              "Content-Type": "application/json",
            },
            data: data,
          };

          const response = await axios.request(config);
          console.log(`Success for SKU ${sku} from Meyer API Call`);
          responses.push(response.data);
        } catch (error) {
          console.log(`Error for SKU ${sku} from Meyer API Call: ${error}`);
          responses.push(null); // Push null for error responses
        }
        // Add a delay of 5 seconds between API requests
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      console.log(`Chunk ${chunkIndex} completed.`);
      // Add a delay of 60 seconds before calling the next chunk
      await new Promise((resolve) => setTimeout(resolve, 60000));

      return responses;
    };

    const flattenedResponses = [];
    for (let i = 0; i < chunkedSkus.length; i++) {
      const chunk = chunkedSkus[i];
      const chunkIndex = i + 1;
      const responses = await makeRequests(chunk, chunkIndex);
      flattenedResponses.push(...responses);
    }

    console.log(flattenedResponses);
    return flattenedResponses;

    // const requests = chunkedSkus.map((chunk, index) => makeRequests(chunk, index + 1)); // Increment index by 1

    // const flattenResponses = (responses) => {
    //   return responses.reduce((acc, curr) => {
    //     return acc.concat(curr);
    //   }, []);
    // };

    // const responses = await Promise.all(requests);
    // const flattenedResponses = flattenResponses(responses);

    // console.log(flattenedResponses);
    // return flattenedResponses;
  } catch (error) {
    console.log(error);
  }
};

// Call the async function
// MeyerCost();

module.exports = MeyerCost;
