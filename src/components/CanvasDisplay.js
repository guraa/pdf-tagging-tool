import React, { useRef, useState, useEffect } from "react";
import "font-awesome/css/font-awesome.min.css";
import TableEditModal from "./Modals/TableEditModal";
import EditBoxModal from "./Modals/EditBoxModal";
import { drawTableStructure } from "./DrawCanvas";
import ConfirmDeleteModal from "./Modals/ConfirmDeleteModal";
import { FaTimes } from "react-icons/fa";
import renderManager from "./RenderManager";

const CanvasDisplay = ({
  pdfDoc,
  currentPage,
  setDrawBox,
  setShowTextModal,
  setSelectedAltText,
  setSelectedImageIndex,
  taggedElements = [],
  setTaggedElements,
  detectedTables = [],
  uploadedFonts,
  setModalState,
  selectedBox: externalSelectedBox,
  setSelectedBox: setExternalSelectedBox,
  canvasRef: externalCanvasRef,
}) => {
  const [selectedBox, setSelectedBox] = useState(null);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState(null);
  const internalCanvasRef = useRef(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const [isSelecting, setIsSelecting] = useState(false);
  const [internalDrawBox, setInternalDrawBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const [selectedTableData, setSelectedTableData] = useState(null);
  const [showTableEditModal, setShowTableEditModal] = useState(false);
  const [showEditBoxModal, setShowEditBoxModal] = useState(false);

  const [boxToDelete, setBoxToDelete] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [viewport, setViewport] = useState(null);
  const [isRendering, setIsRendering] = useState(false);

  // Unique ID for this component instance
  const canvasId = useRef(`canvas-${Date.now()}-${Math.floor(Math.random() * 10000)}`).current;

  // Sync internal and external selected box state
  useEffect(() => {
    if (externalSelectedBox !== undefined && setExternalSelectedBox) {
      setSelectedBox(externalSelectedBox);
    }
  }, [externalSelectedBox]);

  useEffect(() => {
    if (setExternalSelectedBox && selectedBox) {
      setExternalSelectedBox(selectedBox);
    }
  }, [selectedBox, setExternalSelectedBox]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending render operations for this canvas
      renderManager.cancelRender(canvasId);
    };
  }, [canvasId]);

  useEffect(() => {
    if (!canvasRef.current || !pdfDoc) return;

    setIsRendering(true);
    
    const renderCanvas = async () => {
      try {
        // Cancel any previous render tasks for this canvas
        renderManager.cancelRender(canvasId);
        
        await renderManager.queueRender(canvasId, async () => {
          const canvas = canvasRef.current;
          if (!canvas) return { success: false };
          
          const context = canvas.getContext("2d");
          if (!context) return { success: false };
  
          // Load and render the current page
          const page = await pdfDoc.getPage(currentPage + 1);
          const vp = page.getViewport({ scale: 1.5 });
          setViewport(vp);
          
          // Set canvas dimensions
          canvas.width = vp.width;
          canvas.height = vp.height;
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          // Create a separate render operation for the PDF itself
          await page.render({ 
            canvasContext: context, 
            viewport: vp 
          }).promise;
          
          // Wait a short moment to ensure rendering is complete
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Get elements for this page
          const allElements = [...taggedElements];
          
          // Only add detected tables that don't already exist in taggedElements
          const existingTableIds = new Set(
            taggedElements.filter(el => el.type === 'table').map(el => el.id)
          );
          
          // Also check position to further avoid duplicates
          const existingTablePositions = taggedElements
            .filter(el => el.type === 'table')
            .map(table => ({ 
              page: table.page, 
              x: Math.round(table.x), 
              y: Math.round(table.y) 
            }));
          
          // Add only unique tables from detectedTables
          for (const table of detectedTables) {
            if (!existingTableIds.has(table.id)) {
              // Check if there's a table at a similar position already
              const isDuplicate = existingTablePositions.some(pos => 
                pos.page === table.page &&
                Math.abs(pos.x - Math.round(table.x)) < 20 &&
                Math.abs(pos.y - Math.round(table.y)) < 20
              );
              
              if (!isDuplicate) {
                allElements.push(table);
              }
            }
          }
          
          console.log("All elements:", allElements);
          
          const elementsForCurrentPage = allElements.filter(
            (box) => box.page === currentPage + 1
          );
          console.log("Elements for current page:", elementsForCurrentPage);
  
          // Draw all elements based on their type
          elementsForCurrentPage.forEach((box) => {
            // Skip elements with invalid coordinates
            if (typeof box.x !== 'number' || typeof box.y !== 'number' || 
                typeof box.width !== 'number' || typeof box.height !== 'number') {
              console.warn("Element with invalid coordinates:", box);
              return;
            }
            
            try {
              if (box.type === "table") {
                // Draw table with structure
                context.fillStyle = 'rgba(0, 255, 255, 0.2)';
                context.fillRect(box.x, box.y, box.width, box.height);
                if (typeof drawTableStructure === 'function') {
                  drawTableStructure(context, box);
                } else {
                  // Simple table rendering fallback
                  context.strokeStyle = 'green';
                  context.lineWidth = 2;
                  context.strokeRect(box.x, box.y, box.width, box.height);
                }
              } else if (box.type === "image") {
                // Draw image boxes
                context.fillStyle = 'rgba(255, 255, 0, 0.2)';
                context.fillRect(box.x, box.y, box.width, box.height);
                context.strokeStyle = 'gold';
                context.lineWidth = 2;
                context.strokeRect(box.x, box.y, box.width, box.height);
                
                // Add image icon or label
                context.fillStyle = 'black';
                context.font = '12px Arial';
                context.fillText('📷 ' + (box.name || 'Image'), box.x + 5, box.y + 15);
                
                console.log("Drew image box at", box.x, box.y, "with size", box.width, box.height);
              } else {
                // Draw text elements
                context.fillStyle = 'rgba(255, 0, 0, 0.2)';
                context.fillRect(box.x, box.y, box.width, box.height);
                context.strokeStyle = 'red';
                context.lineWidth = 2;
                context.strokeRect(box.x, box.y, box.width, box.height);
              }
            } catch (error) {
              console.error("Error drawing element:", error, box);
            }
          });
  
          // Draw reading order lines
          if (elementsForCurrentPage.length > 1) {
            // Sort elements by vertical position (top to bottom)
            const sortedElements = [...elementsForCurrentPage].sort((a, b) => a.y - b.y);
            
            // Draw lines connecting elements in reading order
            sortedElements.forEach((element, index) => {
              if (index < sortedElements.length - 1) {
                const nextElement = sortedElements[index + 1];
                
                // Draw line from center of current element to center of next element
                context.beginPath();
                context.moveTo(
                  element.x + element.width / 2,
                  element.y + element.height / 2
                );
                context.lineTo(
                  nextElement.x + nextElement.width / 2,
                  nextElement.y + nextElement.height / 2
                );
                context.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                context.lineWidth = 2;
                context.setLineDash([5, 3]); // Dashed line
                context.stroke();
                context.setLineDash([]); // Reset to solid line
              }
            });
          }
          
          return { success: true };
        });
      } catch (error) {
        console.error("Error rendering PDF page:", error);
      } finally {
        setIsRendering(false);
      }
    };

    // Add a small delay to ensure previous renders have completed or been cancelled
    const renderTimer = setTimeout(renderCanvas, 100);
    
    return () => {
      clearTimeout(renderTimer);
      renderManager.cancelRender(canvasId);
    };

  }, [pdfDoc, currentPage, taggedElements, detectedTables, canvasRef, canvasId]);

  const handleTableSave = (updatedTableData) => {
    setTaggedElements((prevElements) =>
      prevElements.map((element) =>
        element.id === updatedTableData.id
          ? { ...element, ...updatedTableData } 
          : element
      )
    );
    setShowTableEditModal(false);
  };

  const handleRemoveBox = (box) => {
    setBoxToDelete(box);
    setShowConfirmModal(true);
  };

  const confirmRemoveBox = () => {
    setTaggedElements((prev) => prev.filter((b) => b.id !== boxToDelete.id));
    setShowConfirmModal(false);
    setBoxToDelete(null);
  };

  const handleMouseDown = (e) => {
    if (e.target.tagName !== "CANVAS") return;
    
    const { offsetX, offsetY } = e.nativeEvent;
    setIsSelecting(true);
    setInternalDrawBox({ x: offsetX, y: offsetY, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isSelecting) return;
    
    const { offsetX, offsetY } = e.nativeEvent;
    setInternalDrawBox((prev) => ({
      ...prev,
      width: Math.max(5, offsetX - prev.x),
      height: Math.max(5, offsetY - prev.y)
    }));
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;
    
    setIsSelecting(false);

    // Only proceed if the box has some meaningful dimensions
    if (internalDrawBox.width > 5 && internalDrawBox.height > 5) {
      const newBox = {
        ...internalDrawBox,
        type: "text", // Default to text
        tag: "Paragraph",
        page: currentPage + 1,
        id: `drawn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };

      // Update state
      setDrawBox(newBox);
      setSelectedBox(newBox);
      setSelectedBoxIndex(taggedElements.length);
      
      // Open the tagging modal for the new box
      setModalState((prev) => ({ ...prev, taggingModal: true }));
    }

    // Reset the drawing box
    setInternalDrawBox({ x: 0, y: 0, width: 0, height: 0 });
  };

  const handleBoxClick = (box) => {
    console.log("Box clicked:", box); // Debug log
    
    // Update selected box states
    setSelectedBox(box);
    
    // Find the index in the tagged elements array
    const boxIndex = taggedElements.findIndex((el) => el.id === box.id);
    setSelectedBoxIndex(boxIndex);
    
    // Handle different box types with appropriate modals
    if (box.type === "image") {
      console.log("Image box clicked, opening edit modal");
      // For images, set the image index and alt text
      setSelectedImageIndex(boxIndex);
      setSelectedAltText(box.alt || "");
      // Open the edit box modal via modal state
      setModalState(prev => ({ ...prev, editBoxModal: true }));
    } 
    else if (box.type === "table") {
      console.log("Table box clicked, opening table edit modal");
      // For tables, set the table data
      setSelectedTableData(box);
      // Open the table edit modal via modal state
      setModalState(prev => ({ ...prev, tableEditModal: true }));
    } 
    else {
      console.log("Text box clicked, opening tagging modal");
      // For text/other boxes, set the draw box
      setDrawBox(box);
      // Open the tagging modal via modal state
      setModalState(prev => ({ ...prev, taggingModal: true }));
    }
  };

  return (
    <div className="pdf-canvas-container" style={{ position: "relative", width: "100%", height: "100%", overflow: "auto" }}>
      {isRendering && (
        <div style={{ 
          position: "absolute", 
          top: "50%", 
          left: "50%", 
          transform: "translate(-50%, -50%)",
          padding: "10px 20px",
          background: "rgba(255,255,255,0.9)",
          borderRadius: "5px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          zIndex: 100
        }}>
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <span style={{ marginLeft: "10px" }}>Rendering PDF...</span>
        </div>
      )}

      <canvas 
        ref={canvasRef} 
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp}
        onMouseLeave={() => isSelecting && handleMouseUp()}
      />

      {/* Selection overlay while drawing */}
      {isSelecting && internalDrawBox.width > 0 && internalDrawBox.height > 0 && (
        <div
          style={{
            position: "absolute",
            left: internalDrawBox.x,
            top: internalDrawBox.y,
            width: internalDrawBox.width,
            height: internalDrawBox.height,
            border: "2px dashed blue",
            backgroundColor: "rgba(0, 0, 255, 0.1)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Render tagged elements and detected tables */}
      {[...taggedElements, ...detectedTables]
        .filter((box) => box.page === currentPage + 1)
        .map((box, index) => {
          // Check if the box has valid coordinates
          if (typeof box.x !== 'number' || typeof box.y !== 'number' || 
              typeof box.width !== 'number' || typeof box.height !== 'number') {
            console.warn("Skipping box with invalid coordinates:", box);
            return null;
          }
          
          // Determine colors based on element type
          const borderColor = selectedBox?.id === box.id ? "blue" : 
                     box.type === "image" ? "gold" : 
                     box.type === "table" ? "green" : "red";
                     
          const bgColor = box.type === "image" ? "rgba(255, 215, 0, 0.2)" : 
                  box.type === "table" ? "rgba(0, 128, 0, 0.2)" : 
                  "rgba(255, 0, 0, 0.2)";
          
          // Determine icon based on type
          const icon = box.type === "image" ? "📷" : 
                      box.type === "table" ? "📊" : "📝";
          
          // Create a unique key for this element
          const uniqueKey = `${box.type}-${box.id || ''}-${index}-${Math.random().toString(36).substr(2, 9)}`;
                  
          return (
            <div
              key={uniqueKey}
              style={{
                position: "absolute",
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
                border: `2px solid ${borderColor}`,
                backgroundColor: bgColor,
                cursor: "pointer",
                zIndex: 10,
                pointerEvents: "all",
              }}
              onClick={() => handleBoxClick(box)}
            >
              <div style={{ 
                position: "absolute", 
                top: 2,
                left: 2, 
                padding: "2px", 
                fontSize: "10px", 
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                borderRadius: "2px",
                maxWidth: "calc(100% - 20px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {icon} {box.name || box.type}
              </div>
              
              <FaTimes 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleRemoveBox(box); 
                }} 
                style={{ 
                  position: "absolute", 
                  top: 2, 
                  right: 2, 
                  color: "red",
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  borderRadius: "50%",
                  padding: "2px",
                  zIndex: 11,
                  cursor: "pointer",
                }} 
              />
            </div>
          );
        })}

      {/* Modals */}
      <TableEditModal 
        isOpen={showTableEditModal} 
        tableData={selectedTableData} 
        onClose={() => setShowTableEditModal(false)} 
        onTableChange={handleTableSave} 
        pdfDoc={pdfDoc}
        viewport={viewport}
        scaleFactor={viewport ? viewport.scale : 1}
      />

      <EditBoxModal 
        show={showEditBoxModal} 
        handleClose={() => setShowEditBoxModal(false)} 
        taggedElements={taggedElements} 
        setTaggedElements={setTaggedElements} 
        selectedBox={selectedBox} 
        selectedBoxIndex={selectedBoxIndex} 
        pdfDoc={pdfDoc} 
        fonts={uploadedFonts} 
      />
      
      <ConfirmDeleteModal 
        show={showConfirmModal} 
        handleClose={() => setShowConfirmModal(false)} 
        handleConfirm={confirmRemoveBox} 
        boxName={boxToDelete?.name || "this element"} 
      />
    </div>
  );
};

export default CanvasDisplay;