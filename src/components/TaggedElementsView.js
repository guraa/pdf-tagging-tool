import React, { useState, useEffect, useRef, useCallback } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge, Button, Form } from "react-bootstrap";
import { renderPage } from "./DrawCanvas";
import { FaTimes, FaGripVertical, FaImage, FaHeading, FaTable } from "react-icons/fa";

// Define colors for each tag type
const tagColors = {
  image: "#ffc107", // Yellow
  h1: "#dc3545", // Red
  h2: "#28a745", // Green
  h3: "#007bff", // Blue
  h4: "#17a2b8", // Teal
  table: "#6c757d", // Grey
};

// Define icons for each tag type
const tagIcons = {
  image: <FaImage />,
  h1: <FaHeading size={14} />,
  h2: <FaHeading size={12} />,
  h3: <FaHeading size={10} />,
  h4: <FaHeading size={8} />,
  table: <FaTable />,
};

// Section and tag style
const sectionStyle = {
  padding: "10px",
  border: "2px dashed #007bff",
  borderRadius: "8px",
  backgroundColor: "#f8f9fa",
  minHeight: "50px",
};

const TaggedElementsView = ({
  taggedElements = [],
  setTaggedElements,
  pdfDoc,
  currentPage,
  canvasRef,
}) => {
  const [editingSection, setEditingSection] = useState(null);
  const [sectionEditName, setSectionEditName] = useState("");
  const debounceTimeout = useRef(null); // For debouncing rendering logic

  // Start editing section name
  const startEditingSection = (section) => {
    setEditingSection(section.id);
    setSectionEditName(section.name);
  };

  // Flatten nested elements for rendering
  const flattenElements = (elements) => {
    return elements.flatMap((el) =>
      el.type === "section" ? flattenElements(el.children || []) : el
    );
  };

  // Re-render the canvas when taggedElements are updated
  useEffect(() => {
    let isCancelled = false;

    const render = async () => {
      const flatElements = flattenElements(taggedElements); // Flatten nested structures
      await renderPage(pdfDoc, currentPage, canvasRef, flatElements, isCancelled);
    };

    if (canvasRef.current && pdfDoc) {
      // Clear any previous debounce timer
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

      // Set a debounce timer
      debounceTimeout.current = setTimeout(() => render(), 100);

      return () => {
        isCancelled = true;
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      };
    }
  }, [pdfDoc, currentPage, taggedElements, canvasRef]);

  // Save section name after editing
  const saveSectionEdit = (sectionId) => {
    setTaggedElements((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, name: sectionEditName } : section
      )
    );
    setEditingSection(null);
    setSectionEditName("");
  };

  // Delete a section and move tags to ungrouped items
  const deleteSection = (sectionId) => {
    setTaggedElements((prev) => {
      const sectionToDelete = prev.find((section) => section.id === sectionId);
      if (sectionToDelete) {
        const ungroupedItems = sectionToDelete.children || [];
        return [
          ...prev.filter((section) => section.id !== sectionId),
          ...ungroupedItems.map((item) => ({ ...item, sectionName: "" })),
        ];
      }
      return prev;
    });
  };

  // Add a new section
  const addNewSection = () => {
    const newSection = {
      id: Date.now(),
      name: `New Section`,
      type: "section",
      children: [],
    };

    setTaggedElements((prev) => [...prev, newSection]);
  };

  // Render a section
  const renderSection = (section, sectionIndex) => (
    <Draggable key={section.id} draggableId={`section-${section.id}`} index={sectionIndex}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={sectionStyle}
          className="mb-3"
        >
          {/* Section Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <FaGripVertical style={{ marginRight: "8px", cursor: "grab" }} />
              {editingSection === section.id ? (
                <Form.Control
                  type="text"
                  value={sectionEditName}
                  onChange={(e) => setSectionEditName(e.target.value)}
                  onBlur={() => saveSectionEdit(section.id)}
                  autoFocus
                />
              ) : (
                <h5
                  style={{ margin: 0, cursor: "pointer" }}
                  onClick={() => startEditingSection(section)}
                >
                  {section.name}
                </h5>
              )}
            </div>
            <FaTimes
              onClick={() => deleteSection(section.id)}
              style={{ cursor: "pointer", color: "red", marginLeft: "10px" }}
            />
          </div>

          {/* Droppable Area for Section Items */}
          <Droppable droppableId={`section-${section.id}`} type="ITEM">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ ...sectionStyle, marginTop: "10px" }}
              >
                {section.children?.map((child, childIndex) =>
                  renderDraggableItem(child, childIndex)
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );

  // Render a draggable item
  const renderDraggableItem = (item, index) => (
    <Draggable key={item.id} draggableId={`child-${item.id}`} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-2 d-flex align-items-center"
        >
          <Badge
            pill
            style={{
              backgroundColor: tagColors[item.tag],
              color: "white",
            }}
            className="me-2 d-flex align-items-center"
          >
            {tagIcons[item.tag]} <span className="ms-1">{item.tag} - {item.name}</span>
          </Badge>
        </div>
      )}
    </Draggable>
  );

  // Render ungrouped items
  const renderUngroupedItems = () => (
    <Droppable droppableId="ungrouped-items" type="ITEM">
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          <h6>Ungrouped Items</h6>
          <div style={sectionStyle}>
            {taggedElements
              .filter((el) => !el.sectionName && el.type !== "section")
              .map((item, index) => renderDraggableItem(item, index))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );

  return (
    <>
      {/* Render Sections */}
      <Droppable droppableId="sections" type="SECTION">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {taggedElements
              .filter((section) => section.type === "section")
              .map((section, sectionIndex) => renderSection(section, sectionIndex))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Render Ungrouped Items */}
      {renderUngroupedItems()}

      <Button variant="primary" onClick={addNewSection} className="mt-3">
        Add Section
      </Button>
    </>
  );
};

export default TaggedElementsView;
