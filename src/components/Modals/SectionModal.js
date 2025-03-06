import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";

const SectionModal = ({
  show,
  handleClose,
  handleAddSection,
}) => {
  const [sectionName, setSectionName] = useState("");

  const handleSaveSection = () => {
    if (sectionName.trim() === "") {
      alert("Section name cannot be empty.");
      return;
    }
    handleAddSection(sectionName);
    setSectionName("");
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Section</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label>Section Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter section name"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSaveSection}>
          Add Section
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SectionModal;
