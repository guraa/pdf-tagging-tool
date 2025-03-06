import React from 'react';
import { Modal, Button, ListGroup } from 'react-bootstrap';

/**
 * MergeModal - Modal dialog for handling overlapping elements
 * 
 * This component presents options when a new element overlaps with existing elements
 * offering to merge them, replace them, or cancel the operation.
 */
const MergeModal = ({
  show,
  handleClose,
  mergeCandidate,
  setTaggedElements,
  onMergeComplete,
}) => {
  if (!mergeCandidate) return null;

  const { newBox, overlappingBoxes } = mergeCandidate;

  // Merge the new box with overlapping boxes
  const handleMerge = () => {
    // Create a new merged element with combined dimensions
    const mergedBox = calculateMergedBox([newBox, ...overlappingBoxes]);
    
    // Update the tagged elements
    setTaggedElements((prev) => {
      // Filter out all overlapping boxes
      const filteredElements = prev.filter(
        (el) => !overlappingBoxes.some((box) => box.id === el.id)
      );
      
      // Add the merged box
      return [...filteredElements, mergedBox];
    });
    
    // Close the modal and report completion
    if (onMergeComplete) {
      onMergeComplete();
    } else {
      handleClose();
    }
  };

  // Replace existing elements with the new box
  const handleReplace = () => {
    setTaggedElements((prev) => {
      // Filter out all overlapping boxes
      const filteredElements = prev.filter(
        (el) => !overlappingBoxes.some((box) => box.id === el.id)
      );
      
      // Add the new box
      return [...filteredElements, newBox];
    });
    
    // Close the modal and report completion
    if (onMergeComplete) {
      onMergeComplete();
    } else {
      handleClose();
    }
  };

  // Add the new box as a separate element despite overlap
  const handleAddAnyway = () => {
    setTaggedElements((prev) => [...prev, newBox]);
    
    // Close the modal and report completion
    if (onMergeComplete) {
      onMergeComplete();
    } else {
      handleClose();
    }
  };

  // Calculate merged dimensions for all boxes
  const calculateMergedBox = (boxes) => {
    if (!boxes.length) return null;
    
    // Find min and max coordinates
    const minX = Math.min(...boxes.map((box) => box.x));
    const minY = Math.min(...boxes.map((box) => box.y));
    const maxX = Math.max(...boxes.map((box) => box.x + box.width));
    const maxY = Math.max(...boxes.map((box) => box.y + box.height));
    
    // Create the merged box with the combined dimensions
    return {
      ...newBox,
      id: `merged-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      // Preserve the name if there's only one overlapping box, otherwise use a merged name
      name: overlappingBoxes.length === 1 
        ? `Merged: ${overlappingBoxes[0].name} + ${newBox.name}`
        : `Merged ${overlappingBoxes.length + 1} elements`,
    };
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Overlapping Elements Detected</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          The new element <strong>{newBox.name || "Unnamed"}</strong> overlaps with
          {overlappingBoxes.length === 1 
            ? " an existing element." 
            : ` ${overlappingBoxes.length} existing elements.`}
        </p>
        
        <p>The following elements overlap:</p>
        <ListGroup className="mb-3">
          {overlappingBoxes.map((box) => (
            <ListGroup.Item key={box.id}>
              <strong>{box.name || "Unnamed"}</strong> ({box.type || "unknown"})
            </ListGroup.Item>
          ))}
        </ListGroup>
        
        <p>What would you like to do?</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleMerge}>
          Merge Elements
        </Button>
        <Button variant="warning" onClick={handleReplace}>
          Replace Existing
        </Button>
        <Button variant="info" onClick={handleAddAnyway}>
          Add Anyway
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MergeModal;