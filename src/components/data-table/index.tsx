import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Fragment, JSX, useMemo, useState } from "react";
import { cn, isValidDate } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Filter as FilterIcon,
  Loader,
  Package,
  Check,
} from "lucide-react";
import { Filter } from "@/lib/types";
import { useUpdateEffect } from "ahooks";
import useEvent from "@/hooks/use-event";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean | "local";
  filters?: { label: string | (() => React.ReactNode); value: any }[];
  filterable?: boolean | "local";
  filterType?: "date" | "number";
  className?: string | ((row: T) => string);
  headerClassName?: string;
  type?: "expand" | "text";
}
interface DataTableProps<T> {
  data: T[];
  loading?: boolean;
  columns: Column<T>[];
  dataIndex: keyof T;
  className?: string;
  style?: React.CSSProperties;
  rowClassName?: string | ((row: T) => string);
  showHeader?: boolean;
  onSort?: (key: keyof T, order: "asc" | "desc") => void;
  defaultFilter?: Record<
    string,
    { min?: number | string; max?: number | string }
  >;
  children?: JSX.Element;
  onRowClick?: (e: React.MouseEvent, row: T) => void;
  onSortChange?: (
    sort: { key?: keyof T; order?: "asc" | "desc" },
    isLocal?: boolean,
  ) => void;
  onFilterChange?: (filter: Filter) => void;
  hasNextPage?: boolean;
  loadMore?: () => void;
  renderFooter?: () => JSX.Element;
}
export const DataTable = <T,>(props: DataTableProps<T>) => {
  const {
    columns,
    data,
    loading,
    className,
    style,
    rowClassName,
    dataIndex,
    showHeader = true,
    children,
    onRowClick,
    onSortChange,
    onFilterChange,
    hasNextPage = true,
    loadMore,
    defaultFilter = {},
    renderFooter,
  } = props;
  const _onSortChange = useEvent(onSortChange);
  const _onFilterChange = useEvent(onFilterChange);
  const _onRowClick = useEvent(onRowClick);
  const [expanedSet, setExpanedSet] = useState(new Set<string>());
  const [sort, setSort] = useState<{
    key?: keyof T;
    order?: "asc" | "desc";
  }>({});
  const [filter, setFilter] = useState<Filter>({ ...defaultFilter });
  const [tmpFilter, setTmpFilter] = useState<Filter["string"]>({});
  const [filterActive, setFilterActive] = useState("");
  const needPagination = useMemo(() => {
    return loadMore;
  }, [loadMore]);
  const mapping = useMemo(() => {
    return columns.reduce(
      (acc, col) => {
        if (col.key) {
          acc[col.key] = col;
        }
        return acc;
      },
      {} as Record<string, Column<T>>,
    );
  }, [columns]);

  const keys = useMemo(() => {
    return columns.map((col) => {
      return col.key;
    });
  }, [columns]);

  const list = useMemo(() => {
    let res = data ?? [];
    const isLocalSort = mapping[sort?.key as string]?.sortable === "local";
    const isLocalFilter = Object.keys(filter).some(
      (item) => mapping[item]?.filterable === "local",
    );

    if (isLocalFilter) {
      res = res.filter((record) => {
        for (const key in filter) {
          if (
            (filter[key].min !== undefined &&
              typeof filter[key].min === "number" &&
              Number(record[key as keyof T]) < filter[key].min) ||
            (filter[key].max !== undefined &&
              typeof filter[key].max === "number" &&
              Number(record[key as keyof T]) > filter[key].max) ||
            (filter[key].values !== undefined &&
              !filter[key].values.includes(String(record[key as keyof T])))
          ) {
            return false;
          }
        }
        return true;
      });
    }

    if (isLocalSort) {
      if (sort.key && sort.order && res.length > 0) {
        if (typeof res[0]?.[sort.key] === "string") {
          res.sort((a, b) => {
            if (sort.order === "asc") {
              return String(a[sort.key!]).localeCompare(String(b[sort.key!]));
            } else {
              return String(b[sort.key!]).localeCompare(String(a[sort.key!]));
            }
          });
        } else {
          res.sort((a, b) => {
            if (sort.order === "asc") {
              return a[sort.key!] < b[sort.key!] ? -1 : 1;
            } else {
              return a[sort.key!] > b[sort.key!] ? -1 : 1;
            }
          });
        }
      }
    }
    return res;
  }, [data, filter, mapping, sort.key, sort.order]);

  const onSort = (key: keyof T) => {
    if (sort.key === key) {
      setSort((prev) => ({
        ...prev,
        order: prev.order === "asc" ? "desc" : "asc",
      }));
    } else {
      setSort({ key, order: "asc" });
    }
  };

  const onOpenChange = (open: boolean, key: string) => {
    if (open) {
      setTmpFilter(filter[key] ?? {});
      setFilterActive(key);
    } else {
      setFilterActive("");
      setTmpFilter({});
    }
  };

  const removeKey = (key: string) => {
    setFilter((prev: any) => {
      const _filter = { ...prev };
      delete _filter[key];
      return _filter;
    });
  };

  const __onRowClick = (e: React.MouseEvent, item: T) => {
    _onRowClick?.(e, item);
    if (mapping.expand?.type === "expand") {
      if (expanedSet.has(String(item?.[dataIndex]))) {
        remove(String(item?.[dataIndex]));
      } else {
        add(String(item?.[dataIndex]));
      }
    }
  };

  const remove = (id: string) => {
    setExpanedSet((prev) => {
      const _set = new Set(prev);
      _set.delete(id);
      return _set;
    });
  };

  const add = (id: string) => {
    setExpanedSet((prev) => {
      const _set = new Set(prev);
      _set.add(id);
      return _set;
    });
  };

  useUpdateEffect(() => {
    _onFilterChange?.(filter);
  }, [filter, _onFilterChange]);

  useUpdateEffect(() => {
    const isLocal = mapping[sort?.key as string]?.sortable === "local";
    _onSortChange?.(sort, isLocal);
  }, [_onSortChange, sort]);

  const renderRows = () => (
    <>
      {list?.map((item, idx) => (
        <Fragment key={String(item?.[dataIndex])}>
          <TableRow
            className={
              typeof rowClassName === "string"
                ? rowClassName
                : rowClassName?.(item)
            }
            onClick={(e) => __onRowClick?.(e, item)}
          >
            {keys.map((key) => {
              const className =
                typeof mapping[key].className === "string"
                  ? mapping[key].className
                  : (mapping[key].className?.(item) ?? "");
              const type = mapping[key].type ?? "text";
              const content = item[key as keyof T];
              return (
                <TableCell key={`${String(key)}-${idx}`} className={className}>
                  {type === "expand" &&
                    (expanedSet.has(String(item?.[dataIndex])) ? (
                      <ChevronDown size="14" />
                    ) : (
                      <ChevronRight size="14" />
                    ))}
                  {(type === "text" && mapping[key].render?.(item)) ??
                    (content ? String(content) : "")}
                </TableCell>
              );
            })}
          </TableRow>
          {expanedSet.has(String(item?.[dataIndex])) && (
            // <TableRow>
            //   <TableCell colSpan={keys.length}>
            //     {mapping["expand"].render?.(item)}
            //    </TableCell>
            // </TableRow>
            <>{mapping["expand"].render?.(item)}</>
          )}
        </Fragment>
      ))}
      {children}
    </>
  );

  const addFilter = (key: string) => {
    const filterType = mapping[key]?.filterType ?? "number";
    const filters = mapping[key]?.filters ?? [];
    const isNum = filterType === "number";
    const isDate = filterType === "date";

    const handleLebelClick = (value: any) => {
      if (tmpFilter?.values?.includes(value)) {
        setTmpFilter((prev) => ({
          ...prev,
          values: prev.values?.filter((item) => item !== value) ?? [],
        }));
      } else {
        setTmpFilter((prev) => ({
          ...prev,
          values: [...(prev.values ?? []), value],
        }));
      }
    };

    const renderFilters = () => {
      return (
        <ScrollArea className="h-[min(65vh,36rem)] rounded-md">
          <div className="flex flex-col">
            {filters.map((item) => (
              <Fragment key={item.value}>
                <div
                  key={item.value}
                  onClick={() => handleLebelClick(item.value)}
                  className="text-sm"
                >
                  <Check
                    size={16}
                    className={cn(
                      "inline-block mr-2 visible",
                      tmpFilter?.values?.includes(item.value)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  {typeof item.label === "string" ? item.label : item?.label()}
                </div>
                <Separator className="my-2" />
              </Fragment>
            ))}
          </div>
        </ScrollArea>
      );
    };

    const renderOtherFilter = () => (
      <div className="flex gap-4 flex-col">
        <Label>Min</Label>
        {isNum && (
          <Input
            placeholder="Min"
            className="p-2"
            type="number"
            value={(tmpFilter.min ?? "") as string}
            onChange={(e) =>
              setTmpFilter((prev) => ({
                ...prev,
                min: Number(e.target.value),
              }))
            }
          />
        )}
        {isDate && (
          <Input
            placeholder="MM/dd/yyyy"
            className="p-2"
            type="input"
            value={tmpFilter.min ?? ""}
            onChange={(e) =>
              setTmpFilter((prev) => ({
                ...prev,
                min: e.target.value,
              }))
            }
          />
        )}
        <Label>Max</Label>
        {isNum && (
          <Input
            placeholder="Max"
            className="p-2"
            type="number"
            value={(tmpFilter.max ?? "") as string}
            onChange={(e) =>
              setTmpFilter((prev) => ({
                ...prev,
                max: Number(e.target.value),
              }))
            }
          />
        )}
        {isDate && (
          <Input
            placeholder="MM/dd/yyyy"
            className="p-2"
            type="input"
            value={tmpFilter.max ?? ""}
            onChange={(e) =>
              setTmpFilter((prev) => ({
                ...prev,
                max: e.target.value,
              }))
            }
          />
        )}
      </div>
    );
    return (
      <Popover
        open={filterActive === key}
        onOpenChange={(vis) => onOpenChange(vis, key)}
      >
        <PopoverTrigger asChild className="cursor-pointer">
          <FilterIcon
            size={16}
            className={cn(
              "inline-block",
              key in filter &&
                JSON.stringify(filter[key]) !=
                  JSON.stringify(defaultFilter[key])
                ? "fill-current"
                : "",
            )}
          />
        </PopoverTrigger>
        <PopoverContent className="w-96">
          <div>
            {filters?.length > 0 ? renderFilters() : renderOtherFilter()}
            <div className="flex justify-end mt-4">
              <Button
                className="btn"
                size="sm"
                variant="outline"
                onClick={() => {
                  removeKey(key);
                  setTmpFilter({});
                  setFilterActive("");
                }}
              >
                Clear
              </Button>
              <Button
                className="btn btn-primary ml-2"
                size="sm"
                disabled={
                  isDate &&
                  ((tmpFilter.min !== undefined &&
                    !isValidDate(tmpFilter.min)) ||
                    (tmpFilter.max !== undefined &&
                      !isValidDate(tmpFilter.max)))
                }
                onClick={() => {
                  setFilterActive("");
                  setFilter((prev) => ({
                    ...prev,
                    [key]: {
                      ...prev?.[key],
                      ...tmpFilter,
                    },
                  }));
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderHeader = (
    type: string,
    label: string,
    key: string,
    headerClassName: string | undefined,
    filterable: boolean | "local" = false,
    sortable: boolean | "local" = true,
  ): JSX.Element => {
    const text = (
      <span key={key} className={cn(sort.key === key && "text-blue-500")}>
        {label}
      </span>
    );
    return (
      <TableHead
        className={cn(
          "text-nowrap sticky top-0 bg-white",
          headerClassName ?? "",
        )}
        key={key}
      >
        {text}
        {type === "text" && sortable && (
          <div
            className="inline-flex flex-col align-middle ml-1"
            onClick={() => onSort(key as keyof T)}
          >
            <ChevronUp
              size={12}
              className={cn(
                "cursor-pointer",
                sort.key === key && sort.order === "asc"
                  ? "stroke-blue-500 fill-blue-500"
                  : "",
              )}
            />
            <ChevronDown
              size={12}
              className={cn(
                "cursor-pointer",
                sort.key === key && sort.order === "desc"
                  ? "stroke-blue-500 fill-blue-500"
                  : "",
              )}
            />
          </div>
        )}
        {type === "text" && filterable ? addFilter(key) : null}
      </TableHead>
    );
  };

  const renderHeaders = () => (
    <TableHeader>
      <TableRow key="header" className="sticky top-0 drop-shadow-md">
        {keys.map((key) => {
          const col = mapping[key];
          return renderHeader(
            col.type ?? "text",
            col.label,
            String(col.key),
            col.headerClassName,
            col.filterable,
            col.sortable,
          );
        })}
      </TableRow>
    </TableHeader>
  );

  const renderObserver = () => {
    return (
      <TableRow>
        <TableCell
          className="text-center"
          colSpan={keys.length}
          ref={(el) => {
            if (el) {
              const observer = new IntersectionObserver(
                ([entry]) => {
                  if (entry.isIntersecting && hasNextPage) {
                    loadMore?.();
                  }
                },
                { threshold: [0.5, 1] },
              );

              observer.observe(el);
              return () => {
                observer.disconnect();
              };
            }
          }}
        >
          {" "}
          {hasNextPage ? "Loading" : `That's all data!`}
        </TableCell>
      </TableRow>
    );
  };

  if (!showHeader) {
    return renderRows();
  }

  return (
    <Table className={cn(className)} style={style}>
      {renderHeaders()}

      <TableBody>
        {data?.length === 0 ? (
          <TableRow className="hover:bg-[none]">
            <TableCell className="text-center" colSpan={keys.length}>
              {loading ? (
                <div className="absolute flex-1 flex items-center justify-center flex-col gap-2 top-0 right-0 bottom-0 left-0">
                  <Loader className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="absolute flex-1 flex items-center justify-center flex-col gap-2 top-[4rem] right-0 bottom-0 left-0">
                  <Package className="size-12 text-muted-foreground-900" />
                </div>
              )}
            </TableCell>
          </TableRow>
        ) : (
          <>
            {renderRows()}
            {needPagination && renderObserver()}
          </>
        )}
      </TableBody>
      {!loading && !!data.length && renderFooter?.()}
    </Table>
  );
};
