import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Loader2,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

export interface Column<T> {
  key?: keyof T | string;
  header: string;
  accessor?: keyof T | ((item: T) => React.ReactNode);
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor?: (item: T) => string | number;
  // Server-side pagination
  total?: number;
  page?: number;
  pageSize?: number;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSearch?: (search: string) => void;
  searchPlaceholder?: string;
  // Client-side options
  searchable?: boolean;
  searchKey?: keyof T;
  pagination?: boolean;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  total,
  page: controlledPage,
  pageSize: controlledPageSize = 10,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onSearch,
  searchPlaceholder = 'Search…',
  searchable = true,
  searchKey,
  pagination = true,
  onRowClick,
  actions,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState('');
  const [displaySearch, setDisplaySearch] = useState('');
  const [localPage, setLocalPage] = useState(1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isServerSide = typeof total === 'number';

  // 300 ms debounced search
  const handleSearch = useCallback(
    (val: string) => {
      setDisplaySearch(val);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setLocalSearch(val);
        setLocalPage(1);
        onSearch?.(val);
      }, 300);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const filteredData = isServerSide
    ? data
    : data.filter((item) => {
        if (!searchable || !searchKey || !localSearch) return true;
        const val = item[searchKey];
        return typeof val === 'string' && val.toLowerCase().includes(localSearch.toLowerCase());
      });

  const currentPage = isServerSide ? (controlledPage ?? 1) : localPage;
  const totalCount = isServerSide ? total! : filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / controlledPageSize));

  const paginatedData = isServerSide
    ? filteredData
    : pagination
    ? filteredData.slice((localPage - 1) * controlledPageSize, localPage * controlledPageSize)
    : filteredData;

  const handlePageChange = (p: number) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    setLocalPage(clamped);
    onPageChange?.(clamped);
  };

  const renderCell = (col: Column<T>, item: T) => {
    if (col.render) return col.render(item);
    if (col.accessor) {
      if (typeof col.accessor === 'function') return col.accessor(item);
      return item[col.accessor as keyof T] as React.ReactNode;
    }
    if (col.key) return item[col.key as keyof T] as React.ReactNode;
    return null;
  };

  const from = totalCount === 0 ? 0 : (currentPage - 1) * controlledPageSize + 1;
  const to = Math.min(currentPage * controlledPageSize, totalCount);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {searchable && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50 flex-wrap">
          <div className="relative min-w-0 flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={displaySearch}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-blue-500 dark:text-white transition-all"
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0">
            {totalCount} total
          </div>
        </div>
      )}

      {/* Desktop table — hidden on mobile */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn('px-6 py-4 font-medium tracking-wider', col.className)}
                >
                  {col.header}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-4 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  No results found
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr
                  key={keyExtractor ? keyExtractor(item) : idx}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'bg-white dark:bg-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col, i) => (
                    <td
                      key={i}
                      className={cn('px-6 py-4 text-gray-700 dark:text-gray-300', col.className)}
                    >
                      {renderCell(col, item)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div onClick={(e) => e.stopPropagation()}>
                        {actions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards — hidden on sm+ */}
      <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
            No results found
          </div>
        ) : (
          paginatedData.map((item, idx) => (
            <div
              key={keyExtractor ? keyExtractor(item) : idx}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'p-4 bg-white dark:bg-gray-800 space-y-2',
                onRowClick && 'cursor-pointer active:bg-gray-50'
              )}
            >
              {columns.map((col, i) => (
                <div key={i} className="flex justify-between gap-2 text-sm">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide shrink-0">
                    {col.header}
                  </span>
                  <span className="text-gray-800 dark:text-gray-200 text-right">
                    {renderCell(col, item)}
                  </span>
                </div>
              ))}
              {actions && (
                <div
                  className="pt-2 flex justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actions(item)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-between flex-wrap gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-medium">{from}</span>–
            <span className="font-medium">{to}</span> of{' '}
            <span className="font-medium">{totalCount}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-1 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 min-w-[32px] min-h-[32px]"
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 min-w-[32px] min-h-[32px]"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 min-w-[32px] min-h-[32px]"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 min-w-[32px] min-h-[32px]"
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
          {onPageSizeChange && (
            <select
              value={controlledPageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white"
            >
              {[10, 20, 50].map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
