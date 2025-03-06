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

function App() {
  const fileInputRef = useRef(null);
  const pdfUploaderRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showAltTextModal, setShowAltTextModal] = useState(false);
  const [selectedAltText, setSelectedAltText] = useState("");
  const [drawBox, setDrawBox] = useState(null);
  const [selectedBoxName, setSelectedBoxName] = useState("");
  const [headingType, setHeadingType] = useState("Paragraph");
  const [language, setLanguage] = useState("sv");
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeCandidate, setMergeCandidate] = useState(null);
  const [showEditBoxModal, setShowEditBoxModal] = useState(false);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState(null);
  const [uploadedFonts, setUploadedFonts] = useState([]);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [taggedElements, setTaggedElements] = useState([]);
  const [rowCount, setRowCount] = useState(2); // Default to 2 rows
  const [colCount, setColCount] = useState(2); // Default to 2 columns
  const [showTableEditModal, setShowTableEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedBox, setSelectedBox] = useState(null);
  const [useExistingTemplate, setUseExistingTemplate] = useState(false);
  const [rowPositions, setRowPositions] = useState([]);
  const [colPositions, setColPositions] = useState([]);
  const [selectedTableData, setSelectedTableData] = useState(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [showInitialModal, setShowInitialModal] = useState(true);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [detectedTables, setDetectedTables] = useState([]);

  let idCounter = 0;

  const [modalState, setModalState] = useState({
    taggingModal: false,
    mergeModal: false,
    editBoxModal: false,
    tableEditModal: false,
  });

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
  const canvasRef = useRef(null);

  const handleSaveTableData = (updatedTableData) => {
    console.log("Saving updated table data:", updatedTableData);

    setTaggedElements((prevElements) =>
      prevElements.map((el) =>
        el.id === updatedTableData.id ? { ...el, ...updatedTableData } : el
      )
    );

    setSelectedBox((prev) =>
      prev?.id === updatedTableData.id ? { ...prev, ...updatedTableData } : prev
    );

    console.log("Updated taggedElements:", taggedElements);
  };

  useEffect(() => {
    if (selectedBox) {
      const updatedBox = taggedElements.find((el) => el.id === selectedBox.id);
      if (updatedBox && !_.isEqual(updatedBox, selectedBox)) {
        setSelectedBox(updatedBox);
      }
    }
  }, [taggedElements]);

  const extractImageBoxesFromPdf = async (pdf) => {
    const imageBoxes = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const operatorList = await page.getOperatorList();
      const transformStack = [];
      let currentTransformMatrix = new DOMMatrix();

      operatorList.fnArray.forEach((fn, index) => {
        const args = operatorList.argsArray[index];

        if (fn === pdfjsLib.OPS.save) {
          transformStack.push(currentTransformMatrix);
        } else if (fn === pdfjsLib.OPS.restore) {
          currentTransformMatrix = transformStack.pop() || new DOMMatrix();
        } else if (fn === pdfjsLib.OPS.transform) {
          const [a, b, c, d, e, f] = args;
          currentTransformMatrix = currentTransformMatrix.multiply(
            new DOMMatrix([a, b, c, d, e, f])
          );
        } else if (
          fn === pdfjsLib.OPS.paintImageXObject ||
          fn === pdfjsLib.OPS.paintJpegXObject
        ) {
          const imgX = currentTransformMatrix.e * viewport.scale;
          const imgY = currentTransformMatrix.f * viewport.scale;
          const imgWidth = Math.abs(currentTransformMatrix.a * viewport.scale);
          const imgHeight = Math.abs(currentTransformMatrix.d * viewport.scale);
          const adjustedImgY = viewport.height - imgY;

          imageBoxes.push({
            type: "image",
            name: args[0],
            x: imgX,
            y: adjustedImgY,
            width: imgWidth,
            height: imgHeight,
            page: i,
            alt: "",
          });
        }
      });
    }
    return imageBoxes;
  };

  const handleSaveAltText = () => {
    setTaggedElements((prev) => {
      const updatedTags = prev.map((el, index) => {
        if (index === selectedImageIndex && el.type === "image") {
          return { ...el, alt: selectedAltText };
        }
        return el;
      });
      return updatedTags;
    });
    setShowAltTextModal(false);
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
  

  const extractTableBoxesFromPdf = async (pdf) => {
    const tableBoxes = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const textContent = await page.getTextContent();

      const tableDetected = textContent.items.some((item) =>
        item.str.includes("Table")
      );
      if (tableDetected) {
        tableBoxes.push({
          type: "table",
          name: "Detected Table",
          x: 50,
          y: 50,
          width: 400,
          height: 200,
          page: i,
          rowCount: 5,
          colCount: 3,
        });
      }
    }
    return tableBoxes;
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

    // Ensure selectedBox reflects the new tag if applicable
    setSelectedBox((prev) =>
      prev?.id === newTag.id ? { ...prev, ...newTag } : newTag
    );

    // Reset drawBox and close modal
    setDrawBox(null);
    setShowTextModal(false);
  };

  const validateLoadedTemplate = ({ jsonData, pdfBuffer }) => {
    if (!jsonData || !Array.isArray(jsonData.taggingInformation)) {
      console.error("Invalid JSON data in template:", jsonData);
      alert("The selected template is invalid. Please choose another one.");
      return false;
    }

    if (!pdfBuffer) {
      console.error("Missing PDF buffer in template.");
      alert("The selected template does not include a valid PDF.");
      return false;
    }

    return true;
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
            setSelectedBox={setSelectedBox}
            selectedBox={selectedBox}
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
      {pdfDoc && 
      <TableDetector 
      pdfDoc={pdfDoc} 
      onTablesDetected={setDetectedTables}
      setTaggedElements={setTaggedElements}
       />}

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

    {/* Modals */}
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
        languages: [
          { code: "sv", name: "Swedish" },
          { code: "en", name: "English" },
        ],
        language,
        fonts: uploadedFonts,
        tableData: selectedBox?.tables,
        onSave: handleSaveTableData,
        pdfDoc,
      }}
      tableEditModalProps={{
        taggedElements,
        setTaggedElements,
        selectedBoxIndex,
        tableData: selectedBox?.tables,
        pdfDoc,
      }}
    />
  </div>
);

}
export default App;
