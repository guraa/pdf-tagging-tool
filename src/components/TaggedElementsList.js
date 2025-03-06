import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "react-bootstrap";
import ConfirmDeleteModal from "./Modals/ConfirmDeleteModal";

const TaggedElementsList = ({
  taggedElements,
  setTaggedElements,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [elementToDelete, setElementToDelete] = useState(null);

  const handleDragEnd = (result) => {
    const { source, destination } = result;

    if (!destination) return;

    const reorderedElements = Array.from(taggedElements);
    const [movedElement] = reorderedElements.splice(source.index, 1);
    reorderedElements.splice(destination.index, 0, movedElement);

    setTaggedElements(reorderedElements);
  };

  const handleDeleteElement = (element) => {
    setElementToDelete(element);
    setShowConfirmModal(true);
  };

  const confirmDelete = () => {
    setTaggedElements((prev) =>
      prev.filter((element) => element.id !== elementToDelete.id)
    );
    setShowConfirmModal(false);
    setElementToDelete(null);
  };

  return (
    <div style={{ padding: "15px", backgroundColor: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: "8px" }}>
      <h5 className="font-weight-bold mb-3">Tagged Elements</h5>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="tagged-elements-list">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={{ maxHeight: "300px", overflowY: "auto" }}
            >
              {taggedElements.map((element, index) => (
                <Draggable key={element.id} draggableId={element.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px",
                        marginBottom: "5px",
                        backgroundColor: "white",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        ...provided.draggableProps.style,
                      }}
                    >
                      <span>
                        <strong>{element.name || "Unnamed"}</strong> ({element.tag || "Unknown"})
                      </span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteElement(element)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <ConfirmDeleteModal
        show={showConfirmModal}
        handleClose={() => setShowConfirmModal(false)}
        handleConfirm={confirmDelete}
        boxName={elementToDelete?.name}
      />
    </div>
  );
};

export default TaggedElementsList;
