import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const drawElement = (context, box) => {
    let color;

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

export const drawTableStructure = (context, box) => {
    if (box.rowPositions && box.colPositions) {
        box.rowPositions.forEach((y, index) => {
            context.beginPath();
            context.moveTo(box.x, box.y + y);
            context.lineTo(box.x + box.width, box.y + y);
            context.strokeStyle = index === box.headerRow ? 'blue' : 'black';
            context.lineWidth = index === box.headerRow ? 2 : 1;
            context.stroke();
        });

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

export const drawReadingOrderLines = (context, taggedElements) => {
    const sectionMap = {};
  
    // Group by section
    taggedElements.forEach((item) => {
      if (!sectionMap[item.sectionName]) {
        sectionMap[item.sectionName] = [];
      }
      sectionMap[item.sectionName].push(item);
    });
  
    Object.values(sectionMap).forEach((sectionItems) => {
      sectionItems
        .sort((a, b) => a.categoryReadingId - b.categoryReadingId)
        .forEach((item, index) => {
          if (index + 1 < sectionItems.length) {
            const nextItem = sectionItems[index + 1];
            context.beginPath();
            context.moveTo(item.x + item.width / 2, item.y + item.height / 2);
            context.lineTo(nextItem.x + nextItem.width / 2, nextItem.y + nextItem.height / 2);
            context.strokeStyle = 'blue';
            context.lineWidth = 2;
            context.stroke();
          }
        });
    });
  };
  

export const drawBoxes = (context, elements) => {
    if (!elements || !Array.isArray(elements)) return;

    const drawElement = (box) => {
        let color;

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

const flattenElements = (elements) => {
    return elements.flatMap((el) =>
        el.type === 'section' ? flattenElements(el.children || []) : el
    );
};

export const drawBoxesOnCanvas = (canvasRef, currentPage, taggedElements) => {
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
  
    context.clearRect(0, 0, canvas.width, canvas.height);
  
    taggedElements
      .filter((box) => box.page === currentPage + 1)
      .forEach((box) => {
        drawElement(context, box);
        if (box.type === 'table') {
          drawTableStructure(context, box);
        }
      });
  };
  

let renderTaskRef = null;

export const renderPage = async (pdfDoc, currentPage, canvasRef, taggedElements, isCancelled) => {

    if (!pdfDoc || typeof pdfDoc.getPage !== "function") {
        console.error("Invalid PDF document object.");
        return;
    }

    if (!pdfDoc || !canvasRef.current) {
        console.log("Required references are missing.");
        return;
    }

    try {
        console.log("Starting to render page:", currentPage + 1);

        const pdfPage = await pdfDoc.getPage(currentPage + 1);
        const context = canvasRef.current.getContext('2d');
        if (!context) {
            return;
        }

        const viewport = pdfPage.getViewport({ scale: 1.5 });
        canvasRef.current.width = viewport.width;
        canvasRef.current.height = viewport.height;

        console.log("Setting up render task");

        // Cancel any ongoing render task
        if (renderTaskRef) {
            await renderTaskRef.cancel();
            renderTaskRef = null;
        }

        const renderTask = pdfPage.render({ canvasContext: context, viewport });
        renderTaskRef = renderTask;

        await renderTask.promise;

        console.log("Rendering completed");

        const flatElements = flattenElements(taggedElements); // Flatten the structure

        const boxesForCurrentPage = taggedElements.filter((box) => box.page === currentPage + 1);

        drawBoxes(context, boxesForCurrentPage);
        drawReadingOrderLines(context, boxesForCurrentPage);

    } catch (error) {
        if (error.name === 'RenderingCancelledException') {
            console.log('Rendering task cancelled');
        } else {
            console.error('Error during rendering:', error);
        }
    } finally {
        if (!isCancelled) {
            renderTaskRef = null; // Clear reference if not explicitly cancelled
        }
    }
};
