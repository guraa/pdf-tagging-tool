import React, { useRef, useState, useEffect } from "react";
import "font-awesome/css/font-awesome.min.css";
import TableEditModal from "./Modals/TableEditModal";
import EditBoxModal from "./Modals/EditBoxModal";
import { drawTableStructure } from "./DrawCanvas";
import ConfirmDeleteModal from "./Modals/ConfirmDeleteModal";
import { FaTimes } from "react-icons/fa";

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
}) => {
  const [selectedBox, setSelectedBox] = useState(null);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [internalDrawBox, setInternalDrawBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const [selectedTableData, setSelectedTableData] = useState(null);
  const [showTableEditModal, setShowTableEditModal] = useState(false);
  const [showEditBoxModal, setShowEditBoxModal] = useState(false);

  const [boxToDelete, setBoxToDelete] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [viewport, setViewport] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const renderCanvas = async () => {
      if (!canvasRef.current || !pdfDoc) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (renderTaskRef.current && renderTaskRef.current.cancel) {
        try {
          await renderTaskRef.current.cancel();
        } catch (error) {
          console.warn("Cancel rendering task error:", error);
        }
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(currentPage + 1);
        const vp = page.getViewport({ scale: 1.5 });
        setViewport(vp);
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderTaskRef.current = page.render({ canvasContext: context, viewport });
        await renderTaskRef.current.promise;
        if (cancelled) return;

        taggedElements.forEach((box) => {
          if (box.page === currentPage + 1 && box.type === "table") {
            drawTableStructure(context, box);
          }
        });
      } catch (error) {
        console.error("Error rendering PDF page:", error);
      }
    };

    renderCanvas();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) renderTaskRef.current.cancel();
    };
  }, [pdfDoc, currentPage, taggedElements, detectedTables]);

  const handleTableSave = (updatedTableData) => {
    setTaggedElements((prevElements) =>
      prevElements.map((element) =>
        element.id === updatedTableData.id
          ? { ...element, ...updatedTableData } 
          : element
      )
    );
  };
  

  const handleRemoveBox = (box) => {
    setBoxToDelete(box);
    setShowConfirmModal(true);
  };

  const confirmRemoveBox = () => {
    setTaggedElements((prev) => prev.filter((b) => b.id !== boxToDelete.id));
    setShowConfirmModal(false);
  };

  const handleMouseDown = (e) => {
    if (e.target.tagName !== "CANVAS") return;
    setIsSelecting(true);
    const { offsetX, offsetY } = e.nativeEvent;
    setInternalDrawBox({ x: offsetX, y: offsetY, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isSelecting) return;
    const { offsetX, offsetY } = e.nativeEvent;
    setInternalDrawBox((prev) => ({ ...prev, width: offsetX - prev.x, height: offsetY - prev.y }));
  };

  const updateTable = (updatedTable) => {
    setTaggedElements((prevElements) => 
      prevElements.map(el => el.id === updatedTable.id ? updatedTable : el) // 🔄 Correctly updates existing table
    );
  };

  

  const handleMouseUp = () => {
    setIsSelecting(false);

    if (internalDrawBox.width && internalDrawBox.height) {
      const newBox = {
        ...internalDrawBox,
        type: "text",
        tag: "Paragraph",
        page: currentPage + 1,
        id: `drawn-${Date.now()}`,
      };

      setTaggedElements((prev) => [...prev, newBox]);
      setSelectedBox(newBox);
      setSelectedBoxIndex(taggedElements.length);
      setDrawBox(newBox);
      setModalState((prev) => ({ ...prev, taggingModal: true }));
    }

    setInternalDrawBox({ x: 0, y: 0, width: 0, height: 0 });
  };
  const handleBoxClick = (box) => {
    setSelectedBox(box);
    setSelectedBoxIndex(taggedElements.findIndex((el) => el.id === box.id));
  
    if (box.type === "image") {
      setSelectedImageIndex(selectedBoxIndex);
      setSelectedAltText(box.alt || "");
      setShowEditBoxModal(true); // Ensure this sets the modal to open
    } else if (box.type === "table") {
      setSelectedTableData(box);
      setShowTableEditModal(true); // Ensure this sets the modal to open
    } else {
      setDrawBox(box);
      setModalState((prev) => ({ ...prev, taggingModal: true }));
    }
  };
  

  return (
    <div className="pdf-canvas-container" style={{ position: "relative", width: "100%", height: "100%", overflow: "auto" }}>
      <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} />

      {isSelecting && (
        <div
          style={{
            position: "absolute",
            left: internalDrawBox.x,
            top: internalDrawBox.y,
            width: internalDrawBox.width,
            height: internalDrawBox.height,
            border: "2px dashed blue",
            pointerEvents: "none",
          }}
        />
      )}

      {[...taggedElements, ...detectedTables].filter((box) => box.page === currentPage + 1).map((box, index) => (
        <div
          key={`${box.type}-${box.id}-${index}`}
          style={{
            position: "absolute",
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
            border: "2px solid red",
            backgroundColor: "rgba(255,0,0,0.2)",
            cursor: "pointer",
          }}
          onClick={() => handleBoxClick(box)}
        >
          {box.tag || (box.type === "image" ? <i className="fa fa-image" /> : <i className="fa fa-table" />)}
          <FaTimes onClick={(e) => { e.stopPropagation(); handleRemoveBox(box); }} style={{ position: "absolute", top: 5, right: 5, color: "red" }} />
        </div>
      ))}
<TableEditModal 
  isOpen={showTableEditModal} 
  tableData={selectedTableData} 
  onClose={() => setShowTableEditModal(false)} 
  onTableChange={handleTableSave} 
  pdfDoc={pdfDoc}
  viewport={viewport} // ✅ Pass viewport so scaling is correct!
  scaleFactor={viewport ? viewport.scale : 1} // ✅ Pass scale
/>

      <EditBoxModal show={showEditBoxModal} handleClose={() => setShowEditBoxModal(false)} taggedElements={taggedElements} setTaggedElements={setTaggedElements} selectedBox={selectedBox} selectedBoxIndex={selectedBoxIndex} pdfDoc={pdfDoc} fonts={uploadedFonts} />
      <ConfirmDeleteModal show={showConfirmModal} handleClose={() => setShowConfirmModal(false)} handleConfirm={confirmRemoveBox} boxName={boxToDelete?.name} />
    </div>
  );
};

export default CanvasDisplay;
