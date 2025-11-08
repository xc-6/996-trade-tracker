import { Column, DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/hooks/use-confirm";
import { useGetRecordsByStock } from "../hooks/use-get-records-by-stock";
import { Loader, PiggyBank, Plus } from "lucide-react";
import { useActiveAccounts } from "@/features/account/hooks/use-active-accounts";
import { BuyRecordTable } from "./buy-record-table";
import { cn, numberFormatter, reverseMapping } from "@/lib/utils";
import { useStocksState } from "@/features/stock/store/use-stocks-store";
import { Fragment, useEffect, useMemo } from "react";
import { Trash2, MoveDown, MoveUp, Pencil } from "lucide-react";
import { ResponseType } from "../hooks/use-get-records-by-stock";
import { useDeleteStockGroups } from "../hooks/use-delete-stock-groups";
import { totalUnsoldAmount } from "../deafult";
import { StockInfo } from "@/lib/types";
import { useModal } from "@/hooks/use-modal-store";
import { useStockCurrencyInfo } from "@/features/stock/hooks/use-stock-currency-info";
import { CURRENCY_GROUP } from "@/lib/const";

type StockRecord = ResponseType["data"][0] &
  StockInfo & {
    price: number;
    unrealized: number;
    unrealizedPLPercent: number;
    total: number;
    marketValue: number;
    totalCost: number;
    totalAmount: number;
    totalPercent: number;
    accountName: string;
    up: boolean;
    stockCode: string;
  };
const Table = DataTable<StockRecord>;
export const StockRecordTable = (props: {
  className?: string;
  style?: React.CSSProperties;
}) => {
  const { onOpen } = useModal();
  const { stocksState } = useStocksState();
  const { activeIds } = useActiveAccounts();
  const { data, isLoading, refetch } = useGetRecordsByStock(activeIds ?? []);
  const { asset, cost } = useStockCurrencyInfo();
  const removeMutation = useDeleteStockGroups();
  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "You are about to delete this record.",
  );

  const columns: Array<Column<StockRecord>> = [
    {
      key: "expand",
      label: "",
      type: "expand",
      className: "w-[20px]",
      render: (item) => {
        return (
          <BuyRecordTable
            showHeader={false}
            stockCode={[item.stockCode]}
            fetchAll={true}
            key={`${item.stockCode}-table`}
          />
        );
      },
      sortable: false,
    },
    {
      key: "stockCode",
      label: "Code",
      render: (item) => {
        return (
          <>
            <Badge variant="outline" className="mr-2">
              {item.stockCode.slice(0, 2)}
            </Badge>
            {item.stockCode.slice(2)}
          </>
        );
      },
      sortable: "local",
    },
    {
      key: "name",
      label: "Name",
      className: "font-medium",
      render: (item) => item.name ?? "",
      sortable: "local",
    },
    {
      key: "price",
      label: "Price",
      className: ({ up }) =>
        cn(up ? "text-red-500 font-bold" : "text-green-500"),
      render: (item) => (
        <>
          {item.up ? (
            <MoveUp size={16} className="inline" />
          ) : (
            <MoveDown size={16} className="inline" />
          )}
          {item.price}
        </>
      ),
      sortable: "local",
    },
    {
      key: "buyPrice",
      label: "Cost",
      sortable: "local",
    },
    {
      key: "unrealizedPLPercent",
      label: "Unrealized P&L",
      className: ({ unrealized }) =>
        cn(unrealized > 0 ? "text-red-500 font-bold" : "text-green-500"),
      render: ({ unrealizedPLPercent, unrealized }) => (
        <>
          {numberFormatter(unrealized)}{" "}
          <span>({unrealizedPLPercent.toFixed(2)}%)</span>
        </>
      ),
      sortable: "local",
    },
    {
      key: "percent",
      label: "TPC",
      className: ({ up }) =>
        cn(up ? "text-red-500 font-bold" : "text-green-500"),
      render: (item) => `${item.percent.toFixed(2)} %`,
      sortable: "local",
    },
    {
      key: "high",
      label: "High",
      className: ({ up }) =>
        cn(up ? "text-red-500 font-bold" : "text-green-500"),
      sortable: "local",
    },
    {
      key: "low",
      label: "Low",
      className: ({ up }) =>
        cn(up ? "text-red-500 font-bold" : "text-green-500"),
      sortable: "local",
    },
    {
      key: "yesterday",
      label: "Yesterday",
      className: ({ up }) =>
        cn(up ? "text-red-500 font-bold" : "text-green-500"),
      sortable: "local",
    },
    {
      key: "marketValue",
      label: "Market Value",
      render: (item) => {
        const totalAsset = asset[exchange2Currency[item.stockCode.slice(0, 2)]];
        if (!totalAsset) {
          return `${numberFormatter(item.marketValue)}`;
        }
        return `${numberFormatter(item.marketValue)} (${((item.marketValue * 100) / totalAsset).toFixed(2)}%)`;
      },
      sortable: "local",
    },
    {
      key: "totalCost",
      label: "Total Cost",
      render: (item) => {
        const totalCost = cost[exchange2Currency[item.stockCode.slice(0, 2)]];
        if (!totalCost) {
          return `${numberFormatter(item.totalCost)}`;
        }
        return `${numberFormatter(item.totalCost)} (${((item.totalCost * 100) / totalCost).toFixed(2)}%)`;
      },
      sortable: "local",
    },
    {
      key: "totalUnsoldAmount",
      label: "Unsold Amount",
      render: (item) =>
        item.totalUnsoldAmount.toLocaleString("en-US", {
          maximumFractionDigits: 4,
        }),
      sortable: "local",
      filterable: "local",
      className: "font-bold text-muted-foreground",
    },
    {
      key: "buyAmount",
      label: "Buy Amount",
      render: (item) =>
        item.totalBuyAmount.toLocaleString("en-US", {
          maximumFractionDigits: 4,
        }),
      sortable: "local",
    },
    {
      key: "totalPL",
      label: "Realized P&L",
      render: (item) => numberFormatter(item.totalPL),
      sortable: "local",
    },
    {
      key: "accountName",
      label: "Account",
      sortable: false,
    },
    {
      key: "buyDate",
      label: "Buy Date",
      sortable: false,
    },
    {
      key: "action",
      label: "Action",
      sortable: false,
      className: "flex flex-row gap-4",
      render: (item) => (
        <>
          <Plus
            size={16}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={(e) => {
              onOpen("createBuyRecord", {
                buyRecord: { stockCode: item.stockCode } as any,
              });
              e.stopPropagation();
            }}
          />
          <PiggyBank
            size={16}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={(e) => {
              onOpen("createDivBatch", { stockCode: item.stockCode });
              e.stopPropagation();
            }}
          />
          <Pencil
            size={16}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={(e) => onUpdateStockCode(e, item)}
          />
          <Trash2
            size={16}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={(e) => onDelete(e, item.stockCode)}
          />
        </>
      ),
    },
  ];

  const exchange2Currency = useMemo(() => {
    return reverseMapping(CURRENCY_GROUP);
  }, []);

  const list = useMemo(() => {
    if (isLoading) {
      return [];
    }
    const res = Object.keys(data ?? {})?.map((stockCode) => {
      const record = data?.[stockCode];
      const buyPrice = record?.avgCost ?? 0;
      const name = stocksState?.get(stockCode)?.name;
      const percent = (stocksState?.get(stockCode)?.percent ?? 0) * 100;
      const price = stocksState?.get(stockCode)?.now ?? buyPrice;
      const unrealizedPL =
        (record?.totalUnsoldAmount ?? 0) * price - (record?.totalCost ?? 0);
      const high = stocksState?.get(stockCode)?.high ?? "N/A";
      const low = stocksState?.get(stockCode)?.low ?? "N/A";
      const yesterday = stocksState?.get(stockCode)?.yesterday ?? "N/A";
      const marketValue = price * (record?.totalUnsoldAmount ?? 0);
      const totalCost = buyPrice * (record?.totalUnsoldAmount ?? 0);
      const totalPL = record?.totalPL ?? 0;
      const totalBuyAmount = record?.totalBuyAmount ?? 0;
      const totalUnsoldAmount = record?.totalUnsoldAmount ?? 0;
      const up = (stocksState?.get(stockCode)?.percent ?? 0) >= 0;
      const unrealizedPLPercent = Number((unrealizedPL / totalCost) * 100);

      return {
        ...record,
        stockCode,
        buyPrice,
        unrealizedPLPercent,
        unrealized: unrealizedPL,
        name,
        percent,
        price,
        high,
        low,
        yesterday,
        up,
        totalBuyAmount,
        totalUnsoldAmount,
        marketValue,
        totalCost,
        totalPL,
      };
    });

    return res as unknown as StockRecord[];
  }, [isLoading, data, stocksState]);

  const onDelete = async (e: React.MouseEvent, stockCode: string) => {
    e.stopPropagation();
    const ok = await confirm();

    if (ok) {
      removeMutation.mutate({
        param: { stockCode },
        query: {
          accountIds: activeIds?.join(",") ?? "",
        },
      });
    }
  };

  const onUpdateStockCode = (e: React.MouseEvent, item: StockRecord) => {
    e.stopPropagation();
    onOpen("updateStockCode", { stockRecord: item });
  };

  useEffect(() => {
    refetch();
  }, [activeIds, refetch]);

  if (isLoading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <Table
      defaultFilter={{ totalUnsoldAmount }}
      data={list}
      columns={columns}
      dataIndex="stockCode"
      className="mb-2"
      rowClassName={"group"}
      {...props}
    >
      <ConfirmDialog />
    </Table>
  );
};
