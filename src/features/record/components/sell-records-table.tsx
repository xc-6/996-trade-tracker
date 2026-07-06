import { Column, DataTable } from "@/components/data-table";
import { format } from "date-fns";
import { Link, Trash2 } from "lucide-react";
import { useDeleteSellRecord } from "../hooks/use-delete-sell-record";
import { useConfirm } from "@/hooks/use-confirm";
import { Badge } from "@/components/ui/badge";
import { useStocksState } from "@/features/stock/store/use-stocks-store";
import { cn, numberFormatter } from "@/lib/utils";
import { useMemo, useState } from "react";
import { ResponseType } from "../hooks/use-get-sell-records";
import { BuyRecord, Filter, StockInfo } from "@/lib/types";
import { useActiveAccounts } from "@/features/account/hooks/use-active-accounts";
import { useGetSellRecords } from "../hooks/use-get-sell-records";
import { useGetStockcodes } from "../../stock/hooks/use-get-stockcodes";
import { useRouter } from "next/navigation";
import { TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { stockCode } from "../deafult";

type SellRecord = ResponseType["data"][0] &
  Omit<BuyRecord, "sellRecords"> &
  StockInfo & {
    up: boolean;
    accountName: string;
    sellPrice: number;
    totalSold: number;
    holdDays: number;
  };
const Table = DataTable<SellRecord>;
const _defaultFilter = { stockCode };

export const SellRecordsTable = (props: { style?: React.CSSProperties }) => {
  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "You are about to delete this record.",
  );

  const router = useRouter();

  const { activeIds, mapping } = useActiveAccounts();
  const [filter, setFilter] = useState<Filter>({ ..._defaultFilter });
  const [filterStockCode, setFilterStockCode] = useState<string[]>([]);
  const { data, isLoading } = useGetSellRecords(
    activeIds ?? [],
    filterStockCode,
    filter,
  );
  const { data: stockcodes } = useGetStockcodes(activeIds ?? []);

  const columns: Array<Column<SellRecord>> = [
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
      filterable: true,
      filters:
        stockcodes?.map((code) => ({
          label: () => (
            <>
              <Badge variant="outline" className="mr-2 inline-block">
                {code.slice(0, 2)}
              </Badge>
              <span className="inline-block align-middle">
                {code.slice(2)} {stocksState?.get(code)?.name}
              </span>
            </>
          ),

          value: code,
        })) ?? [],
    },
    {
      key: "name",
      label: "Name",
      className: "font-medium",
      sortable: "local",
    },
    {
      key: "buyPrice",
      label: "Buy Price",
      sortable: "local",
    },
    {
      key: "sellPrice",
      label: "Sold Price",
      sortable: "local",
    },
    {
      key: "sellAmount",
      label: "Sold Amount",
      sortable: "local",
    },
    {
      key: "totalSold",
      label: "Total Sold",
      render: ({ totalSold }) => totalSold.toFixed(2),
      sortable: "local",
    },
    {
      key: "profitLoss",
      label: "P&L",
      className: ({ up }) =>
        cn(up ? "text-red-500 font-bold" : "text-green-500"),
      sortable: "local",
    },
    {
      key: "apy",
      label: "APY",
      className: ({ up }) =>
        cn(up ? "text-red-500 font-bold" : "text-green-500"),
      render: (item) => `${Number(item.apy).toFixed(2)}%`,
      sortable: "local",
    },
    {
      key: "holdDays",
      label: "Hold Days",
      sortable: "local",
    },
    {
      key: "accountName",
      label: "Account",
      sortable: "local",
    },
    {
      key: "sellDate",
      label: "Sold Date",
      render: (item) => format(new Date(item.sellDate), "PPP"),
      sortable: "local",
      filterable: true,
      filterType: "date",
    },
    {
      key: "action",
      label: "Action",
      sortable: false,
      className: "flex flex-row gap-4",
      render: (item) => (
        <>
          <Link
            size={16}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={() => router.push(`/buy_record?id=${item.buyRecordId}`)}
          />
          <Trash2
            size={16}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={(e) => onDelete(e, item._id, item.buyRecordId)}
          />
        </>
      ),
    },
  ];

  const removeMutation = useDeleteSellRecord();

  const onDelete = async (
    e: React.MouseEvent,
    sellRecordId?: string,
    buyRecordId?: string,
  ) => {
    e.stopPropagation();
    const ok = await confirm();

    if (ok && buyRecordId && sellRecordId) {
      removeMutation.mutate({
        buyRecordId,
        sellRecordId,
      });
    }
  };

  const { stocksState } = useStocksState();

  const list = useMemo(() => {
    if (data) {
      return data?.map((sellRecord) => {
        const { stockCode, profitLoss, accountId, sellDate, buyDate, ...rest } =
          sellRecord;
        return {
          ...rest,
          stockCode,
          accountId,
          profitLoss,
          sellDate,
          buyDate,
          holdDays: Math.ceil(
            (new Date(sellDate).getTime() - new Date(buyDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
          totalSold:
            Number(sellRecord.sellPrice) * Number(sellRecord.sellAmount),
          up: Number(profitLoss) >= 0,
          accountName: mapping[accountId]?.name,
          ...(stocksState?.get(stockCode) ?? {}),
        } as unknown as SellRecord;
      });
    }
    return [];
  }, [data, stocksState, mapping]);

  const totalPL = useMemo(() => {
    return list.reduce((acc, cur) => acc + cur.profitLoss, 0);
  }, [list]);

  const handleFilterChange = (_filter: Filter) => {
    if (!!_filter.stockCode?.values?.length) {
      setFilterStockCode(_filter.stockCode.values);
    } else {
      setFilterStockCode([]);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { stockCode, ...newFilter } = _filter;
    setFilter(newFilter);
  };

  const renderFooter = () => (
    <TableFooter>
      <TableRow>
        <TableCell colSpan={6}>Total P&L</TableCell>
        <TableCell colSpan={1} className="text-left font-bold">
          {numberFormatter(totalPL)}
        </TableCell>
        <TableCell colSpan={6} />
      </TableRow>
    </TableFooter>
  );

  return (
    <Table
      defaultFilter={{ ..._defaultFilter }}
      data={list}
      loading={isLoading}
      columns={columns}
      dataIndex="_id"
      className="mb-2"
      rowClassName="group"
      onFilterChange={(_filter) => handleFilterChange(_filter)}
      renderFooter={renderFooter}
      {...props}
    >
      <ConfirmDialog />
    </Table>
  );
};
