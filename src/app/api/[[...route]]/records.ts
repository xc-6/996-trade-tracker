import { verifyAuth } from "@hono/auth-js";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { buyRecords, users, divBatchRecords } from "@/db/schema";
import { db } from "@/db/mongo";
import { z } from "zod";
import { ObjectId } from "mongodb";

const app = new Hono()
  .get(
    "/stock_groups",
    verifyAuth(),
    zValidator(
      "query",
      z.object({
        accountIds: z.string(),
      }),
    ),
    async (c) => {
      // Get the stock groups by the account ids
      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      await db();

      const { accountIds } = c.req.valid("query");
      const inputAccounts = accountIds.split(",");

      // Check the accounts ids are in this user's accounts
      const user = await users.findById(auth.token.id);
      if (!user) {
        return c.json({ error: "Something went wrong" }, 400);
      }

      const accountsInDB = user.accounts ?? [];
      const userAccountIds =
        accountsInDB?.map((account) => String(account._id)) ?? [];

      // Check if the input accounts are really in the user's accounts
      if (inputAccounts.some((account) => !userAccountIds.includes(account))) {
        return c.json({ error: "Unauthorized or account not found" }, 401);
      }

      // Fetch records for the specified accounts
      const records = await buyRecords.find({
        accountId: { $in: inputAccounts },
      });

      // Group and calculate totals by stock code
      const groupedRecords = records.reduce(
        (acc, record) => {
          const stockCode = record.stockCode;

          if (!acc[stockCode]) {
            acc[stockCode] = {
              totalBuyAmount: 0,
              totalUnsoldAmount: 0,
              totalCost: 0,
              avgCost: 0,
              totalPL: 0,
              totalDiv: 0,
            };
          }

          // Calculate total Profit and Loss
          const totalPL = record.sellRecords.reduce(
            (sum, sellRecord) => sum + Number(sellRecord.profitLoss),
            0,
          );
          acc[stockCode].totalPL += totalPL;

          // skip the record if it has no unsold amount
          if (record.unsoldAmount === 0) {
            return acc;
          }
          // Update totals
          acc[stockCode].totalBuyAmount += Number(record.buyAmount);
          acc[stockCode].totalUnsoldAmount += Number(record.unsoldAmount);
          acc[stockCode].totalCost +=
            Number(record.buyPrice) * Number(record.unsoldAmount);

          // Calculate average cost with 3 decimal places
          acc[stockCode].avgCost =
            acc[stockCode].totalUnsoldAmount > 0
              ? Number(
                  (
                    acc[stockCode].totalCost / acc[stockCode].totalUnsoldAmount
                  ).toFixed(3),
                )
              : 0;

          return acc;
        },
        {} as Record<
          string,
          {
            totalBuyAmount: number;
            totalUnsoldAmount: number;
            totalCost: number;
            avgCost: number;
            totalPL: number;
            totalDiv: number;
          }
        >,
      );

      // Calculate the total Dividends
      const list = await divBatchRecords
        .aggregate([
          {
            $unwind: "$divRecords",
          },
          {
            $match: {
              "divRecords.accountId": {
                $in: inputAccounts.map((id) => new ObjectId(id)),
              },
            },
          },
          {
            $project: {
              allFields: {
                $mergeObjects: ["$$ROOT", "$divRecords", { batchId: "$_id" }],
              },
            },
          },
          {
            $replaceRoot: { newRoot: "$allFields" },
          },
          {
            $project: {
              perDiv: 1,
              divAmount: 1,
              stockCode: 1,
            },
          },
        ])
        .exec();

      // Calculate total dividends for each stockCode
      const totalDividendsByStockCode = list.reduce(
        (acc, record) => {
          const totalDiv = record.perDiv * record.divAmount;
          if (!acc[record.stockCode]) {
            acc[record.stockCode] = 0;
          }
          acc[record.stockCode] += totalDiv;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Insert totalDiv into groupedRecords based on stockCode
      for (const stockCode in groupedRecords) {
        groupedRecords[stockCode].totalDiv =
          totalDividendsByStockCode[stockCode] || 0; // Add totalDiv to each stockCode
      }
      return c.json({ data: groupedRecords }, 200);
    },
  )
  .get(
    "/stock_codes",
    verifyAuth(),
    zValidator(
      "query",
      z.object({
        accountIds: z.string(),
      }),
    ),
    async (c) => {
      // Get the stock codes by the account ids
      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      await db();

      const { accountIds } = c.req.valid("query");
      const accounts = accountIds.split(",");

      // Fetch records for the specified accounts
      const records = await buyRecords.find({ accountId: { $in: accounts } });

      // Extract unique stock codes
      const stockCodes = new Set(records.map((record) => record.stockCode));

      return c.json({ data: Array.from(stockCodes) }, 200);
    },
  )
  .delete(
    "stock_groups/:stockCode",
    verifyAuth(),
    zValidator("query", z.object({ accountIds: z.string() })),
    zValidator("param", z.object({ stockCode: z.string() })),
    async (c) => {
      // Delete the stock groups by the stock code
      const auth = c.get("authUser");
      const { stockCode } = c.req.valid("param");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      await db();

      const { accountIds } = c.req.valid("query");
      const accounts = accountIds.split(",");

      // Delete all buy records with the specified stockCode
      const result = await buyRecords.deleteMany({
        stockCode,
        accountId: { $in: accounts },
      });

      if (result.deletedCount === 0) {
        return c.json({ message: "No records found to delete" }, 404);
      }

      // Delete all divBatchRecords with the specified stockCode and accountIds
      // Find the divBatchRecords for the specified stockCode and accountIds
      const mathcedDivBatchRecords = await divBatchRecords.find({
        stockCode: stockCode,
        accountIds: { $in: accounts.map((id) => new ObjectId(id)) },
      });

      for (const divBatchRecord of mathcedDivBatchRecords) {
        const matchedAccountIds = divBatchRecord.accountIds.filter(
          (accountId) => accounts.includes(accountId.toString()),
        );

        // Check if all accountIds are matched
        if (matchedAccountIds.length === divBatchRecord.accountIds.length) {
          // Delete the whole document if all accountIds match
          await divBatchRecords.deleteOne({ _id: divBatchRecord._id });
        } else if (matchedAccountIds.length > 0) {
          // Delete only the matching divRecords if at least one accountId matches
          divBatchRecord.divRecords = divBatchRecord.divRecords.filter(
            (divRecord) => !accountIds.includes(divRecord.accountId.toString()),
          );

          // Remove the matched accountIds from the accountIds array
          divBatchRecord.accountIds = divBatchRecord.accountIds.filter(
            (accountId) => !accounts.includes(accountId.toString()),
          );

          await divBatchRecord.save();
        }
      }

      return c.json({ message: "Records deleted successfully" }, 200);
    },
  )
  .post(
    "/update-stock-code",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        oldStockCode: z.string().min(1),
        newStockCode: z.string().min(1),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      await db();

      const { oldStockCode, newStockCode } = c.req.valid("json");

      // Get user to verify they own the records
      const user = await users.findById(auth.token.id);
      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      const userAccountIds =
        user.accounts?.map((account) => String(account._id)) ?? [];

      // Update all buy records with the old stock code for this user's accounts
      const updateResult = await buyRecords.updateMany(
        {
          stockCode: oldStockCode,
          accountId: { $in: userAccountIds },
        },
        {
          $set: { stockCode: newStockCode },
        },
      );

      // Update all dividend batch records with the old stock code for this user's accounts
      await divBatchRecords.updateMany(
        {
          stockCode: oldStockCode,
          accountIds: { $in: userAccountIds.map((id) => new ObjectId(id)) },
        },
        {
          $set: { stockCode: newStockCode },
        },
      );

      return c.json({
        message: "Stock code updated successfully",
        modifiedCount: updateResult.modifiedCount,
      });
    },
  );
export default app;
