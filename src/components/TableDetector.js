import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

// Debug logging function with emoji for visibility
const debugLog = (message, data) => {
  console.log(`🔍 TableDetector: ${message}`, data);
};

const TableDetector = ({ pdfDoc, onTablesDetected, setTaggedElements }) => {
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    if (!pdfDoc) {
      debugLog("No PDF document available for table detection");
      return;
    }

    if (!pdfDoc.numPages) {
      debugLog("PDF document has no pages");
      return;
    }

    const detectTables = async () => {
      try {
        setIsDetecting(true);
        debugLog("Starting table detection...");
        
        const numPages = pdfDoc.numPages;
        let detectedTables = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          debugLog(`Processing page ${pageNum}...`);
          
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const viewport = page.getViewport({ scale: 1.5 });

          if (!textContent.items || textContent.items.length === 0) {
            debugLog(`No text found on page ${pageNum}. Skipping...`);
            continue;
          }

          // Group text items into rows based on y-coordinate proximity
          const rowGroups = groupTextIntoRows(textContent.items);
          
          // Further analyze rows to detect potential tables
          const potentialTables = findPotentialTables(rowGroups, viewport);
          
          // Add page number to each table
          const tablesWithPage = potentialTables.map((table, index) => ({
            ...table,
            page: pageNum,
            id: `table-auto-${pageNum}-${index}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          }));
          
          detectedTables = [...detectedTables, ...tablesWithPage];
        }

        debugLog("Table detection complete", { 
          tablesFound: detectedTables.length,
          tables: detectedTables
        });
        
        // Only add tables if we found any
        if (detectedTables.length > 0) {
          // First notify about the detected tables
          onTablesDetected(detectedTables);
          
          // Then update the tagged elements, but avoid duplicates by checking positions
          setTaggedElements((prev) => {
            // Filter existing tables to avoid duplicate detection
            const existingTablePositions = prev
              .filter(item => item.type === 'table')
              .map(table => ({ 
                page: table.page, 
                x: Math.round(table.x), 
                y: Math.round(table.y) 
              }));
            
            // Only add new tables that don't closely match existing ones
            const newTables = detectedTables.filter(newTable => {
              // Check if this table already exists at a similar position
              return !existingTablePositions.some(existingPos => 
                existingPos.page === newTable.page &&
                Math.abs(existingPos.x - Math.round(newTable.x)) < 20 &&
                Math.abs(existingPos.y - Math.round(newTable.y)) < 20
              );
            });
            
            if (newTables.length > 0) {
              console.log(`Adding ${newTables.length} new tables to tagged elements`);
              return [...prev, ...newTables];
            }
            
            return prev;
          });
        }
      } catch (error) {
        console.error("Error detecting tables:", error);
      } finally {
        setIsDetecting(false);
      }
    };

    // Group text items into rows based on y-coordinate proximity
    const groupTextIntoRows = (textItems) => {
      if (!textItems.length) return [];
      
      // Sort items by y-coordinate (vertically)
      const sortedItems = [...textItems].sort((a, b) => b.transform[5] - a.transform[5]);
      
      const rows = [];
      let currentRow = [sortedItems[0]];
      let prevY = sortedItems[0].transform[5];

      // Group items with similar y-coordinates
      for (let i = 1; i < sortedItems.length; i++) {
        const item = sortedItems[i];
        const y = item.transform[5];
        
        // If this item is close to the previous one, add to the current row
        if (Math.abs(y - prevY) < 8) {
          currentRow.push(item);
        } else {
          // Otherwise, start a new row
          rows.push([...currentRow]);
          currentRow = [item];
          prevY = y;
        }
      }
      
      // Add the last row
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      
      // Sort each row by x-coordinate (horizontally)
      return rows.map(row => row.sort((a, b) => a.transform[4] - b.transform[4]));
    };

    // Find potential tables by analyzing text patterns
    const findPotentialTables = (rows, viewport) => {
      const potentialTables = [];
      
      // Only consider rows with 2+ items as potential table rows
      const tableRows = rows.filter(row => row.length >= 2);
      
      // Minimum number of similar rows to be considered a table
      const MIN_SIMILAR_ROWS = 2;
      
      // Process rows to find groups of similar rows (potential tables)
      let currentTableRows = [];
      let prevRowLength = 0;
      
      for (let i = 0; i < tableRows.length; i++) {
        const row = tableRows[i];
        
        // Check if this row has a similar structure to the previous one
        const isSimilarToLast = (
          // Similar number of columns
          Math.abs(row.length - prevRowLength) <= 1 &&
          // Within reasonable distance
          (i > 0 && Math.abs(row[0].transform[5] - tableRows[i-1][0].transform[5]) < 40)
        );
        
        if (isSimilarToLast || currentTableRows.length === 0) {
          currentTableRows.push(row);
          prevRowLength = row.length;
        } else {
          // Process completed table group
          if (currentTableRows.length >= MIN_SIMILAR_ROWS) {
            const tableInfo = extractTableInfo(currentTableRows, viewport);
            potentialTables.push(tableInfo);
          }
          
          // Start a new group
          currentTableRows = [row];
          prevRowLength = row.length;
        }
      }
      
      // Check the last group
      if (currentTableRows.length >= MIN_SIMILAR_ROWS) {
        const tableInfo = extractTableInfo(currentTableRows, viewport);
        potentialTables.push(tableInfo);
      }
      
      return potentialTables;
    };

    // Extract table dimensions and properties from a group of rows
    const extractTableInfo = (tableRows, viewport) => {
      // Get the bounds of the table
      let minX = Infinity;
      let maxX = 0;
      let minY = Infinity;
      let maxY = 0;
      let maxCols = 0;
      
      // Calculate the table boundaries
      tableRows.forEach(row => {
        if (row.length > maxCols) maxCols = row.length;
        
        // Find min and max coordinates
        row.forEach(item => {
          const x = item.transform[4];
          const y = item.transform[5];
          const width = item.width || 20;
          const height = item.height || 10;
          
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x + width);
          minY = Math.min(minY, y - height);
          maxY = Math.max(maxY, y);
        });
      });
      
      // Add some padding
      minX = Math.max(0, minX - 5);
      minY = Math.max(0, minY - 5);
      maxX = maxX + 5;
      maxY = maxY + 5;
      
      // Calculate dimensions in viewport coordinates
      const scaleFactor = viewport.scale;
      const adjustedX = minX * scaleFactor;
      const adjustedY = viewport.height - maxY * scaleFactor;
      const adjustedWidth = (maxX - minX) * scaleFactor;
      const adjustedHeight = (maxY - minY) * scaleFactor;
      
      // Make a rough estimate of row/column structure
      const rowCount = tableRows.length;
      const colCount = maxCols;
      
      // Generate column positions
      const colPositions = Array.from({ length: colCount + 1 }, (_, i) => 
        (i * adjustedWidth) / colCount
      );
      
      // Generate row positions
      const rowPositions = Array.from({ length: rowCount + 1 }, (_, i) => 
        (i * adjustedHeight) / rowCount
      );
      
      return {
        type: "table",
        tag: "Table",
        name: `Table with ${rowCount} rows, ${colCount} columns`,
        x: adjustedX,
        y: adjustedY,
        width: adjustedWidth,
        height: adjustedHeight,
        rowCount,
        colCount,
        rowPositions,
        colPositions,
        containsTable: true,
      };
    };

    // Run the detection
    detectTables();
  }, [pdfDoc, onTablesDetected, setTaggedElements]);

  // This component doesn't render anything visible
  return null;
};

TableDetector.propTypes = {
  pdfDoc: PropTypes.object,
  onTablesDetected: PropTypes.func.isRequired,
  setTaggedElements: PropTypes.func.isRequired,
};

export default TableDetector;