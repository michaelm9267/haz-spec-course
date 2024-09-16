import React, { useState } from 'react'
import "../Styles/tables.css"
import "../Styles/hazTables.css"
import HC from "../data-file/hazardClasses.json"

const HazTables = ({ hazData, setSelectedItem }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);  // Default is 25
    const [currentPage, setCurrentPage] = useState(1);  // Current page number
    const [inputPage, setInputPage] = useState('');  // For direct page input

    // Calculate the indices for the current page
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = hazData.HazData.slice(indexOfFirstRow, indexOfLastRow);

    // Handle page change
    const handlePageChange = (e) => {
        const selectedPage = parseInt(e.target.value);
        setCurrentPage(selectedPage);
        setInputPage(selectedPage);  // Keep input field in sync
    };

    // Handle rows per page change
    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(parseInt(e.target.value));
        setCurrentPage(1);  // Reset to the first page when rows per page changes
        setInputPage(1);  // Reset input field to page 1
    };

    // Handle input field for direct page change
    const handleInputChange = (e) => {
        const value = e.target.value;
        if (value === '' || (!isNaN(value) && value <= totalPages && value >= 1)) {
            setInputPage(value);  // Allow empty value for deletion
        }
    };

    const handleInputSubmit = (e) => {
        if ((e.key === 'Enter' || e.type === 'blur') && inputPage) {
            const parsedPage = parseInt(inputPage, 10);
            if (parsedPage >= 1 && parsedPage <= totalPages) {
                setCurrentPage(parsedPage);
            }
        }
    };

    // Calculate total pages
    const totalPages = Math.ceil(hazData.HazData.length / rowsPerPage);

    return (
        <>
            <div className='tabs'>
                <div className='tab' onClick={() => setActiveTab(0)}>Item Table A4.1</div>
                <div className='tab' onClick={() => setActiveTab(1)}>Special Provisions A4.1</div>
                <div className='tab' onClick={() => setActiveTab(2)}>Hazardous Substances and Reportable Quantities Table A4.3</div>
            </div>
            <div className='tab-content'>
                {activeTab === 0 && (
                    <div>
                        <div className='table-header'>
                            <h4>Symbol</h4>
                            <h4>UN/ID Number</h4>
                            <h4>Proper Shipping Name</h4>
                            <h4>Hazard Class</h4>
                            <h4>Subsidiary Hazard Class</h4>
                            <h4>Packing Group</h4>
                            <h4>Special Provisions</h4>
                            <h4>Packing Paragraph</h4>
                        </div>
                        {currentRows.map((item, index) => (
                            <div key={index} className='table-row'>
                                <p>{item.TN}</p>
                                <p onClick={() => setSelectedItem(item)}>{item.UN}</p>
                                <p onClick={() => setSelectedItem(item)}>{item.PSN}</p>
                                <p>
                                {item.Class ? `${item.Class} / `: ""}
  {HC.HazardClasses.find((classItem) => classItem.Class === item.Class)?.Name || ""}
</p>
                                <p>
  {item.SubClass ? `${item.SubClass} / `: ""}
  {HC.HazardClasses.find((classItem) => classItem.Class === item.SubClass)?.Name || ""}
</p>
                                <p>{item.PG}</p>
                                <p>{item.SpecProv}</p>
                                <p>{item.PackingPara}</p>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 1 && <div>Content for Special Provisions A4.1</div>}
                {activeTab === 2 && <div>Content for Hazardous Substances and Reportable Quantities Table A4.3</div>}
            </div>

            {/* Pagination Controls */}
            <div className='pagination-controls'>
                <label htmlFor="rowsPerPage">Rows per page:</label>
                <select id="rowsPerPage" value={rowsPerPage} onChange={handleRowsPerPageChange}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>

                <div className='pagination-dropdown'>
                    <label htmlFor="pageSelect">Page:</label>
                    <select id="pageSelect" value={currentPage} onChange={handlePageChange}>
                        {[...Array(totalPages).keys()].map(pageNumber => (
                            <option key={pageNumber + 1} value={pageNumber + 1}>
                                {pageNumber + 1}
                            </option>
                        ))}
                    </select>
                </div>

                <div className='pagination-input'>
                    <label htmlFor="pageInput">Go to page:</label>
                    <input
                        id="pageInput"
                        type="number"
                        value={inputPage || ''}
                        min={1}
                        max={totalPages}
                        onChange={handleInputChange}
                        onKeyPress={handleInputSubmit}
                        onBlur={handleInputSubmit}
                    />
                </div>
            </div>
        </>
    );
}

export default HazTables;
