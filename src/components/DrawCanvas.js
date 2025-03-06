import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.entry';
import renderManager from './RenderManager';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Draw a basic element box
export const drawElement = (context, box) => {
    let color;

    // Choose color based on element type
    if (box.type === 'image') {
        color = 'rgba(255, 255, 0, 0.3)'; // Yellow for images
    } else if (box.type === 'table') {
        color = 'rgba(0, 255, 255, 0.3)'; // Cyan for tables
    } else if (box.tag === 'H1') {
        color = 'rgba(255, 0, 0, 0.3)'; // Red for H1
    } else if (box.tag === 'H2') {
        color = 'rgba(0, 255, 0, 0.3)'; // Green for H2
    } else if (box.tag === 'H3') {
        color = 'rgba(0, 0, 255, 0.3)'; // Blue for H3
    } else {
        color = 'rgba(0, 0, 0, 0.3)'; // Black for other elements
    }

    // Draw rectangle
    context.fillStyle = color;
    context.fillRect(box.x, box.y, box.width, box.height);
    context.strokeStyle = 'black';
    context.strokeRect(box.x, box.y, box.width, box.height);
    
    // Add label to the box
    context.fillStyle = 'black';
    context.font = '12px Arial';
    const name = box.name || box.type || 'Element';
    context.fillText(name.substring(0, 20), box.x + 5, box.y + 15);
};

