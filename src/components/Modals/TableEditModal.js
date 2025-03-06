import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.entry";
import interact from "interactjs";
import renderManager from "../RenderManager";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const TableEditModal = ({ 
  isOpen,
  tableData,
  onClose,
  onTableChange,
  pdfDoc,
  viewport,
  scaleFactor = 1
}) => {
  const [gridData, setGridData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);

  // Store table dimensions in state for UI
  const [tableSize, setTableSize] = useState({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rowCount: 2,
    colCount: 2,
    rowPositions: [],
    colPositions: [],
    headerRow: null,
    headerCol: null,
  });

  // Scale factors for coordinate conversion
  const [scaleFactorX, setScaleFactorX] = useState(1);
  const [scaleFactorY, setScaleFactorY] = useState(1);
  
  // Unique ID for this component instance
  const canvasId = useRef(`table-edit-modal-canvas-${Date.now()}-${Math.floor(Math.random() * 10000)}`).current;

  // Initialize component when opening modal
  useEffect(() => {
    if (isOpen && tableData && pdfDoc) {
      // Initialize table size from data
      setTableSize({
        x: tableData.x || 0,
        y: tableData.y || 0,
        width: tableData.width || 100,
        height: tableData.height || 100,
        rowCount: tableData.rowCount || 2,
        colCount: tableData.colCount || 2,
        rowPositions: tableData.rowPositions || [],
        colPositions: tableData.colPositions || [],
        headerRow: tableData.headerRow,
        headerCol: tableData.headerCol
      });

      // Render the PDF page with the table highlight
      renderPdfWithBox();
      
      // Initialize grid data for table editor
      setupTable();
    }
    
    // Clean up on modal close
    return () => {
      renderManager.cancelRender(canvasId);
    };
  }, [isOpen, tableData, pdfDoc, canvasId]);

  // Setup interactive resizing when overlay is available
  useEffect(() => {
    if (overlayRef.current && isOpen) {
      // Make the overlay resizable using interact.js
      interact(overlayRef.current)
        .resizable({
          edges: { left: true, right: true, bottom: true, top: true },
          invert: 'reposition',
          modifiers: [
            // Keep the resize within the canvas
            interact.modifiers.restrictSize({
              min: { width: 20, height: 20 }
            })
          ]
        })
        .on('resizemove', (event) => {
          // Update the visual size of the overlay
          let { width, height } = event.rect;
          const { x, y } = event.deltaRect;
          
          // Adjust the position if it changed
          let newX = tableSize.x;
          let newY = tableSize.y;
          
          if (x !== 0) {
            newX = tableSize.x + (x / scaleFactorX);
          }
          
          if (y !== 0) {
            newY = tableSize.y + (y / scaleFactorY);
          }

          // Update the overlay element styles
          overlayRef.current.style.width = `${width}px`;
          overlayRef.current.style.height = `${height}px`;
          
          // Update the state to reflect the new size
          setTableSize(prev => ({
            ...prev,
            x: newX,
            y: newY,
            width: Math.max(20, width / scaleFactorX),
            height: Math.max(20, height / scaleFactorY)
          }));
        })
        .draggable({
          modifiers: [
            // Keep the drag within the canvas boundaries
            interact.modifiers.restrict({
              restriction: 'parent',
              elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
            })
          ]
        })
        .on('dragmove', (event) => {
          // Update position based on drag
          const x = tableSize.x + (event.dx / scaleFactorX);
          const y = tableSize.y + (event.dy / scaleFactorY);
          
          // Update overlay position
          overlayRef.current.style.left = `${x * scaleFactorX}px`;
          overlayRef.current.style.top = `${y * scaleFactorY}px`;
          
          // Update state
          setTableSize(prev => ({
            ...prev,
            x,
            y
          }));
        });
    }

    // Clean up interact instance on unmount
    return () => {
      if (overlayRef.current) {
        interact(overlayRef.current).unset();
      }
    };
  }, [isOpen, tableSize, scaleFactorX, scaleFactorY]);

  // Render the PDF page with the table box highlighted
  const renderPdfWithBox = async () => {
    if (!pdfDoc || !canvasRef.current || !tableData) return;
    
    setIsRendering(true);

    // Cancel any existing render operations
    renderManager.cancelRender(canvasId);

    try {
      await renderManager.queueRender(canvasId, async () => {
        // Check if canvas is still available
        if (!canvasRef.current) return { success: false, error: "Canvas no longer available" };
        
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        
        // Get the PDF page
        const page = await pdfDoc.getPage(tableData.page);
        const pdfViewport = page.getViewport({ scale: 1.5 });

        // Set canvas dimensions to match the PDF page
        canvas.width = pdfViewport.width;
        canvas.height = pdfViewport.height;
        
        // Calculate scale factors for coordinate conversion
        const scaleX = canvas.width / pdfViewport.width;
        const scaleY = canvas.height / pdfViewport.height;
        
        setScaleFactorX(scaleX);
        setScaleFactorY(scaleY);
        
        // Clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Create render context
        const renderContext = {
          canvasContext: context,
          viewport: pdfViewport
        };
        
        // Render the PDF page
        const renderTask = page.render(renderContext);
        await renderTask.promise;
        
        // Give a brief moment for the render to complete
        await new Promise(resolve => setTimeout(resolve, 50));

        // Draw the table box on the canvas
        context.strokeStyle = "red";
        context.lineWidth = 2;
        context.strokeRect(
          tableData.x * scaleX,
          tableData.y * scaleY,
          tableData.width * scaleX,
          tableData.height * scaleY
        );

        // Draw table structure if available
        if (tableData.rowPositions && tableData.rowPositions.length > 0) {
          // Draw row lines
          tableData.rowPositions.forEach((y, index) => {
            const adjustedY = (tableData.y + y) * scaleY;
            
            context.beginPath();
            context.moveTo(tableData.x * scaleX, adjustedY);
            context.lineTo((tableData.x + tableData.width) * scaleX, adjustedY);
            context.strokeStyle = index === tableData.headerRow ? "blue" : "black";
            context.lineWidth = index === tableData.headerRow ? 2 : 1;
            context.stroke();
          });

          // Draw column lines
          if (tableData.colPositions && tableData.colPositions.length > 0) {
            tableData.colPositions.forEach((x, index) => {
              const adjustedX = (tableData.x + x) * scaleX;
              
              context.beginPath();
              context.moveTo(adjustedX, tableData.y * scaleY);
              context.lineTo(adjustedX, (tableData.y + tableData.height) * scaleY);
              context.strokeStyle = index === tableData.headerCol ? "blue" : "black";
              context.lineWidth = index === tableData.headerCol ? 2 : 1;
              context.stroke();
            });
          }
        }
        
        return { success: true };
      });
    } catch (error) {
      console.error("Error rendering PDF page:", error);
    } finally {
      setIsRendering(false);
    }
  };

  // Initialize table data structure
  const setupTable = () => {
    if (!tableData) {
      console.warn("Table data is undefined.");
      return;
    }

    // Initialize headers (column names)
    let headers = tableData.headers || [];
    
    // Initialize rows
    let rows = tableData.rows || [];

    // Create default headers if none exist
    if (headers.length === 0 && tableData.colCount) {
      headers = Array.from(
        { length: tableData.colCount }, 
        (_, i) => `Column ${i + 1}`
      );
    }

    // Create default rows if none exist
    if (rows.length === 0 && tableData.rowCount) {
      rows = Array.from(
        { length: tableData.rowCount }, 
        () => Object.fromEntries(
          headers.map(header => [
            header.toLowerCase().replace(/\s+/g, "_"), 
            ""
          ])
        )
      );
    }

    // Set column definitions for grid
    setColumnDefs(
      headers.map(header => ({
        headerName: header,
        field: header.toLowerCase().replace(/\s+/g, "_"),
        editable: true
      }))
    );

    // Set grid data
    setGridData([...rows]);
  };

  // Generate row positions based on row count
  const generateRowPositions = () => {
    const rowCount = parseInt(tableSize.rowCount) || 2;
    const height = tableSize.height;
    
    return Array.from(
      { length: rowCount + 1 }, 
      (_, i) => (i * height) / rowCount
    );
  };

  // Generate column positions based on column count
  const generateColPositions = () => {
    const colCount = parseInt(tableSize.colCount) || 2;
    const width = tableSize.width;
    
    return Array.from(
      { length: colCount + 1 }, 
      (_, i) => (i * width) / colCount
    );
  };

  // Save changes to table
  const handleSave = () => {
    // Generate row and column positions if needed
    const rowPositions = tableSize.rowPositions.length > 0 
      ? tableSize.rowPositions 
      : generateRowPositions();
      
    const colPositions = tableSize.colPositions.length > 0 
      ? tableSize.colPositions 
      : generateColPositions();

    // Prepare updated table data
    const updatedTableData = {
      ...tableData,
      x: tableSize.x,
      y: tableSize.y,
      width: tableSize.width,
      height: tableSize.height,
      rowCount: parseInt(tableSize.rowCount) || 2,
      colCount: parseInt(tableSize.colCount) || 2,
      rowPositions,
      colPositions,
      headerRow: tableSize.headerRow,
      headerCol: tableSize.headerCol,
      rows: gridData,
    };

    // Send the updated data back to parent
    onTableChange(updatedTableData);
    onClose();
  };

  // Handle row count change
  const handleRowCountChange = (e) => {
    const value = parseInt(e.target.value) || 2;
    setTableSize(prev => ({
      ...prev,
      rowCount: Math.max(1, value),
      // Reset row positions when count changes
      rowPositions: [] 
    }));
  };

  // Handle column count change
  const handleColCountChange = (e) => {
    const value = parseInt(e.target.value) || 2;
    setTableSize(prev => ({
      ...prev,
      colCount: Math.max(1, value),
      // Reset column positions when count changes
      colPositions: [] 
    }));
  };

  // Set a specific row as header row
  const setHeaderRow = (index) => {
    setTableSize(prev => ({
      ...prev,
      headerRow: prev.headerRow === index ? null : index
    }));
  };

  // Set a specific column as header column
  const setHeaderCol = (index) => {
    setTableSize(prev => ({
      ...prev,
      headerCol: prev.headerCol === index ? null : index
    }));
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Edit Table</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          {/* Table Settings Menu on the Left */}
          <Col md={3} style={{ background: "#f8f9fa", padding: "10px", borderRadius: "5px" }}>
            <h5>Table Settings</h5>
            <Form>
              <Form.Group className="mb-2">
                <Form.Label>Table Name</Form.Label>
                <Form.Control
                  type="text"
                  value={tableData?.name || ""}
                  onChange={(e) => {
                    if (tableData) {
                      tableData.name = e.target.value;
                    }
                  }}
                />
              </Form.Group>
              
              <Form.Group className="mb-2">
                <Form.Label>Rows</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={tableSize.rowCount}
                  onChange={handleRowCountChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-2">
                <Form.Label>Columns</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={tableSize.colCount}
                  onChange={handleColCountChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-2">
                <Form.Label>X Position</Form.Label>
                <Form.Control
                  type="number"
                  value={Math.round(tableSize.x)}
                  onChange={(e) => setTableSize({ 
                    ...tableSize, 
                    x: Number(e.target.value) 
                  })}
                />
              </Form.Group>
              
              <Form.Group className="mb-2">
                <Form.Label>Y Position</Form.Label>
                <Form.Control
                  type="number"
                  value={Math.round(tableSize.y)}
                  onChange={(e) => setTableSize({ 
                    ...tableSize, 
                    y: Number(e.target.value) 
                  })}
                />
              </Form.Group>
              
              <Form.Group className="mb-2">
                <Form.Label>Width</Form.Label>
                <Form.Control
                  type="number"
                  min="20"
                  value={Math.round(tableSize.width)}
                  onChange={(e) => setTableSize({ 
                    ...tableSize, 
                    width: Math.max(20, Number(e.target.value)) 
                  })}
                />
              </Form.Group>
              
              <Form.Group className="mb-2">
                <Form.Label>Height</Form.Label>
                <Form.Control
                  type="number"
                  min="20"
                  value={Math.round(tableSize.height)}
                  onChange={(e) => setTableSize({ 
                    ...tableSize, 
                    height: Math.max(20, Number(e.target.value)) 
                  })}
                />
              </Form.Group>
              
              <div className="mb-3">
                <Form.Label>Header Settings</Form.Label>
                {/* Placeholder for header settings UI */}
                <div className="d-grid gap-2">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => setHeaderRow(0)}
                    className={tableSize.headerRow === 0 ? "active" : ""}
                  >
                    First Row as Header
                  </Button>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => setHeaderCol(0)}
                    className={tableSize.headerCol === 0 ? "active" : ""}
                  >
                    First Column as Header
                  </Button>
                </div>
              </div>
            </Form>
          </Col>

          {/* PDF Preview with Resizable Table Overlay */}
          <Col md={9} style={{ position: "relative" }}>
            {isRendering && (
              <div style={{ 
                position: "absolute", 
                top: "50%", 
                left: "50%", 
                transform: "translate(-50%, -50%)",
                background: "rgba(255,255,255,0.8)",
                padding: "20px",
                borderRadius: "5px",
                zIndex: 1000
              }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
                <span className="ml-2">Rendering PDF...</span>
              </div>
            )}
            
            <div style={{ position: "relative", width: "100%", height: "auto" }}>
              <canvas 
                ref={canvasRef} 
                style={{ 
                  border: "1px solid black", 
                  maxWidth: "100%",
                  height: "auto"
                }} 
              />
              
              {/* Resizable/draggable overlay for the table */}
              <div
                ref={overlayRef}
                style={{
                  position: "absolute",
                  left: `${tableSize.x * scaleFactorX}px`,
                  top: `${tableSize.y * scaleFactorY}px`,
                  width: `${tableSize.width * scaleFactorX}px`,
                  height: `${tableSize.height * scaleFactorY}px`,
                  zIndex: 100,
                  border: "2px solid red",
                  backgroundColor: "rgba(255, 0, 0, 0.1)",
                  cursor: "move",
                  touchAction: "none"
                }}
              >
                {/* Display grid lines if row/column positions exist */}
                {generateRowPositions().map((y, index) => (
                  index > 0 && (
                    <div 
                      key={`row-${index}`} 
                      style={{
                        position: "absolute",
                        top: `${y * (scaleFactorY / scaleFactorX)}px`,
                        left: 0,
                        width: "100%",
                        height: "1px",
                        backgroundColor: tableSize.headerRow === index ? "blue" : "rgba(0,0,0,0.5)",
                        pointerEvents: "none"
                      }}
                    />
                  )
                ))}
                
                {generateColPositions().map((x, index) => (
                  index > 0 && (
                    <div 
                      key={`col-${index}`} 
                      style={{
                        position: "absolute",
                        left: `${x}px`,
                        top: 0,
                        height: "100%",
                        width: "1px",
                        backgroundColor: tableSize.headerCol === index ? "blue" : "rgba(0,0,0,0.5)",
                        pointerEvents: "none"
                      }}
                    />
                  )
                ))}
              </div>
            </div>
            
            <div className="mt-3">
              <p className="text-muted">
                <small>
                  <i className="fas fa-info-circle mr-1"></i>
                  Drag the red box to position the table. Resize by dragging the edges.
                </small>
              </p>
            </div>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save Changes</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TableEditModal;