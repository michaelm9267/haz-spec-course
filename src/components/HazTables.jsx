import React, { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DataTable from "./DataTable";
import { useRegulation } from "../regulations/RegulationContext";
import "../Styles/tables.css";

const includes = (field, q) => (field || "").toLowerCase().includes(q);

const preLine = (text) => <span className="pre-line">{text}</span>;

const buildTabs = (config, data) => [
  {
    key: "items",
    label: config.tabs.items,
    rows: data.items,
    filterPlaceholder: "Filter by ID number, name or class",
    getRowKey: (row) => row.id,
    filterRow: config.filterItem,
    columns: config.itemColumns,
    clickable: (row) => Boolean(row.un || row.hazardClass),
  },
  {
    key: "provisions",
    label: config.tabs.provisions,
    rows: data.provisions,
    filterPlaceholder: "Filter by code or text",
    getRowKey: (row) => row.code,
    filterRow: (row, q) => includes(row.code, q) || includes(row.details, q),
    columns: [
      { key: "code", header: "Code", width: "6rem" },
      { key: "details", header: "Details", render: (row) => preLine(row.details) },
    ],
  },
  {
    key: "substances",
    label: config.tabs.substances,
    rows: data.substances,
    filterPlaceholder: "Filter by substance",
    getRowKey: (row, index) => `${row.substance}|${index}`,
    filterRow: (row, q) => includes(row.substance, q),
    columns: [
      { key: "substance", header: "Hazardous Substance" },
      { key: "lbs", header: "RQ (lbs)", width: "8rem" },
      { key: "kg", header: "RQ (kg)", width: "8rem" },
    ],
  },
];

const HazTables = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { key, config, data } = useRegulation();

  const tabs = useMemo(() => buildTabs(config, data), [config, data]);
  const tab = tabs.find((t) => t.key === params.get("tab")) || tabs[0];
  const filter = params.get("q") || "";
  const page = Number(params.get("page")) || 1;
  const pageSize = Number(params.get("size")) || 25;
  const noMatch = params.get("nomatch") === "1";

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    next.delete("nomatch");
    Object.entries(changes).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === null) next.delete(k);
      else next.set(k, v);
    });
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => {
    const q = filter.toLowerCase().trim();
    return q ? tab.rows.filter((row) => tab.filterRow(row, q)) : tab.rows;
  }, [tab, filter]);

  return (
    <div className="haz-tables">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab.key}
            className={`tab${t.key === tab.key ? " active" : ""}`}
            onClick={() => updateParams({ tab: t.key === "items" ? undefined : t.key, page: undefined, q: undefined })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {noMatch && (
        <p className="note">
          No exact {config.name} entry matched the item you were viewing, so the table is filtered by its ID
          number or name instead.
        </p>
      )}

      <DataTable
        columns={tab.columns}
        rows={rows}
        getRowKey={tab.getRowKey}
        onRowClick={tab.clickable ? (row) => navigate(`/${key}/item/${row.id}`) : undefined}
        isRowClickable={tab.clickable || (() => false)}
        filter={filter}
        onFilterChange={(q) => updateParams({ q, page: undefined })}
        filterPlaceholder={tab.filterPlaceholder}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => updateParams({ page: p === 1 ? undefined : p })}
        onPageSizeChange={(size) => updateParams({ size, page: undefined })}
      />

      <p className="source-note">
        {data.sourceNote} This is a study and reference aid, not the official regulation.
      </p>
    </div>
  );
};

export default HazTables;
