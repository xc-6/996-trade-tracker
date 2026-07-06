"use client";
import { Column, DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { useGetBuyRecords } from "../hooks/use-get-buy-records";
import { useDeleteBuyRecord } from "../hooks/use-delete-buy-record";
import { useActiveAccounts } from "@/features/account/hooks/use-active-accounts";
import { format } from "date-fns";
import { usePanel } from "../hooks/use-panel";
import { useMemo, useState, memo } from "react";
import { Trash2, MoveDown, MoveUp, Pencil, PackageMinus } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { cn, numberFormatter } from "@/lib/utils";
import { useStocksState } from "@/features/stock/store/use-stocks-store";
import { ResponseType } from "../hooks/use-get-buy-records";

import { useModal } from "@/hooks/use-modal-store";
import { unsoldAmount, stockCode as defaultStockCode } from "../deafult";
import { StockInfo, Sort, Filter } from "@/lib/types";
import { useUpdateLayoutEffect } from "ahooks";
import { useBuyRecordState } from "../store/use-buy-record-store";
import { useGetStockcodes } from "../../stock/hooks/use-get-stockcodes";

type BuyRecord = ResponseType["data"][0] &
  StockInfo & {
    price: number;
    unrealized: number;
    total: number;
    marketValue: number;
    totalCost: number;
    totalAmount: number;
    totalUnrealized: number;
    totalPercent: number;
    accountName: string;
    up: boolean;
  };
interface BuyRecordTableProps {
  showHeader?: boolean;
  stockCode?: Array<string>;
  fetchAll?: boolean;
  style?: React.CSSProperties;
}
const Table = memo(DataTable<BuyRecord>);

const _defaultFilter = { unsoldAmount, stockCode: defaultStockCode };
export const BuyRecordTable = ({
  showHeader = true,
  fetchAll = false,
  stockCode,
  ...props
}: BuyRecordTableProps = {}) => {
  const { onOpen } = useModal();
  const { setBuyRecord } = useBuyRecordState();
  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "You are about to delete this record.",
  );
  const { onSelect, id: recordId } = usePanel();
  const { stocksState } = useStocksState();
  const { activeIds, mapping } = useActiveAccounts();
  const removeMutation = useDeleteBuyRecord();
  const [filter, setFilter] = useState<Filter>({ ..._defaultFilter });
  const [filterStockCode, setFilterStockCode] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>({
    key: "buyDate",
    order: "desc",
  });
  const _fetchAll = useMemo(() => {
    if (fetchAll || !!recordId) {
      return true;
    } else if (Object.keys(filter).length === 0) {
      return true;
    }
    return false;
  }, [fetchAll, filter, recordId]);
  const { data: stockcodes } = useGetStockcodes(activeIds ?? []);
  const { data, status, fetchNextPage, hasNextPage } = useGetBuyRecords({
    accountIds: activeIds ?? [],
    filter,
    sort,
    stockCode: filterStockCode.length > 0 ? filterStockCode : stockCode,
    showSold: false,
    fetchAll: _fetchAll,
  });

  const isLoading = status == "pending";

  const columns: Array<Column<BuyRecord>> = [
    {
      key: "placeholder",
      label: "",
      className: cn(showHeader && "w-[20px]"),
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
      render: (item) => (
        <span id={`buyRecord-${item._id}`}>{item.name ?? ""}</span>
      ),
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
      key: "unrealized",
      label: "Unrealized P&L",
      className: ({ unrealized }) =>
        cn(unrealized > 0 ? "text-red-500 font-bold" : "text-green-500"),
      render: (item) => (
        <>
          {numberFormatter((item.price - item.buyPrice) * item.unsoldAmount)}{" "}
          <span className="text-sm">({item.unrealized.toFixed(2)}%)</span>
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
      render: (item) => numberFormatter(item.marketValue),
      sortable: "local",
    },
    {
      key: "totalCost",
      label: "Total Cost",
      render: (item) => numberFormatter(item.totalCost),
      sortable: "local",
    },
    {
      key: "unsoldAmount",
      label: "Unsold Amount",
      filterable: true,
      render: (item) =>
        item.unsoldAmount.toLocaleString("en-US", { maximumFractionDigits: 4 }),
      className: "font-bold text-muted-foreground",
    },
    {
      key: "buyAmount",
      label: "Buy Amount",
      render: (item) =>
        item.buyAmount.toLocaleString("en-US", { maximumFractionDigits: 4 }),
    },
    {
      key: "profitLoss",
      label: "Realized P&L",
      render: (item) => numberFormatter(item.profitLoss),
    },
    {
      key: "accountName",
      label: "Account",
      sortable: "local",
    },
    {
      key: "buyDate",
      label: "Buy Date",
      render: (item) => format(new Date(item.buyDate), "PPP"),
      filterable: true,
      filterType: "date",
    },
    {
      key: "action",
      label: "Action",
      sortable: false,
      className: "flex flex-row gap-2 items-center",
      render: (record: BuyRecord) => (
        <>
          <PackageMinus
            size={16}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={(e) => onSell(e, record)}
          />
          <Pencil
            size={16}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={(e) => onEdit(e, record)}
          />
          <Trash2
            size={16}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={(e) => onDelete(e, record._id)}
          />
        </>
      ),
    },
  ];

  const list = useMemo(() => {
    if (isLoading) {
      return [];
    }
    const totalList = data?.pages.flatMap((page) => page.data) ?? [];
    const res =
      totalList.map((record) => ({
        ...record,
        unrealized: Number(
          (
            (((stocksState?.get(record.stockCode)?.now ?? record.buyPrice) -
              record.buyPrice) /
              record.buyPrice) *
            100
          ).toFixed(2),
        ),
        name: stocksState?.get(record.stockCode)?.name,
        percent: (stocksState?.get(record.stockCode)?.percent ?? 0) * 100,
        price: stocksState?.get(record.stockCode)?.now ?? record.buyPrice,
        high: stocksState?.get(record.stockCode)?.high ?? "N/A",
        low: stocksState?.get(record.stockCode)?.low ?? "N/A",
        yesterday: stocksState?.get(record.stockCode)?.yesterday ?? "N/A",
        marketValue:
          (stocksState?.get(record.stockCode)?.now ?? record.buyPrice) *
          record.unsoldAmount,
        totalCost: record.buyPrice * record.unsoldAmount,
        accountName: mapping[record.accountId]?.name,
        up: (stocksState?.get(record.stockCode)?.percent ?? 0) >= 0,
      })) ?? [];
    return res as unknown as BuyRecord[];
  }, [data, isLoading, stocksState, mapping]);

  useUpdateLayoutEffect(() => {
    if (recordId && list?.length) {
      const ele = document?.getElementById(`buyRecord-${recordId}`);
      ele?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [list, recordId]);

  const onSortChangeHandler = async (sort: Sort, fetchSort?: boolean) => {
    if (fetchSort) {
      setSort({});
    } else {
      setSort(sort);
    }
  };

  const onDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const ok = await confirm();

    if (ok) {
      removeMutation.mutate({ id });
    }
  };

  const onEdit = (e: React.MouseEvent, buyRecord: BuyRecord) => {
    e.stopPropagation();
    onOpen("editBuyRecord", { buyRecord });
  };

  const onSell = (e: React.MouseEvent, buyRecord: BuyRecord) => {
    e.stopPropagation();
    setBuyRecord(buyRecord);
    onOpen("createSellRecord", { buyRecordId: buyRecord?._id });
  };

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

  return (
    <Table
      defaultFilter={{ ..._defaultFilter }}
      data={list}
      loading={isLoading}
      showHeader={showHeader}
      columns={columns}
      dataIndex="_id"
      className="mb-2"
      rowClassName={(item) =>
        cn(
          "group",
          !showHeader && "bg-secondary/80 hover:bg-secondary text-sm",
          showHeader && "p-0",
          recordId === item._id &&
            "outline-dashed outline-1 outline-offset-1 outline-blue-500",
        )
      }
      onRowClick={(_, item) => onSelect(item._id)}
      hasNextPage={hasNextPage}
      loadMore={fetchNextPage}
      onFilterChange={(_filter) => handleFilterChange(_filter)}
      onSortChange={onSortChangeHandler}
      {...props}
    >
      <ConfirmDialog />
    </Table>
  );
};
