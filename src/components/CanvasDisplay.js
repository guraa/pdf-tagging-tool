import React, { useRef, useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.entry';
import 'font-awesome/css/font-awesome.min.css';
import TableEditModal from './TableEditModal';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const CanvasDisplay = ({
    pdfDoc,
    currentPage,
    boxes,
    setDrawBox,
    setShowTextModal,
    setSelectedAltText,
    setSelectedBoxIndex,
    setSelectedImageIndex,
    taggedElements,
    setShowEditBoxModal,
    setTaggedElements,
    setSelectedBox,   
    selectedBox,              
    canvasRef,
    tableData,
}) => {
    const { rowCount, colCount, rowPositions, colPositions } = tableData || {};
    const renderTaskRef = useRef(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [internalDrawBox, setInternalDrawBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [selectedHierarchy, setSelectedHierarchy] = useState("H1");
    const [renderTrigger, setRenderTrigger] = useState(false);
    const [showTableEditModal, setShowTableEditModal] = useState(false); // Modal visibility state
    const [selectedTableData, setSelectedTableData] = useState(null);   // Data for the selected table



    const handleTableSave = (updatedTableData, tableId) => {
        setTaggedElements((prevElements) =>
            prevElements.map((element) =>
                element.id === tableId ? { ...element, ...updatedTableData } : element
            )
        );
            if (selectedTableData && selectedTableData.id === tableId) {
            setSelectedTableData((prev) => ({
                ...prev,
                ...updatedTableData,
            }));
        }
    };

    const drawElement = (context, box) => {
        let color;
    
        // Set color based on type or tag
        if (box.type === 'image') {
            color = 'rgba(255, 255, 0, 0.3)';
        } else if (box.tag === 'H1') {
            color = 'rgba(255, 0, 0, 0.3)';
        } else if (box.tag === 'H2') {
            color = 'rgba(0, 255, 0, 0.3)';
        } else if (box.tag === 'H3') {
            color = 'rgba(0, 0, 255, 0.3)';
        } else {
            color = 'rgba(0, 0, 0, 0.3)';
        }
    
        context.fillStyle = color;
        context.fillRect(box.x, box.y, box.width, box.height);
        context.strokeStyle = 'black';
        context.strokeRect(box.x, box.y, box.width, box.height);
    };

    const renderPageContent = (context, elements, pageNum) => {
        elements.forEach((element) => {
            if (element.multipage || element.page === pageNum) {
                if (element.type === 'table') {
                    drawTableStructure(context, element);
                } else {
                    drawElement(context, element); // Assume drawElement handles other element types
                }
            }
        });
    };
    const drawTableGrid = (context) => {
        if (rowPositions && colPositions) {
            context.strokeStyle = 'black';

            // Draw rows
            rowPositions.forEach((y) => {
                context.beginPath();
                context.moveTo(0, y);
                context.lineTo(canvasRef.current.width, y);
                context.stroke();
            });

            // Draw columns
            colPositions.forEach((x) => {
                context.beginPath();
                context.moveTo(x, 0);
                context.lineTo(x, canvasRef.current.height);
                context.stroke();
            });
        }
    };

    useEffect(() => {
    console.log("CanvasDisplay taggedElements:", taggedElements);
}, [taggedElements]);

    useEffect(() => {
        const context = canvasRef.current.getContext('2d');
        drawTableGrid(context);
    }, [rowPositions, colPositions]);

    console.log("CanvasDisplay received rowPositions:", rowPositions);
    console.log("CanvasDisplay received colPositions:", colPositions);

useEffect(() => {
    console.log("selectedBox:", selectedBox);
    console.log("taggedElements:", taggedElements);

    if (selectedBox && taggedElements) {
        const updatedBox = taggedElements.find((el) => el.id === selectedBox.id);
        if (updatedBox) {
            console.log("Syncing updated box with selectedTableData:", updatedBox);
            setSelectedTableData(updatedBox); // Sync with updated data
        } else {
            console.warn("No matching box found in taggedElements for selectedBox.id:", selectedBox.id);
        }
    }
}, [taggedElements, selectedBox]);
    
    const handleBoxClick = (index) => {
        const box = boxes[index];
    
        if (!box) {
            console.error("Box not found at index:", index);
            return;
        }
    
        setSelectedBox(box); 
        setSelectedBoxIndex(index); 
    
        if (box) {
            setSelectedBox(box); // Pass the box to `selectedBox`
        if (box.type === 'table') {
            console.log("Opening Table Edit Modal for box:", box);
            setSelectedTableData({
                ...box,
                rowPositions: box.rowPositions || [],
                colPositions: box.colPositions || [],
                multipage: box.multipage || false
            });
            setShowTableEditModal(true);
        } else {
            console.log("Opening Generic Edit Box Modal for box:", box);
            setShowEditBoxModal(true); 
        }
    }
    };

    const handleModalClose = () => {
        setShowTableEditModal(false);
        setSelectedTableData(null);
    };

    useEffect(() => {
        console.log('CanvasDisplay received props:');
        console.log('rowPositions:', rowPositions);
        console.log('colPositions:', colPositions);
    }, [rowPositions, colPositions]);
    
    useEffect(() => {
        console.log('CanvasDisplay rendering boxes with table data:');
        console.log('Table Data:', { rowPositions, colPositions });
    }, [boxes]);

    const drawTableStructure = (context, box) => {
        if (box.rowPositions && box.colPositions) {
            // Draw row lines using `rowPositions`
            box.rowPositions.forEach((y, index) => {
                context.beginPath();
                context.moveTo(box.x, box.y + y);
                context.lineTo(box.x + box.width, box.y + y);
                context.strokeStyle = index === box.headerRow ? 'blue' : 'black';
                context.lineWidth = index === box.headerRow ? 2 : 1;
                context.stroke();
            });
    
            // Draw column lines using `colPositions`
            box.colPositions.forEach((x, index) => {
                context.beginPath();
                context.moveTo(box.x + x, box.y);
                context.lineTo(box.x + x, box.y + box.height);
                context.strokeStyle = index === box.headerCol ? 'blue' : 'black';
                context.lineWidth = index === box.headerCol ? 2 : 1;
                context.stroke();
            });
        }
    };

    const drawReadingOrderLines = (context, taggedElements) => {
        if (!taggedElements || taggedElements.length < 2) return;
    
        // Sort sections first, followed by individual ungrouped items
        const sortedSections = taggedElements.filter((item) => item.type === "section");
        
    
        // Draw lines within each section's grouped elements
        sortedSections.forEach((section) => {
            const orderedChildren = section.children.sort((a, b) => a.readingOrder - b.readingOrder);
            
            orderedChildren.forEach((box, index) => {
                if (index + 1 < orderedChildren.length) {
                    const nextBox = orderedChildren[index + 1];
                    context.beginPath();
                    context.moveTo(box.x + box.width / 2, box.y + box.height / 2);
                    context.lineTo(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
                    context.strokeStyle = 'blue';
                    context.lineWidth = 2;
                    context.stroke();
                }
            });
        });
    }
    const drawBoxes = (context, elements) => {
        if (!elements || !Array.isArray(elements)) return;
    
        const drawElement = (box) => {
            let color;
    
            // Set color based on type and tag
            if (box.type === 'image') {
                color = 'rgba(255, 255, 0, 0.3)';
            } else if (box.type === 'table') {
                color = 'rgba(150, 200, 255, 0.2)';
            } else if (box.tag === 'H1') {
                color = 'rgba(255, 0, 0, 0.3)';
            } else if (box.tag === 'H2') {
                color = 'rgba(0, 255, 0, 0.3)';
            } else if (box.tag === 'H3') {
                color = 'rgba(0, 0, 255, 0.3)';
            } else {
                color = 'rgba(0, 0, 0, 0.3)';
            }
    
            context.fillStyle = color;
            context.fillRect(box.x, box.y, box.width, box.height);
            context.strokeStyle = 'black';
            context.strokeRect(box.x, box.y, box.width, box.height);
    
            console.log("Drawing box:", box);
        };
    
        elements.forEach((element) => {
            if (element.isTable) {
                context.fillStyle = 'rgba(150, 200, 255, 0.2)';
                context.fillRect(element.x, element.y, element.width, element.height);
                drawTableStructure(context, element);
            } else {
                drawElement(element);
            }
        });
    };
    
    

    const setBoxHierarchy = (newBox) => {
        const parentBox = boxes.find((box) =>
            box.tag === "H1" &&
            box.x <= newBox.x &&
            box.y <= newBox.y &&
            box.x + box.width >= newBox.x + newBox.width &&
            box.y + box.height >= newBox.y + newBox.height
        );
        newBox.parent = parentBox ? parentBox.tag : null;
        setSelectedHierarchy(parentBox ? "H2" : "H1");
    };

    const drawBoxesOnCanvas = (boxes) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error("Canvas reference is null during box drawing.");
            return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
            console.error("Failed to get canvas context.");
            return;
        }

        // Clear the canvas before re-drawing
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Set stroke style for the boxes
        context.strokeStyle = 'red';
        context.lineWidth = 2;

        // Draw each box from `boxes`
        boxes.forEach((box) => {
            if (box.page === currentPage + 1) {
                context.strokeStyle = 'red';
                context.lineWidth = 2;
                context.strokeRect(box.x, box.y, box.width, box.height);
    
                // Draw table lines if the element is a table
                if (box.isTable) {
                    drawTableStructure(context, box);
                }
            }
        });
    };

    useEffect(() => {
        if (canvasRef.current && pdfDoc) {
            drawBoxesOnCanvas(boxes);
        }
    }, [taggedElements, currentPage]);
    
    useEffect(() => {
        let isCancelled = false;
        let renderLock = false;  // Lock to prevent multiple concurrent renderings
    
        const renderPage = async (pageNum) => {
            if (!pdfDoc || !canvasRef.current || renderTaskRef.current || renderLock) {
                console.log("Rendering is already in progress or required references are missing.");
                return;
            }

            try {
                if (renderTaskRef.current) {
                    console.log("Cancelling existing render task.");
                    await renderTaskRef.current.cancel();
                    renderTaskRef.current = null;
                    console.log("Existing render task cancelled.");
                }
        
    
                console.log("Starting to render page:", pageNum + 1);
    
                const pdfPage = await pdfDoc.getPage(pageNum + 1);
                const context = canvasRef.current.getContext('2d');
                if (!context) {
                 
                    renderLock = false;
                    return;
                }
    
                // Define viewport for the page rendering
    
                const viewport = pdfPage.getViewport({ scale: 1.5 });
                canvasRef.current.width = viewport.width;
                canvasRef.current.height = viewport.height;
    
                console.log("Setting up render task");
                renderTaskRef.current = pdfPage.render({ canvasContext: context, viewport });
    
                // Wait until the rendering completes
                await renderTaskRef.current.promise;
    
                console.log("Rendering completed");
    
                // Once page render is complete, draw overlay elements
                drawBoxes(context, boxes);
                drawReadingOrderLines(context, boxes);
    
            } catch (error) {
                if (error.name !== 'RenderingCancelledException') {
                    console.error('Error during rendering:', error);
                }
            } finally {
                if (!isCancelled) {
                 
                    renderTaskRef.current = null;
                    renderLock = false;  // Release the lock
                }
            }
        };
    
        // Trigger page rendering
        if (canvasRef.current && pdfDoc) {
            // Ensure rendering happens only when the pdfDoc or page number changes.
            // Debounce the rendering to avoid multiple calls in rapid succession.
            const timeoutId = setTimeout(() => renderPage(currentPage), 200);
    
            // Clean up any ongoing rendering or debounce
            return () => {
                isCancelled = true; // Prevent state updates if component unmounts
                clearTimeout(timeoutId);
                if (renderTaskRef.current) {
                    renderTaskRef.current.cancel();
                    renderTaskRef.current = null;
                }
            };
        }
    }, [pdfDoc, currentPage, boxes]);
    


    const handleMouseDown = (e) => {
        if (e.target.tagName !== 'CANVAS' || !canvasRef.current) {
            return; 
        }
        setIsSelecting(true);
        const { offsetX, offsetY } = e.nativeEvent;
        setInternalDrawBox({ x: offsetX, y: offsetY, width: 0, height: 0 });
    };

    const handleMouseMove = (e) => {
        if (!isSelecting || !canvasRef.current) {
            // Stop if not currently selecting or canvas reference is not available
            return;
        }
    
        const { offsetX, offsetY } = e.nativeEvent;
        setInternalDrawBox((prev) => ({
            ...prev,
            width: offsetX - prev.x,
            height: offsetY - prev.y,
        }));
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
        if (internalDrawBox.width !== 0 && internalDrawBox.height !== 0) {
            const newBox = { ...internalDrawBox, tag: selectedHierarchy, page: currentPage + 1 };
            setTaggedElements((prev) => [...prev, newBox]);
            setDrawBox(newBox);
            setShowTextModal(true);
        }
    };


    useEffect(() => {
        console.log("Triggering re-render in CanvasDisplay for updated data.");
        setRenderTrigger((prev) => !prev); // Some state that forces re-render
    }, [taggedElements]);


    return (
        <div style={{ position: 'relative', overflow: 'auto' }}>
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', border: '1px solid black' }} 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            />
    
            {isSelecting && (
                <div
                    style={{
                        position: 'absolute',
                        top: `${internalDrawBox.y}px`,
                        left: `${internalDrawBox.x}px`,
                        width: `${internalDrawBox.width}px`,
                        height: `${internalDrawBox.height}px`,
                        backgroundColor: 'rgba(0, 0, 255, 0.3)',
                        border: '1px solid blue',
                    }}
                />
            )}
    
            {boxes.map((box, index) => {
    
                const displayName = box.alt && box.type === 'image' ? box.alt : box.name;
                let backgroundColor;
                switch (box.tag) {
                    case 'H1':
                        backgroundColor = 'rgba(255, 0, 0, 0.3)';
                        break;
                    case 'H2':
                        backgroundColor = 'rgba(0, 255, 0, 0.3)';
                        break;
                    case 'H3':
                        backgroundColor = 'rgba(0, 0, 255, 0.3)';
                        break;
                    case 'image':
                        backgroundColor = 'rgba(255, 255, 0, 0.3)';
                        break;
                    default:
                        backgroundColor = 'rgba(0, 0, 0, 0.3)';
                        break;
                }
    
                return (
                    <div
                        key={index}
                        onClick={() => handleBoxClick(index)}
                        style={{
                            position: 'absolute',
                            top: `${box.y}px`,
                            left: `${box.x}px`,
                            width: `${box.width}px`,
                            height: `${box.height}px`,
                            backgroundColor: backgroundColor,
                            border: '1px solid black',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            zIndex: 2,
                            cursor: 'pointer',
                        }}
                    >
                        {displayName} ({box.tag})
                    </div>
                );
            })}
<TableEditModal
    isOpen={showTableEditModal}
    tableData={selectedTableData}
    onClose={handleModalClose}
    onTableChange={(updatedTableData) => {
        handleTableSave(updatedTableData, selectedTableData.id);
    }}
    pdfDoc={pdfDoc}
/>
    </div>
    );
    
};

export default CanvasDisplay;
