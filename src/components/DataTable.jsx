import React from "react";

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Paginated, filterable table. Paging/filter state is owned by the parent so it
 * can be stored in the URL.
 */
const DataTable = ({
  columns,
  rows,
  getRowKey,
  onRowClick,
  isRowClickable = () => Boolean(onRowClick),
  filter,
  onFilterChange,
  filterPlaceholder,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <div className="data-table">
      <div className="table-toolbar">
        <input
          type="search"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder={filterPlaceholder}
          aria-label={filterPlaceholder}
        />
        <span className="row-count">
          {rows.length.toLocaleString()} {rows.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="empty">
                  No entries match your filter.
                </td>
              </tr>
            )}
            {pageRows.map((row, i) => {
              const clickable = isRowClickable(row);
              return (
                <tr
                  key={getRowKey(row, start + i)}
                  className={clickable ? "clickable" : "muted"}
                  onClick={clickable ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls">
        <label>
          Rows per page
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="pager">
          <button onClick={() => onPageChange(1)} disabled={currentPage === 1} aria-label="First page">
            «
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          <label>
            Page
            <select value={currentPage} onChange={(e) => onPageChange(Number(e.target.value))}>
              {Array.from({ length: totalPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
            of {totalPages}
          </label>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            ›
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
