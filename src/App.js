import React, { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.entry";
import CanvasDisplay from "./components/CanvasDisplay";
import PDFActionsPanel from "./components/PDFActionsPanel";
import TaggedElementsPanel from "./components/TaggedElementsPanel";
import Templates from "./components/Templates";
import "@fortawesome/fontawesome-free/css/all.min.css";
import PdfUploader from "./components/PdfUploader";
import FontManager from "./components/FontManager";
import ModalManager from "./components/ModalManager";
import TextBlockSelector from "./components/TextBlockSelector";
import InitialTemplateModal from "./components/Modals/InitialTemplateModal";
import NewTemplateModal from "./components/Modals/NewTemplateModal";
import TableDetector from "./components/TableDetector";

import _ from "lodash";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const convertToCm = (pixels, viewportScale) =>
  ((pixels / 72) * 2.54) / viewportScale;

const convertTaggedElementsToCm = (taggedElements, viewportScale) => {
  return taggedElements.map((element) => ({
    ...element,
    x: convertToCm(element.x, viewportScale),
    y: convertToCm(element.y, viewportScale),
    width: convertToCm(element.width, viewportScale),
    height: convertToCm(element.height, viewportScale),
  }));
};

// 2. Update the App component with proper state management
function App() {
  // File and PDF related refs
  const fileInputRef = useRef(null);
  const pdfUploaderRef = useRef(null);
  const canvasRef = useRef(null);
  
  // PDF document state
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Modal states
  const [showTextModal, setShowTextModal] = useState(false);
  const [showAltTextModal, setShowAltTextModal] = useState(false);
  const [selectedAltText, setSelectedAltText] = useState("");
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showEditBoxModal, setShowEditBoxModal] = useState(false);
  const [showTableEditModal, setShowTableEditModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showInitialModal, setShowInitialModal] = useState(true);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  
  // Box selection and drawing state
  const [drawBox, setDrawBox] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [selectedBoxName, setSelectedBoxName] = useState("");
  const [selectedBoxIndex, setSelectedBoxIndex] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [mergeCandidate, setMergeCandidate] = useState(null);
  
  // Tagged elements state
  const [taggedElements, setTaggedElements] = useState([]);
  const [selectedTableData, setSelectedTableData] = useState(null);
  const [detectedTables, setDetectedTables] = useState([]);
  
  // Fonts and template state
  const [uploadedFonts, setUploadedFonts] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  
  // Text tagging state
  const [headingType, setHeadingType] = useState("Paragraph");
  const [language, setLanguage] = useState("sv");
  const [sectionName, setSectionName] = useState("");
  
  // Table state
  const [rowCount, setRowCount] = useState(2);
  const [colCount, setColCount] = useState(2);
  const [rowPositions, setRowPositions] = useState([]);
  const [colPositions, setColPositions] = useState([]);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Modal manager state
  const [modalState, setModalState] = useState({
    taggingModal: false,
    mergeModal: false,
    editBoxModal: false,
    tableEditModal: false,
  });

  // ID counter for generating unique IDs
  let idCounter = 0;

  const handleCreateNew = () => {
    setShowInitialModal(false);
    setShowNewTemplateModal(true);
  };

  const handleLoadExisting = () => {
    setShowInitialModal(false);
    console.log("Loading an existing template...");
    // Add your logic for loading an existing template
  };

  const handleSaveTemplate = async ({ templateName, pdfFile }) => {
    setTemplateName(templateName);

    // Programmatically call loadPdfFromFile in PdfUploader
    if (pdfUploaderRef.current) {
      console.log("Uploading PDF file:", pdfFile);
      await pdfUploaderRef.current.loadPdfFromFile(pdfFile);
    }

    setShowNewTemplateModal(false);
  };

  const generateUniqueId = (prefix = "element") => {
    idCounter += 1; // Increment the counter for every new ID
    return `${prefix}-${Date.now()}-${idCounter}-${Math.floor(
      Math.random() * 1000
    )}`;
  };

  // Update selectedBox when taggedElements change
  useEffect(() => {
    if (selectedBox) {
      const updatedBox = taggedElements.find((el) => el.id === selectedBox.id);
      if (updatedBox && !_.isEqual(updatedBox, selectedBox)) {
        setSelectedBox(updatedBox);
      }
    }
  }, [taggedElements, selectedBox]);

  const extractImageBoxesFromPdf = async (pdf) => {
    console.log("Starting enhanced image extraction process...");
    const imageBoxes = []; 
  
    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing page ${i} for images...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const operatorList = await page.getOperatorList();
        const textContent = await page.getTextContent();
        
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;
        
        console.log(`Page dimensions: ${pageWidth}x${pageHeight}`);
        
        // Track image objects found on this page for debugging
        const pageImages = [];
        
        // Process each operation
        let currentState = {
          transformStack: [],
          currentTransform: [1, 0, 0, 1, 0, 0] // Identity matrix
        };
        
        for (let j = 0; j < operatorList.fnArray.length; j++) {
          const fn = operatorList.fnArray[j];
          const args = operatorList.argsArray[j];
          
          if (fn === pdfjsLib.OPS.save) {
            // Save current transform
            currentState.transformStack.push([...currentState.currentTransform]);
          } 
          else if (fn === pdfjsLib.OPS.restore) {
            // Restore previous transform
            if (currentState.transformStack.length > 0) {
              currentState.currentTransform = currentState.transformStack.pop();
            }
          } 
          else if (fn === pdfjsLib.OPS.transform) {
            // Apply new transform (matrix multiplication)
            const [a1, b1, c1, d1, e1, f1] = currentState.currentTransform;
            const [a2, b2, c2, d2, e2, f2] = args;
            
            // Matrix multiplication
            currentState.currentTransform = [
              a1 * a2 + c1 * b2,
              b1 * a2 + d1 * b2,
              a1 * c2 + c1 * d2,
              b1 * c2 + d1 * d2,
              a1 * e2 + c1 * f2 + e1,
              b1 * e2 + d1 * f2 + f1
            ];
          } 
          else if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
            // Extract image info using the current transform
            const [a, b, c, d, e, f] = currentState.currentTransform;
            
            // Get viewport scaling factors
            const vpXScale = viewport.width / viewport.viewBox[2];
            const vpYScale = viewport.height / viewport.viewBox[3];
            
            // Get image dimensions from transform matrix
            const imgWidth = Math.abs(a) * vpXScale;
            const imgHeight = Math.abs(d) * vpYScale;
            
            // Get image position
            const imgX = e * vpXScale;
            // In PDF coordinates, Y=0 is at the bottom. In HTML/canvas, Y=0 is at the top.
            // PDF viewport handles this by using a transform that flips the Y-axis
            
            // CRITICAL FIX: Adjust Y-coordinate to match the actual image position
            // Since we're in viewport coordinates, we use pageHeight to flip the Y-axis
            const imgY = pageHeight - ((f * vpYScale) + imgHeight); // This is the key correction
            
            // Create image box
            const imageName = args[0] || `Image-${imageBoxes.length + 1}`;
            
            // Filter out tiny or invalid images (likely decorative elements or artifacts)
            if (imgWidth < 5 || imgHeight < 5 || 
                isNaN(imgX) || isNaN(imgY) || 
                isNaN(imgWidth) || isNaN(imgHeight)) {
              console.log(`Skipping too small or invalid image: ${imageName}`);
              continue;
            }
            
            // Check if image is actually visible on the page (with some margin)
            if (imgX < -50 || imgY < -50 || 
                imgX > pageWidth + 50 || imgY > pageHeight + 50) {
              console.log(`Skipping image outside viewport bounds: ${imageName}`);
              continue;
            }
            
            console.log(`Found image "${imageName}" at (${imgX.toFixed(1)}, ${imgY.toFixed(1)}) with size ${imgWidth.toFixed(1)}x${imgHeight.toFixed(1)}`);
            
            const imageBox = {
              type: "image",
              name: imageName,
              x: imgX,
              y: imgY,
              width: imgWidth,
              height: imgHeight,
              page: i,
              alt: "",
              id: `image-${i}-${imageBoxes.length}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            };
            
            imageBoxes.push(imageBox);
            pageImages.push(imageBox);
          }
        }
        
        console.log(`Found ${pageImages.length} images on page ${i}`);
      }
      
      console.log(`Total of ${imageBoxes.length} images found`);
      return imageBoxes;
    } catch (error) {
      console.error("Error in image extraction:", error);
      return [];
    }
  };
  const extractTableBoxesFromPdf = async (pdf) => {
    try {
      console.log("Starting table extraction from PDF...");
      const tableBoxes = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const textContent = await page.getTextContent();

        // Simple heuristic: Look for structured text that might be tables
        // Group text items by y-coordinate (rows)
        const rowGroups = {};
        
        if (textContent.items && textContent.items.length > 0) {
          textContent.items.forEach(item => {
            // Round y-coordinate to group nearby items
            const roundedY = Math.round(item.transform[5] / 10) * 10;
            
            if (!rowGroups[roundedY]) {
              rowGroups[roundedY] = [];
            }
            
            rowGroups[roundedY].push({
              text: item.str,
              x: item.transform[4],
              y: item.transform[5],
              width: item.width || 20,
              height: item.height || 12
            });
          });
          
          // Find rows with multiple items (potential table rows)
          const tableRows = Object.values(rowGroups)
            .filter(row => row.length >= 3) // At least 3 items in a row to be a table
            .sort((a, b) => a[0].y - b[0].y); // Sort by y-coordinate
          
          // Look for consecutive rows that might form a table
          if (tableRows.length >= 3) { // At least 3 rows to be a table
            // Find min/max coordinates for all these rows
            let minX = Infinity, maxX = 0, minY = Infinity, maxY = 0;
            
            tableRows.forEach(row => {
              row.forEach(item => {
                minX = Math.min(minX, item.x);
                maxX = Math.max(maxX, item.x + item.width);
                minY = Math.min(minY, item.y - item.height);
                maxY = Math.max(maxY, item.y);
              });
            });
            
            // Add some padding
            minX = Math.max(0, minX - 10);
            minY = Math.max(0, minY - 10);
            maxX = maxX + 10;
            maxY = maxY + 10;
            
            // Convert to viewport coordinates - PDF has origin at bottom-left
            const adjustedX = minX;
            const adjustedY = viewport.height - maxY;
            const adjustedWidth = maxX - minX;
            const adjustedHeight = maxY - minY;
            
            // Create table box
            tableBoxes.push({
              type: "table",
              name: `Table on page ${i}`,
              x: adjustedX,
              y: adjustedY,
              width: adjustedWidth,
              height: adjustedHeight,
              page: i,
              rowCount: tableRows.length,
              colCount: Math.max(...tableRows.map(row => row.length)),
              containsTable: true,
              rowPositions: Array.from(
                { length: tableRows.length + 1 },
                (_, idx) => (idx * adjustedHeight) / tableRows.length
              ),
              colPositions: Array.from(
                { length: Math.max(...tableRows.map(row => row.length)) + 1 },
                (_, idx) => (idx * adjustedWidth) / Math.max(...tableRows.map(row => row.length))
              )
            });
          }
        }
      }
      
      console.log("Extracted tables:", tableBoxes);
      return tableBoxes;
    } catch (error) {
      console.error("Error extracting tables:", error);
      return [];
    }
  };

  const handleSaveAltText = () => {
    if (selectedImageIndex !== null && selectedImageIndex >= 0) {
      setTaggedElements((prev) => {
        const updatedTags = prev.map((el, index) => {
          if (index === selectedImageIndex && el.type === "image") {
            return { ...el, alt: selectedAltText };
          }
          return el;
        });
        return updatedTags;
      });
    } else if (selectedBox && selectedBox.type === "image") {
      // If we have a selected box but no index, update by ID
      setTaggedElements((prev) => {
        return prev.map((el) => {
          if (el.id === selectedBox.id && el.type === "image") {
            return { ...el, alt: selectedAltText };
          }
          return el;
        });
      });
    }
    
    // Close any open modals
    setShowAltTextModal(false);
    setModalState(prev => ({ ...prev, editBoxModal: false }));
  };

  const handleTemplateLoad = ({ jsonData, pdfDoc }) => {
    console.log("Template loaded with:", { jsonData, pdfDoc });
    setPdfDoc(pdfDoc);
    setTaggedElements(jsonData.taggingInformation || []);
    setCurrentPage(0);
    setTemplateName(jsonData.templateName);

    console.log("Replaced PDF and updated template:", {
      templateName: jsonData.templateName,
      taggedElements: jsonData.taggingInformation,
    });
  };

  const createTaggedPdf = async () => {
    try {
      console.log("fileInputRef:", fileInputRef);
      if (!fileInputRef?.current?.files?.[0]) {
        alert("Please upload a PDF first.");
        return;
      }
  
      const pdfFile = fileInputRef.current.files[0];
      const currentPdfPage = await pdfDoc.getPage(currentPage + 1);
      const viewportScale = currentPdfPage.getViewport({ scale: 1.5 }).scale;
  
      const convertedTags = convertTaggedElementsToCm(taggedElements, viewportScale);
  
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append(
        "tags",
        JSON.stringify({
          templateName,
          taggingInformation: convertedTags.map((element) =>
            element.type === "table"
              ? { ...element, metadata: element.metadata || {} }
              : element
          ),
        })
      );
  
      const response = await axios.post(
        "http://localhost:8085/create-accessible-pdf",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          responseType: "blob",
        }
      );
  
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tagged_pdf_example.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error creating tagged PDF:", error);
      alert("An error occurred while creating the tagged PDF.");
    }
  };

  const handleSaveTag = ({ selectedFont, isTable }) => {
    if (!drawBox || !selectedBoxName) return;

    const newTag = {
      id: generateUniqueId(isTable ? "table" : "text"),
      type: isTable ? "table" : "text",
      name: selectedBoxName,
      tag: isTable ? "table" : headingType, // Use "table" for table tags, otherwise use headingType
      language: language,
      font: selectedFont,
      x: drawBox.x,
      y: drawBox.y,
      width: drawBox.width,
      height: drawBox.height,
      page: currentPage + 1,
      rowCount: isTable ? rowCount : undefined,
      colCount: isTable ? colCount : undefined,
      containsTable: isTable,
      rowPositions: isTable ? Array.from({ length: rowCount + 1 }, (_, i) => (i * drawBox.height) / rowCount) : undefined,
      colPositions: isTable ? Array.from({ length: colCount + 1 }, (_, i) => (i * drawBox.width) / colCount) : undefined,
    };

    console.log("Attempting to save new tag:", newTag);
    // Check for overlapping boxes
    const overlappingBoxes = taggedElements.filter((box) =>
      doBoxesOverlap(box, newTag)
    );
    if (overlappingBoxes.length > 0) {
      console.log("Detected overlapping boxes:", overlappingBoxes);
      setMergeCandidate({ newBox: newTag, overlappingBoxes });
      setShowMergeModal(true);
      return; // Wait for user confirmation before proceeding
    }

    setTaggedElements((prevElements) => {
      let isAdded = false; // Track if the new tag has been added to a section's children

      const updatedElements = prevElements.map((element) => {
        if (
          element.type === "section" && // Ensure it's a section
          element.x <= newTag.x &&
          element.y <= newTag.y &&
          element.x + element.width >= newTag.x + newTag.width &&
          element.y + element.height >= newTag.y + newTag.height
        ) {
          // Add the new tag to the section's children
          isAdded = true;
          return {
            ...element,
            children: [...(element.children || []), newTag], // Safely append to children
          };
        }
        return element; // Return unchanged element if no match
      });

      // If the new tag wasn't added to any section, add it to the top-level array
      if (!isAdded) {
        updatedElements.push(newTag);
      }

      return updatedElements;
    });

    // Update selectedBox to reflect the new tag
    setSelectedBox(newTag);

    // Reset drawBox and close modal
    setDrawBox(null);
    setModalState(prev => ({ ...prev, taggingModal: false }));
  };

  const doBoxesOverlap = (box1, box2) => {
    const buffer = 1;
    return (
      box1.x < box2.x + box2.width + buffer &&
      box1.x + box1.width + buffer > box2.x &&
      box1.y < box2.y + box2.height + buffer &&
      box1.y + box1.height + buffer > box2.y
    );
  };

  // Navigation functions
  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (pdfDoc && currentPage < pdfDoc.numPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="container-fluid" style={{ height: "100vh" }}>
      <div className="row" style={{ height: "100%" }}>
        {/* Left Panel for Upload and Tagging */}
        <div
          className="col-md-3 p-4 d-flex flex-column justify-content-between"
          style={{
            backgroundColor: "#f8f9fa",
            boxShadow: "2px 2px 8px rgba(0,0,0,0.1)",
            borderRadius: "8px",
            height: "100vh",
            border: "1px solid #e0e0e0",
          }}
        >
          {/* Upload Section */}
          <PdfUploader
            ref={pdfUploaderRef}
            fileInputRef={fileInputRef}
            setPdfDoc={setPdfDoc}
            setCurrentPage={setCurrentPage}
            setTaggedElements={setTaggedElements}
            generateUniqueId={generateUniqueId}
            extractImageBoxesFromPdf={extractImageBoxesFromPdf}
            extractTableBoxesFromPdf={extractTableBoxesFromPdf}
          />
          
          {/* Initial Modal */}
          <InitialTemplateModal
            show={showInitialModal}
            onHide={() => setShowInitialModal(false)}
            onCreateNew={handleCreateNew}
            onLoadExisting={handleLoadExisting}
          />

          {/* New Template Modal */}
          <NewTemplateModal
            show={showNewTemplateModal}
            onHide={() => setShowNewTemplateModal(false)}
            onSave={handleSaveTemplate}
            fileInputRef={fileInputRef} // Pass the file input ref
          />

          {/* Actions Section */}
          <PDFActionsPanel
            pdfDoc={pdfDoc}
            setTaggedElements={setTaggedElements}
            uploadedFonts={uploadedFonts}
            onUploadFont={(newFont) =>
              setUploadedFonts((prevFonts) => [...prevFonts, newFont])
            }
          />

          {/* Template Manager */}
          <Templates
            taggedElements={taggedElements}
            setTaggedElements={setTaggedElements}
            templateName={templateName}
            fileInputRef={fileInputRef}
            setTemplateName={setTemplateName}
            onLoadTemplate={handleTemplateLoad} // Load the template's PDF
          />

          {/* Navigation Controls */}
          {pdfDoc && (
            <div className="d-flex justify-content-between mb-3">
              <button 
                className="btn btn-secondary" 
                onClick={goToPreviousPage}
                disabled={currentPage === 0}
              >
                <i className="fas fa-arrow-left mr-2"></i> Previous Page
              </button>
              <span className="align-self-center">
                Page {currentPage + 1} of {pdfDoc.numPages}
              </span>
              <button 
                className="btn btn-secondary" 
                onClick={goToNextPage}
                disabled={currentPage >= pdfDoc.numPages - 1}
              >
                Next Page <i className="fas fa-arrow-right ml-2"></i>
              </button>
            </div>
          )}

          {/* Create Tagged PDF */}
          <button
            className="btn btn-success w-100"
            onClick={createTaggedPdf}
            style={{ borderRadius: "8px" }}
          >
            <i className="fas fa-save mr-2"></i> Create Tagged PDF
          </button>
        </div>

        {/* Center PDF Preview Panel */}
        <div
          className="col-md-6 mx-auto p-3"
          style={{
            backgroundColor: "white",
            boxShadow: "2px 2px 8px rgba(0,0,0,0.1)",
            borderRadius: "8px",
            height: "auto",
            minHeight: "100vh",
            border: "1px solid #e0e0e0",
            overflow: "visible", 
          }}
        >
          {/* Conditionally render the loaded PDF */}
          {pdfDoc ? (
            <CanvasDisplay
              pdfDoc={pdfDoc}
              currentPage={currentPage}
              boxes={taggedElements}
              detectedTables={detectedTables}
              setDrawBox={setDrawBox}
              setShowTextModal={setShowTextModal}
              setSelectedAltText={setSelectedAltText}
              setSelectedBoxIndex={setSelectedBoxIndex}
              setSelectedImageIndex={setSelectedImageIndex}
              taggedElements={taggedElements}
              setShowEditBoxModal={setShowEditBoxModal}
              setTaggedElements={setTaggedElements}
              selectedBox={selectedBox}
              setSelectedBox={setSelectedBox}
              canvasRef={canvasRef}
              uploadedFonts={uploadedFonts}
              setModalState={setModalState}
              tableData={{
                rowCount: selectedBox?.rowCount || 2,
                colCount: selectedBox?.colCount || 2,
                rowPositions: selectedBox?.rowPositions || [],
                colPositions: selectedBox?.colPositions || [],
              }}
            />
          ) : (
            <p className="text-muted text-center">
              No PDF loaded. Please upload a PDF or load a template.
            </p>
          )}
        </div>
        
        {/* Run table detection when PDF is loaded */}
        {pdfDoc && 
          <TableDetector 
            pdfDoc={pdfDoc} 
            onTablesDetected={setDetectedTables}
            setTaggedElements={setTaggedElements}
          />
        }

        {/* Right Panel for Tagged Elements */}
        <div
          className="col-md-3 p-4"
          style={{
            backgroundColor: "#f8f9fa",
            boxShadow: "2px 2px 8px rgba(0,0,0,0.1)",
            borderRadius: "8px",
            height: "100vh",
            border: "1px solid #e0e0e0",
            overflowY: "auto",
          }}
        >
          <TaggedElementsPanel
            taggedElements={taggedElements}
            setTaggedElements={setTaggedElements}
            pdfDoc={pdfDoc}
            currentPage={currentPage}
            canvasRef={canvasRef}
          />
        </div>
      </div>

      {/* Modal Manager - Central place for all modals */}
      <ModalManager
        modalState={modalState}
        setModalState={setModalState}
        taggingModalProps={{
          handleSave: showAltTextModal ? handleSaveAltText : handleSaveTag,
          languages: [
            { code: "sv", name: "Swedish" },
            { code: "en", name: "English" },
          ],
          headingType,
          setHeadingType,
          setMergeCandidate,
          setShowMergeModal: (show) =>
            setModalState((prev) => ({ ...prev, mergeModal: show })),
          taggedElements,
          generateUniqueId,
          language,
          selectedBox: drawBox,
          setTaggedElements,
          setLanguage,
          selectedBoxName,
          setSelectedBoxName,
          fonts: uploadedFonts,
          rowCount,
          setRowCount,
          colCount,
          setColCount,
          pdfDoc,
          isAltText: showAltTextModal,
          altText: selectedAltText,
          setAltText: setSelectedAltText,
        }}
        mergeModalProps={{
          mergeCandidate,
          setTaggedElements,
        }}
        editBoxModalProps={{
          taggedElements,
          setTaggedElements,
          selectedBoxIndex,
          selectedBox,
          languages: [
            { code: "sv", name: "Swedish" },
            { code: "en", name: "English" },
          ],
          language,
          fonts: uploadedFonts,
          detectedTables: detectedTables,
          pdfDoc,
        }}
        tableEditModalProps={{
          taggedElements,
          setTaggedElements,
          selectedBoxIndex,
          tableData: selectedBox?.type === "table" ? selectedBox : null,
          pdfDoc,
        }}
      />
    </div>
  );
}

export default App;