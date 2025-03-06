import React, { useState } from "react";
import { Button, Modal, Form } from "react-bootstrap";
import { DragDropContext } from "@hello-pangea/dnd";
import TaggedElementsView from "./TaggedElementsView";

const TaggedElementsPanel = ({
  taggedElements,
  setTaggedElements,
  onAddSection,
  canvasRef,
  pdfDoc,
  currentPage,
}) => {
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionName, setSectionName] = useState("");

  const openSectionModal = () => setShowSectionModal(true);
  const closeSectionModal = () => {
    setShowSectionModal(false);
    setSectionName("");
  };

  const addSection = () => {
    if (sectionName.trim() === "") return; // Prevent empty section names
    const newSection = {
      id: Date.now(), // Unique ID
      type: "section",
      name: sectionName,
      children: [], // Empty children for a new section
    };
    setTaggedElements((prev) => [...prev, newSection]);
    closeSectionModal();
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;

    if (!destination) {
      console.log("Drag ended outside of any droppable area.");
      return;
    }

    const handleSectionMove = (sourceIndex, destinationIndex, elements) => {
      const updatedElements = [...elements];
      const [movedSection] = updatedElements.splice(sourceIndex, 1);
      updatedElements.splice(destinationIndex, 0, movedSection);
      return updatedElements;
    };

    const handleItemMove = (source, destination, elements) => {
      const updatedElements = [...elements];

      const sourceSection = elements.find(
        (el) => `section-${el.id}` === source.droppableId
      );
      const destinationSection = elements.find(
        (el) => `section-${el.id}` === destination.droppableId
      );

      let movedItem;
      if (sourceSection) {
        movedItem = sourceSection.children.splice(source.index, 1)[0];
      } else {
        movedItem = updatedElements.splice(source.index, 1)[0];
      }

      if (destinationSection) {
        destinationSection.children.splice(destination.index, 0, movedItem);
      } else {
        updatedElements.splice(destination.index, 0, movedItem);
      }

      return updatedElements;
    };

    setTaggedElements((prev) => {
      if (source.droppableId === "sections" && destination.droppableId === "sections") {
        return handleSectionMove(source.index, destination.index, prev);
      } else {
        return handleItemMove(source, destination, prev);
      }
    });
  };

  return (
    <div
      className="p-4"
      style={{
        backgroundColor: "#f8f9fa",
        boxShadow: "2px 2px 8px rgba(0,0,0,0.1)",
        borderRadius: "8px",
        height: "100vh",
        border: "1px solid #e0e0e0",
        overflowY: "auto",
      }}
    >
      <Button onClick={openSectionModal} className="mb-3">
        Add Section
      </Button>

      {/* Add Section Modal */}
      <Modal show={showSectionModal} onHide={closeSectionModal}>
        <Modal.Header closeButton>
          <Modal.Title>Create Section</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Section Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter section name"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeSectionModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={addSection}>
            Add Section
          </Button>
        </Modal.Footer>
      </Modal>

      <DragDropContext onDragEnd={onDragEnd}>
        <TaggedElementsView
          taggedElements={taggedElements}
          setTaggedElements={setTaggedElements}
          pdfDoc={pdfDoc}
          currentPage={currentPage}
          canvasRef={canvasRef}
        />
      </DragDropContext>
    </div>
  );
};

export default TaggedElementsPanel;
