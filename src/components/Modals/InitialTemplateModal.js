import React from "react";
import { Modal, Button } from "react-bootstrap";

const InitialTemplateModal = ({ show, onHide, onCreateNew, onLoadExisting }) => {
  return (
    <Modal show={show} onHide={onHide} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>Choose an Option</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-center">
          Do you want to create a new template or load an existing one?
        </p>
        <div className="d-flex justify-content-around">
          <Button variant="primary" onClick={onCreateNew}>
            Create New Template
          </Button>
          <Button variant="secondary" onClick={onLoadExisting}>
            Load Existing Template
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default InitialTemplateModal;
