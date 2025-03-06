import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import EditableTable from "../EditableTable";
import "../../App.css";
import renderManager from "../RenderManager";

const EditBoxModal = ({
  show,
  handleClose,
  taggedElements,
  setTaggedElements,
  selectedBox,
  selectedBoxIndex,
  pdfDoc,
  languages = [],
  detectedTables = [],
  fonts = [],
}) => {
  const [boxDetails, setBoxDetails] = useState({
    name: "",
    tag: "Paragraph",
    language: "sv",
    font: "",
    altText: "",
    containsTable: false,
    tables: [],
  });

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [isRendering, setIsRendering] = useState(false);

  // Unique ID for this component's canvas
  const canvasId = useRef(`edit-box-modal-canvas-${Date.now()}-${Math.floor(Math.random() * 10000)}`).current;

  // Update boxDetails when selectedBox changes
  useEffect(() => {
    if (selectedBox && selectedBoxIndex !== null) {
      setBoxDetails({
        name: selectedBox.name || "",
        tag: selectedBox.tag || "Paragraph",
        language: selectedBox.language || "sv",
        font: selectedBox.font || "",
        altText: selectedBox.alt || "",
        containsTable: !!selectedBox.containsTable,
        tables: selectedBox.tables || [],
      });
    }
  }, [selectedBox, selectedBoxIndex]);

  // Clean up on unmount or when modal is closed
  useEffect(() => {
    return () => {
      // Cancel any pending render operations for this canvas
      renderManager.cancelRender(canvasId);
    };
  }, [canvasId]);

  // Helper to find tables inside an image
  const findTablesInsideImage = (imageBox, tables) => {
    if (!imageBox || !tables || !Array.isArray(tables)) return [];
    
    return tables.filter(table => {
      const tableRight = table.x + table.width;
      const tableBottom = table.y + table.height;
      const imageRight = imageBox.x + imageBox.width;
      const imageBottom = imageBox.y + imageBox.height;
  
      return (
        table.x >= imageBox.x &&
        table.y >= imageBox.y &&
        tableRight <= imageRight &&
        tableBottom <= imageBottom
      );
    });
  };

  // Render the PDF crop in the canvas
  const renderCroppedPdfToCanvas = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !selectedBox) return;
  
    setIsRendering(true);
    
    // First cancel any existing render tasks for this canvas
    renderManager.cancelRender(canvasId);
    
    try {
      await renderManager.queueRender(canvasId, async () => {
        // Make sure canvas is still available (could have unmounted)
        if (!canvasRef.current) return { success: false };
        
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        
        // Get the PDF page
        const page = await pdfDoc.getPage(selectedBox.page);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
    
        // Calculate the crop dimensions
        const cropX = selectedBox.x * scale;
        const cropY = selectedBox.y * scale;
        const cropWidth = selectedBox.width * scale;
        const cropHeight = selectedBox.height * scale;
    
        // Set the canvas size to match the cropped area
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        context.clearRect(0, 0, canvas.width, canvas.height);
    
        // Create the render context with a transform to crop
        // This uses a transform matrix to adjust the PDF coordinate system
        // to focus only on the selected part of the page
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: [scale, 0, 0, scale, -cropX, -cropY],
        };
    
        // Render the PDF page with the transform
        const renderTask = page.render(renderContext);
        await renderTask.promise;
    
        // Wait a short moment to ensure rendering is complete
        await new Promise(resolve => setTimeout(resolve, 50));
    
        // Draw tables if needed
        if (boxDetails.containsTable && boxDetails.tables && boxDetails.tables.length > 0) {
          drawTablesOnCanvas(context, selectedBox, scale);
        }
        
        return { success: true };
      });
    } catch (error) {
      console.error("Error rendering cropped PDF to canvas:", error);
    } finally {
      setIsRendering(false);
    }
  }, [pdfDoc, selectedBox, boxDetails.containsTable, boxDetails.tables, canvasId]);

  const drawTablesOnCanvas = (context, selectedBox, scale) => {
    if (!selectedBox.tables || !Array.isArray(selectedBox.tables) || selectedBox.tables.length === 0) {
      return;
    }

    context.strokeStyle = "red";
    context.lineWidth = 2;

    selectedBox.tables.forEach((table) => {
      // Calculate position relative to the cropped area
      const adjustedX = (table.x - selectedBox.x) * scale;
      const adjustedY = (table.y - selectedBox.y) * scale;
      const adjustedWidth = table.width * scale;
      const adjustedHeight = table.height * scale;

      // Make sure table is within the cropped region
      if (
        adjustedX >= 0 &&
        adjustedY >= 0 &&
        adjustedX + adjustedWidth <= context.canvas.width &&
        adjustedY + adjustedHeight <= context.canvas.height
      ) {
        context.strokeRect(adjustedX, adjustedY, adjustedWidth, adjustedHeight);
      }
    });
  };

  // Re-render canvas when relevant props change
  useEffect(() => {
    if (show && pdfDoc && selectedBox) {
      renderCroppedPdfToCanvas();
    }
  }, [show, pdfDoc, selectedBox, renderCroppedPdfToCanvas]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDrawing(true);
    const rect = e.target.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    setCurrentBox({ x: startX, y: startY, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const rect = e.target.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    setCurrentBox((prevBox) => ({
      ...prevBox,
      width: Math.max(10, currentX - prevBox.x),
      height: Math.max(10, currentY - prevBox.y),
    }));
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox && currentBox.width > 10 && currentBox.height > 10) {
      // Convert canvas coordinates to PDF coordinates
      const canvasToBoxRatio = selectedBox.width / canvasRef.current.width;
      
      const newTable = {
        x: selectedBox.x + (currentBox.x * canvasToBoxRatio),
        y: selectedBox.y + (currentBox.y * canvasToBoxRatio),
        width: currentBox.width * canvasToBoxRatio,
        height: currentBox.height * canvasToBoxRatio,
        rows: 3,
        cols: 3,
        tag: "Table",
        headerIndex: null,
        footerIndex: null,
        page: selectedBox.page,
      };
      
      setBoxDetails((prevDetails) => ({
        ...prevDetails,
        tables: [...(prevDetails.tables || []), newTable],
      }));
    }
    
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const handleSave = () => {
    if (selectedBoxIndex !== null && selectedBoxIndex >= 0) {
      setTaggedElements((prev) => {
        const updatedElements = [...prev];
        
        // If the element exists in the array
        if (updatedElements[selectedBoxIndex]) {
          updatedElements[selectedBoxIndex] = {
            ...updatedElements[selectedBoxIndex],
            name: boxDetails.name,
            tag: boxDetails.tag,
            language: boxDetails.language,
            font: boxDetails.font,
            alt: boxDetails.altText,
            containsTable: boxDetails.containsTable,
            tables: boxDetails.tables,
          };
        }
        
        return updatedElements;
      });
    }
    
    handleClose();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    
    setBoxDetails((prevDetails) => ({ 
      ...prevDetails, 
      [name]: newValue 
    }));
  };

  // Support removing tables
  const handleRemoveTable = (index) => {
    setBoxDetails(prev => ({
      ...prev,
      tables: prev.tables.filter((_, i) => i !== index)
    }));
  };

  if (selectedBoxIndex === null || !selectedBox) {
    return null;
  }

  const isImage = selectedBox.type === "image";

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Edit {isImage ? "Image" : selectedBox.type === "table" ? "Table" : "Text Box"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {isImage ? (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Image Name</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={boxDetails.name || ""}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Alt Text</Form.Label>
                <Form.Control
                  type="text"
                  name="altText"
                  value={boxDetails.altText || ""}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="contains-table-switch"
                  label="Contains a Table?"
                  name="containsTable"
                  checked={boxDetails.containsTable}
                  onChange={handleChange}
                />
              </Form.Group>

              {boxDetails.containsTable && (
                <div className="pdf-canvas-container mt-3" style={{ position: "relative" }}>
                  <div className="mb-2">Draw a box around a table in the image below:</div>
                  
                  {isRendering && (
                    <div style={{ 
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      background: "rgba(255,255,255,0.8)",
                      padding: "10px",
                      borderRadius: "4px",
                      zIndex: 100
                    }}>
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                      <span className="ml-2">Rendering...</span>
                    </div>
                  )}
                  
                  <canvas
                    ref={canvasRef}
                    className="pdf-canvas"
                    style={{ width: "100%", height: "auto", border: "1px solid #ccc" }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => setIsDrawing(false)}
                  />
                  
                  {/* Drawing preview */}
                  {isDrawing && currentBox && (
                    <div
                      style={{
                        position: "absolute",
                        border: "2px dashed blue",
                        left: currentBox.x,
                        top: currentBox.y,
                        width: currentBox.width,
                        height: currentBox.height,
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {/* Existing tables */}
                  {boxDetails.tables && boxDetails.tables.length > 0 && (
                    <div className="mt-3">
                      <h6>Detected Tables:</h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Position</th>
                              <th>Size</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {boxDetails.tables.map((table, index) => (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>X: {Math.round(table.x)}, Y: {Math.round(table.y)}</td>
                                <td>{Math.round(table.width)} × {Math.round(table.height)}</td>
                                <td>
                                  <Button 
                                    variant="danger" 
                                    size="sm"
                                    onClick={() => handleRemoveTable(index)}
                                  >
                                    Remove
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : selectedBox.type === "table" ? (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Table Name</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={boxDetails.name || ""}
                  onChange={handleChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Rows</Form.Label>
                <Form.Control
                  type="number"
                  name="rowCount"
                  min="1"
                  value={selectedBox.rowCount || 2}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setBoxDetails(prev => ({
                      ...prev,
                      rowCount: value >= 1 ? value : 1
                    }));
                  }}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Columns</Form.Label>
                <Form.Control
                  type="number"
                  name="colCount"
                  min="1"
                  value={selectedBox.colCount || 2}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setBoxDetails(prev => ({
                      ...prev,
                      colCount: value >= 1 ? value : 1
                    }));
                  }}
                />
              </Form.Group>
              
              <div className="mb-3">
                {isRendering ? (
                  <div className="text-center p-3">
                    <div className="spinner-border text-primary" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                    <p className="mt-2">Rendering table preview...</p>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    style={{
                      width: "100%", 
                      height: "auto", 
                      border: "1px solid #ccc",
                      marginBottom: "10px"
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Box Name</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={boxDetails.name || ""}
                  onChange={handleChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Heading Type</Form.Label>
                <Form.Control
                  as="select"
                  name="tag"
                  value={boxDetails.tag || "Paragraph"}
                  onChange={handleChange}
                >
                  <option value="P">Paragraph</option>
                  <option value="H1">Heading 1</option>
                  <option value="H2">Heading 2</option>
                  <option value="H3">Heading 3</option>
                </Form.Control>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Language</Form.Label>
                <Form.Control
                  as="select"
                  name="language"
                  value={boxDetails.language || "sv"}
                  onChange={handleChange}
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Font</Form.Label>
                <Form.Control
                  as="select"
                  name="font"
                  value={boxDetails.font || ""}
                  onChange={handleChange}
                >
                  <option value="">Default Font</option>
                  {fonts.map((font, index) => (
                    <option key={index} value={font.base64}>
                      {font.name}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditBoxModal;