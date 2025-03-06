import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import * as pdfjsLib from "pdfjs-dist";

// 📌 Debugging Log Function
const debugLog = (message, data) => {
  console.log(`🛠️ ${message}:`, data);
};

// 📌 Spinner Component
const Spinner = () => (
  <div style={{ textAlign: "center", padding: "10px" }}>
    <div className="spinner" style={{
      width: "40px",
      height: "40px",
      border: "5px solid rgba(0,0,0,0.1)",
      borderTop: "5px solid blue",
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    }}></div>
  </div>
);

const EditableTable = ({ pdfDoc, box, onTableChange }) => {
  const [tableData, setTableData] = useState([]);
  const [rowPositions, setRowPositions] = useState([]);
  const [colPositions, setColPositions] = useState([]);
  const [loading, setLoading] = useState(true); // Track loading state

  debugLog("📌 Rendering EditableTable with pdfDoc:", pdfDoc);
  debugLog("📌 Received box details:", box);

  // 📌 Always call `useEffect()` first
  useEffect(() => {
    if (!pdfDoc || !box || typeof box.page === "undefined") {
      debugLog("⚠️ Missing pdfDoc or box.page", { pdfDoc, box });
      setLoading(false);
      return;
    }

    let isMounted = true;

    const extractTableFromPdf = async () => {
      try {
        debugLog("📄 Getting page", box.page);
        const page = await pdfDoc.getPage(box.page);
        debugLog("✅ Page loaded successfully!");

        debugLog("🔍 Extracting text content within the table region...");
        const textContent = await page.getTextContent();

        if (!textContent.items.length) {
          debugLog("⚠️ No text found in the page.");
          return;
        }

        // 🔍 Extract relevant text inside the selected box region
        const extractedRows = textContent.items
          .map((item) => ({
            text: item.str.trim(),
            x: item.transform[4], // X-coordinate in PDF
            y: item.transform[5], // Y-coordinate in PDF
          }))
          .filter((item) => 
            item.x >= box.x &&
            item.x <= box.x + box.width &&
            item.y >= box.y &&
            item.y <= box.y + box.height
          );

        if (extractedRows.length === 0) {
          debugLog("⚠️ No text found inside the selected table region.");
          return [];
        }

        debugLog("🔍 Extracted text items inside box", extractedRows);

        // 📌 Sort items by y-position (to form rows) and then by x-position (columns)
        extractedRows.sort((a, b) => b.y - a.y || a.x - b.x);

        // 📌 Group into rows based on y-coordinates
        const rows = [];
        let currentRow = [];
        let previousY = extractedRows[0].y;

        extractedRows.forEach((item) => {
          if (Math.abs(item.y - previousY) < 5) {
            currentRow.push(item.text);
          } else {
            rows.push(currentRow);
            currentRow = [item.text];
            previousY = item.y;
          }
        });

        if (currentRow.length > 0) rows.push(currentRow);

        debugLog("✅ Final extracted table", rows);

        if (isMounted) {
          setTableData(rows);
          // Compute row and column positions dynamically
          const rowCount = rows.length;
          const colCount = rows[0]?.length || 1;
          setRowPositions(Array.from({ length: rowCount }, (_, i) => (i * box.height) / rowCount));
          setColPositions(Array.from({ length: colCount }, (_, i) => (i * box.width) / colCount));
        }
      } catch (error) {
        console.error("❌ Error extracting table:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    extractTableFromPdf();

    return () => {
      isMounted = false; // Cleanup effect
    };
  }, [pdfDoc, box]);

  // 📌 Conditional rendering is handled AFTER `useEffect`
  if (!box || !box.containsTable) {
    return <div style={{ padding: "10px", color: "gray" }}>No table detected.</div>;
  }

  if (loading) {
    return <Spinner />;
  }

  return (
    <div
      style={{
        position: "relative",
        width: `${box.width}px`,
        height: `${box.height}px`,
        border: "1px solid black",
      }}
    >
      {/* Draw detected row lines */}
      {rowPositions.map((y, index) => (
        index > 0 && (
          <div
            key={`row-${index}`}
            style={{
              position: "absolute",
              top: `${y}px`,
              left: "0",
              width: "100%",
              height: "1px",
              backgroundColor: "black",
            }}
          />
        )
      ))}

      {/* Draw detected column lines */}
      {colPositions.map((x, index) => (
        index > 0 && (
          <div
            key={`col-${index}`}
            style={{
              position: "absolute",
              left: `${x}px`,
              top: "0",
              height: "100%",
              width: "1px",
              backgroundColor: "black",
            }}
          />
        )
      ))}

      {/* Render extracted table cells */}
      {tableData.map((row, rowIndex) => (
        row.map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            style={{
              position: "absolute",
              top: `${rowPositions[rowIndex]}px`,
              left: `${colPositions[colIndex]}px`,
              width: `${colPositions[colIndex + 1] - colPositions[colIndex]}px`,
              height: `${rowPositions[rowIndex + 1] - rowPositions[rowIndex]}px`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "white",
            }}
          >
            <input
              type="text"
              value={cell || ""}
              onChange={(e) => {
                const updatedTable = [...tableData];
                updatedTable[rowIndex][colIndex] = e.target.value;
                setTableData(updatedTable);
              }}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                outline: "none",
                textAlign: "center",
                backgroundColor: "transparent",
              }}
            />
          </div>
        ))
      ))}
    </div>
  );
};

EditableTable.propTypes = {
  pdfDoc: PropTypes.object,
  box: PropTypes.shape({
    containsTable: PropTypes.bool,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    page: PropTypes.number,
  }).isRequired,
  onTableChange: PropTypes.func.isRequired,
};

export default EditableTable;