// Draw table structure with rows and columns
export const drawTableStructure = (context, box) => {
    if (box.rowPositions && box.colPositions) {
        // Draw row lines
        box.rowPositions.forEach((y, index) => {
            context.beginPath();
            context.moveTo(box.x, box.y + y);
            context.lineTo(box.x + box.width, box.y + y);
            context.strokeStyle = index === box.headerRow ? 'blue' : 'black';
            context.lineWidth = index === box.headerRow ? 2 : 1;
            context.stroke();
        });

        // Draw column lines
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

// Draw lines showing reading order between elements
export const drawReadingOrderLines = (context, taggedElements) => {
    // Group by section if available
    const sectionMap = {};
    
    // Create default section for elements without a section
    sectionMap['default'] = [];
    
    // Group elements by section
    taggedElements.forEach((item) => {
        if (item.sectionName) {
            if (!sectionMap[item.sectionName]) {
                sectionMap[item.sectionName] = [];
            }
            sectionMap[item.sectionName].push(item);
        } else {
            sectionMap['default'].push(item);
        }
    });
    
    // Draw lines for each section
    Object.values(sectionMap).forEach((sectionItems) => {
        // Sort by reading order if available, otherwise by vertical position
        const sortedItems = sectionItems.sort((a, b) => {
            if (a.readingOrder !== undefined && b.readingOrder !== undefined) {
                return a.readingOrder - b.readingOrder;
            }
            // Fall back to sorting by Y position (top to bottom)
            return a.y - b.y;
        });
        
        // Draw lines connecting elements in reading order
        sortedItems.forEach((item, index) => {
            if (index + 1 < sortedItems.length) {
                const nextItem = sortedItems[index + 1];
                
                // Draw a line from the center of the current item to the center of the next item
                context.beginPath();
                context.moveTo(item.x + item.width / 2, item.y + item.height / 2);
                context.lineTo(nextItem.x + nextItem.width / 2, nextItem.y + nextItem.height / 2);
                context.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red
                context.lineWidth = 2;
                context.setLineDash([5, 3]); // Dashed line
                context.stroke();
                context.setLineDash([]); // Reset to solid line
                
                // Draw arrow at the end of the line
                const angle = Math.atan2(
                    nextItem.y + nextItem.height / 2 - (item.y + item.height / 2),
                    nextItem.x + nextItem.width / 2 - (item.x + item.width / 2)
                );
                
                const arrowSize = 10;
                const arrowX = nextItem.x + nextItem.width / 2;
                const arrowY = nextItem.y + nextItem.height / 2;
                
                context.beginPath();
                context.moveTo(arrowX, arrowY);
                context.lineTo(
                    arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
                    arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
                );
                context.lineTo(
                    arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
                    arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
                );
                context.closePath();
                context.fillStyle = 'rgba(255, 0, 0, 0.7)';
                context.fill();
            }
        });
    });
};

// Draw all boxes on the canvas
export const drawBoxes = (context, elements) => {
    if (!elements || !Array.isArray(elements)) return;

    // Sort elements by type to draw them in layers (tables first, then text, then images)
    const sortedElements = [...elements].sort((a, b) => {
        const typeOrder = { table: 1, text: 2, image: 3 };
        return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
    });

    // Draw each element
    sortedElements.forEach((element) => {
        if (element.type === 'table') {
            // Draw table with its structure
            context.fillStyle = 'rgba(150, 200, 255, 0.2)';
            context.fillRect(element.x, element.y, element.width, element.height);
            drawTableStructure(context, element);
        } else {
            // Draw regular element
            drawElement(context, element);
        }
    });
};

// Flatten nested elements (like sections with children)
const flattenElements = (elements) => {
    return elements.flatMap((el) =>
        el.type === 'section' ? flattenElements(el.children || []) : el
    );
};

// Main function to draw all boxes and reading order on a canvas
export const drawBoxesOnCanvas = (canvasRef, currentPage, taggedElements, showReadingOrder = true) => {
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
    
    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get elements for the current page
    const elementsForCurrentPage = taggedElements
        .filter((box) => box.page === currentPage + 1);
    
    // Draw all elements
    drawBoxes(context, elementsForCurrentPage);
    
    // Draw reading order lines if enabled
    if (showReadingOrder) {
        drawReadingOrderLines(context, elementsForCurrentPage);
    }
};

// Render a PDF page with overlays - using RenderManager
export const renderPage = async (pdfDoc, currentPage, canvasRef, taggedElements, isCancelled = false, showReadingOrder = true) => {
    if (!pdfDoc || typeof pdfDoc.getPage !== "function") {
        console.error("Invalid PDF document object.");
        return;
    }

    if (!canvasRef.current) {
        console.log("Canvas reference is missing.");
        return;
    }
    
    if (isCancelled) {
        console.log("Render cancelled before starting.");
        return;
    }

    // Create a unique ID for this render task
    const canvasId = `pdf-canvas-${currentPage}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    try {
        // Cancel any existing render operations first
        renderManager.cancelAll();
        
        await renderManager.queueRender(canvasId, async () => {            
            // Get the PDF page
            const pdfPage = await pdfDoc.getPage(currentPage + 1);
            const context = canvasRef.current.getContext('2d');
            if (!context) {
                console.error("Failed to get canvas 2D context.");
                return { success: false, error: "No context" };
            }

            // Set up viewport and canvas - 1.5 is the scaling factor
            const viewport = pdfPage.getViewport({ scale: 1.5 });
            canvasRef.current.width = viewport.width;
            canvasRef.current.height = viewport.height;
            
            // Clear the canvas
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Create the render context with appropriate transform to fix orientation
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            // Create a new render task
            const renderTask = pdfPage.render(renderContext);

            // Wait for rendering to complete
            await renderTask.promise;

            // Get elements for the current page
            const elementsForCurrentPage = taggedElements.filter(
                (box) => box.page === currentPage + 1
            );

            // Draw all elements
            drawBoxes(context, elementsForCurrentPage);
            
            // Draw reading order if requested
            if (showReadingOrder) {
                drawReadingOrderLines(context, elementsForCurrentPage);
            }
            
            return { success: true };
        });
    } catch (error) {
        if (error.name === 'RenderingCancelledException') {
            console.log('Rendering task cancelled');
        } else {
            console.error('Error during rendering:', error);
        }
        return { success: false, error };
    }
};