const { PrismaClient } = require("@prisma/client");
const magentoRecentOrders = require("../api-calls/magento-recentOrders.js");

const prisma = new PrismaClient();

// // seed orders
const seedOrders = async () => {
  try {
    // Fetch orders from API
    const response = await magentoRecentOrders(150);

    const orders = response.data.items;
    let orderCount = 0;

    // Seed orders
    for (const orderData of orders) {
      orderCount++;
      const { entity_id, items, ...order } = orderData;
      const existingOrder = await prisma.order.findUnique({
        where: { entity_id },
      });

      if (!existingOrder) {
        try {
          // Use try-catch block to catch errors while seeding each order
          const createdOrder = await prisma.order.create({
            data: { ...order, entity_id },
          });

          // Seed order products
          for (const itemData of items) {
            await prisma.orderProduct.create({
              data: {
                ...itemData,
                order_id: createdOrder.entity_id, // Use entity_id as order_id
                sku: itemData.sku,
              },
            });
          }
        } catch (error) {
          console.error(
            `Error seeding order with entity_id ${entity_id}:`,
            error.code
          );
          // Continue to next order even if error occurs
          continue;
        }
      } else {
        try {
          // If order already exists, update its properties
          const updatedOrder = await prisma.order.update({
            where: { entity_id },
            data: { ...order },
          });
          console.log(`Order with entity_id ${entity_id} already exists. Updating...`);
        } catch (error) {
          console.error(
            `Error updating order with entity_id ${entity_id}:`,
            error.code
          );
          // Continue to next order even if error occurs
          continue;
        }
      }
    }

    console.log("Orders seeded successfully");
    console.log(`Total orders seeded: ${orderCount}`);
  } catch (error) {
    console.error("Error seeding data:", error);
  }
};
module.exports = seedOrders;

// seedOrders();